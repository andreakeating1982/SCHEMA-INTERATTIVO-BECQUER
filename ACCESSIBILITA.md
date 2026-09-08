# ♿ ACCESSIBILITÀ — SCHEMA INTERATTIVO

> **Questa sezione è dedicata all'accessibilità dell'app** (DSA/BES, ipovisione,
> screen reader, uso da mobile) e — soprattutto — alle **misure riusabili**:
> ognuna è descritta con il *dove vive nel codice* e il *come portarla su altre
> app simili* (es. altre app didattiche generate con Easy-Peasy.AI e messe su
> GitHub). L'accessibilità qui è un **requisito strutturale**: le misure sono
> già attive nell'app e vanno **preservate** in ogni variante o clonazione.

---

## 0. Riepilogo delle misure (indice)

| # | Misura | Dove vive | Portabile? |
|---|---|---|---|
| 1 | Font ad alta leggibilità **OpenDyslexic** (UI + PDF + embed) | `client/public/fonts`, `index.css`, `reportPdf.ts`, `server/_core/index.ts`, `cornice-dinamica/` | ✅ sì |
| 2 | **Barra accessibilità** 5 moduli (Font, Interlinea, Righello, Modalità, Ascolto) | `AccessibilityToolbar.tsx`, `AccessibilityContext.tsx`, `App.tsx` | ✅ sì |
| 3 | **Lettura ad alta voce (TTS)** di tutta la pagina | `hooks/useReadAloud.ts` | ✅ sì |
| 4 | **Righello di lettura** + **interlinea** variabile + **scala font** | `AccessibilityContext.tsx` (classi `lf-ruler`, `lf-hc`, variabili `--lf-scale`, `--lf-lh`) | ✅ sì |
| 5 | **Alto contrasto** (`lf-hc`) | `index.css`, `AccessibilityContext.tsx` | ✅ sì |
| 6 | **Altezza dinamica in iframe** (embed accessibile, niente scroll interni) | `lib/heightSync.ts`, `main.tsx`, `index.css` (`.lf-*`), `cornice-dinamica/` | ✅ sì |
| 7 | **Screen reader / ARIA** (ruoli, etichette, live region, `sr-only`) | `AccessibilityToolbar.tsx`, pagine | ✅ sì |
| 8 | **Mai colore da solo** (simboli + testo; PDF con legenda) | `TeacherPage.tsx`, `reportPdf.ts` | ✅ sì |
| 9 | **Niente overflow su mobile**: parole lunghe vanno a capo nei box | `TeacherPage.tsx` (`AnswerDetails`), `StudentSchema.tsx` (`DropZone`) | ✅ sì |
| 10 | **Interazione accessibile** (touch + mouse, no button-in-button, tooltip nativi, focus visibile) | `StudentSchema.tsx`, pagine, CSS `focus-visible` | ✅ sì |
| 11 | **PDF accessibili** (OpenDyslexic, testo mai troncato, simboli+testo, niente etichette colorate sole) | `reportPdf.ts`, `server/reportPdf.qa.test.ts` | ✅ sì |

---

## 1. Font OpenDyslexic (misura portabile nº 1)

**Cosa fa**: sostituisce il font di sistema con OpenDyslexic, progettato per i
lettori dislessici (pesi differenziati, spaziature ampie). Usato in **tutta la
UI**, nei **PDF** e nella **cornice dinamica**.

**Dove vive**:
- Font auto-ospitati: `client/public/fonts/OpenDyslexic-{Regular,Bold}.{woff2,ttf,otf}`.
- Dichiarazione: `@font-face` in `client/src/index.css` (`font-family: "OpenDyslexic"`).
- Applicazione: `body { font-family: "OpenDyslexic", Georgia, serif; }`.
- PDF: in `client/src/lib/reportPdf.ts` il font è incorporato in jsPDF
  (`doc.addFileToVFS`/`addFont`) e usato per tutti i testi.
- CORS cross-origin: `server/_core/index.ts` serve `/fonts/*` con
  `Access-Control-Allow-Origin: *` (necessario quando l'app gira dentro un
  iframe di un blog: altrimenti il browser blocca il font).
- Embed: `cornice-dinamica/` carica i font da `APP_URL/fonts/*` (le versioni
  autosufficienti li incorporano in base64).

**Come portarlo su un'altra app**:
1. Copia la cartella `client/public/fonts/` nella nuova app.
2. Copia i blocchi `@font-face` in cima al CSS globale.
3. Imposta `font-family` sul `body` (con fallback serif).
4. Se l'app ha PDF: ripeti l'incorporamento in jsPDF (stesso pattern di
   `reportPdf.ts`).
