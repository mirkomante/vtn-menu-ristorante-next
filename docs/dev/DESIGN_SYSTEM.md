# Design System — "Warm & Elegant"

## Filosofia

Il brand **Vietnamonamour** usa un mood caldo ed elegante: sfondo crema, testi blu notte profondi, accenti oro e arancio bruciato.

**Principio guida — Stile Minimal:** i contenuti poggiano direttamente sullo sfondo crema, separati da bordi sottili bordeaux. Le card bianche sono riservate a contesti specifici (modal, form, overlay). Questo mantiene il ritmo visivo fluido e valorizza la tipografia Philosopher.

> **Tailwind v4 — configurazione CSS-first:** non esiste `tailwind.config.ts`. Tutti i token del tema sono definiti in `app/globals.css` nel blocco `@theme` come variabili CSS (`--color-*`, `--font-family-*`). Per aggiungere nuovi token, modificare **solo** quel file.

---

## 1. Palette Colori

| Token | Classe Tailwind | HEX / RGBA | Uso |
|---|---|---|---|
| `background` | `bg-background` | `#FFEDD7` | Sfondo pagina — **sempre questo, mai `bg-white`** |
| `surface` | `bg-surface` | `#FFFFFF` | Solo per modal, form, elementi sovrapposti |
| `surface-dark` | `bg-surface-dark` | `#460112` | Footer, header, bordo allergeni, separatore B2 |
| `text-main` | `text-text-main` | `#080F2C` | Testo principale (blu notte profondo) |
| `text-light` | `text-text-light` | `#FFEDD7` | Testo su sfondi scuri |
| `text-muted` | `text-text-muted` | `rgba(8,15,44,0.7)` | Descrizioni, note secondarie |
| `accent-gold` | `text-accent-gold` | `#F8B624` | Prezzi, icone, link, sezione attiva nav |
| `accent-orange` | `bg-accent-orange` | `#EF5808` | Badge highlight, dettagli |

### Regole colore fondamentali

- Sfondo pagina: **sempre** `bg-background`. Non usare `bg-white` o `bg-gray-*`.
- Testo principale: **sempre** `text-text-main`. Non usare `text-black` o `text-gray-900`.
- Su sfondo scuro (`bg-surface-dark`): usa `text-text-light` o `text-accent-gold`, **mai** `text-text-main`.
- Prezzi: **sempre** `text-accent-gold font-semibold`.
- Separatori tra piatti: `border-b border-surface-dark/20` (Bordeaux 20%, 1px — stile B2).

---

## 2. Tipografia

| Ruolo | Font | Classe Tailwind | Pesi | Uso |
|---|---|---|---|---|
| Titoli | Philosopher | `font-serif` | 400, 700 | Nomi piatti, titoli sezione, heading |
| Testi | DM Sans | `font-sans` | 300–700 | Descrizioni, prezzi, UI, navigazione |

Font caricati via `next/font/google` in `app/fonts.ts`, iniettati come variabili CSS (`--font-philosopher`, `--font-dm-sans`) nel `<body>` dal `RootLayout`.

**Regola:** usa **sempre** i componenti `<Heading>` e `<Text>` — non applicare mai `font-serif` o `font-sans` direttamente su HTML grezzo.

---

## 3. Componenti UI Atom (`src/components/ui/`)

Importabili da `@/components/ui`:

```tsx
import { Button, Heading, Text, Badge, Container } from "@/components/ui";
```

### `<Button>`

Rettangolare, padding ridotto. Tre varianti:

```tsx
<Button variant="primary">Ordina</Button>         // Blu Notte → Crema
<Button variant="outline">Vedi dettagli</Button>  // Bordo Blu Notte
<Button variant="ghost" size="sm">Chiudi</Button> // Solo testo
<Button loading>Caricamento...</Button>           // Stato loading
<Button disabled>Non disponibile</Button>         // Stato disabilitato
```

Taglie: `sm` (`py-1 px-3`), `md` (`py-1.5 px-4`), `lg` (`py-2 px-6`).

### `<Heading>`

Sempre Philosopher. Livelli da `h1` a `h4`, colori `default` (blu notte) e `bordeaux`:

```tsx
<Heading level={1}>Vietnamonamour</Heading>
<Heading level={2} color="bordeaux">Antipasti</Heading>
<Heading level={3}>Phở Bò</Heading>
```

### `<Text>`

