# SCHEMA INTERATTIVO — Pacchetto completo (app sorgente + skill di clonazione)

Questo pacchetto contiene **l'app SCHEMA INTERATTIVO** (sorgente) e le **skill**
che permettono di ricostruire un'app **identica** cambiando **solo il set di
domande**, partendo sia dalla copia locale sia dalla **repository GitHub** dove
l'app verrà caricata.

---

## 1. Contenuto del pacchetto

```
schema-interattivo-pacchetto/
├── README.md                                    ← questo documento
└── schema-interattivo/                          ← REPOSITORY COMPLETO dell'app (pronto per GitHub)
    ├── README.md                                (documentazione dell'app)
    ├── client/                                  (Vite + React 19 + TS + Tailwind 4)
    ├── server/                                  (Express + tRPC + Drizzle + PostgreSQL)
    ├── drizzle/                                 (schema DB: classes, students, answers)
    ├── tools/                                   ← tooling versionato col repo
    │   ├── rebuild_schema_data.py               (rigenera server/schema-data.ts + snippet PDF)
    │   └── domande-template.json                (template del set di domande)
    ├── skills/                                  ← SKILL DENTRO il progetto (come la repo Quiz-interattivo-sorgente)
    │   ├── schema-interattivo-sorgente/
    │   │   ├── SKILL.md                         (clonazione: nuova app = nuovo set di domande)
    │   │   ├── scripts/rebuild_schema_data.py
    │   │   └── templates/schema-questions-template.json
    │   └── schema-quiz-builder/
    │       ├── SKILL.md                         (manutenzione/adattamento dell'app)
    │       ├── references/architecture.md
    │       ├── scripts/adapt_questions.py       (⚠️ formato VECCHIO, vedi §8)
    │       └── templates/schema-data-template.json (⚠️ formato VECCHIO, vedi §8)
    ├── deploy/                                  ← deploy Docker/Render
    │   ├── Dockerfile                           (build multi-stage)
    │   ├── docker-compose.yml                   (app + PostgreSQL in un comando)
    │   ├── docker-entrypoint.sh                 (migrazioni + avvio)
    │   └── .dockerignore
    ├── render.yaml                              (Blueprint Render: DB + web service automatici)
    ├── setup.sh                                 (genera BETTER_AUTH_SECRET)
    ├── cornice-dinamica/                        (⭐ embed Blogger: iframe altezza auto + OpenDyslexic)
    ├── AGENTS.md                                (regole per agenti IA sul repo)
    ├── REBUILD.md                               (ricostruire l'identica app da GitHub)
    ├── ADATTARE.md                              (varianti: parole chiave, fasi, tipo di schema)
    ├── RENDER.md                                (trasferimento Easy-Peasy.AI → GitHub → Render)
    ├── ACCESSIBILITA.md                         (⭐ sezione accessibilità: misure riusabili)
    ├── Dockerfile                               (usato da render.yaml / docker build)
    ├── GUIDA-GITHUB-DESKTOP.html                (guida visiva GitHub Desktop)
    ├── GUIDA-RENDER.html                        (guida visiva deploy Render)
    ├── GUIDA-UNICA.html                         (guida completa in un unico file)
    ├── ISTRUZIONI-GITHUB.txt                    (istruzioni rapide per GitHub)
    ├── TeacherPage.tsx                          (mirror di client/src/pages/TeacherPage.tsx)
    ├── StudentSchema.tsx                        (mirror di client/src/pages/StudentSchema.tsx)
    ├── schema-data.ts                           (mirror di server/schema-data.ts)
    ├── reportPdf.ts                             (mirror di client/src/lib/reportPdf.ts)
    ├── routers.ts                               (mirror di server/routers.ts)
    ├── pnpm-lock.yaml                           (lockfile incluso, come la repo sorgente)
    ├── template.json
    └── package.json
```

---

## 2. Cos'è SCHEMA INTERATTIVO

Attività scolastica studente ↔ docente: lo studente ricostruisce una **griglia
schema 5×4** (5 fasi × 4 colonne) trascinando/toccando le **parole chiave** nei
12 slot della griglia. Funzionalità principali:

- **Studente** (`/` → `/schema`): entra col codice classe a 4 cifre, posiziona le
  parole chiave (drag & drop desktop + tap/touch mobile), invia e riceve il voto x/12.
- **Docente** (`/docente`): crea/riapre classi, avvia sessioni live, monitora gli
  studenti in tempo reale (punteggio, pallini fase, badge "IN ATTESA DI INVIO",
  tooltip nero sul NOME con freccia in alto, X con tooltip nativo
  "Rimuovi lo studente"), scarica **report PDF** (foglio esercizio bianco +
  foglio soluzione).
