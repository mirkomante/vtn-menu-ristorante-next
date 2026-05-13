# vtn-menu-ristorante-next

Menu digitale statico per il ristorante **Vietnamonamour** (Milano).

Il cliente scansiona un QR code e visualizza il menu aggiornato in tempo reale sul proprio telefono. Il sito è completamente statico (SSG) e deployato su Firebase Hosting.

---

## Stack

| Tecnologia | Versione |
|---|---|
| Next.js | 16.1.6 (App Router, `output: 'export'`) |
| React | 19.2.3 |
| TypeScript | ^5 (strict mode) |
| Tailwind CSS | ^4 (CSS-first, no `tailwind.config.ts`) |
| Firebase Hosting | Free Tier |

---

## Quick Start

```bash
# Installazione
pnpm install

# Variabili d'ambiente (creare .env.local)
NEXT_PUBLIC_PAYLOAD_URL=https://vtn-backend-payload-203473363873.europe-west1.run.app
NEXT_PUBLIC_MENU_JSON_URL=https://storage.googleapis.com/vtn-menu-frontend/disponibilita.json

# Dev server
pnpm dev

# Build statica → cartella out/
pnpm build

# Deploy su Firebase
firebase deploy
```

---

## Documentazione

| File | Contenuto |
|---|---|
| [`KB_FRONTEND_MENU.md`](./KB_FRONTEND_MENU.md) | Knowledge Base completa — fonte di verità principale |
| [`docs/ARCHITETTURA.md`](./docs/ARCHITETTURA.md) | SSG flow, data fetching, Query Builder, GCS polling |
| [`docs/SVILUPPO.md`](./docs/SVILUPPO.md) | Setup locale, comandi pnpm, variabili d'ambiente, deploy |
| [`docs/STATO.md`](./docs/STATO.md) | Stato attuale per area, debiti tecnici con priorità |
| [`docs/DESIGN_SYSTEM.md`](./docs/DESIGN_SYSTEM.md) | Token colori verificati, componenti UI, regole di contrasto |
| [`docs/ai/CONTEXT.md`](./docs/ai/CONTEXT.md) | Contesto per agenti AI — regole di codice, struttura dati |
| [`docs/dev/ARCHITECTURE.md`](./docs/dev/ARCHITECTURE.md) | Architettura dettagliata (legacy, mantenuto) |
| [`docs/dev/DESIGN_SYSTEM.md`](./docs/dev/DESIGN_SYSTEM.md) | Design system dettagliato (legacy, mantenuto) |
| [`docs/dev/GETTING_STARTED.md`](./docs/dev/GETTING_STARTED.md) | Getting started (legacy, mantenuto) |

### Artefatti di riferimento design
- [`docs/design-system.html`](./docs/design-system.html)
- [`docs/menu-design-system.html`](./docs/menu-design-system.html)
- [`docs/vietnamonamour-home-index_def.html`](./docs/vietnamonamour-home-index_def.html)

---

## Architettura in breve

Il sito usa **SSG puro**: tutte le pagine sono pre-renderizzate a build-time da PayloadCMS. L'unica eccezione è la disponibilità real-time dei piatti, fetchata lato client ogni 5 minuti da Google Cloud Storage.

```
/                    → HomeIndex (indice sezioni cliccabili)
/menu/[slug]         → CategoryPage (lista voci di una sezione)
```

Gli slug delle sezioni non esistono nel backend — vengono generati a build-time con `slugify(label)`.

---

## Debiti tecnici principali

| Priorità | Debito |
|---|---|
| 🔴 Alta | Meta description dice "Roma" invece di "Milano" (`app/layout.tsx`) |
| 🔴 Alta | `messaggioGlobale` non renderizzato nell'UI |
| 🔴 Alta | Disponibilità vini non filtrata in `MenuSection` |
| 🟡 Media | `generateMetadata` mancante per `/menu/[slug]` |
| 🟡 Media | Logo e immagini piatti non renderizzati |

Vedi [`docs/STATO.md`](./docs/STATO.md) per la lista completa.
