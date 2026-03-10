# KB — Frontend Menu (Next.js SSG)

> Generato il 2026-03-08 — basato su lettura integrale di tutti i file sorgente e della documentazione `/docs`.

---

## 1. Project Overview

### Purpose
Menu digitale statico per il ristorante **Vietnamonamour** (Milano). Il cliente scansiona un QR code e visualizza il menu sul proprio telefono. L'interfaccia è un indice di sezioni cliccabili (`/`) che porta a pagine di dettaglio per categoria (`/menu/[slug]`).

### Tech Stack

| Tecnologia | Versione | Ruolo |
|---|---|---|
| Next.js | 16.1.6 | Framework (App Router, SSG `output: 'export'`) |
| React | 19.2.3 | UI |
| TypeScript | ^5 | Type safety rigorosa (strict mode) |
| Tailwind CSS | ^4 | Styling utility-first, configurazione CSS-first via `@theme` |
| PayloadCMS | — | Backend CMS headless (su Google Cloud Run) |
| Google Cloud Storage | — | File JSON `disponibilita.json` per disponibilità real-time |
| Firebase Hosting | Free Tier | Hosting sito statico (cartella `out/`) |
| pnpm | 9+ | Package manager |

### Rendering Strategy
**SSG puro** (`output: 'export'` in `next.config.ts`). Tutte le pagine sono pre-renderizzate a build-time. Nessun SSR, nessun middleware, nessuna Route Handler a runtime. L'unica eccezione è la disponibilità real-time dei piatti (esaurito/disponibile), fetchata lato client ogni 5 minuti da GCS.

### Deployment Target
**Firebase Hosting** (Free Tier). La build produce la cartella `out/` con HTML/CSS/JS statici. Deploy tramite `firebase deploy`. Configurato con `cleanUrls: true` in `firebase.json`.

---

## 2. Architecture Summary

### Folder Structure

```
vtn-menu-ristorante-next/
├── app/                            # Next.js App Router
│   ├── fonts.ts                    # Font Google (Philosopher + DM Sans)
│   ├── globals.css                 # Tema Tailwind v4 (@theme) + reset CSS
│   ├── layout.tsx                  # Root layout (font, metadata, classi body)
│   ├── page.tsx                    # Homepage — Server Component async (SSG)
│   ├── menu/
│   │   └── [slug]/
│   │       └── page.tsx            # Pagina dettaglio sezione (SSG + generateStaticParams)
│   └── design-system/
│       └── page.tsx                # Preview Design System (solo sviluppo)
├── src/
│   ├── types/
│   │   ├── payload-types.ts        # Interfacce TypeScript per Payload + tipi derivati
│   │   ├── disponibilita.ts        # Interfaccia per il JSON di disponibilità GCS
│   │   └── index.ts                # Re-export centralizzato
│   ├── lib/
│   │   └── api.ts                  # Fetcher build-time + client-side + Query Builder
│   ├── hooks/
│   │   ├── useTimekeeper.ts        # Logica temporale: apertura, slot, festività
│   │   └── useMenuStructure.ts     # Logica strutturale: sezioni filtrate per slot/giorno
│   ├── context/
│   │   └── MenuContext.tsx         # Provider globale: hooks + polling disponibilità
│   └── components/
│       ├── ui/                     # Atomi Design System (Button, Heading, Text, Badge, Container)
│       └── menu/                   # Componenti di dominio
│           ├── DishCard.tsx
│           ├── MenuSection.tsx
│           ├── HomeIndex.tsx
│           ├── CategoryPage.tsx
│           ├── MenuOrchestrator.tsx  # ⚠️ Componente legacy, non usato dalle pagine attuali
│           ├── StickyNav.tsx         # ⚠️ Non usato nelle pagine attuali
│           ├── MenuHeader.tsx
│           ├── MenuFooter.tsx
│           ├── MenuFissoCard.tsx
│           ├── LexicalRenderer.tsx
│           └── index.ts
├── docs/                           # Documentazione
├── public/                         # Asset statici (SVG icone default Next.js)
├── out/                            # Output build statica (gitignored)
├── .env.local                      # Variabili d'ambiente (non committato)
├── next.config.ts
├── tsconfig.json
├── firebase.json
└── package.json
```

### Data Flow Diagram

```
BUILD-TIME (pnpm build)
────────────────────────────────────────────────────────────────
app/page.tsx (Server Component)
  └─ getStaticMenuData()  ──────────────────► PayloadCMS REST API
       ├─ fetchAllDocs("piatti", "vini", "menu-fisso", ...)
       ├─ fetchAllDocs("nazioni", "regioni", "zone")  [hydration geografica]
       ├─ fetchAllDocs("allergeni")
       ├─ fetchGlobalSafe("menu-config")
       ├─ fetchGlobalSafe("generali")
       └─ fetchGlobalSafe("ordinamento-menu")
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
       │    └─ isOpen, activeSlot, isHoliday
       ├─ useMenuStructure(sezioniRisolte, menuConfig, activeSlot)
       │    └─ SezioneRisolta[] filtrate per slot/giorno
       └─ getRealTimeAvailability() [polling ogni 5 min]
            └─ DisponibilitaResponse | null
                 └─ Google Cloud Storage (disponibilita.json)
```

---

## 3. Pages & Routes

### `/`
- **File**: `app/page.tsx`
- **Rendering**: SSG (Server Component async)
- **Data fetched**: `getStaticMenuData()` — tutti i dati del menu da PayloadCMS
- **Components used**: `HomeIndex` (Client Component)
- **Purpose**: Indice delle sezioni del menu come card cliccabili. Le sezioni fuori orario (es. "Pranzo" di sera) vengono nascoste automaticamente a runtime da `useMenuStructure`.
- **Error handling**: Se `getStaticMenuData()` lancia eccezione, mostra un messaggio di errore inline senza crashare.

