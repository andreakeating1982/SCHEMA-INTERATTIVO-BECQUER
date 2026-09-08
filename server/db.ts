/**
 * Database Client & Query Helpers
 */
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../drizzle/schema";

// =============================================================================
// DATABASE CLIENT
// =============================================================================

const client = process.env.DATABASE_URL ? postgres(process.env.DATABASE_URL) : null;
export const db = client ? drizzle(client, { schema }) : null;

export function getDb() {
  return db;
}

export * from "../drizzle/schema";

// =============================================================================
// IN-MEMORY STATE (non-persisted, resets on server restart)
// =============================================================================
/** Stores per-class show-solution flag (teacher controlled) */
export const showSolutionStore = new Map<string, number>();

// =============================================================================
// QUERY HELPERS
// =============================================================================

import { eq, and, desc } from "drizzle-orm";
import { nanoid } from "nanoid";

// --- Classes ---

export async function createClass(data: {
  name: string;
  year?: string;
  date?: string;
  studentCount?: number;
  password?: string;
}) {
  if (!db) throw new Error("Database not available");
  const code = Math.floor(1000 + Math.random() * 9000).toString();
  const [cls] = await db.insert(schema.classes).values({
    id: nanoid(),
    name: data.name,
    year: data.year || "",
    date: data.date || new Date().toISOString().split("T")[0],
    studentCount: data.studentCount ?? 0,
    password: data.password || null,
    code,
    isActive: true,
  }).returning();
  return cls;
}

export async function getClassByCode(code: string) {
  if (!db) return null;
  const [cls] = await db.select().from(schema.classes).where(
    and(eq(schema.classes.code, code), eq(schema.classes.isActive, true))
  );
  return cls ?? null;
}

export async function getClassById(id: string) {
  if (!db) return null;
  const [cls] = await db.select().from(schema.classes).where(eq(schema.classes.id, id));
  if (!cls) return null;
  // Merge in-memory showSolution state
  return { ...cls, showSolution: showSolutionStore.get(id) ?? 0 };
}

export async function startSession(classId: string) {
  if (!db) throw new Error("Database not available");
  const [cls] = await db.update(schema.classes).set({ sessionStarted: true }).where(eq(schema.classes.id, classId)).returning();
  return cls;
}

export async function endSession(id: string) {
  if (!db) throw new Error("Database not available");
  const [cls] = await db.update(schema.classes).set({ sessionStarted: false }).where(eq(schema.classes.id, id)).returning();
  return cls;
}

export async function closeClass(id: string) {
  if (!db) throw new Error("Database not available");
  const [cls] = await db.update(schema.classes).set({ isActive: false }).where(eq(schema.classes.id, id)).returning();
  return cls;
}

export async function reopenClass(code: string, password: string) {
  if (!db) throw new Error("Database not available");
  const [cls] = await db.select().from(schema.classes).where(eq(schema.classes.code, code));
  if (!cls) throw new Error("Classe non trovata.");
  if (cls.password !== password) throw new Error("Password errata.");
  const [updated] = await db.update(schema.classes).set({
    isActive: true,
    sessionStarted: false,
  }).where(eq(schema.classes.id, cls.id)).returning();
  return updated;
}

export async function resetClass(id: string) {
  if (!db) throw new Error("Database not available");
  await db.delete(schema.answers).where(eq(schema.answers.classId, id));
  await db.delete(schema.students).where(eq(schema.students.classId, id));
  const newPassword = Math.floor(1000 + Math.random() * 9000).toString();
  const [cls] = await db.update(schema.classes).set({
    isActive: true,
    sessionStarted: false,
    password: newPassword,
    studentCount: 0,
  }).where(eq(schema.classes.id, id)).returning();
  showSolutionStore.set(id, 0);
  return cls;
}

export async function deleteClass(id: string) {
  if (!db) throw new Error("Database not available");
  const [cls] = await db.delete(schema.classes).where(eq(schema.classes.id, id)).returning();
  return cls;
}

export async function getAllClasses() {
  if (!db) return [];
  return db.select().from(schema.classes).orderBy(desc(schema.classes.createdAt));
}

export async function getStudentsByClass(classId: string) {
  if (!db) return [];
  const students = await db.select().from(schema.students).where(eq(schema.students.classId, classId));
  /* Add weighted score for each student */
  const allAnswers = await db.select().from(schema.answers).where(eq(schema.answers.classId, classId));
  const { GRID_SLOTS, computeCorrectSlotIds } = await import("./schema-data");
  const correctMap: Record<string, string> = {};
  for (const slot of GRID_SLOTS) {
    correctMap[slot.slotId] = slot.correctAnswer;
  }
  return students.map(st => {
    const studentAnswers = allAnswers.filter(a => a.studentId === st.id);
    const correctIds = computeCorrectSlotIds(studentAnswers);
    let ws = 0;
    let sc = 0;
    for (const slotId of Object.keys(correctMap)) {
      if (correctIds.has(slotId)) {
        sc++;
        ws += slotId.startsWith("f5") ? 0.25 : 0.5;
      }
    }
    return { ...st, weightedScore: Math.round((ws / 5.0) * 100), weightedGrade: Math.round((ws / 5.0) * 10 * 10) / 10 };
  });
}

