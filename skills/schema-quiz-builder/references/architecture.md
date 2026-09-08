# Architecture Reference

## 1. File Tree Funzionale

```
project-root/
├── cornice-dinamica/            # Embed v3 per Blogger (NON servita dall'app: vive nel repo/ZIP)
│   ├── embed-<APP>-dedicata.html   # ⭐ dedicata (impermeabile + anti-loop)
│   ├── embed-<APP>-lite.html       # lite riutilizzabile
│   ├── embed-<APP>.html            # autosufficiente (font base64)
│   ├── embed-universale.html       # template segnaposto
│   ├── test-dedicata.html / test-impermeabile.html
│   ├── fonts/  + README.md
├── client/src/
│   ├── main.tsx                 # initHeightSync() all'avvio
│   ├── App.tsx                  # Routing (3 routes) + AccessibilityProvider + AccessibilityToolbar
│   ├── index.css                # Tema, OpenDyslexic @font-face, regole lf-embedded/lf-ruler/lf-hc/lf-welcome*
│   ├── contexts/
│   │   └── AccessibilityContext.tsx  # Stato accessibilità (font, interlinea, righello, contrasto)
│   ├── hooks/
│   │   └── useReadAloud.ts          # TTS (Web Speech), lettura ad alta voce
│   ├── components/
│   │   ├── AccessibilityToolbar.tsx # Barra accessibilità 5 moduli (su tutte le pagine)
│   │   └── ui/                      # shadcn/ui components
│   ├── pages/
│   │   ├── Home.tsx             # → STUDENT JOIN (codice 4 cifre → /schema?code=XXXX)
│   │   ├── StudentSchema.tsx     # → ATTIVITÀ INTERATTIVA (slot dropdown, fasi, submit)
│   │   └── TeacherPage.tsx      # → DASHBOARD DOCENTE (sidebar + main area)
│   ├── lib/
│   │   ├── trpc.ts              # tRPC client setup
│   │   ├── heightSync.ts        # Sync altezza iframe (protocollo labvisivo:height + ping)
│   │   └── reportPdf.ts         # Generazione PDF (OpenDyslexic embedded, report + blank)
│   ├── public/fonts/            # OpenDyslexic auto-ospitati (TTF/OTF/WOFF2) → /fonts/*
│   └── components/ui/           # shadcn/ui components
├── server/
│   ├── routers.ts               # tRPC endpoints (classes, schema, answers)
│   ├── db.ts                    # Database helpers + in-memory store (showSolution)
│   ├── schema-data.ts           # → IL FILE DA MODIFICARE (dati del contenuto)
│   ├── _core/index.ts           # CORS su /fonts/* (Access-Control-Allow-Origin: *)
│   └── storage.ts               # R2 file storage (non usato dall'app base)
├── drizzle/
│   ├── schema.ts                # DB tables: classes, students, answers
│   └── migrations/              # Database migrations
├── shared/
│   ├── types.ts                 # Re-export dei tipi
│   └── const.ts                 # Costanti condivise
└── deploy/                      # Docker + Render config
```

## 2. Database Schema

### `classes`
| Field | Type | Notes |
|-------|------|-------|
| id | text PK | nanoid |
| name | text | Nome classe (es. "3A Liceo") |
| code | text UNIQUE | 4 cifre numeriche |
| password | text? | Per riaprire classe |
| isActive | boolean | Se la classe è visibile |
| sessionStarted | boolean | Se la sessione live è iniziata |
| date | text | Data (YYYY-MM-DD) |
| year | text | Anno scolastico |
| studentCount | integer | Numero studenti |
| createdAt | timestamp | Auto |

### `students`
| Field | Type | Notes |
|-------|------|-------|
| id | text PK | nanoid |
| classId | text FK→classes | Classe di appartenenza |
| name | text | Nome studente |
| score | integer | Punteggio (0-TOTAL_SLOTS) |
| completed | boolean | Attività completata |
| createdAt | timestamp | Auto |

### `answers`
| Field | Type | Notes |
|-------|------|-------|
| id | text PK | nanoid |
| studentId | text FK→students | Studente |
| classId | text FK→classes | Classe |
| slotId | text | Riferimento allo slot nello schema |
| selectedKeyword | text | Parola selezionata |
| isCorrect | boolean | Corretta o meno |
| createdAt | timestamp | Auto |

## 3. tRPC Endpoint Catalog

### `classes.*`
| Endpoint | Input | Output | Purpose |
|----------|-------|--------|---------|
| `create` | `{name, year?, date?, studentCount?, password?}` | Class | Nuova classe |
| `join` | `{code: 4-char, studentName}` | `{class, student}` | Studente entra |
| `getByCode` | `{code: 4-char}` | Class\|null | Verifica codice |
| `getById` | `{id}` | Class (con showSolution) | Info classe |
| `listActive` | — | Class[] | Classi attive |
| `listAll` | — | Class[] | Tutte le classi |
| `startSession` | `{id}` | Class | Avvia sessione |
| `endSession` | `{id}` | Class | Termina sessione |
| `close` | `{id}` | Class | Chiudi classe |
| `reopen` | `{code, password}` | Class | Riapri classe |
| `reset` | `{id}` | Class | Reset (cancella studenti+risposte) |
| `delete` | `{id}` | Class | Elimina classe |
| `removeStudent` | `{studentId}` | Student | Rimuovi studente |
| `setShowSolution` | `{id, show: 0\|1}` | `{id, showSolution}` | Mostra/nascondi soluzione |
| `getStudents` | `{id}` | Student[] | Studenti della classe |
| `stats` | `{id}` | Stats | Statistiche |
| `report` | `{id}` | ReportData | Dati per PDF |

