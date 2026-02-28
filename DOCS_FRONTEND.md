# Documentazione Frontend — Menu Digitale VTN

## Panoramica

Sito statico Next.js 15 (App Router) che funge da menu digitale per il ristorante.
Ospitato su **Firebase Hosting (Free Tier)** come sito completamente statico (SSG).

---

## Architettura

### Stack

| Tecnologia       | Ruolo                                      |
|------------------|--------------------------------------------|
| Next.js 15       | Framework frontend (App Router, SSG)       |
| TypeScript       | Type safety rigorosa                       |
| Tailwind CSS     | Styling utility-first                      |
| PayloadCMS       | Backend CMS (su Google Cloud Run)          |
| Google Cloud Storage | File JSON disponibilità real-time      |
| Firebase Hosting | Hosting sito statico                       |

### Modalità di rendering: Static Export

Il progetto usa `output: 'export'` in `next.config.ts`. Questo significa:

- **Tutti i dati vengono fetchati a build-time** tramite `getStaticMenuData()`.
- L'output è una cartella `out/` con HTML/CSS/JS statici, deployabile su qualsiasi CDN.
- **Non è disponibile SSR né middleware** (limitazione di Firebase Hosting Free Tier).
- Le immagini usano `unoptimized: true` perché l'ottimizzazione immagini di Next.js richiede un server Node.js.

### Strategia di aggiornamento dati

```
Build-time (CI/CD)
  └─ getStaticMenuData()
       ├─ Piatti, Vini, Categorie, Allergeni  ← PayloadCMS REST API
       └─ MenuConfig, Generali (Globals)      ← PayloadCMS REST API

Client-side (browser, polling/on-demand)
  └─ getRealTimeAvailability()
       └─ disponibilita.json                  ← Google Cloud Storage
```

La disponibilità (esaurito/disponibile) è l'unico dato che cambia frequentemente
durante il servizio. Per questo viene fetchata lato client in modo indipendente
dalla build statica.

---

## Variabili d'ambiente

| Variabile                    | Descrizione                                      |
|------------------------------|--------------------------------------------------|
| `NEXT_PUBLIC_PAYLOAD_URL`    | URL base del backend PayloadCMS (senza slash finale) |
| `NEXT_PUBLIC_MENU_JSON_URL`  | URL del file JSON di disponibilità su GCS        |

Entrambe le variabili sono prefissate con `NEXT_PUBLIC_` perché vengono usate
anche lato client (per `getRealTimeAvailability()`).

---

## Struttura del progetto

```
src/
app/
│   └── fonts.ts            # Configurazione font Google (Philosopher + DM Sans)
│
├── types/
│   ├── payload-types.ts    # Interfacce che rispecchiano le collection/global di Payload
│   ├── disponibilita.ts    # Interfaccia per il JSON di disponibilità GCS
│   └── index.ts            # Re-export centralizzato
│
├── lib/
│   └── api.ts              # Funzioni di fetching (build-time e client-side)
│
├── hooks/
│   ├── useTimekeeper.ts    # Logica temporale: apertura, slot, festività
│   └── useMenuStructure.ts # Logica strutturale: sezioni risolte per slot corrente
│
├── context/
│   └── MenuContext.tsx     # Provider globale: incapsula hooks + disponibilità
│
├── components/
│   └── ui/
│       ├── Button.tsx      # Bottone con varianti primary/outline/ghost
│       ├── Typography.tsx  # Heading (Philosopher) e Text (DM Sans)
│       ├── Badge.tsx       # Etichette/tag con varianti
│       ├── Container.tsx   # Wrapper centrato max-w-4xl
│       └── index.ts        # Barrel export
│
app/
├── layout.tsx              # Root layout (font, metadata, classi base body)
├── page.tsx                # Homepage del menu
└── globals.css             # Tema Tailwind v4 (@theme) + reset CSS
```

---

## Definizione dei tipi dati

### Collection PayloadCMS

| Tipo TypeScript  | Collection Payload  | Descrizione                          |
|------------------|---------------------|--------------------------------------|
| `Piatto`         | `piatti`            | Piatti del menu (cibo e bevande)     |
| `Vino`           | `vini`              | Carta dei vini                       |
| `CategoriaMenu`  | `categorie-menu`    | Categorie di raggruppamento piatti   |
| `Allergene`      | `allergeni`         | Allergeni EU (14 allergeni standard) |

### Global PayloadCMS

