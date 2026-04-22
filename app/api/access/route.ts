import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { accessRequestSchema } from "@/lib/validations/access";
// Importamos una función para VALIDAR, no para crear
import { checkActiveReservation } from "@/lib/google-calendar";
import { playLabVibe } from "@/lib/spotify";

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const parsed = accessRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ open: false, message: "Payload inválido" }, { status: 400 });
    }

    const uid = parsed.data.uid.toUpperCase();

    // 1. ¿Existe la tarjeta en la DB?
    const user = await prisma.user.findUnique({
      where: { nfc_uid: uid },
      select: { id: true, name: true, email: true, role: true, spotify_uri: true },
    });

    if (!user) {
      await prisma.accessLog.create({
        data: {
          nfc_uid: uid,
          granted: false,
          denial_reason: "UNKNOWN_CARD",
          message: "Esta tarjeta no está registrada. Si es tuya, acude a recepción.",
        },
      });
      return NextResponse.json({ open: false, message: "Acceso denegado: Tarjeta desconocida" }, { status: 403 });
    }

    // 2. ¿Tiene reserva activa en Google Calendar ahora mismo?
    let hasReservation = false;
    try {
      hasReservation = await checkActiveReservation(user.email);
    } catch (calendarError) {
      console.error("Error consultando Google Calendar:", calendarError);
      // Si el calendario falla, por seguridad denegamos el acceso
      return NextResponse.json({ open: false, message: "Error verificando reservas" }, { status: 500 });
    }

    if (!hasReservation) {
      await prisma.accessLog.create({
        data: {
          nfc_uid: uid,
          granted: false,
          denial_reason: "NO_ACTIVE_RESERVATION",
          user_name: user.name,
          message: `${user.name}, no tienes una reserva activa ahora mismo en el calendario del laboratorio.`,
        },
      });
      return NextResponse.json({ open: false, message: `Hola ${user.name}, no tienes reservas en este horario.` }, { status: 403 });
    }

    // 3. Si existe y tiene reserva, otorgamos acceso en la DB
    await prisma.accessLog.create({
      data: {
        nfc_uid: uid,
        granted: true,
        user_name: user.name,
        message: `Reserva confirmada. ¡Bienvenido, ${user.name}!`,
      },
    });

    // 4. ¡QUE SUENE LA MÚSICA! 🎵
    // Usamos await pero dentro de un try/catch (o simplemente ignorando el error si falla)
    // para no bloquear la apertura de la puerta si Spotify está caído.
    await playLabVibe(user.spotify_uri);

    return NextResponse.json(
      {
        open: true,
        message: `Acceso concedido para ${user.name}`,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("POST /api/access error:", error);
    return NextResponse.json({ open: false, message: "Error interno del servidor" }, { status: 500 });
  }
}