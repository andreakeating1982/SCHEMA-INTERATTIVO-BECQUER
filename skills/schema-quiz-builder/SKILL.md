---
name: schema-quiz-builder
description: "Build, adapt, and maintain interactive schema/quiz classroom apps (Vite + React + TypeScript + Tailwind + tRPC + Drizzle). L'app sorgente di riferimento è SCHEMA INTERATTIVO (in /home/user/becquer-schema-full-app). Use when: building a NEW interactive classroom app, adapting an existing app to a NEW question set/topic, debugging the teacher dashboard or student flow, modifying session management, room codes, PDF generation, iframe embedding, or accessibility features (barra accessibilità 5 moduli, OpenDyslexic UI/PDF, TTS, righello, alto contrasto, heightSync, CORS fonts). Use for ANY request about the app structure regardless of whether the user mentions 'schema app'. Per clonare l'app sorgente in una NUOVA app identica con un set di domande diverso usare la skill schema-interattivo-sorgente. MUST read before making any changes to the app."
---

# Schema / Quiz Interactive App Builder

Architettura compatta e riproducibile di un'app interattiva per aule scolastiche con flusso studente-docente, codici stanza, sessioni live, e generazione PDF.

## Architettura Generale

### Stack
- **Frontend**: Vite + React 19 + TypeScript + Tailwind CSS 4 + tRPC React Query + wouter (routing)
- **Backend**: Express + tRPC Server + Drizzle ORM + PostgreSQL
- **PDF**: jsPDF
- **Deploy**: Cloud Run (Docker), Render

### Routing (client/src/App.tsx)
| Path | Page | Purpose |
|------|------|---------|
| `/` | Home.tsx | Student join screen (enter code) |
| `/schema` | StudentSchema.tsx | Interactive schema/quiz activity |
| `/docente` | TeacherPage.tsx | Teacher dashboard (monitor, manage) |

### Database Tables (drizzle/schema.ts)
- `classes` — Each class session created by a teacher (name, code, password, isActive, sessionStarted)
- `students` — Students who joined (classId, name, score, completed)
- `answers` — Individual slot answers per student (studentId, classId, slotId, selectedKeyword, isCorrect)

### tRPC Endpoints (server/routers.ts)
See `references/architecture.md:13` for the full endpoint catalog.

## Workflow di Adattamento (Schema → Nuovo Tema)

Quando l'utente chiede di cambiare il contenuto dell'app (es. da "schema letterario" a "quiz di storia"), segui ESATTAMENTE questa procedura:

### Step 1: Identificare il "riferimento"
L'app originaria è considerata il **riferimento d'oro** per layout, UX e funzionalità. Il nuovo contenuto DEVE mantenere:
- Tutte le 3 pagine con routing identico
- Tutti i pulsanti e flussi (crea classe, unisciti, start/end sessione, mostra/nascondi risposta, report PDF)
- Stessa palette colori (plum, emerald, amber)
- Cambria come font primario
- Stesse card, badge, tabelle

### Step 2: Modificare SOLO i dati del contenuto
**NON ricostruire l'app da zero.** Modifica solo:
1. `server/schema-data.ts` — Il file contenente le strutture dati (righe, keyword, slot)
2. `shared/const.ts` — Opzionale: eventuali costanti specifiche
3. `drizzle/schema.ts` — Mai da toccare a meno che non servano nuovi campi

### Step 3: Verifica tipografica
- Esegui `pnpm check` (tsc --noEmit) per trovare errori TypeScript
- NON ignorare mai errori TS — fixali subito

### Step 4: Build e deploy
- `pnpm build` — verifica build passi
- Deploy con `webdev_deploy` mode="production"

## Regole D'oro (Golden Rules)

Queste regole sono state imparate a caro prezzo durante lo sviluppo. Violarle causerà regressioni.

### REGOLA 1: Non cambiare mai i nomi delle icone o la struttura JSX
- Non cambiare `Eye` in qualcos'altro a meno che l'utente non lo chieda esplicitamente
- Non modificare la struttura dei componenti Card, Badge, Button della sidebar

### REGOLA 2: La prop `style` in React va come oggetto, non stringa
```tsx
// SBAGLIATO — causa errore TS
<span style="font-family: Cambria;">codice</span>

// GIUSTO
<span style={{ fontFamily: "Cambria, Georgia, serif" }}>codice</span>
```

### REGOLA 3: Itera le Map con `Array.from()`
```tsx
// SBAGLIATO — richiede --downlevelIteration
for (const [key, val] of myMap) { }

// GIUSTO
for (const [key, val] of Array.from(myMap)) { }
```

### REGOLA 4: Placeholder centrato + cursore
Usa la classe `.center-placeholder` definita in `index.css` sui campi input per centrare il placeholder:

**Sidebar (campi input docente):** Il cursore deve partire dal centro. Usa `text-center center-placeholder`:
```tsx
<Input className="text-center center-placeholder" placeholder="Nome classe" />
<Input className="text-center center-placeholder" placeholder="Password" />
<Input className="text-center center-placeholder" placeholder="Codice" />
```

**Altrove (es. form login studente):** Cursore a sinistra con placeholder centrato:
```tsx
<Input className="text-left center-placeholder" placeholder="Testo centrato" />
```

Il CSS nativo per nascondere la doppia icona occhio nei campi password è già in `index.css`.

**⚠️ Attenzione:** Per la data INPUT nel form creazione classe, NON centrare — usa `!text-center` per annullare eventuali override.

### REGOLA 5: Disabilitazione bottoni con nuance colore
Usa sempre `opacity-50` e MAI colori grigi quando disabiliti bottoni:
```tsx
<Button disabled={condizione} className="disabled:opacity-50 disabled:cursor-not-allowed">
```

### REGOLA 6: Testi uppercase forzati
- "AREA DOCENTE", "AREA STUDENTI" — sempre uppercase nell'HTML
- "SCHEMA INTERATTIVO" — sempre uppercase
- NESSUN footer "REALIZZATO DA ANDREA CENTINARO": il footer di credito è stato RIMOSSO da Home.tsx e TeacherPage.tsx (come nell'app sorgente PAROLE-CHIAVE-INTERATTIVE, nessuna pagina mostra crediti in calce)
- "INSERISCI IL CODICE FORNITO DAL DOCENTE PER INIZIARE L'ATTIVITÀ" — sempre uppercase
- Tutti i messaggi informativi in dashboard (nessuna classe, nessuno studente, auto-rimozione) — sempre uppercase
- **Nomi degli studenti nella lista** — sempre uppercase via CSS `uppercase` sulla classe (es. `className="... uppercase"`), NON con JS `.toUpperCase()` per evitare re-render
- **"MOSTRA RISPOSTA ESATTA" / "NASCONDI RISPOSTA ESATTA"** — sempre uppercase nel JSX. Font size: `text-[10px]` (corrisponde a pt 10)

### REGOLA 7: Iframe posting
L'app usa `window.postMessage` con tipo `labvisivo:height` per resizing dinamico in iframe.
Non cambiare mai questo tipo — è usato dal sistema di embedding.

### REGOLA 7b: Margini prima pagina (Home/Welcome) — layout `lf-welcome` + `lf-welcome-top`
La prima pagina (`client/src/pages/Home.tsx`) usa il layout compatto **uguale all'app sorgente PAROLE-CHIAVE-INTERATTIVE** e alla foto di riferimento `margini_prima_pagina.png`: contenuto subito sotto la barra di accessibilità, 24px simmetrici nella cornice, nessun grande vuoto crema sotto la card.
- `Home.tsx` wrappa TUTTO in `<div className="lf-welcome flex flex-col items-center bg-background paper-grain px-4 pb-8 sm:pb-12">` con un figlio `<div className="flex w-full flex-col items-center pt-4 sm:pt-8">`. NIENTE `min-h-screen` sul wrapper: la pagina deve terminare subito sotto la card.
- Header compatto: `w-full max-w-5xl` (senza `py-6 sm:py-9`), riga interna `mb-4 ... sm:mb-5`; main `w-full flex justify-center` (senza `px-4 pb-16`, senza `flex-1`).
- In `Home.tsx` c'è un `useEffect` che, SOLO se `window.self === window.top` (vista autonoma, fuori dall'iframe), aggiunge `lf-welcome-top` a `<html>` (e lo rimuove in cleanup). Dentro la cornice NON va aggiunta: lì è heightSync (`client/src/lib/heightSync.ts`, chiamato in `main.tsx`) a impostare `lf-embedded` e segnalare l'altezza reale.
- In `client/src/index.css` esistono (non rimuoverli):
  - `html.lf-embedded .lf-welcome { min-height:0; justify-content:flex-start; padding-top:20px; padding-bottom:24px }` → nella cornice 4px (margine barra) + 20px = 24px sopra, 24px sotto, simmetrici.
  - `html.lf-embedded .lf-welcome > div:first-child { padding-top:0 !important }` (annulla il pt-4 sm:pt-8 dentro la cornice).
  - `html.lf-welcome-top body { background-color:#fff }`, `.lf-welcome { position:relative }` e `.lf-welcome::after` (gradiente 48px crema→bianco in fondo al blocco crema).