export async function setShowSolution(classId: string, show: number) {
  showSolutionStore.set(classId, show);
  return { id: classId, showSolution: show };
}

export async function getActiveClasses() {
  if (!db) return [];
  return db.select().from(schema.classes).where(eq(schema.classes.isActive, true)).orderBy(desc(schema.classes.createdAt));
}

// --- Students ---

/**
 * Normalizza un nome per il matching: minuscole, niente accenti, spazi
 * multipli collassati. Così "Mario Rossi", "mario rossi", "Mario  Rossi" e
 * "MARIO ROSSI" vengono riconosciuti come lo stesso studente.
 */
function normalizeStudentName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export async function addStudent(data: { classId: string; name: string }) {
  if (!db) throw new Error("Database not available");

  // Nome canonico da salvare (spazi collassati, mantenendo maiuscole e accenti)
  const canonicalName = data.name.trim().replace(/\s+/g, " ");
  const normalized = normalizeStudentName(canonicalName);

  const classmates = await db.select()
    .from(schema.students)
    .where(eq(schema.students.classId, data.classId));
  const existing = classmates.find((s) => normalizeStudentName(s.name) === normalized);

  if (existing) return existing;

  const [student] = await db.insert(schema.students).values({
    id: nanoid(),
    classId: data.classId,
    name: canonicalName,
    score: 0,
    completed: false,
  }).returning();
  return student;
}

export async function getStudentById(id: string) {
  if (!db) return null;
  const [student] = await db.select().from(schema.students).where(eq(schema.students.id, id));
  return student ?? null;
}

export async function removeStudent(studentId: string) {
  if (!db) throw new Error("Database not available");
  await db.delete(schema.answers).where(eq(schema.answers.studentId, studentId));
  const [student] = await db.delete(schema.students).where(eq(schema.students.id, studentId)).returning();
  return student;
}

export async function updateStudentScore(studentId: string, score: number) {
  if (!db) throw new Error("Database not available");
  const [student] = await db.update(schema.students).set({ score, completed: true }).where(eq(schema.students.id, studentId)).returning();
  return student;
}

// --- Answers ---

export async function saveAnswer(data: {
  studentId: string;
  classId: string;
  slotId: string;
  selectedKeyword: string;
  isCorrect: boolean;
}) {
  if (!db) throw new Error("Database not available");
  const [existing] = await db.select()
    .from(schema.answers)
    .where(and(
      eq(schema.answers.studentId, data.studentId),
      eq(schema.answers.slotId, data.slotId)
    ));
  if (existing) {
    const [updated] = await db.update(schema.answers)
      .set({
        selectedKeyword: data.selectedKeyword,
        isCorrect: data.isCorrect,
        createdAt: new Date(),
      })
      .where(eq(schema.answers.id, existing.id))
      .returning();
    return updated;
  }
  const [answer] = await db.insert(schema.answers).values({
    id: nanoid(),
    ...data,
  }).returning();
  return answer;
}

export async function getStudentAnswers(studentId: string) {
  if (!db) return [];
  return db.select().from(schema.answers).where(eq(schema.answers.studentId, studentId));
}

export async function getStudentSlotAnswers(studentId: string) {
  if (!db) return [];
  return db.select().from(schema.answers).where(eq(schema.answers.studentId, studentId));
}

// --- Stats ---

export async function getClassStats(classId: string) {
  if (!db) return null;
  const studentsList = await getStudentsByClass(classId);
  const allAnswers = await db.select().from(schema.answers).where(eq(schema.answers.classId, classId));
  const totalStudents = studentsList.length;
  const completedStudents = studentsList.filter(s => s.completed).length;

  /* Calculate weighted average grade across completed students */
  const { GRID_SLOTS, GRID_ROWS, computeCorrectSlotIds } = await import("./schema-data");
  const correctMap: Record<string, string> = {};
  const slotPhaseMap: Record<string, string> = {};
  for (const slot of GRID_SLOTS) {
    correctMap[slot.slotId] = slot.correctAnswer;
    const row = GRID_ROWS.find(r => r.id === slot.rowId);
    slotPhaseMap[slot.slotId] = row ? `${row.phaseLabel} — ${row.description.replace(" / ", " ")}` : "";
  }
  const MAX_WEIGHT = 5.0;
  let weightedSum = 0;
  let weightedCount = 0;
  for (const student of studentsList.filter(s => s.completed)) {
    const studentAnswers = allAnswers.filter(a => a.studentId === student.id);
    const correctIds = computeCorrectSlotIds(studentAnswers);
    let ws = 0;
    for (const slotId of Object.keys(correctMap)) {
      if (correctIds.has(slotId)) {
        ws += slotId.startsWith("f5") ? 0.25 : 0.5;
      }
    }
    weightedSum += (ws / MAX_WEIGHT) * 100;
    weightedCount++;
  }
  const avgScore = weightedCount > 0 ? Math.round(weightedSum / weightedCount) : 0;

  // Ricalcola isCorrect con ordine libero per fase: i dati salvati in DB potrebbero
  // essere stati valutati slot-per-slot in passato. La dashboard mostra questi valori.
  const byStudent = new Map<string, typeof allAnswers>();
  for (const a of allAnswers) {
    const list = byStudent.get(a.studentId) || [];
    list.push(a);
    byStudent.set(a.studentId, list);
  }
  const correctKey = new Map<string, boolean>();
  for (const [studentId, list] of Array.from(byStudent.entries())) {
    const correctIds = computeCorrectSlotIds(list);
    for (const a of list) correctKey.set(`${studentId}::${a.slotId}`, correctIds.has(a.slotId));
  }
  const answers = allAnswers.map(a => ({ ...a, isCorrect: correctKey.get(`${a.studentId}::${a.slotId}`) ?? false }));

  return { totalStudents, completedStudents, avgScore, students: studentsList, answers };
}

