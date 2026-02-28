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
| `surface-dark` | `bg-surface-dark` | `#460112` | **Solo come colore testo** (`text-surface-dark`) su sfondi chiari — titoli bordeaux. Non usare come sfondo. |
| `text-main` | `text-text-main` | `#080F2C` | Testo principale (blu notte profondo) |
| `text-light` | `text-text-light` | `#FFEDD7` | Testo su sfondi scuri |
| `text-muted` | `text-text-muted` | `rgba(8,15,44,0.7)` | Descrizioni, note secondarie |
| `accent-gold` | `text-accent-gold` | `#F8B624` | Prezzi, icone, link, sezione attiva nav |
| `accent-orange` | `bg-accent-orange` | `#EF5808` | Badge highlight, dettagli |

### Regole colore fondamentali

- Sfondo pagina: **sempre** `bg-background`. Non usare `bg-white` o `bg-gray-*`.
- Testo principale: **sempre** `text-text-main`. Non usare `text-black` o `text-gray-900`.
- Prezzi: **sempre** `text-accent-gold font-semibold`.
- Separatori tra piatti: `border-b border-surface-dark/20` (Bordeaux 20%, 1px — stile B2).

### ⛔ Regola di contrasto — VIETATO ASSOLUTO

> **`text-main` (#080F2C) su `surface-dark` (#460112) è VIETATO.**
> Il contrasto blu notte su bordeaux scuro è insufficiente e il testo risulta illeggibile.
> **Pena: illeggibilità garantita. Non ci sono eccezioni.**

**Regola universale:**
- Sfondo scuro → testo **sempre** chiaro (`text-text-light` o `text-accent-gold`)
- Sfondo chiaro → testo **sempre** scuro (`text-text-main` o `text-text-muted`)

| Combinazione | Stato | Note |
|---|---|---|
| `text-main` su `bg-background` | ✅ Consentita | Uso standard per tutto il contenuto |
| `text-main` su `bg-surface` | ✅ Consentita | Per modal, form, overlay |
| `text-surface-dark` su `bg-background` | ✅ Consentita | Titoli bordeaux su crema — ottimo contrasto |
| `text-light` su `bg-text-main` | ✅ Consentita | Footer, navbar sticky, button primary |
| `accent-gold` su `bg-text-main` | ✅ Consentita | Prezzi, link attivi su sfondo blu notte |
| **`text-main` su `bg-text-main`** | ❌ **VIETATA** | Stesso colore — invisibile |
| **`text-main` su `bg-surface-dark`** | ❌ **VIETATA** | Contrasto insufficiente — illeggibile |
| **`bg-surface-dark` come sfondo** | ❌ **VIETATA** | Non usare surface-dark come sfondo — solo come colore testo |

**Uso di `surface-dark`:**
`surface-dark` è usato **solo** come colore di testo (`text-surface-dark`) su sfondi chiari — es. titoli sezione bordeaux su crema. **Non viene mai usato come sfondo** (`bg-surface-dark`).

- Footer: usa `bg-text-main` (Blu Notte)
- Header: usa `bg-background` (Crema)
- Navbar sticky: usa `bg-text-main/95` (Blu Notte semitrasparente)
- Separatori tra piatti: `border-surface-dark/20` (bordeaux come colore bordo, non sfondo)

**Safety check prima di scrivere codice UI:**
1. Qual è il colore di sfondo dell'elemento?
2. Se è scuro (`surface-dark`, `text-main`) → il testo DEVE essere `text-light` o `accent-gold`
3. Se è chiaro (`background`, `surface`) → il testo DEVE essere `text-main`, `text-muted` o `text-surface-dark`

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

### DishCard — Stile Minimal B2 (unico stile approvato)

Il separatore è `border-b border-surface-dark/20` (bordeaux 20%, 1px). Nessun sfondo, nessuna shadow.

```tsx
// ✅ CORRETTO — stile B2 approvato
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
```

**Stili scartati — non usare:**

| Stile | Classe | Motivo scarto |
|---|---|---|
| A — Card bianca | `bg-surface rounded-md shadow-sm p-4` | Appesantisce la pagina, contrasta col mood minimal |
| B1 — Bordo oro | `border-b border-accent-gold/20` | Poco visibile su sfondo crema |
| B3 — Bordo arancione 2px | `border-b-2 border-accent-orange/30` | Troppo aggressivo, distrae dal contenuto |

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

### Header — sfondo crema (approvato)

L'header usa `bg-background` (crema), **non** `bg-surface-dark`. Questo evita la pesantezza visiva e garantisce il contrasto corretto senza rischi.

```tsx
// ✅ CORRETTO — header su sfondo crema
<header className="bg-background border-b border-surface-dark/10 py-6">
  <p className="font-serif text-4xl text-surface-dark">Vietnamonamour</p>
  <Text variant="small" muted>Servizio Pranzo</Text>
</header>

// ❌ EVITARE — header su sfondo bordeaux (pesante + rischio contrasto)
<header className="bg-surface-dark py-10">
  <p className="text-text-main">...</p>  {/* ILLEGGIBILE */}
</header>
```

### Footer — sfondo Blu Notte (approvato)

Il footer usa `bg-text-main` (Blu Notte `#080F2C`). Il testo deve essere **esclusivamente** `text-text-light` o `text-accent-gold`. Non usare il componente `<Text>` direttamente — applica `text-text-main` di default che su sfondo scuro è illeggibile. Usa elementi nativi (`<p>`, `<span>`) con le classi corrette.

```tsx
// ✅ CORRETTO — testo crema/oro su Blu Notte
<footer className="bg-text-main py-10">
  <p className="font-serif text-xl font-bold text-text-light">Vietnamonamour</p>
  <p className="font-sans text-sm text-text-light/70">Via Roma 1, Milano</p>
  <a className="font-sans text-sm text-text-light/60 hover:text-accent-gold">Instagram</a>
</footer>

// ❌ EVITARE — testo scuro su sfondo scuro (illeggibile)
<footer className="bg-text-main">
  <p className="text-text-main">...</p>
</footer>

// ❌ EVITARE — sfondo bordeaux (non più usato per footer)
<footer className="bg-surface-dark">...</footer>
```

> **Nota:** `surface-dark` (#460112) è riservato **solo** come colore di testo (`text-surface-dark`) su sfondi chiari (es. titoli bordeaux su crema). Non viene più usato come sfondo di nessun componente.

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
