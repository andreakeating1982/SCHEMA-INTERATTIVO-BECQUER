#!/usr/bin/env python3
"""
SCHEMA INTERATTIVO — Rebuild schema-data.ts (set di domande 5x4)

Rigenera server/schema-data.ts dell'app SCHEMA INTERATTIVO (sorgente in
/home/user/becquer-schema-full-app) a partire da un file JSON con il nuovo
set di domande. Genera anche gli snippet da incollare in reportPdf.ts
(titolo, sottotitolo, nome file PDF e le due tabelle gridData hardcoded).

Usage:
    python rebuild_schema_data.py domande.json [percorso_output_schema_data.ts]

- Se il percorso output è omesso, stampa su stdout il contenuto di schema-data.ts.
- Gli snippet PDF vengono SEMPRE stampati su stdout, delimitati da marcatori
  `=== PDF-SNIPPETS START ===` / `=== PDF-SNIPPETS END ===`.

Formato JSON atteso (vedi templates/schema-questions-template.json):
{
  "appName": "SCHEMA INTERATTIVO — RIMA XXI (BÉCQUER)",   // titolo nei PDF
  "methodName": "Metodo di Fernando Lázaro Carreter",      // sottotitolo PDF + badge studente
  "topicDescription": "Rima XXI (Bécquer) secondo il metodo Lázaro Carreter.", // commento header
  "totalSlots": 12,                                        // opzionale: se assente = somma celle
  "colors": {                                              // opzionale: default = attuali
    "col3": "#2D6A4F", "col4": "#C2255C", "col1": "#0096C7", "col2": "#1A1A1A",
    "gridBorder": "#1B3A5C",
    "phases": ["#8B1A1A", "#B8860B", "#2E5E2E", "#4A6FA5", "#6B3FA0"]
  },
  "rows": [
    {
      "id": "fase1-2",               // id riga; il prefisso slot = "f" + primo numero
      "phaseLabel": "FASE 1/2",      // colonna 1 della griglia
      "description": "LECTURA Y / LOCALIZACIÓN",  // colonna 2; " / " = andata a capo nel PDF
      "col3": ["Romanticismo"],      // parole corrette colonna 3 (max 2)
      "col4": ["Rimas"]              // parole corrette colonna 4 (max 2)
    },
    ...
  ]
}

Convenzioni vincolanti (NON violarle):
- slotId: "f" + primo numero dell'id riga + "-c3"/"-c4" (+ "-0", "-1" se la colonna ha 2 celle)
- TOTAL_SLOTS = somma di tutte le celle (default 12)
- Ogni parola chiave DEVE comparire una sola volta in tutta la griglia
- max 2 risposte per colonna (la griglia PDF è 5x4 con celle singole/doppie)
"""

import json
import re
import sys
from typing import Any

DEFAULTS = {
    "colors": {
        "col3": "#2D6A4F",
        "col4": "#C2255C",
        "col1": "#0096C7",
        "col2": "#1A1A1A",
        "gridBorder": "#1B3A5C",
        "phases": ["#8B1A1A", "#B8860B", "#2E5E2E", "#4A6FA5", "#6B3FA0"],
    }
}


def short_prefix(row_id: str) -> str:
    """'fase1-2' -> 'f1'; 'fase3' -> 'f3'; 'fase6-7' -> 'f6'."""
    m = re.search(r"(\d+)", row_id or "")
    if not m:
        raise ValueError(f"Impossibile derivare il prefisso slot dall'id riga: '{row_id}' (serve un numero, es. 'fase1-2')")
    return f"f{m.group(1)}"


