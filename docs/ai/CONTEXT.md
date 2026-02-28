# Contesto per Agenti AI — Menu Digitale VTN

Questo documento è scritto per agenti AI che lavorano su questo codebase. Contiene il "perché" delle scelte architetturali, le relazioni tra i componenti e le regole da rispettare.

---

## Cos'è questo progetto

Un menu digitale statico per il ristorante **Vietnamonamour** (Milano). Il cliente scansiona un QR code e vede il menu aggiornato in tempo reale sul proprio telefono.

**Vincolo principale:** Firebase Hosting Free Tier → nessun server Node.js a runtime → tutto deve essere HTML statico generato a build-time (SSG).

**Eccezione:** la disponibilità dei piatti (esaurito/disponibile) cambia durante il servizio → viene fetchata lato client ogni 5 minuti da un file JSON su Google Cloud Storage.

---

## Mappa dei file chiave

| File | Responsabilità | Quando modificarlo |
|---|---|---|
| `src/types/payload-types.ts` | Tipi TypeScript per Payload + tipi derivati | Quando cambia lo schema del backend |
| `src/types/disponibilita.ts` | Tipo per il JSON GCS | Quando cambia la struttura del file di disponibilità |
| `src/lib/api.ts` | Fetcher build-time + client-side | Quando cambiano gli endpoint o la logica di fallback |
| `src/hooks/useTimekeeper.ts` | Logica temporale (apertura, slot) | Quando cambiano le regole di orario |
| `src/hooks/useMenuStructure.ts` | Logica strutturale (sezioni visibili) | Quando cambia la logica di visibilità sezioni |
| `src/context/MenuContext.tsx` | Stato globale client-side | Quando si aggiunge stato globale al menu |
| `app/globals.css` | Tema Tailwind v4 (`@theme`) | Quando si aggiungono colori, font o token |
| `app/page.tsx` | Entry point Server Component | Raramente — solo per cambiare il fallback di errore |

---

## Come il sistema decide cosa mostrare

Tre livelli di decisione, eseguiti in sequenza:

```
1. QUANDO siamo?
   useTimekeeper(generali)
   └─ Orario browser + orari settimanali + eccezioni
   └─ Output: isOpen (bool), activeSlot ('lunch'|'dinner'|null), isHoliday (bool)

2. COSA mostriamo?
   useMenuStructure({ menuConfig, activeSlot, piatti, vini })
   └─ Filtra sezioni per visibility (lunch/dinner/always)
   └─ Risolve piatti per categoria o specialItems
   └─ Output: SezioneRisolta[] (sezioni con piatti già popolati)

3. COSA è disponibile?
   getRealTimeAvailability() → polling ogni 5 min
   └─ disponibilita.json su GCS → mappa id→stato
   └─ MenuSection filtra piatti con stato ≠ 'disponibile'
```

**Regola fondamentale:** se `activeSlot === null` (fuori orario di servizio), le sezioni con `visibility: 'lunch'` o `'dinner'` scompaiono. Rimangono solo quelle `'always'` (es. carta vini, bevande).

**Piatto esaurito = piatto invisibile.** Non viene mostrato con opacità ridotta o badge — viene rimosso dalla lista. Il filtro avviene in `MenuSection`, non in `DishCard`.

---

## Relazioni tra i componenti

```
app/page.tsx (Server)
  └─ getStaticMenuData() → StaticMenuData
  └─ <MenuOrchestrator staticData={...} />

MenuOrchestrator (Client)
  └─ <MenuProvider menuConfig generali piatti vini>
       └─ useTimekeeper → status
       └─ useMenuStructure → sections
       └─ getRealTimeAvailability → availability
       └─ <MenuContent>
            ├─ <MenuHeader menuConfig generali status />
            ├─ <StickyNav categorie activeSlug onCategoryChange />
            ├─ sections.map(sezione =>
            │    <MenuSection categoria piatti availability />
            │      └─ piattiVisibili.map(piatto =>
            │           <DishCard piatto />
            │         )
            │  )
            └─ <MenuFooter menuConfig />
```

