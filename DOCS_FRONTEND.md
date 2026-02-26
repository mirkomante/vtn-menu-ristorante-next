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
├── types/
│   ├── payload-types.ts    # Interfacce che rispecchiano le collection/global di Payload
│   ├── disponibilita.ts    # Interfaccia per il JSON di disponibilità GCS
│   └── index.ts            # Re-export centralizzato
│
├── lib/
│   └── api.ts              # Funzioni di fetching (build-time e client-side)
│
app/
├── layout.tsx              # Root layout (font, metadata globali)
├── page.tsx                # Homepage del menu
└── globals.css             # Stili globali (solo direttiva @import tailwindcss)
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

## Per Agenti AI

### Dove trovare le definizioni dei tipi

- **Tutti i tipi** sono in `src/types/` e re-esportati da `src/types/index.ts`.
- Importa sempre da `@/types` (alias configurato in `tsconfig.json`).
- `payload-types.ts` → strutture dati del CMS (piatti, vini, config, orari).
- `disponibilita.ts` → struttura del file JSON real-time su GCS.

### Come aggiungere una nuova collection

1. Aggiungi l'interfaccia in `src/types/payload-types.ts`.
2. Aggiungi il tipo all'interfaccia `StaticMenuData` se necessario.
3. Aggiungi la chiamata `fetchAllDocs<NuovoTipo>("slug-collection")` in `getStaticMenuData()` dentro `Promise.all`.

### Convenzioni di codice

- TypeScript rigoroso: niente `any`, usa `unknown` se necessario.
- `fetch` nativo, nessuna libreria HTTP esterna.
- Server Components per tutto ciò che è statico; `"use client"` solo dove serve interattività.
- Nomi file: `kebab-case.ts` per utility, `PascalCase.tsx` per componenti.

### Flusso di deploy

```
git push → CI/CD → pnpm build → out/ → firebase deploy
```

La build (`pnpm build`) chiama `getStaticMenuData()` che contatta il backend Payload.
Assicurarsi che `NEXT_PUBLIC_PAYLOAD_URL` sia raggiungibile dall'ambiente CI.