def validate(data: dict) -> None:
    required = ["appName", "methodName", "rows"]
    for f in required:
        if f not in data:
            raise ValueError(f"Campo obbligatorio mancante: '{f}'")
    if not isinstance(data["rows"], list) or not data["rows"]:
        raise ValueError("'rows' deve essere un array non vuoto")
    if len(data["rows"]) > 6:
        raise ValueError("La griglia PDF è 5x4: max 5 righe (attuali: 5)")
    seen_kw = {}
    total = 0
    for row in data["rows"]:
        for f in ["id", "phaseLabel", "description", "col3", "col4"]:
            if f not in row:
                raise ValueError(f"rows: campo '{f}' mancante in riga: {json.dumps(row)}")
        for col in ("col3", "col4"):
            if not isinstance(row[col], list) or not row[col]:
                raise ValueError(f"rows['{row['id']}']: '{col}' deve essere un array non vuoto")
            if len(row[col]) > 2:
                raise ValueError(f"rows['{row['id']}']: '{col}' ha {len(row[col])} risposte, max 2 (griglia 5x4)")
            for kw in row[col]:
                total += 1
                if kw in seen_kw:
                    raise ValueError(f"Parola chiave duplicata nella griglia: '{kw}' (righe '{seen_kw[kw]}' e '{row['id']}')")
                seen_kw[kw] = row["id"]
    declared = data.get("totalSlots")
    if declared is not None and declared != total:
        raise ValueError(f"totalSlots dichiarato ({declared}) != celle effettive ({total})")


def build_slot_ids(row: dict) -> dict:
    """Costruisce gli slotId per colonna secondo la convenzione f{c}-c{3|4}[-N]."""
    prefix = short_prefix(row["id"])
    out = {"col3": [], "col4": []}
    for col in ("col3", "col4"):
        answers = row[col]
        for i, ans in enumerate(answers):
            suffix = f"-{i}" if len(answers) > 1 else ""
            out[col].append({"slotId": f"{prefix}-c{col[-1]}{suffix}", "correctAnswer": ans})
    return out


