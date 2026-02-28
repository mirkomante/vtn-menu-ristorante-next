# Getting Started — Menu Digitale VTN

## Prerequisiti

- Node.js 20+
- pnpm 9+
- Accesso al backend PayloadCMS (URL in `.env.local`)

## Installazione

```bash
git clone <repo>
cd vtn-menu-ristorante-next
pnpm install
```

## Variabili d'ambiente

Crea un file `.env.local` nella root del progetto:

```env
# URL base del backend PayloadCMS (senza slash finale)
NEXT_PUBLIC_PAYLOAD_URL=https://vtn-backend-payload-203473363873.europe-west1.run.app

# URL del file JSON di disponibilità su Google Cloud Storage
NEXT_PUBLIC_MENU_JSON_URL=https://storage.googleapis.com/vtn-menu-frontend/disponibilita.json
```

Entrambe le variabili sono prefissate `NEXT_PUBLIC_` perché vengono usate anche lato client (per il polling della disponibilità real-time).

## Comandi principali

| Comando | Descrizione |
|---|---|
| `pnpm dev` | Avvia il dev server (porta 3000 di default) |
| `pnpm build --webpack` | Build statica SSG → cartella `out/` |
| `pnpm start` | Serve la build locale (non usato in produzione) |
| `firebase deploy` | Deploy su Firebase Hosting dalla cartella `out/` |

> **Nota:** usa sempre `pnpm build --webpack` (non `pnpm build`) per evitare problemi di compatibilità di Turbopack con `next/font/google` in modalità SSG.

## Struttura del progetto

```
vtn-menu-ristorante-next/
│
├── app/                            # Next.js App Router
│   ├── fonts.ts                    # Font Google (Philosopher + DM Sans)
│   ├── globals.css                 # Tema Tailwind v4 (@theme) + reset CSS
│   ├── layout.tsx                  # Root layout (font, metadata, classi body)
│   ├── page.tsx                    # Homepage — Server Component async
│   └── design-system/
│       └── page.tsx                # Preview Design System (solo sviluppo)
│
├── src/
│   ├── types/
│   │   ├── payload-types.ts        # Interfacce TypeScript per Payload + tipi derivati
│   │   ├── disponibilita.ts        # Interfaccia per il JSON di disponibilità GCS
│   │   └── index.ts                # Re-export centralizzato
│   │
│   ├── lib/
│   │   └── api.ts                  # Fetcher build-time e client-side
│   │
│   ├── hooks/
│   │   ├── useTimekeeper.ts        # Logica temporale: apertura, slot, festività
│   │   └── useMenuStructure.ts     # Logica strutturale: sezioni risolte per slot
│   │
│   ├── context/
│   │   └── MenuContext.tsx         # Provider globale: hooks + polling disponibilità
│   │
│   └── components/
│       ├── ui/                     # Atomi del Design System
│       │   ├── Button.tsx
│       │   ├── Typography.tsx      # Heading + Text
│       │   ├── Badge.tsx
│       │   ├── Container.tsx
│       │   └── index.ts
│       │
│       └── menu/                   # Componenti di dominio
│           ├── DishCard.tsx        # Singolo piatto (stile Minimal)
│           ├── MenuSection.tsx     # Sezione categoria con lista piatti
│           ├── StickyNav.tsx       # Navigazione sticky
│           ├── MenuOrchestrator.tsx # Client Component radice
│           ├── MenuHeader.tsx      # Header bordeaux
│           ├── MenuFooter.tsx      # Footer bordeaux
│           └── index.ts
│
├── docs/                           # Documentazione
│   ├── README.md                   # Indice
│   ├── dev/                        # Guide per sviluppatori
│   └── ai/                         # Contesto per Agenti AI
│
├── out/                            # Output build statica (gitignored)
├── .env.local                      # Variabili d'ambiente (non committare)
├── next.config.ts                  # output: 'export', images: unoptimized
├── tsconfig.json                   # paths: @/* → ./src/*
└── firebase.json                   # Configurazione Firebase Hosting
```

## Flusso di deploy

```
git push → CI/CD
  └─ pnpm install
  └─ pnpm build --webpack   # Fetcha dati da Payload, genera out/
  └─ firebase deploy        # Carica out/ su Firebase Hosting
```

La build contatta il backend PayloadCMS per fetchare tutti i dati del menu. Assicurarsi che `NEXT_PUBLIC_PAYLOAD_URL` sia raggiungibile dall'ambiente CI prima di avviare la build.

## Pagina di preview Design System

Durante lo sviluppo, la pagina `/design-system` mostra tutti i componenti UI con dati dummy. È utile per verificare modifiche al tema o ai componenti senza dati reali.

```bash
pnpm dev
# Apri http://localhost:3000/design-system
```

Questa pagina **non viene inclusa nella build di produzione** se si vuole escluderla — per ora è inclusa ma non collegata dalla navigazione principale.
