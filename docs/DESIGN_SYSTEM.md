# Design System — "Warm & Elegant"

> Documento verificato il 2026-03-29 tramite lettura integrale di `app/globals.css`, `src/components/ui/`, e `src/components/menu/`.

---

## Filosofia

Il brand **Vietnamonamour** usa un mood caldo ed elegante: sfondo crema, testi blu notte profondi, accenti oro e arancio bruciato.

**Principio guida — Stile Minimal:** i contenuti poggiano direttamente sullo sfondo crema, separati da bordi sottili bordeaux. Le card bianche sono riservate a contesti specifici (modal, form, overlay).

> **Tailwind v4 — configurazione CSS-first:** non esiste `tailwind.config.ts`. Tutti i token del tema sono definiti in `app/globals.css` nel blocco `@theme`. Per aggiungere nuovi token, modificare **solo** quel file.

---

## 1. Palette Colori (verificata da `app/globals.css`)

| Token CSS | Classe Tailwind | HEX / RGBA | Uso |
|---|---|---|---|
| `--color-background` | `bg-background` | `#ffedd7` | Sfondo pagina — **sempre questo, mai `bg-white`** |
| `--color-surface` | `bg-surface` | `#ffffff` | Solo per modal, form, elementi sovrapposti |
| `--color-surface-dark` | `bg-surface-dark` / `text-surface-dark` | `#460112` | **Solo come colore testo** su sfondi chiari — titoli bordeaux. Non usare come sfondo. |
| `--color-text-main` | `text-text-main` | `#080f2c` | Testo principale (blu notte profondo) |
| `--color-text-light` | `text-text-light` | `#ffedd7` | Testo su sfondi scuri |
| `--color-text-muted` | `text-text-muted` | `rgba(8, 15, 44, 0.7)` | Descrizioni, note secondarie |
| `--color-accent-gold` | `text-accent-gold` / `bg-accent-gold` | `#f8b624` | Prezzi, icone, link, sezione attiva nav |
| `--color-accent-orange` | `bg-accent-orange` | `#ef5808` | Badge highlight, dettagli |

### Regole colore fondamentali

- Sfondo pagina: **sempre** `bg-background`. Non usare `bg-white` o `bg-gray-*`.
- Testo principale: **sempre** `text-text-main`. Non usare `text-black` o `text-gray-900`.
- Prezzi: **sempre** `text-accent-gold font-bold`.
- Separatori tra voci: `border-b border-surface-dark/20` (Bordeaux 20%, 1px — stile Minimal B2).

### ⛔ Regola di contrasto — VIETATO ASSOLUTO

| Combinazione | Stato | Note |
|---|---|---|
| `text-text-main` su `bg-background` | ✅ Consentita | Uso standard |
| `text-text-main` su `bg-surface` | ✅ Consentita | Modal, form, overlay |
| `text-surface-dark` su `bg-background` | ✅ Consentita | Titoli bordeaux su crema |
| `text-text-light` su `bg-text-main` | ✅ Consentita | Footer, button primary |
| `text-accent-gold` su `bg-text-main` | ✅ Consentita | Prezzi, link su sfondo blu notte |
| **`text-text-main` su `bg-text-main`** | ❌ **VIETATA** | Stesso colore — invisibile |
| **`text-text-main` su `bg-surface-dark`** | ❌ **VIETATA** | Contrasto insufficiente |
| **`bg-surface-dark` come sfondo** | ❌ **VIETATA** | Solo come colore testo |

**Uso corretto di `surface-dark`:**
- Footer: `bg-text-main` (Blu Notte)
- Header: `bg-background` (Crema)
- Titoli sezione: `text-surface-dark` su `bg-background`
- Separatori: `border-surface-dark/20` (bordeaux come colore bordo, non sfondo)

⚠️ `StickyNav` usa `bg-surface-dark/95` come sfondo — questo **viola** la regola del design system (vedi DT-16 in `STATO.md`).

---

## 2. Tipografia (verificata da `app/globals.css` e `app/fonts.ts`)

| Ruolo | Font | Classe Tailwind | Pesi | Variabile CSS |
|---|---|---|---|---|
| Titoli | Philosopher | `font-serif` | 400, 700 | `--font-philosopher` |
| Testi | DM Sans | `font-sans` | 300–700 | `--font-dm-sans` |

Font caricati via `next/font/google` in `app/fonts.ts`, iniettati come variabili CSS nel `<body>` dal `RootLayout`.

**Regola:** usa **sempre** i componenti `<Heading>` e `<Text>` — non applicare mai `font-serif` o `font-sans` su HTML grezzo.