**Regola:** `DishCard` non sa nulla di disponibilità — riceve solo piatti già filtrati. `MenuSection` è il guardiano che decide quali piatti passare.

---

## Struttura dati reale del backend

> Gli id sono **numerici** (`number`), non UUID stringhe. Questo è diverso dal default di Payload — è la struttura verificata via API.

### Piatto (struttura reale)

```typescript
{
  id: number,           // es. 202
  nome: string,
  prezzo: number,
  descrizione?: string,
  inLista: boolean,     // true = visibile nel menu
  soloMenuFissi: boolean,
  glutenFree: boolean,  // NON c'è tag[], i dietetici sono booleani separati
  noUovo: boolean,
  noLatticini: boolean,
  vegan: boolean,
  categoria: CategoriaMenu | number,  // embedded o id
  allergeni: (Allergene | number)[],
}
```

### Categorie

**Non hanno endpoint REST proprio.** Vengono estratte a build-time dai piatti (`piatto.categoria` è embedded). Lo slug viene generato con `slugify(nome)`.

### Globals (menu-config, generali)

Possono rispondere con 500 se non ancora configurati nel CMS. `fetchGlobalSafe()` gestisce questo restituendo `null` → si usano i fallback hardcoded. Se `menu-config.sezioni` è vuoto, le sezioni vengono generate automaticamente dalle categorie.

---

## Regole di codice da rispettare

### TypeScript

- Nessun `any`. Usa `unknown` se il tipo è davvero sconosciuto.
- I campi relazione di Payload possono essere oggetto popolato **o** id numerico: `categoria: CategoriaMenu | number`.
- Importa sempre i tipi da `@/types` (mai percorsi relativi per i tipi).
- `fetch` nativo — nessuna libreria HTTP esterna.

### Componenti

- `"use client"` solo dove serve interattività o hook React. Tutto il resto è Server Component.
- Non ricreare la struttura visiva di `DishCard` — importa e usa il componente esistente.
- Per una nuova card (es. vino), crea `WineCard` seguendo lo stesso pattern di `DishCard`.
- Non aggiungere bordi, background o shadow ai wrapper di `MenuSection` — layout aperto.

### Design System

- Sfondo pagina: **sempre** `bg-background` (`#FFEDD7`). Mai `bg-white`.
- Separatore tra piatti: **sempre** `border-b border-surface-dark/20` (stile B2).
- Su sfondo scuro: **sempre** `text-text-light` o `text-accent-gold`. Mai `text-text-main`.
- Badge `allergen`: **solo** per allergeni. Badge `highlight`: per vantaggi dietetici e tag promozionali.
- Usa `<Heading>` e `<Text>` — mai `font-serif`/`font-sans` su HTML grezzo.
- Tema Tailwind: modifica **solo** `app/globals.css` nel blocco `@theme`.

---

## Come aggiungere funzionalità

### Nuova collection Payload

1. Aggiungi l'interfaccia in `src/types/payload-types.ts`.
2. Aggiungi il tipo a `StaticMenuData` se serve a build-time.
3. Aggiungi `fetchAllDocs<NuovoTipo>("slug")` in `getStaticMenuData()` dentro `Promise.all`.

### Nuova sezione del menu

Le sezioni sono configurate nel CMS (Global `menu-config`, campo `sezioni`). Non richiedono modifiche al codice frontend. Il campo `visibility` controlla quando la sezione è visibile (`lunch`/`dinner`/`always`).

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
| Global `menu-config` o `generali` → 500 | Fallback hardcoded, build continua |
| GCS irraggiungibile a runtime | `availability = null` → tutto mostrato come disponibile |
| Sezione con tutti i piatti esauriti | `MenuSection` restituisce `null` → sezione invisibile |
| Ristorante chiuso | Banner discreto nell'header, menu consultabile |
