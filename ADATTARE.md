# ADATTARE.md — Creare varianti: numero di parole chiave, tipo di schema, contenuti

Questo documento spiega come **un'intelligenza artificiale** (o uno sviluppatore)
parte da **questa repository GitHub** per creare una **nuova app identica ma con
contenuti diversi** — ad esempio un numero di parole chiave diverso, uno schema
con più o meno fasi, una palette diversa, un altro argomento/autore.

> 📖 La procedura completa e le convenzioni vivono anche nella skill
> `skills/schema-interattivo-sorgente/SKILL.md` inclusa nel repo (con template
> JSON e script). Questo file è la versione "operativa" da seguire.

---

## 1. Principio fondamentale

Tutto il contenuto dell'app vive in **`server/schema-data.ts`**
(`GRID_ROWS`, `GRID_SLOTS`, `ALL_KEYWORDS`, `TOTAL_SLOTS`, colori,
`SCHEMA_ROWS`, `computeCorrectSlotIds`). La UI studente e la dashboard docente
**sono data-driven** (mappano su `rows`/`GRID_ROWS`/`GRID_SLOTS`), quindi la
griglia e il numero di slot si adattano da soli ai dati.

⚠️ **Eccezione critica**: i **PDF NON sono data-driven**. `reportPdf.ts`
duplica il contenuto (titolo, sottotitolo, nomi file, tabelle della griglia
hardcoded). Ogni variante DEVE aggiornare anche i PDF usando gli snippet
generati dallo script (mai a mano).

## 2. Il JSON del set di domande

Modello: `tools/domande-template.json` oppure
`skills/schema-interattivo-sorgente/templates/schema-questions-template.json`.

```json
{
  "appName": "SCHEMA INTERATTIVO — L'INFINITO (LEOPARDI)",
  "methodName": "Metodo di analisi testuale",
  "topicDescription": "L'infinito (Leopardi): commento guidato.",
  "pdfFileBase": "L_INFINITO",
  "totalSlots": 12,
  "colors": {
    "col3": "#2D6A4F", "col4": "#C2255C", "col1": "#0096C7", "col2": "#1A1A1A",
    "gridBorder": "#1B3A5C",
    "phases": ["#8B1A1A", "#B8860B", "#2E5E2E", "#4A6FA5", "#6B3FA0"]
  },
  "rows": [
    { "id": "fase1-2", "phaseLabel": "FASE 1/2", "description": "Lettura e / localizzazione",
      "col3": ["idillio"], "col4": ["Leopardi"] },
    { "id": "fase3", "phaseLabel": "FASE 3", "description": "Tema",
      "col3": ["infinito"], "col4": ["immaginazione"] },
    { "id": "fase4", "phaseLabel": "FASE 4", "description": "Struttura",
      "col3": ["endecasillabi"], "col4": ["sciolti"] },
    { "id": "fase5", "phaseLabel": "FASE 5", "description": "Analisi della / forma",
      "col3": ["enjambement", "anafora"], "col4": ["interiezione", "parallelismo"] },
    { "id": "fase6-7", "phaseLabel": "FASE 6/7", "description": "Riflessione e / conclusione",
      "col3": ["dolcezza"], "col4": ["naufragio"] }
  ]
}
```

### Regole validate dallo script

| Regola | Dettaglio |
|---|---|
| Campi obbligatori | `appName`, `methodName`, `rows` (con `id`, `phaseLabel`, `description`, `col3`, `col4`) |
| Parole chiave | **uniche** in tutta la griglia (nessun duplicato assoluto) |
| Max per colonna | **2** parole per `col3`/`col4` (celle singole o doppie della griglia) |
| Numero righe | default **5** (griglia 5×4, 12 slot). Lo script consente di variare le righe (validazione ~1–6); oltre i 5 serve adattare colori fasi e layout (vedi §5) |
| `totalSlots` | opzionale; se presente deve coincidere con la somma delle celle |
| `slotId` | generati automaticamente: `f{primo-numero-riga}-c3|c4[-0|-1]` |
| Colori | opzionali; default = palette attuale (deve esserci un colore per ogni fase) |

## 3. Eseguire la rigenerazione

