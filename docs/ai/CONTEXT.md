# Contesto per Agenti AI — Menu Digitale VTN

Questo documento è scritto per agenti AI che lavorano su questo codebase. Contiene il "perché" delle scelte architetturali, le relazioni tra i componenti e le regole da rispettare.

---

## Cos'è questo progetto

Un menu digitale statico per il ristorante **Vietnamonamour** (Milano). Il cliente scansiona un QR code e vede il menu aggiornato in tempo reale sul proprio telefono.

**Vincolo principale:** Firebase Hosting Free Tier → nessun server Node.js a runtime → tutto deve essere HTML statico generato a build-time (SSG).

**Eccezione:** la disponibilità dei piatti (esaurito/disponibile) cambia durante il servizio → viene fetchata lato client ogni 5 minuti da un file JSON su Google Cloud Storage.

---

## Struttura del routing

**La Home è un indice di navigazione, non un menu completo.**

```
/                    → HomeIndex: lista sezioni come card cliccabili
/menu/[slug]         → CategoryPage: lista piatti di una sezione virtuale
```

L'utente scansiona il QR code → vede l'indice delle sezioni → clicca su una sezione → vede i piatti. Le sezioni fuori orario (es. "Pranzo" di sera) non compaiono nell'indice.

**Il routing è guidato da `menu-config.standardItems`, non dalla tassonomia del DB.**
Lo slug `/menu/[slug]` corrisponde a una "Sezione Virtuale" configurata nel CMS. **Gli slug non esistono nel backend**: vengono generati a build-time con `slugify(label)` in `normalizeStandardItems()`.

> **⚠️ Regola SSG obbligatoria:** Le pagine dinamiche `/menu/[slug]` sono pre-calcolate a build-time. Se aggiungi una nuova rotta dinamica (`[param]`), **devi** esportare `generateStaticParams` che restituisce tutti i valori possibili del parametro. Senza di essa la build con `output: 'export'` fallisce con l'errore `"Page is missing param in generateStaticParams()"`. La fonte di verità per gli slug è sempre `sezioniRisolte`, non `menuConfig.standardItems` direttamente.

`menu-config` (Global Payload) è un **Query Builder**: ogni sezione ha `filterMode` (`all`/`include`/`exclude`), `sourceCollection` (array di collection), e `targetCategories` (struttura polimorphic Payload). Se non configurato, le sezioni vengono generate automaticamente dalle categorie dei piatti.

Le sezioni vengono risolte a build-time da `resolveMenuSection()` in `api.ts` e salvate in `StaticMenuData.sezioniRisolte`. La pagina `/menu/[slug]` cerca direttamente in `sezioniRisolte` — non cerca la categoria nel DB.

---

## Mappa dei file chiave

| File | Responsabilità | Quando modificarlo |
|---|---|---|
| `app/page.tsx` | Home Indice (Server Component) | Raramente — solo per il fallback di errore |
| `app/menu/[slug]/page.tsx` | Pagina dettaglio categoria (Server Component) | Raramente — solo per il fallback di errore |
| `src/components/menu/HomeIndex.tsx` | Client Component per la Home Indice | Quando cambia il layout dell'indice |
| `src/components/menu/CategoryPage.tsx` | Client Component per la pagina dettaglio | Quando cambia il layout della pagina categoria |
| `src/types/payload-types.ts` | Tipi TypeScript per Payload + tipi derivati | Quando cambia lo schema del backend |
| `src/types/disponibilita.ts` | Tipo per il JSON GCS | Quando cambia la struttura del file di disponibilità |
| `src/lib/api.ts` | Fetcher build-time + client-side | Quando cambiano gli endpoint o la logica di fallback |
| `src/hooks/useTimekeeper.ts` | Logica temporale (apertura, slot) | Quando cambiano le regole di orario |
| `src/hooks/useMenuStructure.ts` | Logica strutturale (sezioni visibili) | Quando cambia la logica di visibilità sezioni |
| `src/context/MenuContext.tsx` | Stato globale client-side | Quando si aggiunge stato globale al menu |
| `app/globals.css` | Tema Tailwind v4 (`@theme`) | Quando si aggiungono colori, font o token |

