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
  PayloadListResponse,
  Piatto,
  SezioneMenuConfig,
  SezioneRisolta,
  SourceCollection,
  StaticMenuData,
  TargetCategoryRef,
  Vino,
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
 */
async function fetchGlobalSafe<T>(globalSlug: string): Promise<T | null> {
  // depth=2 necessario per popolare le relazioni (es. targetCategories.value)
  const url = `${PAYLOAD_URL}/api/globals/${globalSlug}?depth=2`;

  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });

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
 * Risolve una sezione virtuale del menu applicando la logica del Query Builder.
 *
 * Restituisce `{ items: MenuItem[], menuFissi: MenuFisso[] }`:
 * - `items`: lista unificata di voci renderizzabili (piatti, vini, bevande, birre, liquori)
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
  liquori: Liquore[]
): { items: MenuItem[]; menuFissi: MenuFisso[] } {
  const sources = sezione.sourceCollection ?? ["piatti"];
  const filterMode = sezione.filterMode ?? "all";

  // Determina la collection primaria (prima riconosciuta)
  const primarySource = sources.find(
    (s) => s === "piatti" || s === "vini" || s === "menu-fisso" ||
           s === "bevande" || s === "birre" || s === "liquori"
  ) ?? sources[0];

  // Costruisce il set degli id categoria target da targetCategories (struttura reale).
  // Payload con depth=2 popola value come oggetto { id, nome, ... }.
  // Con depth<2 value potrebbe essere un numero (ID non popolato) — gestiamo entrambi.
  const targetIds = new Set<number>();
  if (filterMode !== "all" && sezione.targetCategories?.length) {
    for (const ref of sezione.targetCategories) {
      const id = extractCatId(ref.value as unknown);
      if (id !== undefined) targetIds.add(id);
    }
  }

  if (process.env.NODE_ENV === "development") {
    console.log(
      `[resolveMenuSection] "${sezione.label}" | primarySource=${primarySource} | filterMode=${filterMode} | targetIds=[${[...targetIds].join(",")}]`
    );
  }

  // ── Menu Fisso ────────────────────────────────────────────────────────────
  if (primarySource === "menu-fisso") {
    let mfRisolti = filterMode === "all" || targetIds.size === 0
      ? [...menuFissi]
      : menuFissi.filter((mf) => {
          const catId = extractCatId(mf.categoria);
          if (catId === undefined) return false;
          return filterMode === "include" ? targetIds.has(catId) : !targetIds.has(catId);
        });
    mfRisolti.sort((a, b) => (a.ordine ?? 9999) - (b.ordine ?? 9999));
    if (process.env.NODE_ENV === "development") {
      console.log(`[resolveMenuSection] "${sezione.label}" → menuFissi: ${mfRisolti.length}/${menuFissi.length}`);
    }
    return { items: [], menuFissi: mfRisolti };
  }

  // ── Vini ──────────────────────────────────────────────────────────────────
  if (primarySource === "vini") {
    const items = vini.map(vinoToItem);
    if (process.env.NODE_ENV === "development") {
      console.log(`[resolveMenuSection] "${sezione.label}" → vini: ${items.length}`);
    }
    return { items, menuFissi: [] };
  }

  // ── Bevande ───────────────────────────────────────────────────────────────
  if (primarySource === "bevande") {
    // "Bevande" può aggregare più collection (es. ["bevande", "birre"])
    const allItems: MenuItem[] = [];
    for (const src of sources) {
      if (src === "bevande") allItems.push(...bevande.map(bevandaToItem));
      else if (src === "birre") allItems.push(...birre.map(birraToItem));
    }
    allItems.sort((a, b) => (a.ordine ?? 9999) - (b.ordine ?? 9999));
    if (process.env.NODE_ENV === "development") {
      console.log(`[resolveMenuSection] "${sezione.label}" → bevande+birre: ${allItems.length}`);
    }
    return { items: allItems, menuFissi: [] };
  }

  // ── Birre (come source primaria standalone) ───────────────────────────────
  if (primarySource === "birre") {
    const items = birre.map(birraToItem);
    items.sort((a, b) => (a.ordine ?? 9999) - (b.ordine ?? 9999));
    return { items, menuFissi: [] };
  }

  // ── Liquori / Distillati ──────────────────────────────────────────────────
  if (primarySource === "liquori") {
    const items = liquori.map(liquoreToItem);
    items.sort((a, b) => (a.ordine ?? 9999) - (b.ordine ?? 9999));
    if (process.env.NODE_ENV === "development") {
      console.log(`[resolveMenuSection] "${sezione.label}" → liquori: ${items.length}`);
    }
    return { items, menuFissi: [] };
  }

  // ── Piatti ────────────────────────────────────────────────────────────────
  let piattiRisolti: Piatto[];

  if (filterMode === "all" || targetIds.size === 0) {
    if (filterMode !== "all" && targetIds.size === 0) {
      console.warn(
        `[resolveMenuSection] "${sezione.label}" filterMode="${filterMode}" ma targetIds è vuoto. ` +
        `Mostro tutti i piatti.`
      );
    }
    piattiRisolti = [...piatti];
  } else {
    piattiRisolti = piatti.filter((p) => {
      const catId = extractCatId(p.categoria);
      if (catId === undefined) return false;
      return filterMode === "include" ? targetIds.has(catId) : !targetIds.has(catId);
    });
  }

  piattiRisolti.sort((a, b) => (a.ordine ?? 9999) - (b.ordine ?? 9999));

  if (process.env.NODE_ENV === "development") {
    console.log(
      `[resolveMenuSection] "${sezione.label}" → piatti: ${piattiRisolti.length}/${piatti.length}`
    );
  }

  return { items: piattiRisolti.map(piattoToItem), menuFissi: [] };
}

