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
/menu/[slug]         → Dettaglio sezione virtuale (lista voci: piatti, vini, bevande…)

Esempi:
  /menu/il-menu-alla-carta
  /menu/i-menu-pranzo
  /menu/i-nostri-vini
  /menu/bevande
  /menu/i-nostri-distillati
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

## Tipo unione `MenuItem` — astrazione centrale

Tutte le voci del menu (piatti, vini, bevande, birre, liquori) vengono normalizzate in un unico tipo discriminato a build-time da `api.ts`:

```typescript
type MenuItem =
  | (Piatto   & { _type: "piatto" })
  | (Vino     & { _type: "vino" })
  | (Bevanda  & { _type: "bevanda" })
  | (Birra    & { _type: "birra" })
  | (Liquore  & { _type: "liquore" });
```

Il campo `_type` **non esiste nel backend** — viene aggiunto dalle funzioni helper in `api.ts` (`piattoToItem`, `vinoToItem`, `bevandaToItem`, `birraToItem`, `liquoreToItem`).

Questo permette a `MenuSection` e `DishCard` di gestire qualsiasi tipo di voce con un'unica interfaccia, usando il discriminante `_type` per logiche specifiche (badge dietetici solo per piatti, prezzo al calice solo per vini, ecc.).

I **menu fissi** (pranzo, degustazione) hanno struttura diversa (`MenuFisso`) e vengono renderizzati separatamente in `CategoryPage`, non attraverso `DishCard`.

## Sezioni Virtuali — Query Builder

`menu-config` non è una semplice lista di categorie: è un **costruttore di menu dinamico**. Ogni voce di `standardItems` definisce una "Sezione Virtuale" che può aggregare voci da più collection o filtrare per categoria.

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
      "id": "...",
      "label": "I nostri vini",
      "filterMode": "all",
      "visibility": "always",
      "sourceCollection": ["vini"],
      "targetCategories": []
    },
    {
      "id": "...",
      "label": "Bevande",
      "filterMode": "all",
      "visibility": "always",
      "sourceCollection": ["bevande", "birre"],
      "targetCategories": []
    },
    {
      "id": "...",
      "label": "I menù pranzo",
      "filterMode": "include",
      "visibility": "lunch_only",
      "sourceCollection": ["menu-fisso"],
      "targetCategories": [
        { "relationTo": "categoria-menu-fisso", "value": { "id": 9, "nome": "Business lunch" } }
      ]
    }
  ]
}
```

### Campi chiave di una sezione

| Campo | Tipo | Note |
|---|---|---|
| `label` | `string` | Titolo visualizzato (non `titolo`) |
| `slug` | — | **Non esiste nel backend** — generato da `slugify(label)` a build-time |
| `visibility` | `"always"` \| `"lunch_only"` \| `"dinner_only"` | Valori reali del backend (non `"lunch"`/`"dinner"`) |
| `sourceCollection` | `string[]` | Array (es. `["piatti"]`, `["bevande","birre"]`, `["piatti","vini"]`) |
| `filterMode` | `"all"` \| `"include"` \| `"exclude"` | Logica di filtro categorie |
| `targetCategories` | `{ relationTo, value: { id, nome } }[]` | Struttura polimorphic di Payload |
| `activeDays` | `GiornoSettimana[]` | **Opzionale.** Giorni della settimana in cui la sezione è visibile. Se assente o vuoto → visibile ogni giorno. Ha **priorità** sul filtro `visibility`. |

### Logica di filtro (`filterMode`)

| filterMode | Comportamento |
|---|---|
| `all` | Mostra tutti gli item della `sourceCollection` (nessun filtro) |
| `include` | Mostra solo gli item le cui categorie sono in `targetCategories` |
| `exclude` | Mostra tutti gli item TRANNE quelli nelle `targetCategories` |

### Collection supportate dal frontend

| sourceCollection | Tipo TS risultante | Stato |
|---|---|---|
| `"piatti"` | `Piatto & { _type: "piatto" }` | ✅ Implementato |
| `"vini"` | `Vino & { _type: "vino" }` | ✅ Implementato |
| `"bevande"` | `Bevanda & { _type: "bevanda" }` | ✅ Implementato |
| `"birre"` | `Birra & { _type: "birra" }` | ✅ Implementato |
| `"liquori"` | `Liquore & { _type: "liquore" }` | ✅ Implementato |
| `"menu-fisso"` | `MenuFisso` (array separato) | ✅ Implementato |

### Logica Multi-Source Additiva

`resolveMenuSection` usa un approccio **additivo**: itera su **ogni** sorgente in `sourceCollection` in modo indipendente, applica il filtro corretto, poi unisce i risultati in `allItems`.

```
per ogni source in sourceCollection:
  1. Recupera l'array grezzo corrispondente (piatti, vini, bevande, ecc.)
  2. Estrae i targetIds pertinenti a questa sorgente
     (filtrando targetCategories per relationTo, es. "categoria-piatti")
  3. Applica filterMode (include/exclude/all) usando quei targetIds
  4. Converte gli item filtrati in MenuItem (aggiunge _type)
  5. Aggiunge a allItems

