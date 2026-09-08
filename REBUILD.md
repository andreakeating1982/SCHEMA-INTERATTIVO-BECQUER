# REBUILD.md — Ricostruire l'identica app da questo repository

Questo documento spiega a **un'intelligenza artificiale o a uno sviluppatore**
come ricostruire **l'identica app SCHEMA INTERATTIVO** a partire da questa
repository GitHub, su una macchina nuova o su un nuovo ambiente di hosting.
La ricostruzione deve produrre un'app **funzionalmente identica**: stessi
flussi, stesso aspetto, stessa accessibilità.

---

## 1. Prerequisiti

- Node.js ≥ 20 e pnpm ≥ 9 (il lockfile `pnpm-lock.yaml` è incluso: usa
  `pnpm install --frozen-lockfile`).
- Un database **PostgreSQL** (15/16). In locale basta Docker; su Render lo crea
  il blueprint (vedi `RENDER.md`).
- Python 3 (solo per rigenerare contenuti/varianti, vedi `ADATTARE.md`).

## 2. Passi di ricostruzione

```bash
# 1. Ottieni il codice
git clone https://github.com/IL-TUO-UTENTE/IL-TUO-REPO.git
cd IL-TUO-REPO

# 2. Installa le dipendenze (usa il lockfile incluso)
pnpm install --frozen-lockfile

# 3. Configura l'ambiente
cp .env.example .env
#    .env: DATABASE_URL=postgresql://user:pass@host:5432/db
#          BETTER_AUTH_SECRET=$(openssl rand -base64 32)
#          NODE_ENV=development
#    (Con Render Blueprint non serve il .env: vedi RENDER.md)

# 4. Crea le tabelle del database
pnpm db:push

# 5a. Sviluppo
pnpm dev                    # → http://localhost:3000

# 5b. Produzione
pnpm build
node dist/index.js          # oppure docker build -t schema-interattivo .
```

## 3. Verifica che la ricostruzione sia corretta

| Cosa | Come verificarla |
|---|---|
| Home studente | `/` → inserisci un codice classe |
| Attività studente | `/schema?code=XXXX` dopo che il docente ha creato la classe e avviato la sessione |
| Dashboard docente | `/docente` → crea/riapri classe (codice 4 cifre + password) |
| Griglia e parole | Lo studente posiziona le 12 parole chiave (drag & drop desktop + tap/touch mobile) |
| Report PDF | Da `/docente`, pulsanti REPORT PDF / PDF BIANCO / SCHEMA COMPLETO |
| Accessibilità | Barra accessibilità su ogni pagina (Font, Interlinea, Righello, Modalità, Ascolto) |
| Font OpenDyslexic | `GET /fonts/OpenDyslexic-Regular.woff2` risponde con CORS `*` |
| Embed/iframe | In un iframe l'app invia `postMessage({type:"labvisivo:height"})` e aggiunge la classe `lf-embedded` |
| Test automatici | `pnpm check` + `pnpm build` + `pnpm test` |

**QA PDF (obbligatorio dopo un rebuild):** il test
`server/reportPdf.qa.test.ts` rigenera `/tmp/qa/report-qa.pdf` con i tre stati
(risposta esatta / sbagliata con parola sbagliata / non data). Verifica
visivamente che NON compaiano le scritte CORRETTA/INCORRETTA né la riga
RIEPILOGO, e che compaiano invece `NON DATA`, i pesi e la legenda dei simboli.

## 4. Struttura da ricostruire (mappa di riferimento)

```
├── client/                     # Frontend Vite + React + Tailwind 4
│   ├── public/fonts/           # ⭐ OpenDyslexic auto-ospitato (Regular/Bold, .woff2/.ttf/.otf)
│   └── src/
│       ├── main.tsx            # mount + initHeightSync()
│       ├── App.tsx             # Router + AccessibilityProvider (tutte le pagine)
│       ├── contexts/AccessibilityContext.tsx   # stato barra accessibilità (localStorage)
│       ├── components/AccessibilityToolbar.tsx # barra 5 moduli (Font, Interlinea, Righello, Modalità, Ascolto)
│       ├── hooks/useReadAloud.ts               # TTS (Web Speech API)
│       ├── lib/heightSync.ts                   # altezza embed iframe (labvisivo:height)
│       ├── lib/reportPdf.ts                    # ⭐ PDF: foglio bianco + soluzione + SCHEMA COMPLETO
│       ├── pages/Home.tsx                      # join studente
│       ├── pages/StudentSchema.tsx             # griglia studente (data-driven)
│       ├── pages/TeacherPage.tsx               # dashboard docente (data-driven)
│       └── index.css                           # @font-face + .lf-* embed + date input centrate
├── server/
│   ├── _core/index.ts          # Express: /fonts con CORS, static, vite, tRPC
│   ├── routers.ts              # API tRPC classi/studenti/risposte
│   ├── db.ts / storage.ts      # accesso dati (PostgreSQL)
│   └── schema-data.ts          # ⭐ CONTENUTO (GRID_ROWS, GRID_SLOTS, ALL_KEYWORDS…)
├── drizzle/                    # schema DB + migrazioni
├── deploy/                     # Dockerfile multi-stage, docker-compose, entrypoint
├── render.yaml                 # Blueprint Render (DB + web service)
├── cornice-dinamica/           # embed per Blogger (altezza automatica + OpenDyslexic)
├── skills/                     # skill di manutenzione e clonazione (per agenti IA)
├── tools/rebuild_schema_data.py# rigenera schema-data.ts + snippet PDF da JSON
└── *.md                        # REBUILD/ADATTARE/RENDER/ACCESSIBILITA/AGENTS (questo repo)
```

I file **mirror alla radice** (`TeacherPage.tsx`, `StudentSchema.tsx`,
`reportPdf.ts`, `routers.ts`, `schema-data.ts`) sono copie identiche dei file
sorgente: sono lì per comodità e per gli script; non modificarli separatamente
(vedi `AGENTS.md` §2.3).

## 5. Checklist per un agente IA

1. Clona e verifica la presenza dei file chiave (`package.json`,
   `client/src/pages/StudentSchema.tsx`, `client/src/pages/TeacherPage.tsx`,
   `server/schema-data.ts` con `GRID_ROWS`, `drizzle/schema.ts`,
   `client/public/fonts/`).
2. Esegui `pnpm install --frozen-lockfile`, `pnpm check`, `pnpm test`.
3. Non rigenerare `schema-data.ts` se vuoi l'**identica** app: il contenuto
   attuale è già nel file.
4. Se qualcosa non corrisponde alla sorgente Easy-Peasy, confronta con
   `AGENTS.md` (mirror) e con la skill `skills/schema-quiz-builder/SKILL.md`.
