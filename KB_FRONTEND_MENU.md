# KB — Frontend Menu (Next.js SSG)

> Aggiornato il 2026-03-29 — audit completo tramite lettura integrale di tutti i file sorgente.
> Versione precedente: 2026-03-08.

---

## 1. Project Overview

### Purpose
Menu digitale statico per il ristorante **Vietnamonamour** (Milano). Il cliente scansiona un QR code e visualizza il menu sul proprio telefono. L'interfaccia è un indice di sezioni cliccabili (`/`) che porta a pagine di dettaglio per categoria (`/menu/[slug]`).

### Tech Stack (verificato da `package.json`)

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
**Firebase Hosting** (Free Tier). La build produce la cartella `out/` con HTML/CSS/JS statici. Deploy tramite `firebase deploy`. Configurato con `cleanUrls: true` in `firebase.json`. Progetto Firebase: `vtn25-475411`.

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
│       └── page.tsx                # Preview Design System (inclusa in produzione ⚠️)
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
│           ├── MenuOrchestrator.tsx  # ⚠️ Codice morto — non usato dalle pagine attuali
│           ├── StickyNav.tsx         # ⚠️ Codice morto — non usato dalle pagine attuali
│           ├── MenuHeader.tsx
│           ├── MenuFooter.tsx
│           ├── MenuFissoCard.tsx
│           ├── LexicalRenderer.tsx
│           └── index.ts
├── docs/                           # Documentazione
│   ├── ARCHITETTURA.md             # SSG flow, data fetching, GCS polling
│   ├── SVILUPPO.md                 # Setup locale, comandi pnpm, env vars
│   ├── STATO.md                    # Stato attuale per area, debiti tecnici
│   ├── DESIGN_SYSTEM.md            # Token verificati e stato implementazione
│   ├── dev/                        # Guide per sviluppatori (legacy)
│   ├── ai/                         # Contesto per agenti AI
│   └── *.html                      # Artefatti di riferimento design
├── public/                         # Asset statici
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
       └─ fetchGlobalSafe("ordinamento-menu", 1, true)
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
- **Purpose**: Indice delle sezioni del menu come card cliccabili.
- **Error handling**: Se `getStaticMenuData()` lancia eccezione, mostra un messaggio di errore inline.

### `/menu/[slug]`
- **File**: `app/menu/[slug]/page.tsx`
- **Rendering**: SSG (Server Component async + `generateStaticParams`)
- **Data fetched**: `getStaticMenuData()` — tutti i dati; la sezione specifica viene cercata in `sezioniRisolte` per slug
- **Components used**: `CategoryPage` (Client Component)
- **Purpose**: Lista delle voci di una sezione virtuale (piatti, vini, bevande, menu fissi).
- **Note**: Gli slug non esistono nel backend — generati a build-time con `slugify(label)`.

### `/design-system`
- **File**: `app/design-system/page.tsx`
- **Rendering**: SSG (Server Component, dati dummy inline)
- **Data fetched**: Nessuna chiamata API
- **Purpose**: Pagina di preview del Design System per sviluppo.
- **⚠️ Nota**: Inclusa nella build di produzione (non esclusa esplicitamente).

---

## 4. Components

### `HomeIndex`
- **File**: `src/components/menu/HomeIndex.tsx`
- **Type**: `"use client"` — Client Component
- **Props**: `staticData: StaticMenuData`
- **Purpose**: Entry point della Home. Inizializza `MenuProvider`, renderizza `IndexContent` con le card sezioni.
- **Child components**: `MenuProvider`, `MenuHeader`, `MenuFooter`, `SectionCard` (locale), `Container`, `Heading`, `Text`

### `CategoryPage`
- **File**: `src/components/menu/CategoryPage.tsx`
- **Type**: `"use client"` — Client Component
- **Props**: `staticData: StaticMenuData`, `sezione: SezioneRisolta`
- **Purpose**: Entry point della pagina dettaglio sezione. Inizializza `MenuProvider`, renderizza `CategoryContent` con `BackButton` sticky e `MenuSection`.

