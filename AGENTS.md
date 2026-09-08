# AGENTS.md — Istruzioni per agenti IA che lavorano su questo repository

Questo file orienta **qualsiasi agente IA** (Marky/Easy-Peasy.AI, GitHub Copilot,
Codex, Claude, Cursor, ecc.) che apre questo repository per **ricostruire
l'app**, **creare una variante** o **fare manutenzione**. Leggilo prima di
modificare qualsiasi cosa, insieme a `REBUILD.md`, `ADATTARE.md`, `RENDER.md` e
`ACCESSIBILITA.md`.

---

## 1. Cos'è questo repository

**SCHEMA INTERATTIVO** — app scolastica full-stack studente ↔ docente: lo
studente ricostruisce una **griglia-schema** (default 5 fasi × 4 colonne:
nome fase / descrizione / parola chiave-contenuto / parola chiave-forma)
trascinando o toccando le **parole chiave** negli slot. Il docente crea classi
con codice a 4 cifre, avvia sessioni live, monitora gli studenti in tempo reale
e scarica **report PDF** (foglio esercizio bianco + foglio soluzione).

- **Stack**: Vite + React 19 + TypeScript + Tailwind CSS 4 + tRPC + Drizzle +
  PostgreSQL + jsPDF (scaffold `web-db-user` di Easy-Peasy.AI).
- **Pagine**: `/` (Home join studente), `/schema` (attività studente),
  `/docente` (dashboard docente).
- **DB** (`drizzle/schema.ts`): `classes`, `students`, `answers` — **non
  modificare la struttura** se non espressamente richiesto.

## 2. Regole d'oro (NON VIOLARLE)

1. **`server/schema-data.ts` è l'unica fonte di verità del contenuto**
   (`GRID_ROWS`, `GRID_SLOTS`, `ALL_KEYWORDS`, `TOTAL_SLOTS`, `SCHEMA_ROWS`,
   colori, `computeCorrectSlotIds`). Per cambiare il contenuto **non**
   modificarlo a mano: si scrive un JSON e si lancia
   `tools/rebuild_schema_data.py` (vedi `ADATTARE.md`). Fa eccezione la
   manutenzione puntuale (es. correggere una parola), che richiede comunque di
   riallineare PDF e mirror.
2. **`client/src/lib/reportPdf.ts` DUPLICA il contenuto** (titolo, sottotitolo,
   nomi file PDF e le due tabelle della griglia hardcoded, foglio bianco e
   foglio soluzione/SCHEMA COMPLETO). Se aggiorni il contenuto dell'app e salti
   il PDF, i PDF restano col contenuto vecchio. Cerca le stringhe del vecchio
   contenuto (es. `RIMA XXI`, `RIMA_XXI`) e sostituiscile ovunque.
3. **Mirror alla radice** (`TeacherPage.tsx`, `StudentSchema.tsx`,
   `reportPdf.ts`, `routers.ts`, `schema-data.ts`) = copie **byte-identiche**
   dei file in `client/src/pages/`, `client/src/lib/` e `server/`. Dopo ogni
   modifica sincronizzali:
   ```bash
   cp client/src/pages/TeacherPage.tsx ./TeacherPage.tsx
   cp client/src/pages/StudentSchema.tsx ./StudentSchema.tsx
   cp client/src/lib/reportPdf.ts ./reportPdf.ts
   cp server/routers.ts ./routers.ts
   cp server/schema-data.ts ./schema-data.ts
   ```
4. **Accessibilità = requisito, non extra** (DSA/BES): font OpenDyslexic
   auto-ospitato, barra accessibilità 5 moduli, TTS, righello, alto contrasto,
   `heightSync`. Non rimuovere classi/font/provider. Leggi `ACCESSIBILITA.md`.
5. **Cornice dinamica** (`cornice-dinamica/`) usa il protocollo
   `postMessage({type:"labvisivo:height"})`. Non romperlo. Se cambi URL
   dell'app, aggiorna `APP_URL` (e gli URL dei font) nei file della cornice.
6. **PDF report**: NON stampare le parole CORRETTA/INCORRETTA né la riga
   RIEPILOGO; bastano i segni ✔/✘ (vettoriali), il peso e la legenda.
7. **Overflow mobile**: le parole lunghe nel dettaglio a tendina del docente e
   nelle celle studente devono andare a capo dentro i bordi
   (`flex-wrap` + `min-w-0` + `[overflow-wrap:anywhere]`), mai uscire dal box.
8. **Verifica SEMPRE**: `pnpm check`, `pnpm build`, `pnpm test`
   (il test `server/reportPdf.qa.test.ts` rigenera il PDF di QA).
9. In caso di dubbio leggi la cartella **`skills/`** inclusa nel repo:
   `schema-quiz-builder` (manutenzione) e `schema-interattivo-sorgente`
   (clonazione/varianti).

## 3. Comandi

| Comando | Scopo |
|---|---|
| `pnpm install` | Installa le dipendenze (lockfile incluso) |
| `pnpm db:push` | Crea/aggiorna le tabelle PostgreSQL (Drizzle push) |
| `pnpm dev` | Server di sviluppo → http://localhost:3000 |
| `pnpm check` | TypeScript check |
| `pnpm build` | Build di produzione (`dist/index.js`) |
| `pnpm test` | Test vitest (QA PDF) |
| `node dist/index.js` | Avvio produzione (dopo `pnpm build`) |
| `docker compose up -d` | App + PostgreSQL in locale (cartella `deploy/`) |

## 4. Percorso rapido

- **Ricostruire l'identica app** → `REBUILD.md`
- **Creare una variante (parole chiave / numero slot / schema)** → `ADATTARE.md`
- **Deploy su Render partendo da GitHub** → `RENDER.md`
- **Misure di accessibilità riusabili** → `ACCESSIBILITA.md`
