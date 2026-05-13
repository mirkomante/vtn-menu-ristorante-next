# Architettura — Menu Digitale Vietnamonamour

> Documento verificato il 2026-03-29 tramite lettura integrale dei file sorgente.

---

## Stack tecnologico (verificato da `package.json`)

| Tecnologia | Versione | Ruolo |
|---|---|---|
| Next.js | 16.1.6 | Framework frontend (App Router, SSG) |
| React | 19.2.3 | UI |
| TypeScript | ^5 (strict) | Type safety rigorosa |
| Tailwind CSS | ^4 | Styling utility-first (CSS-first config) |
| PayloadCMS | — | Backend CMS headless (Google Cloud Run) |
| Google Cloud Storage | — | File JSON `disponibilita.json` per disponibilità real-time |
| Firebase Hosting | Free Tier | Hosting sito statico (cartella `out/`) |
| pnpm | 9+ | Package manager |

---

## Strategia di rendering: SSG puro

`output: "export"` in `next.config.ts` — confermato.

Tutte le pagine sono pre-renderizzate a build-time. Nessun SSR, nessun middleware, nessuna Route Handler a runtime. L'unica eccezione è la disponibilità real-time dei piatti: fetchata lato client ogni 5 minuti da GCS.

**Implicazioni:**
- `images.unoptimized: true` — richiesto per static export.
- I dati del menu sono "congelati" al momento della build.
- `generateStaticParams` è obbligatorio per ogni rotta dinamica.

---

## Routing

```
/                    → HomeIndex (indice sezioni cliccabili)
/menu/[slug]         → CategoryPage (lista voci di una sezione virtuale)
/design-system       → Pagina preview Design System (inclusa in produzione)
```

**Il routing è guidato da `menu-config.standardItems`, non dalla tassonomia del DB.** Gli slug non esistono nel backend — vengono generati a build-time con `slugify(label)` in `normalizeStandardItems()`.

### `generateStaticParams` — obbligatorio

Con `output: 'export'`, Next.js deve conoscere in anticipo tutti gli slug. Implementato in `app/menu/[slug]/page.tsx`:

```typescript
export async function generateStaticParams() {
  const { sezioniRisolte } = await getStaticMenuData();
  return sezioniRisolte
    .filter((s) => Boolean(s.slug))
    .map((s) => ({ slug: s.slug }));
}
```

---

## Flusso dati completo

```
BUILD-TIME (pnpm build)
────────────────────────────────────────────────────────────────
app/page.tsx (Server Component)
  └─ getStaticMenuData() ──────────────────► PayloadCMS REST API
       ├─ fetchAllDocs("piatti", "vini", "menu-fisso", ...)
       ├─ fetchAllDocs("nazioni", "regioni", "zone")  [hydration geografica]
       ├─ fetchAllDocs("allergeni")
       ├─ fetchGlobalSafe("menu-config")
       ├─ fetchGlobalSafe("generali")
       └─ fetchGlobalSafe("ordinamento-menu", 1, true)  [no-store]
       ↓
       normalizeStandardItems()  → aggiunge slug da slugify(label)
       resolveAllSezioni()       → Query Builder + sort/group
       ↓
  StaticMenuData { piatti, vini, ..., sezioniRisolte[] }
  └─ <HomeIndex staticData={...} />  → index.html

app/menu/[slug]/page.tsx (Server Component × N sezioni)
  └─ generateStaticParams()  → slug da sezioniRisolte
  └─ getStaticMenuData()     → cerca sezione per slug
  └─ <CategoryPage staticData sezione />  → /menu/[slug].html

OUTPUT: cartella out/ (HTML/CSS/JS statici)
  └─ Firebase Hosting (CDN)

────────────────────────────────────────────────────────────────
RUNTIME (browser)
────────────────────────────────────────────────────────────────
HomeIndex / CategoryPage (Client Component)
  └─ MenuProvider
       ├─ useTimekeeper(generali)   [tick ogni 30s]
       │    └─ isOpen, activeSlot, isHoliday, closureMessage
       ├─ useMenuStructure(sezioniRisolte, menuConfig, activeSlot)
       │    └─ SezioneRisolta[] filtrate per slot/giorno
       └─ getRealTimeAvailability() [polling ogni 5 min]
            └─ DisponibilitaResponse | null
                 └─ Google Cloud Storage (disponibilita.json)
```