---

## 3. Border Radius (verificato da `app/globals.css`)

| Token | Valore |
|---|---|
| `--radius-sm` | `0.25rem` |
| `--radius-md` | `0.375rem` |
| `--radius-lg` | `0.5rem` |
| `--radius-full` | `9999px` |

---

## 4. Ombre (verificate da `app/globals.css`)

Basate su `rgba(8, 15, 44, ...)` (Blu Notte a bassa opacità):

| Token | Valore |
|---|---|
| `--shadow-sm` | `0 1px 3px rgba(8,15,44,0.08), 0 1px 2px rgba(8,15,44,0.04)` |
| `--shadow-md` | `0 4px 6px rgba(8,15,44,0.07), 0 2px 4px rgba(8,15,44,0.05)` |
| `--shadow-lg` | `0 10px 15px rgba(8,15,44,0.08), 0 4px 6px rgba(8,15,44,0.04)` |

---

## 5. Componenti UI Atom (`src/components/ui/`)

Importabili da `@/components/ui`:

```tsx
import { Button, Heading, Text, Badge, Container } from "@/components/ui";
```

### `<Badge>` — `src/components/ui/Badge.tsx`

Cinque varianti con ruoli semantici precisi:

```tsx
<Badge variant="default">Piccante</Badge>           // bg-text-main, text-text-light
<Badge variant="highlight">Vegan</Badge>            // bg-accent-orange, text-text-light
<Badge variant="gold">Signature</Badge>             // bg-accent-gold, text-text-main
<Badge variant="outline">Tag generico</Badge>       // border border-text-main, text-text-main
<Badge variant="allergen">Contiene glutine</Badge>  // border border-surface-dark/40, text-surface-dark
```

> **Regola semantica:** `allergen` è riservato **esclusivamente** agli avvisi allergeni. `highlight` per vantaggi dietetici e tag promozionali. Non mescolare i due ruoli.

### `<Button>` — `src/components/ui/Button.tsx`

Tre varianti, tre taglie, stato loading. Usa `forwardRef`.

```tsx
<Button variant="primary">Ordina</Button>         // bg-text-main, text-text-light
<Button variant="outline">Vedi dettagli</Button>  // border border-text-main
<Button variant="ghost" size="sm">Chiudi</Button> // solo testo
<Button loading>Caricamento...</Button>
<Button disabled>Non disponibile</Button>
```

⚠️ `Button` è usato solo nella pagina `/design-system` — non nei componenti di dominio attivi.

### `<Heading>` — `src/components/ui/Typography.tsx`

Sempre Philosopher. Livelli da `h1` a `h4`, colori `default` (blu notte) e `bordeaux`:

```tsx
<Heading level={1}>Vietnamonamour</Heading>
<Heading level={2} color="bordeaux">Antipasti</Heading>
<Heading level={3}>Phở Bò</Heading>
```

### `<Text>` — `src/components/ui/Typography.tsx`

Sempre DM Sans. Varianti: `lead`, `body`, `small`, `caption`. Prop `muted` per testo secondario:

```tsx
<Text variant="body" muted>Brodo di manzo 12 ore</Text>
<Text variant="body" className="font-bold text-accent-gold">€ 14,00</Text>
```

### `<Container>` — `src/components/ui/Container.tsx`

Wrapper centrato `max-w-4xl` con padding responsive:

```tsx
<Container>                  // padding responsive: px-4 sm:px-6 lg:px-8
<Container padding="tight">  // padding fisso px-4
<Container padding="none">   // nessun padding
<Container as="section">     // polymorphic
```

---

## 6. Pattern Componenti di Dominio

### `DishCard` — Stile Minimal B2

Separatore: `border-b border-surface-dark/20`. Nessun sfondo, nessuna shadow.

**Header comune:** nome (`Heading level={3}`) + prezzo (`text-accent-gold font-bold`).

**Body variabile per `_type`:**

| `_type` | Contenuto body |
|---|---|
| `piatto` | Descrizione + Badge `highlight` (Vegan, Gluten Free, ecc.) + Badge `allergen` (allergeni) + prezzo alternativo |
| `vino` | Descrizione + riga info tecnica (`Cantina · Annata · Grado°`) + provenienza geografica + Badge `default` (tipologia, capacità, certificazione) + prezzo calice |
| `birra` | Descrizione + riga info (`Grado° · Capacità`) + Badge `default` (tipologia, nazione) |
| `liquore` | Descrizione + riga info (`Grado° · Capacità · Invecchiamento`) + Badge `default` (tipologia, nazione) |
| `bevanda` | Descrizione + Badge `default` (tipologia, nazione) |

