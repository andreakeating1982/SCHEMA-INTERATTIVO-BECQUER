/**
 * client/src/lib/reportPdf.ts — PDF ACCESSIBILI (DSA/BES/ipovisione)
 *
 * Aggiornato sul modello dell'app di riferimento PAROLE-CHIAVE-INTERATTIVE:
 *   • Font OpenDyslexic (Regular + Bold) embedded da /fonts (client/public/fonts),
 *     con fallback automatico su "times" se il fetch del font fallisce.
 *   • Font minimo 14 pt (15 pt per i titoli) dove il contenuto lo consente;
 *     le griglie compatte usano comunque OpenDyslexic e dimensioni ≥ 9.5 pt.
 *   • Interlinea 1.5 (fattore ridotto in automatico 1.5→1.15 SOLO se un
 *     contenuto eccezionale non entra in una facciata — preflight reale).
 *   • Risposta corretta/errata marcata SENZA affidarsi al solo colore:
 *     simboli vettoriali ✔ (verde scuro) / ✘ (rossa) — senza le scritte
 *     CORRETTA/INCORRETTA (ridondanti coi segni) — con legenda in fondo.
 *   • Riquadro VOTO/PUNTEGGIO su un'unica linea centrata, cornice blu,
 *     mai spezzato tra due facciate.
 */
import { jsPDF } from "jspdf";

// ── Geometria A4 ────────────────────────────────────────────────────────────
const PAGE_W = 210;
const PAGE_H = 297;
const M = 16;             // margine orizzontale (mm)
const CW = PAGE_W - 2 * M; // 178 mm
const M_TOP = 12;         // margine superiore visivo (mm)
const M_BOT = 12;         // margine inferiore (mm)
const MM_PER_PT = 0.352778;

// Fattori di interlinea candidati: parte da 1.5 (richiesto) e scende SOLO se un
// contenuto eccezionale non entra in una facciata.
const FACTORS = [1.5, 1.45, 1.4, 1.35, 1.3, 1.25, 1.2, 1.15];

// ── Colori (testo scuro + cornice BLU accessibile) ──────────────────────────
const INK: [number, number, number] = [26, 24, 22];        // testo
const BLUE: [number, number, number] = [0, 70, 160];       // cornice + accenti
const GREEN: [number, number, number] = [0, 120, 60];      // risposta esatta (testo)
const GREEN_DARK: [number, number, number] = [0, 92, 36];  // spunta ✔
const RED: [number, number, number] = [190, 40, 40];       // ✘ errata
const GREY: [number, number, number] = [120, 110, 100];    // separatori

// ── Simboli vettoriali ✔ / ✘ (OpenDyslexic NON ha i glifi U+2714/U+2718) ────
const SYMBOL_W = 4.8;
const MARK_GAP_AFTER_LETTER = 1.7;
const MARK_GAP_BEFORE_TEXT = 1.7;

// ── Font helpers (OpenDyslexic con fallback times) ──────────────────────────
interface FontState {
  name: string;
  fallback: boolean;
}
let fontState: FontState = { name: "times", fallback: true };
// Registra il font su OGNI documento (i preflight creano doc di prova separati)
let fontRegisteredOn = new WeakSet<jsPDF>();

const fontCache: Record<string, string> = {};

function mmLineHeight(sizePt: number, factor: number): number {
  return sizePt * factor * MM_PER_PT;
}

async function fileToBase64(buf: ArrayBuffer): Promise<string> {
  if (typeof Buffer !== "undefined") return Buffer.from(buf).toString("base64");
  return new Promise<string>((resolve, reject) => {
    const blob = new Blob([buf]);
    const fr = new FileReader();
    fr.onload = () => {
      const s = String(fr.result);
      resolve(s.slice(s.indexOf(",") + 1));
    };
    fr.onerror = () => reject(fr.error);
    fr.readAsDataURL(blob);
  });
}

async function loadFontBase64(fileName: string, fontsBase: string): Promise<string> {
  if (fontCache[fileName]) return fontCache[fileName];
  const url = (fontsBase || "") + "/fonts/" + fileName;
  const res = await fetch(url);
  if (!res.ok) throw new Error("font " + fileName + " non disponibile");
  const ab = await res.arrayBuffer();
  fontCache[fileName] = await fileToBase64(ab);
  return fontCache[fileName];
}

async function ensureFonts(doc: jsPDF, fontsBase: string): Promise<void> {
  // Se il font è già registrato su QUESTO documento non serve rifare nulla
  if (fontRegisteredOn.has(doc)) {
    doc.setFont(fontState.name, "normal");
    return;
  }
  try {
    // I file base64 vengono caricati una sola volta (fontCache)
    const reg = await loadFontBase64("OpenDyslexic-Regular.ttf", fontsBase);
    const bold = await loadFontBase64("OpenDyslexic-Bold.ttf", fontsBase);
    doc.addFileToVFS("OpenDyslexic-Regular.ttf", reg);
    doc.addFileToVFS("OpenDyslexic-Bold.ttf", bold);
    doc.addFont("OpenDyslexic-Regular.ttf", "OpenDyslexic", "normal");
    doc.addFont("OpenDyslexic-Bold.ttf", "OpenDyslexic", "bold");
    doc.setFont("OpenDyslexic", "normal");
    fontState = { name: "OpenDyslexic", fallback: false };
    fontRegisteredOn.add(doc);
  } catch {
    fontState = { name: "times", fallback: true };
    doc.setFont("times", "normal");
    fontRegisteredOn.add(doc);
  }
}

