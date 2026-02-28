"use client";

/**
 * useTimekeeper — Il Tempo
 *
 * Mantiene sincronizzato l'orario del browser con la logica di apertura
 * del ristorante. Aggiorna lo stato ogni 30 secondi.
 *
 * Struttura backend reale (verificata via API):
 * - generali.scheduleWeekly[]: { day: "monday"|..., isOpen: bool, hours: [{start, end}] }
 * - generali.lunchSlot: { start, end }   — slot pranzo esplicito
 * - generali.dinnerSlot: { start, end }  — slot cena esplicito
 * - generali.exceptions[]: { date: "YYYY-MM-DD", isClosed, hours? }
 *
 * Input:  dati `Generali` (orari settimanali + eccezioni)
 * Output: { now, isOpen, activeSlot, isHoliday, closureMessage }
 */

import { useEffect, useMemo, useState } from "react";
import type {
  ActiveSlot,
  EccezioneOrario,
  FasciaOraria,
  Generali,
  GiornoSettimana,
  SlotOrario,
} from "@/types";

// ---------------------------------------------------------------------------
// Costanti
// ---------------------------------------------------------------------------

const TICK_INTERVAL_MS = 30_000; // 30 secondi

/** Mappa indice JS (0=domenica) → GiornoSettimana (inglese) */
const JS_DAY_TO_GIORNO: GiornoSettimana[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

// ---------------------------------------------------------------------------
// Helpers puri (nessuna dipendenza da React)
// ---------------------------------------------------------------------------

/**
 * Converte una stringa "HH:mm" nei minuti dall'inizio della giornata.
 * Restituisce -1 se il formato non è valido.
 */
function timeToMinutes(time: string): number {
  const parts = time.split(":");
  if (parts.length !== 2) return -1;
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m)) return -1;
  return h * 60 + m;
}

/** Restituisce i minuti dall'inizio della giornata per una Date. */
function dateToMinutes(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

/** Formatta una Date come stringa "YYYY-MM-DD" nel fuso locale del browser. */
function toLocalDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Verifica se l'orario corrente (in minuti) cade dentro una fascia oraria.
 * Supporta fasce che scavalcano la mezzanotte (es. 22:00–02:00).
 */
function isInFascia(currentMinutes: number, fascia: FasciaOraria): boolean {
  const start = timeToMinutes(fascia.start);
  const end = timeToMinutes(fascia.end);
  if (start < 0 || end < 0) return false;

  if (end > start) {
    return currentMinutes >= start && currentMinutes < end;
  } else {
    // Fascia notturna che scavalca mezzanotte
    return currentMinutes >= start || currentMinutes < end;
  }
}

/**
 * Verifica se l'orario corrente cade in uno SlotOrario esplicito.
 */
function isInSlot(currentMinutes: number, slot: SlotOrario): boolean {
  return isInFascia(currentMinutes, { start: slot.start, end: slot.end });
}

/**
 * Determina lo slot attivo (lunch/dinner/null) usando gli slot espliciti del backend.
 * Se gli slot espliciti non sono presenti, usa la posizione nella lista hours[].
 */
function resolveActiveSlot(
  currentMinutes: number,
  hours: FasciaOraria[],
  lunchSlot?: SlotOrario,
  dinnerSlot?: SlotOrario
): ActiveSlot {
  if (hours.length === 0) return null;

  // Priorità: usa gli slot espliciti se disponibili
  if (lunchSlot && isInSlot(currentMinutes, lunchSlot)) return "lunch";
  if (dinnerSlot && isInSlot(currentMinutes, dinnerSlot)) return "dinner";

  // Fallback: prima fascia = lunch, seconda = dinner
  const sorted = [...hours].sort(
    (a, b) => timeToMinutes(a.start) - timeToMinutes(b.start)
  );
  if (sorted[0] && isInFascia(currentMinutes, sorted[0])) return "lunch";
  if (sorted[1] && isInFascia(currentMinutes, sorted[1])) return "dinner";

  return null;
}

// ---------------------------------------------------------------------------
// Logica principale (pura, testabile)
// ---------------------------------------------------------------------------

export interface TimekeeperResult {
  /** Orario corrente del browser */
  now: Date;
  /** Il ristorante è fisicamente aperto in questo momento? */
  isOpen: boolean;
  /** Slot di servizio attivo (pranzo / cena / nessuno) */
  activeSlot: ActiveSlot;
  /** Oggi è un giorno di eccezione (festività, chiusura straordinaria)? */
  isHoliday: boolean;
  /** Messaggio di chiusura da mostrare */
  closureMessage: string | null;
}

/**
 * Calcola lo stato di apertura a partire dai dati Generali e dall'orario corrente.
 * Funzione pura: non usa hook React, facilmente testabile.
 */
export function computeTimekeeperState(
  now: Date,
  generali: Generali
): TimekeeperResult {
  const todayStr = toLocalDateString(now);
  const currentMinutes = dateToMinutes(now);
  const giornoCorrente = JS_DAY_TO_GIORNO[now.getDay()];

  // 1. Controlla eccezioni (festività, chiusure straordinarie)
  const eccezione: EccezioneOrario | undefined = generali.exceptions?.find(
    (e) => e.date === todayStr
  );

  if (eccezione) {
    if (eccezione.isClosed) {
      return {
        now,
        isOpen: false,
        activeSlot: null,
        isHoliday: true,
        closureMessage: eccezione.description ?? generali.messaggioChiusura ?? null,
      };
    }

    // Eccezione con orario speciale
    const hours = eccezione.hours ?? [];
    const isOpen = hours.some((f) => isInFascia(currentMinutes, f));
    const activeSlot = isOpen
      ? resolveActiveSlot(currentMinutes, hours, generali.lunchSlot, generali.dinnerSlot)
      : null;

    return {
      now,
      isOpen,
      activeSlot,
      isHoliday: true,
      closureMessage: isOpen ? null : (eccezione.description ?? generali.messaggioChiusura ?? null),
    };
  }

  // 2. Orario settimanale standard
  const scheduleWeekly = generali.scheduleWeekly ?? [];
  const orarioOggi = scheduleWeekly.find((o) => o.day === giornoCorrente);

  if (!orarioOggi || !orarioOggi.isOpen) {
    return {
      now,
      isOpen: false,
      activeSlot: null,
      isHoliday: false,
      closureMessage: generali.messaggioChiusura ?? null,
    };
  }

  const hours = orarioOggi.hours ?? [];
  const isOpen = hours.some((f) => isInFascia(currentMinutes, f));
  const activeSlot = isOpen
    ? resolveActiveSlot(currentMinutes, hours, generali.lunchSlot, generali.dinnerSlot)
    : null;

  return {
    now,
    isOpen,
    activeSlot,
    isHoliday: false,
    closureMessage: isOpen ? null : (generali.messaggioChiusura ?? null),
  };
}

// ---------------------------------------------------------------------------
// Hook React
// ---------------------------------------------------------------------------

/**
 * Mantiene aggiornato lo stato temporale del ristorante.
 *
 * @param generali - Dati di orari ed eccezioni dal Global Payload "generali"
 * @returns Stato corrente: apertura, slot attivo, festività
 */
export function useTimekeeper(generali: Generali): TimekeeperResult {
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), TICK_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  return useMemo(() => computeTimekeeperState(now, generali), [now, generali]);
}