// --- Report ---

import { SCHEMA_ROWS, ALL_KEYWORDS, TOTAL_SLOTS, GRID_SLOTS, GRID_ROWS, computeCorrectSlotIds } from "./schema-data";

export interface ReportSlotAnswer {
  slotId: string;
  selectedKeyword: string | null;
  isCorrect: boolean;
  correctAnswer: string;
  phaseLabel: string;
}

export interface ReportStudent {
  name: string;
  score: number;
  totalSlots: number;
  percentage: number;
  grade: number;
  weightedScore?: number;
  answers: ReportSlotAnswer[];
}

export interface ReportData {
  className: string;
  schoolYear: string;
  classDate: string;
  classCode: string;
  schemaRows: typeof SCHEMA_ROWS;
  students: ReportStudent[];
}

export async function getReportData(classId: string): Promise<ReportData> {
  if (!db) throw new Error("Database not available");
  const [cls] = await db.select().from(schema.classes).where(eq(schema.classes.id, classId));
  if (!cls) throw new Error("Class not found");

  const students = await db.select().from(schema.students).where(eq(schema.students.classId, classId));
  const answers = await db.select().from(schema.answers).where(eq(schema.answers.classId, classId));

  // Build slot→correctAnswer map
  const correctMap: Record<string, string> = {};
  const slotPhaseMap: Record<string, string> = {};
  for (const slot of GRID_SLOTS) {
    correctMap[slot.slotId] = slot.correctAnswer;
    const row = GRID_ROWS.find(r => r.id === slot.rowId);
    slotPhaseMap[slot.slotId] = row ? `${row.phaseLabel} — ${row.description.replace(" / ", " ")}` : "";
  }

  const studentsByName = new Map<string, Array<{ id: string; name: string }>>();
  for (const student of students) {
    const group = studentsByName.get(student.name) || [];
    group.push(student);
    studentsByName.set(student.name, group);
  }

  const studentReports: ReportStudent[] = Array.from(studentsByName.entries()).map(([name, records]) => {
    const allStudentIds = new Set(records.map(s => s.id));
    const studentAnswers = answers.filter(a => allStudentIds.has(a.studentId));
    const correctIds = computeCorrectSlotIds(studentAnswers);
    let correctCount = 0;

    const answerDetails: ReportSlotAnswer[] = Object.keys(correctMap).map(slotId => {
      const studentAns = studentAnswers.find(a => a.slotId === slotId);
      const selectedKeyword = studentAns?.selectedKeyword || null;
      const isCorrect = correctIds.has(slotId);
      if (isCorrect) correctCount++;
      return {
        slotId,
        selectedKeyword,
        isCorrect,
        correctAnswer: correctMap[slotId],
        phaseLabel: slotPhaseMap[slotId],
      };
    });

    /* Weighted grading: FASE5 slots = 0.25¢, other slots = 0.50¢, max = 5.0 → scale to 10 */
    const MAX_WEIGHT = 5.0; /* 8×0.5 + 4×0.25 */
    let weightedScore = 0;
    for (const ans of answerDetails) {
      if (ans.isCorrect) {
        const isFase5 = ans.slotId.startsWith("f5");
        weightedScore += isFase5 ? 0.25 : 0.5;
      }
    }
    const percentage = Math.round((weightedScore / MAX_WEIGHT) * 100);
    const grade = Math.round((weightedScore / MAX_WEIGHT) * 10 * 10) / 10;

    return { name, score: correctCount, totalSlots: TOTAL_SLOTS, percentage, grade, answers: answerDetails, weightedScore };
  });

  return {
    className: cls.name,
    schoolYear: cls.year,
    classDate: cls.date,
    classCode: cls.code,
    schemaRows: SCHEMA_ROWS,
    students: studentReports,
  };
}
