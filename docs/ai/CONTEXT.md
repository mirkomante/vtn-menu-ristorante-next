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
/menu/[slug]         → CategoryPage: lista voci di una sezione virtuale
```

L'utente scansiona il QR code → vede l'indice delle sezioni → clicca su una sezione → vede le voci (piatti, vini, bevande, ecc.). Le sezioni fuori orario (es. "Pranzo" di sera) non compaiono nell'indice.

**Il routing è guidato da `menu-config.standardItems`, non dalla tassonomia del DB.**
Lo slug `/menu/[slug]` corrisponde a una "Sezione Virtuale" configurata nel CMS. **Gli slug non esistono nel backend**: vengono generati a build-time con `slugify(label)` in `normalizeStandardItems()`.

> **⚠️ Regola SSG obbligatoria:** Le pagine dinamiche `/menu/[slug]` sono pre-calcolate a build-time. Se aggiungi una nuova rotta dinamica (`[param]`), **devi** esportare `generateStaticParams` che restituisce tutti i valori possibili del parametro. Senza di essa la build con `output: 'export'` fallisce con l'errore `"Page is missing param in generateStaticParams()"`. La fonte di verità per gli slug è sempre `sezioniRisolte`, non `menuConfig.standardItems` direttamente.

`menu-config` (Global Payload) è un **Query Builder**: ogni sezione ha `filterMode` (`all`/`include`/`exclude`), `sourceCollection` (array di collection), e `targetCategories` (struttura polimorphic Payload). Se non configurato, le sezioni vengono generate automaticamente dalle categorie dei piatti.

Le sezioni vengono risolte a build-time da `resolveMenuSection()` in `api.ts` e salvate in `StaticMenuData.sezioniRisolte`. La pagina `/menu/[slug]` cerca direttamente in `sezioniRisolte` — non cerca la categoria nel DB.

`resolveMenuSection()` usa una logica **Multi-Source Additiva**: itera su ogni sorgente in `sourceCollection` in modo indipendente, applica il filtro corretto per quella sorgente (estraendo da `targetCategories` solo i ref con il `relationTo` pertinente, es. `"categoria-piatti"` per i piatti e `"categoria-vini"` per i vini), converte gli item in `MenuItem`, poi unisce tutto in un unico array ordinato. Questo supporta sezioni miste come `["piatti", "vini"]` o `["bevande", "birre"]` con filtri specifici per ciascun tipo di dato. L'unica eccezione è `"menu-fisso"`, gestita separatamente perché `MenuFisso` ha struttura diversa da `MenuItem`.

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
| `src/lib/api.ts` | Fetcher build-time + client-side + Query Builder | Quando cambiano gli endpoint o la logica di filtro |
| `src/hooks/useTimekeeper.ts` | Logica temporale (apertura, slot) | Quando cambiano le regole di orario |
| `src/hooks/useMenuStructure.ts` | Logica strutturale (sezioni visibili per slot e giorno) | Quando cambia la logica di visibilità sezioni |
| `src/components/menu/LexicalRenderer.tsx` | Parser Lexical Rich Text → React | Quando si aggiungono nuovi tipi di nodo Lexical |
| `src/context/MenuContext.tsx` | Stato globale client-side | Quando si aggiunge stato globale al menu |
| `app/globals.css` | Tema Tailwind v4 (`@theme`) | Quando si aggiungono colori, font o token |

---

## Tipo unione `MenuItem` — concetto centrale

Tutte le voci del menu (piatti, vini, bevande, birre, liquori) vengono normalizzate in un unico tipo discriminato a build-time:

```typescript
type MenuItem =
  | (Piatto   & { _type: "piatto" })
  | (Vino     & { _type: "vino" })
  | (Bevanda  & { _type: "bevanda" })
  | (Birra    & { _type: "birra" })
  | (Liquore  & { _type: "liquore" });