5. Se l'app gira in iframe: aggiungi il middleware CORS su `/fonts`.
6. Per i blog: usa una cornice (`cornice-dinamica/`) che carichi i font via
   `APP_URL/fonts/*`.

---

## 2. Barra accessibilità 5 moduli (misura portabile nº 2)

**Cosa fa**: una barra persistente (in alto, su ogni pagina) con 5 moduli:
**FONT** (A−/A+ con percentuale live), **INTERLINEA** (cicla 1.5 → 1.65 → 1.9
→ 2.2 → 2.6), **RIGHELLO** (banda di lettura che segue il puntatore),
**MODALITÀ** (normale/alto contrasto), **ASCOLTO** (Leggi/Interrompi TTS).
Le impostazioni sono salvate in `localStorage` e applicate a **tutte le
pagine** via `documentElement` e variabili CSS.

**Dove vive**:
- `client/src/components/AccessibilityToolbar.tsx` (UI + ARIA).
- `client/src/contexts/AccessibilityContext.tsx` (stato, persistenza,
  applicazione: `--lf-scale`, `--lf-lh`, classi `lf-ruler`/`lf-hc`).
- `client/src/App.tsx`: `<AccessibilityProvider>` avvolge le pagine.
- `client/src/index.css`: stili per le classi `lf-*`.

**Come portarlo su un'altra app**:
1. Copia `AccessibilityContext.tsx` e `AccessibilityToolbar.tsx`.
2. Avvolgi l'albero con `<AccessibilityProvider>` (in `App.tsx`/`main.tsx`).
3. Aggiungi al CSS le regole per `.lf-ruler`, `.lf-hc` e le variabili
   (`--lf-scale`, `--lf-lh`) usate dal provider.
4. Assicurati che i layout usino `rem`/`em` (non `px` fissi) così la scala font
   funziona davvero.

---

## 3–5. TTS, righello, alto contrasto (misure portabili nº 3–5)

**Lettura ad alta voce** (`hooks/useReadAloud.ts`): usa la Web Speech API
(`speechSynthesis`), sceglie la miglior voce italiana disponibile, legge **tutta
la pagina** (inclusi i chip/parole chiave e i valori dei campi), converte le
MAIUSCOLE in minuscolo e legge le date in forma naturale
("01/09/2026" → "primo settembre duemilaventisei").

**Righello di lettura**: banda orizzontale che segue il mouse (classe
`lf-ruler`), aiuta a mantenere la riga di lettura.

**Alto contrasto**: classe `lf-hc` sul `<html>`; in `index.css` vengono
rinforzati sfondi/testi/bordi. Combinato col principio "mai colore da solo".

**Come portarli**: copia `useReadAloud.ts` e i relativi pulsanti nella barra
(il modulo ASCOLTO); copia le regole CSS `.lf-ruler`/`.lf-hc`; aggiungi i
controlli nel context. Verifica con `prefers-reduced-motion` che le animazioni
si riducano (la cornice dinamica disattiva lo spinner animato in tal caso).

---

## 6. Embed accessibile: altezza dinamica in iframe (misura portabile nº 6)

**Cosa fa**: quando l'app è dentro un iframe (cornice dinamica su Blogger),
invia al parent l'altezza reale del documento con
`postMessage({type:"labvisio:height", height, cornice})`, così la cornice si
adatta senza scroll interni né pagine "lunghe a dismisura" su mobile.

**Dove vive**:
- `client/src/lib/heightSync.ts`: calcola l'altezza reale, aggiunge la classe
  `lf-embedded` al `<html>`, risponde al ping `labvisio:ping`, osserva i
  cambi di dimensione (`ResizeObserver`) e reinvia dopo load/resize.