| Tipo TypeScript | Global Slug    | Descrizione                               |
|-----------------|----------------|-------------------------------------------|
| `MenuConfig`    | `menu-config`  | Configurazione estetica e funzionale      |
| `Generali`      | `generali`     | Orari di apertura ed eccezioni            |

### File GCS

| Tipo TypeScript         | File                  | Descrizione                          |
|-------------------------|-----------------------|--------------------------------------|
| `DisponibilitaResponse` | `disponibilita.json`  | Stato real-time di piatti e vini     |

---

## API di fetching

### `getStaticMenuData()` — Build-time

```typescript
import { getStaticMenuData } from "@/lib/api";

// In un Server Component o generateStaticParams
const data = await getStaticMenuData();
// data: StaticMenuData { piatti, vini, categorie, allergeni, menuConfig, generali }
```

- Esegue tutte le richieste in **parallelo** con `Promise.all`.
- Recupera solo documenti con `attivo: true` per piatti/vini/categorie.
- Gestisce la **paginazione** automaticamente (fino a 100 doc per pagina).
- **Lancia un'eccezione** in caso di errore → la build fallisce esplicitamente.

### `getRealTimeAvailability()` — Client-side

```typescript
import { getRealTimeAvailability } from "@/lib/api";

// In un Client Component (useEffect, SWR, React Query, ecc.)
const disponibilita = await getRealTimeAvailability();
// disponibilita: DisponibilitaResponse | null
```

- Usa `cache: 'no-store'` per ottenere sempre i dati più freschi.
- **Non lancia eccezioni**: restituisce `null` in caso di errore di rete.
- Il chiamante deve gestire il caso `null` (es. mostrare tutto come disponibile).

---

## Design System — "Warm & Elegant"

### Filosofia

Il brand **Vietnamonamour** usa un mood caldo ed elegante: sfondo crema, testi blu notte profondi, accenti oro e arancio bruciato. Il sistema privilegia lo **stile Minimal**: i contenuti poggiano direttamente sullo sfondo crema, separati da bordi sottili arancioni. Le card bianche sono riservate a contesti specifici (es. modal, form).

### 1. Palette Colori (Warm Theme)

> Tailwind v4 — configurazione CSS-first in `app/globals.css` via `@theme`.
> Non esiste `tailwind.config.ts`: i token sono definiti come `--color-*` nel blocco `@theme`.

| Token            | Classe Tailwind       | HEX / RGBA              | Uso                                        |
|------------------|-----------------------|-------------------------|--------------------------------------------|
| `background`     | `bg-background`       | `#FFEDD7`               | Sfondo pagina — **sempre questo, mai white** |
| `surface`        | `bg-surface`          | `#FFFFFF`               | Solo per modal, form, elementi sovrapposti |
| `surface-dark`   | `bg-surface-dark`     | `#460112`               | Footer, header scuro, sezioni bordeaux     |
| `text-main`      | `text-text-main`      | `#080F2C`               | Testo principale (blu notte profondo)      |
| `text-light`     | `text-text-light`     | `#FFEDD7`               | Testo su sfondi scuri                      |
| `text-muted`     | `text-text-muted`     | `rgba(8,15,44,0.7)`     | Descrizioni, note secondarie               |
| `accent-gold`    | `text-accent-gold`    | `#F8B624`               | Prezzi, icone, link, separatori premium    |
| `accent-orange`  | `bg-accent-orange`    | `#EF5808`               | Badge, separatori tra piatti               |

### 2. Tipografia

| Ruolo   | Font        | Classe Tailwind | Pesi caricati      | Uso                                  |
|---------|-------------|-----------------|---------------------|--------------------------------------|
| Titoli  | Philosopher | `font-serif`    | 400, 700            | Nomi piatti, titoli sezione, heading |
| Testi   | DM Sans     | `font-sans`     | 300, 400, 500, 600, 700 | Descrizioni, prezzi, UI, nav     |

Font caricati via `next/font/google` in `app/fonts.ts`, iniettati come variabili CSS (`--font-philosopher`, `--font-dm-sans`) nel `<body>` dal `RootLayout`.

### 3. Componenti Core

#### Atomi — importabili da `@/components/ui`

```tsx
import { Button, Heading, Text, Badge, Container } from "@/components/ui";
```

**`<Button>`** — rettangolare, padding ridotto (`py-1`, `py-1.5`, `py-2` per sm/md/lg):

```tsx
<Button variant="primary">Ordina</Button>         // Blu Notte → Crema
<Button variant="outline">Vedi dettagli</Button>  // Bordo Blu Notte
<Button variant="ghost" size="sm">Chiudi</Button> // Solo testo
```