---

## Come il sistema decide cosa mostrare

Tre livelli di decisione, eseguiti in sequenza:

```
1. QUANDO siamo?
   useTimekeeper(generali)
   └─ Orario browser + scheduleWeekly + exceptions + lunchSlot/dinnerSlot
   └─ Output: isOpen (bool), activeSlot ('lunch'|'dinner'|null), isHoliday (bool)

2. COSA mostriamo?
   useMenuStructure({ menuConfig, activeSlot, piatti, vini, sezioniRisolte })
   └─ Filtra sezioni per visibility ("always"/"lunch_only"/"dinner_only")
   └─ Usa sezioniRisolte già calcolate a build-time
   └─ Output: SezioneRisolta[] (sezioni con piatti già popolati)

3. COSA è disponibile?
   getRealTimeAvailability() → polling ogni 5 min
   └─ disponibilita.json su GCS → mappa id→stato
   └─ MenuSection filtra piatti con stato ≠ 'disponibile'
```

**Regola fondamentale:** se `activeSlot === null` (fuori orario di servizio), le sezioni con `visibility: 'lunch_only'` o `'dinner_only'` scompaiono. Rimangono solo quelle `'always'` (es. carta vini, bevande).

**Piatto esaurito = piatto invisibile.** Non viene mostrato con opacità ridotta o badge — viene rimosso dalla lista. Il filtro avviene in `MenuSection`, non in `DishCard`.

---

## Struttura dati reale del backend

> **CRITICO:** La struttura del backend è stata verificata via `curl` diretto. Non fare assunzioni — usa sempre i tipi in `src/types/payload-types.ts`.

### Piatto (struttura reale)

```typescript
{
  id: number,           // es. 202 — NUMERICO, non UUID
  nome: string,
  prezzo: number,
  descrizione?: string,
  inLista: boolean,     // true = visibile nel menu (non "attiva")
  soloMenuFissi: boolean,
  glutenFree: boolean,  // NON c'è tag[], i dietetici sono booleani separati
  noUovo: boolean,
  noLatticini: boolean,
  vegan: boolean,
  categoria: CategoriaMenu | number,  // embedded o id
  allergeni: (Allergene | number)[],
}
```

### Generali (struttura reale)

```typescript
{
  scheduleWeekly: Array<{
    day: "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday",
    isOpen: boolean,          // NON "aperto"
    hours: Array<{ start: string, end: string }>  // NON "apertura"/"chiusura"
  }>,
  lunchSlot: { start: string, end: string } | null,
  dinnerSlot: { start: string, end: string } | null,
  exceptions: Array<{
    date: string,             // NON "data"
    isClosed: boolean,        // NON "chiuso"
    description?: string,
  }>
}
```

### MenuConfig (struttura reale)

```typescript
{
  standardItems: Array<{
    id: string,               // ID Payload (stringa)
    label: string,            // NON "titolo"
    // slug NON esiste nel backend — generato da slugify(label)
    visibility: "always" | "lunch_only" | "dinner_only",  // NON "lunch"/"dinner"
    sourceCollection: string[],  // ARRAY, es. ["piatti"] o ["bevande","birre"]
    filterMode: "all" | "include" | "exclude",
    targetCategories: Array<{
      relationTo: string,     // es. "categoria-piatti"
      value: { id: number, nome: string, ... }  // popolato solo con ?depth=2
    }>
  }>,
  isActive: boolean,
  activeRange: { start: string | null, end: string | null },
  specialItems: unknown[]
}
```

> **IMPORTANTE:** `menu-config` deve essere fetchato con `?depth=2`, altrimenti `targetCategories.value` non viene popolato e il Query Builder non funziona.

### Categorie

**Non hanno endpoint REST proprio.** Vengono estratte a build-time dai piatti (`piatto.categoria` è embedded). Lo slug viene generato con `slugify(nome)`.

### Globals — comportamento di fallback

