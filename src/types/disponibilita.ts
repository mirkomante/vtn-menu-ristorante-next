/**
 * Tipi per il file JSON di disponibilità in tempo reale.
 * Il file è ospitato su Google Cloud Storage e aggiornato dal backend.
 *
 * URL: process.env.NEXT_PUBLIC_MENU_JSON_URL
 * (https://storage.googleapis.com/vtn-menu-frontend/disponibilita.json)
 */

// ---------------------------------------------------------------------------
// Disponibilità singolo piatto/vino
// ---------------------------------------------------------------------------

export type StatoDisponibilita = "disponibile" | "esaurito" | "nascosto";

export interface DisponibilitaItem {
  /** ID del documento Payload corrispondente */
  id: string;
  stato: StatoDisponibilita;
  /** Nota opzionale visibile al cliente (es. "Disponibile solo a pranzo") */
  nota?: string;
}

// ---------------------------------------------------------------------------
// Risposta completa del file JSON su GCS
// ---------------------------------------------------------------------------

export interface DisponibilitaResponse {
  /** Timestamp ISO dell'ultimo aggiornamento del file */
  aggiornatoAl: string;
  /** Mappa id → disponibilità per i piatti */
  piatti: Record<string, DisponibilitaItem>;
  /** Mappa id → disponibilità per i vini */
  vini: Record<string, DisponibilitaItem>;
  /**
   * Messaggio globale opzionale da mostrare in cima al menu
   * (es. "Oggi cucina chiusa, solo bevande")
   */
  messaggioGlobale?: string;
}