function setFontNormal(doc: jsPDF): void {
  doc.setFont(fontState.name, "normal");
}
function setFontBold(doc: jsPDF): void {
  doc.setFont(fontState.name, "bold");
}

// ── Tipi report (stessa forma dell'API precedente) ──────────────────────────

interface ReportSlotAnswer {
  slotId: string;
  selectedKeyword: string | null;
  isCorrect: boolean;
  correctAnswer: string;
  phaseLabel: string;
}

interface ReportStudent {
  name: string;
  score: number;
  totalSlots: number;
  percentage: number;
  grade: number;
  weightedScore?: number;
  answers: ReportSlotAnswer[];
}

interface SchemaRow {
  id: string;
  phaseLabel: string;
  phaseSubtitle?: string;
  color: string;
  slots: string[];
}

interface ReportData {
  className: string;
  schoolYear: string;
  classDate?: string;
  classCode: string;
  schemaRows: SchemaRow[];
  students: ReportStudent[];
}

interface BlankQuestionsData {
  className: string;
  classDate?: string;
}

interface CompletedSchemaData {
  className: string;
  classDate?: string;
  classCode: string;
}

type RGB = [number, number, number];

// ── Utility testo ───────────────────────────────────────────────────────────

function fmtDate(dateStr?: string): string {
  if (!dateStr) return "";
  try {
    return new Date(dateStr + "T00:00:00").toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function phaseColor(phaseLabel: string): [number, number, number] {
  if (phaseLabel.includes("FASE 1") || phaseLabel.includes("LECTURA"))  return [139, 26, 26];   // #8B1A1A
  if (phaseLabel.includes("FASE 3"))                                      return [184, 134, 11];  // #B8860B
  if (phaseLabel.includes("FASE 4"))                                      return [46, 94, 46];    // #2E5E2E
  if (phaseLabel.includes("FASE 5"))                                      return [74, 111, 165];  // #4A6FA5
  if (phaseLabel.includes("FASE 6") || phaseLabel.includes("FASE 7"))     return [107, 63, 160];  // #6B3FA0
  return [100, 80, 60];
}

function drawSymbol(
  doc: jsPDF,
  kind: "check" | "cross",
  color: [number, number, number],
  x: number,
  y: number
): void {
  doc.setDrawColor(color[0], color[1], color[2]);
  doc.setLineWidth(1.0);
  try {
    if (kind === "check") doc.setLineJoin("miter");
    else doc.setLineJoin("round");
    doc.setLineCap("round");
  } catch {
    /* API non disponibile */
  }
  if (kind === "check") {
    doc.lines(
      [
        [1.0, 3.3],
        [2.7, -2.9],
      ],
      x + 0.35,
      y - 3.85,
      [1, 1],
      "S",
      false
    );
  } else {
    doc.line(x + 0.55, y - 0.7, x + 4.15, y - 3.7);
    doc.line(x + 0.55, y - 3.7, x + 4.15, y - 0.7);
  }
  try {
    doc.setLineCap("butt");
    doc.setLineJoin("miter");
  } catch {
    /* ignora */
  }
}

function drawWrapped(doc: jsPDF, lines: string[], x: number, y: number, lineH: number): number {
  for (let i = 0; i < lines.length; i++) {
    doc.text(lines[i], x, y);
    y += lineH;
  }
  return y;
}

/** Riquadro VOTO/PUNTEGGIO (cornice BLU, UN'UNICA linea, margini stretti).
 *  La dimensione del font si adatta per restare su UNA riga. Ritorna l'altezza. */
function drawScoreBox(
  doc: jsPDF,
  scoreLine: string,
  y: number,
  maxW = CW - 6
): number {
  let boxFont = 14;
  doc.setFontSize(boxFont);
  setFontBold(doc);
  let textW = doc.getTextWidth(scoreLine);
  while (textW > maxW && boxFont > 10) {
    boxFont -= 0.5;
    doc.setFontSize(boxFont);
    textW = doc.getTextWidth(scoreLine);
  }
  const boxW = textW + 6;
  const boxX = (PAGE_W - boxW) / 2;
  const boxH = boxFont * MM_PER_PT + 3;
  doc.setDrawColor(BLUE[0], BLUE[1], BLUE[2]);
  doc.setLineWidth(0.4);
  doc.rect(boxX, y, boxW, boxH);
  doc.setFontSize(boxFont);
  setFontBold(doc);
  doc.setTextColor(BLUE[0], BLUE[1], BLUE[2]);
  doc.text(scoreLine, PAGE_W / 2, y + boxH / 2 + boxFont * MM_PER_PT * 0.25, { align: "center" });
  setFontNormal(doc);
  doc.setTextColor(INK[0], INK[1], INK[2]);
  return boxH;
}

// =============================================================================
// REPORT PDF — una facciata A4 per studente (simboli ✔/✘ + legenda)
// =============================================================================

interface PhaseGroup {
  phase: string;
  answers: ReportSlotAnswer[];
}

function buildPhaseGroups(data: ReportData, student: ReportStudent): PhaseGroup[] {
  const phaseMap = new Map<string, ReportSlotAnswer[]>();
  for (const ans of student.answers) {
    if (!phaseMap.has(ans.phaseLabel)) phaseMap.set(ans.phaseLabel, []);
    phaseMap.get(ans.phaseLabel)!.push(ans);
  }
  // Ordina le fasi seguendo l'ordine di data.schemaRows (come il PDF originale)
  const groups: PhaseGroup[] = [];
  const order = data.schemaRows.map((r) => r.phaseLabel);
  const entries = Array.from(phaseMap.entries());
  entries.sort(([a], [b]) => {
    const ia = order.indexOf(a);
    const ib = order.indexOf(b);
    return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib);
  });
  for (const [phase, answers] of entries) {
    groups.push({ phase, answers });
  }
  return groups;
}

function drawReportPage(
  doc: jsPDF,
  data: ReportData,
  student: ReportStudent,
  factor: number
): number {
  const lh14 = mmLineHeight(14, factor);
  const lh15 = mmLineHeight(15, factor);
  const lh13 = mmLineHeight(13, factor);
  let y = M_TOP + lh14 * 0.72;

  // ── Titolo
  doc.setFontSize(15);
  setFontBold(doc);
  doc.setTextColor(BLUE[0], BLUE[1], BLUE[2]);
  const titleLines = doc.splitTextToSize("SCHEMA INTERATTIVO", CW);
  doc.text(titleLines, PAGE_W / 2, y, { align: "center" });
  y += titleLines.length * lh15 + 1.6;

  // ── Sottotitolo (metodo)
  doc.setFontSize(13);
  setFontNormal(doc);
  doc.setTextColor(100, 30, 40);
  const subLines = doc.splitTextToSize("Metodo di analisi testuale — RIMA XXI (BÉCQUER)", CW);
  doc.text(subLines, PAGE_W / 2, y, { align: "center" });
  y += subLines.length * lh13 + 2.2;

  // ── Studente
  doc.setTextColor(INK[0], INK[1], INK[2]);
  const nameLines = doc.splitTextToSize(`Studente: ${student.name}`, CW);
  doc.text(nameLines, PAGE_W / 2, y, { align: "center" });
  y += nameLines.length * lh15 + 1.6;

  // ── Classe · Data
  doc.setFontSize(14);
  setFontNormal(doc);
  const info = `Classe: ${data.className}   ·   Data: ${fmtDate(data.classDate)}`;
  const infoLines = doc.splitTextToSize(info, CW);
  doc.text(infoLines, PAGE_W / 2, y, { align: "center" });
  y += infoLines.length * lh14 + 2.4;

  // ── Voto in box PUNTEGGIO (una riga, cornice blu)
  const gradeLine = `PUNTEGGIO: ${student.grade.toFixed(1)}/10`;
  const boxH = drawScoreBox(doc, gradeLine, y);
  y += boxH + 3.2;

  // ── Filetto sottile
  doc.setDrawColor(GREY[0], GREY[1], GREY[2]);
  doc.setLineWidth(0.35);
  doc.line(M, y - 1.4, PAGE_W - M, y - 1.4);
  y += 4;

  // ── Risposte raggruppate per fase
  const groups = buildPhaseGroups(data, student);
  for (const group of groups) {
    // Intestazione fase colorata
    const [hr, hg, hb] = phaseColor(group.phase);
    const phaseTitle = `${group.phase}`;
    doc.setFillColor(hr, hg, hb);
    doc.setTextColor(255, 255, 255);
    doc.roundedRect(M, y, CW, 7.5, 1.5, 1.5, "F");
    doc.setFontSize(11);
    setFontBold(doc);
    const ptLines = doc.splitTextToSize(phaseTitle, CW - 6);
    doc.text(ptLines, M + 3, y + 5.4);
    // Dopo la barra serve spazio EXTRA: l'ascendente di OpenDyslexic fa salire la
    // prima riga sotto la barra, che altrimenti finirebbe DENTRO la barra colorata.
    y += 7.5 + (ptLines.length - 1) * mmLineHeight(11, factor) + 5.5;

    // Righe risposta — TRE stati distinti (etichetta allineata alla PRIMA riga):
    //  CORRETTA    ✔ verde + parola data            (senza la scritta "CORRETTA")
    //  INCORRETTA  ✘ rossa + PAROLA SBAGLIATA data  (senza la scritta "INCORRETTA")
    //  NON DATA    — grigia, nessuna X, con scritta "NON DATA" (slot vuoto)
    for (const ans of group.answers) {
      const given = typeof ans.selectedKeyword === "string" && ans.selectedKeyword.trim().length > 0;
      const correct = given && ans.isCorrect;
      const wrong = given && !ans.isCorrect;
      const nonData = !given;
      const weight = ans.slotId.startsWith("f5") ? "0,25" : "0,50";

      const symColor: RGB = correct ? GREEN_DARK : wrong ? RED : GREY;
      const labelColor: RGB = correct ? GREEN : wrong ? RED : GREY;
      const rowY = y; // baseline della prima riga della risposta

      // A destra: solo "peso" (e "NON DATA" per gli slot vuoti). Le scritte
      // CORRETTA/INCORRETTA sono tolte: bastano ✔ verde e ✘ rossa accanto
      // alla parola data (significato spiegato nella legenda in fondo).
      doc.setFontSize(8.5);
      setFontNormal(doc);
      const rightText = nonData ? `NON DATA · peso ${weight}` : `peso ${weight}`;
      const rightWidth = doc.getTextWidth(rightText);
      doc.setTextColor(nonData ? GREY[0] : INK[0], nonData ? GREY[1] : INK[1], nonData ? GREY[2] : INK[2]);
      doc.text(rightText, PAGE_W - M, rowY, { align: "right" });

      const selX = M + SYMBOL_W + MARK_GAP_BEFORE_TEXT;
      const selMaxW = CW - SYMBOL_W - MARK_GAP_BEFORE_TEXT - rightWidth - 8;

      if (given) {
        // Simbolo vettoriale + parola data dallo studente
        setFontBold(doc);
        doc.setFontSize(12);
        doc.setTextColor(labelColor[0], labelColor[1], labelColor[2]);
        const selLines = doc.splitTextToSize(ans.selectedKeyword as string, selMaxW);
        // simbolo sulla stessa baseline della prima riga
        drawSymbol(doc, correct ? "check" : "cross", symColor, M, rowY + 0.2);
        // disegna riga per riga (interlinea controllata = lh14)
        y = rowY;
        for (const line of selLines) {
          doc.text(line, selX, y);
          y += lh14;
        }
      } else {
        // NON DATA: trattino grigio al posto della parola (nessuna X rossa)
        setFontBold(doc);
        doc.setFontSize(12);
        doc.setTextColor(GREY[0], GREY[1], GREY[2]);
        doc.text("—", selX, rowY);
        y = rowY + lh14;
      }

      if (!correct) {
        // Seconda riga: risposta esatta (in verde, senza simbolo) — utile sia per
        // la risposta sbagliata sia per lo slot non compilato
        setFontNormal(doc);
        doc.setTextColor(GREEN[0], GREEN[1], GREEN[2]);
        doc.setFontSize(11);
        const exactLines = doc.splitTextToSize(`Risposta esatta: ${ans.correctAnswer}`, CW - SYMBOL_W - 6);
        y = drawWrapped(doc, exactLines, M + SYMBOL_W, y, mmLineHeight(11, factor)) + 0.6;
      } else {
        y += 0.6;
      }
    }
    y += 2.2;
  }

  // ── (Riepilogo CORRETTE/INCORRETTE rimosso su richiesta: bastano i segni
  //     colorati accanto a ogni risposta — niente scritta ridondante)
  y += 2.2;

  // ── Legenda simboli (il significato NON dipende dal solo colore)
  setFontNormal(doc);
  doc.setTextColor(INK[0], INK[1], INK[2]);
  doc.setFontSize(10);
  const legY = y;
  drawSymbol(doc, "check", GREEN_DARK, M, legY + 2.6);
  doc.text("risposta corretta", M + SYMBOL_W + 1.4, legY + 2.6);
  const crossX = M + SYMBOL_W + 1.4 + doc.getTextWidth("risposta corretta") + 10;
  drawSymbol(doc, "cross", RED, crossX, legY + 2.6);
  doc.text("risposta errata", crossX + SYMBOL_W + 1.4, legY + 2.6);
  const dashX = crossX + SYMBOL_W + 1.4 + doc.getTextWidth("risposta errata") + 10;
  doc.setDrawColor(GREY[0], GREY[1], GREY[2]);
  doc.setLineWidth(1.1);
  doc.line(dashX + 0.3, legY + 1.7, dashX + SYMBOL_W - 0.3, legY + 1.7);
  doc.text("risposta non data", dashX + SYMBOL_W + 1.4, legY + 2.6);
  y = legY + mmLineHeight(10, factor) + 2;

  return y;
}

export async function buildReportPdfDoc(data: ReportData, fontsBase = ""): Promise<jsPDF> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  await ensureFonts(doc, fontsBase);

  const bottomLimit = PAGE_H - M_BOT;

  // Preflight reale: disegna la pagina su un documento di prova e tiene il
  // fattore di interlinea solo se l'ultima riga resta dentro il margine
  // inferiore. Garanzia: ogni studente sta su UNA facciata.
  async function pickFactor(student: ReportStudent): Promise<number> {
    for (const f of FACTORS) {
      const probe = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      await ensureFonts(probe, fontsBase);
      probe.setLineHeightFactor(f);
      const endY = drawReportPage(probe, data, student, f);
      if (endY <= bottomLimit) return f;
    }
    return FACTORS[FACTORS.length - 1];
  }

  let factor = FACTORS[0];
  for (const student of data.students) {
    const needed = await pickFactor(student);
    if (needed < factor) factor = needed;
  }
  doc.setLineHeightFactor(factor);

  data.students.forEach((student, si) => {
    if (si > 0) doc.addPage();
    drawReportPage(doc, data, student, factor);
  });

  return doc;
}

