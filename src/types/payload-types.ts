/**
 * Tipi TypeScript che rispecchiano le collection e i global di PayloadCMS.
 * Aggiornare questi tipi se lo schema del backend cambia.
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
  id: string;
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

/** Riferimento a un documento Payload (relazione non popolata) */
export interface PayloadRef {
  id: string;
  relationTo: string;
}

// ---------------------------------------------------------------------------
// Collection: Allergeni
// ---------------------------------------------------------------------------

export interface Allergene {
  id: string;
  nome: string;
  /** Codice numerico EU (es. "1" = Glutine, "2" = Crostacei, …) */
  codice?: string;
  icona?: PayloadMedia | string;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Collection: Categorie Menu
// ---------------------------------------------------------------------------

export interface CategoriaMenu {
  id: string;
  nome: string;
  /** Slug URL-friendly generato da Payload */
  slug: string;
  descrizione?: string;
  ordine?: number;
  /** Se true la categoria è visibile nel menu pubblico */
  attiva: boolean;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Collection: Piatti
// ---------------------------------------------------------------------------

export type TipoPiatto = "cibo" | "bevanda";

export interface Piatto {
  id: string;
  nome: string;
  slug: string;
  tipo: TipoPiatto;
  descrizione?: string;
  prezzo: number;
  /** Prezzo alternativo (es. mezza porzione) */
  prezzoAlternativo?: number;
  etichettaPrezzoAlternativo?: string;
  categoria: CategoriaMenu | string;
  allergeni?: (Allergene | string)[];
  immagine?: PayloadMedia | string;
  /** Tag liberi (es. "vegano", "senza glutine", "chef consiglia") */
  tag?: string[];
  /** Ordine di visualizzazione all'interno della categoria */
  ordine?: number;
  attivo: boolean;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Collection: Vini
// ---------------------------------------------------------------------------

export type TipoVino = "rosso" | "bianco" | "rosato" | "spumante" | "dessert";
export type FormatoVino = "bottiglia" | "calice" | "mezza_bottiglia";

export interface Vino {
  id: string;
  nome: string;
  slug: string;
  tipo: TipoVino;
  produttore?: string;
  annata?: number;
  regione?: string;
  descrizione?: string;
  abbinamenti?: string;
  prezzi: {
    formato: FormatoVino;
    prezzo: number;
  }[];
  immagine?: PayloadMedia | string;
  ordine?: number;
  attivo: boolean;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Global: MenuConfig
// ---------------------------------------------------------------------------

/** Configurazione generale del menu (colori, testi, logo, ecc.) */
export interface MenuConfig {
  id: string;
  nomeRistorante: string;
  logo?: PayloadMedia | string;
  /** Colore primario in formato HEX */
  colorePrimario?: string;
  coloreTesto?: string;
  /** Testo del footer */
  testoFooter?: string;
  /** Messaggio di benvenuto visualizzato in cima al menu */
  messaggioBenvenuto?: string;
  /** Se true mostra la sezione vini */
  mostraVini: boolean;
  /** Se true mostra gli allergeni per ogni piatto */
  mostraAllergeni: boolean;
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
  apertura: string; // formato "HH:mm"
  chiusura: string; // formato "HH:mm"
}

export interface OrarioGiorno {
  giorno: GiornoSettimana;
  aperto: boolean;
  fasce?: FasciaOraria[];
}

export interface EccezioneOrario {
  id?: string;
  data: string; // formato ISO "YYYY-MM-DD"
  chiuso: boolean;
  /** Descrizione opzionale (es. "Chiuso per ferie") */
  descrizione?: string;
  fasce?: FasciaOraria[];
}

export interface Generali {
  id: string;
  orari: OrarioGiorno[];
  eccezioni?: EccezioneOrario[];
  /** Messaggio mostrato quando il ristorante è chiuso */
  messaggioChiusura?: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Aggregato: tutti i dati statici necessari per la build
// ---------------------------------------------------------------------------

export interface StaticMenuData {
  piatti: Piatto[];
  vini: Vino[];
  categorie: CategoriaMenu[];
  allergeni: Allergene[];
  menuConfig: MenuConfig;
  generali: Generali;
}