```

Il campo `_type` è aggiunto da `api.ts` (funzioni `piattoToItem`, `vinoToItem`, ecc.) — **non esiste nel backend**.

`SezioneRisolta.groups: MenuItemGroup[]` contiene i gruppi di item già ordinati e raggruppati secondo il global `ordinamento-menu`. I menu fissi (pranzo, degustazione) hanno struttura diversa (`MenuFisso`) e vengono renderizzati con `MenuFissoCard` tramite `SezioneRisolta.menuFissi: MenuFisso[]`.

**Struttura `MenuItemGroup`:**
```typescript
interface MenuItemGroup {
  title?: string;    // es. "Toscana", "Rossi" — assente se groupBy === "nessuno"
  items: MenuItem[];
}
```

**Lista piatta** = `[{ items: [...] }]` (un gruppo senza titolo). **Lista raggruppata** = `[{ title: "Toscana", items: [...] }, ...]`.

**Regola:** usa `MenuFissoCard` per i menu strutturati a prezzo fisso, `DishCard` polimorfica per tutto il resto (`MenuItem`). Non passare mai un `Piatto` grezzo a `DishCard` — aggiungere `_type: "piatto"` prima.

**`DishCard` è polimorfica:** usa `item._type` per mostrare body diverso per tipo:
- `piatto`: descrizione + badge dietetici (highlight) + allergeni (allergen) + prezzo alternativo
- `vino`: descrizione + info tecnica (cantina, annata, grado) + badge tipologia/capacità + prezzo calice
- `birra` / `liquore`: descrizione + info (grado, capacità, invecchiamento) + badge tipologia
- `bevanda`: descrizione + badge tipologia

**`MenuFissoCard`** mostra: nome + prezzo totale, descrizione (italic), lista piatti inclusi (rientrata), servizi aggiuntivi (badge). Richiede che `menu-fisso` sia fetchato con `?depth=2` per avere `piatti` e `servizi` popolati.

**`MenuSection`** accetta `groups: MenuItemGroup[]` e `menuFissi: MenuFisso[]`. Le sezioni possono essere raggruppate (es. Vini per Regione). Il componente `MenuSection` gestisce questo rendering gerarchico: se un gruppo ha `title`, renderizza un sottotitolo `h3` sticky; altrimenti lista piatta senza sottotitolo. I menu fissi vengono mostrati prima dei gruppi di item. Se entrambi sono vuoti, restituisce `null`.

---

## Global `ordinamento-menu` — Sort e Raggruppamento

Il global `ordinamento-menu` configura come ogni collection viene **ordinata** e **raggruppata** nel menu. Viene fetchato a build-time con `depth=1` e `cache: "no-store"`, poi passato a `resolveMenuSection()`.

> **Stato attuale (verificato):** il backend risponde `200 OK` con dati completi. Il global è configurato e attivo.

**Struttura reale del backend — campi flat con prefisso collection + array ordinati:**

```json
{
  "piattiOrderBy": "nome",       "piattiOrderDirection": "asc",  "piattiGroupBy": "nessuno",
  "categoriePiatti": [
    { "id": 26, "nome": "Involtini", "elementi": { "docs": [201, 200, 189, ...] } },
    { "id": 27, "nome": "Primi",     "elementi": { "docs": [198, 197, ...] } },
    { "id": 29, "nome": "Specialità pesce", "elementi": { "docs": [...] } },
    { "id": 28, "nome": "Specialità carne", "elementi": { "docs": [...] } },
    { "id": 30, "nome": "Specialità vegetariane", "elementi": { "docs": [...] } }
  ],
  "viniOrderBy": "regione",      "viniOrderDirection": "asc",    "viniGroupBy": "nazione",
  "tipologieVino": [
    { "id": 21, "nome": "Bianchi" }, { "id": 23, "nome": "Rosati" },
    { "id": 24, "nome": "Rossi" },   { "id": 25, "nome": "Spumanti" },
    { "id": 22, "nome": "Champagne" }
  ],
  "liquoriOrderBy": "nome",      "liquoriOrderDirection": "asc", "liquoriGroupBy": "nazione",
  "tipologieLiquore": [
    { "id": 31, "nome": "Distillati vietnamiti" }, { "id": 29, "nome": "Amari e Liquori" },
    { "id": 32, "nome": "Grappe" }, { "id": 34, "nome": "Vin Doux Naturel" },
    { "id": 30, "nome": "Calvados" }, { "id": 35, "nome": "Whisky" }, { "id": 33, "nome": "Rum" }
  ],
  "birreOrderBy": "order",       "birreOrderDirection": "asc",   "birreGroupBy": "nessuno",
  "tipologieBirra": [],
  "bevandeOrderBy": "order",     "bevandeOrderDirection": "asc", "bevandeGroupBy": "nessuno",
  "tipologieBevanda": []
}
```

**Default se il global non è configurato:** `orderBy: "order"`, `orderDirection: "asc"`, `groupBy: "nessuno"` (lista piatta).

**Valori `orderBy` disponibili** — alcuni corrispondono a campi annidati:
- `"order"` → `ordine` (numerico, ordine manuale CMS) — **il campo `order` è stato rimosso dagli item singoli; l'ordinamento è centralizzato nel global**
- `"nome"` → `nome`
- `"prezzo"` → `prezzo`
- `"regione"` → `regione.nome` (campo annidato, usato per vini)
- `"nazione"` → `nazione.nome` (campo annidato)
- `"tipologia"` → `tipologia.nome` (campo annidato)
- `"categoria"` → `categoria.nome` (campo annidato)

**Campi `groupBy` disponibili:**
- `"nessuno"` → lista piatta (un gruppo senza titolo)
- `"categoria"` → raggruppa per `categoria.nome` (piatti)
- `"tipologia"` → raggruppa per `tipologia.nome` (vini, birre, bevande, liquori)
- `"regione"` → raggruppa per `regione.nome` (vini)
- `"nazione"` → raggruppa per `nazione.nome` (vini, birre, liquori, bevande)

**Item senza valore nel campo di raggruppamento** → finiscono nel gruppo **"Altro"** (sempre in fondo).

**Regola:** la `primarySource` (prima sorgente non-`menu-fisso` in `sourceCollection`) determina quale prefisso usare (es. `vini` → legge `viniOrderBy`, `viniGroupBy`). Per sezioni multi-source (es. `["bevande", "birre"]`), si usano le regole della prima sorgente (`bevande`).

**Logica di priorità per il raggruppamento (`applyOrdinamento`) — due path:**

**Path 1 — Array ordinato CMS (fonte di verità, priorità assoluta):**
Se `ordinamento` contiene l'array per la `primarySource` (`categoriePiatti`, `tipologieVino`, ecc.) → usa quello come driver dell'ordine dei gruppi. Il `groupBy` configurato viene ignorato.

Per i **piatti**: se la categoria ha `elementi.docs`, quell'array definisce anche l'ordine interno dei piatti nel gruppo (ordine esplicito CMS). Altrimenti si usa `piattiOrderBy` come sort di fallback.

Per **vini/liquori/birre/bevande**: filtra per `tipologia.id`, ordina gli item interni con `{collection}OrderBy`.

**Path 2 — Raggruppamento dinamico automatico (fallback):**
Se l'array non è presente o è vuoto, usa `groupBy` + `groupItems` (raggruppamento per campo, ordine alfabetico dei gruppi).

Item non assegnati a nessun gruppo → **"Altro"** (sempre in fondo).

## Come il sistema decide cosa mostrare

Tre livelli di decisione, eseguiti in sequenza:

```
1. QUANDO siamo?
   useTimekeeper(generali)
   └─ Orario browser + scheduleWeekly + exceptions + lunchSlot/dinnerSlot
   └─ Output: isOpen (bool), activeSlot ('lunch'|'dinner'|null), isHoliday (bool)