export async function generateReportPdf(data: ReportData): Promise<void> {
  const doc = await buildReportPdfDoc(data);
  const safeName = data.className.replace(/[^a-zA-Z0-9]/g, "_");
  doc.save(`Report_Schema_${safeName}_${data.classCode}.pdf`);
}

// =============================================================================
// BLANK PDF (foglio esercizio in bianco) — accessibile
// =============================================================================

const BLANK_GRID = [
  { phase: "FASE 1/2", desc: ["LECTURA Y", "LOCALIZACIÓN"], col3: [""], col4: [""] },
  { phase: "FASE 3",   desc: ["TEMA"],                     col3: [""], col4: [""] },
  { phase: "FASE 4",   desc: ["ESTRUCTURA"],               col3: [""], col4: [""] },
  { phase: "FASE 5",   desc: ["ANÁLISIS DE", "LA FORMA"], col3: ["", ""], col4: ["", ""] },
  { phase: "FASE 6/7", desc: ["REDACCIÓN Y", "CONCLUSIÓN"], col3: [""], col4: [""] },
];

const BLANK_KEYWORDS =
  "ROMANTICISMO · RIMAS · POESÍA · PERSONA AMADA · ENDECASÍLABOS · HEPTASÍLABO · DIÁLOGO · ANÁFORA · APÓSTROFE · IDENTIFICACIÓN · RELACIÓN · SENCILLEZ";

