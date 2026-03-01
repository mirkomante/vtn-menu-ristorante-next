/**
 * Client API per il fetching dei dati dal backend PayloadCMS e da GCS.
 *
 * - getStaticMenuData(): usata a build-time (Server Components)
 * - getRealTimeAvailability(): usata lato client per aggiornamenti in tempo reale
 *
 * STRUTTURA BACKEND REALE (verificata via API):
 * - menu-config: { standardItems[], isActive, activeRange, ... }
 *   - standardItems[]: { id, label, filterMode, visibility, sourceCollection[], targetCategories[] }
 *   - targetCategories[]: { relationTo: string, value: { id, nome, ... } }
 *   - visibility: "lunch_only" | "dinner_only" | "always"
 *   - sourceCollection: array (es. ["piatti"], ["bevande", "birre"])
 * - generali: { scheduleWeekly[], lunchSlot, dinnerSlot, exceptions[] }
 * - piatti: id numerico, categoria embedded, campi booleani dietetici
 * - vini: depth=1 (tipologia popolata); nazione/regione/zona arrivano come ID numerici
 *   → hydratati a build-time con le lookup map di nazioni/regioni/zone
 * - birre/bevande/liquori: depth=1 (tipologia popolata); nazione come ID numerico
 *   → hydratati a build-time con la lookup map di nazioni
 * - Categorie: NON hanno endpoint proprio — estratte dai piatti
 */

import type {
  Allergene,
  Bevanda,
  Birra,
  CategoriaMenu,
  Generali,
  Liquore,
  MenuConfig,
  MenuFisso,
  MenuItem,
  MenuItemGroup,
  Nazione,
  OrdinamentoCategoriapiatto,
  OrdinamentoMenu,
  OrdinamentoSezione,
  OrdinamentoTipologia,
  PayloadListResponse,
  Piatto,
  Regione,
  SezioneMenuConfig,
  SezioneRisolta,
  SourceCollection,
  StaticMenuData,
  TargetCategoryRef,
  Vino,
  Zona,
} from "@/types";
import type { DisponibilitaResponse } from "@/types/disponibilita";

// ---------------------------------------------------------------------------
// Costanti
// ---------------------------------------------------------------------------

const PAYLOAD_URL = process.env.NEXT_PUBLIC_PAYLOAD_URL ?? "";
const MENU_JSON_URL = process.env.NEXT_PUBLIC_MENU_JSON_URL ?? "";

const PAYLOAD_LIMIT = 100;

// ---------------------------------------------------------------------------
// Helpers interni — fetch
// ---------------------------------------------------------------------------

/**
 * Recupera tutti i documenti di una collection Payload gestendo la paginazione.
 */
async function fetchAllDocs<T>(
  collection: string,
  params: Record<string, string> = {}
): Promise<T[]> {
  const allDocs: T[] = [];
  let page = 1;
  let hasNextPage = true;

  while (hasNextPage) {
    const query = new URLSearchParams({
      limit: String(PAYLOAD_LIMIT),
      page: String(page),
      ...params,
    });

    const url = `${PAYLOAD_URL}/api/${collection}?${query.toString()}`;
    const res = await fetch(url, { next: { revalidate: 3600 } });

    if (!res.ok) {
      throw new Error(
        `Payload API error [${collection}]: ${res.status} ${res.statusText}`
      );
    }

    const data: PayloadListResponse<T> = await res.json();
    allDocs.push(...data.docs);
    hasNextPage = data.hasNextPage;
    page++;
  }

  return allDocs;
}

/**
 * Recupera un Global di Payload in modo sicuro.
 * Restituisce null su 404/500 o se la risposta è un oggetto vuoto.
 *
 * @param depth - Profondità di popolamento delle relazioni (default: 2).
 *   Usare 1 o 0 per globals che non supportano depth=2 (es. ordinamento-menu).
 * @param noCache - Se true, bypassa la cache Next.js (utile dopo fix backend).
 */