```bash
# 1. Prepara il JSON (domande.json)
# 2. Lancia lo script: rigenera schema-data.ts E stampa gli snippet PDF
python3 tools/rebuild_schema_data.py domande.json server/schema-data.ts > pdf-snippets.txt
```

- Se il percorso output è omesso lo script stampa solo `schema-data.ts` su stdout.
- Gli snippet PDF sono delimitati da `=== PDF-SNIPPETS START ===` e
  `=== PDF-SNIPPETS END ===`.

## 4. Sincronizzare gli altri punti di contenuto

1. **PDF** (`client/src/lib/reportPdf.ts`, ~908 righe): applica gli snippet del
   passo 3. Per sicurezza cerca e sostituisci anche le vecchie stringhe del
   contenuto precedente (es. titolo `SCHEMA INTERATTIVO — RIMA XXI (BÉCQUER)`,
   sottotitolo, base nomi file come `RIMA_XXI`, e le due tabelle `gridData` del
   foglio bianco e della soluzione / SCHEMA COMPLETO).
2. **Testi visibili nello studente** (`client/src/pages/StudentSchema.tsx`):
   cerca le stringhe del vecchio contenuto (es. sottotitolo del badge metodo) e
   aggiornale. La riga punteggio in fondo (FASE 5 = 0,25 pt, altre = 0,5 pt,
   max 10/10) va cambiata **solo se cambi la regola dei pesi**.
3. **Mirror alla radice** (`AGENTS.md` §2.3): dopo le modifiche
   ```bash
   cp server/schema-data.ts ./schema-data.ts
   cp client/src/lib/reportPdf.ts ./reportPdf.ts
   cp client/src/pages/StudentSchema.tsx ./StudentSchema.tsx
   cp client/src/pages/TeacherPage.tsx ./TeacherPage.tsx
   ```
4. **Verifica**: `pnpm check`, `pnpm build`, `pnpm test` e QA visivo del PDF
   (`server/reportPdf.qa.test.ts` → `/tmp/qa/report-qa.pdf`).

## 5. Cambiare il "tipo di schema" (numero di fasi/righe e struttura)

La UI è data-driven, quindi **modificare il numero di righe o il numero di
parole per colonna funziona cambiando il JSON**. Casi:

- **Stesse 5 righe × 4 colonne, parole chiave diverse** (o più/meno parole
  nelle celle doppie, fino a 2 per colonna): solo JSON + script (§3–4).
- **Numero di fasi diverso (es. 4 o 6 righe)**:
  1. JSON con `rows` del numero voluto; lo script genera `GRID_ROWS`/slot coerenti.
  2. `colors.phases` deve avere **un colore per fase** (la dashboard usa
     `PHASE_COLORS` per etichettare le fasi).
  3. Controlla la griglia studente (dovrebbe adattarsi da sola) e le tabelle
     PDF rigenerate dagli snippet (aggiungono/rimuovono righe).
  4. Se `TOTAL_SLOTS` cambia, i contatori (`x/12 compilati`, `IN ATTESA DI
     INVIO`, punteggio `x/12`) si adattano perché leggono `TOTAL_SLOTS`/
     `totalSlots` dal server.
- **Layout diverso (colonne, tipologia di domanda, esercizio non a griglia)**:
  non è coperto dallo script. Leggi `skills/schema-quiz-builder/SKILL.md`
  (architettura, StudentSchema/TeacherPage/reportPdf) e intervieni
  strutturalmente su `StudentSchema.tsx`, `TeacherPage.tsx`, `reportPdf.ts` e
  `drizzle/schema.ts` se servono nuovi campi risposta.

## 6. Flusso di consegna di una variante

1. `git clone` questa repo (o usa la copia locale) come sorgente.
2. Crea il JSON → lancia lo script → incolla gli snippet PDF → aggiorna i testi.
3. `pnpm check && pnpm build` (deve passare).
4. Deploy **preview** → test del flusso completo (crea classe, studente,
   risposte, PDF, barra accessibilità, embed).
5. Dopo la conferma dell'utente: deploy **produzione** e aggiornamento della
   cornice dinamica (`cornice-dinamica/`) col nuovo URL se l'app cambia dominio.
6. Consegna dello ZIP della nuova app.