function drawHeaderFields(doc: jsPDF, y: number, data: BlankQuestionsData, factor: number): number {
  const lh = mmLineHeight(13, factor);
  // COGNOME · NOME
  doc.setFontSize(13);
  setFontBold(doc);
  doc.setTextColor(BLUE[0], BLUE[1], BLUE[2]);
  const campi = [
    { label: "COGNOME", x: M, fine: M + 80 },
    { label: "NOME", x: M + 88, fine: PAGE_W - M },
  ];
  campi.forEach((c) => {
    doc.text(c.label + ":", c.x, y);
    doc.setDrawColor(GREY[0], GREY[1], GREY[2]);
    doc.line(c.x + doc.getTextWidth(c.label + ":") + 2, y + 1.2, c.fine, y + 1.2);
  });
  y += lh + 2.2;

  // CLASSE (compilata)
  doc.setFontSize(13);
  setFontBold(doc);
  doc.setTextColor(BLUE[0], BLUE[1], BLUE[2]);
  doc.text("CLASSE:", M, y);
  doc.setDrawColor(GREY[0], GREY[1], GREY[2]);
  const clsLineX = M + doc.getTextWidth("CLASSE:") + 2;
  doc.line(clsLineX, y + 1.2, M + 100, y + 1.2);
  if (data.className) {
    setFontNormal(doc);
    doc.setTextColor(60);
    doc.text(data.className, clsLineX + 1, y);
  }
  y += lh + 1.5;

  // DATA (lasciata in bianco per lo studente)
  doc.setFontSize(13);
  setFontBold(doc);
  doc.setTextColor(BLUE[0], BLUE[1], BLUE[2]);
  doc.text("DATA:", M, y);
  doc.setDrawColor(GREY[0], GREY[1], GREY[2]);
  doc.line(M + doc.getTextWidth("DATA:") + 2, y + 1.2, M + 65, y + 1.2);
  y += lh + 1.5;
  return y;
}

