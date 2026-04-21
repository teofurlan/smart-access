import fs from "node:fs";
import path from "node:path";
import { google } from "googleapis";

// --- TIPOS ---
type AccessEventInput = {
  uid: string;
  userName: string;
};

// --- SCOPES ---
// Agregamos el scope readonly para poder consultar de forma segura
const SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.readonly"
];

// --- HELPER DE CREDENCIALES ---
function resolveCredentialPath() {
  const credentialFile =
    process.env.GOOGLE_APPLICATION_CREDENTIALS ?? path.join(process.cwd(), "google-credentials.json");

  return path.isAbsolute(credentialFile) ? credentialFile : path.join(process.cwd(), credentialFile);
}

// ==========================================
// FUNCIÓN 1: CONSULTAR RESERVA (AUTORIZACIÓN)
// ==========================================
export async function checkActiveReservation(): Promise<boolean> {
  const calendarId = process.env.GOOGLE_CALENDAR_ID;

  if (!calendarId) {
    console.warn("GOOGLE_CALENDAR_ID is not set. Bloqueando acceso por seguridad.");
    return false; // Ante la duda, no abrimos la puerta
  }

  const credentialPath = resolveCredentialPath();

  if (!fs.existsSync(credentialPath)) {
    console.warn("Google credentials file not found. Bloqueando acceso por seguridad.");
    return false;
  }

  const auth = new google.auth.GoogleAuth({
    keyFile: credentialPath,
    scopes: SCOPES,
  });

  const calendar = google.calendar({ version: "v3", auth });
  const now = new Date();

  // Creamos una ventana de tiempo de 1 minuto desde AHORA
  const endWindow = new Date(now.getTime() + 60 * 1000);

  try {
    console.log("🔍 Consultando eventos en Google Calendar...");

    const response = await calendar.events.list({
      calendarId,
      timeMin: now.toISOString(),
      timeMax: endWindow.toISOString(),
      singleEvents: true,
      orderBy: "startTime",
    });

    const eventosActivos = response.data.items;

    // --- NUEVO LOG DE DEBUGGING ---
    if (eventosActivos && eventosActivos.length > 0) {
      console.log("⚠️ ¡ATENCIÓN! Google dice que SÍ hay eventos activos:");
      eventosActivos.forEach(evento => {
        console.log(`   -> Nombre del evento: "${evento.summary}"`);
      });
    } else {
      console.log("✅ Google confirma que NO hay eventos activos ahora mismo.");
    }
    // ------------------------------

    return !!eventosActivos && eventosActivos.length > 0;

  } catch (error) {
    console.error("Error consultando la API de Google Calendar:", error);
    return false;
  }
}

// ==========================================
// FUNCIÓN 2: REGISTRAR ACCESO (BITÁCORA)
// ==========================================
export async function createAccessCalendarEvent({ uid, userName }: AccessEventInput) {
  const calendarId = process.env.GOOGLE_CALENDAR_ID;

  if (!calendarId) return;

  const credentialPath = resolveCredentialPath();

  if (!fs.existsSync(credentialPath)) return;

  const auth = new google.auth.GoogleAuth({
    keyFile: credentialPath,
    scopes: SCOPES,
  });

  const calendar = google.calendar({ version: "v3", auth });
  const now = new Date();
  const end = new Date(now.getTime() + 60 * 1000);

  try {
    await calendar.events.insert({
      calendarId,
      requestBody: {
        summary: `Access granted: ${userName}`,
        description: `UID: ${uid}`,
        start: { dateTime: now.toISOString() },
        end: { dateTime: end.toISOString() },
      },
    });
  } catch (error) {
    console.error("Error creando el evento en Google Calendar:", error);
  }
}