- **Stack**: Vite + React 19 + TypeScript + Tailwind CSS 4 + tRPC + Drizzle +
  PostgreSQL, PDF con jsPDF.
- **Embed**: iframe per Blogger con `postMessage({type:"labvisivo:height"})`.

---

## 3. Come chiedere una nuova app (set di domande diverso)

Basta chiedere a Marky qualcosa come:

> "Fammi un'app uguale a SCHEMA INTERATTIVO ma sul tema **L'infinito di Leopardi**"
> oppure
> "Clona SCHEMA INTERATTIVO con questo nuovo set di domande: …"
> oppure, usando il repo:
> "Fai una nuova app come quella nella repo `https://github.com/mio-utente/schema-interattivo` ma con le domande su …"

Marky userà automaticamente la skill **`schema-interattivo-sorgente`**, che:
1. copia il sorgente (dalla cartella locale **oppure** dalla repository GitHub indicata),
2. rigenera `server/schema-data.ts` con il nuovo set di domande,
3. aggiorna le tabelle e i testi del **PDF** (che duplicano il contenuto!),
4. aggiorna i testi visibili allo studente (metodo/opera),
5. compila, testa e fa il deploy (preview → produzione dopo la tua conferma),
6. ti consegna lo ZIP della nuova app.

**Tu devi solo fornire**: il tema/le domande (o il file JSON, vedi §4) e,
se vuoi usare il repo, l'URL di GitHub.

---

## 4. Il set di domande — formato JSON

Tutto il contenuto dell'app vive in un unico file dati: `server/schema-data.ts`.
Non va modificato a mano: si scrive un **JSON** e lo si passa allo script.

```json
{
  "appName": "SCHEMA INTERATTIVO — L'INFINITO (LEOPARDI)",
  "methodName": "Metodo di analisi testuale",
  "topicDescription": "L'infinito (Leopardi) secondo il metodo di analisi testuale.",
  "pdfFileBase": "L_INFINITO",
  "totalSlots": 12,
  "colors": {
    "col3": "#2D6A4F", "col4": "#C2255C", "col1": "#0096C7", "col2": "#1A1A1A",
    "gridBorder": "#1B3A5C",
    "phases": ["#8B1A1A", "#B8860B", "#2E5E2E", "#4A6FA5", "#6B3FA0"]
  },
  "rows": [
    { "id": "fase1-2", "phaseLabel": "FASE 1/2", "description": "LETTURA E / LOCALIZZAZIONE",
      "col3": ["idillio"], "col4": ["Leopardi"] },
    { "id": "fase3", "phaseLabel": "FASE 3", "description": "TEMA",
      "col3": ["infinito"], "col4": ["immaginazione"] },
    { "id": "fase4", "phaseLabel": "FASE 4", "description": "STRUTTURA",
      "col3": ["endecasillabi"], "col4": ["sciolti"] },
    { "id": "fase5", "phaseLabel": "FASE 5", "description": "ANALISI DELLA / FORMA",
      "col3": ["enjambement", "anafora"], "col4": ["interiezione", "parallelismo"] },
    { "id": "fase6-7", "phaseLabel": "FASE 6/7", "description": "RIFLESSIONE E / CONCLUSIONE",
      "col3": ["dolcezza"], "col4": ["naufragio"] }
  ]
}
```

| Campo | Obbligatorio | Note |
|---|---|---|
| `appName` | sì | Titolo usato nei PDF |
| `methodName` | sì | Sottotitolo PDF + badge studente |
| `rows` | sì | Le 5 righe della griglia (vedi sotto) |
| `topicDescription` | no | Commento nell'header di schema-data.ts |
| `pdfFileBase` | no | Base dei nomi file PDF (es. `RIMA_XXI`, `L_INFINITO`); default = appName |
| `totalSlots` | no | Default = somma delle celle (12) |
| `colors` | no | Default = palette attuale |