| Scenario | Comportamento |
|---|---|
| Backend risponde 500 | `fetchGlobalSafe` restituisce `null` → fallback |
| Backend risponde `{}` (configurato ma vuoto) | Trattato come `null` → fallback |
| `standardItems` è array vuoto | Sezioni auto-generate dalle categorie dei piatti |

---

## Relazioni tra i componenti

### Home Indice (`/`)

```
app/page.tsx (Server)
  └─ getStaticMenuData() → StaticMenuData
  └─ <HomeIndex staticData={...} />

HomeIndex (Client)
  └─ <MenuProvider menuConfig generali piatti vini sezioniRisolte>
       └─ useTimekeeper(generali) → status
       └─ useMenuStructure → sections (filtrate per slot)
       └─ getRealTimeAvailability → availability
       └─ <IndexContent>
            ├─ <MenuHeader />
            ├─ sections.map(sezione =>
            │    <SectionCard slug titolo numeroPiatti />
            │      └─ <Link href="/menu/[slug]"> → naviga alla categoria
            │  )
            └─ <MenuFooter />
```

### Pagina Dettaglio (`/menu/[slug]`)

```
app/menu/[slug]/page.tsx (Server)
  └─ generateStaticParams() → slug da standardItems (via slugify(label))
  └─ getStaticMenuData() → StaticMenuData
  └─ cerca sezione in sezioniRisolte per slug
  └─ <CategoryPage staticData sezione />

CategoryPage (Client)
  └─ <MenuProvider menuConfig generali piatti vini>
       └─ getRealTimeAvailability → availability
       └─ <CategoryContent sezione>
            ├─ <MenuHeader />
            ├─ <BackButton /> → Link href="/"
            ├─ <MenuSection categoria={virtuale} piatti={sezione.piatti} availability />
            │    └─ piattiVisibili.map(piatto =>
            │         <DishCard piatto />
            │       )
            └─ <MenuFooter />
```

**Regola:** `sezione.piatti` contiene già i piatti filtrati dal Query Builder (filterMode + targetCategories). `MenuSection` filtra ulteriormente per disponibilità real-time. `DishCard` non sa nulla di disponibilità.

**Regola:** `MenuProvider` è presente in **entrambe** le pagine. È necessario anche nella pagina dettaglio per il polling della disponibilità real-time.

---

## Regole di codice da rispettare

### TypeScript

- Nessun `any`. Usa `unknown` se il tipo è davvero sconosciuto.
- Gli id di Payload sono **numerici** (`number`), non UUID stringhe.
- I campi relazione di Payload possono essere oggetto popolato **o** id numerico: `categoria: CategoriaMenu | number`.
- `targetCategories` usa la struttura polimorphic: `{ relationTo: string, value: { id: number, nome: string } }`.
- Importa sempre i tipi da `@/types` (mai percorsi relativi per i tipi).
- `fetch` nativo — nessuna libreria HTTP esterna.

### Componenti

- `"use client"` solo dove serve interattività o hook React. Tutto il resto è Server Component.
- Non ricreare la struttura visiva di `DishCard` — importa e usa il componente esistente.
- Per una nuova card (es. vino), crea `WineCard` seguendo lo stesso pattern di `DishCard`.
- Non aggiungere bordi, background o shadow ai wrapper di `MenuSection` — layout aperto.

### Design System

- Sfondo pagina: **sempre** `bg-background` (`#FFEDD7`). Mai `bg-white`.
- **Liste piatti: usa sempre lo stile Minimal B2** — nessun sfondo, separatore `border-b border-surface-dark/20` (bordeaux 20%, 1px). Non usare card bianche (`bg-surface`), bordi oro (`border-accent-gold`) né bordi arancioni spessi (`border-b-2 border-accent-orange`).
- Badge `allergen`: **solo** per allergeni. Badge `highlight`: per vantaggi dietetici e tag promozionali.
- Usa `<Heading>` e `<Text>` — mai `font-serif`/`font-sans` su HTML grezzo.
- Tema Tailwind: modifica **solo** `app/globals.css` nel blocco `@theme`.
- Header: usa `bg-background` con `text-surface-dark` (bordeaux su crema). **Non usare `bg-surface-dark` per l'header.**
- Footer: usa `bg-text-main` (Blu Notte) con `text-text-light` e `text-accent-gold` **esclusivamente**. **Non usare `bg-surface-dark`.**
- `surface-dark` è **solo** un colore di testo (`text-surface-dark`) — mai uno sfondo.