function drawSchemaGrid(
  doc: jsPDF,
  startY: number,
  gridData: { phase: string; desc: string[]; col3: string[]; col4: string[] }[],
  options: { fillAnswers?: boolean; factor: number }
): number {
  const factor = options.factor;
  const lhSmall = mmLineHeight(9.5, factor);
  let y = startY;

  const colW = [CW * 0.18, CW * 0.27, CW * 0.275, CW * 0.275];
  const headerH = 9;
  const rowH = 17;        // altezza per riga a slot singolo
  const rowHMulti = 15;   // altezza per sotto-slot (FASE 5)
  const borderColor: RGB = [27, 58, 92];
  const slotGap = 2;

  const headers = ["FASE", "DESCRIZIONE", "PAROLA CHIAVE", "PAROLA CHIAVE"];
  const headerColors: RGB[] = [[0, 150, 199], [26, 26, 26], [45, 106, 79], [194, 37, 92]];

  // Header tabella
  doc.setFillColor(240, 244, 255);
  let cx = M;
  headers.forEach((h, hi) => {
    doc.setDrawColor(...borderColor);
    doc.rect(cx, y, colW[hi], headerH, "FD");
    doc.setFontSize(10);
    setFontBold(doc);
    doc.setTextColor(...headerColors[hi]);
    const hLines = doc.splitTextToSize(h, colW[hi] - 2);
    doc.text(hLines, cx + colW[hi] / 2, y + headerH / 2 + (hLines.length - 1) * 1.5, { align: "center" });
    cx += colW[hi];
  });
  y += headerH + 1;

  // Righe
  gridData.forEach((row) => {
    const maxSlots = Math.max(row.col3.length, row.col4.length);
    const hasMulti = maxSlots > 1;
    const cellH = hasMulti ? rowHMulti * maxSlots + slotGap * (maxSlots - 1) + 4 : rowH;

    if (y + cellH + 18 > PAGE_H - M_BOT) { doc.addPage(); y = M_TOP + 5; }

    // Col 1: fase
    cx = M;
    doc.setDrawColor(...borderColor);
    doc.setFillColor(250, 252, 255);
    doc.rect(cx, y, colW[0], cellH, "FD");
    doc.setFontSize(10.5);
    setFontBold(doc);
    doc.setTextColor(0, 150, 199);
    const phaseLines = doc.splitTextToSize(row.phase, colW[0] - 2);
    doc.text(phaseLines, cx + colW[0] / 2, y + (cellH - phaseLines.length * lhSmall) / 2 + 3, { align: "center" });
    cx += colW[0];

    // Col 2: descrizione
    doc.setDrawColor(...borderColor);
    doc.rect(cx, y, colW[1], cellH, "FD");
    doc.setFontSize(10);
    setFontBold(doc);
    doc.setTextColor(26, 26, 26);
    let descY = y + (cellH - row.desc.length * mmLineHeight(10, factor)) / 2 + 3;
    row.desc.forEach((line) => {
      doc.text(line, cx + colW[1] / 2, descY, { align: "center" });
      descY += mmLineHeight(10, factor);
    });
    cx += colW[1];

    // Col 3: slot (vuoti o con risposta esatta)
    doc.setDrawColor(...borderColor);
    doc.rect(cx, y, colW[2], cellH, "FD");
    const numSlots3 = row.col3.length;
    const slotH3 = hasMulti ? rowHMulti : cellH - 4;
    let slotY3 = y + (hasMulti ? 2 : 2);
    for (let si = 0; si < numSlots3; si++) {
      const sy = slotY3;
      const sh = slotH3;
      doc.setDrawColor(27, 58, 92);
      doc.setFillColor(248, 250, 255);
      doc.roundedRect(cx + 2, sy, colW[2] - 4, sh, 1.5, 1.5, "FD");
      if (options.fillAnswers && row.col3[si]) {
        doc.setFontSize(10);
        setFontNormal(doc);
        doc.setTextColor(45, 106, 79);
        const kw = row.col3[si].charAt(0).toUpperCase() + row.col3[si].slice(1);
        const kwLines = doc.splitTextToSize(kw, colW[2] - 8);
        doc.text(kwLines, cx + colW[2] / 2, sy + (sh - kwLines.length * lhSmall) / 2 + 3, { align: "center" });
      }
      slotY3 += sh + slotGap;
    }
    cx += colW[2];

    // Col 4
    doc.setDrawColor(...borderColor);
    doc.rect(cx, y, colW[3], cellH, "FD");
    const numSlots4 = row.col4.length;
    const slotH4 = hasMulti ? rowHMulti : cellH - 4;
    let slotY4 = y + (hasMulti ? 2 : 2);
    for (let si = 0; si < numSlots4; si++) {
      const sy = slotY4;
      const sh = slotH4;
      doc.setDrawColor(27, 58, 92);
      doc.setFillColor(248, 250, 255);
      doc.roundedRect(cx + 2, sy, colW[3] - 4, sh, 1.5, 1.5, "FD");
      if (options.fillAnswers && row.col4[si]) {
        doc.setFontSize(10);
        setFontNormal(doc);
        doc.setTextColor(194, 37, 92);
        const kw = row.col4[si].charAt(0).toUpperCase() + row.col4[si].slice(1);
        const kwLines = doc.splitTextToSize(kw, colW[3] - 8);
        doc.text(kwLines, cx + colW[3] / 2, sy + (sh - kwLines.length * lhSmall) / 2 + 3, { align: "center" });
      }
      slotY4 += sh + slotGap;
    }

    y += cellH + 2;
  });

  return y;
}