async function fetchGlobalSafe<T>(globalSlug: string, depth = 2, noCache = false): Promise<T | null> {
  const url = `${PAYLOAD_URL}/api/globals/${globalSlug}?depth=${depth}`;

  try {
    const fetchOptions: RequestInit = noCache
      ? { cache: "no-store" }
      : { next: { revalidate: 3600 } };
    const res = await fetch(url, fetchOptions);

    if (!res.ok) {
      console.warn(`[api] Global "${globalSlug}" non disponibile (${res.status}). Uso fallback.`);
      return null;
    }

    const data = await res.json();

    // Oggetto vuoto {} = global non ancora configurato
    if (!data || Object.keys(data).length === 0) {
      console.warn(`[api] Global "${globalSlug}" vuoto. Uso fallback.`);
      return null;
    }

    return data as T;
  } catch (err) {
    console.warn(`[api] Errore nel fetch del global "${globalSlug}":`, err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Helpers: slug e categorie
// ---------------------------------------------------------------------------

/**
 * Genera uno slug URL-safe da un testo (es. "I menù pranzo" → "i-menu-pranzo").
 */
export function slugify(nome: string): string {
  return nome
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

/**
 * Estrae le categorie uniche dai piatti (nessun endpoint dedicato nel backend).
 * Ordina per id ascendente (ordine stabile = ordine di creazione nel CMS).
 */
function extractCategorie(piatti: Piatto[]): CategoriaMenu[] {
  const seen = new Map<number, CategoriaMenu>();

  for (const piatto of piatti) {
    const cat = piatto.categoria;
    if (typeof cat === "object" && cat !== null && !seen.has(cat.id)) {
      seen.set(cat.id, {
        ...cat,
        slug: slugify(cat.nome),
        inLista: (cat as CategoriaMenu & { inLista?: boolean }).inLista ?? true,
        attiva: true,
      });
    }
  }

  return Array.from(seen.values()).sort((a, b) => a.id - b.id);
}

/**
 * Normalizza i standardItems del backend aggiungendo gli slug (non presenti nel CMS)
 * e garantendo che i campi abbiano i tipi corretti.
 */
function normalizeStandardItems(
  rawItems: unknown[],
  ordineBase: number
): SezioneMenuConfig[] {
  return rawItems.map((item, index) => {
    const raw = item as Record<string, unknown>;

    const label = String(raw.label ?? "Sezione");
    const slug = slugify(label);
    const filterMode = (raw.filterMode as SezioneMenuConfig["filterMode"]) ?? "all";
    const visibility = (raw.visibility as SezioneMenuConfig["visibility"]) ?? "always";

    // sourceCollection è un array nel backend reale
    const sourceCollection: SourceCollection[] = Array.isArray(raw.sourceCollection)
      ? (raw.sourceCollection as SourceCollection[])
      : ["piatti"];

    // targetCategories è un array di { relationTo, value: { id, nome, ... } }
    const targetCategories: TargetCategoryRef[] = Array.isArray(raw.targetCategories)
      ? (raw.targetCategories as TargetCategoryRef[])
      : [];

    return {
      id: raw.id as string | undefined,
      label,
      slug,
      visibility,
      sourceCollection,
      filterMode,
      targetCategories,
      ordine: ordineBase + index,
    };
  });
}

// ---------------------------------------------------------------------------
// Fallback per globals non configurati
// ---------------------------------------------------------------------------

const FALLBACK_MENU_CONFIG: MenuConfig = {
  id: "fallback",
  nomeRistorante: "Vietnamonamour",
  standardItems: [],
  updatedAt: new Date().toISOString(),
};

/** Default usato quando il global "ordinamento-menu" non è configurato */
const FALLBACK_ORDINAMENTO_MENU: OrdinamentoMenu = {};

const FALLBACK_GENERALI: Generali = {
  id: "fallback",
  scheduleWeekly: [
    { day: "monday",    isOpen: false },
    { day: "tuesday",   isOpen: true, hours: [{ start: "12:00", end: "15:00" }, { start: "19:00", end: "23:00" }] },
    { day: "wednesday", isOpen: true, hours: [{ start: "12:00", end: "15:00" }, { start: "19:00", end: "23:00" }] },
    { day: "thursday",  isOpen: true, hours: [{ start: "12:00", end: "15:00" }, { start: "19:00", end: "23:00" }] },
    { day: "friday",    isOpen: true, hours: [{ start: "12:00", end: "15:00" }, { start: "19:00", end: "23:00" }] },
    { day: "saturday",  isOpen: true, hours: [{ start: "12:00", end: "15:00" }, { start: "19:00", end: "23:00" }] },
    { day: "sunday",    isOpen: true, hours: [{ start: "12:00", end: "15:00" }, { start: "19:00", end: "23:00" }] },
  ],
  lunchSlot:  { start: "12:00", end: "15:00" },
  dinnerSlot: { start: "19:00", end: "23:00" },
  exceptions: [],
  updatedAt: new Date().toISOString(),
};

// ---------------------------------------------------------------------------
// Query Builder — risoluzione sezioni virtuali
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Helpers: conversione a MenuItem
// ---------------------------------------------------------------------------

/** Aggiunge il discriminante `_type` a un Piatto per ottenere un MenuItem */
function piattoToItem(p: Piatto): MenuItem { return { ...p, _type: "piatto" }; }
/** Aggiunge il discriminante `_type` a un Vino per ottenere un MenuItem */
function vinoToItem(v: Vino): MenuItem { return { ...v, _type: "vino" }; }
/** Aggiunge il discriminante `_type` a una Bevanda per ottenere un MenuItem */
function bevandaToItem(b: Bevanda): MenuItem { return { ...b, _type: "bevanda" }; }
/** Aggiunge il discriminante `_type` a una Birra per ottenere un MenuItem */
function birraToItem(b: Birra): MenuItem { return { ...b, _type: "birra" }; }
/** Aggiunge il discriminante `_type` a un Liquore per ottenere un MenuItem */
function liquoreToItem(l: Liquore): MenuItem { return { ...l, _type: "liquore" }; }

// ---------------------------------------------------------------------------
// Helpers: estrazione ID categoria da un record generico
// ---------------------------------------------------------------------------

function extractCatId(cat: unknown): number | undefined {
  if (typeof cat === "number") return cat;
  if (typeof cat === "object" && cat !== null) {
    const id = (cat as Record<string, unknown>).id;
    if (typeof id === "number") return id;
    if (typeof id === "string") return parseInt(id, 10) || undefined;
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Query Builder — risoluzione sezioni virtuali
// ---------------------------------------------------------------------------

/**
 * Mappa ogni SourceCollection al suo array grezzo e alla funzione di conversione.
 * Usata da resolveMenuSection per iterare in modo agnostico sulle sorgenti.
 */
type SourceData = {
  piatti: Piatto[];
  vini: Vino[];
  bevande: Bevanda[];
  birre: Birra[];
  liquori: Liquore[];
};

/**
 * Estrae i target ID pertinenti a una specifica sorgente, filtrando per `relationTo`.
 * Ogni sorgente ha il proprio `relationTo` nel backend Payload (struttura polimorphic).
 */
function getTargetIdsForSource(
  source: SourceCollection,
  targetCategories: TargetCategoryRef[],
  filterMode: SezioneMenuConfig["filterMode"]
): Set<number> {
  const ids = new Set<number>();
  if (filterMode === "all" || !targetCategories.length) return ids;

  const relationToMap: Record<string, string> = {
    piatti:   "categoria-piatti",
    vini:     "categoria-vini",
    bevande:  "categoria-bevande",
    birre:    "categoria-birre",
    liquori:  "categoria-liquori",
  };

  const expectedRelationTo = relationToMap[source];

  for (const ref of targetCategories) {
    // Se non c'è una mappatura nota, includiamo tutti i target (comportamento permissivo)
    if (!expectedRelationTo || ref.relationTo === expectedRelationTo) {
      const id = extractCatId(ref.value as unknown);
      if (id !== undefined) ids.add(id);
    }
  }

  return ids;
}

/**
 * Applica il filtro per categoria a un array di item già convertiti in MenuItem.
 * Usa `extractCatId` per gestire sia oggetti popolati che ID numerici.
 */
function applyFilter<T extends { categoria?: unknown }>(
  items: T[],
  targetIds: Set<number>,
  filterMode: SezioneMenuConfig["filterMode"]
): T[] {
  if (filterMode === "all" || targetIds.size === 0) return items;

  return items.filter((item) => {
    const catId = extractCatId(item.categoria);
    if (catId === undefined) return false;
    return filterMode === "include" ? targetIds.has(catId) : !targetIds.has(catId);
  });
}

// ---------------------------------------------------------------------------
// Helpers: sort e group dinamico (OrdinamentoMenu)
// ---------------------------------------------------------------------------

/**
 * Legge un valore annidato da un MenuItem tramite una chiave semplice o composta
 * (es. "nome", "prezzo", "regione.nome", "tipologia.nome").
 * Restituisce `undefined` se il percorso non esiste.
 */
function getNestedValue(item: MenuItem, key: string): unknown {
  const parts = key.split(".");
  let current: unknown = item;
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

/**
 * Mappa `OrdinamentoOrderBy` al percorso del campo da usare per il sort.
 * I valori che corrispondono a campi annidati usano la dot-notation.
 */
function orderByFieldPath(orderBy: OrdinamentoSezione["orderBy"]): string {
  switch (orderBy) {
    case "order":     return "ordine";
    case "prezzo":    return "prezzo";
    case "nome":      return "nome";
    case "regione":   return "regione.nome";
    case "nazione":   return "nazione.nome";
    case "tipologia": return "tipologia.nome";
    case "categoria": return "categoria.nome";
    default:          return "ordine";
  }
}

/**
 * Ordina un array di MenuItem secondo le regole di `OrdinamentoSezione`.
 * Supporta campi semplici (`nome`, `prezzo`, `ordine`) e annidati (`regione.nome`).
 * Default: `orderBy: "order"`, `orderDirection: "asc"`.
 */
function sortItems(items: MenuItem[], regole: OrdinamentoSezione): MenuItem[] {
  const { orderBy = "order", orderDirection = "asc" } = regole;
  const dir = orderDirection === "asc" ? 1 : -1;
  const fieldPath = orderByFieldPath(orderBy);

  return [...items].sort((a, b) => {
    let va: unknown;
    let vb: unknown;

    if (orderBy === "order") {
      // Campo `ordine` con fallback numerico — confronto numerico diretto
      va = a.ordine ?? 9999;
      vb = b.ordine ?? 9999;
      return ((va as number) - (vb as number)) * dir;
    }

    if (orderBy === "prezzo") {
      va = a.prezzo;
      vb = b.prezzo;
      return ((va as number) - (vb as number)) * dir;
    }

    // Tutti gli altri criteri (nome, regione, nazione, tipologia, categoria):
    // legge il valore tramite dot-notation e confronta come stringa
    va = getNestedValue(a, fieldPath);
    vb = getNestedValue(b, fieldPath);
    return String(va ?? "").localeCompare(String(vb ?? ""), "it") * dir;
  });
}

/**
 * Mappa `OrdinamentoGroupBy` al percorso del campo nell'item.
 * Restituisce `null` se il raggruppamento è "nessuno".
 */
function groupByFieldPath(
  groupBy: OrdinamentoSezione["groupBy"]
): string | null {
  switch (groupBy) {
    case "categoria":  return "categoria.nome";
    case "tipologia":  return "tipologia.nome";
    case "regione":    return "regione.nome";
    case "nazione":    return "nazione.nome";
    default:           return null; // "nessuno" o undefined
  }
}

/**
 * Raggruppa un array di MenuItem per il campo specificato.
 * Gli item senza valore nel campo di raggruppamento finiscono nel gruppo "Altro".
 * I gruppi sono ordinati alfabeticamente per titolo (stabile e prevedibile).
 */
function groupItems(items: MenuItem[], fieldPath: string): MenuItemGroup[] {
  const map = new Map<string, MenuItem[]>();

  for (const item of items) {
    const raw = getNestedValue(item, fieldPath);
    const key = raw !== null && raw !== undefined ? String(raw) : "Altro";
    const bucket = map.get(key);
    if (bucket) {
      bucket.push(item);
    } else {
      map.set(key, [item]);
    }
  }

  // Ordina i gruppi: "Altro" sempre in fondo, gli altri alfabeticamente
  const entries = Array.from(map.entries()).sort(([a], [b]) => {
    if (a === "Altro") return 1;
    if (b === "Altro") return -1;
    return a.localeCompare(b, "it");
  });

  return entries.map(([title, groupItems]) => ({ title, items: groupItems }));
}

/**
 * Determina le regole di ordinamento/raggruppamento da applicare a una sezione,
 * in base alla `primarySource` (prima sorgente non-menu-fisso nella lista).
 *
 * Legge i campi flat del backend (es. `piattiOrderBy`, `viniGroupBy`) e li
 * normalizza in un oggetto `OrdinamentoSezione` per uso interno.
 */
function getRegolePerSezione(
  sources: SourceCollection[],
  ordinamento: OrdinamentoMenu
): OrdinamentoSezione {
  const primarySource = sources.find((s) => s !== "menu-fisso");
  if (!primarySource) return {};

  const prefixMap: Partial<Record<SourceCollection, string>> = {
    piatti:  "piatti",
    vini:    "vini",
    bevande: "bevande",
    birre:   "birre",
    liquori: "liquori",
  };

  const prefix = prefixMap[primarySource];
  if (!prefix) return {};

  const raw = ordinamento as Record<string, unknown>;

  return {
    orderBy:        (raw[`${prefix}OrderBy`]        as OrdinamentoSezione["orderBy"])        ?? "order",
    orderDirection: (raw[`${prefix}OrderDirection`] as OrdinamentoSezione["orderDirection"]) ?? "asc",
    groupBy:        (raw[`${prefix}GroupBy`]        as OrdinamentoSezione["groupBy"])        ?? "nessuno",
  };
}

/**
 * Restituisce l'array ordinato di categorie/tipologie per la `primarySource`,
 * oppure `null` se non disponibile.
 *
 * Mappa:
 * - piatti  → `categoriePiatti`
 * - vini    → `tipologieVino`
 * - liquori → `tipologieLiquore`
 * - birre   → `tipologieBirra`
 * - bevande → `tipologieBevanda`
 */
function getArrayOrdinato(
  source: SourceCollection,
  ordinamento: OrdinamentoMenu
): OrdinamentoCategoriapiatto[] | OrdinamentoTipologia[] | null {
  switch (source) {
    case "piatti":  return ordinamento.categoriePiatti?.length  ? ordinamento.categoriePiatti  : null;
    case "vini":    return ordinamento.tipologieVino?.length    ? ordinamento.tipologieVino    : null;
    case "liquori": return ordinamento.tipologieLiquore?.length ? ordinamento.tipologieLiquore : null;
    case "birre":   return ordinamento.tipologieBirra?.length   ? ordinamento.tipologieBirra   : null;
    case "bevande": return ordinamento.tipologieBevanda?.length ? ordinamento.tipologieBevanda : null;
    default:        return null;
  }
}

/**
 * Raggruppa i piatti usando `categoriePiatti` come driver dell'ordine.
 *
 * Per ogni categoria nell'array (già ordinato dal CMS):
 * - Se la categoria ha `elementi.docs`, usa quell'ordine per i piatti interni.
 * - Altrimenti, filtra per `categoria.id` e ordina con `regole`.
 * - I piatti senza categoria corrispondente finiscono in "Altro" (in fondo).
 */
function groupPiattiByCategorie(
  items: MenuItem[],
  categorie: OrdinamentoCategoriapiatto[],
  regole: OrdinamentoSezione
): MenuItemGroup[] {
  const groups: MenuItemGroup[] = [];
  const assegnati = new Set<number>();

  for (const cat of categorie) {
    const elementiDocs = (cat as OrdinamentoCategoriapiatto).elementi?.docs;

    let groupItems: MenuItem[];

    if (elementiDocs && elementiDocs.length > 0) {
      // Ordine esplicito da `elementi.docs`: rispetta l'ordine del CMS
      const docsSet = new Set(elementiDocs);
      const byId = new Map(items.filter((i) => docsSet.has(i.id)).map((i) => [i.id, i]));
      groupItems = elementiDocs
        .map((id) => byId.get(id))
        .filter((i): i is MenuItem => i !== undefined);
    } else {
      // Fallback: filtra per categoria.id e ordina con regole
      const catItems = items.filter((item) => {
        const catId = extractCatId((item as unknown as Record<string, unknown>).categoria);
        return catId === cat.id;
      });
      groupItems = sortItems(catItems, regole);
    }

    if (groupItems.length === 0) continue;

    groupItems.forEach((i) => assegnati.add(i.id));
    groups.push({ title: cat.nome, items: groupItems });
  }

  // Piatti non assegnati a nessuna categoria → gruppo "Altro"
  const altri = sortItems(
    items.filter((i) => !assegnati.has(i.id)),
    regole
  );
  if (altri.length > 0) {
    groups.push({ title: "Altro", items: altri });
  }

  return groups;
}

/**
 * Raggruppa gli item per tipologia usando `tipologie` come driver dell'ordine.
 *
 * Per ogni tipologia nell'array (già ordinato dal CMS):
 * - Filtra gli item per `tipologia.id`.
 * - Ordina gli item interni con `regole`.
 * - Gli item senza tipologia corrispondente finiscono in "Altro" (in fondo).
 */
function groupByTipologie(
  items: MenuItem[],
  tipologie: OrdinamentoTipologia[],
  regole: OrdinamentoSezione
): MenuItemGroup[] {
  const groups: MenuItemGroup[] = [];
  const assegnati = new Set<number>();

  for (const tip of tipologie) {
    const tipItems = items.filter((item) => {
      const t = (item as unknown as Record<string, unknown>).tipologia;
      if (typeof t === "number") return t === tip.id;
      if (typeof t === "object" && t !== null) {
        return (t as Record<string, unknown>).id === tip.id;
      }
      return false;
    });

    if (tipItems.length === 0) continue;

    const sorted = sortItems(tipItems, regole);
    sorted.forEach((i) => assegnati.add(i.id));
    groups.push({ title: tip.nome, items: sorted });
  }

  // Item non assegnati a nessuna tipologia → gruppo "Altro"
  const altri = sortItems(
    items.filter((i) => !assegnati.has(i.id)),
    regole
  );
  if (altri.length > 0) {
    groups.push({ title: "Altro", items: altri });
  }

  return groups;
}

/**
 * Applica sort e grouping a un array di MenuItem secondo le regole editoriali.
 *
 * Logica di priorità:
 * 1. Se `ordinamento` contiene l'array ordinato per la `primarySource`
 *    (es. `categoriePiatti` per piatti, `tipologieVino` per vini) → usa quello
 *    come driver dell'ordine dei gruppi (fonte di verità editoriale).
 * 2. Altrimenti → raggruppamento dinamico automatico (`groupBy` + `groupItems`).
 * 3. Se `groupBy === "nessuno"` → lista piatta (un singolo gruppo senza titolo).
 */
function applyOrdinamento(
  items: MenuItem[],
  regole: OrdinamentoSezione,
  primarySource: SourceCollection | undefined,
  ordinamento: OrdinamentoMenu
): MenuItemGroup[] {
  // ── Path 1: array ordinato dal CMS (fonte di verità) ──────────────────────
  if (primarySource) {
    const arrayOrdinato = getArrayOrdinato(primarySource, ordinamento);

    if (arrayOrdinato && arrayOrdinato.length > 0) {
      if (primarySource === "piatti") {
        return groupPiattiByCategorie(
          items,
          arrayOrdinato as OrdinamentoCategoriapiatto[],
          regole
        );
      }
      // vini, liquori, birre, bevande → raggruppamento per tipologia
      return groupByTipologie(items, arrayOrdinato as OrdinamentoTipologia[], regole);
    }
  }

  // ── Path 2: raggruppamento dinamico automatico (fallback) ─────────────────
  const sorted = sortItems(items, regole);
  const fieldPath = groupByFieldPath(regole.groupBy);

  if (!fieldPath) {
    return [{ items: sorted }];
  }

  return groupItems(sorted, fieldPath);
}

/**
 * Risolve una sezione virtuale del menu applicando la logica del Query Builder
 * con approccio **Multi-Source Additivo**: ogni sorgente in `sourceCollection`
 * viene processata e filtrata indipendentemente, poi i risultati vengono uniti.
 *
 * Applica poi sort e grouping dinamico secondo `OrdinamentoMenu`.
 *
 * Restituisce `{ groups: MenuItemGroup[], menuFissi: MenuFisso[] }`:
 * - `groups`: item raggruppati e ordinati (lista piatta = 1 gruppo senza titolo)
 * - `menuFissi`: menu a prezzo fisso (struttura diversa, renderizzati separatamente)
 *
 * Collection supportate: "piatti", "vini", "bevande", "birre", "liquori", "menu-fisso"
 */
export function resolveMenuSection(
  sezione: SezioneMenuConfig,
  piatti: Piatto[],
  vini: Vino[],
  menuFissi: MenuFisso[],
  bevande: Bevanda[],
  birre: Birra[],
  liquori: Liquore[],
  ordinamento: OrdinamentoMenu = {}
): { groups: MenuItemGroup[]; menuFissi: MenuFisso[] } {
  const sources = sezione.sourceCollection ?? ["piatti"];
  const filterMode = sezione.filterMode ?? "all";
  const targetCategories = sezione.targetCategories ?? [];

  // ── Menu Fisso — gestito separatamente (struttura dati diversa da MenuItem) ──
  if (sources.includes("menu-fisso")) {
    const mfTargetIds = new Set<number>();
    if (filterMode !== "all") {
      for (const ref of targetCategories) {
        if (ref.relationTo === "categoria-menu-fisso") {
          const id = extractCatId(ref.value as unknown);
          if (id !== undefined) mfTargetIds.add(id);
        }
      }
    }

    let mfRisolti = filterMode === "all" || mfTargetIds.size === 0
      ? [...menuFissi]
      : menuFissi.filter((mf) => {
          const catId = extractCatId(mf.categoria);
          if (catId === undefined) return false;
          return filterMode === "include" ? mfTargetIds.has(catId) : !mfTargetIds.has(catId);
        });

    mfRisolti.sort((a, b) => (a.ordine ?? 9999) - (b.ordine ?? 9999));
    return { groups: [], menuFissi: mfRisolti };
  }

  // ── Logica Multi-Source Additiva ──────────────────────────────────────────
  const sourceData: SourceData = { piatti, vini, bevande, birre, liquori };

  type SourceEntry =
    | { raw: Piatto[];   convert: (x: Piatto)   => MenuItem }
    | { raw: Vino[];     convert: (x: Vino)     => MenuItem }
    | { raw: Bevanda[];  convert: (x: Bevanda)  => MenuItem }
    | { raw: Birra[];    convert: (x: Birra)    => MenuItem }
    | { raw: Liquore[];  convert: (x: Liquore)  => MenuItem };

  const sourceMap: Record<string, SourceEntry> = {
    piatti:  { raw: sourceData.piatti,  convert: piattoToItem  as (x: Piatto)   => MenuItem },
    vini:    { raw: sourceData.vini,    convert: vinoToItem    as (x: Vino)     => MenuItem },
    bevande: { raw: sourceData.bevande, convert: bevandaToItem as (x: Bevanda)  => MenuItem },
    birre:   { raw: sourceData.birre,   convert: birraToItem   as (x: Birra)    => MenuItem },
    liquori: { raw: sourceData.liquori, convert: liquoreToItem as (x: Liquore)  => MenuItem },
  };

  const allItems: MenuItem[] = [];

  for (const source of sources) {
    const entry = sourceMap[source as keyof typeof sourceMap];

    if (!entry) {
      console.warn(`[resolveMenuSection] "${sezione.label}" — sourceCollection "${source}" non supportata. Ignorata.`);
      continue;
    }

    const targetIds = getTargetIdsForSource(source as SourceCollection, targetCategories, filterMode);

    if (filterMode !== "all" && targetCategories.length > 0 && targetIds.size === 0) {
      console.warn(
        `[resolveMenuSection] "${sezione.label}" | source="${source}" | filterMode="${filterMode}" ` +
        `ma nessun targetCategory pertinente trovato. Mostro tutti gli item di questa sorgente.`
      );
    }

    const filtered = applyFilter(
      entry.raw as Array<{ categoria?: unknown }>,
      targetIds,
      filterMode
    );

    const converted = filtered.map((item) => entry.convert(item as never));
    allItems.push(...converted);
  }

  // Applica sort e grouping secondo la configurazione editoriale
  const sourcesTyped = sources as SourceCollection[];
  const primarySource = sourcesTyped.find((s) => s !== "menu-fisso");
  const regole = getRegolePerSezione(sourcesTyped, ordinamento);
  const groups = applyOrdinamento(allItems, regole, primarySource, ordinamento);

  return { groups, menuFissi: [] };
}

/**
 * Risolve tutte le sezioni del menu-config a build-time,
 * applicando sort e grouping secondo `OrdinamentoMenu`.
 */
function resolveAllSezioni(
  sezioni: SezioneMenuConfig[],
  piatti: Piatto[],
  vini: Vino[],
  menuFissi: MenuFisso[],
  bevande: Bevanda[],
  birre: Birra[],
  liquori: Liquore[],
  ordinamento: OrdinamentoMenu
): SezioneRisolta[] {
  return sezioni.map((sezione): SezioneRisolta => {
    const { groups, menuFissi: menuFissiRisolti } =
      resolveMenuSection(sezione, piatti, vini, menuFissi, bevande, birre, liquori, ordinamento);

    return {
      slug: sezione.slug,
      titolo: sezione.label,
      groups,
      menuFissi: menuFissiRisolti,
      isSpecialPeriod: false,
    };
  });
}

// ---------------------------------------------------------------------------
// Helpers: hydration relazioni geografiche
// ---------------------------------------------------------------------------

/**
 * Sostituisce gli ID numerici di nazione/regione/zona nei vini con i rispettivi
 * oggetti popolati, usando lookup map costruite a build-time.
 *
 * Il backend Payload non popola queste relazioni nemmeno con depth=2 quando
 * sono relazioni "semplici" (non embedded). La soluzione raccomandata è il
 * lookup lato frontend a build-time: zero chiamate extra a runtime.
 */
function hydrateVini(
  vini: Vino[],
  nazioniMap: Map<number, Nazione>,
  regioniMap: Map<number, Regione>,
  zoneMap: Map<number, Zona>
): Vino[] {
  return vini.map((v) => ({
    ...v,
    nazione: typeof v.nazione === "number"
      ? (nazioniMap.get(v.nazione) ?? v.nazione)
      : v.nazione,
    regione: typeof v.regione === "number"
      ? (regioniMap.get(v.regione) ?? v.regione)
      : v.regione,
    zona: typeof v.zona === "number"
      ? (zoneMap.get(v.zona) ?? v.zona)
      : v.zona,
  }));
}

/**
 * Sostituisce l'ID numerico di nazione in birre, liquori e bevande con
 * l'oggetto Nazione popolato.
 */
function hydrateNazione<T extends { nazione?: Nazione | number | null }>(
  items: T[],
  nazioniMap: Map<number, Nazione>
): T[] {
  return items.map((item) => ({
    ...item,
    nazione: typeof item.nazione === "number"
      ? (nazioniMap.get(item.nazione) ?? item.nazione)
      : item.nazione,
  }));
}

// ---------------------------------------------------------------------------
// API pubblica — Build-time
// ---------------------------------------------------------------------------

/**
 * Recupera tutti i dati necessari per la build statica del menu.
 *
 * Strategia di resilienza:
 * - Piatti, vini, allergeni: obbligatori — se falliscono, la build fallisce.
 * - Categorie: estratte dai piatti (nessuna chiamata API separata).
 * - menu-config, generali: opzionali — se non configurati, si usano fallback.
 * - nazioni, regioni, zone: opzionali — se vuoti, i campi geografici restano ID numerici
 *   (la DishCard li ignora silenziosamente grazie a getNome()).
 *
 * @throws {Error} se le collection principali non sono raggiungibili
 */
export async function getStaticMenuData(): Promise<StaticMenuData> {
  if (!PAYLOAD_URL) {
    throw new Error("NEXT_PUBLIC_PAYLOAD_URL non è configurata nelle variabili d'ambiente.");
  }

  const [
    piatti, vini, menuFissi, bevande, birre, liquori, allergeni,
    nazioniRaw, regioniRaw, zoneRaw,
    menuConfigRaw, generaliRaw, ordinamentoMenuRaw,
  ] = await Promise.all([
    fetchAllDocs<Piatto>("piatti", { where: '{"inLista":{"equals":true}}' }),
    fetchAllDocs<Vino>("vini", { where: '{"inLista":{"equals":true}}', depth: "1" }),
    fetchAllDocs<MenuFisso>("menu-fisso", { where: '{"inLista":{"equals":true}}', depth: "2" }),
    fetchAllDocs<Bevanda>("bevande", { where: '{"inLista":{"equals":true}}', depth: "1" }),
    fetchAllDocs<Birra>("birre", { where: '{"inLista":{"equals":true}}', depth: "1" }),
    fetchAllDocs<Liquore>("liquori", { where: '{"inLista":{"equals":true}}', depth: "1" }),
    fetchAllDocs<Allergene>("allergeni"),
    fetchAllDocs<Nazione>("nazioni").catch(() => [] as Nazione[]),
    fetchAllDocs<Regione>("regioni").catch(() => [] as Regione[]),
    fetchAllDocs<Zona>("zone").catch(() => [] as Zona[]),
    fetchGlobalSafe<MenuConfig>("menu-config"),
    fetchGlobalSafe<Generali>("generali"),
    fetchGlobalSafe<OrdinamentoMenu>("ordinamento-menu", 1, true),
  ]);

  // Costruisce lookup map id→oggetto per la hydration geografica
  const nazioniMap = new Map(nazioniRaw.map((n) => [n.id, n]));
  const regioniMap = new Map(regioniRaw.map((r) => [r.id, r]));
  const zoneMap    = new Map(zoneRaw.map((z) => [z.id, z]));

  // Hydration: sostituisce gli ID numerici con gli oggetti popolati
  const viniHydrated     = hydrateVini(vini, nazioniMap, regioniMap, zoneMap);
  const birreHydrated    = hydrateNazione(birre, nazioniMap);
  const liquoriHydrated  = hydrateNazione(liquori, nazioniMap);
  const bevandeHydrated  = hydrateNazione(bevande, nazioniMap);

  const categorie = extractCategorie(piatti);

  // generali: usa fallback se mancante o senza scheduleWeekly
  const generali = (!generaliRaw || !generaliRaw.scheduleWeekly?.length)
    ? FALLBACK_GENERALI
    : generaliRaw;

  // menu-config: normalizza standardItems dal backend reale
  let menuConfig: MenuConfig;
  const rawStandardItems = (menuConfigRaw as Record<string, unknown> | null)?.standardItems;

  if (menuConfigRaw && Array.isArray(rawStandardItems) && rawStandardItems.length > 0) {
    // Global configurato con sezioni reali
    const sezioniNormalizzate = normalizeStandardItems(rawStandardItems, 0);
    menuConfig = {
      ...FALLBACK_MENU_CONFIG,
      ...menuConfigRaw,
      standardItems: sezioniNormalizzate,
    };
  } else {
    // Fallback: genera sezioni automatiche dalle categorie estratte
    menuConfig = {
      ...FALLBACK_MENU_CONFIG,
      standardItems: categorie.map((cat, index) => ({
        label: cat.nome,
        slug: cat.slug,
        visibility: "always" as const,
        sourceCollection: ["piatti"] as SourceCollection[],
        filterMode: "include" as const,
        targetCategories: [{ relationTo: "categoria-piatti", value: { id: cat.id, nome: cat.nome } }],
        ordine: index,
      })),
    };
  }

  const ordinamentoMenu: OrdinamentoMenu = ordinamentoMenuRaw ?? FALLBACK_ORDINAMENTO_MENU;

  // Risolvi tutte le sezioni a build-time (Query Builder + sort/group) — usa le versioni hydrated
  const sezioniRisolte = resolveAllSezioni(
    menuConfig.standardItems!,
    piatti, viniHydrated, menuFissi, bevandeHydrated, birreHydrated, liquoriHydrated,
    ordinamentoMenu
  );

  return {
    piatti,
    vini: viniHydrated,
    menuFissi,
    bevande: bevandeHydrated,
    birre: birreHydrated,
    liquori: liquoriHydrated,
    categorie, allergeni, menuConfig, generali, ordinamentoMenu, sezioniRisolte,
  };
}

// ---------------------------------------------------------------------------
// API pubblica — Client-side (real-time)
// ---------------------------------------------------------------------------

/**
 * Recupera il file JSON di disponibilità da Google Cloud Storage.
 * Pensata per essere chiamata lato client (useEffect / polling).
 */
export async function getRealTimeAvailability(): Promise<DisponibilitaResponse | null> {
  if (!MENU_JSON_URL) {
    console.warn("NEXT_PUBLIC_MENU_JSON_URL non è configurata. Disponibilità non disponibile.");
    return null;
  }

  try {
    const res = await fetch(MENU_JSON_URL, { cache: "no-store" });

    if (!res.ok) {
      console.error(`Errore nel recupero della disponibilità: ${res.status} ${res.statusText}`);
      return null;
    }

    return res.json() as Promise<DisponibilitaResponse>;
  } catch (err) {
    console.error("Errore di rete nel recupero della disponibilità:", err);
    return null;
  }
}
