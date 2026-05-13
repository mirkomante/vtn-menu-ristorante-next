# Stato del Progetto — Menu Digitale Vietnamonamour

> Audit eseguito il 2026-03-29 tramite lettura integrale di tutti i file sorgente.
> Questo documento rispecchia la realtà del codice, non gli obiettivi.

---

## Report di Audit per Area

### 1. Configurazione Next.js e Build

| Verifica | Stato | Note |
|---|---|---|
| `output: "export"` impostato | ✅ | Confermato in `next.config.ts` |
| `images.unoptimized: true` | ✅ | Confermato in `next.config.ts` |
| Webpack forzato (`--webpack`) | ✅ | `"build": "next build --webpack"` in `package.json` |
| Cartella output `out/` | ✅ | Impostata da `output: "export"` |
| TypeScript strict mode | ✅ | `"strict": true` in `tsconfig.json` |
| Alias `@/*` → `./src/*` | ✅ | Confermato in `tsconfig.json` |
| Nessun `any` nel codice | ✅ | Nessun `any` trovato in nessun file sorgente |

**Stato complessivo: ✅ Configurato correttamente**

---

### 2. Tailwind CSS v4

| Verifica | Stato | Note |
|---|---|---|
| Configurazione CSS-first con `@theme` | ✅ | Confermato in `app/globals.css` |
| `tailwind.config.ts` assente | ✅ | Non trovato nella root |
| Token `background: #FFEDD7` | ✅ | `--color-background: #ffedd7` |
| Token `surface-dark: #460112` | ✅ | `--color-surface-dark: #460112` |
| Token `text-main: #080F2C` | ✅ | `--color-text-main: #080f2c` |
| Token `text-light: #FFEDD7` | ✅ | `--color-text-light: #ffedd7` |
| Token `accent-gold: #F8B624` | ✅ | `--color-accent-gold: #f8b624` |
| Token `accent-orange: #EF5808` | ✅ | `--color-accent-orange: #ef5808` |
| Font Philosopher via `next/font/google` | ✅ | Confermato in `app/fonts.ts` |
| Font DM Sans via `next/font/google` | ✅ | Confermato in `app/fonts.ts` |
| PostCSS configurato con `@tailwindcss/postcss` | ✅ | Confermato in `postcss.config.mjs` |

**Stato complessivo: ✅ Implementazione corretta — tutti i token attesi presenti con valori corretti**

---

### 3. Data Fetching — `getStaticMenuData`

| Verifica | Stato | Note |
|---|---|---|
| `getStaticMenuData()` esiste | ✅ | In `src/lib/api.ts` |
| Fetch parallelo con `Promise.all` | ✅ | 13 fetch in parallelo |
| Tutte le collection fetchate | ✅ | piatti, vini, menu-fisso, bevande, birre, liquori, allergeni, nazioni, regioni, zone |
| Tutti i globals fetchati | ✅ | menu-config, generali, ordinamento-menu |
| `NEXT_PUBLIC_PAYLOAD_URL` usato correttamente | ✅ | `const PAYLOAD_URL = process.env.NEXT_PUBLIC_PAYLOAD_URL ?? ""` |
| `generateStaticParams` in `app/menu/[slug]/page.tsx` | ✅ | Implementato correttamente da `sezioniRisolte` |
| Slug generato da `slugify(label)` | ✅ | In `normalizeStandardItems()` |
| Pagina `/design-system` inclusa in produzione | ⚠️ | Non esclusa esplicitamente — inclusa nella build |

**Stato complessivo: ✅ Implementato correttamente**

---

### 4. Polling Disponibilità — GCS

| Verifica | Stato | Note |
|---|---|---|
| Polling da GCS implementato | ✅ | `getRealTimeAvailability()` in `api.ts` |
| Intervallo polling: 5 minuti | ✅ | `AVAILABILITY_POLL_MS = 5 * 60 * 1_000` in `MenuContext.tsx` |
| `NEXT_PUBLIC_MENU_JSON_URL` usato correttamente | ✅ | `const MENU_JSON_URL = process.env.NEXT_PUBLIC_MENU_JSON_URL ?? ""` |
| Tipo `DisponibilitaResponse` completo | ✅ | Include `piatti`, `vini`, `messaggioGlobale?` |
| Vini filtrati per disponibilità in `MenuSection` | ❌ | Solo `_type === "piatto"` viene filtrato — i vini non vengono mai filtrati |
| `messaggioGlobale` renderizzato | ❌ | Campo definito nel tipo ma non renderizzato da nessun componente |
| Fetch immediato all'avvio | ✅ | `void fetchAvailability()` nel `useEffect` iniziale |

**Stato polling: ✅**
**Stato disponibilità vini: ❌ Non implementato**
**Stato messaggioGlobale: ❌ Non renderizzato**

---

### 5. Componenti — Stato e Utilizzo

