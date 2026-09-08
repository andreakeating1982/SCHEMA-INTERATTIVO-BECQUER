---
name: schema-interattivo-sorgente
description: "Clona l'app SCHEMA INTERATTIVO in una NUOVA app identica cambiando SOLO il set di domande (griglia schema 5×4 con parole chiave). La sorgente può essere la copia locale (/home/user/becquer-schema-full-app) oppure la repository GitHub indicata dall'utente dove ha caricato l'app. Usare quando l'utente chiede una nuova app simile/uguale allo schema interattivo con un set di domande diverso (stesso aspetto, accessibilità DSA/BES con barra 5 moduli + OpenDyslexic UI/PDF + TTS, codici classe, sessioni live, contatore studenti, report PDF, voto su 10, embed Blogger). NON usare per modificare le domande dell'app sorgente stessa né per la manutenzione dell'app sorgente (usare schema-quiz-builder)."
---

# SCHEMA INTERATTIVO — Skill di Clonazione (sorgente)

Ricostruisce l'app **SCHEMA INTERATTIVO** in una **nuova app identica** cambiando
**solo il set di domande**. L'app sorgente è in `/home/user/becquer-schema-full-app`
ed è il riferimento d'oro: layout, UX, flussi e funzionalità restano IDENTICI.

## Cosa è l'app (riepilogo)

Attività scolastica studente↔docente: lo studente ricostruisce una **griglia
schema 5×4** (5 fasi × 4 colonne: nome fase, descrizione, parola chiave-contenuto,
parola chiave-forma) trascinando/toccando le **parole chiave** nei 12 slot.
- **Stack**: Vite + React 19 + TypeScript + Tailwind 4 + tRPC + Drizzle + PostgreSQL (scaffold web-db-user)
- **Pagine**: `/` (Home join), `/schema` (StudentSchema), `/docente` (TeacherPage)
- **Deploy**: Cloud Run (produzione) / preview sandbox; **embed Blogger** via iframe + `postMessage({type:"labvisivo:height"})` (già in App.tsx)
- **DB**: tabelle classes/students/answers (mai da toccare nel clone)

## Il "set di domande" — dove vive (file da modificare)

| File | Cosa contiene | Nel clone |
|---|---|---|
| `server/schema-data.ts` | ⭐ IL set di domande: `GRID_ROWS` (5 righe), `ALL_KEYWORDS`, `TOTAL_SLOTS`, colori | **SI** (rigenerare) |
| `client/src/lib/reportPdf.ts` | ⚠️ DUPLICA il contenuto: titolo "SCHEMA INTERATTIVO — RIMA XXI (BÉCQUER)" (2×), sottotitolo metodo (2×), 3 nomi file PDF, **2 tabelle gridData hardcoded** (bianca ~riga 292 e soluzione ~riga 479) | **SI** (incollare snippet) |
| `client/src/pages/StudentSchema.tsx` | Testi contenuto: badge "Metodo Lázaro Carreter" (~riga 528), messaggio successo con l'opera (~riga 738), footer (~riga 763) | SI (solo se cambia metodo/opera) |
| `client/src/pages/Home.tsx`, `TeacherPage.tsx`, header StudentSchema | Titolo app "SCHEMA INTERATTIVO" | Solo se RINOMINI l'app |

Tutto il resto (drizzle/schema.ts, routers, db.ts, componenti UI, palette plum/emerald/amber, font Cambria, flussi) **NON si tocca**.

## Procedura di clonazione (segui in ordine)

### 1. Copia il progetto (copia locale OPPURE repository GitHub)

**Fonte A — copia locale** (default):
```bash
mkdir -p /home/user/NUOVO-APP
cd /home/user/becquer-schema-full-app
tar --exclude=node_modules --exclude=dist --exclude=.git --exclude=pnpm-lock.yaml -cf - . | tar -xf - -C /home/user/NUOVO-APP
ln -s /home/user/becquer-schema-full-app/node_modules /home/user/NUOVO-APP/node_modules   # riuso dipendenze per test
```
(Oppure `pnpm install` nella nuova cartella se vuoi dipendenze indipendenti.)

