"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CircleCheck, CircleX, Nfc } from "lucide-react";
import { getBrowserSupabaseClient } from "@/lib/supabase-browser-client";

type KioskState = "idle" | "granted" | "denied";

type AccessDenialReason = "UNKNOWN_CARD" | "NO_ACTIVE_RESERVATION";

type AccessLogRow = {
  granted: boolean;
  nfc_uid?: string | null;
  message?: string | null;
  /** Coincide con el enum Postgres / columna `denial_reason` en Realtime */
  denial_reason?: AccessDenialReason | null;
  user_name?: string | null;
  name?: string | null;
  display_name?: string | null;
};

function pickUserLabel(row: AccessLogRow): string | null {
  const name = row.user_name ?? row.display_name ?? row.name;
  if (name && String(name).trim()) return String(name).trim();
  if (row.nfc_uid && String(row.nfc_uid).trim()) return String(row.nfc_uid).trim();
  return null;
}

function describeOutcome(row: AccessLogRow, state: KioskState): string {
  const m = row.message?.trim();
  if (m) return m;
  if (state === "granted") return "Tu acceso ha sido autorizado.";
  if (row.denial_reason === "NO_ACTIVE_RESERVATION") {
    return "No hay una reserva activa asociada a tu usuario en este momento.";
  }
  if (row.denial_reason === "UNKNOWN_CARD") {
    return "No pudimos identificar esta tarjeta en el sistema.";
  }
  return "No se pudo completar la validación de acceso.";
}

function surfaceClasses(state: KioskState, row: AccessLogRow | null): string {
  if (state === "idle") return "bg-neutral-950";
  if (state === "granted") {
    return "bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-600";
  }
  if (row?.denial_reason === "NO_ACTIVE_RESERVATION") {
    return "bg-gradient-to-br from-amber-600 via-orange-600 to-amber-700";
  }
  return "bg-gradient-to-br from-red-800 via-red-600 to-rose-700";
}

export default function PantallaKioscoPage() {
  const [state, setState] = useState<KioskState>("idle");
  const [lastRow, setLastRow] = useState<AccessLogRow | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleReset = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setState("idle");
      setLastRow(null);
      timerRef.current = null;
    }, 5000);
  }, []);

  const handleInsert = useCallback(
    (row: AccessLogRow) => {
      setLastRow(row);
      setState(row.granted ? "granted" : "denied");
      scheduleReset();
    },
    [scheduleReset]
  );

  useEffect(() => {
    const supabase = getBrowserSupabaseClient();
    if (!supabase) {
      setConfigError("Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY.");
      return;
    }

    setConfigError(null);

    const channel = supabase
      .channel("access-log-kiosk")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "AccessLog" },
        (payload) => {
          const row = payload.new as AccessLogRow;
          if (row && typeof row.granted === "boolean") {
            handleInsert(row);
          }
        }
      )
      .subscribe();

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      void supabase.removeChannel(channel);
    };
  }, [handleInsert]);

  const bgClass = surfaceClasses(state, lastRow);

  const userLine = state !== "idle" && lastRow ? pickUserLabel(lastRow) : null;
  const situationLine = state !== "idle" && lastRow ? describeOutcome(lastRow, state) : null;
  const isReservationPolicy =
    state === "denied" && lastRow?.denial_reason === "NO_ACTIVE_RESERVATION";

  return (
    <div
      className={`min-h-screen flex flex-col items-center justify-center px-6 py-10 text-center text-white transition-[background-image,background-color] duration-500 ease-in-out ${bgClass}`}
    >
      {configError && (
        <p className="absolute top-6 max-w-lg text-sm text-amber-200/90" role="alert">
          {configError}
        </p>
      )}

      <div className="flex max-w-2xl flex-col items-center gap-8">
        {state === "idle" && (
          <>
            <div className="relative flex h-40 w-40 items-center justify-center">
              <span
                className="absolute inset-0 rounded-full bg-emerald-400/15 blur-2xl animate-pulse"
                aria-hidden
              />
              <Nfc
                className="relative z-10 h-28 w-28 text-emerald-400/90 drop-shadow-[0_0_24px_rgba(52,211,153,0.35)] animate-[pulse_2.2s_ease-in-out_infinite]"
                strokeWidth={1.25}
                aria-hidden
              />
            </div>
            <p className="text-balance text-2xl font-medium tracking-tight text-neutral-200 sm:text-3xl">
              Acerca tu tarjeta NFC al lector
            </p>
          </>
        )}

        {state === "granted" && (
          <>
            <CircleCheck
              className="h-32 w-32 text-emerald-50 drop-shadow-[0_4px_32px_rgba(0,0,0,0.25)] sm:h-40 sm:w-40"
              strokeWidth={1.5}
              aria-hidden
            />
            <div className="w-full max-w-xl space-y-5">
              <p className="text-balance text-3xl font-semibold tracking-tight text-emerald-50 sm:text-4xl">
                ¡Acceso concedido!
              </p>
              {userLine && (
                <p className="text-xl font-medium tracking-tight text-emerald-100/95 sm:text-2xl">{userLine}</p>
              )}
              {situationLine && (
                <p className="mx-auto max-w-lg rounded-2xl bg-black/25 px-5 py-4 text-balance text-base leading-relaxed text-emerald-50/95 ring-1 ring-white/15 sm:text-lg">
                  {situationLine}
                </p>
              )}
            </div>
          </>
        )}

        {state === "denied" && (
          <>
            <CircleX
              className={`h-32 w-32 drop-shadow-[0_4px_32px_rgba(0,0,0,0.3)] sm:h-40 sm:w-40 ${isReservationPolicy ? "text-amber-50" : "text-red-50"}`}
              strokeWidth={1.5}
              aria-hidden
            />
            <div className="w-full max-w-xl space-y-5">
              <p
                className={`text-balance text-3xl font-semibold tracking-tight sm:text-4xl ${isReservationPolicy ? "text-amber-50" : "text-red-50"}`}
              >
                {isReservationPolicy ? "Sin reserva activa" : "Acceso denegado"}
              </p>
              {userLine && (
                <p
                  className={`text-xl font-medium tracking-tight sm:text-2xl ${isReservationPolicy ? "text-amber-100/95" : "text-red-100/95"}`}
                >
                  {userLine}
                </p>
              )}
              {situationLine && (
                <p
                  className={`mx-auto max-w-lg rounded-2xl px-5 py-4 text-balance text-base leading-relaxed ring-1 sm:text-lg ${
                    isReservationPolicy
                      ? "bg-black/25 text-amber-50/95 ring-amber-950/30"
                      : "bg-black/30 text-red-50/95 ring-red-950/40"
                  }`}
                >
                  {situationLine}
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