**`<Heading>`** — sempre Philosopher, mai `font-serif` direttamente su HTML grezzo:

```tsx
<Heading level={2}>Antipasti</Heading>             // h2, text-main
<Heading level={3} color="bordeaux">Phở Bò</Heading> // h3, surface-dark
```

**`<Text>`** — sempre DM Sans, mai `font-sans` direttamente su HTML grezzo:

```tsx
<Text variant="body" muted>Brodo di manzo 12 ore</Text>  // descrizione piatto
<Text variant="body" className="text-accent-gold font-semibold">€ 14,00</Text> // prezzo
```

**`<Badge>`**:

```tsx
<Badge variant="default">Vegano</Badge>           // Blu Notte
<Badge variant="highlight">Chef consiglia</Badge> // Arancione Bruciato
<Badge variant="gold">Signature</Badge>           // Oro
<Badge variant="outline">Contiene glutine</Badge> // Bordo
```

**`<Container>`**:

```tsx
<Container as="section">       // max-w-4xl, centrato, padding responsive
<Container padding="tight">    // padding fisso px-4
<Container padding="none">     // nessun padding
```

#### Pattern — DishCard (Stile Minimal — **stile di default**)

Il pattern scelto per la lista piatti è **Minimal**: nessun sfondo, separatore inferiore arancio.

```tsx
<div className="border-b-2 border-accent-orange/30 py-4">
  <div className="flex items-start justify-between gap-4">
    <Heading level={3}>Phở Bò</Heading>
    <Text variant="body" className="shrink-0 font-semibold text-accent-gold">€ 14</Text>
  </div>
  <Text variant="body" muted>Descrizione del piatto...</Text>
  <div className="mt-3 flex flex-wrap gap-1.5">
    <Badge variant="highlight">Chef consiglia</Badge>
    <Badge variant="outline">Contiene glutine</Badge>
  </div>
</div>
```

> **Perché Minimal e non Card?** Il bianco su crema crea un contrasto di sfondo che appesantisce visivamente la pagina. Il Minimal mantiene il ritmo visivo fluido e valorizza la tipografia Philosopher.

---

## Logica Client-Side (Fase 2)

### `useTimekeeper` — Il Tempo

**File:** `src/hooks/useTimekeeper.ts`

Aggiorna lo stato ogni 30 secondi leggendo `new Date()` dal browser. Accetta i dati `Generali` (orari settimanali + eccezioni) e restituisce:

| Campo           | Tipo           | Descrizione                                          |
|-----------------|----------------|------------------------------------------------------|
| `now`           | `Date`         | Orario corrente del browser                          |
| `isOpen`        | `boolean`      | Il ristorante è fisicamente aperto ora?              |
| `activeSlot`    | `ActiveSlot`   | `'lunch'` / `'dinner'` / `null`                      |
| `isHoliday`     | `boolean`      | Oggi è un giorno di eccezione nel calendario?        |
| `closureMessage`| `string\|null` | Testo da mostrare quando chiuso                      |

**Algoritmo di risoluzione:**

1. Controlla se la data odierna (`YYYY-MM-DD` locale) corrisponde a un'`EccezioneOrario`.
   - Se `chiuso: true` → restituisce `isOpen: false`, `isHoliday: true`.
   - Se ha fasce speciali → usa quelle al posto degli orari settimanali.
2. Se nessuna eccezione, cerca l'`OrarioGiorno` per il giorno della settimana corrente.
   - Se `aperto: false` o non trovato → `isOpen: false`.
3. Verifica se l'orario corrente (minuti dalla mezzanotte) cade in una `FasciaOraria`.
   - Supporta fasce notturne che scavalcano la mezzanotte (es. 22:00–02:00).
4. Determina lo slot: prima fascia del giorno = `'lunch'`, seconda = `'dinner'`. Se una sola fascia → sempre `'dinner'`.

La funzione pura `computeTimekeeperState(now, generali)` è separata dall'hook per facilitare i test unitari.

---

### `useMenuStructure` — La Struttura

**File:** `src/hooks/useMenuStructure.ts`

Trasforma `MenuConfig.sezioni` (configurazione CMS) in `SezioneRisolta[]` (dati pronti per il rendering). Si ricalcola solo quando cambia `activeSlot`, `menuConfig`, `piatti` o `vini`.

**Algoritmo per ogni sezione:**