### `schema.*`
| Endpoint | Input | Output | Purpose |
|----------|-------|--------|---------|
| `rows` | — | SchemaRow[] | Righe dello schema |
| `keywords` | — | string[] | Tutte le keyword |
| `totalSlots` | — | number | Numero slot totali |
| `slots` | — | SchemaSlot[] | Slot con opzioni |

### `answers.*`
| Endpoint | Input | Output | Purpose |
|----------|-------|--------|---------|
| `submit` | `{studentId, classId, slotId, selectedKeyword, isCorrect}` | Answer | Salva risposta |
| `list` | `{studentId}` | Answer[] | Risposte studente |
| `complete` | `{studentId, score}` | Student | Completa attività |

## 4. Flussi Utente

### Flusso Studente
```
Home.tsx → codice 4 cifre + ENTRA → /schema?code=XXXX
→ Inserisce nome → joined=true
→ Vede schema con slot dropdown per ogni fase
→ Seleziona keyword per ogni slot → SUBMIT
→ Risultati fase per fase
→ COMPLETA → score salvato
```

### Flusso Docente
```
/docente → sidebar: CREA CLASSE (nome + password)
→ Codice #XXXX generato → classe nella sidebar
→ Seleziona classe → card classe principale
→ AVVIA SESSIONE → studenti possono entrare
→ Vede contatore studenti attivi, tabella risposte
→ (opzionale) MOSTRA RISPOSTA ESATTA
→ TERMINA SESSIONE → genera report PDF
→ (opzionale) RIAPRI CLASSE DA CODICE
```

## 5. In-Memory State

Il flag `showSolution` (mostra risposta esatta) è gestito in memoria via `Map<string, number>` in `server/db.ts`. **Non è persistito** — si azzera al riavvio del server. Questo è intenzionale: la soluzione si resetta automaticamente per ogni nuova sessione.

## 6. PDF Generation

- **jsPDF** con font **OpenDyslexic** (Regular + Bold) embeddato in base64 da `/fonts` (`client/public/fonts`), con fallback automatico su "times" se il fetch fallisce (vedi REGOLA 35)
- I simboli ✔ / ✘ sono **vettori disegnati** (OpenDyslexic non ha i glifi U+2714/U+2718)
- Report PDF: 1 pagina per studente con risposte raggruppate per fase
- Blank PDF: schema vuoto per pratica, **data lasciata in bianco** (lo studente scrive a mano)
- I colori delle fasi sono hardcoded in `reportPdf.ts`

## 7. Iframe Embed & Cornice Dinamica

- In `client/src/lib/heightSync.ts`, `initHeightSync()` (chiamato in `main.tsx`): se l'app è dentro un iframe aggiunge `lf-embedded` a `<html>` (disattiva i min-h-screen) e invia `window.parent.postMessage({ type: "labvisivo:height", height, cornice? }, "*")`.
- Risponde ai ping `{ type: "labvisivo:ping", cornice }` dal genitore, e rimanda l'altezza su load/resize/ResizeObserver/250ms/500ms/1500ms.
- La **cornice dinamica** (cartella `cornice-dinamica/` alla radice, NON servita dall'app) è un blocco HTML autonomo per Blogger: scoping DOM via `document.currentScript`, id con token univoco, filtro `e.source`, anti-loop, stato ONLINE/ERRORE con Riprova, pulsanti Schermo intero/Ricarica, font OpenDyslexic via `/fonts/*` (CORS). Versioni: dedicata ⭐, lite, autosufficiente, universale (template).
- Regole CSS embed in `index.css`: `html.lf-embedded .min-h-screen { min-height:0 }`, `html.lf-embedded .lf-welcome` (padding 20px top + 4px margine barra = 24px, 24px bottom), `html.lf-welcome-top` (canvas bianco sotto la card).

## 8. Accessibilità (DSA/BES/ipovisione)

Suite portata da PAROLE-CHIAVE-INTERATTIVE (vedi REGOLE 7d e 35 della skill):
- `AccessibilityContext.tsx`: stato fontScale (0.8–1.6), lineHeight (1.5–2.6), ruler, mode (normale/contrasto); localStorage key `schema_access`; applica su `<html>` fontSize 16×scale px, CSS vars `--lf-scale`/`--lf-lh`, classi `lf-ruler`/`lf-hc`; banda righello `#lf-ruler-band` che segue il mouse.
- `AccessibilityToolbar.tsx`: barra 5 moduli (FONT A−/A+, INTERLINEA, RIGHELLO ON/OFF, MODALITÀ Normale/Contrasto, ASCOLTO Leggi/Stop) con `role="toolbar"`, gruppi `role="group"` con `aria-label`, pulsanti con `aria-pressed`, `sr-only`, live region `role="status"`. Renderizzata in `App.tsx` → visibile su TUTTE le pagine.
- `useReadAloud.ts`: TTS Web Speech, voce italiana migliore, legge tutta la pagina COMPRESI i pulsanti (le keyword sono `<button>` — NON escluderli), MAIUSCOLE→minuscole, date/numeri in forma naturale.
- Font OpenDyslexic auto-ospitati in `client/public/fonts`, `@font-face` in `index.css`; `server/_core/index.ts` serve `/fonts/*` con `Access-Control-Allow-Origin: *` (necessario dentro l'iframe).
