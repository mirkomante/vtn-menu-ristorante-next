/**
 * Client API per il fetching dei dati dal backend PayloadCMS e da GCS.
 *
 * - getStaticMenuData(): usata a build-time (Server Components)
 * - getRealTimeAvailability(): usata lato client per aggiornamenti in tempo reale
 *
 * NOTA STRUTTURA BACKEND (verificata via API):
 * - Le categorie NON hanno un endpoint REST proprio: vengono estratte dai piatti.
 * - I globals (menu-config, generali) possono dare 500 se non ancora configurati
 *   nel CMS — in quel caso si usano valori di fallback per non bloccare la build.
 * - Gli id sono numerici (non stringhe UUID).
 */

import type {
  Allergene,
  CategoriaMenu,
  Generali,
  MenuConfig,
  PayloadListResponse,
  Piatto,
  StaticMenuData,
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
// Helpers interni
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

    const res = await fetch(url, {
      next: { revalidate: 3600 },
    });

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
 * Recupera un Global di Payload.
 * Restituisce null se il global non è configurato (500) o non trovato (404),
 * invece di lanciare un'eccezione — permette di usare valori di fallback.
 */
async function fetchGlobalSafe<T>(globalSlug: string): Promise<T | null> {
  const url = `${PAYLOAD_URL}/api/globals/${globalSlug}`;

  try {
    const res = await fetch(url, {
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      console.warn(
        `[api] Global "${globalSlug}" non disponibile (${res.status}). Uso fallback.`
      );
      return null;
    }

    return res.json() as Promise<T>;
  } catch (err) {
    console.warn(`[api] Errore nel fetch del global "${globalSlug}":`, err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Helpers: estrazione categorie dai piatti
// ---------------------------------------------------------------------------

/**
 * Genera uno slug URL-safe da un nome (es. "Specialità carne" → "specialita-carne").
 */
function slugify(nome: string): string {
  return nome
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // rimuove diacritici
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

/**
 * Estrae le categorie uniche dai piatti (dato che non esiste un endpoint dedicato).
 * Mantiene l'ordine di prima comparsa e genera uno slug per ogni categoria.
 */
function extractCategorie(piatti: Piatto[]): CategoriaMenu[] {
  const seen = new Map<number, CategoriaMenu>();

  for (const piatto of piatti) {
    const cat = piatto.categoria;
    if (typeof cat === "object" && cat !== null && !seen.has(cat.id)) {
      seen.set(cat.id, {
        ...cat,
        slug: slugify(cat.nome),
        attiva: true,
      });
    }
  }

  return Array.from(seen.values());
}

// ---------------------------------------------------------------------------
// Fallback per globals non configurati
// ---------------------------------------------------------------------------

/**
 * MenuConfig di fallback: mostra il menu senza configurazione CMS.
 * Usato quando il global "menu-config" non è ancora stato configurato.
 */
const FALLBACK_MENU_CONFIG: MenuConfig = {
  id: "fallback",
  nomeRistorante: "Vietnamonamour",
  mostraVini: true,
  mostraAllergeni: true,
  sezioni: [],
  updatedAt: new Date().toISOString(),
};

/**
 * Generali di fallback: ristorante sempre aperto, nessun orario configurato.
 * Usato quando il global "generali" non è ancora stato configurato.
 */
const FALLBACK_GENERALI: Generali = {
  id: "fallback",
  orari: [
    { giorno: "lunedi", aperto: false },
    { giorno: "martedi", aperto: true, fasce: [{ apertura: "12:00", chiusura: "15:00" }, { apertura: "19:00", chiusura: "23:00" }] },
    { giorno: "mercoledi", aperto: true, fasce: [{ apertura: "12:00", chiusura: "15:00" }, { apertura: "19:00", chiusura: "23:00" }] },
    { giorno: "giovedi", aperto: true, fasce: [{ apertura: "12:00", chiusura: "15:00" }, { apertura: "19:00", chiusura: "23:00" }] },
    { giorno: "venerdi", aperto: true, fasce: [{ apertura: "12:00", chiusura: "15:00" }, { apertura: "19:00", chiusura: "23:00" }] },
    { giorno: "sabato", aperto: true, fasce: [{ apertura: "12:00", chiusura: "15:00" }, { apertura: "19:00", chiusura: "23:00" }] },
    { giorno: "domenica", aperto: true, fasce: [{ apertura: "12:00", chiusura: "15:00" }, { apertura: "19:00", chiusura: "23:00" }] },
  ],
  eccezioni: [],
  updatedAt: new Date().toISOString(),
};

// ---------------------------------------------------------------------------
// API pubblica — Build-time
// ---------------------------------------------------------------------------

/**
 * Recupera tutti i dati necessari per la build statica del menu.
 *
 * Strategia di resilienza:
 * - Piatti, vini, allergeni: obbligatori — se falliscono, la build fallisce.
 * - Categorie: estratte dai piatti (nessuna chiamata API separata).
 * - menu-config, generali: opzionali — se non configurati nel CMS, si usano
 *   valori di fallback per non bloccare la build.
 *
 * @throws {Error} se le collection principali (piatti, vini, allergeni) non sono raggiungibili
 */
export async function getStaticMenuData(): Promise<StaticMenuData> {
  if (!PAYLOAD_URL) {
    throw new Error(
      "NEXT_PUBLIC_PAYLOAD_URL non è configurata nelle variabili d'ambiente."
    );
  }

  // Fetch parallelo: collections obbligatorie + globals opzionali
  const [piatti, vini, allergeni, menuConfigRaw, generaliRaw] =
    await Promise.all([
      fetchAllDocs<Piatto>("piatti", { where: '{"inLista":{"equals":true}}' }),
      fetchAllDocs<Vino>("vini", { where: '{"inLista":{"equals":true}}' }),
      fetchAllDocs<Allergene>("allergeni"),
      fetchGlobalSafe<MenuConfig>("menu-config"),
      fetchGlobalSafe<Generali>("generali"),
    ]);

  // Estrai categorie dai piatti (nessun endpoint dedicato nel backend)
  const categorie = extractCategorie(piatti);

  const menuConfig = menuConfigRaw ?? FALLBACK_MENU_CONFIG;
  const generali = generaliRaw ?? FALLBACK_GENERALI;

  // Se il MenuConfig non ha sezioni configurate, genera sezioni automatiche
  // basate sulle categorie estratte dai piatti (una sezione per categoria)
  if (!menuConfig.sezioni || menuConfig.sezioni.length === 0) {
    menuConfig.sezioni = categorie.map((cat, index) => ({
      titolo: cat.nome,
      slug: cat.slug,
      visibility: "always" as const,
      categoria: cat.id,
      ordine: index,
    }));
  }

  return { piatti, vini, categorie, allergeni, menuConfig, generali };
}

// ---------------------------------------------------------------------------
// API pubblica — Client-side (real-time)
// ---------------------------------------------------------------------------

/**
 * Recupera il file JSON di disponibilità da Google Cloud Storage.
 * Pensata per essere chiamata lato client (useEffect / polling).
 *
 * @returns I dati di disponibilità, oppure null in caso di errore di rete.
 */
export async function getRealTimeAvailability(): Promise<DisponibilitaResponse | null> {
  if (!MENU_JSON_URL) {
    console.warn(
      "NEXT_PUBLIC_MENU_JSON_URL non è configurata. Disponibilità non disponibile."
    );
    return null;
  }

  try {
    const res = await fetch(MENU_JSON_URL, {
      cache: "no-store",
    });

    if (!res.ok) {
      console.error(
        `Errore nel recupero della disponibilità: ${res.status} ${res.statusText}`
      );
      return null;
    }

    return res.json() as Promise<DisponibilitaResponse>;
  } catch (err) {
    console.error("Errore di rete nel recupero della disponibilità:", err);
    return null;
  }
}