1. **Filtro visibilità:** se `visibility === 'lunch'` e `activeSlot !== 'lunch'`, la sezione è esclusa (e viceversa per `'dinner'`). `'always'` è sempre visibile.
2. **Rilevamento periodo speciale:** confronta la data odierna con `specialPeriod.dal/al`.
3. **Popolamento piatti:**
   - Se nel periodo speciale e `specialItems` è definito → usa la lista esplicita (singoli piatti/vini referenziati).
   - Altrimenti → filtra tutti i piatti per `categoria` (usando un indice `Map` per O(1) lookup).
4. **Ordinamento:** piatti e vini ordinati per campo `ordine`; sezioni ordinate per `ordine` della config.

La funzione pura `computeMenuStructure(input)` è separata dall'hook per i test.

---

### `MenuContext` / `MenuProvider` — Lo Stato Globale

**File:** `src/context/MenuContext.tsx`

Provider React che incapsula tutta la logica client-side. Va montato nel layout attorno alla parte di menu.

```tsx
// app/layout.tsx (o app/page.tsx)
import { MenuProvider } from "@/context/MenuContext";

<MenuProvider menuConfig={...} generali={...} piatti={...} vini={...}>
  {children}
</MenuProvider>
```

**Espone via `useMenu()`:**

| Campo               | Tipo                        | Descrizione                                         |
|---------------------|-----------------------------|-----------------------------------------------------|
| `sections`          | `SezioneRisolta[]`          | Sezioni visibili per lo slot corrente               |
| `availability`      | `DisponibilitaResponse\|null` | Mappa disponibilità da GCS (aggiornata ogni 5 min) |
| `status`            | `MenuStatus`                | `{ isOpen, activeSlot, isHoliday, closureMessage }` |
| `activeCategory`    | `string\|null`              | Slug della sezione visualizzata (navigazione)       |
| `setActiveCategory` | `(slug) => void`            | Cambia sezione visibile (routing logico)            |
| `refreshAvailability` | `() => Promise<void>`     | Forza refresh immediato del JSON GCS                |
| `menuConfig`        | `MenuConfig`                | Config grezza per accesso diretto                   |

**Polling disponibilità:** fetch immediato all'avvio + ogni 5 minuti. In caso di errore di rete, `availability` rimane al valore precedente (graceful degradation: tutto mostrato come disponibile).

**Navigazione logica:** `activeCategory` è uno stato React. I componenti di navigazione chiamano `setActiveCategory(slug)` per cambiare la sezione visibile senza alcun cambio di URL o ricaricamento pagina.

---

## Per Agenti AI

### Dove trovare le definizioni dei tipi

- **Tutti i tipi** sono in `src/types/` e re-esportati da `src/types/index.ts`.
- Importa sempre da `@/types` (alias configurato in `tsconfig.json`).
- `payload-types.ts` → strutture dati del CMS (piatti, vini, config, orari, sezioni).
- `disponibilita.ts` → struttura del file JSON real-time su GCS.
- Tipi derivati dagli hook (`ActiveSlot`, `SezioneRisolta`) sono in `payload-types.ts` nella sezione "Tipi derivati".

### Design System — Regole di coerenza visiva

> **Nota per agenti AI:** Quando crei nuovi componenti, usa **sempre** lo stile Minimal su sfondo Crema. Evita card bianche pesanti (`bg-surface` con `shadow`). Usa i bordi arancioni (`border-b-2 border-accent-orange/30`) per separare i contenuti. Le card bianche sono consentite solo per modal, form e overlay.

**Stile di default per liste di contenuto (piatti, vini):**

```tsx
// ✅ CORRETTO — Minimal su crema
<div className="border-b-2 border-accent-orange/30 py-4">
  <Heading level={3}>Nome Piatto</Heading>
  <Text variant="body" muted>Descrizione</Text>
</div>

// ❌ EVITARE — Card bianca su crema (appesantisce la pagina)
<div className="rounded-md bg-surface p-4 shadow-sm">
  ...
</div>
```

**Tipografia — regole d'oro:**
- Usa **sempre** `<Heading>` (Philosopher) per nomi piatti, titoli sezione, qualsiasi heading.
- Usa **sempre** `<Text>` (DM Sans) per descrizioni, prezzi, note, testi UI.
- Non usare mai `font-serif` o `font-sans` direttamente su HTML grezzo.