def gen_schema_data_ts(data: dict) -> str:
    colors = {**DEFAULTS["colors"], **(data.get("colors") or {})}
    phases = colors["phases"]
    rows = data["rows"]
    total = sum(len(r["col3"]) + len(r["col4"]) for r in rows)
    all_kw = []
    for r in rows:
        all_kw += r["col3"] + r["col4"]

    lines: list[str] = []
    topic = (data.get("topicDescription") or data["appName"]).rstrip(".")
    lines.append("/**")
    lines.append(f" * Schema data — {topic}.")
    lines.append(" * Struttura: griglia 5×4 (5 righe × 4 colonne).")
    lines.append(" *")
    lines.append(" * Colonna 1: Nome fase (testo ciano/blu)")
    lines.append(" * Colonna 2: Descrizione fase (testo nero)")
    lines.append(" * Colonna 3: Parola chiave - contenuto (testo verde scuro)")
    lines.append(" * Colonna 4: Parola chiave - forma/esempio (testo magenta/rosa)")
    lines.append(" *")
    lines.append(" * I bordi della griglia sono blu scuro (#1B3A5C).")
    lines.append(" *")
    lines.append(f" * Totale {total} slot (alcune celle ne contengono 2).")
    lines.append(" *")
    lines.append(" * AUTO-GENERATO da schema-interattivo-sorgente/scripts/rebuild_schema_data.py")
    lines.append(" * NON modificare a mano — ri-esegui lo script con il JSON delle domande.")
    lines.append(" */")
    lines.append("")
    lines.append("/* ────────────── Types ────────────── */")
    lines.append("")
    lines.append("export interface GridRow {")
    lines.append("  id: string;")
    lines.append('  phaseLabel: string;       // es. "FASE 1/2" — colonna 1')
    lines.append('  description: string;      // es. "LECTURA Y / LOCALIZACIÓN" — colonna 2 (usa " / " per a capo)')
    lines.append("  col3Class: string;        // colore testo colonna 3")
    lines.append("  col4Class: string;        // colore testo colonna 4")
    lines.append("  col3Slots: GridSlotDef[]; // slot nella colonna 3")
    lines.append("  col4Slots: GridSlotDef[]; // slot nella colonna 4")
    lines.append("}")
    lines.append("")
    lines.append("export interface GridSlotDef {")
    lines.append("  slotId: string;")
    lines.append("  correctAnswer: string;")
    lines.append("}")
    lines.append("")
    lines.append("export interface GridSlot extends GridSlotDef {")
    lines.append("  rowId: string;")
    lines.append("  col: 3 | 4;")
    lines.append("}")
    lines.append("")
    lines.append("export interface SchemaSlot {")
    lines.append("  id: string;")
    lines.append("  rowId: string;")
    lines.append("  phaseLabel: string;")
    lines.append("  phaseSubtitle?: string;")
    lines.append("  phaseColor: string;")
    lines.append("  correctAnswer: string;")
    lines.append("  options: string[];")
    lines.append("}")
    lines.append("")
    lines.append("/* ────────────── Constants ────────────── */")
    lines.append("")
    lines.append(f"export const TOTAL_SLOTS = {total};")
    lines.append("")
    lines.append("/** Colori dei testi per colonna */")
    lines.append(f'export const COL3_COLOR = "{colors["col3"]}"; // verde scuro')
    lines.append(f'export const COL4_COLOR = "{colors["col4"]}"; // magenta/rosa')
    lines.append(f'export const COL1_COLOR = "{colors["col1"]}"; // ciano/blu')
    lines.append(f'export const COL2_COLOR = "{colors["col2"]}"; // nero')
    lines.append(f'export const GRID_BORDER_COLOR = "{colors["gridBorder"]}"; // blu scuro')
    lines.append("")
    lines.append("/** Colori usati nei vecchi report PDF */")
    phases_js = ", ".join(json.dumps(p) for p in phases)
    lines.append(f"export const PHASE_COLORS = [{phases_js}];")
    lines.append("")
    lines.append("/**")
    lines.append(f" * Tutte le {len(all_kw)} parole chiave (corrette).")
    lines.append(" */")
    # Ordina le keyword come nell'originale: per riga, coppie col3[i] + col4[i]
    ordered_kw = []
    for r in rows:
        n = max(len(r["col3"]), len(r["col4"]))
        for i in range(n):
            if i < len(r["col3"]):
                ordered_kw.append(r["col3"][i])
            if i < len(r["col4"]):
                ordered_kw.append(r["col4"][i])
    lines.append("export const ALL_KEYWORDS: string[] = [")
    for i in range(0, len(ordered_kw), 2):
        pair = ordered_kw[i:i + 2]
        lines.append("  " + ", ".join(json.dumps(k, ensure_ascii=False) for k in pair) + ",")
    lines.append("];")
    lines.append("")
    lines.append("/* ────────────── Griglia 5×4 ────────────── */")
    lines.append("")
    lines.append("export const GRID_ROWS: GridRow[] = [")
    for row in rows:
        ids = build_slot_ids(row)
        lines.append("  {")
        lines.append(f'    id: {json.dumps(row["id"])},')
        lines.append(f'    phaseLabel: {json.dumps(row["phaseLabel"])},')
        lines.append(f'    description: {json.dumps(row["description"], ensure_ascii=False)},')
        lines.append("    col3Class: COL3_COLOR,")
        lines.append("    col4Class: COL4_COLOR,")
        def fmt_slot(s):
            return (
                "{ slotId: " + json.dumps(s["slotId"], ensure_ascii=False)
                + ", correctAnswer: " + json.dumps(s["correctAnswer"], ensure_ascii=False) + " }"
            )

        def fmt_col_slots(slots):
            if len(slots) == 1:
                return f"[{fmt_slot(slots[0])}]"
            inner = ",\n".join("      " + fmt_slot(s) for s in slots)
            return "[\n" + inner + ",\n    ]"

        lines.append(f"    col3Slots: {fmt_col_slots(ids['col3'])},")
        lines.append(f"    col4Slots: {fmt_col_slots(ids['col4'])},")
        lines.append("  },")
    lines.append("];")
    lines.append("")
    lines.append(STATIC_TAIL)
    return "\n".join(lines)


# Parte statica (identica all'app sorgente — NON cambiarla)
STATIC_TAIL = """/**
 * Lista piatta di tutti gli slot con rowId e colonna.
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
"""