### REGOLA 7c: Cornice dinamica per Blogger (cartella `cornice-dinamica/`)
La cartella `cornice-dinamica/` alla radice del progetto (portata dall'app sorgente PAROLE-CHIAVE-INTERATTIVE) contiene la cornice embed v3 per Blogger — NON è servita dall'app (vive solo nel repo e nel pacchetto ZIP):
- `embed-schema-interattivo-dedicata.html` ⭐ **versione consigliata (~18 KB, v3 IMPERMEABILE + ANTI-LOOP)**: serve SOLO SCHEMA INTERATTIVO (URL fisso `https://becquer-schema-interattivo.easy-peasy.site/`), scoping DOM via `document.currentScript`, id con token univoco, filtro `e.source`, niente transizione CSS sull'altezza, debounce 200 ms, clamp 100–15000 px, conferma salti sospetti, stato ONLINE/ERRORE con Riprova (timeout 15 s), pulsanti Schermo intero/Ricarica, spinner, font OpenDyslexic via `/fonts/*` (CORS).
- `embed-schema-interattivo-lite.html` (~5 KB) e `embed-universale.html` (template segnaposto per altre app, NON rinominarlo) e `embed-schema-interattivo.html` (autosufficiente ~110 KB, font OpenDyslexic incorporati in base64).
- `test-dedicata.html` (simula il post Blogger) e `test-impermeabile.html` (2 cornici + intruso che posta altezze false: verifica che ogni istanza resti ONLINE alla propria altezza reale).
- `fonts/` (copie WOFF2) e `README.md` (uso + ricostruzione).

**Se cambi l'URL di produzione** aggiorna in TUTTI i file rinominati: `https://becquer-schema-interattivo.easy-peasy.site` (inclusi gli `@font-face`), i titoli/`APP_TITLE` (`SCHEMA INTERATTIVO`) e, solo nel file lite, l'id `schemaInterattivoIframe`. Per TESTARE in preview: copia la cartella in `client/public/cornice-dinamica/` (es. apri `/cornice-dinamica/test-dedicata.html`), poi RIMUOVI la copia — la cartella canonica sta alla radice.

### REGOLA 7d: Suite Accessibilità (DSA/BES/ipovisione) — NON rimuovere (portata da PAROLE-CHIAVE-INTERATTIVE)

L'app è stata resa accessibile come nell'app sorgente PAROLE-CHIAVE-INTERATTIVE: barra 5 moduli, font OpenDyslexic (UI + PDF), TTS, righello di lettura, alto contrasto, sync altezza iframe. Tutti i pezzi sono VINCOLANTI (un utente DSA/BES/ipovedente ci conta):

**File (client/src):**
- `contexts/AccessibilityContext.tsx` — Provider + hook `useAccessibility()`. Stato: `fontScale` (0.8–1.6, default 1), `lineHeight` (cicla [1.5, 1.65, 1.9, 2.2, 2.6]), `ruler` (bool), `mode` ("normale"|"contrasto"). Persistito in localStorage (key `schema_access`). Applica su `<html>`: `fontSize = 16×scale` px, variabili CSS `--lf-scale` e `--lf-lh`, classi `lf-ruler` e `lf-hc`; rende la banda `#lf-ruler-band` che segue il mouse.
- `components/AccessibilityToolbar.tsx` — la barra, renderizzata UNA volta in `App.tsx` (visibile su TUTTE le pagine, sopra il contenuto). 5 moduli, ognuno `role="group"` con `aria-label`: FONT (A− / A+ con % in `aria-live`), INTERLINEA (cicla il valore), RIGHELLO (ON/OFF con `aria-pressed`), MODALITÀ (Normale/Contrasto con `aria-pressed`), ASCOLTO (Leggi/Stop con `aria-pressed`, usa `useReadAloud`). Icone lucide `aria-hidden`, descrizione introduttiva `sr-only`, live region `role="status"`. NON cambiare etichette aria né togliere moduli.
- `hooks/useReadAloud.ts` — TTS via Web Speech: sceglie la voce italiana migliore, legge TUTTA la pagina COMPRESI i `<button>`/chip (le parole chiave sono pulsanti: NON escluderli!), converte MAIUSCOLE→minuscole, legge date e numeri in forma naturale.

**Font e CSS:**
- Font OpenDyslexic auto-ospitati in `client/public/fonts/` (Regular/Bold/Italic .ttf/.otf/.woff2), `@font-face` in `index.css` serviti da `/fonts/*`, `--font-sans`/`--font-serif` con OpenDyslexic per primo; body `font-size: calc(16px * var(--lf-scale, 1))`, `line-height: var(--lf-lh, 1.5)`. NON rimuovere i file font (servono a UI E PDF).
- CSS dedicato in `index.css`: `html.lf-ruler .lf-ruler-band`, `html.lf-hc` (filtro contrasto/saturazione + card bianche), `html.lf-embedded .min-h-screen` → `min-height:0` (dentro l'iframe), regole `html.lf-welcome*` (v. REGOLA 7b).

**Server:**
- `server/_core/index.ts` monta `app.use("/fonts", ...)` con `Access-Control-Allow-Origin: *` — SENZA questo header il browser blocca OpenDyslexic quando l'app è nella cornice iframe (Blogger). NON toglierlo.

### REGOLA 8: Codice classe
- 4 cifre numeriche, generate con `Math.floor(1000 + Math.random() * 9000).toString()`
- Sempre mostrato con prefisso `#`
- Font: Cambria bold tracking-widest

### REGOLA 9: Centratura nome classe nella sidebar — NON cliccabile
Nella sezione "LE TUE CLASSI" della sidebar docente, le righe classe NON devono essere cliccabili. Rimuovi ogni `onClick`, `cursor-pointer` e `hover:bg-*`.

SOLO il nome della classe deve essere centrato. Il pallino resta a sinistra, codice e cestino a destra.

**⚠️ ATTENZIONE:** `flex-1` con `text-center` e CSS Grid `1fr` con `text-center` NON garantiscono il centraggio perfetto. Usa **centraggio assoluto** con `left-1/2 -translate-x-1/2`.

✅ **Corretto (funziona sempre):**
```tsx
<div className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm relative">
  <div className="size-2 rounded-full shrink-0 ..." />                        {/* ← sinistra */}
  <span className="absolute left-1/2 -translate-x-1/2 truncate font-medium
                  max-w-[55%] text-center">                                  {/* ✓ sempre centrato */}
    {cls.name}
  </span>
  <span className="ml-auto text-xs font-mono text-muted-foreground shrink-0">  {/* → destra */}
    {cls.code}
  </span>
  {/* NESSUNA icona cestino qui — l'eliminazione classe avviene dal pulsante nella dashboard */}
</div>
```

**Meccanismo:**
- `relative` sul contenitore — ancora il posizionamento assoluto
- `absolute left-1/2 -translate-x-1/2` centra SEMPRE il testo matematicamente, indipendentemente dagli altri elementi
- `max-w-[55%]` impedisce al nome di sovrapporsi a pallino (sinistra) e codice (destra)
- `ml-auto` sullo span del codice lo spinge a destra
- `shrink-0` su pallino e cestino impedisce che vengano compressi
- **NON** aggiungere `onClick`, `cursor-pointer`, `hover:bg-muted/50` o `transition-colors`

### REGOLA 10: ELIMINA CLASSE — dalla dashboard, non dalla sidebar

Il pulsante per eliminare una classe NON deve stare nella sidebar "LE TUE CLASSI".
Invece:

1. **Rimuovere** l'icona `Trash2` da ogni riga classe nella sidebar
2. **Aggiungere** un pulsante `ELIMINA CLASSE` nella dashboard docente (card Info Classe), accanto al pulsante `CHIUDI`
3. Quando premuto, deve:
   - Chiudere immediatamente la dashboard (`setActiveClassId(null); setActiveClassInfo(null); setExpandedStudent(null)`)
   - Eliminare la classe dal DB tramite `deleteClassMutation.mutate({ id })`

**Implementazione dell'onSuccess della mutation:**
```tsx
const deleteClass = trpc.classes.delete.useMutation({
  onSuccess: () => {
    toast.success("Classe eliminata");
    utils.classes.listAll.invalidate();
    setActiveClassId(null);
    setActiveClassInfo(null);
    setExpandedStudent(null);
  },
  onError: (err) => toast.error(err.message),
});
```

**Pulsante nella card Info Classe:**
```tsx
<Button onClick={() => {
  if (activeClassId && confirm('Eliminare definitivamente...')) {
    deleteClass.mutate({ id: activeClassId });
  }
}} disabled={deleteClass.isPending} variant="outline"
  className="border-red-400 text-red-700 hover:bg-red-50 ...">
  {deleteClass.isPending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
  <span>ELIMINA CLASSE</span>
</Button>
```

**⚠️ Attenzione a TypeScript:** `activeClassId` è `string | null`. Usare `activeClassId!` o un guard `if (activeClassId)` prima di passarlo a `.mutate({ id: activeClassId })`.

### REGOLA 11: PDF generato
- Il PDF bianco (blank) NON deve mai contenere la data precompilata — linea lasciata vuota per lo studente
- Il font nei PDF è **OpenDyslexic** (Regular+Bold embeddati da `/fonts` in `reportPdf.ts`), con fallback automatico su "times" (jsPDF built-in) se il font non si carica (dettagli: REGOLA 35)
- 1 pagina per studente nel report
- **Risposte corrette**: usare `textColor` verde (es. `#15803d`) e `fontStyle: 'italic'` — MAI grassetto
- **Margini**: Top = 2.5, Bottom/Left/Right = 2.0 (unità: mm)
- **Overflow**: Usare SEMPRE `doc.splitTextToSize()` per i testi lunghi (parole chiave, nomi, etichette) per evitare overflow fuori pagina
- **SplitTextToSize**: esempio corretto → `doc.splitTextToSize(testo, larghezza)`. La larghezza va calcolata come `doc.internal.pageSize.getWidth() - margins.left - margins.right`
- **Header report**: "RELAZIONE STUDENTE" in `doc.setFontSize()` bold
- **Niente etichette CORRETTA/INCORRETTA e niente riga RIEPILOGO (da sett 2026)**: il report NON stampa più le parole CORRETTA / INCORRETTA accanto alle risposte (bastano i segni ✔ verde / ✘ rossa, vettoriali) e NON include più la riga finale "RIEPILOGO — CORRETTE: n · INCORRETTE: n · NON DATE: n". Restano: la parola data dallo studente (verde se esatta, rossa se sbagliata), la parola esatta in verde dopo la freccia sulle sbagliate, la scritta "NON DATA · peso 0,50" per gli slot vuoti, il "peso 0,25/0,50" a destra sulle righe compilate e la legenda dei simboli in fondo (il significato non dipende dal colore). Dettagli e implementazione: REGOLA 37.

### REGOLA 12: Hotspot studente grigio (uguale alla classe)

L'hotspot dello studente nella sezione "STUDENTI ATTIVI NELLA SESSIONE" deve essere **identico** all'hotspot delle classi in "LE TUE CLASSI": un semplice pallino grigio.

**NON usare** indicatori colorati (verde per completato, ambra per in corso) né icone (Check, Clock).

✅ **Corretto:**
```tsx
<div className="size-2 rounded-full shrink-0 bg-gray-300" />
```

**Nome centrato tra hotspot e contatore:**
```tsx
<div className="flex items-center gap-2.5 px-3 py-1.5">
  <div className="size-2 rounded-full shrink-0 bg-gray-300" />   {/* ← hotspot */}
  <span className="flex-1 text-center truncate uppercase">       {/* ← nome centrato */}
    {student.name}
  </span>
  <div className="text-sm font-bold ... shrink-0">               {/* → contatore */}
    {correctAnswers}/{totalSlots}
  </div>
  <button className="...">...                                   {/* → elimina */}
</div>
```

### CORREZIONI PDF: FASE 5 slot fuori bordo, legenda sovrapposta, tooltip

#### Problema: celle multi-slot FASE 5 traboccanti
Quando una riga dello schema ha più slot per colonna (es. FASE 5 con 2 slot), il calcolo `cellH` non includeva il padding verticale necessario:
```tsx
// PRIMA: cellH = 30mm — slot 2 usciva dal bordo
const cellH = hasMulti ? rowHMulti * maxSlots + slotGap * (maxSlots - 1) : rowH;
// DOPO: cellH = 34mm — tutti gli slot stanno dentro
const cellH = hasMulti ? rowHMulti * maxSlots + slotGap * (maxSlots - 1) + 4 : rowH;
```
Il +4 aggiunge 2mm di padding sopra + 2mm sotto. Applicato in `reportPdf.ts` in entrambi i PDF (bianco e completo).

#### Problema: legenda PDF sovrapposta
La legenda usava larghezza fissa `legItemW = 18` per ogni elemento, ma "PAROLA CHIAVE" a font size 6 misura ~34mm. Sostituito con larghezza dinamica:
```tsx
// PRIMA: legItemW = 18 fisso → overlap
const legItemW = 18;
let legX = (PW - legendItems.length * legItemW) / 2;

// DOPO: larghezza = textWidth + 8mm per ogni label
const legWidths = legendItems.map((li) => doc.getTextWidth(li.label) + 8);
const totalLegWidth = legWidths.reduce((s, w) => s + w, 0);
let legX = (PW - totalLegWidth) / 2;
```

#### Problema: tooltip nome studente non visibile
Il `<div>` genitore dello studente aveva `overflow-hidden` che clippava il tooltip posizionato `absolute bottom-full` (sopra il button):
```tsx
// PRIMA: overflow-hidden clippava il tooltip
<div key={student.id} className="rounded-xl border border-border/50 overflow-hidden">
// DOPO: overflow visibile per il tooltip
<div key={student.id} className="rounded-xl border border-border/50">
```

### REGOLA 13: Persistenza studenti — nessuna auto-rimozione
**Tutti gli studenti iscritti restano sempre visibili nella dashboard docente.** Non esiste nessun filtro temporale (es. heartbeat di 10 minuti) per nascondere/rimuovere studenti inattivi.

La card "STUDENTI ATTIVI NELLA SESSIONE" mostra TUTTI gli studenti iscritti, indipendentemente da quanto tempo è passato dal loro ultimo accesso.

**Testo informativo da mostrare:**
```tsx
<p className="text-xs text-muted-foreground mb-5 leading-relaxed text-center">
  TUTTI GLI STUDENTI ISCRITTI RESTANO VISIBILI.
</p>
```

### REGOLA 14: Dashboard — etichette di stato da eliminare
Nella dashboard docente, rimuovere TUTTE le seguenti etichette di stato:

| Etichetta | Dove si trova | Azione |
|:----------|:--------------|:-------|
| `COMPLETATO/I` | Sotto il nome dello studente nel button | **Eliminare** l'intero `<p>` di stato |
| `IN CORSO` | Sotto il nome dello studente nel button | **Eliminare** (stesso `<p>` di sopra) |
| `completati` | Badge verde nella card SESSIONE | **Eliminare** lo span intero |
| `in corso` | Badge ambra nella card SESSIONE | **Eliminare** lo span intero |
| `NUMERO COMPLESSIVO DI STUDENTI FINORA PARTECIPANTI` | Badge nella card classe | **Eliminare** l'intero badge |
| `NELLA SESSIONE IN CORSO` | Badge "NUMERO STUDENTI ATTIVI" | Cambiare in `NELLA SESSIONE` |
| `IL CONTATORE NON SI AZZERA SE LO STUDENTE SALTA UNA DOMANDA` | Sotto il titolo studente attivi | **Eliminare** — tenere solo "TUTTI GLI STUDENTI ISCRITTI RESTANO VISIBILI." |

Lo studente nella lista deve mostrare:
```
[●]  NOME STUDENTE    5/12  [●●●●●]  [✕]  [▼]
     grey dot        score  fasi    elimina freccia
```

Dove i **5 cerchi fase** sono:
- **Pieni** (colore della fase) = studente ha risposto ad almeno uno slot di quella fase
- **Vuoti** (bordo colore, sfondo trasparente) = nessuna risposta in quella fase
- Colori: `#8B1A1A` (FASE 1/2), `#B8860B` (FASE 3), `#2E5E2E` (FASE 4), `#4A6FA5` (FASE 5), `#6B3FA0` (FASE 6/7)

**Eccezione per punteggio mancante:** quando `studentAnswers.length === 0`, il trattino `—` va sostituito con la label `IN ATTESA DI INVIO` in colore ambra.

### REGOLA 15: Centratura dashboard docenti
Tutte le scritte nella dashboard docente devono essere centrate, TRANNE:

| Sezione | Allineamento |
|:--------|:-------------|
| **SESSIONE** (titolo card) | **Sinistra** (NON centrare) |
| **RIAPRI UNA CLASSE** (sidebar) | **Sinistra** (NON centrare) |
| **LE TUE CLASSI** (sidebar) | **Sinistra** (NON centrare) |
| **CREA UNA NUOVA CLASSE** (sidebar) | ✅ Centrato (`justify-center`) |
| **NUMERO STUDENTI ATTIVI NELLA SESSIONE** | ✅ Centrato (`justify-center`) |
| **NUMERO STUDENTI ATTIVI badge** | ✅ Centrato (`text-center w-full`) |
| **Studente nome** | ✅ Centrato (`text-center`) |
| **Data numerica sotto nome classe** | ✅ Centrato (`text-center`) — NON centrare la data INPUT nel form creazione classe |
| **TUTTI GLI STUDENTI ISCRITTI...** | ✅ Centrato (`text-center`) |

### REGOLA 16: Report a tendina — dettaglio risposte
Quando si espande uno studente nella lista, il dropdown "Risposte" deve mostrare:

1. **Parole raggruppate per fase** (FASE 1/2 — LECTURA / LOCALIZACIÓN, ecc.)
2. **Ordinamento per `questionNumber`** all'interno di ogni fase
3. **Parola selezionata** dallo studente (campo `selectedKeyword`, NON `selectedAnswer` — attenzione: `selectedAnswer` è undefined!)
4. **Se sbagliata**: mostrare la **parola corretta** con una freccia `→`
5. **Icona**: `Check` verde per corretto, `XCircle` rosso per sbagliato
6. **Colori**: testo verde (`text-green-700`) per corretto, rosso (`text-red-700`) per sbagliato

**Implementazione corretta:**
```tsx
// Import SCHEMA_ROWS per costruire la mappa slotId → correctAnswer
import { SCHEMA_ROWS } from "../../../server/schema-data";

// Costruire mappa slotDetails
const slotDetails = useMemo(() => {
  const map = new Map<string, { correctAnswer: string; phaseLabel: string }>();
  for (const row of SCHEMA_ROWS) {
    row.slots.forEach((keyword, idx) => {
      const slotId = `${row.id}-slot-${idx}`;
      map.set(slotId, { correctAnswer: keyword, phaseLabel: row.phaseLabel });
    });
  }
  return map;
}, []);

// Raggruppare per fase (in ordine SCHEMA_ROWS)
const answersByPhase = useMemo(() => {
  if (!studentAnswers?.length) return [];
  const groups = new Map<string, any[]>();
  for (const ans of studentAnswers) {
    const detail = slotDetails.get(ans.slotId);
    const phase = detail?.phaseLabel || 'ALTRO';
    if (!groups.has(phase)) groups.set(phase, []);
    groups.get(phase)!.push({
      ...ans, correctAnswer: detail?.correctAnswer || '—', phaseLabel: phase
    });
  }
  const order = SCHEMA_ROWS.map(r => r.phaseLabel);
  return Array.from(groups.entries())
    .sort(([a], [b]) => order.indexOf(a) - order.indexOf(b));
}, [studentAnswers, slotDetails]);
```

**Attenzione al nome del campo:** le risposte in `getClassStats()` hanno `selectedKeyword` (dal DB), NON `selectedAnswer`. Usare sempre un fallback:
```tsx
const word = answer.selectedKeyword || answer.selectedAnswer || '—';
```

### REGOLA 17: Nomi studenti in MAIUSCOLO + badge "IN ATTESA DI INVIO"

**Nomi studenti:** Usare CSS `uppercase` sulla classe del `<p>` contenente il nome (NON `.toUpperCase()`):

```tsx
<p className="font-medium text-sm text-foreground truncate text-center uppercase">{student.name}</p>
```

**Badge per studente senza risposte:** Quando `studentAnswers.length === 0`, mostrare `IN ATTESA DI INVIO` in colore ambra invece di `—`:

```tsx
<div className={`text-sm font-bold ${
  studentAnswers.length === 0
    ? 'text-amber-600'
    : correctAnswers > 0
      ? scoreColor(correctAnswers)
      : 'text-muted-foreground'
}`}>
  {studentAnswers.length > 0
    ? correctAnswers + '/' + (totalSlots || '12')
    : <span className="text-[10px] uppercase tracking-wider font-semibold">IN ATTESA DI INVIO</span>
  }
</div>
```

**Hotspot:** Il pallino a sinistra del nome è SEMPRE grigio, uguale all'hotspot della classe:
```tsx
<div className="size-2 rounded-full shrink-0 bg-gray-300" />
```

**Nessun colore o icona:** NON usare `bg-green-500`, `bg-amber-400`, `bg-red-400`, `Check`, `Clock`, o qualsiasi altra icona. Solo un cerchio grigio.

**Indicatori di fase (5 cerchi colorati):** Per ogni studente, mostrare 5 cerchi che indicano lo stato di completamento per ogni fase dello schema. I cerchi sono pieni (colore fase) se lo studente ha risposto almeno a uno slot di quella fase, vuoti (solo bordo) altrimenti.

Il colore del cerchio e del bordo viene da `SCHEMA_ROWS[i].color`. La logica è:
```tsx
const answeredPhaseIds = new Set(
  studentAnswers.map((a: any) => a.slotId.split('-slot-')[0])
);
// ...
{SCHEMA_ROWS.map((phase: any) => {
  const hasAnswer = answeredPhaseIds.has(phase.id);
  return (
    <div
      className="size-3 rounded-full shrink-0"
      style={{
        backgroundColor: hasAnswer ? phase.color : 'transparent',
        border: `1.5px solid ${phase.color}`,
      }}
      title={phase.phaseLabel + (hasAnswer ? ' ✓' : '')}
    />
  );
})}
```

**Pulsante elimina × rosso:** Sostituire il `XCircle` icon con un piccolo cerchio rosso contenente `×`:
```tsx
<button
  onClick={(e) => { e.stopPropagation(); removeStudentMutation.mutate({ studentId: student.id }); }}
  className="size-5 rounded-full bg-red-100 text-red-500 hover:bg-red-200 flex items-center justify-center shrink-0"
  title="Rimuovi studente"
>
  <X className="size-3" />
</button>
```

**Freccia dropdown:** Mostrare `ChevronDown` / `ChevronUp` SOLO se lo studente ha risposte (`studentAnswers.length > 0`). Per studenti "IN ATTESA DI INVIO" nessuna freccia.

### REGOLA 18: Blocco re-answer (secondo accesso studente)
Quando uno studente rientra in una sessione che ha già completato:

1. Recuperare dal DB le risposte esistenti dello studente (tramite `studentId`)
2. **Disabilitare tutti i dropdown** con `disabled` prop
3. **Pre-caricare** le risposte già date (impostare i valori dei dropdown)
4. **Non permettere** modifiche o reinvii
5. Il punteggio deve rimanere visibile e invariato

Flusso in `getClassStats` (server/db.ts):
- Calcolare `completed: allAnswers.length > 0` per ogni studente (non usare `student.completed` dal DB, ma basarsi sulle risposte effettive)
- Inviare `answers` completa così che il client possa pre-caricare

In `StudentSchema.tsx`:
- All mount, chiamare `trpc.classes.getStudentAnswers.query(...)` con il `studentId`
- Se ci sono risposte preesistenti, impostare `existingAnswers` e bloccare tutto

### REGOLA 19: Testo no-class selezionato

Quando nessuna classe è selezionata nella dashboard, mostrare:
```tsx
<p className="text-sm text-muted-foreground max-w-sm">
  CREA UNA NUOVA CLASSE DALLA BARRA LATERALE OPPURE RIAPRINE UNA GIÀ ESISTENTE.
</p>
```

**Non usare** "SELEZIONANE UNA ESISTENTE PER GESTIRE LA SESSIONE" — il testo corretto è **"RIAPRINE UNA GIÀ ESISTENTE"**.

### REGOLA 20: MOSTRA RISPOSTA ESATTA — stile e font

Il pulsante "MOSTRA RISPOSTA ESATTA" / "NASCONDI RISPOSTA ESATTA" deve:
- Essere in **uppercase** nel JSX (già coperto da REGOLA 6)
- Usare `text-[10px]` (corrisponde a font pt 10) per la dimensione del testo:

```tsx
<Button
  onClick={() => showSolutionMutation.mutate({ id: activeClassId!, show: classDetail?.showSolution ? 0 : 1 })}
  className="h-8 px-3 text-[10px] font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-sm"
>
  <Eye className="size-3.5 mr-1" />
  {classDetail?.showSolution ? 'NASCONDI RISPOSTA ESATTA' : 'MOSTRA RISPOSTA ESATTA'}
</Button>
```

### REGOLA 21: SCHEMA COMPLETO PDF — pulsante e generazione

Nella dashboard docente è presente il pulsante **"SCHEMA COMPLETO"** che genera un PDF con tutte le risposte corrette già inserite al posto giusto. È simile al PDF BIANCO ma con tutti gli slot precompilati.

**Dove aggiungerlo:** Insieme agli altri bottoni PDF nella card info classe (accanto a REPORT PDF e PDF BIANCO):

```tsx
<Button onClick={handleDownloadCompletedSchema} variant="outline"
  className="border-blue-400 text-blue-700 hover:bg-blue-50 hover:border-blue-500 rounded-xl h-9 px-3 text-xs sm:text-sm">
  <FileText className="size-4" /> SCHEMA COMPLETO
</Button>
```

**Handler in TeacherPage.tsx:**
```tsx
const handleDownloadCompletedSchema = useCallback(() => {
  if (!activeClassInfo) return;
  generateCompletedSchemaPdf({
    className: activeClassInfo.name,
    classDate: activeClassInfo.date,
    classCode: activeClassInfo.code || (classDetail as any)?.code || "",
  });
}, [activeClassInfo, classDetail]);
```

**Import da aggiungere:**
```tsx
import { generateReportPdf, generateBlankQuestionsPdf, generateCompletedSchemaPdf } from "@/lib/reportPdf";
```

**Implementazione in `client/src/lib/reportPdf.ts`:**

```tsx
export function generateCompletedSchemaPdf(data: {
  className: string;
  classDate?: string;
  classCode: string;
}) {
  const doc = new jsPDF("portrait", "mm", "a4");
  const PW = 210, PH = 297, M = 20, TOP = 25, CW = PW - 2 * M;
  let y = TOP;

  // Header: title + subtitle
  doc.setFontSize(16); setBold(doc); doc.setTextColor(0);
  doc.text("SCHEMA INTERATTIVO — RIMA XXI (BÉCQUER)", PW / 2, y + 6, { align: "center" });
  doc.setFontSize(10); setNormal(doc); doc.setTextColor(100, 30, 40);
  doc.text("Metodo di Fernando Lázaro Carreter", PW / 2, y + 11, { align: "center" });
  y += 20;

  // Class info
  doc.setFontSize(11); setBold(doc); doc.setTextColor(0);
  doc.text(`Classe: ${data.className}`, M, y); y += 7;
  doc.setFontSize(9); setNormal(doc); doc.setTextColor(80);
  doc.text(`Codice: #${data.classCode}`, M, y); y += 5;
  // Date if available
  if (data.classDate) { ... }
  y += 3;

  // "SCHEMA COMPLETO" section title
  doc.setFontSize(13); setBold(doc); doc.setTextColor(0);
  doc.text("SCHEMA COMPLETO", PW / 2, y, { align: "center" });
  y += 10;

  // Keyword bank box (beige background, brown border)
  const allKeywords = ["Romanticismo", "Rimas", ...];
  const kwsText = allKeywords.join(" · ");
  doc.setFontSize(9); setBold(doc); doc.setTextColor(100, 30, 40);
  doc.text("PAROLE CHIAVE:", M, y); y += 4;
  doc.setFontSize(9); setNormal(doc); doc.setTextColor(60);
  const kwsLines = doc.splitTextToSize(kwsText, CW - 6);
  doc.setFillColor(245, 240, 235); doc.setDrawColor(180, 160, 140);
  doc.roundedRect(M, y, CW, boxH, 2, 2, "FD");
  doc.text(kwsLines, PW / 2, y + 6, { align: "center" });
  y += boxH + 6;

  // For each schema row (5 fasi):
  // - Phase header bar with row color + rounded corners
  // - Slot rows with:
  //   - Number (idx+1) in gray
  //   - Correct answer in GREEN italic
  //   - Checkmark ✓ in green
  for (const row of schemaRows) {
    // Phase header
    doc.setFillColor(r, g, b); doc.setTextColor(255);
    doc.roundedRect(M, y, CW, 7, 1.5, 1.5, "F");
    doc.setFontSize(9); setBold(doc);
    doc.text(row.phase, M + 3, y + 5);
    y += 7;

    // Slots with correct answers
    row.slots.forEach((keyword, idx) => {
      doc.setFontSize(9); setItalic(doc); doc.setTextColor(0, 128, 0);
      const kwText = keyword.charAt(0).toUpperCase() + keyword.slice(1);
      doc.text(kwText, M + 18, y + 5);
      doc.setFontSize(7); setNormal(doc); doc.setTextColor(0, 150, 0);
      doc.text("✓", CW + M - 8, y + 5);
      y += 7;
    });
    y += 3;
  }

  // Legend box: scoring info
  const legendaTesto = "PUNTEGGIO — FASE 5 = 0,25 pt ... Punteggio massimo = 10/10";
  // ...

  doc.save(`Schema_Completo_RIMA_XXI_${safe}.pdf`);
}
```

**Regole di stile per il PDF:**
- Stessi margini del report standard: Top = 20, M = 20 mm
- Stesso font "times" (jsPDF built-in)
- Risposte corrette in **VERDE corsivo** (`doc.setTextColor(0, 128, 0); setItalic(doc)`)
- Barre fase colorate coi colori originali dello schema
- `splitTextToSize()` usato per la keyword bank e testi lunghi
- Box PAROLE CHIAVE con sfondo beige e bordo marrone
- Legenda punteggio in box separato in fondo
- Nome file: `Schema_Completo_RIMA_XXI_{ClassName}.pdf`

### REGOLA 22: Footer STUDENTI ATTIVI — contatore "X attivi"

In fondo alla card STUDENTI ATTIVI NELLA SESSIONE (dopo la lista studenti) mostrare un footer con il numero totale di studenti attivi:

```tsx
{activeStudents.length > 0 && (
  <div className="flex items-center justify-center gap-2 pt-4 mt-4 border-t border-border/40">
    <Users className="size-4 text-plum" />
    <span className="text-sm font-medium text-foreground">{activeStudents.length} attivi</span>
  </div>
)}
```

**Posizione:** dentro `CardContent`, subito DOPO la chiusura del `div` con `space-y-2` (la lista studenti) e PRIMA della chiusura di `CardContent`.

### REGOLA 23: Griglia 5×4 — struttura dati (GRID_ROWS / GRID_SLOTS)

Il nuovo formato dello schema è una **griglia 5 righe × 4 colonne** (tipo tabella) invece del vecchio formato a slot singoli. I file interessati:

**`server/schema-data.ts`:**

```ts
interface GridRow {
  id: string;            // es. "fase1-2", "fase5"
  phaseLabel: string;    // es. "FASE 1/2" — colonna 1
  description: string;   // es. "LECTURA Y / LOCALIZACIÓN" — colonna 2 (usa " / " per a capo)
  col3Slots: GridSlotDef[];  // slot nella colonna 3
  col4Slots: GridSlotDef[];  // slot nella colonna 4
}
```

Gli slot ID seguono il formato: `{shortRowId}-c{col}` (es. `f1-c3`, `f5-c3-0`, `f5-c4-1`).
Le celle con 2 keyword (es. FASE 5) usano `-0`, `-1` come suffisso.

**Totali:** 12 slot in totale (`TOTAL_SLOTS = 12`).

### REGOLA 24: Drag-and-drop + FASE 5 a 4 drop zone nella pagina studente (StudentSchema.tsx)

La pagina studente ora usa **trascinamento (drag-and-drop)** delle parole chiave invece del dropdown:

- Griglia 5×4 con bordi blu (`#1B3A5C`)
- Colonna 1 (FASE): testo in ciano (`#0096C7`)
- Colonna 2 (DESCRIZIONE): testo nero (`#1A1A1A`)
- Colonna 3 (PAROLA CHIAVE): testo verde scuro (`#2D6A4F`) — zona di drop
- Colonna 4 (PAROLA CHIAVE): testo magenta (`#C2255C`) — zona di drop
- Banca parole chiave sotto la griglia, parole in chips cliccabili/trascinabili
- **Click:** seleziona parola → clicca cella per posizionarla
- **Drag (HTML5 DnD + Touch):** trascina parola nella cella
- **Rimozione:** clicca parola posizionata per rimuoverla (torna in banca)
- **FASE 5 (riga 4):** Mostra **4 drop zone individuali** (2 in colonna 3, 2 in colonna 4) — non 2 celle raggruppate
- Ogni slot usa il proprio `slotId` come `cellKey` (es. `f5-c3-0`, `f5-c3-1`, `f5-c4-0`, `f5-c4-1`)
- Il `cells` state mappa direttamente `slotId → keyword` (non più cellKey raggruppata)
- La `answers` computation è semplicemente `useMemo(() => cells, [cells])`

**DropZone component:** `border-2 border-dashed` per celle vuote, `bg-white shadow-sm` per celle piene.

### REGOLA 25: Legenda PAROLA CHIAVE (studente e PDF)

Sia nella legenda sotto la griglia studente che nei PDF (bianco e completo), le etichette colonna 3 e 4 mostrano entrambe **"PAROLA CHIAVE"** invece di "CONTENUTO" e "FORMA / ESEMPIO".

Nei PDF (reportPdf.ts):
- `generateBlankQuestionsPdf`: griglia 5×4 con celle vuote, intestazioni "PAROLA CHIAVE"
- `generateCompletedSchemaPdf`: griglia 5×4 con risposte corrette precompilate

### REGOLA 26: Tooltip hover sui card studenti (TeacherPage)

Nella lista "STUDENTI ATTIVI NELLA SESSIONE", ogni studente ha un tooltip hover che mostra il nome completo:

```tsx
<div className="flex-1 min-w-0 group relative">
  <p className="font-medium text-sm text-foreground truncate ...">{student.name}</p>
  {/* Tooltip hover */}
  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 rounded-lg bg-white border border-black/20 shadow-md text-xs whitespace-nowrap uppercase opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none z-50">
    {student.name}
    <div className="absolute top-full left-1/2 -translate-x-1/2 size-2 bg-white border-r border-b border-black/20 rotate-45 -mt-1" />
  </div>
</div>
```

Il tooltip si attiva al passaggio del mouse (`.group-hover:opacity-100`) e mostra il nome per esteso all'interno di un riquadro bianco con bordo nero sottile.

### REGOLA 27: Font e stili pagina studente

- La pagina studente usa il font **OpenDyslexic** (Cambria/Georgia solo come fallback) — es. `style={{ fontFamily: "OpenDyslexic, Cambria, Georgia, 'Times New Roman', serif" }}` su titoli, contenitori e Card della griglia (dettagli: REGOLA 7d)
- Il titolo principale è ridotto: `text-2xl md:text-3xl lg:text-4xl`
- Le intestazioni colonna 3 e 4 mostrano entrambe "PAROLA CHIAVE"
- `style={{ fontFamily: "OpenDyslexic, Cambria, Georgia, 'Times New Roman', serif" }}` sulla Card della griglia

### REGOLA 26: answeredPhaseIds con GRID_SLOTS (TeacherPage)

La logica per determinare quali fasi ha risposto uno studente usa `GRID_SLOTS` invece del vecchio `split('-slot-')`:

```tsx
const answeredPhaseIds = new Set(
  studentAnswers.map((a: any) => {
    const gs = GRID_SLOTS.find((s: any) => s.slotId === a.slotId);
    return gs?.rowId || '';
  }).filter(Boolean)
);
```

Il `slotDetails` map usa `GRID_SLOTS` con `rowId` per matchare slot ID → fase.

## Utilizzo Script e Template

### `scripts/adapt_questions.py`
Script Python per convertire un file JSON di domande in `server/schema-data.ts`.
Leggi `scripts/adapt_questions.py --help` per istruzioni.

### `templates/schema-data-template.json`
Template JSON che documenta la struttura dati attesa dallo script.

### REGOLA 22: Conteggio risposte — ordine libero per fase (computeCorrectSlotIds)

Le risposte dello studente **non** devono essere valutate slot-per-slot. Le parole chiave di una stessa fase valgono in **QUALSIASI ordine**: se lo studente scambia due parole all'interno della stessa fase (rowId), entrambe restano corrette.

**Helper condiviso in `server/schema-data.ts` (importabile sia dal server che dal client):**
```ts
export function computeCorrectSlotIds(
  studentAnswers: { slotId: string; selectedKeyword: string | null | undefined }[]
): Set<string> {
  const correctSlotIds = new Set<string>();
  if (!studentAnswers.length) return correctSlotIds;

  // Raggruppa le risposte per fase (rowId)
  const phaseAnswers = new Map<string, { slotId: string; selectedKeyword: string | null | undefined }[]>();
  for (const ans of studentAnswers) {
    const slot = GRID_SLOTS.find((s) => s.slotId === ans.slotId);
    if (!slot) continue;
    const list = phaseAnswers.get(slot.rowId) || [];
    list.push(ans);
    phaseAnswers.set(slot.rowId, list);
  }

  for (const [rowId, answers] of Array.from(phaseAnswers.entries())) {
    // Multiset delle risposte corrette della fase
    const remaining = new Map<string, number>();
    for (const slot of GRID_SLOTS) {
      if (slot.rowId !== rowId) continue;
      remaining.set(slot.correctAnswer, (remaining.get(slot.correctAnswer) || 0) + 1);
    }
    // Matching greedy: ogni risposta consuma un'occorrenza della parola corretta
    for (const ans of answers) {
      if (!ans.selectedKeyword) continue;
      const count = remaining.get(ans.selectedKeyword) || 0;
      if (count > 0) {
        correctSlotIds.add(ans.slotId);
        remaining.set(ans.selectedKeyword, count - 1);
      }
    }
  }
  return correctSlotIds;
}
```

**Dove applicarlo OVUNQUE (non solo al submit):**
1. `client/src/pages/StudentSchema.tsx`:
   - `correctCount` memo (punteggio live)
   - `weightedScore` memo
   - `handleSubmitAll` (calcolo `isCorrect` da salvare nel DB)
   - `getSlotStatus` (icone ✓/✗ dopo la consegna — altrimenti le risposte corrette scambiate mostrano ✗)
2. `server/db.ts`:
   - `getStudentsByClass` (weightedScore/weightedGrade)
   - `getClassStats` (media classe + **ricalcola isCorrect dei dati già salvati** nel DB)
   - `getReportData` (report PDF)

### REGOLA 23: Peso FASE 5 = 0.25 — prefisso slotId SEMPRE "f5" (MAI "fase5")

Gli slotId della FASE 5 sono `f5-c3-0`, `f5-c3-1`, `f5-c4-0`, `f5-c4-1` — il prefisso è **`f5`**, NON `fase5`.

**⚠️ BUG STORICO:** usare `slotId.startsWith("fase5")` non scatta MAI → la FASE 5 valeva 0,50 invece di 0,25 → peso max 6,0 → **voto poteva superare 10/10**.

**Calcolo corretto del voto (report):**
- 8 slot non-F5 × 0,50 = 4,0
- 4 slot F5 × 0,25 = 1,0
- **MAX_WEIGHT = 5,0** → `grade = (ws / 5.0) * 10` → **massimo 10/10**

**Verificare con grep** che non esista nessun `startsWith("fase5")`:
```bash
grep -rn 'startsWith("fase5")' server/ client/src/
```

### REGOLA 28: Click-to-place BIDIREZIONALE + drag & drop (StudentSchema.tsx)

Lo studente deve poter posizionare le parole chiave in **tre modi contemporaneamente**. Il drag & drop NON va mai rimosso: il click-to-place si aggiunge, non sostituisce.

| Modalità | Flusso |
|---|---|
| **Drag & drop** | Trascina la parola nella cella (comportamento originale, invariato) |
| **Parola → cella** | Click sulla parola (si evidenzia) → click sulla cella vuota |
| **Cella → parola** | Click sulla cella vuota (si evidenzia) → click sulla parola |
| **Rimozione** | Click su cella piena → la parola torna nella banca |

**State necessario (2 selezioni + 1 guard):**
```ts
const [selectedKeyword, setSelectedKeyword] = useState<string | null>(null);
const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
// Impedisce che l'onClick post-drop selezioni per errore la cella (critico su mobile/touch)
const dragJustEnded = useRef(false);
```

**Handler bidirezionali:**
```ts
const handleKeywordClick = useCallback((keyword: string) => {
  if (submitted) return;
  // Se una cella è già selezionata → piazza subito la parola lì
  if (selectedSlotId) {
    placeKeyword(selectedSlotId, keyword);
    setSelectedSlotId(null);
    touchStartKeyword.current = null;
    return;
  }
  setSelectedKeyword((prev) => (prev === keyword ? null : keyword));
}, [submitted, selectedSlotId, placeKeyword]);

const handleCellClick = useCallback((cellKey: string) => {
  if (submitted) return;
  // Salta il click che segue un drag-drop / touch placement
  if (dragJustEnded.current) { dragJustEnded.current = false; return; }
  // Se una parola è selezionata → piazzala qui
  if (selectedKeyword) {
    placeKeyword(cellKey, selectedKeyword);
    setSelectedKeyword(null);
    setSelectedSlotId(null);
    touchStartKeyword.current = null;
    return;
  }
  // Altrimenti seleziona la cella (toggle)
  setSelectedSlotId((prev) => (prev === cellKey ? null : cellKey));
  setSelectedKeyword(null);
}, [submitted, selectedKeyword, placeKeyword, dragJustEnded]);
```

**⚠️ Guard obbligatorio in `handleDrop` e `handleTouchEnd`** (senza questo, su touch il drop viene seguito da un click che riseleziona la cella):
```ts
dragJustEnded.current = true;
setTimeout(() => { dragJustEnded.current = false; }, 150);
```

**`placeKeyword` deve azzerare ENTRAMBE le selezioni:**
```ts
setSelectedKeyword(null);
setSelectedSlotId(null);
```

**UI — prop `selected` su DropZone + highlight cella:**
```tsx
<DropZone ... selected={selectedSlotId === slot.slotId} />

// dentro DropZone (l'ordine delle classi conta: selected PRIMA del default)
${!value && !dragOver && selected ? "border-plum ring-2 ring-plum/30 bg-plum/5" : ""}
${!value && !dragOver && !selected ? "border-[#1B3A5C]/30 bg-[#F8FAFF] hover:bg-[#F0F4FF]" : ""}
```

**Testi da aggiornare:**
- Label banca: `"Parole chiave — trascina o clicca per posizionare"`
- Hint dinamico (mostrarlo se `selectedKeyword || selectedSlotId`):
  - parola attiva → `Parola selezionata: <strong>{selectedKeyword}</strong> — clicca una cella vuota per posizionarla`
  - cella attiva → `Cella selezionata — clicca una parola per posizionarla`
- `title` DropZone vuota: `"Trascina qui una parola chiave oppure clicca per selezionare la cella"`

**Riferimento**: stesso pattern dell'app Mappa Interattiva sul Romanticismo (repo `andreakeating1982/romanticismo-mappainterattiva`).

**Checklist di test in preview (browser reale):**
1. Click parola → si evidenzia + hint corretto → click cella → parola piazzata, rimossa dalla banca, contatore +1
2. Click cella vuota → anello viola + hint "Cella selezionata" → click parola → piazzata, contatore +1
3. Click su cella piena → parola torna nella banca
4. Verifica che il drag sia ancora attivo:
   ```js
   [...document.querySelectorAll('button')].filter(b => b.draggable).length // deve essere = n. parole in banca
   ```

### REGOLA 29: Touch su MOBILE — i due bug che rompono drag e tap (StudentSchema.tsx)

⚠️ La REGOLA 28 (click-to-place) **non basta**: implementata in modo ingenuo funziona solo con il mouse. Su cellulare falliscono sia il trascinamento sia il tap sulla cella, per due motivi diversi. Verificare SEMPRE entrambi su touch reale.

#### BUG A — Il trascinamento non parte mai
❌ **Sbagliato**: `onTouchStart` sul chip + `onTouchEnd` sulla cella.
```tsx
<button onTouchStart={() => setKw(kw)}>        {/* chip */}
<div onTouchEnd={() => place(cellKey)}>        {/* cella: NON SCATTA MAI */}
```
I touch event restano **catturati dall'elemento del `touchstart`** per tutta la durata del gesto (a differenza del mouse). Il `touchend` viene consegnato al **chip**, mai alla cella.

✅ **Corretto**: gestire tutto il gesto SUL CHIP e trovare la cella con `elementFromPoint`.
```ts
const touchDrag = useRef<{ kw: string; startX: number; startY: number; dragging: boolean } | null>(null);

const cellKeyFromPoint = (x: number, y: number): string | null => {
  const el = document.elementFromPoint(x, y) as HTMLElement | null;
  const zone = el?.closest("[data-cell-key]") as HTMLElement | null;
  if (!zone) return null;
  if (zone.getAttribute("data-cell-filled") === "1") return null; // cella già piena
  return zone.getAttribute("data-cell-key");
};

const handleTouchStart = (keyword: string, e: React.TouchEvent) => {
  if (submitted) return;
  const t = e.touches[0];
  touchDrag.current = { kw: keyword, startX: t.clientX, startY: t.clientY, dragging: false };
};

const handleTouchMove = (e: React.TouchEvent) => {
  const st = touchDrag.current;
  if (!st) return;
  const t = e.touches[0];
  // soglia 8px: sotto è un tap, non un trascinamento
  if (!st.dragging && Math.hypot(t.clientX - st.startX, t.clientY - st.startY) < 8) return;
  st.dragging = true;
  setTouchGhost({ kw: st.kw, x: t.clientX, y: t.clientY });
  setTouchOverCell(cellKeyFromPoint(t.clientX, t.clientY));
};

const handleTouchEndKeyword = (keyword: string, e: React.TouchEvent) => {
  const wasDragging = !!touchDrag.current?.dragging;
  const touch = e.changedTouches[0];
  resetTouchDrag();
  if (submitted) return;
  e.preventDefault();                     // evita il "click fantasma" dopo il tap
  if (wasDragging) {
    const cell = touch ? cellKeyFromPoint(touch.clientX, touch.clientY) : null;
    if (cell) placeKeyword(cell, keyword);
    dragJustEnded.current = true;
    setTimeout(() => { dragJustEnded.current = false; }, 250);
    return;
  }
  handleKeywordClick(keyword);            // tap semplice → stessa logica del click
};
```

**Attributi obbligatori sulla DropZone** (senza questi `elementFromPoint` non trova nulla):
```tsx
<div data-cell-key={cellKey} data-cell-filled={value ? "1" : "0"} ... >
```

#### BUG B — "Cella → parola" non funziona su mobile
❌ **Sbagliato**: `onTouchEnd` con `preventDefault()` sulla cella.
```tsx
<div onClick={handleCellClick}
     onTouchEnd={(e) => { e.preventDefault(); ... }}>  {/* UCCIDE il click */}
```
Il `preventDefault()` sul `touchend` **sopprime il click sintetico** che il browser genera dopo un tap → `handleCellClick` non viene **mai** chiamato su mobile, quindi la cella non si seleziona mai.

✅ **Corretto**: la cella NON deve avere `onTouchEnd`. Solo `onClick` — su mobile il tap lo genera da solo.

#### CSS indispensabile
```tsx
<button style={{ touchAction: "none" }}>          {/* chip: senza questo lo scroll interrompe il drag */}
<div style={{ touchAction: "manipulation" }}>     {/* cella: elimina il ritardo di 300ms */}
```
React registra `touchstart`/`touchmove` come listener **passivi**: `e.preventDefault()` al loro interno NON funziona, lo scroll si blocca **solo** via CSS `touch-action`.

#### Feedback visivo (ghost chip che segue il dito)
```tsx
{touchGhost && (
  <div className="fixed z-50 pointer-events-none px-3 py-2 rounded-lg text-sm font-semibold
                  shadow-xl bg-plum text-white border border-plum
                  -translate-x-1/2 -translate-y-1/2 scale-110"
       style={{ left: touchGhost.x, top: touchGhost.y }}>
    {touchGhost.kw}
  </div>
)}
```
+ prop `touchOver` sulla DropZone → `const dragOver = nativeDragOver || !!touchOver;` così la cella sotto il dito si illumina come nel drag desktop
+ chip in trascinamento sbiadito: `${touchGhost?.kw === kw ? "opacity-40" : ""}`

#### Ergonomia touch
- Celle `min-h-[44px]` (minimo raccomandato per il tocco), chip `py-2 min-h-[40px]`
- Placeholder dinamico: `{selected ? "scegli parola" : "trascina o tocca"}` + `pointer-events-none`
- Testi con "tocca", non "clicca": *"Parole chiave — trascina oppure tocca per posizionare"*, *"tocca una cella vuota"*, *"tocca una parola"*

#### ⚠️ Come testare i touch con eventi sintetici (browser headless)
Due trappole che fanno sembrare rotto codice funzionante:
1. **I `TouchEvent` sintetici NON generano il `click`** che un tap reale produce → dopo `touchstart`+`touchend` su una cella aggiungere a mano `el.dispatchEvent(new MouseEvent('click', {bubbles:true}))`
2. **Servono `setTimeout` (~250ms) tra un evento e l'altro**, altrimenti React legge stato *stale* e il test fallisce pur essendo il codice corretto (vale anche per `dragstart`/`dragover`/`drop`)

```js
const mk = (type, x, y, target) => {
  const t = new Touch({ identifier: 1, target, clientX: x, clientY: y });
  return new TouchEvent(type, { bubbles: true, cancelable: true,
    touches: type === 'touchend' ? [] : [t], changedTouches: [t] });
};
// drag: touchstart sul chip → touchmove(>8px) → touchmove(sulla cella) → touchend(sulla cella)
```

**Checklist finale su touch** — tutti e 4 devono passare:
1. Trascinamento col dito → ghost visibile, cella evidenziata, parola piazzata
2. Tap parola → tap cella vuota
3. Tap cella vuota → tap parola (placeholder diventa "scegli parola")
4. Tap su cella piena → rimozione + drag desktop col mouse ancora funzionante

### REGOLA 30: Dashboard docente — 3 fix di layout (TeacherPage.tsx + index.css)

Riferimento di stile per questi fix: repo `Quiz-interattivo-sorgente` (TeacherPage del sorgente).

#### FIX 1 — Il codice classe in alto si sovrappone ai pulsanti su schermi stretti
La riga "codice + CHIUDI + ELIMINA CLASSE" era un `flex` senza wrap: su spazio stretto il badge del codice e i pulsanti si accavallavano. Soluzione: `flex-wrap` + `shrink-0`:
```tsx
<div className="flex flex-wrap items-center justify-center gap-2">
  <div className="flex items-center gap-1.5 rounded-lg bg-card border border-border/50 px-3 py-1.5 shrink-0">
    <Hash className="size-4 sm:size-5 text-primary shrink-0" />
    <span className="font-bold text-base sm:text-lg text-primary tracking-widest ...">{activeClassInfo.code}</span>
  </div>
  <Button ... CHIUDI />
  <Button ... ELIMINA CLASSE />
</div>
```
Con `flex-wrap` il badge resta intero e i pulsanti scendono su una seconda riga invece di sovrapporsi. `shrink-0` impedisce che badge/icone vengano compressi.

#### FIX 2 — Tooltip nero sul nome studente: hover PC + TAP mobile + anche "IN ATTESA DI INVIO"
❌ **Sbagliato (vecchio codice)**: tooltip CSS-only `opacity-0 group-hover:opacity-100` **dentro** il bottone riga:
- Su mobile non esiste hover → il tooltip non appariva mai
- Il `<button>` del tooltip ("RIMUOVI STUDENTE") era annidato dentro il `<button>` riga → **HTML invalido, hydration error in console**
- Il tooltip era agganciato al bottone intero, non al nome

✅ **Corretto**:
1. **Stato React** + listener di chiusura (stesso pattern della repo sorgente):
```tsx
const [tooltipStudent, setTooltipStudent] = useState<string | null>(null);
const tooltipRef = useRef<HTMLDivElement | null>(null);

useEffect(() => {
  if (!tooltipStudent) return;
  const close = (e: MouseEvent | TouchEvent) => {
    if (tooltipRef.current && tooltipRef.current.contains(e.target as Node)) return;
    setTooltipStudent(null);
  };
  document.addEventListener("click", close);
  document.addEventListener("touchstart", close);
  return () => {
    document.removeEventListener("click", close);
    document.removeEventListener("touchstart", close);
  };
}, [tooltipStudent]);
```
2. **Il tooltip è FRATELLO del bottone riga** (mai dentro un `<button>`), dentro un wrapper `relative group/name`:
```tsx
<div className="relative group/name">
  <button onClick={() => setExpandedStudent(...)} className="w-full flex flex-wrap items-center gap-2.5 px-4 py-2.5 ...">
    <div className="size-2 rounded-full shrink-0 bg-gray-300" />
    <div className="flex-1 min-w-0">
      <span className="relative inline-block min-w-0 max-w-full cursor-pointer" title={student.name}
            onClick={(e) => { if (window.matchMedia('(hover: none)').matches) { e.stopPropagation(); setTooltipStudent(tooltipStudent === student.id ? null : student.id); } }}>
        <span className="block font-bold text-sm text-foreground truncate text-center uppercase">{student.name}</span>
      </span>
    </div>
    {/* stato + pallini fase + rimozione + chevron ... */}
  </button>
  {/* Tooltip FUORI dal bottone: hover PC (group-hover/name) + tap mobile (stato) */}
  <div ref={tooltipRef}
       className={`pointer-events-none absolute left-1/2 top-full z-[100] mt-2 -translate-x-1/2 max-w-[85vw] rounded-lg bg-[#2C221E] px-3 py-2 text-white shadow-2xl transition-opacity duration-150 ${tooltipStudent === student.id ? "opacity-100" : "opacity-0 group-hover/name:opacity-100"}`}>
    <div className="flex items-center gap-2 whitespace-nowrap uppercase font-bold text-xs">
      <span className="block truncate">{student.name}</span>
      <button onClick={(e) => { e.stopPropagation(); setTooltipStudent(null); removeStudentMutation.mutate({ studentId: student.id }); }}
              disabled={removeStudentMutation.isPending}
              className="inline-flex items-center gap-1 rounded-md border border-red-400/70 px-2 py-0.5 text-[9px] font-bold text-red-300 hover:bg-red-500/20 hover:border-red-300 shrink-0">
        <X className="size-2.5" strokeWidth={3} /> RIMUOVI STUDENTE
      </button>
    </div>
    <div className="absolute top-full left-1/2 -translate-x-1/2 size-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-[#2C221E]" />
  </div>
</div>
```
- **PC**: `group-hover/name:opacity-100` (hover col mouse su tutta la riga)
- **Mobile**: tap sul nome → `tooltipStudent` (matchMedia `(hover: none)`) → `opacity-100`; click/touch fuori chiude
- **"IN ATTESA DI INVIO"**: il tooltip è sul nome → funziona ANCHE per studenti senza risposte (prima sembrava rotto perché l'utente passava il mouse sul nome troncato e il tooltip era legato al bottone; con il nuovo pattern è sempre sul nome)
3. **MAI `<button>` dentro `<button>`**: il piccolo cerchio rosso "Rimuovi studente" nella riga va reso `<span role="button" tabIndex={-1}>` (stesso onClick con `e.stopPropagation()`), altrimenti hydration error.
4. **Overflow orizzontale della riga "IN ATTESA DI INVIO"**: il bottone riga deve avere `flex flex-wrap` e lo stato `whitespace-nowrap`; il nome `flex-1 min-w-0 truncate`; i pallini fase `shrink-0`. Così su schermi stretti lo stato va a capo invece di uscire dai bordi.

#### FIX 3 — Data di default centrata nel campo date (APRI UNA NUOVA CLASSE)
`text-align: center` sull'input NON basta: il valore nativo della data vive nei pseudo-elementi shadow DOM `::-webkit-date-and-time-value → ::-webkit-datetime-edit → fields-wrapper` (e l'icona calendario ruba spazio a destra). Serve forzare **ogni livello** della catena + icona in absolute:
```css
input[type="date"] {
  text-align: center !important;
  position: relative !important;
}
input[type="date"]::-webkit-date-and-time-value,
input[type="date"]::-webkit-datetime-edit {
  display: block !important;
  width: 100% !important;
  margin: 0 !important;
  padding: 0 !important;
  text-align: center !important;
}
input[type="date"]::-webkit-datetime-edit-fields-wrapper {
  display: inline-block !important;
  margin: 0 !important;
  padding: 0 !important;
  text-align: center !important;
}
input[type="date"]::-webkit-calendar-picker-indicator {
  position: absolute !important;
  right: 8px !important;
  top: 50% !important;
  transform: translateY(-50%) !important;
  z-index: 5;
}
```
**⚠️ Testare con un HARD REFRESH**: Vite/il browser possono servire CSS in cache — se dopo un edit "non funziona", ricaricare con `?fresh=1` o hard refresh e verificare con screenshot. Le regole dentro `@layer base` vengono compilate da Tailwind v4: per ispezionarle dal console JS bisogna scendere dentro i `CSSLayerBlockRule` (i `cssRules` annidati), altrimenti `sheet.cssRules` non le mostra.

#### Checklist verifica (tutti e 3)
1. Riga codice classe: a larghezza ridotta il badge non si sovrappone a CHIUDI/ELIMINA (misurare `getBoundingClientRect`, `overlap = badge.right > chiudi.left`)
2. Tooltip: hover desktop (mouse REALE, non eventi sintetici — gli eventi sintetici non attivano `:hover`) → `opacity=1`; tap mobile simulato (matchMedia override) → `opacity=1` e click fuori → `opacity=0`; verifica anche per studente "IN ATTESA DI INVIO"
3. Data: screenshot → "23/08/2026" centrata nel campo, icona calendario a destra

### REGOLA 31: CLONARE l'app — nuova app IDENTICA con un set di domande diverso

L'utente chiede "una app simile/uguale a questa cambiando solo le domande" → **NON** adattare l'app esistente: creare una NUOVA app clonata. Usare la skill dedicata **`schema-interattivo-sorgente`** (leggerla PRIMA di agire) che contiene la procedura completa, lo script rigeneratore e le trappole.

Sintesi operativa:
1. Copiare il progetto sorgente in una nuova cartella — Fonte A: copia locale `/home/user/becquer-schema-full-app` (escludendo node_modules/dist/.git, symlink di node_modules per il test); Fonte B: repository GitHub indicata dall'utente (`git clone <URL> /home/user/NUOVO-APP && pnpm install`). Se arriva da GitHub, verificare che contenga `GRID_ROWS`/`GRID_SLOTS` in `server/schema-data.ts` e i file `StudentSchema.tsx`/`TeacherPage.tsx`/`Home.tsx` (formato 5×4 attuale)
2. Scrivere il JSON delle domande (template: `templates/schema-questions-template.json` della skill sorgente) con la griglia 5×4: rows[{id, phaseLabel, description, col3[], col4[]}] + appName/methodName/pdfFileBase
3. Rigenerare `server/schema-data.ts` con `scripts/rebuild_schema_data.py` della skill sorgente (genera anche gli snippet PDF)
4. Incollare gli snippet in `client/src/lib/reportPdf.ts`: titolo (2×), sottotitolo (2×), 3 nomi file PDF, **2 tabelle gridData hardcoded** (bianca ~riga 292, soluzione ~riga 479) — senza questo il PDF resta col vecchio contenuto
5. Aggiornare i testi contenuto in `StudentSchema.tsx` (badge metodo ~528, messaggio successo ~738, footer ~763) se cambia metodo/opera
6. `pnpm check` + `pnpm build` → deploy preview → test flusso completo → checkpoint + production (solo dopo conferma utente) → pulizia classi di test → ZIP

⚠️ **TRAPPOLA**: `scripts/adapt_questions.py` di questa skill genera il FORMATO VECCHIO (piatto `SCHEMA_ROWS` con `slots: string[]`, senza `GRID_ROWS`/`GRID_SLOTS`/`computeCorrectSlotIds`/`getCorrectAnswer`) → NON usarlo per clonare questa app: produrrebbe un `schema-data.ts` incompatibile. Per il clone usare SEMPRE `rebuild_schema_data.py` della skill `schema-interattivo-sorgente`. Il template `schema-data-template.json` (formato piatto) vale solo come documentazione del vecchio formato.

Il set di domande della sorgente è `server/schema-data.ts` (griglia 5×4): `GRID_ROWS` (5 righe: FASE 1/2, 3, 4, 5, 6/7 con col3/col4 slots), `ALL_KEYWORDS` (12 parole uniche), `TOTAL_SLOTS=12`, colori `COL*_COLOR`/`PHASE_COLORS`. Convenzioni: slotId `f{primo numero riga}-c3/c4[-0/-1]`, ordine libero entro fase (multiset), max 2 risposte per colonna, `description` con `" / "` per l'a capo.

### REGOLA 32: Tooltip docente — tooltip nero sul NOME con freccia verso l'alto + "Rimuovi lo studente" come tooltip NATIVO sulla X (TeacherPage.tsx)

Richiesta utente tipica: *"la freccia del tooltip deve posizionarsi esattamente sopra il nome; il tooltip del Rimuovi studenti non deve essere nero ma come nella repo Parole-chiave-interattive-sorgente"*.

**Comportamento attuale (da mantenere):**
- Il **tooltip nero** (bg `#2C221E`) appare SOLO passando col mouse sul **NOME** dello studente (gruppo hover
  sullo span del nome, NON sulla riga) e mostra SOLO il nome (`{student.name}`).
- La **freccia** del tooltip è in **ALTO** (rivolta verso il nome): `absolute bottom-full` + triangolo
  `border-b-[#2C221E]` (punta in su). Il tooltip è SOTTO il nome (`top-full mt-2`) e la punta cade ESATTAMENTE
  sotto il centro del nome (il nome è `text-center` nel contenitore → freccia e nome condividono lo stesso
  centro; verificato con `getBoundingClientRect`: stessi `cx`, `TRUNC=false` quando il nome entra).
- **"Rimuovi lo studente"** sulla X è il **tooltip NATIVO del browser** (`title="Rimuovi lo studente"`), come
  nella repo `Parole-chiave-interattive-sorgente`: NIENTE tooltip nero custom.

**Implementazione (in `TeacherPage.tsx`, dentro `activeStudents.map`):**
1. **X**: `<span role="button" tabIndex={-1} aria-label="Rimuovi lo studente" title="Rimuovi lo studente"
   onClick={...removeStudentMutation...}>` — MAI `<button>` dentro `<button>` (HTML invalido → hydration
   error). Il `title` genera il tooltip nativo chiaro del browser. NIENTE wrapper `group/remove`, NIENTE span
   tooltip nero.
2. **Tooltip nero sul NOME**: `<span className="group relative block w-full cursor-pointer">` (gruppo hover
   sul nome, come `Quiz-interattivo-con-audio-sorgente`); tooltip FIGLIO dello span nome:
   `pointer-events-none absolute left-1/2 top-full z-[100] mt-2 -translate-x-1/2 max-w-[85vw] rounded-lg
   bg-[#2C221E] px-3 py-2 text-white shadow-2xl opacity-0 group-hover:opacity-100` (o `opacity-100` se
   `tooltipStudent === student.id` per il tap mobile).
3. **Freccia**: `<span className="absolute bottom-full left-1/2 -translate-x-1/2 size-0 border-l-[6px]
   border-r-[6px] border-b-[6px] border-l-transparent border-r-transparent border-b-[#2C221E]" />` → punta in
   ALTO, al bordo superiore del tooltip, centrata col nome.
4. **Niente `title` nativo** sul nome (evita il doppio tooltip nativo del browser accanto a quello custom).
5. Tap mobile invariato: `tooltipStudent` + `matchMedia('(hover: none)')`, ref `tooltipRef` di tipo `HTMLElement`.

**Riferimento repo**:
- `Parole-chiave-interattive-sorgente` (TeacherPage): X = `<Button variant="ghost" ... title="Rimuovi lo
  studente">` → tooltip NATIVO; tooltip nome `bg-black` senza freccia.
- `Quiz-interattivo-con-audio-sorgente`: gruppo hover sul nome (`group relative block w-full`), tooltip sopra il nome.
- Nella nostra app il tooltip resta SOTTO il nome (`top-full`) con la freccia in alto che punta al nome (stile già approvato).

**Note:**
- Hover sul NOME → tooltip nero con SOLO il nome e freccia che punta al nome; hover sulla X → tooltip nativo
  chiaro "Rimuovi lo studente"; hover sulla riga (badge/pallini) → NESSUN tooltip.
- Il click sulla X rimuove subito lo studente (toast "Studente rimosso") — su touch il tooltip hover non serve perché l'azione è diretta.
- **Verifica**: (a) hover sul nome → tooltip nero, freccia IN ALTO centrata sotto il nome (confrontare
  `getBoundingClientRect` di freccia e span nome: stessi `cx`); (b) hover su badge/pallini → nessun tooltip;
  (c) hover sulla X → nel DOM `title="Rimuovi lo studente"` e assenza di span tooltip nero (il tooltip nativo
  si vede nel browser reale); (d) click X → studente rimosso; (e) `pnpm check` pulito.


### REGOLA 33: Riga studente CENTRATA quando c'è il badge "IN ATTESA DI INVIO" (TeacherPage.tsx)

Richiesta utente tipica: *"quando compare la scritta IN ATTESA DI INVIO gli elementi si vedono bene ma dovrebbero essere centrati meglio"*.

**Problema**: la riga studente era un flex con il contenitore del nome a `flex-1`: il nome si espandeva spingendo badge/pallini/X ai bordi (nome a sinistra, badge a destra, grande vuoto al centro).

**Fix (3 pezzi in `TeacherPage.tsx`, dentro `activeStudents.map`)**:
1. Nuova variabile: `const isPendingInvio = studentAnswers.length < TOTAL_SLOTS;` (true = badge IN ATTESA DI INVIO visibile)
2. Bottone riga: `className={... + (isPendingInvio ? 'justify-center' : '')}` → il gruppo di elementi si centra
3. Contenitore nome: `className={min-w-0 + (isPendingInvio ? 'flex-none' : 'flex-1')}` → il nome NON si espande più in modalità badge (con `flex-1` spingeva il badge a destra)

**Risultato**: con il badge → gruppo [pallino, nome, badge, pallini fase, X] compatto e centrato (misura: offset gruppo vs centro riga = 0). Con 12 risposte (punteggio) → layout originale conservato (nome `flex-1`, punteggio a destra).

**Note**: su schermi stretti `flex-wrap` + `justify-center` centrano anche le righe andate a capo. Verifica: `pnpm check` pulito; offset = 0 per le righe badge; layout invariato per le righe con punteggio (misurare con `getBoundingClientRect`).

### REGOLA 34: Overflow mobile — parole fuori dai bordi (dettaglio a tendina docente e celle studente)

Richiesta utente tipica: *"nel menu a tendina dello studente delle parole si vedono che sono fuori i bordi (sul mio cellulare)"* — nella foto: nel pannello che il docente apre **a tendina** toccando uno studente (dettaglio risposte, REGOLA 16) le parole lunghe in maiuscolo OpenDyslexic (es. `ROMANTICISMOS → IDENTIFICACIÓN`) uscivano a destra dal box bianco.

**Causa**: i box riga erano `flex items-center` SENZA wrap; un flex item per default ha `min-width: auto` e una parola lunga non spezzabile non può andare a capo → il testo sfora il bordo del box su schermi stretti.

**Fix in `TeacherPage.tsx` (`AnswerDetails`, riga di ogni risposta):**
```tsx
<div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 px-2 py-1.5 rounded-md bg-white border border-gray-200/80 min-w-0">
  <span className="text-muted-foreground font-mono text-[9px] w-3 shrink-0">#</span>
  {/* cerchio ✔/✘: size-3.5 ... shrink-0 */}
  <span className={`text-xs uppercase leading-snug min-w-0 [overflow-wrap:anywhere] ${answer.isCorrect ? 'text-green-700' : 'text-red-700'}`}>{word}</span>
  {!answer.isCorrect && (<>
    <span className="text-[10px] text-gray-400 shrink-0">→</span>
    <span className="text-xs uppercase leading-snug min-w-0 [overflow-wrap:anywhere] text-green-600">{answer.correctAnswer}</span>
  </>)}
</div>
```
- `flex-wrap` fa scendere su righe successive gli elementi che non entrano nel box.
- `min-w-0` + `[overflow-wrap:anywhere]` su ogni parola permettono la spezzatura SOLO quando serve (parola più larga del box) senza mai uscire dai bordi; `leading-snug` tiene compatte le righe multiple.
- `#`, cerchi e freccia `→` → `shrink-0` (non si comprimono mai).
- NIENTE `overflow-hidden`/`truncate` sulla riga (clipperebbe il testo).

**Stesso fix in `StudentSchema.tsx` (cella `DropZone` piena, parola posizionata):**
```tsx
<div className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-0.5 px-2 py-1 min-w-0 w-full">
  <span className="text-xs sm:text-sm font-bold uppercase tracking-wide leading-snug text-center min-w-0 [overflow-wrap:anywhere]" style={{ color: placedColor }}>{value}</span>
  {/* X rimozione + icone ✔/✗: shrink-0 */}
</div>
```

**Verifica**: `pnpm check` + `pnpm build`; in preview aprire il dettaglio a tendina di uno studente a larghezza mobile (360–400 px) e controllare che le parole stiano dentro i box (vanno a capo, mai troncate). Utile anche il confronto statico PRIMA/DOPO su contenitore ~270 px.

### REGOLA 35: PDF accessibili — OpenDyslexic embedded (reportPdf.ts)

Il PDF (report, bianco e schema completo) usa **OpenDyslexic** embeddato (accessibilità DSA/BES/ipovisione, come la repo PAROLE-CHIAVE-INTERATTIVE). In cima a `reportPdf.ts` (NON rimuovere, NON spostare):
- `loadFontBase64("OpenDyslexic-Regular.ttf")` e `loadFontBase64("OpenDyslexic-Bold.ttf")` caricano i file da `/fonts` (client/public/fonts) e li convertono in base64; `doc.addFileToVFS` + `doc.addFont("OpenDyslexic", "normal"/"bold")` li registrano in jsPDF.
- `fontState` globale con fallback automatico su "times" se il fetch fallisce; helper `setFontNormal()`/`setFontBold()` usano `fontState.name`.
- Simboli ✔ / ✘: OpenDyslexic NON ha i glifi U+2714/U+2718 → sono DISEGNATI come vettori (mai come testo).
- Griglie compatte del PDF: font OpenDyslexic con dimensioni ≥ 9.5 pt (mai più piccole).
- **Quando rigeneri i contenuti del PDF (titoli/sottotitoli/gridData da `rebuild_schema_data.py`): incolla SOLO gli snippet dentro le funzioni esistenti, NON sovrascrivere l'intero file** — l'embed del font e i helper stanno in cima al file e devono restare intatti.

### REGOLA 36: Deploy produzione — URL e flusso
- URL di produzione dell'app SCHEMA INTERATTIVO: `https://becquer-schema-interattivo.easy-peasy.site` (Cloud Run, deploy `deploy-2a7acf3f-...`).
- Ultimi deploy (sett 2026): **#6695** — report PDF senza scritte CORRETTA/INCORRETTA e senza riga RIEPILOGO (REGOLA 37); **#6696** — fix overflow mobile parole nel dettaglio a tendina docente e nelle celle studente (REGOLA 34).
- Flusso: preview → test completo (docente/studente/report/embed cornice) → `webdev_save_checkpoint` → conferma esplicita dell'utente → `webdev_deploy mode="production"`. MAI production nella stessa risposta in cui si scrive codice o si crea la preview.
- Dopo il deploy produzione verificare su `https://becquer-schema-interattivo.easy-peasy.site`: (a) Home compatta senza footer crediti, (b) margini prima pagina 24px simmetrici dentro la cornice, (c) barra accessibilità 5 moduli su tutte le pagine, (d) `/docente` senza footer crediti, (e) `cornice-dinamica/` con URL di produzione aggiornato.

### REGOLA 37: Report PDF — scritte CORRETTA/INCORRETTA e riga RIEPILOGO rimosse (sett 2026)

Richiesta utente: *"togli dal report pdf tutte le scritte CORRETTA/INCORRETTA perché bastano i segni rossi e verdi"* + *"togli anche la riga RIEPILOGO"*.

**Stato attuale del report studente (`client/src/lib/reportPdf.ts`, `drawReportPage`):**
- In ogni riga di risposta il testo a destra è SOLO `peso 0,25|0,50` (risposte compilate) oppure `NON DATA · peso 0,50` (slot vuoti). Le parole CORRETTA / INCORRETTA NON esistono più come testo nel PDF.
- Lo stato è affidato ai soli segni vettoriali accanto alla parola data: ✔ (verde scuro) se esatta, ✘ (rossa) se sbagliata, — (grigia) + scritta NON DATA se lo slot non è stato compilato.
- La parola data dallo studente è stampata in verde se esatta e in ROSSO se sbagliata; quando è sbagliata sotto compare "Risposta esatta:" con la parola corretta in verde.
- Il `peso` a destra si disegna in colore neutro (inchiostro/INK) sulle righe compilate e in grigio sulle NON DATA: non è uno stato, non colorarlo di verde/rosso.
- La riga finale `RIEPILOGO — CORRETTE: n · INCORRETTE: n · NON DATE: n` e i relativi calcoli (`total`, `totalSlots`, `answeredN`, `notGiven`, `correctN`, `incorrectN`) sono stati RIMOSSI.
- La legenda dei simboli in fondo al PDF resta (✔ risposta corretta · ✘ risposta errata · — risposta non data): il significato non deve dipendere dal solo colore.
- QA: `server/reportPdf.qa.test.ts` (vitest) rigenera `/tmp/qa/report-qa.pdf` con i 3 stati (esatta / sbagliata con parola sbagliata / non data). Verifica visiva obbligatoria: NESSUNA occorrenza di "CORRETTA"/"INCORRETTA"/"RIEPILOGO" nel PDF, presenza di "NON DATA", dei pesi e della legenda. Comandi: `pnpm check` + `npx vitest run server/reportPdf.qa.test.ts`.

**Non reintrodurre** le scritte quando rigeneri il contenuto PDF con gli snippet di `rebuild_schema_data.py`: gli snippet toccano solo titolo/sottotitolo/nomi file/gridData, non le etichette di stato.