2. COSA mostriamo?
   useMenuStructure({ sezioniRisolte, menuConfig, activeSlot })
   └─ Filtra sezioniRisolte (già pronte dalla build) per visibility/activeDays
   └─ NON ricalcola sort/group — usa i dati pre-calcolati
   └─ Output: SezioneRisolta[] (filtrate per slot/giorno)

3. COSA è disponibile?
   getRealTimeAvailability() → polling ogni 5 min
   └─ disponibilita.json su GCS → mappa id→stato
   └─ MenuSection filtra items con _type==="piatto" e stato ≠ 'disponibile'
```

**Regola fondamentale:** se `activeSlot === null` (fuori orario di servizio), le sezioni con `visibility: 'lunch_only'` o `'dinner_only'` scompaiono. Rimangono solo quelle `'always'` (es. carta vini, bevande).

**Regola `activeDays`:** la visibilità delle sezioni dipende ora anche da `activeDays` (giorno della settimana), oltre che dallo slot orario. Se una sezione ha `activeDays` definito e non vuoto, viene nascosta nei giorni non inclusi nell'array — **indipendentemente** dal valore di `visibility`. Il controllo `activeDays` ha priorità su `visibility` e viene eseguito per primo in `isSectionVisible()` dentro `useMenuStructure.ts`.

**Piatto esaurito = piatto invisibile.** Non viene mostrato con opacità ridotta o badge — viene rimosso dalla lista. Il filtro avviene in `MenuSection` (solo per `_type === "piatto"`), non in `DishCard`. Vini e bevande sono sempre visibili.

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

### Vino (struttura reale)

```typescript
{
  id: number,
  nome: string,
  prezzo: number,
  prezzoCalice?: number | null,  // prezzo al calice separato
  tipologia: TipologiaVino | number,  // embedded o id
  cantina?: string,
  anno?: string,
  capacita?: string,
  grado?: string,
  inLista: boolean,
}
```

### Bevanda (struttura reale — collection "bevande")

```typescript
{
  id: number,
  nome: string,
  prezzo: number,
  descrizione?: string,
  tipologia: TipologiaBevanda | number,  // es. "Calde", "Vietnamite"
  nazione?: number | null,
  inLista: boolean,
}
```

### Birra (struttura reale — collection "birre")

```typescript
{
  id: number,
  nome: string,
  prezzo: number,
  tipologia: TipologiaBevanda | number,  // es. "Lager"
  grado?: string,
  capacita?: string,
  nazione?: number | null,
  inLista: boolean,
}
```

### Liquore / Distillato (struttura reale — collection "liquori")

```typescript
{
  id: number,
  nome: string,
  prezzo: number,
  tipologia: TipologiaBevanda | number,  // es. "Rum", "Whisky"
  grado?: string,
  capacita?: string,
  invecchiamento?: string,
  nazione?: number | null,
  inLista: boolean,
}
```

### MenuFisso (struttura reale — collection "menu-fisso")

```typescript
{
  id: number,
  nome: string,
  prezzo: number,
  descrizione?: string,
  inLista: boolean,
  categoria: CategoriaMenuFisso | number,  // es. "Business lunch", "Degustazione"
  piatti: (Piatto | number)[],   // piatti inclusi nel menu
  servizi?: (ServizioMenuFisso | number)[],  // es. coperto
}
```

> **Nota:** `menu-fisso` deve essere fetchato con `?depth=2` per avere `categoria` e `piatti` popolati.

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
      relationTo: string,     // es. "categoria-piatti", "categoria-menu-fisso"
      value: { id: number, nome: string, ... }  // popolato solo con ?depth=2
    }>,
    activeDays?: GiornoSettimana[],  // opzionale — giorni attivi (es. ["monday","tuesday"])
  }>,
  isActive: boolean,
  activeRange: { start: string | null, end: string | null },
  logo?: PayloadMedia | number | null,  // logo del ristorante
  title?: string,                       // titolo personalizzato del menu (fallback: nomeRistorante)
  annotazione?: LexicalRoot | null,     // Rich Text Lexical per note/avvisi nel footer
}
```

