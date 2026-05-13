# Guida allo Sviluppo — Menu Digitale Vietnamonamour

> Documento verificato il 2026-03-29 tramite lettura integrale dei file sorgente.

---

## Prerequisiti

- Node.js 20+
- pnpm 9+
- Accesso al backend PayloadCMS (URL in `.env.local`)

---

## Installazione

```bash
git clone <repo>
cd vtn-menu-ristorante-next
pnpm install
```

---

## Variabili d'ambiente

Crea un file `.env.local` nella root del progetto:

```env
# URL base del backend PayloadCMS (senza slash finale)
NEXT_PUBLIC_PAYLOAD_URL=https://vtn-backend-payload-203473363873.europe-west1.run.app

# URL del file JSON di disponibilità su Google Cloud Storage
NEXT_PUBLIC_MENU_JSON_URL=https://storage.googleapis.com/vtn-menu-frontend/disponibilita.json
```

Entrambe le variabili sono prefissate `NEXT_PUBLIC_` perché vengono usate anche lato client (polling della disponibilità real-time).

**Comportamento se mancanti:**
- `NEXT_PUBLIC_PAYLOAD_URL` mancante → `getStaticMenuData()` lancia eccezione → build fallisce.
- `NEXT_PUBLIC_MENU_JSON_URL` mancante → `getRealTimeAvailability()` restituisce `null` → tutto mostrato come disponibile.

---

## Comandi principali

| Comando | Descrizione |
|---|---|
| `pnpm dev` | Avvia il dev server (porta 3000) |
| `pnpm build` | Build statica SSG → cartella `out/` (usa `--webpack`) |
| `pnpm start` | Serve la build locale (solo per test) |
| `firebase deploy` | Deploy su Firebase Hosting dalla cartella `out/` |

### Nota su `--webpack`

Il `package.json` definisce `"build": "next build --webpack"`. Turbopack è disabilitato perché causa problemi con `next/font/google` in modalità SSG. **Non rimuovere questo flag.**

---

## Struttura del progetto

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
│       └── page.tsx                # Preview Design System (inclusa in produzione)
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
│       ├── ui/                     # Atomi Design System
│       │   ├── Badge.tsx
│       │   ├── Button.tsx
│       │   ├── Container.tsx
│       │   ├── Typography.tsx      # Heading + Text
│       │   └── index.ts
│       └── menu/                   # Componenti di dominio
│           ├── DishCard.tsx
│           ├── MenuSection.tsx
│           ├── HomeIndex.tsx
│           ├── CategoryPage.tsx
│           ├── MenuHeader.tsx
│           ├── MenuFooter.tsx
│           ├── MenuFissoCard.tsx
│           ├── LexicalRenderer.tsx
│           ├── MenuOrchestrator.tsx  # ⚠️ Codice morto — non usato
│           ├── StickyNav.tsx         # ⚠️ Codice morto — non usato
│           └── index.ts
├── docs/                           # Documentazione
├── public/                         # Asset statici
├── out/                            # Output build statica (gitignored)
├── .env.local                      # Variabili d'ambiente (non committare)
├── next.config.ts
├── tsconfig.json
├── firebase.json
└── package.json
```

---

## Flusso di deploy

```
git push → (deploy manuale — nessuna pipeline CI/CD configurata)
  pnpm install
  pnpm build          # equivale a: next build --webpack
                      # Fetcha dati da Payload, genera out/
  firebase deploy     # Carica out/ su Firebase Hosting
```

⚠️ **Nessuna pipeline CI/CD configurata.** Il deploy è manuale.

---

## Pagina di preview Design System

Durante lo sviluppo, la pagina `/design-system` mostra tutti i componenti UI con dati dummy:

```bash
pnpm dev
# Apri http://localhost:3000/design-system
```

⚠️ Questa pagina è **inclusa nella build di produzione** (non esclusa esplicitamente). Non è collegata dalla navigazione principale.

---

## Configurazione TypeScript

```json
// tsconfig.json — punti chiave
{
  "compilerOptions": {
    "strict": true,           // strict mode attivo
    "paths": {
      "@/*": ["./src/*"]      // alias @/ → src/
    }
  }
}
```

Importare sempre i tipi da `@/types` (mai percorsi relativi).

---

## Configurazione Tailwind CSS v4

**Non esiste `tailwind.config.ts`.** La configurazione è CSS-first in `app/globals.css`:

```css
@import "tailwindcss";

@theme {
  --color-background: #ffedd7;
  --color-surface-dark: #460112;
  --color-text-main: #080f2c;
  /* ... altri token ... */
}
```

Per aggiungere nuovi token: modificare **solo** il blocco `@theme` in `app/globals.css`.

---

## Configurazione Firebase

```json
// firebase.json
{
  "hosting": {
    "public": "out",
    "cleanUrls": true
  }
}
```

```json
// .firebaserc
{
  "projects": {
    "default": "vtn25-475411"
  }
}
```

---

## File da non toccare senza istruzione esplicita

| File | Motivo |
|---|---|
| `app/globals.css` | Tema Tailwind v4 — modifiche impattano l'intera UI |
| `src/types/payload-types.ts` | Sincronizzato con il backend — non modificare manualmente |
| `src/lib/api.ts` | Logica di fetch critica usata a build-time |
| `src/context/MenuContext.tsx` | Provider globale con polling e stato runtime |
| `next.config.ts` | `output: 'export'` e `--webpack` sono intenzionali |

---

## AI-AGENT QUICK REFERENCE

```
# Setup locale
pnpm install
cp .env.local.example .env.local  # (creare manualmente se non esiste)
pnpm dev

# Build e deploy
pnpm build          # genera out/
firebase deploy     # deploy su Firebase

# Variabili d'ambiente obbligatorie
NEXT_PUBLIC_PAYLOAD_URL=https://vtn-backend-payload-203473363873.europe-west1.run.app
NEXT_PUBLIC_MENU_JSON_URL=https://storage.googleapis.com/vtn-menu-frontend/disponibilita.json

# Alias TypeScript
@/types     → src/types/
@/lib       → src/lib/
@/hooks     → src/hooks/
@/context   → src/context/
@/components → src/components/
```
