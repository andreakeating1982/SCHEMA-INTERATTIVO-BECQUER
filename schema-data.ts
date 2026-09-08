/**
 * Schema data — Rima XXI (Bécquer) secondo il metodo Lázaro Carreter.
 * Struttura: griglia 5×4 (5 righe × 4 colonne).
 *
 * Colonna 1: Nome fase (testo ciano/blu)
 * Colonna 2: Descrizione fase (testo nero)
 * Colonna 3: Parola chiave - contenuto (testo verde scuro)
 * Colonna 4: Parola chiave - forma/esempio (testo magenta/rosa)
 *
 * I bordi della griglia sono blu scuro (#1B3A5C).
 *
 * Totale 12 slot (alcune celle ne contengono 2).
 */

/* ────────────── Types ────────────── */

export interface GridRow {
  id: string;
  phaseLabel: string;       // es. "FASE 1/2" — colonna 1
  description: string;      // es. "LECTURA Y / LOCALIZACIÓN" — colonna 2 (usa " / " per a capo)
  col3Class: string;        // colore testo colonna 3
  col4Class: string;        // colore testo colonna 4
  col3Slots: GridSlotDef[]; // slot nella colonna 3
  col4Slots: GridSlotDef[]; // slot nella colonna 4
}

export interface GridSlotDef {
  slotId: string;
  correctAnswer: string;
}

export interface GridSlot extends GridSlotDef {
  rowId: string;
  col: 3 | 4;
}

export interface SchemaSlot {
  id: string;
  rowId: string;
  phaseLabel: string;
  phaseSubtitle?: string;
  phaseColor: string;
  correctAnswer: string;
  options: string[];
}

/* ────────────── Constants ────────────── */

export const TOTAL_SLOTS = 12;

/** Colori dei testi per colonna */
export const COL3_COLOR = "#2D6A4F"; // verde scuro
export const COL4_COLOR = "#C2255C"; // magenta/rosa
export const COL1_COLOR = "#0096C7"; // ciano/blu
export const COL2_COLOR = "#1A1A1A"; // nero
export const GRID_BORDER_COLOR = "#1B3A5C"; // blu scuro

/** Colori usati nei vecchi report PDF */
export const PHASE_COLORS = ["#8B1A1A", "#B8860B", "#2E5E2E", "#4A6FA5", "#6B3FA0"];

/**
 * Tutte le 12 parole chiave (corrette).
 */
export const ALL_KEYWORDS: string[] = [
  "Romanticismo", "Rimas",
  "poesía", "persona amada",
  "endecasílabos", "heptasílabo",
  "diálogo", "anáfora",
  "apóstrofe", "identificación",
  "relación", "sencillez",
];

/* ────────────── Griglia 5×4 ────────────── */

export const GRID_ROWS: GridRow[] = [
  {
    id: "fase1-2",
    phaseLabel: "FASE 1/2",
    description: "LECTURA Y / LOCALIZACIÓN",
    col3Class: COL3_COLOR,
    col4Class: COL4_COLOR,
    col3Slots: [{ slotId: "f1-c3", correctAnswer: "Romanticismo" }],
    col4Slots: [{ slotId: "f1-c4", correctAnswer: "Rimas" }],
  },
  {
    id: "fase3",
    phaseLabel: "FASE 3",
    description: "TEMA",
    col3Class: COL3_COLOR,
    col4Class: COL4_COLOR,
    col3Slots: [{ slotId: "f3-c3", correctAnswer: "poesía" }],
    col4Slots: [{ slotId: "f3-c4", correctAnswer: "persona amada" }],
  },
  {
    id: "fase4",
    phaseLabel: "FASE 4",
    description: "ESTRUCTURA",
    col3Class: COL3_COLOR,
    col4Class: COL4_COLOR,
    col3Slots: [{ slotId: "f4-c3", correctAnswer: "endecasílabos" }],
    col4Slots: [{ slotId: "f4-c4", correctAnswer: "heptasílabo" }],
  },
  {
    id: "fase5",
    phaseLabel: "FASE 5",
    description: "ANÁLISIS DE / LA FORMA",
    col3Class: COL3_COLOR,
    col4Class: COL4_COLOR,
    col3Slots: [
      { slotId: "f5-c3-0", correctAnswer: "diálogo" },
      { slotId: "f5-c3-1", correctAnswer: "apóstrofe" },
    ],
    col4Slots: [
      { slotId: "f5-c4-0", correctAnswer: "anáfora" },
      { slotId: "f5-c4-1", correctAnswer: "identificación" },
    ],
  },
  {
    id: "fase6-7",
    phaseLabel: "FASE 6/7",
    description: "REDACCIÓN Y / CONCLUSIÓN",
    col3Class: COL3_COLOR,
    col4Class: COL4_COLOR,
    col3Slots: [{ slotId: "f6-c3", correctAnswer: "relación" }],
    col4Slots: [{ slotId: "f6-c4", correctAnswer: "sencillez" }],
  },
];

