# Architettura — Menu Digitale VTN

## Stack tecnologico

| Tecnologia | Versione | Ruolo |
|---|---|---|
| Next.js | 16 | Framework frontend (App Router, SSG) |
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

## Routing

Il sito usa un routing a due livelli:

```
/                    → Home Indice (lista sezioni cliccabili)
/menu/[slug]         → Dettaglio sezione virtuale (lista piatti/vini)

Esempi:
  /menu/il-menu-alla-carta
  /menu/i-menu-pranzo
  /menu/i-nostri-vini
```

**Il routing è guidato da `menu-config.standardItems`, non dalla tassonomia del DB.**
Gli slug non esistono nel backend — vengono generati a build-time con `slugify(label)` da ogni voce di `standardItems`.

### `generateStaticParams` — obbligatorio con `output: 'export'`

Con SSG puro (`output: 'export'`), Next.js deve conoscere in anticipo tutti gli slug possibili per generare i file HTML statici. Senza `generateStaticParams`, la build lancia:

```
Page "/menu/[slug]/page" is missing param "/menu/[slug]" in "generateStaticParams()"
```

L'implementazione corretta usa `sezioniRisolte` come fonte di verità (non `menuConfig.standardItems` direttamente), perché gli slug vengono generati durante la risoluzione del Query Builder:

```typescript
export async function generateStaticParams() {
  const { sezioniRisolte } = await getStaticMenuData();
  return sezioniRisolte
    .filter((s) => Boolean(s.slug))
    .map((s) => ({ slug: s.slug }));
}
```

**Regola:** qualsiasi nuova rotta dinamica (`[param]`) aggiunta al progetto **deve** esportare `generateStaticParams`, altrimenti la build SSG fallisce.

Tutte le pagine sono pre-renderizzate a build-time (SSG).

## Sezioni Virtuali — Query Builder

`menu-config` non è una semplice lista di categorie: è un **costruttore di menu dinamico**. Ogni voce di `standardItems` definisce una "Sezione Virtuale" che può aggregare piatti da più categorie o filtrare in modo complesso.

### Struttura reale del backend (verificata via API con `?depth=2`)

```json
{
  "id": 1,
  "standardItems": [
    {
      "id": "69a2a3680c0c6188e8683564",
      "label": "Il menù alla carta",
      "filterMode": "exclude",
      "visibility": "always",
      "sourceCollection": ["piatti"],
      "targetCategories": [
        { "relationTo": "categoria-piatti", "value": { "id": 25, "nome": "Dolci" } }
      ]
    },
    {
      "id": "69a2a3910c0c6188e8683566",
      "label": "I nostri vini",
      "filterMode": "all",
      "visibility": "always",
      "sourceCollection": ["vini"],
      "targetCategories": []
    }
  ],
  "isActive": false,
  "activeRange": { "start": null, "end": null }
}
```

### Campi chiave di una sezione

| Campo | Tipo | Note |
|---|---|---|
| `label` | `string` | Titolo visualizzato (non `titolo`) |
| `slug` | — | **Non esiste nel backend** — generato da `slugify(label)` a build-time |
| `visibility` | `"always"` \| `"lunch_only"` \| `"dinner_only"` | Valori reali del backend (non `"lunch"`/`"dinner"`) |
| `sourceCollection` | `string[]` | Array (es. `["piatti"]`, `["bevande","birre"]`) |
| `filterMode` | `"all"` \| `"include"` \| `"exclude"` | Logica di filtro categorie |
| `targetCategories` | `{ relationTo, value: { id, nome } }[]` | Struttura polimorphic di Payload |

### Logica di filtro (`filterMode`)

| filterMode | Comportamento |
|---|---|
| `all` | Mostra tutti gli item della `sourceCollection` (nessun filtro) |
| `include` | Mostra solo gli item le cui categorie sono in `targetCategories` |
| `exclude` | Mostra tutti gli item TRANNE quelli nelle `targetCategories` |

### Collection supportate dal frontend

| sourceCollection | Stato |
|---|---|
| `"piatti"` | ✅ Implementato |
| `"vini"` | ✅ Implementato (lista vini) |
| `"menu-fisso"` | ⚠️ Riconosciuto, non ancora implementato — sezione vuota |
| `"bevande"`, `"birre"`, `"liquori"` | ⚠️ Riconosciuto, non ancora implementato — sezione vuota |

### Risoluzione a build-time

