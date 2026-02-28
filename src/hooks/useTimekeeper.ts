"use client";

/**
 * useTimekeeper — Il Tempo
 *
 * Mantiene sincronizzato l'orario del browser con la logica di apertura
 * del ristorante. Aggiorna lo stato ogni 30 secondi.
 *
 * Input:  dati `Generali` (orari settimanali + eccezioni)
 * Output: { now, isOpen, activeSlot, isHoliday, holidayMessage }
 */

import { useEffect, useMemo, useState } from "react";
import type { ActiveSlot, EccezioneOrario, FasciaOraria, Generali, GiornoSettimana } from "@/types";

// ---------------------------------------------------------------------------
// Costanti
// ---------------------------------------------------------------------------

const TICK_INTERVAL_MS = 30_000; // 30 secondi

/** Mappa indice JS (0=domenica) → chiave GiornoSettimana */
const JS_DAY_TO_GIORNO: GiornoSettimana[] = [
  "domenica",
  "lunedi",
  "martedi",
  "mercoledi",
  "giovedi",
  "venerdi",
  "sabato",
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

/**
 * Restituisce i minuti dall'inizio della giornata per una Date.
 */
function dateToMinutes(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

/**
 * Formatta una Date come stringa "YYYY-MM-DD" nel fuso locale del browser.
 */
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
  const start = timeToMinutes(fascia.apertura);
  const end = timeToMinutes(fascia.chiusura);
  if (start < 0 || end < 0) return false;

  if (end > start) {
    // Fascia normale (es. 12:00–15:00)
    return currentMinutes >= start && currentMinutes < end;
  } else {
    // Fascia notturna che scavalca mezzanotte (es. 22:00–02:00)
    return currentMinutes >= start || currentMinutes < end;
  }
}

/**
 * Data una lista di fasce orarie e l'orario corrente, determina lo slot attivo.
 *
 * Convenzione: la prima fascia del giorno è "lunch", la seconda è "dinner".
 * Se il ristorante ha una sola fascia, è sempre "dinner" (servizio unico serale).
 */
function resolveActiveSlot(
  currentMinutes: number,
  fasce: FasciaOraria[]
): ActiveSlot {
  if (fasce.length === 0) return null;

  if (fasce.length === 1) {
    return isInFascia(currentMinutes, fasce[0]) ? "dinner" : null;
  }

  // Ordina per orario di apertura per garantire lunch < dinner
  const sorted = [...fasce].sort(
    (a, b) => timeToMinutes(a.apertura) - timeToMinutes(b.apertura)
  );

  if (isInFascia(currentMinutes, sorted[0])) return "lunch";
  if (isInFascia(currentMinutes, sorted[1])) return "dinner";
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
  /** Messaggio di chiusura da mostrare (da eccezione o da Generali) */
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

  // 1. Controlla se oggi è un'eccezione
  const eccezione: EccezioneOrario | undefined = generali.eccezioni?.find(
    (e) => e.data === todayStr
  );

  if (eccezione) {
    if (eccezione.chiuso) {
      return {
        now,
        isOpen: false,
        activeSlot: null,
        isHoliday: true,
        closureMessage: eccezione.descrizione ?? generali.messaggioChiusura ?? null,
      };
    }

    // Eccezione con orario speciale (es. apertura straordinaria)
    const fasce = eccezione.fasce ?? [];
    const isOpen = fasce.some((f) => isInFascia(currentMinutes, f));
    const activeSlot = isOpen ? resolveActiveSlot(currentMinutes, fasce) : null;

    return {
      now,
      isOpen,
      activeSlot,
      isHoliday: true,
      closureMessage: isOpen ? null : (eccezione.descrizione ?? generali.messaggioChiusura ?? null),
    };
  }

  // 2. Orario settimanale standard
  const orarioOggi = generali.orari.find((o) => o.giorno === giornoCorrente);

  if (!orarioOggi || !orarioOggi.aperto) {
    return {
      now,
      isOpen: false,
      activeSlot: null,
      isHoliday: false,
      closureMessage: generali.messaggioChiusura ?? null,
    };
  }

  const fasce = orarioOggi.fasce ?? [];
  const isOpen = fasce.some((f) => isInFascia(currentMinutes, f));
  const activeSlot = isOpen ? resolveActiveSlot(currentMinutes, fasce) : null;

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
 *
 * @example
 * const { isOpen, activeSlot } = useTimekeeper(generali);
 */
export function useTimekeeper(generali: Generali): TimekeeperResult {
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), TICK_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  return useMemo(() => computeTimekeeperState(now, generali), [now, generali]);
}