### `DishCard`
- **File**: `src/components/menu/DishCard.tsx`
- **Type**: Server-compatible
- **Props**: `item: MenuItem`, `isAvailable?: boolean`, `className?: string`
- **Purpose**: Smart Component polimorfico per qualsiasi voce del menu. Usa `item._type` per discriminare il body.
- **Note**: Il campo `immagine` di `Piatto` **non è renderizzato** (debito tecnico DT-07).

### `MenuSection`
- **File**: `src/components/menu/MenuSection.tsx`
- **Type**: Server-compatible
- **Props**: `categoria`, `groups?: MenuItemGroup[]`, `menuFissi?: MenuFisso[]`, `availability?: DisponibilitaResponse | null`, `className?: string`
- **Purpose**: Renderizza una sezione del menu con titolo, menu fissi e gruppi di item. Filtra i piatti esauriti/nascosti.
- **Note**: Il filtro disponibilità si applica **solo** a `_type === "piatto"`. I vini non vengono filtrati (debito tecnico DT-03).

### `MenuFissoCard`
- **File**: `src/components/menu/MenuFissoCard.tsx`
- **Type**: Server-compatible
- **Props**: `menu: MenuFisso`, `className?: string`
- **Purpose**: Renderizza un menu a prezzo fisso. Layout: nome + prezzo, descrizione italic, lista piatti inclusi, servizi aggiuntivi (badge).

### `MenuHeader`
- **File**: `src/components/menu/MenuHeader.tsx`
- **Type**: Server-compatible
- **Props**: `menuConfig: MenuConfig`
- **Purpose**: Header brand-only. Mostra `menuConfig.title` se presente, altrimenti `menuConfig.nomeRistorante`. Sfondo `bg-background`.
- **Note**: ⚠️ Il campo `logo` di `MenuConfig` **non è renderizzato** (debito tecnico DT-06). Orari, slot attivo e banner chiusura sono stati rimossi.

### `MenuFooter`
- **File**: `src/components/menu/MenuFooter.tsx`
- **Type**: Server-compatible
- **Props**: `menuConfig: MenuConfig`
- **Purpose**: Footer con nome ristorante, testo footer CMS, annotazione Rich Text Lexical, indirizzo, telefono, link social, copyright.
- **Child components**: `LexicalRenderer`, `Container`
- **Note**: Sfondo `bg-text-main` (Blu Notte).

### `LexicalRenderer`
- **File**: `src/components/menu/LexicalRenderer.tsx`
- **Type**: Server-compatible
- **Props**: `content: LexicalRoot`, `className?: string`
- **Purpose**: Parser leggero per nodi Lexical Rich Text di Payload.
- **Nodi supportati**: paragraph, heading (h1-h6), list (bullet/numerate), link (con `fields.url` e `url` diretto), text (bold, italic, underline, strikethrough).

