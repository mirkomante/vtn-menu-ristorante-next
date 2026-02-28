/**
 * Tipi TypeScript che rispecchiano le collection e i global di PayloadCMS.
 *
 * STRUTTURA REALE DEL BACKEND (verificata via API):
 * - Piatto: id numerico, campi booleani dietetici (glutenFree, noUovo, noLatticini, vegan),
 *           categoria embedded nell'oggetto piatto (non collection separata)
 * - Vino: id numerico, tipologia embedded, prezzoCalice separato
 * - Allergene: id numerico, nome, descrizione
 * - Categorie: non hanno endpoint proprio — estratte dai piatti a build-time
 * - Globals menu-config / generali: esistono ma possono dare 500 se non configurati
 *
 * Backend: https://vtn-backend-payload-203473363873.europe-west1.run.app
 */

// ---------------------------------------------------------------------------
// Primitivi condivisi
// ---------------------------------------------------------------------------

/** Risposta paginata standard di Payload REST API */
export interface PayloadListResponse<T> {
  docs: T[];
  totalDocs: number;
  limit: number;
  totalPages: number;
  page: number;
  pagingCounter: number;
  hasPrevPage: boolean;
  hasNextPage: boolean;
  prevPage: number | null;
  nextPage: number | null;
}

/** Immagine caricata su Payload (collection "media") */
export interface PayloadMedia {
  id: number;
  filename: string;
  mimeType: string;
  filesize: number;
  width?: number;
  height?: number;
  url: string;
  alt?: string;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Collection: Allergeni
// ---------------------------------------------------------------------------

export interface Allergene {
  id: number;
  nome: string;
  descrizione?: string;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Collection: Categorie Menu
// ---------------------------------------------------------------------------

/**
 * Categoria del menu — embedded nel piatto, non ha endpoint REST proprio.
 * Estratta a build-time dai piatti tramite getStaticMenuData().
 */
export interface CategoriaMenu {
  id: number;
  nome: string;
  /** Slug derivato dal nome (generato a build-time, non presente nel backend) */
  slug: string;
  descrizione?: string;
  /** Ordine di visualizzazione (derivato dall'ordine di comparsa nei piatti) */
  ordine?: number;
  attiva: boolean;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Collection: Piatti
// ---------------------------------------------------------------------------

export interface Piatto {
  id: number;
  nome: string;
  /** Slug derivato dal nome (generato a build-time) */
  slug: string;
  descrizione?: string;
  prezzo: number;
  /** Prezzo alternativo (es. mezza porzione) — non presente nel backend attuale */
  prezzoAlternativo?: number;
  etichettaPrezzoAlternativo?: string;
  /** Categoria embedded (oggetto) o id numerico (non popolato) */
  categoria: CategoriaMenu | number;
  allergeni?: (Allergene | number)[];
  immagine?: PayloadMedia | number;
  /** Ordine di visualizzazione all'interno della categoria */
  ordine?: number;
  /** Se true il piatto è visibile in lista */
  inLista: boolean;
  /** Se true il piatto appare solo nei menu fissi */
  soloMenuFissi: boolean;
  /** Campi dietetici booleani (struttura reale del backend) */
  glutenFree: boolean;
  noUovo: boolean;
  noLatticini: boolean;
  vegan: boolean;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Collection: Vini
// ---------------------------------------------------------------------------

/** Tipologia vino (embedded nel vino) */
export interface TipologiaVino {
  id: number;
  nome: string;
  descrizione?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Vino {
  id: number;
  nome: string;
  /** Slug derivato dal nome (generato a build-time) */
  slug: string;
  descrizione?: string;
  prezzo: number;
  prezzoCalice?: number | null;
  tipologia: TipologiaVino | number;
  cantina?: string;
  anno?: string;
  capacita?: string;
  grado?: string;
  certificazione?: string;
  /** Se true il vino è visibile in lista */
  inLista: boolean;
  ordine?: number;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Global: MenuConfig — Sezioni e Visibilità
// ---------------------------------------------------------------------------

/**
 * Slot di servizio: pranzo, cena o sempre visibile.
 * Usato per filtrare le sezioni in base all'orario corrente.
 */
export type SlotVisibilita = "lunch" | "dinner" | "always";

/**
 * Singola voce di un menu speciale (es. "Business Lunch").
 */
export interface VoceMenuSpeciale {
  id?: string;
  piatto?: Piatto | number;
  vino?: Vino | number;
  prezzoOverride?: number;
  nota?: string;
}

/**
 * Sezione del menu configurata nel CMS.
 */
export interface SezioneMenuConfig {
  id?: string;
  titolo: string;
  slug: string;
  visibility: SlotVisibilita;
  /** ID numerico della categoria associata */
  categoria?: CategoriaMenu | number;
  specialItems?: VoceMenuSpeciale[];
  specialPeriod?: {
    dal: string;
    al: string;
  };
  ordine?: number;
}

/** Configurazione generale del menu */
export interface MenuConfig {
  id: string;
  nomeRistorante: string;
  logo?: PayloadMedia | number;
  colorePrimario?: string;
  coloreTesto?: string;
  testoFooter?: string;
  messaggioBenvenuto?: string;
  indirizzo?: string;
  telefono?: string;
  instagram?: string;
  facebook?: string;
  mostraVini: boolean;
  mostraAllergeni: boolean;
  sezioni?: SezioneMenuConfig[];
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Global: Generali (Orari e Chiusure)
// ---------------------------------------------------------------------------

export type GiornoSettimana =
  | "lunedi"
  | "martedi"
  | "mercoledi"
  | "giovedi"
  | "venerdi"
  | "sabato"
  | "domenica";

export interface FasciaOraria {
  apertura: string; // "HH:mm"
  chiusura: string; // "HH:mm"
}

export interface OrarioGiorno {
  giorno: GiornoSettimana;
  aperto: boolean;
  fasce?: FasciaOraria[];
}

export interface EccezioneOrario {
  id?: string;
  data: string; // "YYYY-MM-DD"
  chiuso: boolean;
  descrizione?: string;
  fasce?: FasciaOraria[];
}

export interface Generali {
  id: string;
  orari: OrarioGiorno[];
  eccezioni?: EccezioneOrario[];
  messaggioChiusura?: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Aggregato: tutti i dati statici necessari per la build
// ---------------------------------------------------------------------------

export interface StaticMenuData {
  piatti: Piatto[];
  vini: Vino[];
  /** Categorie estratte dai piatti (non da endpoint dedicato) */
  categorie: CategoriaMenu[];
  allergeni: Allergene[];
  menuConfig: MenuConfig;
  generali: Generali;
}

// ---------------------------------------------------------------------------
// Tipi derivati — output degli hook client-side
// ---------------------------------------------------------------------------

/** Slot di servizio attivo (pranzo / cena / nessuno) */
export type ActiveSlot = "lunch" | "dinner" | null;

/**
 * Sezione del menu già risolta con i piatti/vini effettivi.
 * Prodotta da `useMenuStructure` a partire da `SezioneMenuConfig`.
 */
export interface SezioneRisolta {
  slug: string;
  titolo: string;
  piatti: Piatto[];
  vini: Vino[];
  isSpecialPeriod: boolean;
}