### `/menu/[slug]`
- **File**: `app/menu/[slug]/page.tsx`
- **Rendering**: SSG (Server Component async + `generateStaticParams`)
- **Data fetched**: `getStaticMenuData()` — tutti i dati; la sezione specifica viene cercata in `sezioniRisolte` per slug
- **Components used**: `CategoryPage` (Client Component)
- **Purpose**: Lista delle voci di una sezione virtuale (piatti, vini, bevande, menu fissi). Disponibilità real-time applicata a runtime.
- **Note**: Gli slug non esistono nel backend — generati a build-time con `slugify(label)`. Se la sezione non esiste in `sezioniRisolte`, viene chiamato `notFound()`.

### `/design-system`
- **File**: `app/design-system/page.tsx`
- **Rendering**: SSG (Server Component, ma con dati dummy inline)
- **Data fetched**: Nessuna chiamata API — usa dati dummy hardcoded
- **Components used**: `Badge`, `Button`, `Container`, `Heading`, `Text`, `DishCard`, `MenuSection`
- **Purpose**: Pagina di preview del Design System per sviluppo. Non collegata dalla navigazione principale. ⚠️ Inclusa nella build di produzione (non esclusa esplicitamente).

---

## 4. Components

### `HomeIndex`
- **File**: `src/components/menu/HomeIndex.tsx`
- **Type**: `"use client"` — Client Component
- **Props**:
  | Nome | Tipo | Required | Default |
  |---|---|---|---|
  | `staticData` | `StaticMenuData` | ✅ | — |
- **Purpose**: Entry point della Home. Inizializza `MenuProvider` con tutti i dati statici, poi renderizza `IndexContent` che consuma il context.
- **Child components**: `MenuProvider`, `MenuHeader`, `MenuFooter`, `SectionCard` (locale), `Container`, `Heading`, `Text`
- **Notes**: `SectionCard` è un componente locale (non esportato) che renderizza un `<Link href="/menu/[slug]">` con chevron animato.

### `CategoryPage`
- **File**: `src/components/menu/CategoryPage.tsx`
- **Type**: `"use client"` — Client Component
- **Props**:
  | Nome | Tipo | Required | Default |
  |---|---|---|---|
  | `staticData` | `StaticMenuData` | ✅ | — |
  | `sezione` | `SezioneRisolta` | ✅ | — |
- **Purpose**: Entry point della pagina dettaglio sezione. Inizializza `MenuProvider`, poi renderizza `CategoryContent` con `BackButton` sticky e `MenuSection`.
- **Child components**: `MenuProvider`, `MenuHeader`, `MenuFooter`, `MenuSection`, `BackButton` (locale), `Container`, `Text`

### `DishCard`
- **File**: `src/components/menu/DishCard.tsx`
- **Type**: Server-compatible (nessun hook, nessun `"use client"`)
- **Props**:
  | Nome | Tipo | Required | Default |
  |---|---|---|---|
  | `item` | `MenuItem` | ✅ | — |
  | `isAvailable` | `boolean` | ❌ | `true` |
  | `className` | `string` | ❌ | `""` |
- **Purpose**: Smart Component polimorfico per qualsiasi voce del menu. Usa `item._type` per discriminare il body:
  - `piatto`: descrizione + badge dietetici (`highlight`) + badge allergeni (`allergen`) + prezzo alternativo
  - `vino`: descrizione + info tecnica (cantina, annata, grado) + provenienza geografica + badge tipologia/capacità + prezzo calice
  - `birra`: descrizione + info (grado, capacità) + badge tipologia/nazione
  - `liquore`: descrizione + info (grado, capacità, invecchiamento) + badge tipologia/nazione
  - `bevanda`: descrizione + badge tipologia/nazione
- **Notes**: Se `isAvailable === false`, restituisce `null`. Il filtro reale avviene in `MenuSection` — questo è un fail-safe. Stile Minimal B2: `border-b border-surface-dark/20`.

### `MenuSection`
- **File**: `src/components/menu/MenuSection.tsx`
- **Type**: Server-compatible
- **Props**:
  | Nome | Tipo | Required | Default |
  |---|---|---|---|
  | `categoria` | `Pick<CategoriaMenu, "slug" \| "nome" \| "descrizione">` | ✅ | — |
  | `groups` | `MenuItemGroup[]` | ❌ | `[]` |
  | `menuFissi` | `MenuFisso[]` | ❌ | `[]` |
  | `availability` | `DisponibilitaResponse \| null` | ❌ | `null` |
  | `className` | `string` | ❌ | `""` |
- **Purpose**: Renderizza una sezione del menu con titolo, menu fissi (in cima) e gruppi di item. Filtra i piatti esauriti/nascosti. Se un gruppo ha `title`, renderizza un sottotitolo `h3` sticky.
- **Notes**: Restituisce `null` se non ci sono né menu fissi né gruppi visibili. Il filtro disponibilità si applica solo a `_type === "piatto"`.

### `MenuFissoCard`
- **File**: `src/components/menu/MenuFissoCard.tsx`
- **Type**: Server-compatible
- **Props**:
  | Nome | Tipo | Required | Default |
  |---|---|---|---|
  | `menu` | `MenuFisso` | ✅ | — |
  | `className` | `string` | ❌ | `""` |
- **Purpose**: Renderizza un menu a prezzo fisso (pranzo, degustazione). Layout: nome + prezzo, descrizione italic, lista piatti inclusi (rientrata), servizi aggiuntivi (badge).
- **Notes**: Se `piatti` o `servizi` contengono ID numerici non popolati (depth < 2), vengono silenziosamente ignorati.

### `MenuHeader`
- **File**: `src/components/menu/MenuHeader.tsx`
- **Type**: Server-compatible
- **Props**:
  | Nome | Tipo | Required | Default |
  |---|---|---|---|
  | `menuConfig` | `MenuConfig` | ✅ | — |