**⛔ Safety Check — Contrasto colori (OBBLIGATORIO prima di generare codice UI):**

Prima di scrivere qualsiasi classe CSS/Tailwind, verifica sempre:

| Se lo sfondo è... | Il testo DEVE essere... |
|---|---|
| `bg-text-main` (#080F2C) | `text-text-light` o `text-accent-gold` — MAI `text-text-main` |
| `bg-background` (#FFEDD7) | `text-text-main`, `text-text-muted` o `text-surface-dark` |
| `bg-surface` (#FFFFFF) | `text-text-main` o `text-text-muted` |

**`surface-dark` (#460112) non viene mai usato come sfondo** (`bg-surface-dark`). È usato solo come colore di testo (`text-surface-dark`) per titoli bordeaux su crema. Footer e navbar usano `bg-text-main` (Blu Notte). Non usare mai `bg-surface-dark` in nessun componente.

---

## Come aggiungere funzionalità

### Nuova collection Payload

1. Aggiungi l'interfaccia in `src/types/payload-types.ts`.
2. Aggiungi il tipo a `StaticMenuData` se serve a build-time.
3. Aggiungi `fetchAllDocs<NuovoTipo>("slug")` in `getStaticMenuData()` dentro `Promise.all`.
4. Aggiorna `resolveMenuSection()` in `api.ts` per gestire la nuova `sourceCollection`.

### Nuova sezione del menu

Le sezioni sono configurate nel CMS (Global `menu-config`, campo `standardItems`). Non richiedono modifiche al codice frontend. Il campo `visibility` controlla quando la sezione è visibile (`always`/`lunch_only`/`dinner_only`).

La nuova sezione comparirà automaticamente:
1. Nell'indice Home come `SectionCard` cliccabile.
2. Come pagina `/menu/[slug]` pre-renderizzata a build-time (grazie a `generateStaticParams`).

> **Nota:** lo slug viene generato da `slugify(label)`. Se `label` cambia nel CMS, lo slug cambia e i link precedenti diventano 404.

### Nuovo stato globale

Aggiungi il campo a `MenuContextValue` in `src/context/MenuContext.tsx`, aggiornalo nel `useMemo` del valore e nel `MenuProvider`.

### Nuovo componente di dominio

1. Crea il file in `src/components/menu/NomeComponente.tsx`.
2. Esportalo dal barrel `src/components/menu/index.ts`.
3. Segui lo stile Minimal (nessun sfondo, separatore bordeaux).
4. Se mostra dati di un piatto, usa `DishCard` invece di ricreare la struttura.

---

## Graceful degradation

Il sistema è progettato per non crashare mai in produzione:

| Scenario | Comportamento |
|---|---|
| Backend Payload irraggiungibile a build-time | Build fallisce esplicitamente (errore chiaro in CI) |
| Global `menu-config` → 500 o `{}` | Fallback hardcoded, build continua |
| Global `generali` → 500 o `{}` | Fallback hardcoded, build continua |
| `menu-config.standardItems` vuoto | Sezioni auto-generate dalle categorie dei piatti |
| `menu-config` fetchato senza `?depth=2` | `targetCategories.value` è `undefined` → sezioni vuote |
| GCS irraggiungibile a runtime | `availability = null` → tutto mostrato come disponibile |
| Sezione con tutti i piatti esauriti | `MenuSection` restituisce `null` → sezione invisibile |
| Ristorante chiuso | Banner discreto nell'header, menu consultabile |
| `sourceCollection` non supportata (es. "bevande") | `resolveMenuSection` restituisce sezione vuota, non crasha |
