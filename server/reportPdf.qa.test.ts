import { describe, it, expect } from "vitest";
import { writeFileSync, mkdirSync } from "node:fs";
import { buildReportPdfDoc } from "../client/src/lib/reportPdf";
import { GRID_ROWS, GRID_SLOTS, SCHEMA_ROWS } from "./schema-data";

/**
 * QA visivo: genera un PDF di prova con i TRE stati di risposta
 * (✔ risposta esatta / ✘ sbagliata con la parola sbagliata / NON DATA) così
 * da verificare a colpo d'occhio la resa grafica del report. Attenzione:
 * nel PDF NON devono comparire le scritte CORRETTA / INCORRETTA.
 */
describe("Report PDF QA", () => {
  it("generates a sample PDF with correct/wrong/non-data states", async () => {
    const phaseLabel = (slotId: string): string => {
      const row = GRID_ROWS.find((r) =>
        GRID_SLOTS.some((s) => s.slotId === slotId && s.rowId === r.id)
      );
      return row ? `${row.phaseLabel} — ${row.description.replace(" / ", " ")}` : "FASE";
    };

    // Studente 1: 3 corrette, 5 sbagliate (con la parola data), 4 NON DATE
    const answers1 = GRID_SLOTS.map((slot, i) => {
      if (i < 3) {
        return {
          slotId: slot.slotId,
          selectedKeyword: slot.correctAnswer,
          isCorrect: true,
          correctAnswer: slot.correctAnswer,
          phaseLabel: phaseLabel(slot.slotId),
        };
      }
      if (i < 8) {
        // Risposta sbagliata: lo studente ha messo UNA parola diversa
        const wrong = ["Rimas", "poesía", "endecasílabos", "diálogo", "relación"][i - 3];
        return {
          slotId: slot.slotId,
          selectedKeyword: wrong,
          isCorrect: false,
          correctAnswer: slot.correctAnswer,
          phaseLabel: phaseLabel(slot.slotId),
        };
      }
      // NON DATA
      return {
        slotId: slot.slotId,
        selectedKeyword: null,
        isCorrect: false,
        correctAnswer: slot.correctAnswer,
        phaseLabel: phaseLabel(slot.slotId),
      };
    });

    // Studente 2: tutto NON DATE (simula lo studente mai arrivato a INVIA)
    const answers2 = GRID_SLOTS.map((slot) => ({
      slotId: slot.slotId,
      selectedKeyword: null,
      isCorrect: false,
      correctAnswer: slot.correctAnswer,
      phaseLabel: phaseLabel(slot.slotId),
    }));

    const data: any = {
      className: "QA Test",
      schoolYear: "2026/27",
      classDate: "2026-09-07",
      classCode: "1234",
      schemaRows: SCHEMA_ROWS,
      students: [
        {
          name: "Studente Misto",
          score: 3,
          totalSlots: 12,
          percentage: 25,
          grade: 2.5,
          answers: answers1,
        },
        {
          name: "Studente Non Date",
          score: 0,
          totalSlots: 12,
          percentage: 0,
          grade: 0,
          answers: answers2,
        },
      ],
    };

    const doc = await buildReportPdfDoc(data);
    const buffer = Buffer.from(doc.output("arraybuffer"));
    mkdirSync("/tmp/qa", { recursive: true });
    writeFileSync("/tmp/qa/report-qa.pdf", buffer);
    expect(buffer.length).toBeGreaterThan(1000);
  });
});