Sempre DM Sans. Varianti: `lead`, `body`, `small`, `caption`. Prop `muted` per testo secondario:

```tsx
<Text variant="body" muted>Brodo di manzo 12 ore con spezie</Text>
<Text variant="body" className="text-accent-gold font-semibold">€ 14,00</Text>
<Text variant="small" className="text-text-light/70">Servizio Pranzo</Text>
```

### `<Badge>`

Cinque varianti con ruoli semantici precisi:

```tsx
<Badge variant="default">Piccante</Badge>           // Blu Notte — tag neutro generico
<Badge variant="highlight">Vegan</Badge>            // Arancione — vantaggio dietetico
<Badge variant="highlight">Chef consiglia</Badge>   // Arancione — tag promozionale
<Badge variant="gold">Signature</Badge>             // Oro — badge premium
<Badge variant="outline">Tag generico</Badge>       // Bordo blu notte
<Badge variant="allergen">Contiene glutine</Badge>  // Bordo bordeaux — SOLO per allergeni
```

> **Regola semantica:** `allergen` è riservato **esclusivamente** agli avvisi allergeni. `highlight` per vantaggi dietetici e tag promozionali. Non mescolare i due ruoli.

### `<Container>`

Wrapper centrato `max-w-4xl` con padding responsive:

```tsx
<Container>                  // padding responsive default
<Container padding="tight">  // padding fisso px-4
<Container padding="none">   // nessun padding (per layout interni)
<Container as="section">     // polymorphic: rende un <section>
```

---

## 4. Pattern Componenti di Dominio

### DishCard — Stile Minimal B2 (approvato per produzione)

```tsx
// ✅ CORRETTO — separatore bordeaux 20%, 1px
<div className="border-b border-surface-dark/20 py-5">
  <div className="flex items-start justify-between gap-4">
    <Heading level={3}>Phở Bò</Heading>
    <Text variant="body" as="span" className="font-bold text-accent-gold">€ 14,00</Text>
  </div>
  <Text variant="body" muted className="mt-1.5">Brodo di manzo 12 ore...</Text>
  <div className="mt-3 flex flex-wrap gap-1.5">
    <Badge variant="highlight">Gluten Free</Badge>
    <Badge variant="allergen">Contiene sesamo</Badge>
  </div>
</div>

// ❌ EVITARE — card bianca su crema (appesantisce la pagina)
<div className="rounded-md bg-surface p-4 shadow-sm">...</div>

// ❌ EVITARE — bordo arancione 2px (stile B1, non approvato)
<div className="border-b-2 border-accent-orange/30 py-4">...</div>
```

### Sezione menu — Layout aperto

```tsx
// ✅ CORRETTO — nessun bordo esterno, nessun sfondo
<section id="antipasti" className="py-10 scroll-mt-16">
  <Heading level={2} color="bordeaux">Antipasti</Heading>
  {/* lista DishCard */}
</section>

// ❌ EVITARE — box con bordo attorno alla sezione
<div className="rounded-md border border-gray-200 p-6">...</div>
```

### Sfondi scuri (Header, Footer)

```tsx
// ✅ CORRETTO — testo crema/oro su bordeaux
<header className="bg-surface-dark py-10">
  <p className="font-serif text-4xl text-text-light">Vietnamonamour</p>
  <Text variant="small" className="text-accent-gold">Servizio Pranzo</Text>
</header>

// ❌ EVITARE — testo blu notte su sfondo scuro (illeggibile)
<header className="bg-surface-dark">
  <p className="text-text-main">...</p>
</header>
```

---

## 5. Mapping semantico UI → Componente

| Elemento UI | Componente / Classe |
|---|---|
| Nome piatto | `<Heading level={3}>` |
| Titolo sezione menu | `<Heading level={2} color="bordeaux">` |
| Descrizione piatto | `<Text variant="body" muted>` |
| Prezzo | `<Text variant="body" className="text-accent-gold font-semibold">` |
| Separatore tra piatti | `border-b border-surface-dark/20` |
| Tag dietetico (vantaggio) | `<Badge variant="highlight">` |
| Tag allergene (avviso) | `<Badge variant="allergen">` |
| Tag generico | `<Badge variant="default">` |
| Wrapper sezione | `<Container as="section">` |
| Bottone CTA principale | `<Button variant="primary">` |
| Testo su sfondo scuro | `text-text-light` o `text-accent-gold` |