> **IMPORTANTE:** `menu-config` deve essere fetchato con `?depth=2`, altrimenti `targetCategories.value` non viene popolato e il Query Builder non funziona.

### Categorie

**Non hanno endpoint REST proprio.** Vengono estratte a build-time dai piatti (`piatto.categoria` è embedded). Lo slug viene generato con `slugify(nome)`.

### `fetchGlobalSafe` — firma e comportamento

```typescript
fetchGlobalSafe<T>(globalSlug: string, depth = 2, noCache = false): Promise<T | null>
```

- `depth`: profondità relazioni (default `2`). Usare `1` per `ordinamento-menu` (relazioni semplici).
- `noCache`: se `true`, usa `cache: "no-store"` invece di `next: { revalidate: 3600 }`. Attivo per `ordinamento-menu` per evitare che la cache Next.js serva risposte obsolete.

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
  └─ <MenuProvider menuConfig generali piatti vini menuFissi bevande birre liquori>
       └─ useTimekeeper(generali) → status
       └─ useMenuStructure → sections (filtrate per slot)
       └─ getRealTimeAvailability → availability
       └─ <IndexContent>
            ├─ <MenuHeader />
            ├─ sections.map(sezione =>
            │    <SectionCard slug titolo numeroItems />
            │      └─ <Link href="/menu/[slug]"> → naviga alla categoria
            │  )
            └─ <MenuFooter />
```

### Pagina Dettaglio (`/menu/[slug]`)

```
app/menu/[slug]/page.tsx (Server)
  └─ generateStaticParams() → slug da sezioniRisolte
  └─ getStaticMenuData() → StaticMenuData
  └─ cerca sezione in sezioniRisolte per slug
  └─ <CategoryPage staticData sezione />