---

## Sezioni Virtuali — Query Builder

`menu-config.standardItems` è un **costruttore di menu dinamico**. Ogni voce definisce una "Sezione Virtuale" che aggrega voci da più collection o filtra per categoria.

### Campi chiave di una sezione

| Campo | Tipo | Note |
|---|---|---|
| `label` | `string` | Titolo visualizzato |
| `slug` | — | **Non esiste nel backend** — generato da `slugify(label)` |
| `visibility` | `"always"` \| `"lunch_only"` \| `"dinner_only"` | Valori reali del backend |
| `sourceCollection` | `string[]` | Array (es. `["piatti"]`, `["bevande","birre"]`) |
| `filterMode` | `"all"` \| `"include"` \| `"exclude"` | Logica di filtro categorie |
| `targetCategories` | `{ relationTo, value: { id, nome } }[]` | Struttura polymorphic Payload |
| `activeDays` | `GiornoSettimana[]` | Opzionale. Priorità su `visibility`. |

### Logica Multi-Source Additiva

`resolveMenuSection` itera su ogni sorgente in `sourceCollection` in modo indipendente, applica il filtro corretto, poi unisce i risultati.

```
per ogni source in sourceCollection:
  1. Recupera l'array grezzo corrispondente
  2. Estrae i targetIds pertinenti (filtrando per relationTo)
  3. Applica filterMode (include/exclude/all)
  4. Converte gli item in MenuItem (aggiunge _type)
  5. Aggiunge a allItems

→ allItems ordinato secondo OrdinamentoMenu
```

---

## Tipo unione `MenuItem` — astrazione centrale

```typescript
type MenuItem =
  | (Piatto   & { _type: "piatto" })
  | (Vino     & { _type: "vino" })
  | (Bevanda  & { _type: "bevanda" })
  | (Birra    & { _type: "birra" })
  | (Liquore  & { _type: "liquore" });
```

Il campo `_type` **non esiste nel backend** — aggiunto dalle funzioni helper in `api.ts`.

---

## Global `ordinamento-menu` — Sort e Raggruppamento

Fetchato con `depth=1` e `cache: "no-store"`. Configura ordinamento e raggruppamento per ogni collection.

**Struttura reale (campi flat con prefisso):**
```json
{
  "piattiOrderBy": "nome",    "piattiOrderDirection": "asc",  "piattiGroupBy": "nessuno",
  "categoriePiatti": [{ "id": 26, "nome": "Involtini", "elementi": { "docs": [...] } }],
  "viniOrderBy": "regione",   "viniOrderDirection": "asc",    "viniGroupBy": "nazione",
  "tipologieVino": [{ "id": 21, "nome": "Bianchi" }, ...]
}
```

**Logica di priorità:**
1. Se esiste l'array ordinato (`categoriePiatti`, `tipologieVino`, ecc.) → usa quello come driver dell'ordine (priorità assoluta).
2. Altrimenti → raggruppamento dinamico automatico (`groupBy` + `groupItems`).

---

## Struttura `SezioneRisolta`

```typescript
interface SezioneRisolta {
  slug: string;
  titolo: string;
  groups: MenuItemGroup[];   // item raggruppati e ordinati a build-time
  menuFissi: MenuFisso[];
  isSpecialPeriod: boolean;
}

interface MenuItemGroup {
  title?: string;    // assente se groupBy === "nessuno"
  items: MenuItem[];
}
```

---

## Disponibilità real-time — GCS

Il file `disponibilita.json` su GCS contiene la mappa degli stati:

```json
{
  "aggiornatoAl": "2024-01-15T19:30:00Z",
  "piatti": { "202": { "id": 202, "stato": "esaurito" } },
  "vini": {},
  "messaggioGlobale": null
}
```

- Polling ogni 5 minuti (`AVAILABILITY_POLL_MS = 5 * 60 * 1_000`).
- `MenuSection` filtra solo `_type === "piatto"` — i vini non vengono filtrati per disponibilità.
- `messaggioGlobale` è definito nel tipo ma **non renderizzato** da nessun componente.
- Se GCS è irraggiungibile → `availability = null` → tutto mostrato come disponibile.

---

## Responsabilità componenti

