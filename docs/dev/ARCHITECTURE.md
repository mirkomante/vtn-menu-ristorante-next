# Architettura — Menu Digitale VTN

## Stack tecnologico

| Tecnologia | Versione | Ruolo |
|---|---|---|
| Next.js | 15 | Framework frontend (App Router, SSG) |
| TypeScript | 5 | Type safety rigorosa |
| Tailwind CSS | 4 | Styling utility-first (CSS-first config) |
| PayloadCMS | — | Backend CMS (su Google Cloud Run) |
| Google Cloud Storage | — | File JSON disponibilità real-time |
| Firebase Hosting | Free Tier | Hosting sito statico |

## Modalità di rendering: Static Export

Il progetto usa `output: 'export'` in `next.config.ts`. Questo produce una cartella `out/` con HTML/CSS/JS statici, deployabile su qualsiasi CDN senza server Node.js.

**Implicazioni:**
- Nessun SSR, nessun middleware, nessuna Route Handler a runtime.
- Le immagini usano `unoptimized: true` (ottimizzazione richiede server Node.js).
- I dati del menu sono "congelati" al momento della build.
- La disponibilità real-time (esaurito/disponibile) è l'unica eccezione: viene fetchata lato client.

## Flusso dati completo

```
┌─────────────────────────────────────────────────────────────────┐
│  BUILD-TIME (pnpm build)                                        │
│                                                                 │
│  app/page.tsx (Server Component async)                          │
│    └─ getStaticMenuData()  ──────────────────► PayloadCMS REST  │
│         ├─ /api/piatti?where[inLista]=true                      │
│         ├─ /api/vini?where[inLista]=true                        │
│         ├─ /api/allergeni                                       │
│         ├─ /api/globals/menu-config  (con fallback se 500)      │
│         └─ /api/globals/generali    (con fallback se 500)       │
│                                                                 │
│    Categorie estratte dai piatti (nessun endpoint dedicato)     │
│    Sezioni generate automaticamente se menu-config vuoto        │
│                                                                 │
│    └─ <MenuOrchestrator staticData={...} />  → HTML statico     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼  Firebase Hosting (CDN)
┌─────────────────────────────────────────────────────────────────┐
│  RUNTIME (browser)                                              │
│                                                                 │
│  MenuOrchestrator (Client Component)                            │
│    └─ MenuProvider                                              │
│         ├─ useTimekeeper(generali)   [tick 30s]                 │
│         │    └─ isOpen, activeSlot, isHoliday                   │
│         ├─ useMenuStructure(...)     [memo su slot/config]      │
│         │    └─ sections: SezioneRisolta[]                      │
│         └─ getRealTimeAvailability() [polling 5min]             │
│              └─ availability: DisponibilitaResponse | null      │
│                   └─ Google Cloud Storage (disponibilita.json)  │
└─────────────────────────────────────────────────────────────────┘
```

## Struttura dei dati backend (PayloadCMS)

> **Nota importante:** la struttura reale del backend differisce da quella ipotizzata inizialmente. I tipi TypeScript in `src/types/payload-types.ts` rispecchiano la struttura **verificata via API**.

### Collection disponibili

| Endpoint | Tipo TS | Note |
|---|---|---|
| `/api/piatti` | `Piatto` | `id` numerico, campi booleani dietetici (`glutenFree`, `vegan`, ecc.), categoria embedded |
| `/api/vini` | `Vino` | `id` numerico, `tipologia` embedded, `prezzoCalice` separato |
| `/api/allergeni` | `Allergene` | `id` numerico, `nome`, `descrizione` |

### Collection senza endpoint proprio

| Tipo TS | Come si ottiene |
|---|---|
| `CategoriaMenu` | Estratta dai piatti a build-time (`piatto.categoria` è embedded) |
| `TipologiaVino` | Embedded in ogni vino (`vino.tipologia`) |

### Globals

| Endpoint | Tipo TS | Stato |
|---|---|---|
| `/api/globals/menu-config` | `MenuConfig` | Può dare 500 se non configurato → fallback |
| `/api/globals/generali` | `Generali` | Può dare 500 se non configurato → fallback |

## Gestione dei fallback in `src/lib/api.ts`

Il fetcher usa due strategie distinte:

**Collections obbligatorie** (`fetchAllDocs`): lanciano eccezione se il backend non risponde → la build fallisce esplicitamente con un messaggio chiaro.

**Globals opzionali** (`fetchGlobalSafe`): restituiscono `null` se il backend risponde con errore → si usano i valori di fallback hardcoded (`FALLBACK_MENU_CONFIG`, `FALLBACK_GENERALI`).

**Generazione automatica sezioni:** se `menuConfig.sezioni` è vuoto (global non configurato), le sezioni vengono generate automaticamente dalle categorie estratte dai piatti, con `visibility: 'always'` e ordine di comparsa.

```typescript
// Esempio: fallback per globals non configurati
const menuConfigRaw = await fetchGlobalSafe<MenuConfig>("menu-config");
const menuConfig = menuConfigRaw ?? FALLBACK_MENU_CONFIG;

// Generazione automatica sezioni
if (!menuConfig.sezioni || menuConfig.sezioni.length === 0) {
  menuConfig.sezioni = categorie.map((cat, index) => ({
    titolo: cat.nome,
    slug: cat.slug,
    visibility: "always",
    categoria: cat.id,
    ordine: index,
  }));
}
```

## Gestione disponibilità real-time

Il file `disponibilita.json` su GCS contiene la mappa degli stati dei piatti:

```json
{
  "aggiornatoAl": "2024-01-15T19:30:00Z",
  "piatti": {
    "202": { "id": 202, "stato": "esaurito" },
    "171": { "id": 171, "stato": "disponibile" }
  },
  "vini": {}
}
```

- La chiave è l'id numerico del piatto (come stringa).
- `MenuSection` controlla `availability.piatti[piatto.id]` prima di renderizzare ogni piatto.
- Se `availability` è `null` (GCS irraggiungibile) → tutto viene mostrato come disponibile.
- Se un piatto non ha entry nella mappa → considerato disponibile.

## Navigazione: routing logico, non fisico

Il menu è una **Single Page Application** senza cambio di URL. La navigazione tra sezioni avviene tramite:

1. `StickyNav` con link `href="#slug"` per scroll smooth.
2. `IntersectionObserver` che aggiorna `activeCategory` nel context durante lo scroll.
3. `setActiveCategory(slug)` nel `MenuContext` per aggiornare lo stato React.

Nessun `router.push()`, nessun cambio di URL, nessun ricaricamento pagina.

## Convenzioni TypeScript

- Nessun `any` — usa `unknown` se il tipo è davvero sconosciuto.
- Gli id di Payload sono **numerici** (`number`), non UUID stringhe.
- I campi relazione possono essere oggetto popolato **o** id numerico (es. `categoria: CategoriaMenu | number`).
- Importa sempre i tipi da `@/types` (alias configurato in `tsconfig.json` → `./src/*`).
- Le funzioni pure degli hook (`computeTimekeeperState`, `computeMenuStructure`) sono esportate separatamente per facilitare i test unitari.