**Regole della griglia (rispettate automaticamente dallo script):**
- **5 righe**, ognuna con `id` (es. `fase1-2`), `phaseLabel` (colonna 1),
  `description` (colonna 2; usa `" / "` per l'andata a capo), `col3`/`col4`
  (parole corrette delle colonne 3 e 4, **max 2 per colonna**).
- **Parole chiave uniche** in tutta la griglia (nessun duplicato).
- Lo script genera da solo gli **slotId** (`f1-c3`, `f5-c3-0`, `f5-c4-1`, …)
  e i **12 slot** totali.
- L'ordine delle parole **entro la stessa fase è libero**: lo studente può
  scambiarle tra gli slot della stessa riga e resta corretto.

---

## 5. Flusso di clonazione (in sintesi)

1. **Copia il sorgente** — da `/home/user/becquer-schema-full-app` (copia locale)
   oppure da GitHub (`git clone <URL>`); verifica che il repo sia la versione
   attuale (deve contenere `GRID_ROWS`/`GRID_SLOTS` in `server/schema-data.ts`).
2. **Crea `domande.json`** partendo da `tools/domande-template.json`.
3. **Rigenera i dati**:
   ```bash
   python3 tools/rebuild_schema_data.py domande.json server/schema-data.ts > pdf-snippets.txt
   ```
4. **Incolla gli snippet PDF** in `client/src/lib/reportPdf.ts` (titolo 2×,
   sottotitolo 2×, 3 nomi file, tabella bianca ~riga 292, tabella soluzione ~riga 479).
5. **Aggiorna i testi contenuto** in `client/src/pages/StudentSchema.tsx`
   (badge metodo ~528, messaggio successo ~738, footer ~763) se cambia metodo/opera.
6. **Verifica**: `pnpm check && pnpm build` (deve passare senza errori).
7. **Deploy**: preview → test flusso completo (studente + docente + PDF) →
   produzione (dopo conferma) → pulizia classi di test.
8. **ZIP**: `zip -rq NUOVO-APP.zip NUOVO-APP -x "node_modules/*" -x "dist/*" -x ".git/*"`.

---

## 6. Repository GitHub

### 6.1 Caricare l'app su GitHub (una volta sola)

```bash
cd /home/user/schema-interattivo          # oppure la cartella della nuova app
git init
git add -A
git commit -m "SCHEMA INTERATTIVO — Rima XXI"
git branch -M main
git remote add origin https://github.com/TUO-UTENTE/TUO-REPO.git
git push -u origin main
```

Il repo includerà anche `tools/` (script + template): **tutto il necessario per
clonarla di nuovo è dentro il repo**.

> ⚠️ Prima del push: assicurati che `.gitignore` escluda `node_modules/`,
> `dist/`, `.env*` (è già configurato nel sorgente).

### 6.2 Usare il repo come sorgente per una nuova app

Quando vuoi una nuova app con domande diverse, scrivi a Marky:

> "Usa come sorgente la repo `https://github.com/TUO-UTENTE/TUO-REPO` e fai una
> nuova app con il set di domande su **<tema>**"

Marky:
1. clona la repo (`git clone <URL>`),
2. verifica che sia SCHEMA INTERATTIVO (`GRID_ROWS`/`GRID_SLOTS`, `StudentSchema.tsx`, `TeacherPage.tsx`, `drizzle/schema.ts`),
3. applica lo stesso flusso di clonazione (§5),
4. carica la nuova app sul suo repository GitHub (se lo richiedi) così diventa a sua volta una sorgente.

### 6.3 Deploy da GitHub (Render)

Il progetto è pensato anche per Render:
- **Build**: `pnpm install && pnpm build` (root = cartella del progetto)
- **Start**: `node dist/index.js`
- **Variabili d'ambiente**: `DATABASE_URL` (PostgreSQL), `SESSION_SECRET`, ecc.
  (vedi `.env.example` se presente nel sorgente).

---

## 7. Embed in Blogger (cornice dinamica inclusa)

Il pacchetto include la cartella **`cornice-dinamica/`** con l'embed pronto per
Blogger: iframe ad **altezza automatica** (protocollo `postMessage`
`labvisio:height`), **font OpenDyslexic** e versioni diverse a seconda delle
esigenze:

| File | Uso |
|---|---|
| `embed-schema-interattivo-dedicata.html` | ⭐ Consigliata: v3 impermeabile + anti-loop, schermo intero, stato online/errore |
| `embed-schema-interattivo-lite.html` | Minima (~5 KB), riutilizzabile con `?app=URL` |
| `embed-schema-interattivo.html` | Autosufficiente: font incorporati in base64 |
| `embed-universale.html` | Template per qualsiasi altra app (URL segnaposto) |

Incolla il contenuto del file scelto nella vista HTML del post Blogger. Per una
altra app basta cambiare `APP_URL` (e gli URL dei font). Se l'app cambia
piattaforma (es. da Easy-Peasy a Render) aggiorna `APP_URL` in questi file
(vedi `RENDER.md`).

---

## 8. Trappole note (leggi prima di modificare!)

- **`reportPdf.ts` DUPLICA il contenuto**: le tabelle della griglia nel PDF sono
  hardcoded (foglio bianco ~riga 292 e soluzione ~riga 479) più titolo/sottotitolo/
  nomi file. Se le salti, il PDF resta col vecchio contenuto anche se l'app è nuova.
- **`scripts/adapt_questions.py` (in schema-quiz-builder) genera il FORMATO VECCHIO**
  (piatto, senza `GRID_ROWS`/`GRID_SLOTS`/`computeCorrectSlotIds`): non usarlo per
  clonare l'app attuale. Usa sempre `tools/rebuild_schema_data.py`.
- **slotId**: prefisso `f` + primo numero dell'id riga + `-c3`/`-c4` (+ `-0`/`-1`
  per le celle doppie). Generati automaticamente dallo script.