| Componente | File | Tipo | Responsabilità |
|---|---|---|---|
| `app/page.tsx` | `app/page.tsx` | Server Component | Fetch build-time, passa `staticData` a `HomeIndex` |
| `app/menu/[slug]/page.tsx` | `app/menu/[slug]/page.tsx` | Server Component | `generateStaticParams`, cerca sezione per slug |
| `HomeIndex` | `src/components/menu/HomeIndex.tsx` | Client Component | Indice sezioni: card cliccabili filtrate per slot/orario |
| `CategoryPage` | `src/components/menu/CategoryPage.tsx` | Client Component | Lista voci di una sezione con disponibilità real-time |
| `MenuProvider` | `src/context/MenuContext.tsx` | Context Provider | Stato globale: sezioni, disponibilità, status |
| `MenuHeader` | `src/components/menu/MenuHeader.tsx` | Server-compatible | Titolo brand (title o nomeRistorante). **Non mostra orari.** |
| `MenuSection` | `src/components/menu/MenuSection.tsx` | Server-compatible | Filtra piatti esauriti, renderizza gruppi con sottotitoli sticky |
| `DishCard` | `src/components/menu/DishCard.tsx` | Server-compatible | Smart Component polimorfico per `MenuItem` |
| `MenuFissoCard` | `src/components/menu/MenuFissoCard.tsx` | Server-compatible | Menu a prezzo fisso |
| `MenuFooter` | `src/components/menu/MenuFooter.tsx` | Server-compatible | Indirizzo, social, copyright, annotazione Rich Text |
| `LexicalRenderer` | `src/components/menu/LexicalRenderer.tsx` | Server-compatible | Parser Lexical: paragrafi, heading, liste, link, formattazione inline |
| `StickyNav` | `src/components/menu/StickyNav.tsx` | Client Component | ⚠️ Codice morto — non usato dalle pagine attuali |
| `MenuOrchestrator` | `src/components/menu/MenuOrchestrator.tsx` | Client Component | ⚠️ Codice morto — architettura legacy a pagina singola |

---

## Gestione fallback

| Scenario | Comportamento |
|---|---|
| Collection principale non raggiungibile | `fetchAllDocs` lancia eccezione → build fallisce |
| Global `menu-config` → 500 o `{}` | `fetchGlobalSafe` → `null` → fallback hardcoded |
| Global `generali` → 500 o `{}` | `fetchGlobalSafe` → `null` → fallback hardcoded |
| Global `ordinamento-menu` → 500 o `{}` | Fallback `{}` → default (`orderBy: "order"`, `groupBy: "nessuno"`) |
| `standardItems` vuoto | Sezioni auto-generate dalle categorie dei piatti |
| GCS irraggiungibile a runtime | `availability = null` → tutto disponibile |
| Sezione con tutti i piatti esauriti | `MenuSection` restituisce `null` → sezione invisibile |

---

## Convenzioni TypeScript

- Nessun `any` — usa `unknown` se il tipo è davvero sconosciuto.
- ID Payload sono **numerici** (`number`), non UUID.
- I campi relazione possono essere oggetto popolato **o** id numerico.
- Importa sempre i tipi da `@/types` (alias configurato in `tsconfig.json`).
- Le funzioni pure degli hook (`computeTimekeeperState`, `computeMenuStructure`, `filterSezioniRisolte`) sono esportate separatamente per facilitare i test.

---

## AI-AGENT QUICK REFERENCE

```
# File critici
next.config.ts          → output: "export", images.unoptimized: true
app/globals.css         → @theme con tutti i token Tailwind v4
src/lib/api.ts          → getStaticMenuData(), getRealTimeAvailability(), Query Builder
src/types/payload-types.ts → tutti i tipi (non modificare manualmente)
src/context/MenuContext.tsx → stato globale client-side

# Regole SSG
- Ogni rotta dinamica DEVE esportare generateStaticParams
- Nessun 'use server', revalidatePath, unstable_cache
- Nessun fetch dinamico a runtime (solo client-side polling GCS)

# Regole TypeScript
- Zero any
- ID Payload = number (non string/UUID)
- Importa da @/types (mai percorsi relativi per i tipi)

# Regole componenti
- Non passare Piatto grezzo a DishCard — usa MenuItem con _type
- MenuSection accetta groups: MenuItemGroup[] (non items: MenuItem[])
- "use client" solo dove serve interattività
```