- **Purpose**: Header brand-only. Mostra `menuConfig.title` se presente, altrimenti `menuConfig.nomeRistorante`. Sfondo `bg-background` (crema).
- **Notes**: ⚠️ Orari, slot attivo e banner chiusura sono stati rimossi per pulizia visiva. La documentazione (`ARCHITECTURE.md`) menziona ancora questi elementi come responsabilità di `MenuHeader`, ma il codice attuale non li implementa.

### `MenuFooter`
- **File**: `src/components/menu/MenuFooter.tsx`
- **Type**: Server-compatible (ma consuma `menuConfig` che può avere dati dinamici)
- **Props**:
  | Nome | Tipo | Required | Default |
  |---|---|---|---|
  | `menuConfig` | `MenuConfig` | ✅ | — |
- **Purpose**: Footer con nome ristorante, testo footer CMS, annotazione Rich Text Lexical, indirizzo, telefono, link social (Instagram, Facebook), copyright dinamico.
- **Child components**: `LexicalRenderer`, `Container`
- **Notes**: Sfondo `bg-text-main` (Blu Notte). Usa elementi HTML nativi (`<p>`, `<a>`) invece di `<Text>` per evitare il colore di default `text-text-main` su sfondo scuro.

### `LexicalRenderer`
- **File**: `src/components/menu/LexicalRenderer.tsx`
- **Type**: Server-compatible (nessun hook)
- **Props**:
  | Nome | Tipo | Required | Default |
  |---|---|---|---|
  | `content` | `LexicalRoot` | ✅ | — |
  | `className` | `string` | ❌ | — |
- **Purpose**: Parser leggero per nodi Lexical Rich Text di Payload. Gestisce: paragrafi, heading, liste (bullet/numerate), link (con `fields.url` e `url` diretto), testo con formattazione inline (bold, italic, underline, strikethrough).
- **Notes**: Nessuna dipendenza esterna. Parser custom sui nodi JSON.

### `StickyNav`
- **File**: `src/components/menu/StickyNav.tsx`
- **Type**: `"use client"` — Client Component
- **Props**:
  | Nome | Tipo | Required | Default |
  |---|---|---|---|
  | `categorie` | `CategoriaMenu[]` | ✅ | — |
  | `activeSlug` | `string \| null` | ❌ | — |
  | `onCategoryChange` | `(slug: string) => void` | ❌ | — |
