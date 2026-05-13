# CHANGELOG — Menu Digitale Vietnamonamour

---

## 2026-03-29 — Audit completo e riorganizzazione /docs

**Descrizione:** Audit integrale del repository tramite lettura di tutti i file sorgente. Produzione della KB aggiornata e riorganizzazione della directory `/docs` secondo la struttura standard di progetto.

**File creati:**
- `docs/ARCHITETTURA.md` — SSG flow, data fetching, Query Builder, GCS polling, responsabilità componenti
- `docs/SVILUPPO.md` — Setup locale, comandi pnpm, variabili d'ambiente, deploy
- `docs/STATO.md` — Stato attuale per area (audit), 18 debiti tecnici con priorità
- `docs/DESIGN_SYSTEM.md` — Token colori verificati da `app/globals.css`, componenti UI, regole di contrasto
- `docs/CHANGELOG.md` — questo file

**File aggiornati:**
- `KB_FRONTEND_MENU.md` — aggiornato con risultati audit, sezione debiti tecnici, allineamento docs vs codice
- `README.md` — sostituito il template default di `create-next-app` con descrizione reale del progetto e indice a `/docs`
- `docs/README.md` — aggiornato con indice ai nuovi documenti principali

**Risultati audit principali:**
- ✅ Configurazione Next.js/build corretta (`output: "export"`, `--webpack`, strict mode)
- ✅ Tutti i token Tailwind v4 verificati e corretti (nessuna discrepanza)
- ✅ `getStaticMenuData()` e `generateStaticParams` implementati correttamente
- ✅ Polling GCS ogni 5 minuti implementato correttamente
- ❌ Dark mode non implementata (il handoff la menzionava come feature)
- ❌ `messaggioGlobale` definito nel tipo ma non renderizzato nell'UI
- ❌ Disponibilità vini non filtrata (solo piatti vengono filtrati)
- ⚠️ Meta description dice "Roma" invece di "Milano" (bug)
- ⚠️ `MenuOrchestrator` e `StickyNav` sono codice morto
- ⚠️ Logo e immagini piatti non renderizzati

**Debiti tecnici identificati:** 18 (3 alta priorità, 7 media, 8 bassa)

---

## 2026-03-08 — Generazione KB iniziale

**Descrizione:** Prima generazione della Knowledge Base tramite lettura integrale dei file sorgente.

**File creati:**
- `KB_FRONTEND_MENU.md` — Knowledge Base completa del progetto