**Fonte B — repository GitHub** (quando l'utente indica l'URL del repo dove ha caricato l'app):
```bash
git clone <URL_REPO> /home/user/NUOVO-APP
cd /home/user/NUOVO-APP && pnpm install
```
(Oppure scarica lo ZIP del repo: `https://github.com/<user>/<repo>/archive/refs/heads/main.zip` e decomprimilo in `/home/user/NUOVO-APP`.)

**Verifica SEMPRE che il repo sia davvero SCHEMA INTERATTIVO** prima di procedere:
- `server/schema-data.ts` contiene `GRID_ROWS` e `GRID_SLOTS` (formato 5×4 attuale)
- esistono `client/src/pages/StudentSchema.tsx`, `TeacherPage.tsx`, `Home.tsx`
- esiste `drizzle/schema.ts` (tabelle classes/students/answers)
Se il repo è una vecchia versione (formato piatto senza `GRID_ROWS`) o non è quest'app: FERMATI e chiedi all'utente. Il repo caricato da GitHub contiene anche `tools/rebuild_schema_data.py` e `tools/domande-template.json` (stessi file della skill): se presenti, usali al posto di quelli della skill (sono versionati col repo).

### 2. Crea il JSON delle domande
Parti dal template:
```bash
cp /home/user/skills/schema-interattivo-sorgente/templates/schema-questions-template.json /home/user/NUOVO-APP/domande.json
```
(Se il repo clonato da GitHub contiene `tools/domande-template.json`, puoi partire da quello: è identico ma versionato col repo.)
Formato (campi obbligatori: `appName`, `methodName`, `rows`; opzionali: `topicDescription`,
`pdfFileBase`, `totalSlots`, `colors`):
```json
{
  "appName": "SCHEMA INTERATTIVO — L'INFINITO (LEOPARDI)",
  "methodName": "Metodo di analisi testuale",
  "topicDescription": "L'infinito (Leopardi) secondo il metodo di analisi testuale.",
  "pdfFileBase": "L_INFINITO",
  "totalSlots": 12,
  "colors": { "col3": "#2D6A4F", "col4": "#C2255C", "col1": "#0096C7", "col2": "#1A1A1A", "gridBorder": "#1B3A5C",
              "phases": ["#8B1A1A", "#B8860B", "#2E5E2E", "#4A6FA5", "#6B3FA0"] },
  "rows": [
    { "id": "fase1-2", "phaseLabel": "FASE 1/2", "description": "LETTURA E / LOCALIZZAZIONE",
      "col3": ["idillio"], "col4": ["Leopardi"] },
    { "id": "fase5", "phaseLabel": "FASE 5", "description": "ANALISI DELLA / FORMA",
      "col3": ["enjambement", "anafora"], "col4": ["interiezione", "parallelismo"] }
  ]
}
```

### 3. Rigenera `server/schema-data.ts`
```bash
python3 /home/user/skills/schema-interattivo-sorgente/scripts/rebuild_schema_data.py \
  /home/user/NUOVO-APP/domande.json /home/user/NUOVO-APP/server/schema-data.ts > /home/user/NUOVO-APP/pdf-snippets.txt
```
(Se il repo clonato da GitHub contiene `tools/rebuild_schema_data.py`, esegui quello — è identico ma versionato col repo: `python3 /home/user/NUOVO-APP/tools/rebuild_schema_data.py ...`.)
Lo script genera tutto (tipi, TOTAL_SLOTS, colori, ALL_KEYWORDS, GRID_ROWS con slotId
automatici, SCHEMA_ROWS alias, helper) e stampa gli **snippet PDF** da incollare.
Se il JSON non rispetta le convenzioni (keyword duplicate, >2 risposte per colonna,
totalSlots sbagliato) lo script **fallisce** con un messaggio chiaro: correggi e ri-esegui.

### 4. Incolla gli snippet in `client/src/lib/reportPdf.ts`
Da `pdf-snippets.txt` aggiorna (CERCALI uno a uno, NON fidarti solo dei numeri di riga):
1. Titolo PDF `doc.text("SCHEMA INTERATTIVO — ...", PW / 2, y + 6, ...)` — **2 occorrenze**
2. Sottotitolo metodo — **2 occorrenze**
3. Nomi file PDF (`Report_Schema_...`, `Schema_...`, `Schema_Completo_...`) — **3 occorrenze**
4. Tabella BIANCA `const gridData = [...]` (~riga 292) — foglio esercizio
5. Tabella SOLUZIONE `const gridData = [...]` (~riga 479) — report insegnante
⚠️ Se salti le tabelle gridData il PDF resta col VECCHIO contenuto anche se l'app è nuova.

### 5. Aggiorna i testi contenuto in `client/src/pages/StudentSchema.tsx` (se serve)
Badge metodo (~528), messaggio successo (~738: cita l'opera), footer (~763).
Se l'opera/metodo restano gli stessi, salta questo passo.

### 6. Rinomina l'app? (solo se richiesto)
Default: **l'app resta "SCHEMA INTERATTIVO"** (è il nome del prodotto, non del contenuto).
Se l'utente vuole un nome nuovo: h1 in `Home.tsx`, `StudentSchema.tsx` (4 punti),
`TeacherPage.tsx`, `package.json` `name`/`title`, `index.html` `<title>`.

### 7. Verifica e build
```bash
cd /home/user/NUOVO-APP && pnpm check && pnpm build
```
`pnpm check` (tsc --noEmit) DEVE passare senza errori: se fallisce, correggi prima di proseguire.

### 8. Deploy
- `webdev_deploy` mode="preview" → testare il flusso COMPLETO:
  1. Docente: crea classe → avvia sessione → codice 4 cifre visibile
  2. Studente: entra col codice → barra accessibilità 5 moduli visibile (FONT A−/A+, INTERLINEA, RIGHELLO, MODALITÀ, ASCOLTO) → trascina/tocca le parole nei 12 slot → INVIA
  3. Docente: studente appare (anche "IN ATTESA DI INVIO"), tooltip nero sul NOME con freccia in ALTO (hover PC + tap mobile), X con tooltip NATIVO "Rimuovi lo studente", punteggio x/12, pallini fase colorati
  4. Report PDF docente (foglio bianco + soluzione) col NUOVO contenuto e font OpenDyslexic (l'embed in cima a reportPdf.ts non deve essere stato sovrascritto)
  5. Prima pagina (Home): layout compatto `lf-welcome`, contenuto subito sotto la barra, pagina che termina sotto la card — niente grande vuoto crema (nella cornice iframe: 24px simmetrici sopra/sotto)
  6. Footer: in Home e /docente NON deve comparire alcun footer di credito (es. "REALIZZATO DA ANDREA CENTINARO" è stato rimosso dalla sorgente — il clone parte senza)
  7. Cornice dinamica: copiare `cornice-dinamica/` in `client/public/` (solo per il test), aprire
     `/cornice-dinamica/test-dedicata.html` e `/cornice-dinamica/test-impermeabile.html` → stato
     ONLINE, altezza iframe aderente, niente furto da parte dell'intruso; poi RIMUOVERE la copia da
     `client/public/` (la cartella canonica sta alla radice e NON va servita dall'app)
- Dopo conferma esplicita dell'utente: `webdev_save_checkpoint` + `webdev_deploy` mode="production" (URL permanente `*.easy-peasy.site`)
- Pulire SEMPRE le classi di test dal DB (via `classes.listAll` + `classes.delete`) prima di consegnare

### 9. ZIP per GitHub/Render + push su GitHub (se richiesto)
```bash
cd /home/user && zip -rq NUOVO-APP.zip NUOVO-APP -x "node_modules/*" -x "dist/*" -x ".git/*"
```
Se l'utente vuole caricare la NUOVA app su GitHub (per riusarla come sorgente futura):
```bash
cd /home/user/NUOVO-APP
git init && git add -A && git commit -m "SCHEMA INTERATTIVO — <nuovo tema>"
git remote add origin <URL_NUOVO_REPO> && git branch -M main && git push -u origin main
```
Il repo includerà anche `tools/` (script + template): così la prossima clonazione potrà usarlo come sorgente.

## Convenzioni vincolanti (trappole note)

- **slotId**: prefisso `f` + PRIMO numero dell'id riga (`fase1-2`→`f1`, `fase5`→`f5`, `fase6-7`→`f6`) + `-c3`/`-c4`; se una colonna ha 2 celle aggiungi `-0`/`-1` (es. `f5-c3-0`, `f5-c4-1`). Lo script lo fa in automatico; non inventare altri pattern.
- **TOTAL_SLOTS** = somma di tutte le celle (default 12). Le risposte salvate nel DB usano questo numero per "IN ATTESA DI INVIO" (x/12).
- **Keyword uniche** in tutta la griglia (lo script le valida).
- **Max 2 risposte per colonna** (la griglia PDF è 5×4 con celle singole/doppie; la riga FASE 5 è quella con 2+2).
- **Ordine libero entro la fase**: `computeCorrectSlotIds` valuta le risposte per INSIEME (multiset) per rowId — scambiare due parole della stessa fase resta corretto. Non cambiare questa logica.
- **`description` usa `" / "`** per l'andata a capo (il PDF la splitta su `/`).
- **NON usare `scripts/adapt_questions.py` di schema-quiz-builder**: genera il FORMATO VECCHIO (piatto, senza GRID_ROWS/GRID_SLOTS/computeCorrectSlotIds) → l'app non funziona. Usare sempre `rebuild_schema_data.py`.
- **Peso FASE 5 nel PDF** (0.25) e colonne: logica in reportPdf.ts, non nei dati — non toccare.
- **Accessibilità (NON toccare nel clone)**: la suite portata da PAROLE-CHIAVE-INTERATTIVE resta intatta nel clone: `contexts/AccessibilityContext.tsx` (fontScale 0.8–1.6, interlinea, righello, alto contrasto; localStorage `schema_access`; classi `lf-ruler`/`lf-hc`, variabili `--lf-scale`/`--lf-lh`), `components/AccessibilityToolbar.tsx` (barra 5 moduli FONT/INTERLINEA/RIGHELLO/MODALITÀ/ASCOLTO renderizzata in App.tsx su TUTTE le pagine), `hooks/useReadAloud.ts` (TTS che legge anche i pulsanti-parola: NON escludere i `<button>`), font OpenDyslexic in `client/public/fonts` + CORS `/fonts` in `server/_core/index.ts` (serve quando l'app è nella cornice iframe). Dettagli: skill schema-quiz-builder, REGOLE 7d e 35.
- **PDF OpenDyslexic (NON toccare nel clone)**: in cima a `reportPdf.ts` l'embed del font OpenDyslexic (`loadFontBase64` + `addFileToVFS` + `addFont`, `fontState` con fallback "times", ✔/✘ vettoriali perché OpenDyslexic non ha U+2714/U+2718). Quando incolli gli snippet del nuovo contenuto (titolo/sottotitolo/gridData) NON sovrascrivere l'intero file: incolla SOLO dentro le funzioni esistenti.
- **Report PDF senza scritte CORRETTA/INCORRETTA e senza riga RIEPILOGO (NON reintrodurre nel clone)**: il report per studente NON stampa più le parole CORRETTA/INCORRETTA accanto alle risposte né la riga finale "RIEPILOGO — CORRETTE: n · INCORRETTE: n · NON DATE: n". Lo stato è affidato ai soli segni ✔ verde / ✘ rossa (vettoriali) accanto alla parola data, con la parola esatta in verde dopo la "→" sulle risposte sbagliate, `NON DATA · peso 0,50` per gli slot vuoti, `peso 0,25/0,50` a destra sulle righe compilate e la legenda dei simboli in fondo (mai affidarsi al solo colore). Il clone parte dalla sorgente che le contiene già: quando incolli gli snippet del nuovo contenuto NON introdurre etichette di stato testuali né righe di riepilogo. Dettagli: skill schema-quiz-builder, REGOLA 37.
- **Parole dentro i bordi su mobile (NON toccare nel clone)**: nel dettaglio a tendina del docente (TeacherPage `AnswerDetails`) e nelle celle drop-zone dello studente (`StudentSchema.tsx` `DropZone`) le righe usano `flex flex-wrap` + `min-w-0` + `[overflow-wrap:anywhere]` (parole con `leading-snug`, `#`/icone/freccia `shrink-0`): le parole lunghe in maiuscolo OpenDyslexic vanno a capo restando dentro i box anche a larghezza cellulare. Non rimuovere wrap/min-w-0/overflow-wrap quando adatti o rinomini l'app. Dettagli: skill schema-quiz-builder, REGOLA 34.
- **Footer crediti (NON toccare nel clone)**: nessuna pagina mostra "REALIZZATO DA ANDREA CENTINARO" (rimosso da Home.tsx e TeacherPage.tsx come nell'app sorgente PAROLE-CHIAVE-INTERATTIVE). Se rinomini l'app NON reintrodurre footer di credito in calce.
- **Prima pagina — margini pareggiati (NON toccare nel clone)**: Home.tsx usa il wrapper compatto
  `lf-welcome flex flex-col items-center bg-background paper-grain px-4 pb-8 sm:pb-12` (figlio
  `flex w-full flex-col items-center pt-4 sm:pt-8`, header senza `py-6 sm:py-9`, main senza `flex-1`/`pb-16`,
  NIENTE `min-h-screen`) più un `useEffect` che aggiunge `lf-welcome-top` a `<html>` SOLO in vista autonoma
  (`window.self === window.top`). In index.css restano le regole `html.lf-embedded .lf-welcome`
  (padding-top 20px + 4px margine barra = 24px sopra, padding-bottom 24px sotto — simmetrici, come
  nell'app sorgente PAROLE-CHIAVE-INTERATTIVE e nella foto `margini_prima_pagina.png`) e
  `html.lf-welcome-top` (canvas bianco sotto la card + gradiente 48px). Il clone parte dalla sorgente che
  le contiene già: NON reintrodurre il vecchio layout con vuoto crema sotto la card.
- **Cornice dinamica (NON toccare nel clone)**: la cartella `cornice-dinamica/` alla radice (portata da
  PAROLE-CHIAVE-INTERATTIVE) contiene l'embed v3 per Blogger: `embed-<APP>-dedicata.html` ⭐
  (impermeabile + anti-loop, stato ONLINE/ERRORE, Schermo intero/Ricarica), `embed-<APP>-lite.html`,
  `embed-<APP>.html` (font base64), `embed-universale.html` (template segnaposto per altre app — NON
  rinominarlo), `test-dedicata.html`, `test-impermeabile.html`, `fonts/`, `README.md`. Se cambi l'URL di
  produzione aggiorna TUTTE le occorrenze del dominio easy-peasy + titoli/`APP_TITLE` nei file adattati
  (l'id del file lite diventa `<app>Iframe`). La cartella NON va servita dall'app: sta alla radice e nel
  pacchetto ZIP.
- **Tooltip docente v1.5 (NON toccare nel clone)**: tooltip nero `#2C221E` sul NOME dello studente
  (gruppo hover `group relative block w-full` sullo span del nome, tooltip sotto il nome `top-full mt-2`,
  **freccia in ALTO** `bottom-full` + `border-b-[6px] border-b-[#2C221E]` centrata esattamente sotto il
  nome, condivisa con `text-center`); sulla X il tooltip "Rimuovi lo studente" è il **tooltip NATIVO del
  browser** (`title="Rimuovi lo studente"` su `<span role="button" tabIndex={-1}>` — MAI `<button>` dentro
  `<button>`), come la repo `Parole-chiave-interattive-sorgente` (NON nero). Dettagli: skill
  schema-quiz-builder, REGOLE 32 e 33.

## Risorse
- `scripts/rebuild_schema_data.py` — rigenera schema-data.ts + stampa gli snippet PDF (presente anche in `tools/` dentro il progetto, versionata col repo)
- `templates/schema-questions-template.json` — template JSON (contiene l'attuale Rima XXI come esempio funzionante; presente anche in `tools/`)
- Nel pacchetto ZIP esportabile: la repo completa `schema-interattivo/` con **skills DENTRO il progetto** (`skills/schema-interattivo-sorgente/`, `skills/schema-quiz-builder/`), `deploy/` (Dockerfile, docker-compose, entrypoint, .dockerignore), `render.yaml`, `setup.sh`, guide (`GUIDA-GITHUB-DESKTOP.html`, `GUIDA-RENDER.html`, `GUIDA-UNICA.html`, `ISTRUZIONI-GITHUB.txt`), mirror alla radice (`TeacherPage.tsx`, `StudentSchema.tsx`, `schema-data.ts`, `reportPdf.ts`, `routers.ts`), `pnpm-lock.yaml` incluso e `README.md` (documentazione completa per l'utente) — struttura identica alla repo `Quiz-interattivo-sorgente`

## Checklist finale (tutto deve passare)
1. `pnpm check` + `pnpm build` ✅
2. Griglia 5×4 con NUOVE fasi e parole (verificata in preview) ✅
3. PDF con nuovo titolo e nuova soluzione (OpenDyslexic embedded intatto) ✅
4. Flusso docente (classe, sessione, report) + studente (drag/tap, invio, punteggio) ✅
5. Barra accessibilità 5 moduli visibile su tutte le pagine; alto contrasto/righello/TTS funzionanti ✅
6. Home e /docente senza footer di credito; prima pagina compatta senza vuoto crema ✅
7. Nessuna classe di test residua nel DB ✅
