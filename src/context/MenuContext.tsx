"use client";

/**
 * MenuContext — Lo Stato Globale del Menu
 *
 * Incapsula tutta la logica di business client-side:
 * - useTimekeeper: stato temporale (apertura, slot, festività)
 * - useMenuStructure: sezioni risolte e filtrate per lo slot corrente
 * - getRealTimeAvailability: disponibilità real-time da GCS (polling ogni 5 min)
 * - activeCategory: navigazione logica tra sezioni (senza cambio di pagina)
 *
 * Wrappa l'intera app (o la parte di menu) nel layout.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { getRealTimeAvailability } from "@/lib/api";
import { useMenuStructure } from "@/hooks/useMenuStructure";
import { useTimekeeper } from "@/hooks/useTimekeeper";
import type {
  ActiveSlot,
  Bevanda,
  Birra,
  DisponibilitaResponse,
  Generali,
  Liquore,
  MenuConfig,
  MenuFisso,
  Piatto,
  SezioneRisolta,
  Vino,
} from "@/types";

// ---------------------------------------------------------------------------
// Costanti
// ---------------------------------------------------------------------------

/** Intervallo di polling per la disponibilità real-time (5 minuti) */
const AVAILABILITY_POLL_MS = 5 * 60 * 1_000;

// ---------------------------------------------------------------------------
// Tipi del Context
// ---------------------------------------------------------------------------

export interface MenuStatus {
  isOpen: boolean;
  activeSlot: ActiveSlot;
  isHoliday: boolean;
  /** Messaggio di chiusura da mostrare all'utente */
  closureMessage: string | null;
}

export interface MenuContextValue {
  /** Sezioni del menu visibili per lo slot corrente, già popolate con i piatti */
  sections: SezioneRisolta[];
  /** Mappa id → disponibilità per piatti e vini (da GCS, aggiornata ogni 5 min) */
  availability: DisponibilitaResponse | null;
  /** Stato di apertura del ristorante */
  status: MenuStatus;
  /** Slug della sezione attualmente visualizzata (navigazione logica) */
  activeCategory: string | null;
  /** Imposta la sezione attiva (chiamata dai componenti di navigazione) */
  setActiveCategory: (slug: string | null) => void;
  /** Forza un refresh immediato della disponibilità */
  refreshAvailability: () => Promise<void>;
  /** Configurazione del menu (per accesso diretto a mostraVini, mostraAllergeni, ecc.) */
  menuConfig: MenuConfig;
  /** Dati generali del ristorante (orari, eccezioni) */
  generali: Generali;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const MenuContext = createContext<MenuContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export interface MenuProviderProps {
  children: React.ReactNode;
  menuConfig: MenuConfig;
  generali: Generali;
  /**
   * Sezioni già risolte a build-time (con sort/group applicati da OrdinamentoMenu).
   * Vengono filtrate a runtime solo per slot/giorno — sort e group non vengono
   * ricalcolati lato client.
   */
  sezioniRisolte: SezioneRisolta[];
  /**
   * Passati per retrocompatibilità con i componenti esistenti.
   * Non vengono usati direttamente dal provider — le sezioni sono già risolte.
   */
  piatti?: Piatto[];
  vini?: Vino[];
  menuFissi?: MenuFisso[];
  bevande?: Bevanda[];
  birre?: Birra[];
  liquori?: Liquore[];
}

export function MenuProvider({
  children,
  menuConfig,
  generali,
  sezioniRisolte,
}: MenuProviderProps) {
  // --- Stato temporale ---
  const { isOpen, activeSlot, isHoliday, closureMessage } =
    useTimekeeper(generali);

  // --- Sezioni risolte: filtro per slot/giorno sulle sezioni pre-calcolate dalla build ---
  const sections = useMenuStructure({ sezioniRisolte, menuConfig, activeSlot });

  // --- Navigazione logica ---
  const [activeCategory, setActiveCategoryState] = useState<string | null>(
    () => sections[0]?.slug ?? null
  );

  // Quando le sezioni cambiano (es. cambio slot pranzo→cena), aggiorna
  // la categoria attiva se quella corrente non esiste più.
  useEffect(() => {
    if (sections.length === 0) {
      setActiveCategoryState(null);
      return;
    }
    const stillExists = sections.some((s) => s.slug === activeCategory);
    if (!stillExists) {
      setActiveCategoryState(sections[0].slug);
    }
  }, [sections, activeCategory]);

  const setActiveCategory = useCallback((slug: string | null) => {
    setActiveCategoryState(slug);
  }, []);

  // --- Disponibilità real-time ---
  const [availability, setAvailability] = useState<DisponibilitaResponse | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchAvailability = useCallback(async () => {
    const data = await getRealTimeAvailability();
    setAvailability(data);
  }, []);

  useEffect(() => {
    // Fetch immediato all'avvio
    void fetchAvailability();

    // Polling periodico
    pollTimerRef.current = setInterval(() => {
      void fetchAvailability();
    }, AVAILABILITY_POLL_MS);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [fetchAvailability]);

  // --- Valore del context ---
  const value = useMemo<MenuContextValue>(
    () => ({
      sections,
      availability,
      status: { isOpen, activeSlot, isHoliday, closureMessage },
      activeCategory,
      setActiveCategory,
      refreshAvailability: fetchAvailability,
      menuConfig,
      generali,
    }),
    [
      sections,
      availability,
      isOpen,
      activeSlot,
      isHoliday,
      closureMessage,
      activeCategory,
      setActiveCategory,
      fetchAvailability,
      menuConfig,
      generali,
    ]
  );

  return <MenuContext.Provider value={value}>{children}</MenuContext.Provider>;
}

// ---------------------------------------------------------------------------
// Hook di accesso
// ---------------------------------------------------------------------------

/**
 * Accede al context del menu. Deve essere usato dentro un `<MenuProvider>`.
 *
 * @throws {Error} se usato fuori dal provider
 *
 * @example
 * const { sections, status, activeCategory } = useMenu();
 */
export function useMenu(): MenuContextValue {
  const ctx = useContext(MenuContext);
  if (!ctx) {
    throw new Error("useMenu deve essere usato dentro un <MenuProvider>.");
  }
  return ctx;
}
