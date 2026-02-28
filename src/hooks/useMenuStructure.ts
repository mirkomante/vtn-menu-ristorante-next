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
 * 3. Popola la sezione con i piatti/vini reali:
 *    - Se specialPeriod attivo → usa `specialItems`.
 *    - Altrimenti → filtra i piatti per `categoria`.
 * 4. Ordina le sezioni per campo `ordine`.
 */

import { useMemo } from "react";
import type {
  ActiveSlot,
  CategoriaMenu,
  MenuConfig,
  Piatto,
  SezioneMenuConfig,
  SezioneRisolta,
  Vino,
} from "@/types";

// ---------------------------------------------------------------------------
// Helpers puri
// ---------------------------------------------------------------------------

/**
 * Estrae l'ID da un campo che può essere un oggetto popolato o una stringa ID.
 */
function resolveId(ref: { id: string } | string | undefined): string | null {
  if (!ref) return null;
  return typeof ref === "string" ? ref : ref.id;
}

/**
 * Verifica se la data odierna (formato "YYYY-MM-DD") cade nel periodo speciale.
 */
function isInSpecialPeriod(
  todayStr: string,
  period: SezioneMenuConfig["specialPeriod"]
): boolean {
  if (!period) return false;
  return todayStr >= period.dal && todayStr <= period.al;
}

/**
 * Formatta una Date come "YYYY-MM-DD" nel fuso locale del browser.
 */
function toLocalDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Determina se una sezione deve essere visibile dato lo slot attivo.
 */
function isSectionVisible(
  visibility: SezioneMenuConfig["visibility"],
  activeSlot: ActiveSlot
): boolean {
  if (visibility === "always") return true;
  if (visibility === "lunch") return activeSlot === "lunch";
  if (visibility === "dinner") return activeSlot === "dinner";
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
  /** Usato per determinare il specialPeriod; default: new Date() */
  today?: Date;
}

/**
 * Risolve le sezioni del menu a partire dalla configurazione e dai dati grezzi.
 * Funzione pura: non usa hook React, facilmente testabile.
 */
export function computeMenuStructure({
  menuConfig,
  activeSlot,
  piatti,
  vini,
  today = new Date(),
}: MenuStructureInput): SezioneRisolta[] {
  const sezioni = menuConfig.sezioni ?? [];
  const todayStr = toLocalDateString(today);

  // Indice rapido: categoriaId → piatti (evita O(n²) nel loop)
  const piattiByCategoria = new Map<string, Piatto[]>();
  for (const piatto of piatti) {
    const catId = resolveId(piatto.categoria as CategoriaMenu | string);
    if (!catId) continue;
    const existing = piattiByCategoria.get(catId) ?? [];
    existing.push(piatto);
    piattiByCategoria.set(catId, existing);
  }

  const risultati: SezioneRisolta[] = [];

  for (const sezione of sezioni) {
    // 1. Visibilità per slot
    if (!isSectionVisible(sezione.visibility, activeSlot)) continue;

    const isSpecialPeriod = isInSpecialPeriod(todayStr, sezione.specialPeriod);

    let piattiSezione: Piatto[] = [];
    let viniSezione: Vino[] = [];

    if (isSpecialPeriod && sezione.specialItems && sezione.specialItems.length > 0) {
      // 2a. Modalità speciale: lista esplicita dal CMS
      for (const voce of sezione.specialItems) {
        if (voce.piatto) {
          const id = resolveId(voce.piatto as Piatto | string);
          const found = id ? piatti.find((p) => p.id === id) : null;
          if (found) piattiSezione.push(found);
        }
        if (voce.vino) {
          const id = resolveId(voce.vino as Vino | string);
          const found = id ? vini.find((v) => v.id === id) : null;
          if (found) viniSezione.push(found);
        }
      }
    } else if (sezione.categoria) {
      // 2b. Modalità standard: tutti i piatti della categoria
      const catId = resolveId(sezione.categoria as CategoriaMenu | string);
      if (catId) {
        piattiSezione = piattiByCategoria.get(catId) ?? [];
      }
    }

    // 3. Ordina per campo `ordine` (ascendente, undefined va in fondo)
    piattiSezione = [...piattiSezione].sort(
      (a, b) => (a.ordine ?? 9999) - (b.ordine ?? 9999)
    );
    viniSezione = [...viniSezione].sort(
      (a, b) => (a.ordine ?? 9999) - (b.ordine ?? 9999)
    );

    risultati.push({
      slug: sezione.slug,
      titolo: sezione.titolo,
      piatti: piattiSezione,
      vini: viniSezione,
      isSpecialPeriod,
    });
  }

  // 4. Ordina le sezioni per campo `ordine`
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
    [input.activeSlot, input.menuConfig, input.piatti, input.vini]
  );
}