function drawColorLegend(doc: jsPDF, startY: number): number {
  let y = startY + 3;
  if (y > PAGE_H - 40) { doc.addPage(); y = M_TOP + 5; }
  const legendItems = [
    { color: [0, 150, 199], label: "FASE" },
    { color: [26, 26, 26], label: "DESCRIZIONE" },
    { color: [45, 106, 79], label: "PAROLA CHIAVE" },
    { color: [194, 37, 92], label: "PAROLA CHIAVE" },
  ];
  doc.setFontSize(9);
  setFontNormal(doc);
  doc.setTextColor(122, 117, 110);
  const legWidths = legendItems.map((li) => doc.getTextWidth(li.label) + 8);
  const totalLegWidth = legWidths.reduce((s, w) => s + w, 0);
  let legX = (PAGE_W - totalLegWidth) / 2;
  legendItems.forEach((li, i) => {
    doc.setFillColor(li.color[0], li.color[1], li.color[2]);
    doc.rect(legX, y, 3.5, 3.5, "F");
    doc.text(li.label, legX + 5, y + 3);
    legX += legWidths[i];
  });
  return y + 9;
}

function drawScoreLegendBox(doc: jsPDF, startY: number): number {
  let y = startY + 2;
  if (y > PAGE_H - 30) { doc.addPage(); y = M_TOP + 5; }
  const legendaTesto =
    "PUNTEGGIO — Solamente nella FASE 5 = 0,25 pt per risposta corretta · Tutte le altre risposte = 0,5 pt · Punteggio massimo = 10/10";
  const legendaLines = doc.splitTextToSize(legendaTesto, CW - 6);
  const legendaH = 12 + legendaLines.length * mmLineHeight(9, 1.5);
  doc.setFillColor(245, 240, 235);
  doc.setDrawColor(180, 160, 140);
  doc.roundedRect(M, y, CW, legendaH, 2, 2, "FD");
  doc.setFontSize(9);
  setFontNormal(doc);
  doc.setTextColor(100, 50, 60);
  doc.text(legendaLines, M + CW / 2, y + 7, { align: "center" });
  return y + legendaH + 4;
}