- `client/src/main.tsx`: chiama `initHeightSync()`.
- `client/src/index.css`: le regole `html.lf-embedded .lf-docente*` tolgono le
  altezze fisse/vh e gli scroll interni della dashboard docente (altrimenti la
  misura dell'altezza si rompe).
- `cornice-dinamica/`: la cornice v3 è **impermeabile** (id univoci per
  istanza, filtro `e.source`) e **anti-loop** (debounce, clamp 100–15000 px,
  congelamento dopo crescite sospette).

**Come portarlo su un'altra app**:
1. Copia `heightSync.ts` e chiama `initHeightSync()` all'avvio.
2. Copia le regole CSS `html.lf-embedded ...` per le eventuali aree a pagina
   piena (dashboard, schede): niente `height: 100vh` né `overflow` nascosti.
3. Usa una cornice della famiglia `cornice-dinamica/` cambiando `APP_URL`.

---

## 7. Screen reader e ARIA (misura portabile nº 7)

Pattern usati in tutta l'app:
- `role="toolbar"` + `aria-label` descrittivo sulla barra accessibilità;
  ogni modulo è `role="group"` con `aria-label`.
- Icone decorative: `aria-hidden="true"`.
- Pulsanti con etichette esplicite (`aria-label` / testo visibile) e stati
  `aria-pressed` (es. Ascolto, Modalità).
- Percentuale font e annunci in `aria-live="polite"` / `role="status"`.
- Descrizione introduttiva `sr-only` all'inizio della barra.
- Niente contenitori interattivi annidati: dove serviva un bottone dentro un
  bottone si usa `<span role="button">` (evita HTML invalido e problemi di
  screen reader).
- Tooltip semplici e nativi (`title`) per le azioni secondarie.

**Come portarlo**: riusa gli stessi attributi nei componenti equivalenti;
verifica con uno screen reader (NVDA/VoiceOver) e con l'audit di Lighthouse.

---

## 8–9. Mai colore da solo + niente overflow mobile (misure portabili nº 8–9)

- **Report PDF e badge**: lo stato è sempre **simbolo + testo/colore**:
  ✔ verde (esatta), ✘ rossa (errata), —/`NON DATA` (non data). Il PDF NON
  stampa le parole CORRETTA/INCORRETTA né una riga RIEPILOGO: bastano i segni,
  il peso e la **legenda dei simboli** in fondo.
- **Overflow mobile**: le parole lunghe (maiuscole OpenDyslexic come
  `ROMANTICISMOS → IDENTIFICACIÓN`) **restano dentro i bordi** dei box
  grazie a `flex flex-wrap` + `min-w-0` + `[overflow-wrap:anywhere]` sulle
  righe del dettaglio a tendina docente (`TeacherPage.tsx` `AnswerDetails`) e
  nelle celle drop-zone studente (`StudentSchema.tsx` `DropZone`). Le icone e
  la freccia hanno `shrink-0`. Mai `overflow-hidden` che clippi il testo.

**Come portarlo**: adotta lo stesso pattern `flex-wrap/min-w-0/
overflow-wrap:anywhere` in ogni riga/chip che contiene testo lungo; per i PDF
ripeti il principio simboli+legenda.

---

## 10. Interazione accessibile (misura portabile nº 10)

- **Due modalità di inserimento**: drag & drop (desktop) **e** tap
  (click-to-place su mobile), gestione touch completa con
  `elementFromPoint` (REGOLA 29 nelle skill).
- Focus visibile (`focus-visible` con outline marcato, es. `#b71c1c`).
- Aree tocco e pulsanti con dimensioni minime (`h-6 min-w-6`, `size-3.5`…).
- Etichette e didascalie `uppercase` con `tracking` per la leggibilità.
- Layout responsive (table con scroll orizzontale contenuto, `flex-wrap`,
  `min-w-0`) verificato a larghezza cellulare (~320–400 px).

## 11. PDF accessibili (misura portabile nº 11)

- Font OpenDyslexic incorporato (jsPDF).
- Testo lungo sempre spezzato con `doc.splitTextToSize()` (mai troncato).
- Contrasti curati e colori con significato sempre affiancato da simboli/testo.
- QA automatico: `server/reportPdf.qa.test.ts` (vitest) rigenera
  `/tmp/qa/report-qa.pdf`; verifica visiva: niente CORRETTA/INCORRETTA/
  RIEPILOGO, presenti `NON DATA`, pesi e legenda.

---

## Checklist per portare l'accessibilità su un'altra app simile

- [ ] Copiare `client/public/fonts/` + `@font-face` + `font-family` (UI e PDF).
- [ ] Copiare `AccessibilityContext` + `AccessibilityToolbar` + `useReadAloud`
      e montare `<AccessibilityProvider>`.
- [ ] Copiare `heightSync.ts` + regole CSS `html.lf-embedded`.
- [ ] Servire `/fonts` con CORS `*`.
- [ ] Righe/chip con testo lungo: `flex-wrap` + `min-w-0` +
      `[overflow-wrap:anywhere]`.
- [ ] Stato mai dal solo colore: simbolo + testo/legenda (UI e PDF).
- [ ] Verificare `pnpm check`, `pnpm build`, `pnpm test` e il QA PDF.
- [ ] Testare con screen reader, tastiera (focus visibile), zoom font 160%,
      alto contrasto e viewport mobile.
- [ ] Aggiornare la cornice dinamica con il nuovo URL dell'app.

---

*Questo documento fa parte del pacchetto esportabile. Le misure descritte sono
portate dalle app della famiglia LabVisivo (PAROLE-CHIAVE-INTERATTIVE,
QUIZ INTERATTIVO, LATINO FACILE…) e sono riusabili su qualsiasi app didattica
generata con Easy-Peasy.AI.*