`getStaticMenuData()` chiama `resolveAllSezioni()` che applica il Query Builder su ogni sezione e produce `StaticMenuData.sezioniRisolte`: un array di `SezioneRisolta[]` con i piatti già filtrati, pronto per il rendering.

```
menu-config.standardItems
  → normalizeStandardItems()   (aggiunge slug, normalizza tipi)
  → resolveMenuSection()       (applica filterMode + targetCategories)
  → SezioneRisolta[]           (slug, titolo, piatti[], vini[])
```

La pagina `/menu/[slug]` cerca direttamente in `sezioniRisolte` per slug.

## Flusso dati completo

```
┌─────────────────────────────────────────────────────────────────┐
│  BUILD-TIME (pnpm build)                                        │
│                                                                 │
│  app/page.tsx (Server Component)                                │
│    └─ getStaticMenuData() ──────────────────► PayloadCMS REST   │
│    └─ <HomeIndex staticData={...} />  → index.html              │
│                                                                 │
│  app/menu/[slug]/page.tsx (Server Component × N sezioni)        │
│    └─ generateStaticParams() → slug da standardItems            │
│    └─ getStaticMenuData() → cerca sezione in sezioniRisolte     │
│    └─ <CategoryPage staticData sezione /> → HTML                │
│                                                                 │
│  getStaticMenuData() chiama (in parallelo):                     │
│    ├─ /api/piatti?where[inLista]=true                           │
│    ├─ /api/vini?where[inLista]=true                             │
│    ├─ /api/allergeni                                            │
│    ├─ /api/globals/menu-config?depth=2  (fallback se vuoto)     │
│    └─ /api/globals/generali?depth=2    (fallback se vuoto)      │
│    Categorie estratte dai piatti (nessun endpoint dedicato)     │
│    normalizeStandardItems() → aggiunge slug da label            │
│    resolveAllSezioni() → sezioniRisolte[] (Query Builder)       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼  Firebase Hosting (CDN)
┌─────────────────────────────────────────────────────────────────┐
│  RUNTIME (browser)                                              │
│                                                                 │
│  HomeIndex / CategoryPage (Client Component)                    │
│    └─ MenuProvider (presente in entrambe le pagine)             │
│         ├─ useTimekeeper(generali)   [tick 30s]                 │
│         │    └─ isOpen, activeSlot, isHoliday                   │
│         ├─ useMenuStructure(...)     [memo su slot/config]      │
│         │    └─ sections: SezioneRisolta[] (filtrate per slot)  │
│         └─ getRealTimeAvailability() [polling 5min]             │
│              └─ availability: DisponibilitaResponse | null      │
│                   └─ Google Cloud Storage (disponibilita.json)  │
│                                                                 │
│  Home: mostra sezioni come card → Link href="/menu/[slug]"      │
│  Dettaglio: mostra piatti della sezione con DishCard            │
└─────────────────────────────────────────────────────────────────┘
```

## Responsabilità dei componenti principali

| Componente | File | Tipo | Responsabilità |
|---|---|---|---|
| `app/page.tsx` | `app/page.tsx` | Server Component | Fetch build-time, passa `staticData` a `HomeIndex` |
| `app/menu/[slug]/page.tsx` | `app/menu/[slug]/page.tsx` | Server Component | `generateStaticParams` da `standardItems`, cerca sezione in `sezioniRisolte` |
| `HomeIndex` | `src/components/menu/HomeIndex.tsx` | Client Component | Indice sezioni virtuali: card cliccabili filtrate per slot/orario |
| `CategoryPage` | `src/components/menu/CategoryPage.tsx` | Client Component | Lista piatti di una sezione virtuale con disponibilità real-time |
| `MenuProvider` | `src/context/MenuContext.tsx` | Context Provider | Stato globale: sezioni, disponibilità, status |
| `MenuHeader` | `src/components/menu/MenuHeader.tsx` | Client Component | Nome ristorante, orari settimanali, slot attivo, banner chiusura |
| `MenuSection` | `src/components/menu/MenuSection.tsx` | Server-compatible | Filtra piatti esauriti, renderizza `DishCard` |
| `DishCard` | `src/components/menu/DishCard.tsx` | Server-compatible | Singolo piatto con badge dietetici e allergeni |
| `MenuFooter` | `src/components/menu/MenuFooter.tsx` | Client Component | Indirizzo, social, copyright |

## Struttura dei dati backend (PayloadCMS)