function drawBlankPage(doc: jsPDF, data: BlankQuestionsData, factor: number): number {
  const lh15 = mmLineHeight(15, factor);
  let y = M_TOP + lh15 * 0.72;

  // Titolo
  doc.setFontSize(15);
  setFontBold(doc);
  doc.setTextColor(BLUE[0], BLUE[1], BLUE[2]);
  const titleLines = doc.splitTextToSize("SCHEMA INTERATTIVO — RIMA XXI (BÉCQUER)", CW);
  doc.text(titleLines, PAGE_W / 2, y, { align: "center" });
  y += titleLines.length * lh15 + 2.6;

  // Campi COGNOME/NOME/CLASSE/DATA
  y = drawHeaderFields(doc, y, data, factor);
  y += 1.5;

  // Parole chiave (box)
  doc.setFontSize(13);
  setFontBold(doc);
  doc.setTextColor(100, 30, 40);
  doc.text("PAROLE CHIAVE:", M, y);
  y += 5.5;
  const kwsLines = doc.splitTextToSize(BLANK_KEYWORDS, CW - 8);
  const lineH = mmLineHeight(12, factor);
  const boxH = 8 + kwsLines.length * lineH;
  doc.setFillColor(245, 240, 235);
  doc.setDrawColor(180, 160, 140);
  doc.roundedRect(M, y, CW, boxH, 3, 3, "FD");
  doc.setFontSize(12);
  setFontNormal(doc);
  doc.setTextColor(60);
  doc.text(kwsLines, M + CW / 2, y + 7, { align: "center" });
  y += boxH + 4;

  // Griglia
  y = drawSchemaGrid(doc, y, BLANK_GRID, { fillAnswers: false, factor });
  y = drawColorLegend(doc, y);
  y = drawScoreLegendBox(doc, y);
  return y;
}

export async function buildBlankQuestionsPdfDoc(
  data: BlankQuestionsData,
  fontsBase = ""
): Promise<jsPDF> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  await ensureFonts(doc, fontsBase);

  const bottomLimit = PAGE_H - M_BOT;
  let factor = FACTORS[0];
  for (const f of FACTORS) {
    const probe = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    await ensureFonts(probe, fontsBase);
    probe.setLineHeightFactor(f);
    const endY = drawBlankPage(probe, data, f);
    if (endY <= bottomLimit) {
      factor = f;
      break;
    }
  }
  doc.setLineHeightFactor(factor);
  drawBlankPage(doc, data, factor);
  return doc;
}

export async function generateBlankQuestionsPdf(data: BlankQuestionsData): Promise<void> {
  const doc = await buildBlankQuestionsPdfDoc(data);
  const safeName = data.className.replace(/[^a-zA-Z0-9]/g, "_");
  doc.save(`Schema_Esercizio_${safeName}.pdf`);
}

// =============================================================================
// COMPLETED SCHEMA PDF (tutte le risposte corrette) — accessibile
// =============================================================================

