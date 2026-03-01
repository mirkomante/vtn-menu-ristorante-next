"use client";

/**
 * useMenuStructure — La Struttura
 *
 * Filtra le sezioni pre-risolte dalla build (`sezioniRisolte`) in base allo
 * slot attivo e al giorno corrente. Sort e grouping sono già stati applicati
 * a build-time da `resolveMenuSection()` — non vengono ricalcolati a runtime.
 *
 * Logica applicata a runtime (solo filtro visibilità):
 * 1. `activeDays`: se definito e non vuoto, nasconde la sezione se il giorno
 *    corrente non è nell'array (priorità massima).
 * 2. `visibility`: filtra per slot pranzo/cena/sempre.
 *
 * `computeMenuStructure` è mantenuta come funzione pura per compatibilità
 * e per contesti in cui le `sezioniRisolte` non sono disponibili.
 */

import { useMemo } from "react";
import type { ActiveSlot, Bevanda, Birra, GiornoSettimana, Liquore, MenuConfig, MenuFisso, OrdinamentoMenu, Piatto, SezioneMenuConfig, SezioneRisolta, Vino } from "@/types";
import { resolveMenuSection } from "@/lib/api";

// ---------------------------------------------------------------------------
// Helpers puri
// ---------------------------------------------------------------------------

/**
 * Restituisce il giorno della settimana corrente in inglese lowercase,
 * nel formato usato dal backend ("monday", "tuesday", ...).
 */
function getTodayDayName(): GiornoSettimana {
  const days: GiornoSettimana[] = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];
  return days[new Date().getDay()];
}

/**
 * Determina se una sezione deve essere visibile dato lo slot attivo e il giorno corrente.
 *
 * Ordine di priorità:
 * 1. `activeDays`: se definito e non vuoto, la sezione è nascosta se il giorno
 *    corrente non è nell'array (indipendentemente dallo slot).
 * 2. `visibility`: filtra per slot pranzo/cena/sempre.
 */
function isSectionVisible(
  section: Pick<SezioneMenuConfig, "visibility" | "activeDays">,
  activeSlot: ActiveSlot
): boolean {
  if (section.activeDays && section.activeDays.length > 0) {
    const today = getTodayDayName();
    if (!section.activeDays.includes(today)) return false;
  }

  if (section.visibility === "always") return true;
  if (section.visibility === "lunch_only") return activeSlot === "lunch";
  if (section.visibility === "dinner_only") return activeSlot === "dinner";
  return false;
}

// ---------------------------------------------------------------------------
// Filtro slot su sezioniRisolte (path principale a runtime)
// ---------------------------------------------------------------------------

export interface MenuStructureFromResolvedInput {
  /** Sezioni già risolte a build-time (con sort/group applicati) */
  sezioniRisolte: SezioneRisolta[];
  /** Configurazione del menu — usata solo per leggere visibility/activeDays */
  menuConfig: MenuConfig;
  activeSlot: ActiveSlot;
}

/**
 * Filtra le sezioni pre-risolte dalla build per lo slot e il giorno correnti.
 * Non ricalcola sort/group — usa i dati già pronti da `sezioniRisolte`.
 * Funzione pura, facilmente testabile.
 */
export function filterSezioniRisolte({
  sezioniRisolte,
  menuConfig,
  activeSlot,
}: MenuStructureFromResolvedInput): SezioneRisolta[] {
  const sezioniConfig = menuConfig.standardItems ?? [];

  // Costruisce una lookup map slug → config per il controllo visibilità
  const configMap = new Map(sezioniConfig.map((s) => [s.slug, s]));

  return sezioniRisolte.filter((sezione) => {
    const config = configMap.get(sezione.slug);
    // Se non c'è config (sezione generata dal fallback), è sempre visibile
    if (!config) return true;
    return isSectionVisible(config, activeSlot);
  });
}

// ---------------------------------------------------------------------------
// Logica legacy (pura, testabile) — usata quando sezioniRisolte non disponibili
// ---------------------------------------------------------------------------

export interface MenuStructureInput {
  menuConfig: MenuConfig;
  activeSlot: ActiveSlot;
  piatti: Piatto[];
  vini: Vino[];
  menuFissi: MenuFisso[];
  bevande: Bevanda[];
  birre: Birra[];
  liquori: Liquore[];
  ordinamentoMenu?: OrdinamentoMenu;
}

/**
 * Risolve le sezioni del menu a partire dalla configurazione e dai dati grezzi.
 * Funzione pura: non usa hook React, facilmente testabile.
 *
 * Preferire `filterSezioniRisolte` quando le `sezioniRisolte` sono disponibili,
 * poiché evita di ricalcolare sort/group a runtime.
 */
export function computeMenuStructure({
  menuConfig,
  activeSlot,
  piatti,
  vini,
  menuFissi,
  bevande,
  birre,
  liquori,
  ordinamentoMenu = {},
}: MenuStructureInput): SezioneRisolta[] {
  const sezioni = menuConfig.standardItems ?? [];
  const risultati: SezioneRisolta[] = [];

  for (const sezione of sezioni) {
    if (!isSectionVisible(sezione, activeSlot)) continue;

    const { groups, menuFissi: menuFissiSezione } =
      resolveMenuSection(sezione, piatti, vini, menuFissi, bevande, birre, liquori, ordinamentoMenu);

    risultati.push({
      slug: sezione.slug,
      titolo: sezione.label,
      groups,
      menuFissi: menuFissiSezione,
      isSpecialPeriod: false,
    });
  }

  return risultati.sort(
    (a, b) =>
      (sezioni.find((s) => s.slug === a.slug)?.ordine ?? 9999) -
      (sezioni.find((s) => s.slug === b.slug)?.ordine ?? 9999)
  );
}

// ---------------------------------------------------------------------------
// Hook React
// ---------------------------------------------------------------------------

/**
 * Filtra le sezioni pre-risolte dalla build per lo slot e il giorno correnti.
 * Si ricalcola solo quando cambiano `activeSlot` o `menuConfig`.
 *
 * @example
 * const sections = useMenuStructure({ sezioniRisolte, menuConfig, activeSlot });
 */
export function useMenuStructure(input: MenuStructureFromResolvedInput): SezioneRisolta[];
/**
 * @deprecated Preferire l'overload con `sezioniRisolte` per evitare di
 * ricalcolare sort/group a runtime. Usare solo se le sezioniRisolte non
 * sono disponibili nel contesto.
 */
export function useMenuStructure(input: MenuStructureInput): SezioneRisolta[];
export function useMenuStructure(
  input: MenuStructureFromResolvedInput | MenuStructureInput
): SezioneRisolta[] {
  return useMemo(() => {
    if ("sezioniRisolte" in input) {
      return filterSezioniRisolte(input);
    }
    return computeMenuStructure(input);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    "sezioniRisolte" in input ? input.sezioniRisolte : null,
    input.activeSlot,
    input.menuConfig,
  ]);
}