### `StickyNav`
- **File**: `src/components/menu/StickyNav.tsx`
- **Type**: `"use client"` — Client Component
- **Props**: `categorie: CategoriaMenu[]`, `activeSlug?: string | null`, `onCategoryChange?: (slug: string) => void`
- **Purpose**: Barra di navigazione sticky con `IntersectionObserver`.
- **⚠️ Stato**: **Codice morto** — non usato dalle pagine attuali. Usato solo in `MenuOrchestrator` (anch'esso non usato).
- **⚠️ Bug design system**: usa `bg-surface-dark/95` come sfondo, violando la regola che vieta `bg-surface-dark` come sfondo.

### `MenuOrchestrator`
- **File**: `src/components/menu/MenuOrchestrator.tsx`
- **Type**: `"use client"` — Client Component
- **Props**: `staticData: StaticMenuData`
- **Purpose**: Componente legacy che renderizza tutte le sezioni in un'unica pagina con `StickyNav`.
- **⚠️ Stato**: **Codice morto** — non usato da nessuna pagina attuale.

### Componenti UI

| Componente | File | Props chiave | Note |
|---|---|---|---|
| `Badge` | `src/components/ui/Badge.tsx` | `variant?: "default" \| "highlight" \| "gold" \| "outline" \| "allergen"` | Usato in DishCard, MenuFissoCard |
| `Button` | `src/components/ui/Button.tsx` | `variant?: "primary" \| "outline" \| "ghost"`, `size?`, `loading?` | ⚠️ Usato solo in `/design-system` |
| `Heading` | `src/components/ui/Typography.tsx` | `level?: 1-4`, `color?: "default" \| "bordeaux"`, `as?` | Usato ovunque |
| `Text` | `src/components/ui/Typography.tsx` | `variant?: "lead" \| "body" \| "small" \| "caption"`, `muted?`, `as?` | Usato ovunque |
| `Container` | `src/components/ui/Container.tsx` | `padding?: "default" \| "tight" \| "none"`, `as?` | Usato ovunque |

---

## 5. Data Fetching Layer

### PayloadCMS Base URL Configuration
```
NEXT_PUBLIC_PAYLOAD_URL=https://vtn-backend-payload-203473363873.europe-west1.run.app
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
| `MenuItem` | Unione discriminata | `Piatto \| Vino \| Bevanda \| Birra \| Liquore` con `_type` aggiunto a build-time |
| `MenuItemGroup` | Derivato | `{ title?: string; items: MenuItem[] }` — unità di rendering gerarchico |
| `SezioneRisolta` | Derivato | Output del Query Builder: `{ slug, titolo, groups, menuFissi, isSpecialPeriod }` |
| `StaticMenuData` | Aggregato | Tutti i dati necessari per la build |
| `MenuConfig` | Global | Configurazione sezioni, logo, titolo, annotazione, social, orari |
| `Generali` | Global | Orari settimanali, slot pranzo/cena, eccezioni |
| `OrdinamentoMenu` | Global | Sort e raggruppamento per collection (campi flat con prefisso) |

**File**: `src/types/disponibilita.ts`

| Tipo | Descrizione |
|---|---|
| `StatoDisponibilita` | `"disponibile" \| "esaurito" \| "nascosto"` |
| `DisponibilitaItem` | `{ id, stato, nota? }` |
| `DisponibilitaResponse` | `{ aggiornatoAl, piatti: Record<string, DisponibilitaItem>, vini: Record<string, DisponibilitaItem>, messaggioGlobale? }` |

---

## 7. Styling System

### Framework/Library
**Tailwind CSS v4** con configurazione CSS-first. Non esiste `tailwind.config.ts`. Tutti i token del tema sono definiti in `app/globals.css` nel blocco `@theme`.

### Theme Tokens (verificati da `app/globals.css`)

**Colori:**

| Token | Classe Tailwind | HEX / RGBA | Uso |
|---|---|---|---|
| `background` | `bg-background` | `#ffedd7` | Sfondo pagina — sempre questo |
| `surface` | `bg-surface` | `#ffffff` | Solo modal, form, overlay |
| `surface-dark` | `text-surface-dark` | `#460112` | **Solo come colore testo** su sfondi chiari |
| `text-main` | `text-text-main` | `#080f2c` | Testo principale (Blu Notte) |
| `text-light` | `text-text-light` | `#ffedd7` | Testo su sfondi scuri |
| `text-muted` | `text-text-muted` | `rgba(8,15,44,0.7)` | Testi secondari |
| `accent-gold` | `text-accent-gold` | `#f8b624` | Prezzi, icone, link |
| `accent-orange` | `bg-accent-orange` | `#ef5808` | Badge highlight, dettagli |

**Tipografia:**

| Ruolo | Font | Classe Tailwind | Pesi |
|---|---|---|---|
| Titoli | Philosopher | `font-serif` | 400, 700 |
| Testi | DM Sans | `font-sans` | 300–700 |

Font caricati via `next/font/google` in `app/fonts.ts`, iniettati come variabili CSS (`--font-philosopher`, `--font-dm-sans`).

### Dark Mode Support
**Non implementata.** Il sito usa un tema fisso "Warm & Elegant". Nessun toggle `data-theme`, nessun `localStorage`.

---

## 8. State Management

### Approach Used
**React Context API** (`src/context/MenuContext.tsx`). Nessuna libreria esterna.

### What State is Managed

| Stato | Tipo | Fonte | Aggiornamento |
|---|---|---|---|
| `sections` | `SezioneRisolta[]` | `useMenuStructure` (filtra `sezioniRisolte`) | Ogni cambio di `activeSlot` o `menuConfig` |
| `availability` | `DisponibilitaResponse \| null` | GCS via `getRealTimeAvailability()` | Polling ogni 5 minuti + fetch immediato all'avvio |
| `status` | `MenuStatus` | `useTimekeeper(generali)` | Tick ogni 30 secondi |
| `activeCategory` | `string \| null` | Stato locale del provider | Click su `SectionCard` / cambio sezioni |
| `menuConfig` | `MenuConfig` | Props del provider (dati statici) | Immutabile a runtime |
| `generali` | `Generali` | Props del provider (dati statici) | Immutabile a runtime |

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
⚠️ **Bug**: La descrizione menziona "Roma" ma il ristorante è a **Milano** (debito tecnico DT-01).
⚠️ **Titolo hardcoded** — non letto da `menuConfig.title` (debito tecnico DT-18).
⚠️ **Nessun metadata dinamico per pagina** — le pagine `/menu/[slug]` non esportano `generateMetadata` (debito tecnico DT-04).

### OG Tags
Non implementati (debito tecnico DT-05).

### Sitemap / Robots
Non implementati (debiti tecnici DT-11, DT-12).

### Language
`<html lang="it">` nel `RootLayout` — corretto.

---

## 10. Environment Variables

| Variabile | Required | Descrizione |
|---|---|---|
| `NEXT_PUBLIC_PAYLOAD_URL` | ✅ | URL base del backend PayloadCMS (senza slash finale). Se mancante, build fallisce. |
| `NEXT_PUBLIC_MENU_JSON_URL` | ✅ | URL del file JSON di disponibilità su GCS. Se mancante, disponibilità non fetchata. |

---

## 11. Current Development Status

### Fully Implemented ✅
- Routing a due livelli (Home Indice + pagine dettaglio per sezione)
- `getStaticMenuData()` con fetch parallelo di tutte le collection e globals
- Query Builder (`resolveMenuSection`) con logica Multi-Source Additiva
- Sort e raggruppamento dinamico (`applyOrdinamento`) con priorità array CMS
- Hydration geografica a build-time per vini, birre, liquori, bevande
- `generateStaticParams` per SSG puro
- `useTimekeeper` con logica orari, slot pranzo/cena, eccezioni (`TICK_INTERVAL_MS = 30_000`)
- `useMenuStructure` con filtro per slot e `activeDays`
- Polling disponibilità real-time (GCS, ogni 5 minuti)
- `DishCard` polimorfica per tutti i tipi di `MenuItem`
- `MenuFissoCard` per menu a prezzo fisso
- `MenuSection` con rendering gerarchico (gruppi con sottotitoli sticky)
- `LexicalRenderer` per Rich Text Lexical (paragrafi, heading, liste, link, formattazione inline)
- `MenuHeader` (brand-only, titolo da CMS)
- `MenuFooter` (nome, testo, annotazione Rich Text, indirizzo, social, copyright)
- Design System completo (Badge, Button, Heading, Text, Container)
- Tema Tailwind v4 CSS-first con palette "Warm & Elegant" — tutti i token verificati e corretti
- Font Google (Philosopher + DM Sans) via `next/font`
- Graceful degradation per tutti i globals opzionali
- Fallback UI per errori di build
- Firebase Hosting configurato correttamente

### Partially Implemented ⚠️
- **`StickyNav`**: implementato ma non usato nelle pagine attuali (codice morto)
- **`MenuOrchestrator`**: implementato ma non usato (architettura legacy)
- **Disponibilità vini**: il tipo `DisponibilitaResponse` include `vini` ma `MenuSection` non applica il filtro ai vini
- **`messaggioGlobale`**: campo definito nel tipo ma non renderizzato da nessun componente
- **SEO**: meta description presente ma con bug (Roma vs Milano)

### Not Implemented Yet ❌
- Dark mode (toggle `data-theme`, `localStorage`)
- SEO dinamico per pagina (`generateMetadata` per `/menu/[slug]`)
- OG tags (`openGraph`, `twitter` in metadata)
- Sitemap (`sitemap.ts`)
- Robots (`robots.txt`)
- Immagini piatti (il campo `immagine` esiste in `Piatto` ma non è renderizzato da `DishCard`)
- Logo ristorante (il campo `logo` esiste in `MenuConfig` ma `MenuHeader` non lo usa)
- Banner chiusura/orari in `MenuHeader` (rimosso per pulizia visiva)
- i18n
- Test unitari
- CI/CD pipeline

### Known Issues
- ⚠️ `README.md` è il template default di `create-next-app` — non aggiornato per il progetto
- ⚠️ La descrizione SEO hardcoded dice "Roma" ma il ristorante è a Milano
- ⚠️ `StickyNav` usa `bg-surface-dark/95` come sfondo, violando la regola del design system
- ⚠️ La pagina `/design-system` è inclusa nella build di produzione
- ⚠️ `MenuOrchestrator` e `StickyNav` sono codice morto
- ⚠️ `Button` non è usato in nessun componente di dominio attivo

---

## 12. Integration Points with PayloadCMS

### Collections Consumed

| Collection | Endpoint | Depth | Filtro | Tipo TS |
|---|---|---|---|---|
| `piatti` | `/api/piatti` | — | `inLista=true` | `Piatto` |
| `vini` | `/api/vini` | 1 | `inLista=true` | `Vino` |
| `menu-fisso` | `/api/menu-fisso` | 2 | `inLista=true` | `MenuFisso` |
| `bevande` | `/api/bevande` | 1 | `inLista=true` | `Bevanda` |
| `birre` | `/api/birre` | 1 | `inLista=true` | `Birra` |
| `liquori` | `/api/liquori` | 1 | `inLista=true` | `Liquore` |
| `allergeni` | `/api/allergeni` | — | nessuno | `Allergene` |
| `nazioni` | `/api/nazioni` | — | nessuno | `Nazione` |
| `regioni` | `/api/regioni` | — | nessuno | `Regione` |
| `zone` | `/api/zone` | — | nessuno | `Zona` |

### Globals Consumed

| Global | Endpoint | Depth | Cache | Tipo TS |
|---|---|---|---|---|
| `menu-config` | `/api/globals/menu-config` | 2 | `revalidate: 3600` | `MenuConfig` |
| `generali` | `/api/globals/generali` | 2 | `revalidate: 3600` | `Generali` |
| `ordinamento-menu` | `/api/globals/ordinamento-menu` | 1 | `no-store` | `OrdinamentoMenu` |

### Mismatches and Hardcoded Data

1. **Slug non nel backend**: gli slug delle sezioni non esistono in Payload — generati a build-time con `slugify(label)`. Se `label` cambia nel CMS, i link precedenti diventano 404.
2. **`_type` non nel backend**: il campo discriminante `_type` di `MenuItem` non esiste in Payload — aggiunto a build-time.
3. **`CategoriaMenu.slug` non nel backend**: generato a build-time con `slugify(nome)`.
4. **Fallback hardcoded** in `api.ts`: `FALLBACK_MENU_CONFIG.nomeRistorante = "Vietnamonamour"`, `FALLBACK_GENERALI` con orari Martedì-Domenica.
5. **Descrizione SEO hardcoded**: dice "Roma" ma il ristorante è a Milano.
6. **Titolo SEO hardcoded**: `"Vietnamonamour — Menu"` — non letto da `menuConfig.title`.

---

## 13. Build & Deploy

### Build Command and Output
```bash
pnpm build          # equivale a: next build --webpack
```
Output: cartella `out/` con HTML/CSS/JS statici.

### Static Export Configuration (verificato da `next.config.ts`)
```typescript
const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
};
```

### Firebase Hosting Configuration (verificato da `firebase.json` e `.firebaserc`)
```json
{
  "hosting": {
    "public": "out",
    "cleanUrls": true
  }
}
```
Progetto Firebase: `vtn25-475411`.

### Deploy Command
```bash
firebase deploy
```

### Full Deploy Flow
```
git push → (CI/CD non configurato — deploy manuale)
  pnpm install
  pnpm build          # Fetcha dati da Payload, genera out/
  firebase deploy     # Carica out/ su Firebase Hosting
```

⚠️ **Nessuna pipeline CI/CD configurata.** Il deploy è manuale.

---

## 14. Docs vs Code Alignment (audit 2026-03-29)

| Documented Feature | Code Status | Notes |
|---|---|---|
| SSG con `output: 'export'` | ✅ Confirmed | `next.config.ts` conferma |
| Routing a due livelli | ✅ Confirmed | Confermato |
| `generateStaticParams` obbligatorio | ✅ Confirmed | Implementato correttamente |
| Slug generati da `slugify(label)` | ✅ Confirmed | `normalizeStandardItems()` in `api.ts` |
| `MenuItem` unione discriminata con `_type` | ✅ Confirmed | `src/types/payload-types.ts` |
| `resolveMenuSection` Multi-Source Additiva | ✅ Confirmed | `src/lib/api.ts` |
| `applyOrdinamento` con priorità array CMS | ✅ Confirmed | `groupPiattiByCategorie`, `groupByTipologie` in `api.ts` |
| `useTimekeeper` con tick 30s | ✅ Confirmed | `TICK_INTERVAL_MS = 30_000` |
| Polling disponibilità ogni 5 minuti | ✅ Confirmed | `AVAILABILITY_POLL_MS = 5 * 60 * 1_000` |
| Tutti i token Tailwind v4 corretti | ✅ Confirmed | Verificati da `app/globals.css` |
| Font Philosopher + DM Sans via `next/font` | ✅ Confirmed | `app/fonts.ts` |
| `MenuHeader` mostra orari e banner chiusura | ❌ Contradicted | `MenuHeader` attuale mostra solo il titolo |
| `StickyNav` usata nella navigazione | ❌ Contradicted | Non usata nelle pagine attuali |
| `MenuOrchestrator` come entry point | ❌ Contradicted | Non usato da nessuna pagina |
| Dark mode implementata | ❌ Contradicted | Non implementata |
| Meta description corretta | ❌ Contradicted | Dice "Roma" invece di "Milano" |
| CI/CD pipeline configurata | ❌ Contradicted | Nessuna pipeline trovata |
| Immagini piatti renderizzate | ❌ Contradicted | Campo `immagine` non renderizzato |
| Logo ristorante renderizzato | ❌ Contradicted | Campo `logo` non renderizzato |
| `messaggioGlobale` renderizzato | ❌ Contradicted | Campo definito ma non usato nell'UI |
| Disponibilità vini filtrata | ❌ Contradicted | Solo piatti vengono filtrati |

---

## 15. Debiti Tecnici (riepilogo)

| # | Priorità | Debito | File |
|---|---|---|---|
| DT-01 | 🔴 Alta | Meta description dice "Roma" invece di "Milano" | `app/layout.tsx` |
| DT-02 | 🔴 Alta | `messaggioGlobale` non renderizzato | `MenuContext.tsx`, nessun componente |
| DT-03 | 🔴 Alta | Disponibilità vini non filtrata in `MenuSection` | `MenuSection.tsx` |
| DT-04 | 🟡 Media | `generateMetadata` mancante per `/menu/[slug]` | `app/menu/[slug]/page.tsx` |
| DT-05 | 🟡 Media | OG tags non implementati | `app/layout.tsx` |
| DT-06 | 🟡 Media | Logo ristorante non renderizzato | `MenuHeader.tsx` |
| DT-07 | 🟡 Media | Immagini piatti non renderizzate | `DishCard.tsx` |
| DT-08 | 🟡 Media | `MenuOrchestrator` e `StickyNav` sono codice morto | `MenuOrchestrator.tsx`, `StickyNav.tsx` |
| DT-09 | 🟡 Media | `Button` usato solo in `/design-system` | `Button.tsx` |
| DT-10 | 🟡 Media | Pagina `/design-system` inclusa in produzione | `app/design-system/page.tsx` |
| DT-11 | 🟢 Bassa | Sitemap non implementata | da creare |
| DT-12 | 🟢 Bassa | `robots.txt` non implementato | da creare |
| DT-13 | 🟢 Bassa | Nessuna pipeline CI/CD | da creare |
| DT-14 | 🟢 Bassa | Nessun test unitario | da creare |
| DT-15 | 🟢 Bassa | `README.md` è il template default | `README.md` |
| DT-16 | 🟢 Bassa | `StickyNav` usa `bg-surface-dark/95` (viola design system) | `StickyNav.tsx` |
| DT-17 | 🟢 Bassa | Slug da `slugify(label)` — cambio label → 404 | `api.ts` |
| DT-18 | 🟢 Bassa | Titolo SEO hardcoded | `app/layout.tsx` |