- **Purpose**: Barra di navigazione sticky per le sezioni del menu. Usa `IntersectionObserver` per evidenziare la sezione attiva durante lo scroll. Scroll orizzontale su mobile.
- **Notes**: ⚠️ **Non usato nelle pagine attuali** (`HomeIndex` e `CategoryPage`). Esportato nel barrel `index.ts` e usato solo in `MenuOrchestrator` (anch'esso non usato dalle pagine). Sfondo `bg-surface-dark/95` — ⚠️ contraddice la regola del design system che vieta `bg-surface-dark` come sfondo.

### `MenuOrchestrator`
- **File**: `src/components/menu/MenuOrchestrator.tsx`
- **Type**: `"use client"` — Client Component
- **Props**:
  | Nome | Tipo | Required | Default |
  |---|---|---|---|
  | `staticData` | `StaticMenuData` | ✅ | — |
- **Purpose**: Componente legacy che renderizza tutte le sezioni in un'unica pagina con `StickyNav`. Architettura precedente (menu a pagina singola con scroll).
- **Notes**: ⚠️ **Non usato da nessuna pagina attuale**. L'architettura è stata cambiata in routing a due livelli (Home Indice + pagine dettaglio). Rimane nel codebase come codice morto. Usa `categorie` da `StaticMenuData` ma il campo è ancora presente nel tipo.

### `Badge`
- **File**: `src/components/ui/Badge.tsx`
- **Props**: `variant?: "default" | "highlight" | "gold" | "outline" | "allergen"`, `className?`, `children`, `...HTMLAttributes<HTMLSpanElement>`
- **Purpose**: Etichetta semantica. Cinque varianti con ruoli precisi (vedi sezione 7).

### `Button`
- **File**: `src/components/ui/Button.tsx`
- **Props**: `variant?: "primary" | "outline" | "ghost"`, `size?: "sm" | "md" | "lg"`, `loading?: boolean`, `disabled?`, `...HTMLAttributes<HTMLButtonElement>`
- **Purpose**: Bottone UI con tre varianti e stato loading. Usa `forwardRef`.

### `Heading`
- **File**: `src/components/ui/Typography.tsx`
- **Props**: `level?: 1 | 2 | 3 | 4`, `color?: "default" | "bordeaux"`, `as?`, `className?`, `children`
- **Purpose**: Titoli con font Philosopher. Polymorphic via prop `as`.

### `Text`
- **File**: `src/components/ui/Typography.tsx`
- **Props**: `variant?: "lead" | "body" | "small" | "caption"`, `muted?: boolean`, `as?: "p" | "span" | "div" | "li" | "label"`, `className?`, `children`
- **Purpose**: Testi con font DM Sans. Polymorphic via prop `as`.

### `Container`
- **File**: `src/components/ui/Container.tsx`
- **Props**: `padding?: "default" | "tight" | "none"`, `as?: "div" | "section" | "main" | "article" | "header" | "footer" | "nav"`, `className?`, `children`
- **Purpose**: Wrapper centrato `max-w-4xl` con padding responsive. Polymorphic.

---

## 5. Data Fetching Layer

### PayloadCMS Base URL Configuration
```
NEXT_PUBLIC_PAYLOAD_URL=https://vtn-backend-payload-203473363873.europe-west1.run.app
```
Configurato in `src/lib/api.ts`:
```typescript
const PAYLOAD_URL = process.env.NEXT_PUBLIC_PAYLOAD_URL ?? "";
```

### All API Endpoints Consumed

**Collections (build-time, `fetchAllDocs` con paginazione automatica, limit=100):**

| Metodo | Path | Parametri | Scopo |
|---|---|---|---|
| GET | `/api/piatti` | `where={"inLista":{"equals":true}}` | Piatti visibili |
| GET | `/api/vini` | `where={"inLista":{"equals":true}}&depth=1` | Vini con tipologia embedded |
| GET | `/api/menu-fisso` | `where={"inLista":{"equals":true}}&depth=2` | Menu fissi con piatti e servizi popolati |
| GET | `/api/bevande` | `where={"inLista":{"equals":true}}&depth=1` | Bevande con tipologia embedded |
| GET | `/api/birre` | `where={"inLista":{"equals":true}}&depth=1` | Birre con tipologia embedded |
| GET | `/api/liquori` | `where={"inLista":{"equals":true}}&depth=1` | Liquori con tipologia embedded |
| GET | `/api/allergeni` | — | Tutti gli allergeni |
| GET | `/api/nazioni` | — | Nazioni (opzionale, fallback `[]`) |
| GET | `/api/regioni` | — | Regioni vinicole (opzionale, fallback `[]`) |
| GET | `/api/zone` | — | Zone/denominazioni (opzionale, fallback `[]`) |

**Globals (build-time, `fetchGlobalSafe`):**

| Metodo | Path | Cache | Scopo |
|---|---|---|---|
| GET | `/api/globals/menu-config?depth=2` | `revalidate: 3600` | Configurazione sezioni, logo, titolo, annotazione |
| GET | `/api/globals/generali?depth=2` | `revalidate: 3600` | Orari settimanali, slot pranzo/cena, eccezioni |
| GET | `/api/globals/ordinamento-menu?depth=1` | `cache: "no-store"` | Sort e raggruppamento per collection |

**Client-side (runtime, polling ogni 5 minuti):**

| Metodo | URL | Cache | Scopo |
|---|---|---|---|
| GET | `NEXT_PUBLIC_MENU_JSON_URL` | `cache: "no-store"` | Disponibilità real-time piatti da GCS |

### Revalidation / ISR Strategy
- **Collections**: `next: { revalidate: 3600 }` (1 ora di cache Next.js)
- **Globals `menu-config` e `generali`**: `next: { revalidate: 3600 }`
- **Global `ordinamento-menu`**: `cache: "no-store"` (nessuna cache, sempre fresco)
- **GCS `disponibilita.json`**: `cache: "no-store"`, polling client-side ogni 5 minuti
- ⚠️ Non è ISR vera (non c'è `revalidate` a livello di pagina con `output: 'export'`). Il `revalidate` sul `fetch` è solo per la cache HTTP durante la build.

### Error Handling Approach

| Scenario | Comportamento |
|---|---|
| Collection principale non raggiungibile | `fetchAllDocs` lancia eccezione → build fallisce esplicitamente |
| Global `menu-config` → 500 o `{}` | `fetchGlobalSafe` restituisce `null` → fallback hardcoded |
| Global `generali` → 500 o `{}` | `fetchGlobalSafe` restituisce `null` → fallback hardcoded |
| Global `ordinamento-menu` → 500 o `{}` | Fallback `{}` → default (`orderBy: "order"`, `groupBy: "nessuno"`) |
| `nazioni`/`regioni`/`zone` non raggiungibili | `.catch(() => [])` → campi geografici restano ID numerici (ignorati silenziosamente da `getNome()`) |
| GCS irraggiungibile a runtime | `availability = null` → tutto mostrato come disponibile |
| Sezione con tutti i piatti esauriti | `MenuSection` restituisce `null` → sezione invisibile |
| `getStaticMenuData()` lancia in pagina | Fallback UI inline con messaggio di errore |

### Auth Tokens
Nessun token di autenticazione. Le API PayloadCMS sono pubbliche (read-only).

---

## 6. Types & Interfaces

### Key TypeScript Types

**File**: `src/types/payload-types.ts`

| Tipo | Categoria | Descrizione |
|---|---|---|
| `Piatto` | Collection | Piatto del menu. ID numerico, booleani dietetici, `categoria` embedded o ID |
| `Vino` | Collection | Vino. `tipologia`, `nazione`, `regione`, `zona` come oggetti o ID numerici |
| `Bevanda` | Collection | Bevanda. `tipologia` e `nazione` embedded |
| `Birra` | Collection | Birra. `tipologia`, `nazione`, `grado`, `capacita` |
| `Liquore` | Collection | Liquore/Distillato. Aggiunge `invecchiamento` |
| `MenuFisso` | Collection | Menu a prezzo fisso. `piatti[]` e `servizi[]` popolati con `depth=2` |
| `Allergene` | Collection | Allergene. `id`, `nome`, `descrizione` |
| `CategoriaMenu` | Derivato | Estratta dai piatti a build-time. `slug` generato con `slugify()` |
| `Nazione` | Geografico | Nazione di provenienza |
| `Regione` | Geografico | Regione vinicola. `nazione` embedded con `depth=2` |
| `Zona` | Geografico | Zona/denominazione vinicola |
| `MenuItem` | Unione discriminata | `Piatto \| Vino \| Bevanda \| Birra \| Liquore` con `_type` aggiunto a build-time |
| `MenuItemGroup` | Derivato | `{ title?: string; items: MenuItem[] }` — unità di rendering gerarchico |
| `SezioneRisolta` | Derivato | Output del Query Builder: `{ slug, titolo, groups, menuFissi, isSpecialPeriod }` |
| `StaticMenuData` | Aggregato | Tutti i dati necessari per la build |
| `MenuConfig` | Global | Configurazione sezioni, logo, titolo, annotazione, social, orari |
| `Generali` | Global | Orari settimanali, slot pranzo/cena, eccezioni |
| `OrdinamentoMenu` | Global | Sort e raggruppamento per collection (campi flat con prefisso) |
| `SezioneMenuConfig` | Derivato | Sezione normalizzata con `slug` aggiunto |
| `LexicalRoot` | Rich Text | Root del documento Lexical serializzato |

**File**: `src/types/disponibilita.ts`

| Tipo | Descrizione |
|---|---|
| `StatoDisponibilita` | `"disponibile" \| "esaurito" \| "nascosto"` |
| `DisponibilitaItem` | `{ id, stato, nota? }` |
| `DisponibilitaResponse` | `{ aggiornatoAl, piatti: Record<string, DisponibilitaItem>, vini: Record<string, DisponibilitaItem>, messaggioGlobale? }` |

### Location of Type Definitions
- `src/types/payload-types.ts` — tipi Payload + tipi derivati
- `src/types/disponibilita.ts` — tipi per il JSON GCS
- `src/types/index.ts` — re-export centralizzato (importare da `@/types`)
- Tipi locali inline nei componenti (es. `MenuStatus`, `MenuContextValue` in `MenuContext.tsx`)

---

## 7. Styling System

### Framework/Library
**Tailwind CSS v4** con configurazione CSS-first. Non esiste `tailwind.config.ts`. Tutti i token del tema sono definiti in `app/globals.css` nel blocco `@theme`.

### Theme Tokens

**Colori:**

| Token | Classe Tailwind | HEX / RGBA | Uso |
|---|---|---|---|
| `background` | `bg-background` | `#FFEDD7` | Sfondo pagina — sempre questo |
| `surface` | `bg-surface` | `#FFFFFF` | Solo modal, form, overlay |
| `surface-dark` | `text-surface-dark` | `#460112` | **Solo come colore testo** su sfondi chiari — titoli bordeaux |
| `text-main` | `text-text-main` | `#080F2C` | Testo principale (Blu Notte) |
| `text-light` | `text-text-light` | `#FFEDD7` | Testo su sfondi scuri |
| `text-muted` | `text-text-muted` | `rgba(8,15,44,0.7)` | Testi secondari |
| `accent-gold` | `text-accent-gold` | `#F8B624` | Prezzi, icone, link |
| `accent-orange` | `bg-accent-orange` | `#EF5808` | Badge highlight, dettagli |

**Tipografia:**

| Ruolo | Font | Classe Tailwind | Pesi |
|---|---|---|---|
| Titoli | Philosopher | `font-serif` | 400, 700 |
| Testi | DM Sans | `font-sans` | 300–700 |

Font caricati via `next/font/google` in `app/fonts.ts`, iniettati come variabili CSS (`--font-philosopher`, `--font-dm-sans`).

**Border Radius:**

| Token | Valore |
|---|---|
| `--radius-sm` | `0.25rem` |
| `--radius-md` | `0.375rem` |
| `--radius-lg` | `0.5rem` |
| `--radius-full` | `9999px` |

**Ombre:** Basate su `rgba(8, 15, 44, ...)` (Blu Notte a bassa opacità).

### Responsive Breakpoints
Tailwind v4 default: `sm` (640px), `md` (768px), `lg` (1024px), `xl` (1280px). Il `Container` usa `max-w-4xl` (896px) con padding `px-4 sm:px-6 lg:px-8`.

### Dark Mode Support
Non implementato. Il sito usa un tema fisso "Warm & Elegant".

### Regole di Contrasto (obbligatorie)

| Sfondo | Testo consentito |
|---|---|
| `bg-background` (#FFEDD7) | `text-text-main`, `text-text-muted`, `text-surface-dark` |
| `bg-surface` (#FFFFFF) | `text-text-main`, `text-text-muted` |
| `bg-text-main` (#080F2C) | `text-text-light`, `text-accent-gold` |
| `bg-surface-dark` (#460112) | ❌ **Non usare come sfondo** |

---

## 8. State Management

### Approach Used
**React Context API** (`src/context/MenuContext.tsx`). Nessuna libreria esterna (no Zustand, no Redux).

### What State is Managed

**Globale (via `MenuContext`):**

| Stato | Tipo | Fonte | Aggiornamento |
|---|---|---|---|
| `sections` | `SezioneRisolta[]` | `useMenuStructure` (filtra `sezioniRisolte`) | Ogni cambio di `activeSlot` o `menuConfig` |
| `availability` | `DisponibilitaResponse \| null` | GCS via `getRealTimeAvailability()` | Polling ogni 5 minuti + fetch immediato all'avvio |
| `status` | `MenuStatus` | `useTimekeeper(generali)` | Tick ogni 30 secondi |
| `activeCategory` | `string \| null` | Stato locale del provider | Click su `SectionCard` / cambio sezioni |
| `menuConfig` | `MenuConfig` | Props del provider (dati statici) | Immutabile a runtime |
| `generali` | `Generali` | Props del provider (dati statici) | Immutabile a runtime |

**Locale (nei componenti):**
- `StickyNav`: `internalActiveSlug` (slug sezione attiva durante lo scroll)
- `useTimekeeper`: `now: Date` (orario corrente, tick ogni 30s)
- `MenuProvider`: `availability`, `activeCategory` (useState locale)

### Provider Scope
`MenuProvider` è presente in **entrambe** le pagine (`HomeIndex` e `CategoryPage`). Ogni pagina ha il proprio provider isolato.

---

## 9. SEO & Meta

### Page Titles and Descriptions
Definiti staticamente nel `RootLayout` (`app/layout.tsx`):
```typescript
export const metadata: Metadata = {
  title: "Vietnamonamour — Menu",
  description: "Scopri il nostro menu: cucina vietnamita autentica a Roma.",
};
```
⚠️ **Titolo e descrizione sono hardcoded** — non vengono letti dal CMS. La descrizione menziona "Roma" ma il ristorante è a Milano.

⚠️ **Nessun metadata dinamico per pagina** — le pagine `/menu/[slug]` non esportano `generateMetadata`, quindi hanno tutte lo stesso titolo del layout root.

### OG Tags
Non implementati. Nessun `openGraph` o `twitter` nella configurazione metadata.

### Sitemap Generation
Non implementata. Nessun file `sitemap.ts` o `sitemap.xml`.

### Robots
Non implementato. Nessun file `robots.ts` o `robots.txt`.

### Language
`<html lang="it">` nel `RootLayout` — corretto.

---

## 10. Environment Variables

| Variabile | Required | Descrizione |
|---|---|---|
| `NEXT_PUBLIC_PAYLOAD_URL` | ✅ | URL base del backend PayloadCMS (senza slash finale). Usata a build-time e lato client. Se mancante, `getStaticMenuData()` lancia eccezione. |
| `NEXT_PUBLIC_MENU_JSON_URL` | ✅ | URL del file JSON di disponibilità su Google Cloud Storage. Usata lato client per il polling. Se mancante, la disponibilità non viene fetchata (tutto mostrato come disponibile). |

Entrambe le variabili sono prefissate `NEXT_PUBLIC_` perché vengono usate anche lato client (browser).

---

## 11. Current Development Status

### Fully Implemented ✅
- Routing a due livelli (Home Indice + pagine dettaglio per sezione)
- `getStaticMenuData()` con fetch parallelo di tutte le collection e globals
- Query Builder (`resolveMenuSection`) con logica Multi-Source Additiva
- Sort e raggruppamento dinamico (`applyOrdinamento`) con priorità array CMS
- Hydration geografica a build-time per vini, birre, liquori, bevande
- `generateStaticParams` per SSG puro
- `useTimekeeper` con logica orari, slot pranzo/cena, eccezioni
- `useMenuStructure` con filtro per slot e `activeDays`
- Polling disponibilità real-time (GCS, ogni 5 minuti)
- `DishCard` polimorfica per tutti i tipi di `MenuItem`
- `MenuFissoCard` per menu a prezzo fisso
- `MenuSection` con rendering gerarchico (gruppi con sottotitoli sticky)
- `LexicalRenderer` per Rich Text Lexical (paragrafi, heading, liste, link)
- `MenuHeader` (brand-only, titolo da CMS)
- `MenuFooter` (nome, testo, annotazione Rich Text, indirizzo, social, copyright)
- Design System completo (Badge, Button, Heading, Text, Container)
- Tema Tailwind v4 CSS-first con palette "Warm & Elegant"
- Font Google (Philosopher + DM Sans) via `next/font`
- Graceful degradation per tutti i globals opzionali
- Fallback UI per errori di build
- Pagina `/design-system` per preview componenti

### Partially Implemented ⚠️
- **`StickyNav`**: implementato ma non usato nelle pagine attuali (solo in `MenuOrchestrator` legacy)
- **`MenuOrchestrator`**: implementato ma non usato (architettura precedente a pagina singola)
- **Disponibilità vini**: il tipo `DisponibilitaResponse` include `vini: Record<string, DisponibilitaItem>` ma `MenuSection` non applica il filtro disponibilità ai vini (solo ai piatti)
- **`messaggioGlobale`** in `DisponibilitaResponse`: campo definito nel tipo ma non renderizzato da nessun componente

### Not Implemented Yet ❌
- SEO dinamico per pagina (`generateMetadata` per `/menu/[slug]`)
- OG tags (`openGraph`, `twitter` in metadata)
- Sitemap (`sitemap.ts`)
- Robots (`robots.txt`)
- Immagini piatti (il campo `immagine` esiste in `Piatto` ma non è renderizzato da `DishCard`)
- Logo ristorante (il campo `logo` esiste in `MenuConfig` e `MenuHeader` non lo usa)
- Banner chiusura/orari in `MenuHeader` (rimosso per pulizia visiva)
- i18n (nessuna internazionalizzazione)
- Test unitari (le funzioni pure `computeTimekeeperState`, `computeMenuStructure`, `filterSezioniRisolte` sono esportate per i test ma non ci sono file di test)
- CI/CD pipeline (nessun file `.github/workflows/` o simile trovato)

### Known Issues / Notes
- ⚠️ `README.md` è il template default di `create-next-app` — non aggiornato per il progetto
- ⚠️ La descrizione SEO hardcoded dice "Roma" ma il ristorante è a Milano
- ⚠️ `StickyNav` usa `bg-surface-dark/95` come sfondo, violando la regola del design system che vieta `bg-surface-dark` come sfondo
- ⚠️ La pagina `/design-system` è inclusa nella build di produzione (non esclusa esplicitamente)
- ⚠️ `MenuOrchestrator` è codice morto (non usato da nessuna pagina)
- ⚠️ Il campo `attiva` in `CategoriaMenu` è deprecato (sostituito da `inLista`) ma mantenuto per retrocompatibilità con dati dummy

---

## 12. Integration Points with PayloadCMS

### Collections Consumed

| Collection | Endpoint | Depth | Filtro | Tipo TS |
|---|---|---|---|---|
| `piatti` | `/api/piatti` | default | `inLista=true` | `Piatto` |
| `vini` | `/api/vini` | 1 | `inLista=true` | `Vino` |
| `menu-fisso` | `/api/menu-fisso` | 2 | `inLista=true` | `MenuFisso` |
| `bevande` | `/api/bevande` | 1 | `inLista=true` | `Bevanda` |
| `birre` | `/api/birre` | 1 | `inLista=true` | `Birra` |
| `liquori` | `/api/liquori` | 1 | `inLista=true` | `Liquore` |
| `allergeni` | `/api/allergeni` | default | nessuno | `Allergene` |
| `nazioni` | `/api/nazioni` | default | nessuno | `Nazione` |
| `regioni` | `/api/regioni` | default | nessuno | `Regione` |
| `zone` | `/api/zone` | default | nessuno | `Zona` |

### Globals Consumed

| Global | Endpoint | Depth | Cache | Tipo TS |
|---|---|---|---|---|
| `menu-config` | `/api/globals/menu-config` | 2 | `revalidate: 3600` | `MenuConfig` |
| `generali` | `/api/globals/generali` | 2 | `revalidate: 3600` | `Generali` |
| `ordinamento-menu` | `/api/globals/ordinamento-menu` | 1 | `no-store` | `OrdinamentoMenu` |

### Field Mapping: Payload Field → Frontend Usage

**`Piatto`:**
| Campo Payload | Uso Frontend |
|---|---|
| `id` | Chiave React, lookup disponibilità |
| `nome` | `DishCard` → `<Heading level={3}>` |
| `prezzo` | `DishCard` → `text-accent-gold` |
| `descrizione` | `DishCard` → `<Text muted>` |
| `categoria` | Query Builder filtro, raggruppamento |
| `allergeni[]` | `DishCard` → `<Badge variant="allergen">` |
| `glutenFree`, `vegan`, `noUovo`, `noLatticini` | `DishCard` → `<Badge variant="highlight">` |
| `inLista` | Filtro fetch (`where[inLista]=true`) |
| `soloMenuFissi` | Non usato nel rendering (filtro lato CMS) |
| `prezzoAlternativo`, `etichettaPrezzoAlternativo` | `DishCard` → prezzo secondario |
| `immagine` | ❌ **Non renderizzato** |

**`Vino`:**
| Campo Payload | Uso Frontend |
|---|---|
| `nome`, `prezzo` | `DishCard` header |
| `descrizione` | `DishCard` body |
| `tipologia` | `DishCard` → `<Badge variant="default">` |
| `cantina`, `anno`, `grado` | `DishCard` → riga info tecnica |
| `capacita`, `certificazione` | `DishCard` → `<Badge variant="default">` |
| `nazione`, `regione`, `zona` | `DishCard` → riga provenienza geografica |
| `prezzoCalice` | `DishCard` → prezzo secondario |

**`MenuConfig`:**
| Campo Payload | Uso Frontend |
|---|---|
| `standardItems[]` | Query Builder, routing, navigazione |
| `title` | `MenuHeader` → titolo (fallback: `nomeRistorante`) |
| `nomeRistorante` | `MenuHeader` fallback, `MenuFooter` |
| `annotazione` | `MenuFooter` → `LexicalRenderer` |
| `testoFooter` | `MenuFooter` → testo plain text |
| `indirizzo`, `telefono` | `MenuFooter` |
| `instagram`, `facebook` | `MenuFooter` → link social |
| `logo` | ❌ **Non renderizzato** |
| `isActive`, `activeRange` | Presenti nel tipo ma non usati nel rendering |
| `messaggioBenvenuto` | Presente nel tipo ma non usato |

**`Generali`:**
| Campo Payload | Uso Frontend |
|---|---|
| `scheduleWeekly[]` | `useTimekeeper` → `isOpen` |
| `lunchSlot`, `dinnerSlot` | `useTimekeeper` → `activeSlot` |
| `exceptions[]` | `useTimekeeper` → `isHoliday`, `closureMessage` |
| `messaggioChiusura` | `useTimekeeper` → `closureMessage` |

### Mismatches and Hardcoded Data Found

1. **Slug non nel backend**: gli slug delle sezioni (`SezioneMenuConfig.slug`) non esistono in Payload — generati a build-time con `slugify(label)`. ⚠️ Se `label` cambia nel CMS, lo slug cambia e i link precedenti diventano 404.

2. **`_type` non nel backend**: il campo discriminante `_type` di `MenuItem` non esiste in Payload — aggiunto a build-time dalle funzioni `piattoToItem`, `vinoToItem`, ecc.

3. **`CategoriaMenu.slug` non nel backend**: generato a build-time con `slugify(nome)`.

4. **Fallback hardcoded** in `api.ts`:
   - `FALLBACK_MENU_CONFIG.nomeRistorante = "Vietnamonamour"` — hardcoded
   - `FALLBACK_GENERALI` con orari Martedì-Domenica 12:00-15:00 e 19:00-23:00 — hardcoded

5. **Descrizione SEO hardcoded** in `app/layout.tsx`: `"Scopri il nostro menu: cucina vietnamita autentica a Roma."` — ⚠️ dice "Roma" ma il ristorante è a Milano.

6. **Titolo SEO hardcoded**: `"Vietnamonamour — Menu"` — non letto da `menuConfig.title`.

---

## 13. Build & Deploy

### Build Command and Output
```bash
pnpm build          # equivale a: next build --webpack
```
⚠️ Il `package.json` definisce `"build": "next build --webpack"` — forza Webpack invece di Turbopack per evitare problemi con `next/font/google` in modalità SSG.

Output: cartella `out/` con HTML/CSS/JS statici.

### Static Export Configuration
```typescript
// next.config.ts
const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,  // richiesto perché l'ottimizzazione immagini richiede server Node.js
  },
};
```

### Firebase Hosting Configuration
```json
// firebase.json
{
  "hosting": {
    "public": "out",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "cleanUrls": true
  }
}
```
`cleanUrls: true` rimuove l'estensione `.html` dagli URL (es. `/menu/i-nostri-vini` invece di `/menu/i-nostri-vini.html`).

### Deploy Command
```bash
firebase deploy
```

### Full Deploy Flow
```
git push → (CI/CD non configurato — deploy manuale)
  pnpm install
  pnpm build --webpack   # Fetcha dati da Payload, genera out/
  firebase deploy        # Carica out/ su Firebase Hosting
```

⚠️ **Nessuna pipeline CI/CD configurata** nel repository (nessun file `.github/workflows/` trovato). Il deploy è manuale.

### Notable next.config Options
- `output: "export"` — SSG puro, nessun server Node.js a runtime
- `images.unoptimized: true` — necessario per static export

---

## 14. Docs vs Code Alignment

| Documented Feature | Docs Location | Code Status | Notes |
|---|---|---|---|
| SSG con `output: 'export'` | `ARCHITECTURE.md`, `GETTING_STARTED.md` | ✅ Confirmed | `next.config.ts` conferma |
| Routing a due livelli (`/` + `/menu/[slug]`) | `CONTEXT.md`, `ARCHITECTURE.md` | ✅ Confirmed | `app/page.tsx` e `app/menu/[slug]/page.tsx` |
| `generateStaticParams` obbligatorio | `ARCHITECTURE.md`, `CONTEXT.md` | ✅ Confirmed | Implementato in `app/menu/[slug]/page.tsx` |
| Slug generati da `slugify(label)` | `ARCHITECTURE.md`, `CONTEXT.md` | ✅ Confirmed | `normalizeStandardItems()` in `api.ts` |
| `MenuItem` unione discriminata con `_type` | `ARCHITECTURE.md`, `CONTEXT.md` | ✅ Confirmed | `src/types/payload-types.ts` |
| `resolveMenuSection` Multi-Source Additiva | `ARCHITECTURE.md`, `CONTEXT.md` | ✅ Confirmed | `src/lib/api.ts` |
| `applyOrdinamento` con priorità array CMS | `ARCHITECTURE.md`, `CONTEXT.md` | ✅ Confirmed | `groupPiattiByCategorie`, `groupByTipologie` in `api.ts` |
| `useTimekeeper` con tick 30s | `CONTEXT.md` | ✅ Confirmed | `TICK_INTERVAL_MS = 30_000` in `useTimekeeper.ts` |
| `useMenuStructure` con filtro `activeDays` prioritario | `ARCHITECTURE.md`, `CONTEXT.md` | ✅ Confirmed | `isSectionVisible()` in `useMenuStructure.ts` |
| Polling disponibilità ogni 5 minuti | `CONTEXT.md`, `ARCHITECTURE.md` | ✅ Confirmed | `AVAILABILITY_POLL_MS = 5 * 60 * 1_000` in `MenuContext.tsx` |
| `fetchGlobalSafe` con fallback su `{}` | `ARCHITECTURE.md`, `CONTEXT.md` | ✅ Confirmed | Controllo `Object.keys(data).length === 0` in `api.ts` |
| Hydration geografica a build-time per vini | `ARCHITECTURE.md` (commento in `api.ts`) | ✅ Confirmed | `hydrateVini()` in `api.ts` |
| `DishCard` polimorfica per tutti i tipi | `ARCHITECTURE.md`, `CONTEXT.md`, `DESIGN_SYSTEM.md` | ✅ Confirmed | Sub-componenti `PiattoBody`, `VinoBody`, ecc. |
| `MenuFissoCard` per menu a prezzo fisso | `CONTEXT.md`, `DESIGN_SYSTEM.md` | ✅ Confirmed | `src/components/menu/MenuFissoCard.tsx` |
| `LexicalRenderer` per annotazione Rich Text | `ARCHITECTURE.md`, `CONTEXT.md` | ✅ Confirmed | `src/components/menu/LexicalRenderer.tsx` |
| `MenuHeader` mostra orari e banner chiusura | `ARCHITECTURE.md` | ❌ Contradicted | `MenuHeader` attuale mostra solo il titolo — orari e banner rimossi |
| `StickyNav` usata nella navigazione | `GETTING_STARTED.md` (struttura cartelle) | ⚠️ Partial | Implementata ma non usata nelle pagine attuali (solo in `MenuOrchestrator` legacy) |
| `MenuOrchestrator` come entry point | `GETTING_STARTED.md` (struttura cartelle) | ❌ Contradicted | Non usato da nessuna pagina — sostituito da `HomeIndex` + `CategoryPage` |
| Sfondo pagina sempre `bg-background` | `DESIGN_SYSTEM.md`, `CONTEXT.md` | ✅ Confirmed | Confermato in tutti i componenti |
| `surface-dark` solo come colore testo | `DESIGN_SYSTEM.md`, `CONTEXT.md` | ⚠️ Partial | Confermato ovunque tranne `StickyNav` che usa `bg-surface-dark/95` |
| Footer usa `bg-text-main` | `DESIGN_SYSTEM.md` | ✅ Confirmed | `MenuFooter` usa `bg-text-main` |
| Nessun `any` TypeScript | `CONTEXT.md`, `ARCHITECTURE.md` | ✅ Confirmed | Nessun `any` trovato nel codice |
| ID Payload numerici (non UUID) | `CONTEXT.md`, `ARCHITECTURE.md` | ✅ Confirmed | Tutti i tipi usano `id: number` |
| Immagini piatti non renderizzate | Non documentato | ⚠️ Partial | Campo `immagine` presente nel tipo `Piatto` ma non renderizzato da `DishCard` |
| Logo ristorante da CMS | `ARCHITECTURE.md` (campo `MenuConfig.logo`) | ⚠️ Partial | Campo `logo` nel tipo e nel CMS ma `MenuHeader` non lo renderizza |
| SEO dinamico per pagina | Non documentato | ❌ Contradicted | Nessun `generateMetadata` nelle pagine dinamiche |
| Descrizione SEO "Roma" | Non documentato | ⚠️ Partial | ⚠️ Bug: la descrizione hardcoded dice "Roma" ma il ristorante è a Milano |
| CI/CD pipeline | `GETTING_STARTED.md` (accenna a "CI/CD") | ❌ Contradicted | Nessuna pipeline configurata nel repository |
| Next.js versione 16 | `ARCHITECTURE.md` | ✅ Confirmed | `package.json`: `"next": "16.1.6"` |
| Tailwind CSS v4 | `ARCHITECTURE.md`, `DESIGN_SYSTEM.md` | ✅ Confirmed | `tailwindcss: "^4"` in `package.json` |
| Firebase Hosting Free Tier | `ARCHITECTURE.md`, `CONTEXT.md` | ✅ Confirmed | `firebase.json` e `.firebaserc` presenti |