def gen_pdf_snippets(data: dict) -> str:
    """Genera gli snippet da incollare in client/src/lib/reportPdf.ts."""
    app = data["appName"]
    method = data["methodName"]
    pdf_base = data.get("pdfFileBase") or app
    safe = re.sub(r"[^A-Za-z0-9]+", "_", pdf_base).strip("_").upper()[:40]

    blank = []
    solution = []
    for row in data["rows"]:
        desc = [d.strip() for d in row["description"].split("/")]
        empty_col3 = ', '.join('""' for _ in row["col3"])
        empty_col4 = ', '.join('""' for _ in row["col4"])
        blank.append(
            '    { phase: ' + json.dumps(row["phaseLabel"]) + ', desc: ' + json.dumps(desc, ensure_ascii=False) + ', '
            + 'col3: [' + empty_col3 + '], col4: [' + empty_col4 + '] },'
        )
        solution.append(
            f'    {{ phase: {json.dumps(row["phaseLabel"])}, desc: {json.dumps(desc, ensure_ascii=False)}, '
            f'col3: {json.dumps(row["col3"], ensure_ascii=False)}, col4: {json.dumps(row["col4"], ensure_ascii=False)} }},'
        )

    lines = []
    lines.append("=== PDF-SNIPPETS START ===")
    lines.append("")
    lines.append("# 1) TITOLO PDF (2 occorrenze: righe ~89 e ~245 di reportPdf.ts)")
    lines.append(f'doc.text({json.dumps(app, ensure_ascii=False)}, PW / 2, y + 6, {{ align: "center" }});')
    lines.append("")
    lines.append("# 2) SOTTOTITOLO PDF (2 occorrenze: righe ~91 e ~439 di reportPdf.ts)")
    lines.append(f'doc.text({json.dumps(method, ensure_ascii=False)}, PW / 2, y + 11, {{ align: "center" }});')
    lines.append("")
    lines.append("# 3) NOME FILE PDF (3 occorrenze in reportPdf.ts: righe ~225, ~417, ~608)")
    lines.append(f'- riga ~225:  doc.save(`Report_Schema_{safe}_${{safe}}_${{data.classCode}}.pdf`);')
    lines.append(f'- riga ~417:  doc.save(`Schema_{safe}_${{safe}}.pdf`);')
    lines.append(f'- riga ~608:  doc.save(`Schema_Completo_{safe}_${{safe}}.pdf`);')
    lines.append("")
    lines.append("# 4) TABELLA BIANCA (foglio esercizio — gridData in reportPdf.ts, ~riga 292)")
    lines.append("const gridData = [")
    lines.extend(blank)
    lines.append("];")
    lines.append("")
    lines.append("# 5) TABELLA SOLUZIONE (report insegnante — gridData in reportPdf.ts, ~riga 479)")
    lines.append("const gridData = [")
    lines.extend(solution)
    lines.append("];")
    lines.append("")
    lines.append("# 6) TESTI CONTENUTO in client/src/pages/StudentSchema.tsx")
    lines.append(f'- riga ~528: badge "Metodo Lázaro Carreter" -> {json.dumps(method, ensure_ascii=False)}')
    lines.append(f'- riga ~738: messaggio successo (menziona l\'opera) -> aggiorna con: {json.dumps(data.get("topicDescription") or data["appName"], ensure_ascii=False)}')
    lines.append(f'- riga ~763: footer "Metodo Lázaro Carreter" -> {json.dumps(method, ensure_ascii=False)}')
    lines.append("=== PDF-SNIPPETS END ===")
    return "\n".join(lines)


def main() -> int:
    if len(sys.argv) < 2:
        print("Usage: python rebuild_schema_data.py domande.json [percorso_output_schema_data.ts]", file=sys.stderr)
        return 1
    try:
        with open(sys.argv[1], "r", encoding="utf-8") as f:
            data = json.load(f)
    except FileNotFoundError:
        print(f"Errore: file non trovato: {sys.argv[1]}", file=sys.stderr)
        return 1
    except json.JSONDecodeError as e:
        print(f"Errore: JSON non valido: {e}", file=sys.stderr)
        return 1

    try:
        validate(data)
    except ValueError as e:
        print(f"Errore di validazione: {e}", file=sys.stderr)
        return 1

    ts = gen_schema_data_ts(data)
    snippets = gen_pdf_snippets(data)

    if len(sys.argv) >= 3:
        out_path = sys.argv[2]
        with open(out_path, "w", encoding="utf-8") as f:
            f.write(ts.rstrip("\n") + "\n")
        print(f"OK: schema-data.ts scritto in {out_path}", file=sys.stderr)
    else:
        print(ts)

    print()
    print(snippets)
    return 0


if __name__ == "__main__":
    sys.exit(main())
