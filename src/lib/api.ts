/**
 * Client API per il fetching dei dati dal backend PayloadCMS e da GCS.
 *
 * - getStaticMenuData(): usata a build-time (Server Components / generateStaticParams)
 * - getRealTimeAvailability(): usata lato client per aggiornamenti in tempo reale
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

/** Numero massimo di documenti per singola richiesta a Payload */
const PAYLOAD_LIMIT = 100;

// ---------------------------------------------------------------------------
// Helpers interni
// ---------------------------------------------------------------------------

/**
 * Recupera tutti i documenti di una collection Payload gestendo la paginazione.
 * Lancia un errore se la risposta HTTP non è 2xx.
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
      // Con output: 'export' questo header è ignorato a runtime,
      // ma è utile per un eventuale switch a ISR/SSR in futuro.
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
 * Lancia un errore se la risposta HTTP non è 2xx.
 */
async function fetchGlobal<T>(globalSlug: string): Promise<T> {
  const url = `${PAYLOAD_URL}/api/globals/${globalSlug}`;

  const res = await fetch(url, {
    next: { revalidate: 3600 },
  });

  if (!res.ok) {
    throw new Error(
      `Payload Global error [${globalSlug}]: ${res.status} ${res.statusText}`
    );
  }

  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// API pubblica — Build-time
// ---------------------------------------------------------------------------

/**
 * Recupera tutti i dati necessari per la build statica del menu.
 *
 * Esegue le richieste in parallelo dove possibile per minimizzare i tempi.
 * In caso di errore su una singola risorsa, l'intera funzione lancia un'eccezione
 * così la build fallisce in modo esplicito piuttosto che produrre dati parziali.
 *
 * @throws {Error} se una qualsiasi richiesta al backend fallisce
 */
export async function getStaticMenuData(): Promise<StaticMenuData> {
  if (!PAYLOAD_URL) {
    throw new Error(
      "NEXT_PUBLIC_PAYLOAD_URL non è configurata nelle variabili d'ambiente."
    );
  }

  // Recupera collections e globals in parallelo
  const [piatti, vini, categorie, allergeni, menuConfig, generali] =
    await Promise.all([
      fetchAllDocs<Piatto>("piatti", { where: '{"attivo":{"equals":true}}' }),
      fetchAllDocs<Vino>("vini", { where: '{"attivo":{"equals":true}}' }),
      fetchAllDocs<CategoriaMenu>("categorie-menu", {
        where: '{"attiva":{"equals":true}}',
        sort: "ordine",
      }),
      fetchAllDocs<Allergene>("allergeni"),
      fetchGlobal<MenuConfig>("menu-config"),
      fetchGlobal<Generali>("generali"),
    ]);

  return { piatti, vini, categorie, allergeni, menuConfig, generali };
}

// ---------------------------------------------------------------------------
// API pubblica — Client-side (real-time)
// ---------------------------------------------------------------------------

/**
 * Recupera il file JSON di disponibilità da Google Cloud Storage.
 *
 * Pensata per essere chiamata lato client (useEffect / SWR / React Query).
 * GCS serve il file con gli header CORS corretti per il dominio del frontend.
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
      // Nessuna cache: vogliamo sempre i dati più freschi
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