> **Nota:** la struttura reale del backend è stata verificata via `curl` diretto. I tipi TypeScript in `src/types/payload-types.ts` rispecchiano questa struttura verificata.

### Collection disponibili

| Endpoint | Tipo TS | Note |
|---|---|---|
| `/api/piatti` | `Piatto` | `id` numerico, campi booleani dietetici, categoria embedded |
| `/api/vini` | `Vino` | `id` numerico, `tipologia` embedded, `prezzoCalice` separato |
| `/api/allergeni` | `Allergene` | `id` numerico, `nome`, `descrizione` |

### Collection senza endpoint proprio

| Tipo TS | Come si ottiene |
|---|---|
| `CategoriaMenu` | Estratta dai piatti a build-time (`piatto.categoria` è embedded) |
| `TipologiaVino` | Embedded in ogni vino (`vino.tipologia`) |

### Globals (struttura reale verificata)

| Endpoint | Tipo TS | Campo chiave | Note |
|---|---|---|---|
| `/api/globals/menu-config?depth=2` | `MenuConfig` | `standardItems[]` | **Richiede `?depth=2`** per popolare `targetCategories.value`. Senza `depth=2` restituisce `{}`. |
| `/api/globals/generali?depth=2` | `Generali` | `scheduleWeekly[]` | Orari in inglese (`"monday"`, ecc.), `lunchSlot`/`dinnerSlot` espliciti |

### Struttura reale di `generali`

```json
{
  "scheduleWeekly": [
    { "day": "monday", "isOpen": true, "hours": [{ "start": "12:00", "end": "15:00" }] }
  ],
  "lunchSlot": { "start": "12:15", "end": "15:15" },
  "dinnerSlot": { "start": "19:00", "end": "23:15" },
  "exceptions": []
}
```

## Gestione dei fallback in `src/lib/api.ts`

**Collections obbligatorie** (`fetchAllDocs`): lanciano eccezione se il backend non risponde → la build fallisce esplicitamente.

**Globals opzionali** (`fetchGlobalSafe`): restituiscono `null` se il backend risponde con errore o con `{}` → si usano i valori di fallback hardcoded.

**Casi di fallback per `menu-config`:**
1. Backend risponde 500 → `null` → fallback
2. Backend risponde `{}` (global non configurato) → fallback
3. `standardItems` è array vuoto → fallback con sezioni auto-generate

**Generazione automatica sezioni (fallback):** se `standardItems` è vuoto, le sezioni vengono generate dalle categorie estratte dai piatti:

```typescript
standardItems = categorie.map((cat, index) => ({
  label: cat.nome,
  slug: cat.slug,
  visibility: "always",
  sourceCollection: ["piatti"],
  filterMode: "include",
  targetCategories: [{ relationTo: "categoria-piatti", value: { id: cat.id, nome: cat.nome } }],
  ordine: index,
}));
```

## Struttura del Global `generali` e logica orari

`useTimekeeper` usa la struttura reale del backend:

- `scheduleWeekly[].day`: giorno in inglese (`"monday"`, ..., `"sunday"`)
- `scheduleWeekly[].isOpen`: boolean (non `aperto`)
- `scheduleWeekly[].hours[].start` / `.end`: orari (non `apertura`/`chiusura`)
- `lunchSlot` / `dinnerSlot`: slot espliciti per determinare `activeSlot`
- `exceptions[].date`: data eccezione (non `data`)
- `exceptions[].isClosed`: boolean (non `chiuso`)

`activeSlot` viene determinato confrontando l'orario corrente con `lunchSlot` e `dinnerSlot`. Le sezioni con `visibility: "lunch_only"` sono visibili solo quando `activeSlot === "lunch"`, e viceversa per `"dinner_only"`.

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

## Convenzioni TypeScript

- Nessun `any` — usa `unknown` se il tipo è davvero sconosciuto.
- Gli id di Payload sono **numerici** (`number`), non UUID stringhe.
- I campi relazione possono essere oggetto popolato **o** id numerico (es. `categoria: CategoriaMenu | number`).
- `targetCategories` usa la struttura polimorphic di Payload: `{ relationTo: string, value: { id, nome } }`.
- Importa sempre i tipi da `@/types` (alias configurato in `tsconfig.json` → `./src/*`).
- Le funzioni pure degli hook (`computeTimekeeperState`, `computeMenuStructure`) sono esportate separatamente per facilitare i test unitari.