/**
 * Risolve tutte le sezioni del menu-config a build-time.
 */
function resolveAllSezioni(
  sezioni: SezioneMenuConfig[],
  piatti: Piatto[],
  vini: Vino[],
  menuFissi: MenuFisso[],
  bevande: Bevanda[],
  birre: Birra[],
  liquori: Liquore[]
): SezioneRisolta[] {
  return sezioni.map((sezione): SezioneRisolta => {
    const { items, menuFissi: menuFissiRisolti } =
      resolveMenuSection(sezione, piatti, vini, menuFissi, bevande, birre, liquori);

    return {
      slug: sezione.slug,
      titolo: sezione.label,
      items,
      menuFissi: menuFissiRisolti,
      isSpecialPeriod: false,
    };
  });
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
 *
 * @throws {Error} se le collection principali non sono raggiungibili
 */
export async function getStaticMenuData(): Promise<StaticMenuData> {
  if (!PAYLOAD_URL) {
    throw new Error("NEXT_PUBLIC_PAYLOAD_URL non è configurata nelle variabili d'ambiente.");
  }

  const [piatti, vini, menuFissi, bevande, birre, liquori, allergeni, menuConfigRaw, generaliRaw] =
    await Promise.all([
      fetchAllDocs<Piatto>("piatti", { where: '{"inLista":{"equals":true}}' }),
      fetchAllDocs<Vino>("vini", { where: '{"inLista":{"equals":true}}' }),
      fetchAllDocs<MenuFisso>("menu-fisso", { where: '{"inLista":{"equals":true}}', depth: "2" }),
      fetchAllDocs<Bevanda>("bevande", { where: '{"inLista":{"equals":true}}', depth: "1" }),
      fetchAllDocs<Birra>("birre", { where: '{"inLista":{"equals":true}}', depth: "1" }),
      fetchAllDocs<Liquore>("liquori", { where: '{"inLista":{"equals":true}}', depth: "1" }),
      fetchAllDocs<Allergene>("allergeni"),
      fetchGlobalSafe<MenuConfig>("menu-config"),
      fetchGlobalSafe<Generali>("generali"),
    ]);

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
    console.log(
      `[api] menu-config OK — ${sezioniNormalizzate.length} sezioni: ${sezioniNormalizzate.map((s) => `"${s.label}"`).join(", ")}`
    );
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
    console.log(
      `[api] menu-config non configurato — fallback con ${menuConfig.standardItems!.length} categorie: ${categorie.map((c) => c.nome).join(", ")}`
    );
  }

  // Risolvi tutte le sezioni a build-time (Query Builder)
  const sezioniRisolte = resolveAllSezioni(
    menuConfig.standardItems!, piatti, vini, menuFissi, bevande, birre, liquori
  );

  return {
    piatti, vini, menuFissi, bevande, birre, liquori,
    categorie, allergeni, menuConfig, generali, sezioniRisolte,
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