/**
 * Lista piatta di tutti i 12 slot con rowId e colonna.
 */
export const GRID_SLOTS: GridSlot[] = GRID_ROWS.flatMap(row => [
  ...row.col3Slots.map(s => ({ ...s, rowId: row.id, col: 3 as const })),
  ...row.col4Slots.map(s => ({ ...s, rowId: row.id, col: 4 as const })),
]);

/** Ottiene la risposta corretta per un dato slotId */
export function getCorrectAnswer(slotId: string): string {
  return GRID_SLOTS.find(s => s.slotId === slotId)?.correctAnswer ?? "";
}

/** Ottiene lo shortId della riga da uno slotId (es. "f1-c3" → "f1") */
export function getShortRowId(slotId: string): string {
  return slotId.split("-c")[0] || "";
}

/* ────────────── Vecchi alias per retrocompatibilità ────────────── */

export interface SchemaRow {
  id: string;
  phaseLabel: string;
  phaseSubtitle?: string;
  color: string;
  slots: string[];
}

export const SCHEMA_ROWS: SchemaRow[] = GRID_ROWS.map((row, i) => ({
  id: row.id,
  phaseLabel: `${row.phaseLabel} — ${row.description.replace(" / ", " ")}`,
  phaseSubtitle: row.description,
  color: PHASE_COLORS[i] || "#666",
  slots: [
    ...row.col3Slots.map(s => s.correctAnswer),
    ...row.col4Slots.map(s => s.correctAnswer),
  ],
}));

/* ────────────── Helpers ────────────── */

/**
 * Fisher-Yates shuffle.
 */
export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Calcola quali slot di uno studente sono da considerare CORRETTI,
 * consentendo ordine libero delle parole chiave all'interno della stessa fase.
 *
 * Le risposte di una stessa fase (rowId) vengono confrontate come insiemi:
 * una parola chiave è corretta se appartiene all'insieme delle parole corrette
 * di quella fase, indipendentemente dallo slot in cui è stata inserita.
 * (Es. scambiare "diálogo" con "apóstrofe" tra slot della FASE 5 resta corretto.)
 */
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
    // Matching greedy: ogni risposta dello studente consuma un'occorrenza della parola corretta
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

/**
 * Costruisce slot con opzioni (per dropdown - non più usato ma mantenuto per API).
 */
export function buildSchemaSlots(): SchemaSlot[] {
  const keywordsForAllSlots = shuffle(ALL_KEYWORDS);
  return GRID_SLOTS.map(slot => {
    const row = GRID_ROWS.find(r => r.id === slot.rowId);
    return {
      id: slot.slotId,
      rowId: slot.rowId,
      phaseLabel: row ? `${row.phaseLabel} — ${row.description.replace(" / ", " ")}` : "",
      phaseSubtitle: row?.description || "",
      phaseColor: PHASE_COLORS[GRID_ROWS.findIndex(r => r.id === slot.rowId)] || "#666",
      correctAnswer: slot.correctAnswer,
      options: keywordsForAllSlots,
    };
  });
}
