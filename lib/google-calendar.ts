import fs from "node:fs";
import path from "node:path";
import { google } from "googleapis";

type AccessEventInput = {
  uid: string;
  userName: string;
};

const SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.readonly"
];

// --- NUEVO HELPER INTELIGENTE DE AUTENTICACIÓN ---
function getGoogleAuth() {
  const credentialsEnv = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();

  // 1. Si la variable parece JSON inline (ej: en deploy), la parseamos
  if (credentialsEnv?.startsWith("{")) {
    try {
      const credentials = JSON.parse(credentialsEnv);
      return new google.auth.GoogleAuth({
        credentials,
        scopes: SCOPES,
      });
    } catch (error) {
      console.error("🔥 Error parseando GOOGLE_APPLICATION_CREDENTIALS del .env:", error);
      return null;
    }
  }

  // 2. Si la variable no es JSON, la tratamos como ruta a archivo.
  //    Esto cubre localhost con: GOOGLE_APPLICATION_CREDENTIALS=\"./google-credentials.json\"
  const credentialFile = credentialsEnv || "google-credential.json";
  const credentialPath = path.isAbsolute(credentialFile) ? credentialFile : path.join(process.cwd(), credentialFile);

  if (!fs.existsSync(credentialPath)) {
    console.warn("⚠️ Credenciales de Google no encontradas ni en .env ni en archivo.");
    return null;
  }

  return new google.auth.GoogleAuth({
    keyFile: credentialPath,
    scopes: SCOPES,
  });
}

// ==========================================
// FUNCIÓN 1: CONSULTAR RESERVA (AUTORIZACIÓN)
// ==========================================
export async function checkActiveReservation(): Promise<boolean> {
  const calendarId = process.env.GOOGLE_CALENDAR_ID;

  if (!calendarId) {
    console.warn("GOOGLE_CALENDAR_ID is not set. Bloqueando acceso.");
    return false;
  }

  const auth = getGoogleAuth();
  if (!auth) return false; // Si falló la auth, bloqueamos

  const calendar = google.calendar({ version: "v3", auth });
  const now = new Date();
  const endWindow = new Date(now.getTime() + 60 * 1000);

  try {
    const response = await calendar.events.list({
      calendarId,
      timeMin: now.toISOString(),
      timeMax: endWindow.toISOString(),
      singleEvents: true,
      orderBy: "startTime",
    });

    const eventosActivos = response.data.items;
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

  const auth = getGoogleAuth();
  if (!auth) return;

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