❌ Il campo `immagine` di `Piatto` non è renderizzato (debito tecnico DT-07).

### `MenuFissoCard` — Stile Minimal B2

Layout: nome + prezzo totale, descrizione italic, lista piatti inclusi (rientrata con `border-l-2 border-surface-dark/20`), servizi aggiuntivi (Badge `default`).

### `MenuSection` — Rendering gerarchico

Accetta `groups: MenuItemGroup[]` e `menuFissi: MenuFisso[]`. I menu fissi vengono renderizzati per primi. Se un gruppo ha `title`, viene renderizzato un sottotitolo `h3` sticky (`sticky top-14`).

**Logica disponibilità:** filtra solo `_type === "piatto"` — i vini non vengono mai filtrati (debito tecnico DT-03).

### `MenuHeader` — Sfondo crema

```tsx
<header className="bg-background py-12 border-b border-surface-dark/10">
  <h1 className="font-serif text-4xl font-bold text-surface-dark">
    {titolo}
  </h1>
</header>
```

Mostra `menuConfig.title` se presente, altrimenti `menuConfig.nomeRistorante`. ❌ Non renderizza il logo (debito tecnico DT-06).

### `MenuFooter` — Sfondo Blu Notte

```tsx
<footer className="bg-text-main py-10">
  {/* testo SEMPRE text-text-light o text-accent-gold */}
</footer>
```

Mostra: nome ristorante, testo footer CMS, annotazione Rich Text (Lexical), indirizzo, telefono, link social, copyright.

---

## 7. Mapping semantico UI → Componente

| Elemento UI | Componente / Classe |
|---|---|
| Nome piatto / voce menu | `<Heading level={3}>` |
| Titolo sezione menu | `<Heading level={2} color="bordeaux">` |
| Descrizione piatto | `<Text variant="body" muted>` |
| Info tecnica (cantina, grado, ecc.) | `<Text variant="small" muted>` |
| Prezzo | `<Text variant="body" className="font-bold text-accent-gold">` |
| Separatore tra voci | `border-b border-surface-dark/20` |
| Tag dietetico (vantaggio) | `<Badge variant="highlight">` |
| Tag allergene (avviso) | `<Badge variant="allergen">` |
| Tag generico (tipologia, capacità) | `<Badge variant="default">` |
| Voce menu generica | `<DishCard item={item} />` |
| Menu a prezzo fisso | `<MenuFissoCard menu={mf} />` |
| Sezione con voci miste | `<MenuSection groups={...} menuFissi={...} />` |
| Wrapper sezione | `<Container as="section">` |
| Bottone CTA principale | `<Button variant="primary">` |
| Testo su sfondo scuro | `text-text-light` o `text-accent-gold` |

---

## 8. Breakpoint Responsive

Tailwind v4 default:

| Breakpoint | Larghezza |
|---|---|
| `sm` | 640px |
| `md` | 768px |
| `lg` | 1024px |
| `xl` | 1280px |

Il `Container` usa `max-w-4xl` (896px) con padding `px-4 sm:px-6 lg:px-8`.

---

## 9. Dark Mode

**Non implementata.** Il sito usa un tema fisso "Warm & Elegant". Non esiste toggle `data-theme`, nessun `localStorage`, nessuna variante `dark:` nelle classi Tailwind.

---

## AI-AGENT QUICK REFERENCE

```
# Token colori — tutti verificati da app/globals.css
background:    #ffedd7  → bg-background
surface:       #ffffff  → bg-surface
surface-dark:  #460112  → text-surface-dark (MAI bg-surface-dark)
text-main:     #080f2c  → text-text-main
text-light:    #ffedd7  → text-text-light
text-muted:    rgba(8,15,44,0.7) → text-text-muted
accent-gold:   #f8b624  → text-accent-gold / bg-accent-gold
accent-orange: #ef5808  → bg-accent-orange

# Regola contrasto (OBBLIGATORIA)
sfondo scuro (bg-text-main) → testo SEMPRE text-text-light o text-accent-gold
sfondo chiaro (bg-background) → testo SEMPRE text-text-main, text-text-muted, text-surface-dark
bg-surface-dark → MAI come sfondo

# Stile lista voci
border-b border-surface-dark/20 py-5  → stile Minimal B2 approvato
NO card bianche (bg-surface), NO bordi oro, NO bordi arancioni spessi

# Componenti UI
import { Badge, Button, Container, Heading, Text } from "@/components/ui"
import { DishCard, MenuSection, MenuHeader, MenuFooter } from "@/components/menu"
```