→ allItems ordinato per campo `ordine` globale
```

Questo permette combinazioni arbitrarie come `["piatti", "vini"]` con `filterMode: "include"` e `targetCategories` misti: i piatti vengono filtrati per `categoria-piatti` e i vini per `categoria-vini`, producendo un unico array ordinato.

**Caso speciale — `menu-fisso`:** gestito separatamente perché `MenuFisso` ha una struttura dati diversa da `MenuItem` e viene reso in un layout dedicato. Se `sources` include `"menu-fisso"`, la funzione ritorna subito con `{ items: [], menuFissi: [...] }`.

**Scalabilità:** aggiungere una nuova collection richiede solo una voce nel `sourceMap` interno a `resolveMenuSection`. Non è necessario modificare la struttura del loop.

### Risoluzione a build-time

`getStaticMenuData()` chiama `resolveAllSezioni()` che applica il Query Builder su ogni sezione e produce `StaticMenuData.sezioniRisolte`:

```
menu-config.standardItems
  → normalizeStandardItems()   (aggiunge slug, normalizza tipi)
  → resolveMenuSection()       (logica multi-source additiva per ogni sorgente)
  → SezioneRisolta[]           (slug, titolo, items: MenuItem[], menuFissi: MenuFisso[])
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
│    └─ generateStaticParams() → slug da sezioniRisolte           │
│    └─ getStaticMenuData() → cerca sezione in sezioniRisolte     │
│    └─ <CategoryPage staticData sezione /> → HTML                │
│                                                                 │
│  getStaticMenuData() chiama (in parallelo):                     │
│    ├─ /api/piatti?where[inLista]=true                           │
│    ├─ /api/vini?where[inLista]=true                             │
│    ├─ /api/menu-fisso?where[inLista]=true&depth=2               │
│    ├─ /api/bevande?where[inLista]=true&depth=1                  │
│    ├─ /api/birre?where[inLista]=true&depth=1                    │
│    ├─ /api/liquori?where[inLista]=true&depth=1                  │
│    ├─ /api/allergeni                                            │
│    ├─ /api/globals/menu-config?depth=2  (fallback se vuoto)     │
│    └─ /api/globals/generali?depth=2    (fallback se vuoto)      │
│    Categorie estratte dai piatti (nessun endpoint dedicato)     │
│    normalizeStandardItems() → aggiunge slug da label            │
│    resolveAllSezioni() → sezioniRisolte[] (Query Builder)       │
│      └─ ogni sezione: { items: MenuItem[], menuFissi: MenuFisso[] }
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
│  Dettaglio: mostra items della sezione con DishCard             │
│             mostra menuFissi con layout dedicato                │
└─────────────────────────────────────────────────────────────────┘
```

## Responsabilità dei componenti principali

| Componente | File | Tipo | Responsabilità |
|---|---|---|---|
| `app/page.tsx` | `app/page.tsx` | Server Component | Fetch build-time, passa `staticData` a `HomeIndex` |
| `app/menu/[slug]/page.tsx` | `app/menu/[slug]/page.tsx` | Server Component | `generateStaticParams` da `sezioniRisolte`, cerca sezione per slug |
| `HomeIndex` | `src/components/menu/HomeIndex.tsx` | Client Component | Indice sezioni virtuali: card cliccabili filtrate per slot/orario |
| `CategoryPage` | `src/components/menu/CategoryPage.tsx` | Client Component | Lista voci di una sezione virtuale con disponibilità real-time |
| `MenuProvider` | `src/context/MenuContext.tsx` | Context Provider | Stato globale: sezioni, disponibilità, status |
| `MenuHeader` | `src/components/menu/MenuHeader.tsx` | Client Component | Nome ristorante, orari settimanali, slot attivo, banner chiusura |
| `MenuSection` | `src/components/menu/MenuSection.tsx` | Server-compatible | Filtra piatti esauriti, smista `MenuItem[]` → `DishCard` e `MenuFisso[]` → `MenuFissoCard` |
| `DishCard` | `src/components/menu/DishCard.tsx` | Server-compatible | Smart Component polimorfico per `MenuItem`: body variabile per `_type` (piatto/vino/birra/liquore/bevanda) |
| `MenuFissoCard` | `src/components/menu/MenuFissoCard.tsx` | Server-compatible | Menu a prezzo fisso (`MenuFisso`): nome, prezzo, lista piatti inclusi, servizi aggiuntivi |
| `MenuFooter` | `src/components/menu/MenuFooter.tsx` | Client Component | Indirizzo, social, copyright, annotazione Rich Text |
| `LexicalRenderer` | `src/components/menu/LexicalRenderer.tsx` | Server-compatible | Parser leggero per nodi Lexical: testo formattato, link, liste, paragrafi, heading |

## Struttura dei dati backend (PayloadCMS)

> **Nota:** la struttura reale del backend è stata verificata via `curl` diretto. I tipi TypeScript in `src/types/payload-types.ts` rispecchiano questa struttura verificata.

### Collection disponibili

| Endpoint | Tipo TS | Depth fetch | Note |
|---|---|---|---|
| `/api/piatti` | `Piatto` | — | `id` numerico, campi booleani dietetici, categoria embedded |
| `/api/vini` | `Vino` | `depth=2` | `tipologia`, `nazione`, `regione` (con `regione.nazione`), `zona` popolati; `prezzoCalice` separato |
| `/api/menu-fisso` | `MenuFisso` | `depth=2` | `categoria` embedded, array `piatti` e `servizi` popolati |
| `/api/bevande` | `Bevanda` | `depth=1` | `tipologia` e `nazione` popolati |
| `/api/birre` | `Birra` | `depth=1` | `tipologia` e `nazione` popolati; `grado`, `capacita` |
| `/api/liquori` | `Liquore` | `depth=1` | `tipologia` e `nazione` popolati; `grado`, `capacita`, `invecchiamento` |
| `/api/allergeni` | `Allergene` | — | `id` numerico, `nome`, `descrizione` |

### Collection geografiche (relazioni)

Usate come relazioni nei vini, birre, liquori e bevande. Non hanno endpoint diretto nel frontend — vengono popolate tramite `depth`.

| Tipo TS | Usato da | Come si ottiene |
|---|---|---|
| `Nazione` | `Vino`, `Birra`, `Liquore`, `Bevanda` | Popolata con `depth>=1` sulla collection principale |
| `Regione` | `Vino` | Popolata con `depth>=1`; `regione.nazione` richiede `depth>=2` |
| `Zona` | `Vino` | Popolata con `depth>=1` |

### Collection senza endpoint proprio

| Tipo TS | Come si ottiene |
|---|---|
| `CategoriaMenu` | Estratta dai piatti a build-time (`piatto.categoria` è embedded) |
| `TipologiaVino` | Embedded in ogni vino (`vino.tipologia`) |
| `TipologiaBevanda` | Embedded in bevande, birre e liquori (`item.tipologia`) |
| `CategoriaMenuFisso` | Embedded in ogni menu fisso (`menuFisso.categoria`) |

### Globals (struttura reale verificata)

| Endpoint | Tipo TS | Campo chiave | Note |
|---|---|---|---|
| `/api/globals/menu-config?depth=2` | `MenuConfig` | `standardItems[]` | **Richiede `?depth=2`** per popolare `targetCategories.value`. Senza `depth=2` restituisce `{}`. |
| `/api/vini?depth=2` | `Vino` | `nazione`, `regione`, `zona` | `depth=2` necessario per `regione.nazione`. Con `depth=1` la nazione della regione è solo un id numerico. |
| `/api/globals/generali?depth=2` | `Generali` | `scheduleWeekly[]` | Orari in inglese (`"monday"`, ecc.), `lunchSlot`/`dinnerSlot` espliciti |

### Nuovi campi di `MenuConfig` (aggiornamento backend)

| Campo | Tipo TS | Descrizione |
|---|---|---|
| `title` | `string?` | Titolo personalizzato del menu (es. "Menu Primavera 2025"). Se assente, `MenuHeader` usa `nomeRistorante` come fallback. |
| `logo` | `PayloadMedia \| number \| null` | Logo del ristorante — campo root di `MenuConfig`. |
| `annotazione` | `LexicalRoot \| null` | Annotazione Rich Text in formato Lexical. Supporta paragrafi, bold/italic, link, liste. Renderizzata da `LexicalRenderer` nel `MenuFooter`. |

### Logica filtro `activeDays` in `useMenuStructure`

Il filtro per giorno della settimana ha **priorità** rispetto al filtro per slot orario (`visibility`):

```typescript
// Ordine di controllo in isSectionVisible():
// 1. activeDays (se definito e non vuoto): nasconde la sezione se il giorno corrente non è nell'array
// 2. visibility: filtra per slot pranzo/cena/sempre
if (section.activeDays?.length > 0 && !section.activeDays.includes(getTodayDayName())) {
  return false; // nasconde indipendentemente dallo slot
}
```

`getTodayDayName()` usa `new Date().getDay()` e restituisce il giorno in inglese lowercase (`"monday"`, ..., `"sunday"`), coerente con il tipo `GiornoSettimana` del backend.

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

**Filtro per giorno della settimana (`activeDays`):** se una sezione ha `activeDays` definito e non vuoto, viene nascosta nei giorni non inclusi nell'array, indipendentemente dallo slot orario. Il controllo avviene in `isSectionVisible()` in `useMenuStructure.ts`, prima del controllo `visibility`.

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
- `MenuSection` controlla `availability.piatti[item.id]` **solo per `item._type === "piatto"`**. Vini, bevande e liquori non hanno logica di disponibilità.
- Se `availability` è `null` (GCS irraggiungibile) → tutto viene mostrato come disponibile.
- Se un piatto non ha entry nella mappa → considerato disponibile.

## Convenzioni TypeScript

- Nessun `any` — usa `unknown` se il tipo è davvero sconosciuto.
- Gli id di Payload sono **numerici** (`number`), non UUID stringhe.
- I campi relazione possono essere oggetto popolato **o** id numerico (es. `categoria: CategoriaMenu | number`).
- `targetCategories` usa la struttura polimorphic di Payload: `{ relationTo: string, value: { id, nome } }`.
- Importa sempre i tipi da `@/types` (alias configurato in `tsconfig.json` → `./src/*`).
- Le funzioni pure degli hook (`computeTimekeeperState`, `computeMenuStructure`) sono esportate separatamente per facilitare i test unitari.
- **Non passare `Piatto` grezzo a `DishCard` o `MenuSection`** — usa sempre `MenuItem` con `_type` aggiunto. Nella pagina `design-system`, usa `.map((p) => ({ ...p, _type: "piatto" as const }))` per convertire i dati dummy.