CategoryPage (Client)
  └─ <MenuProvider sezioniRisolte menuConfig generali>
       └─ getRealTimeAvailability → availability
       └─ <CategoryContent sezione>
            ├─ <MenuHeader />
            ├─ <BackButton /> → Link href="/"
            ├─ sezione.groups.length > 0 →
            │    <MenuSection groups={sezione.groups} availability />
            │      └─ groups.map(group =>
            │           group.title → <h3 sticky>
            │           group.items.filter(disponibile).map(item => <DishCard item />)
            │         )
            ├─ sezione.menuFissi.length > 0 →
            │    layout dedicato con nome + prezzo per ogni MenuFisso
            └─ <MenuFooter />
```

**Regola:** `sezione.groups` contiene già le voci filtrate dal Query Builder, ordinate e raggruppate secondo `OrdinamentoMenu` — calcolate a **build-time** e mai ricalcolate a runtime. `MenuSection` filtra ulteriormente per disponibilità real-time (solo `_type === "piatto"`). `DishCard` non sa nulla di disponibilità. `MenuFissoCard` non ha logica di disponibilità — i menu fissi sono sempre visibili.

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
- **Non passare `Piatto` grezzo a `DishCard` o `MenuSection`** — usa sempre `MenuItem` con `_type` aggiunto.

### Componenti

- `"use client"` solo dove serve interattività o hook React. Tutto il resto è Server Component.
- Non ricreare la struttura visiva di `DishCard` — importa e usa il componente esistente.
- `DishCard` accetta `item: MenuItem` (non `piatto: Piatto`). `MenuSection` accetta `groups: MenuItemGroup[]` (non `items: MenuItem[]` direttamente).
- Non aggiungere bordi, background o shadow ai wrapper di `MenuSection` — layout aperto.

### Design System

- Sfondo pagina: **sempre** `bg-background` (`#FFEDD7`). Mai `bg-white`.
- **Liste piatti: usa sempre lo stile Minimal B2** — nessun sfondo, separatore `border-b border-surface-dark/20` (bordeaux 20%, 1px). Non usare card bianche (`bg-surface`), bordi oro (`border-accent-gold`) né bordi arancioni spessi (`border-b-2 border-accent-orange`).
- Badge `allergen`: **solo** per allergeni. Badge `highlight`: per vantaggi dietetici e tag promozionali. Badge `default`: per info neutre (tipologia vino, capacità, grado alcolico).
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
4. Aggiungi la funzione `nuovoTipoToItem()` in `api.ts` che aggiunge `_type`.
5. Aggiorna `resolveMenuSection()` in `api.ts` per gestire la nuova `sourceCollection`.
6. Propaga il nuovo array attraverso `MenuProvider` → `useMenuStructure`.

### Nuova sezione del menu

Le sezioni sono configurate nel CMS (Global `menu-config`, campo `standardItems`). Non richiedono modifiche al codice frontend. Il campo `visibility` controlla quando la sezione è visibile (`always`/`lunch_only`/`dinner_only`). Il campo `activeDays` (opzionale) limita ulteriormente la visibilità ai soli giorni specificati.

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
4. Se mostra voci del menu, usa `DishCard` con `item: MenuItem` invece di ricreare la struttura.

---

## Graceful degradation

Il sistema è progettato per non crashare mai in produzione:

| Scenario | Comportamento |
|---|---|
| Backend Payload irraggiungibile a build-time | Build fallisce esplicitamente (errore chiaro in CI) |
| Global `menu-config` → 500 o `{}` | Fallback hardcoded, build continua |
| Global `generali` → 500 o `{}` | Fallback hardcoded, build continua |
| Global `ordinamento-menu` → 500 o `{}` | Fallback `{}` → default (`orderBy: "order"`, `groupBy: "nessuno"`) |
| `menu-config.standardItems` vuoto | Sezioni auto-generate dalle categorie dei piatti |
| `menu-config` fetchato senza `?depth=2` | `targetCategories.value` è `undefined` → sezioni vuote |
| GCS irraggiungibile a runtime | `availability = null` → tutto mostrato come disponibile |
| Sezione con tutti i piatti esauriti | `MenuSection` restituisce `null` → sezione invisibile |
| Ristorante chiuso | Banner discreto nell'header, menu consultabile |
| `sourceCollection` con sorgente non supportata (es. nuova collection futura) | `resolveMenuSection` logga un warning e ignora quella sorgente, le altre vengono processate normalmente |