**Colori — regole d'oro:**
- Sfondo pagina: sempre `bg-background` (`#FFEDD7`). Non usare `bg-white` o `bg-gray-*`.
- Testo principale: sempre `text-text-main`. Non usare `text-black` o `text-gray-900`.
- Prezzi: sempre `text-accent-gold` con `font-semibold`.
- Separatori tra piatti: `border-b-2 border-accent-orange/30`.
- Sfondo scuro (footer, header): `bg-surface-dark` con `text-text-light`.
- Su sfondo scuro: usa `text-text-light` (crema) o `text-accent-gold` (oro), **mai** `text-text-main`.

**Componenti — mapping semantico:**

| Elemento UI              | Componente / Classe                                      |
|--------------------------|----------------------------------------------------------|
| Nome piatto              | `<Heading level={3}>`                                    |
| Titolo sezione menu      | `<Heading level={2}>`                                    |
| Descrizione piatto       | `<Text variant="body" muted>`                            |
| Prezzo                   | `<Text variant="body" className="text-accent-gold font-semibold">` |
| Separatore tra piatti    | `border-b-2 border-accent-orange/30`                     |
| Tag allergene/dieta      | `<Badge variant="outline">` o `variant="default"`        |
| Badge prominente         | `<Badge variant="highlight">`                            |
| Wrapper sezione          | `<Container as="section">`                               |
| Bottone CTA principale   | `<Button variant="primary">`                             |

**Tailwind v4 — nota critica:**
Non esiste `tailwind.config.ts`. Tutta la configurazione del tema è in `app/globals.css` nel blocco `@theme`. Per aggiungere nuovi token colore o font, modificare solo quel file.

### Logica di Business — Come il sistema decide cosa mostrare

Il sistema usa tre livelli di decisione, eseguiti in sequenza ogni 30 secondi:

```
1. QUANDO siamo?          → useTimekeeper (src/hooks/useTimekeeper.ts)
   └─ Orario browser + Generali → isOpen, activeSlot ('lunch'|'dinner'|null)

2. COSA mostriamo?        → useMenuStructure (src/hooks/useMenuStructure.ts)
   └─ MenuConfig.sezioni + activeSlot → filtra per visibility, risolve piatti

3. COSA è disponibile?    → getRealTimeAvailability (src/lib/api.ts)
   └─ disponibilita.json su GCS → mappa id→stato (polling ogni 5 min)
```

**Regola fondamentale:** se `activeSlot === null` (fuori orario), le sezioni con `visibility: 'lunch'` o `visibility: 'dinner'` vengono nascoste. Solo le sezioni `visibility: 'always'` rimangono visibili (es. carta bevande, carta vini).

**Priorità dei dati per una sezione:**
- Se oggi è nel `specialPeriod` di una sezione → usa `specialItems` (lista esplicita).
- Altrimenti → usa tutti i piatti della `categoria` associata.

**Graceful degradation:**
- Se `getRealTimeAvailability()` fallisce → `availability === null` → il componente mostra tutto come disponibile.
- Se `useTimekeeper` non trova l'orario per oggi → `isOpen: false` (fail-safe: meglio mostrare chiuso che dati errati).

### Come aggiungere una nuova collection

1. Aggiungi l'interfaccia in `src/types/payload-types.ts`.
2. Aggiungi il tipo all'interfaccia `StaticMenuData` se necessario.
3. Aggiungi la chiamata `fetchAllDocs<NuovoTipo>("slug-collection")` in `getStaticMenuData()` dentro `Promise.all`.

### Come aggiungere una nuova sezione al menu

Le sezioni sono configurate nel CMS (Global `menu-config`, campo `sezioni`). Non richiedono modifiche al codice frontend, solo configurazione nel backend Payload. Il campo `visibility` controlla quando la sezione è visibile.

### Convenzioni di codice

- TypeScript rigoroso: niente `any`, usa `unknown` se necessario.
- `fetch` nativo, nessuna libreria HTTP esterna (niente moment.js, date-fns, ecc.).
- Server Components per tutto ciò che è statico; `"use client"` solo dove serve interattività.
- Nomi file: `kebab-case.ts` per utility/hooks, `PascalCase.tsx` per componenti e context.
- Le funzioni pure (es. `computeTimekeeperState`, `computeMenuStructure`) sono esportate separatamente dall'hook per facilitare i test unitari.

### Flusso di deploy

```
git push → CI/CD → pnpm build → out/ → firebase deploy
```

La build (`pnpm build`) chiama `getStaticMenuData()` che contatta il backend Payload.
Assicurarsi che `NEXT_PUBLIC_PAYLOAD_URL` sia raggiungibile dall'ambiente CI.