const COMPLETED_GRID = [
  { phase: "FASE 1/2", desc: ["LECTURA Y", "LOCALIZACIÓN"], col3: ["Romanticismo"], col4: ["Rimas"] },
  { phase: "FASE 3",   desc: ["TEMA"],                     col3: ["poesía"],        col4: ["persona amada"] },
  { phase: "FASE 4",   desc: ["ESTRUCTURA"],               col3: ["endecasílabos"], col4: ["heptasílabo"] },
  { phase: "FASE 5",   desc: ["ANÁLISIS DE", "LA FORMA"], col3: ["diálogo", "apóstrofe"], col4: ["anáfora", "identificación"] },
  { phase: "FASE 6/7", desc: ["REDACCIÓN Y", "CONCLUSIÓN"], col3: ["relación"],      col4: ["sencillez"] },
];

function drawCompletedPage(
  doc: jsPDF,
  data: CompletedSchemaData,
  factor: number
): number {
  const lh15 = mmLineHeight(15, factor);
  let y = M_TOP + lh15 * 0.72;

  // Titolo
  doc.setFontSize(15);
  setFontBold(doc);
  doc.setTextColor(BLUE[0], BLUE[1], BLUE[2]);
  const titleLines = doc.splitTextToSize("SCHEMA INTERATTIVO — RIMA XXI (BÉCQUER)", CW);
  doc.text(titleLines, PAGE_W / 2, y, { align: "center" });
  y += titleLines.length * lh15 + 1.8;

  // Sottotitolo metodo
  doc.setFontSize(13);
  setFontNormal(doc);
  doc.setTextColor(100, 30, 40);
  const subLines = doc.splitTextToSize("Metodo di Fernando Lázaro Carreter", CW);
  doc.text(subLines, PAGE_W / 2, y, { align: "center" });
  y += subLines.length * mmLineHeight(13, factor) + 2.2;

  // Classe / codice / data
  doc.setFontSize(12);
  setFontBold(doc);
  doc.setTextColor(INK[0], INK[1], INK[2]);
  doc.text(`Classe: ${data.className}`, M, y);
  y += 5.5;
  doc.setFontSize(11);
  setFontNormal(doc);
  doc.setTextColor(80);
  doc.text(`Codice: #${data.classCode}`, M, y);
  y += 5;
  if (data.classDate) {
    doc.text(`Data: ${fmtDate(data.classDate)}`, M, y);
    y += 5;
  }
  y += 2;

  // Titolo sezione
  doc.setFontSize(14);
  setFontBold(doc);
  doc.setTextColor(INK[0], INK[1], INK[2]);
  doc.text("SCHEMA COMPLETO", PAGE_W / 2, y, { align: "center" });
  y += 8;

  // Keyword bank
  const allKeywords = [
    "Romanticismo", "Rimas", "poesía", "persona amada",
    "endecasílabos", "heptasílabo", "diálogo", "anáfora",
    "apóstrofe", "identificación", "relación", "sencillez",
  ];
  const kwsText = allKeywords.join(" · ");
  doc.setFontSize(12);
  setFontBold(doc);
  doc.setTextColor(100, 30, 40);
  doc.text("PAROLE CHIAVE:", M, y);
  y += 5;
  doc.setFontSize(11);
  setFontNormal(doc);
  doc.setTextColor(60);
  const kwsLines = doc.splitTextToSize(kwsText, CW - 6);
  const kwsBoxH = 8 + kwsLines.length * mmLineHeight(11, factor);
  doc.setFillColor(245, 240, 235);
  doc.setDrawColor(180, 160, 140);
  doc.roundedRect(M, y, CW, kwsBoxH, 2, 2, "FD");
  doc.text(kwsLines, PAGE_W / 2, y + 6, { align: "center" });
  y += kwsBoxH + 5;

  // Griglia completa
  y = drawSchemaGrid(doc, y, COMPLETED_GRID, { fillAnswers: true, factor });
  y = drawColorLegend(doc, y);
  y = drawScoreLegendBox(doc, y);
  return y;
}

export async function buildCompletedSchemaPdfDoc(
  data: CompletedSchemaData,
  fontsBase = ""
): Promise<jsPDF> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  await ensureFonts(doc, fontsBase);

  const bottomLimit = PAGE_H - M_BOT;
  let factor = FACTORS[0];
  for (const f of FACTORS) {
    const probe = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    await ensureFonts(probe, fontsBase);
    probe.setLineHeightFactor(f);
    const endY = drawCompletedPage(probe, data, f);
    if (endY <= bottomLimit) {
      factor = f;
      break;
    }
  }
  doc.setLineHeightFactor(factor);
  drawCompletedPage(doc, data, factor);
  return doc;
}

export async function generateCompletedSchemaPdf(data: CompletedSchemaData): Promise<void> {
  const doc = await buildCompletedSchemaPdfDoc(data);
  const safeName = data.className.replace(/[^a-zA-Z0-9]/g, "_");
  doc.save(`Schema_Completo_${safeName}.pdf`);
}
