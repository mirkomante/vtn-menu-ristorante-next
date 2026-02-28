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
 *
 * Struttura reale del backend (verificata via API):
 * - `inLista`: boolean (visibilità), NON `attiva`
 * - `elementi`: relazione inversa (lista id piatti) — ignorata nel frontend
 * - `slug`: NON presente nel backend, generato a build-time con slugify()
 * - `_status`: "published" | "draft" — ignorato nel frontend
 */
export interface CategoriaMenu {
  id: number;
  nome: string;
  /** Slug derivato dal nome (generato a build-time, non presente nel backend) */
  slug: string;
  descrizione?: string;
  /** Ordine di visualizzazione (derivato dall'ordine di comparsa nei piatti) */
  ordine?: number;
  /** Visibilità nel menu — campo reale del backend (era `attiva` in precedenza) */
  inLista?: boolean;
  /** @deprecated Usa inLista. Mantenuto per retrocompatibilità con dati dummy. */
  attiva?: boolean;
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
// Collection: Dati geografici (Nazione, Regione, Zona)
// ---------------------------------------------------------------------------

/**
 * Nazione di provenienza — collection "nazioni".
 * Usata da vini, birre, liquori e bevande (depth>=1 per avere l'oggetto).
 */
export interface Nazione {
  id: number;
  nome: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Regione vinicola — collection "regioni".
 * Usata dai vini (depth>=1 per avere l'oggetto, depth>=2 per avere nazione embedded).
 */
export interface Regione {
  id: number;
  nome: string;
  /** Nazione della regione (popolata con depth>=2) */
  nazione?: Nazione | number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Zona / denominazione vinicola — collection "zone".
 * Usata dai vini (depth>=1 per avere l'oggetto).
 */
export interface Zona {
  id: number;
  nome: string;
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

/**
 * Vino (collection "vini").
 * Struttura reale del backend (verificata via API):
 * - `tipologia`: oggetto embedded (depth>=1)
 * - `nazione`, `regione`, `zona`: relazioni geografiche (popolate con depth>=1)
 * - `regione.nazione` è popolata solo con depth>=2
 */
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
  /** Nazione di provenienza (popolata con depth>=1) */
  nazione?: Nazione | number | null;
  /** Regione vinicola (popolata con depth>=1; regione.nazione con depth>=2) */
  regione?: Regione | number | null;
  /** Zona / denominazione (popolata con depth>=1) */
  zona?: Zona | number | null;
  /** Se true il vino è visibile in lista */
  inLista: boolean;
  ordine?: number;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Collection: Bevande, Birre, Liquori
// ---------------------------------------------------------------------------

/**
 * Tipologia generica per bevande, birre e liquori (embedded).
 * Struttura identica nel backend per tutte e tre le collection.
 */
export interface TipologiaBevanda {
  id: number;
  nome: string;
  descrizione?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Bevanda (collection "bevande").
 * Struttura reale del backend (verificata via API):
 * - `tipologia`: oggetto embedded (depth>=1)
 * - `nazione`: oggetto Nazione (popolato con depth>=1)
 */
export interface Bevanda {
  id: number;
  nome: string;
  descrizione?: string;
  prezzo: number;
  tipologia: TipologiaBevanda | number;
  /** Nazione di provenienza (popolata con depth>=1) */
  nazione?: Nazione | number | null;
  inLista: boolean;
  ordine?: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Birra (collection "birre").
 * Struttura reale del backend (verificata via API).
 */
export interface Birra {
  id: number;
  nome: string;
  descrizione?: string;
  prezzo: number;
  tipologia: TipologiaBevanda | number;
  grado?: string;
  capacita?: string;
  /** Nazione di provenienza (popolata con depth>=1) */
  nazione?: Nazione | number | null;
  inLista: boolean;
  ordine?: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Liquore / Distillato (collection "liquori").
 * Struttura reale del backend (verificata via API).
 */
export interface Liquore {
  id: number;
  nome: string;
  descrizione?: string;
  prezzo: number;
  tipologia: TipologiaBevanda | number;
  grado?: string;
  capacita?: string;
  invecchiamento?: string;
  /** Nazione di provenienza (popolata con depth>=1) */
  nazione?: Nazione | number | null;
  inLista: boolean;
  ordine?: number;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Tipo unione: MenuItem
// ---------------------------------------------------------------------------

/**
 * Tipo unione che rappresenta qualsiasi voce del menu visualizzabile con MenuSection.
 *
 * Tutti i tipi condividono: id, nome, prezzo, descrizione, inLista.
 * Il campo `_type` discrimina il tipo a runtime per logiche specifiche (es. badge dietetici).
 *
 * Piatto e Vino non hanno `_type` nel backend — viene aggiunto a build-time
 * da `toMenuItem()` in api.ts.
 */
export type MenuItem =
  | (Piatto & { _type: "piatto" })
  | (Vino & { _type: "vino" })
  | (Bevanda & { _type: "bevanda" })
  | (Birra & { _type: "birra" })
  | (Liquore & { _type: "liquore" });

// ---------------------------------------------------------------------------
// Collection: Menu Fisso (pranzo, degustazione, ecc.)
// ---------------------------------------------------------------------------

/**
 * Categoria del menu fisso (categoria-menu-fisso).
 * Struttura reale del backend (verificata via API):
 * - `elementi.docs`: array di ID degli elementi menu-fisso appartenenti a questa categoria
 */
export interface CategoriaMenuFisso {
  id: number;
  nome: string;
  descrizione?: string;
  inLista?: boolean;
  elementi?: { docs: number[]; hasNextPage: boolean };
  createdAt: string;
  updatedAt: string;
}

/**
 * Servizio aggiuntivo incluso in un menu fisso (es. coperto, acqua).
 */
export interface ServizioMenuFisso {
  id: number;
  nome: string;
  prezzo: number;
  descrizione?: string;
  inLista?: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Elemento della collection "menu-fisso".
 * Struttura reale del backend (verificata via API):
 * - `categoria`: oggetto CategoriaMenuFisso (popolato con depth>=1)
 * - `piatti`: array di Piatto (popolati con depth>=1)
 * - `servizi`: array di ServizioMenuFisso (popolati con depth>=1)
 */
export interface MenuFisso {
  id: number;
  nome: string;
  descrizione?: string;
  prezzo: number;
  inLista: boolean;
  /** Categoria del menu fisso (es. "Business lunch", "Degustazione") */
  categoria: CategoriaMenuFisso | number;
  /** Piatti inclusi in questo menu */
  piatti: (Piatto | number)[];
  /** Servizi aggiuntivi inclusi (es. coperto) */
  servizi?: (ServizioMenuFisso | number)[];
  ordine?: number;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Global: MenuConfig — Sezioni e Visibilità
// ---------------------------------------------------------------------------

/**
 * Slot di servizio — valori reali del backend.
 * "lunch_only" e "dinner_only" sono i valori usati dal CMS.
 */
export type SlotVisibilita = "lunch_only" | "dinner_only" | "always";

/**
 * Modalità di filtro per una sezione virtuale del menu.
 *
 * - `all`:     mostra tutti gli item della sourceCollection (nessun filtro categoria)
 * - `include`: mostra solo gli item le cui categorie sono in targetCategories
 * - `exclude`: mostra tutti gli item TRANNE quelli nelle targetCategories
 */
export type FilterMode = "all" | "include" | "exclude";

/**
 * Collezioni disponibili nel backend come sourceCollection.
 * Il frontend gestisce: "piatti", "vini".
 * Le altre ("menu-fisso", "bevande", "birre", "liquori") sono riconosciute
 * ma non ancora implementate — vengono mostrate come sezioni vuote.
 */
export type SourceCollection =
  | "piatti"
  | "vini"
  | "menu-fisso"
  | "bevande"
  | "birre"
  | "liquori";

/**
 * Riferimento a una categoria target nel formato reale del backend.
 * Payload usa una struttura polimorphic: { relationTo, value }.
 */
export interface TargetCategoryRef {
  relationTo: string; // es. "categoria-piatti", "categoria-menu-fisso"
  value: {
    id: number;
    nome: string;
    inLista?: boolean;
    descrizione?: string;
    [key: string]: unknown;
  };
}

/**
 * Sezione del menu configurata nel CMS (standardItems).
 *
 * Struttura reale del backend (verificata via API):
 * - `label`: titolo visualizzato (non `titolo`)
 * - `slug`: NON presente — generato a build-time da slugify(label)
 * - `visibility`: "lunch_only" | "dinner_only" | "always"
 * - `sourceCollection`: array di stringhe (non stringa singola)
 * - `targetCategories`: array di { relationTo, value } (non array di id)
 */
export interface SezioneMenuConfig {
  id?: string;
  /** Titolo visualizzato — campo reale del backend */
  label: string;
  /** Slug URL-safe — generato a build-time da slugify(label), non presente nel backend */
  slug: string;
  visibility: SlotVisibilita;
  /** Array di collection sorgente (es. ["piatti"], ["bevande", "birre"]) */
  sourceCollection: SourceCollection[];
  filterMode: FilterMode;
  /** Categorie target nel formato polimorphic di Payload */
  targetCategories: TargetCategoryRef[];
  ordine?: number;
}

/**
 * Configurazione generale del menu.
 *
 * Struttura reale del backend (verificata via API):
 * - `standardItems`: array di sezioni (non `sezioni`)
 * - `isActive` + `activeRange`: per il periodo speciale globale
 * - NON ha nomeRistorante, logo, indirizzo, telefono, social — sono campi da aggiungere
 */
export interface MenuConfig {
  id: string | number;
  /** Sezioni del menu — campo reale del backend */
  standardItems?: SezioneMenuConfig[];
  /** Se true, è attivo un menu speciale (es. periodo festivo) */
  isActive?: boolean;
  activeRange?: {
    start: string | null;
    end: string | null;
  };
  /** Campi opzionali — potrebbero non essere presenti nel backend attuale */
  nomeRistorante?: string;
  testoFooter?: string;
  messaggioBenvenuto?: string;
  indirizzo?: string;
  telefono?: string;
  instagram?: string;
  facebook?: string;
  updatedAt: string;
  createdAt?: string;
}

// ---------------------------------------------------------------------------
// Global: Generali (Orari e Chiusure)
// ---------------------------------------------------------------------------

/**
 * Giorno della settimana — formato inglese usato dal backend reale.
 * (es. "monday", "tuesday", ...)
 */
export type GiornoSettimana =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

/** Fascia oraria singola (un turno di servizio) */
export interface FasciaOraria {
  id?: string;
  /** Orario di apertura "HH:mm" */
  start: string;
  /** Orario di chiusura "HH:mm" */
  end: string;
}

/** Riga dell'orario settimanale */
export interface OrarioGiorno {
  id?: string;
  day: GiornoSettimana;
  isOpen: boolean;
  hours?: FasciaOraria[];
}

/** Slot di servizio esplicito (pranzo / cena) */
export interface SlotOrario {
  start: string; // "HH:mm"
  end: string;   // "HH:mm"
}

/** Eccezione di orario (festività, chiusura straordinaria) */
export interface EccezioneOrario {
  id?: string;
  /** Data in formato "YYYY-MM-DD" */
  date: string;
  isClosed: boolean;
  description?: string;
  hours?: FasciaOraria[];
}

/**
 * Global "generali" — orari e configurazione del ristorante.
 *
 * Struttura reale del backend (verificata via API):
 * - `scheduleWeekly`: array di OrarioGiorno con `day` in inglese
 * - `lunchSlot` / `dinnerSlot`: slot di servizio espliciti
 * - `exceptions`: eccezioni di orario
 */
export interface Generali {
  id: string | number;
  scheduleWeekly: OrarioGiorno[];
  lunchSlot?: SlotOrario;
  dinnerSlot?: SlotOrario;
  exceptions?: EccezioneOrario[];
  messaggioChiusura?: string;
  updatedAt: string;
  createdAt?: string;
}

// ---------------------------------------------------------------------------
// Aggregato: tutti i dati statici necessari per la build
// ---------------------------------------------------------------------------

export interface StaticMenuData {
  piatti: Piatto[];
  vini: Vino[];
  menuFissi: MenuFisso[];
  bevande: Bevanda[];
  birre: Birra[];
  liquori: Liquore[];
  /** Categorie estratte dai piatti (non da endpoint dedicato) */
  categorie: CategoriaMenu[];
  allergeni: Allergene[];
  menuConfig: MenuConfig;
  generali: Generali;
  /**
   * Sezioni già risolte a build-time: ogni sezione ha gli items (tipo unione)
   * filtrati secondo la configurazione del Query Builder (filterMode + targetCategories).
   * Pronte per il rendering — non richiedono ulteriore elaborazione a runtime.
   */
  sezioniRisolte: SezioneRisolta[];
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
  /** Lista unificata di voci renderizzabili con MenuSection (piatti, vini, bevande, ecc.) */
  items: MenuItem[];
  menuFissi: MenuFisso[];
  isSpecialPeriod: boolean;
}
