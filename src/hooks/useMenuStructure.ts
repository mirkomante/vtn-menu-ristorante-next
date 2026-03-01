"use client";

/**
 * useMenuStructure — La Struttura
 *
 * Trasforma la configurazione grezza del CMS (SezioneMenuConfig[]) in un array
 * di sezioni già risolte (SezioneRisolta[]) pronte per il rendering.
 *
 * Logica applicata:
 * 1. Filtra le sezioni in base allo slot attivo (visibility: lunch/dinner/always).
 * 2. Per ogni sezione, determina se siamo nel `specialPeriod`.
 * 3. Popola la sezione con i piatti/vini reali usando il Query Builder:
 *    - Se specialPeriod attivo → usa `specialItems`.
 *    - Altrimenti → applica filterMode (all/include/exclude) su targetCategories.
 * 4. Ordina le sezioni per campo `ordine`.
 *
 * NOTA: a runtime (client-side) usa `resolveMenuSection` da api.ts per coerenza
 * con la logica build-time. Le sezioni pre-risolte in `staticData.sezioniRisolte`
 * vengono filtrate per slot — non ricalcolate da zero.
 */

import { useMemo } from "react";
import type { ActiveSlot, Bevanda, Birra, Liquore, MenuConfig, MenuFisso, Piatto, SezioneMenuConfig, SezioneRisolta, Vino } from "@/types";
import { resolveMenuSection } from "@/lib/api";

// ---------------------------------------------------------------------------
// Helpers puri
// ---------------------------------------------------------------------------

/**
 * Determina se una sezione deve essere visibile dato lo slot attivo.
 * Usa i valori reali del backend: "lunch_only", "dinner_only", "always".
 */
function isSectionVisible(
  visibility: SezioneMenuConfig["visibility"],
  activeSlot: ActiveSlot
): boolean {
  if (visibility === "always") return true;
  if (visibility === "lunch_only") return activeSlot === "lunch";
  if (visibility === "dinner_only") return activeSlot === "dinner";
  return false;
}

// ---------------------------------------------------------------------------
// Logica principale (pura, testabile)
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
}

/**
 * Risolve le sezioni del menu a partire dalla configurazione e dai dati grezzi.
 * Funzione pura: non usa hook React, facilmente testabile.
 *
 * Usa `resolveMenuSection` (da api.ts) per applicare la logica del Query Builder
 * (filterMode: all/include/exclude) in modo coerente con la build-time.
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
}: MenuStructureInput): SezioneRisolta[] {
  const sezioni = menuConfig.standardItems ?? [];
  const risultati: SezioneRisolta[] = [];

  for (const sezione of sezioni) {
    if (!isSectionVisible(sezione.visibility, activeSlot)) continue;

    const { items, menuFissi: menuFissiSezione } =
      resolveMenuSection(sezione, piatti, vini, menuFissi, bevande, birre, liquori);

    risultati.push({
      slug: sezione.slug,
      titolo: sezione.label,
      items,
      menuFissi: menuFissiSezione,
      isSpecialPeriod: false,
    });
  }

  // Ordina le sezioni per campo `ordine`
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
 * Restituisce le sezioni del menu risolte e filtrate per lo slot corrente.
 *
 * Si ricalcola solo quando cambiano `activeSlot`, `menuConfig`, `piatti` o `vini`.
 *
 * @example
 * const sections = useMenuStructure({ menuConfig, activeSlot, piatti, vini });
 */
export function useMenuStructure(input: MenuStructureInput): SezioneRisolta[] {
  return useMemo(
    () => computeMenuStructure(input),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [input.activeSlot, input.menuConfig, input.piatti, input.vini, input.menuFissi, input.bevande, input.birre, input.liquori]
  );
}
