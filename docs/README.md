# Documentazione — Menu Digitale VTN

Benvenuto nella documentazione del progetto. I documenti sono organizzati per target.

---

## Per sviluppatori

| Documento | Contenuto |
|---|---|
| [GETTING_STARTED.md](./dev/GETTING_STARTED.md) | Setup ambiente, installazione, comandi (`dev`, `build`, `deploy`), struttura cartelle |
| [ARCHITECTURE.md](./dev/ARCHITECTURE.md) | Architettura SSG, flusso dati Payload → Firebase → GCS, gestione fallback, convenzioni TypeScript |
| [DESIGN_SYSTEM.md](./dev/DESIGN_SYSTEM.md) | Palette colori, font, componenti UI atom, pattern Minimal, regole di stile |

## Per Agenti AI

| Documento | Contenuto |
|---|---|
| [CONTEXT.md](./ai/CONTEXT.md) | Obiettivi di business, logica "Cervello" (Timekeeper + MenuStructure), mappa file chiave, regole di codice, graceful degradation |

---

## Dove trovare cosa — guida rapida

| Domanda | Documento |
|---|---|
| Come avvio il progetto? | [GETTING_STARTED.md](./dev/GETTING_STARTED.md) |
| Perché SSG e non SSR? | [ARCHITECTURE.md](./dev/ARCHITECTURE.md) |
| Quali endpoint usa il backend? | [ARCHITECTURE.md](./dev/ARCHITECTURE.md#struttura-dei-dati-backend-payloadcms) |
| Come funziona `menu-config` (Query Builder)? | [ARCHITECTURE.md](./dev/ARCHITECTURE.md#sezioni-virtuali--query-builder) |
| Come funziona il fallback dei globals? | [ARCHITECTURE.md](./dev/ARCHITECTURE.md#gestione-dei-fallback-in-srclibapits) |
| Struttura reale di `generali` (orari)? | [ARCHITECTURE.md](./dev/ARCHITECTURE.md#struttura-del-global-generali-e-logica-orari) |
| Quali colori posso usare? | [DESIGN_SYSTEM.md](./dev/DESIGN_SYSTEM.md#1-palette-colori) |
| Come si usa `<Badge>`? | [DESIGN_SYSTEM.md](./dev/DESIGN_SYSTEM.md#badge) |
| Come il menu decide cosa mostrare? | [CONTEXT.md](./ai/CONTEXT.md#come-il-sistema-decide-cosa-mostrare) |
| Struttura reale dei dati backend? | [CONTEXT.md](./ai/CONTEXT.md#struttura-dati-reale-del-backend) |
| Come aggiungo una nuova sezione? | [CONTEXT.md](./ai/CONTEXT.md#come-aggiungere-funzionalità) |
| Quali regole devo rispettare nel codice? | [CONTEXT.md](./ai/CONTEXT.md#regole-di-codice-da-rispettare) |