| Componente | Tipo | Usato da | Stato |
|---|---|---|---|
| `HomeIndex` | `"use client"` | `app/page.tsx` | ✅ Usato |
| `CategoryPage` | `"use client"` | `app/menu/[slug]/page.tsx` | ✅ Usato |
| `MenuHeader` | Server-compatible | `HomeIndex`, `CategoryPage` | ✅ Usato |
| `MenuFooter` | Server-compatible | `HomeIndex`, `CategoryPage` | ✅ Usato |
| `MenuSection` | Server-compatible | `CategoryPage`, `design-system/page.tsx` | ✅ Usato |
| `DishCard` | Server-compatible | `MenuSection`, `design-system/page.tsx` | ✅ Usato |
| `MenuFissoCard` | Server-compatible | `MenuSection` | ✅ Usato |
| `LexicalRenderer` | Server-compatible | `MenuFooter` | ✅ Usato |
| `MenuOrchestrator` | `"use client"` | Nessuna pagina | ⚠️ Codice morto |
| `StickyNav` | `"use client"` | Solo `MenuOrchestrator` (anch'esso morto) | ⚠️ Codice morto |

**Verifiche specifiche:**

| Verifica | Stato | Note |
|---|---|---|
| `MenuOrchestrator` importato da pagine | ❌ | Non usato da nessuna pagina attuale |
| `StickyNav` importato da pagine attive | ❌ | Solo in `MenuOrchestrator` (codice morto) |
| `MenuHeader` renderizza il logo | ❌ | Campo `logo` presente nel tipo ma non renderizzato |
| `DishCard` renderizza `immagine` di Piatto | ❌ | Campo `immagine` presente nel tipo ma non renderizzato |
| `LexicalRenderer` — nodi supportati | ✅ | paragraph, heading, list (bullet/numerate), link, text (bold/italic/underline/strikethrough) |

---

### 6. Componenti UI — `src/components/ui/`

| Componente | Usato nel codice | Token Design System |
|---|---|---|
| `Badge` | ✅ DishCard, MenuFissoCard, design-system | ✅ Usa `bg-text-main`, `bg-accent-orange`, `bg-accent-gold`, `text-surface-dark` |
| `Button` | ✅ design-system/page.tsx (dati dummy) | ✅ Usa `bg-text-main`, `text-text-light`, ecc. |
| `Container` | ✅ Tutti i componenti di dominio | ✅ Usa `max-w-4xl` con padding responsive |
| `Heading` | ✅ Tutti i componenti di dominio | ✅ Usa `font-serif`, `text-text-main`, `text-surface-dark` |
| `Text` | ✅ Tutti i componenti di dominio | ✅ Usa `font-sans`, `text-text-main`, `text-text-muted` |

⚠️ `Button` è usato solo nella pagina `/design-system` (dati dummy). Non è usato in nessun componente di dominio attivo.

---

### 7. Dark Mode

| Verifica | Stato | Note |
|---|---|---|
| Toggle `data-theme="light\|dark"` implementato | ❌ | Non trovato in nessun file |
| Preferenza salvata in `localStorage` con chiave `"vtn-theme"` | ❌ | Non trovato in nessun file |
| Dark mode applicata | ❌ | Non implementata — tema fisso "Warm & Elegant" |
| `FooterSimple` presente | ❌ | Non trovato — il handoff menzionava questo componente ma non esiste |

**Stato complessivo: ❌ Dark mode non implementata**

---

### 8. SEO e Metadata

| Verifica | Stato | Note |
|---|---|---|
| Meta description in `app/layout.tsx` | ⚠️ | `"Scopri il nostro menu: cucina vietnamita autentica a Roma."` — dice **Roma** ma il ristorante è a **Milano** |
| Titolo in `app/layout.tsx` | ⚠️ | `"Vietnamonamour — Menu"` — hardcoded, non letto dal CMS |
| `generateMetadata` per `/menu/[slug]` | ❌ | Non implementato — tutte le pagine hanno lo stesso titolo del layout root |
| OG tags (`openGraph`, `twitter`) | ❌ | Non implementati |
| `sitemap.ts` o `sitemap.xml` | ❌ | Non trovati |
| `robots.ts` o `robots.txt` | ❌ | Non trovati |
| `<html lang="it">` | ✅ | Confermato in `app/layout.tsx` |

**Stato complessivo: ⚠️ SEO base presente ma con bug (città errata) e funzionalità mancanti**

---

### 9. Firebase — Configurazione Deploy

| Verifica | Stato | Note |
|---|---|---|
| Cartella pubblica `out/` | ✅ | `"public": "out"` in `firebase.json` |
| `cleanUrls: true` | ✅ | Confermato in `firebase.json` |
| Progetto Firebase configurato | ✅ | `"default": "vtn25-475411"` in `.firebaserc` |

**Stato complessivo: ✅ Configurato correttamente**

---

## Lista Debiti Tecnici

### Priorità Alta

| # | Debito | Area | File coinvolti |
|---|---|---|---|
| DT-01 | Meta description dice "Roma" ma il ristorante è a Milano | SEO | `app/layout.tsx` |
| DT-02 | `messaggioGlobale` definito nel tipo ma mai renderizzato | Funzionalità | `src/context/MenuContext.tsx`, nessun componente |
| DT-03 | Disponibilità vini non filtrata in `MenuSection` (solo piatti) | Funzionalità | `src/components/menu/MenuSection.tsx` |

### Priorità Media

| # | Debito | Area | File coinvolti |
|---|---|---|---|
| DT-04 | `generateMetadata` mancante per `/menu/[slug]` — tutte le pagine hanno lo stesso titolo | SEO | `app/menu/[slug]/page.tsx` |
| DT-05 | OG tags (`openGraph`, `twitter`) non implementati | SEO | `app/layout.tsx` |
| DT-06 | Logo ristorante non renderizzato — campo `logo` in `MenuConfig` ignorato | Funzionalità | `src/components/menu/MenuHeader.tsx` |
| DT-07 | Immagini piatti non renderizzate — campo `immagine` in `Piatto` ignorato | Funzionalità | `src/components/menu/DishCard.tsx` |
| DT-08 | `MenuOrchestrator` e `StickyNav` sono codice morto — da rimuovere o documentare come legacy | Manutenzione | `src/components/menu/MenuOrchestrator.tsx`, `StickyNav.tsx` |
| DT-09 | `Button` usato solo in `/design-system` — non usato nei componenti di dominio | Manutenzione | `src/components/ui/Button.tsx` |
| DT-10 | Pagina `/design-system` inclusa nella build di produzione | Build | `app/design-system/page.tsx` |

### Priorità Bassa

| # | Debito | Area | File coinvolti |
|---|---|---|---|
| DT-11 | `sitemap.ts` non implementato | SEO | da creare |
| DT-12 | `robots.txt` non implementato | SEO | da creare |
| DT-13 | Nessuna pipeline CI/CD configurata — deploy manuale | DevOps | da creare |
| DT-14 | Nessun test unitario — funzioni pure esportate ma non testate | Qualità | `useTimekeeper.ts`, `useMenuStructure.ts` |
| DT-15 | `README.md` è il template default di `create-next-app` | Documentazione | `README.md` |
| DT-16 | `StickyNav` usa `bg-surface-dark/95` come sfondo, violando la regola del design system | Design System | `src/components/menu/StickyNav.tsx` |
| DT-17 | Slug generato da `slugify(label)` — se `label` cambia nel CMS, i link precedenti diventano 404 | Architettura | `src/lib/api.ts` |
| DT-18 | Titolo SEO hardcoded — non letto da `menuConfig.title` | SEO | `app/layout.tsx` |

---

## Stato Implementazione per Funzionalità

### Completamente Implementato ✅

- Routing a due livelli (Home Indice + pagine dettaglio)
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
- `LexicalRenderer` per Rich Text Lexical
- `MenuHeader` (brand-only, titolo da CMS)
- `MenuFooter` (nome, testo, annotazione Rich Text, indirizzo, social, copyright)
- Design System completo (Badge, Button, Heading, Text, Container)
- Tema Tailwind v4 CSS-first con palette "Warm & Elegant" — tutti i token corretti
- Font Google (Philosopher + DM Sans) via `next/font`
- Graceful degradation per tutti i globals opzionali
- Fallback UI per errori di build
- Firebase Hosting configurato correttamente

### Parzialmente Implementato ⚠️

- **`StickyNav`**: implementato ma non usato nelle pagine attuali
- **`MenuOrchestrator`**: implementato ma non usato (architettura legacy)
- **Disponibilità vini**: tipo include `vini` ma `MenuSection` non filtra i vini
- **`messaggioGlobale`**: campo definito nel tipo ma non renderizzato
- **SEO**: meta description presente ma con bug (Roma vs Milano)

### Non Implementato ❌

- Dark mode (toggle `data-theme`)
- SEO dinamico per pagina (`generateMetadata` per `/menu/[slug]`)
- OG tags
- Sitemap
- Robots.txt
- Immagini piatti (`immagine` in `Piatto`)
- Logo ristorante (`logo` in `MenuConfig`)
- CI/CD pipeline
- Test unitari

---

## AI-AGENT QUICK REFERENCE

```
# Debiti tecnici critici (priorità alta)
DT-01: app/layout.tsx → description dice "Roma" invece di "Milano"
DT-02: messaggioGlobale non renderizzato (tipo ok, UI mancante)
DT-03: MenuSection filtra solo piatti, non vini

# Codice morto da non toccare senza istruzione esplicita
src/components/menu/MenuOrchestrator.tsx  → non usato da nessuna pagina
src/components/menu/StickyNav.tsx         → solo in MenuOrchestrator (morto)

# Funzionalità non implementate
- Dark mode (nessun data-theme, nessun localStorage)
- generateMetadata per /menu/[slug]
- OG tags, sitemap, robots.txt
- Immagini piatti (campo immagine esiste ma non renderizzato)
- Logo ristorante (campo logo esiste ma non renderizzato)
```