- **Keyword uniche** e **max 2 risposte per colonna** (validati dallo script).
- **`IN ATTESA DI INVIO`** appare finché le risposte salvate < `TOTAL_SLOTS` (12).
- **Cache CSS**: dopo modifiche a `index.css`, ricaricare con `?fresh=1` (Vite/browser
  possono servire CSS in cache).
- **Niente `<button>` dentro `<button>`**: la riga studente usa `<span role="button">`
  per la rimozione (evita hydration error).
- **Data del campo "APRI UNA NUOVA CLASSE"**: la centratura richiede le regole sui
  pseudo-elementi `::-webkit-date-and-time-value`/`::-webkit-datetime-edit` in
  `client/src/index.css` (già presenti).

---

## 9. Changelog

- **v1.7 (attuale, sett 2026)** — **Pacchetto allineato al codice in produzione
  e pronto per IA/GitHub/Render**: codice sorgente sincronizzato con l'app live
  (deploy #6695 e #6696) — aggiunti `AccessibilityContext.tsx`,
  `AccessibilityToolbar.tsx` (barra 5 moduli: Font, Interlinea, Righello,
  Modalità, Ascolto), `useReadAloud.ts` (TTS), `heightSync.ts` (embed
  accessibile), font OpenDyslexic completi in `client/public/fonts/`, fix PDF
  (niente CORRETTA/INCORRETTA/RIEPILOGO) e fix overflow mobile parole.
  Aggiunta la **documentazione IA**: `AGENTS.md`, `REBUILD.md`, `ADATTARE.md`,
  `RENDER.md` e la **sezione ACCESSIBILITA.md** (misure riusabili su altre app).
  Inclusa la **cornice dinamica** (`cornice-dinamica/`, embed v3 + lite +
  autosufficiente + universale). Verificato: `pnpm check`, `pnpm build`,
  `pnpm test` superati nel pacchetto.
- **v1.6** — **Pacchetto completo come la repo `Quiz-interattivo-sorgente`**: aggiunti `deploy/` (Dockerfile multi-stage, docker-compose, docker-entrypoint, .dockerignore), `render.yaml`, `setup.sh`, guide (`GUIDA-GITHUB-DESKTOP.html`, `GUIDA-RENDER.html`, `GUIDA-UNICA.html`, `ISTRUZIONI-GITHUB.txt`), **skills DENTRO il progetto** (`schema-interattivo/skills/`), mirror alla radice (`TeacherPage.tsx`, `StudentSchema.tsx`, `schema-data.ts`, `reportPdf.ts`, `routers.ts`), README dedicato, `.env.example` documentato e **`pnpm-lock.yaml` incluso** nello ZIP.
- **v1.5** — Dashboard docente: **freccia del tooltip nome in ALTO**
  (punta verso il nome, centrata esattamente sotto il nome); tooltip sulla X =
  **nativo del browser** `title="Rimuovi lo studente"` (come la repo
  `Parole-chiave-interattive-sorgente`), niente più tooltip nero. Skill aggiornata (REGOLA 32).
- **v1.4** — Dashboard docente: tooltip nero **agganciato al NOME dello
  studente** (hover solo sul nome, come la repo `Quiz-interattivo-con-audio-sorgente`);
  la X mantiene il tooltip RIMUOVI STUDENTE. Skill aggiornata (REGOLA 32).
- **v1.3** — Dashboard docente: riga studente **centrata** quando compare
  il badge "IN ATTESA DI INVIO" (`justify-center` + nome `flex-none`); con 12
  risposte il layout originale resta invariato. Skill aggiornata (REGOLA 33).
- **v1.2** — Dashboard docente: tooltip nero con **SOLO il nome** dello
  studente; "RIMUOVI STUDENTE" spostato come **tooltip hover sul pulsante X**
  (`group/remove`, stesso stile nero). Skill aggiornata (REGOLA 32).
- **v1.1** — Skill aggiornate con supporto **repository GitHub** come
  sorgente di clonazione; `tools/` versionato dentro il progetto; pacchetto ZIP
  completo (app + skill + README).
- **v1.0** — Skill `schema-interattivo-sorgente` creata (procedura + script +
  template); skill `schema-quiz-builder` aggiornata (REGOLA 30: fix dashboard
  docente — codice classe senza sovrapposizioni, tooltip nero hover+tap anche per
  "IN ATTESA DI INVIO", data centrata; REGOLA 31: clonazione).
