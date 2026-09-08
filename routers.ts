import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import {
  db,
  createClass,
  getClassByCode,
  getClassById,
  getActiveClasses,
  getAllClasses,
  deleteClass,
  addStudent,
  getStudentById,
  saveAnswer,
  updateStudentScore,
  getClassStats,
  closeClass,
  endSession,
  reopenClass,
  startSession,
  removeStudent,
  getReportData,
  getStudentsByClass,
  setShowSolution,
  resetClass,
} from "./db";
import { SCHEMA_ROWS, ALL_KEYWORDS, buildSchemaSlots, TOTAL_SLOTS, GRID_ROWS, GRID_SLOTS } from "./schema-data";

export const appRouter = router({
  system: systemRouter,

  // ==========================================================================
  // CLASS SESSIONS
  // ==========================================================================

  classes: router({
    /** Create a new class session */
    create: publicProcedure
      .input(z.object({
        name: z.string().min(1).max(50),
        year: z.string().max(20).optional(),
        date: z.string().optional(),
        studentCount: z.number().int().min(0).max(60).optional().default(0),
        password: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return createClass(input);
      }),

    /** Join a class by code */
    join: publicProcedure
      .input(z.object({
        code: z.string().length(4),
        studentName: z.string().min(1).max(50),
      }))
      .mutation(async ({ input }) => {
        const cls = await getClassByCode(input.code);
        if (!cls) throw new Error("Classe non trovata. Il codice non è valido.");
        const student = await addStudent({ classId: cls.id, name: input.studentName });
        return { class: cls, student };
      }),

    /** Get class info by code */
    getByCode: publicProcedure
      .input(z.object({ code: z.string().length(4) }))
      .query(async ({ input }) => {
        return getClassByCode(input.code);
      }),

    /** List all active classes */
    listActive: publicProcedure.query(async () => {
      return getActiveClasses();
    }),

    /** Get class by ID */
    getById: publicProcedure
      .input(z.object({ id: z.string() }))
      .query(async ({ input }) => {
        return getClassById(input.id);
      }),

    /** Get class report data */
    report: publicProcedure
      .input(z.object({ id: z.string() }))
      .query(async ({ input }) => {
        return getReportData(input.id);
      }),

    /** Get class stats */
    stats: publicProcedure
      .input(z.object({ id: z.string() }))
      .query(async ({ input }) => {
        return getClassStats(input.id);
      }),

    /** Reopen a closed class by code + password */
    reopen: publicProcedure
      .input(z.object({ code: z.string().length(4), password: z.string() }))
      .mutation(async ({ input }) => {
        return reopenClass(input.code, input.password);
      }),

    /** End the current session */
    endSession: publicProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ input }) => {
        return endSession(input.id);
      }),

    /** Close (deactivate) a class session */
    close: publicProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ input }) => {
        return closeClass(input.id);
      }),

    /** List all classes */
    listAll: publicProcedure.query(async () => {
      return getAllClasses();
    }),

    /** Start the schema session */
    startSession: publicProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ input }) => {
        return startSession(input.id);
      }),

    /** Remove a student from the session */
    removeStudent: publicProcedure
      .input(z.object({ studentId: z.string() }))
      .mutation(async ({ input }) => {
        return removeStudent(input.studentId);
      }),

    /** Reset a closed class to active state with fresh session */
    reset: publicProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ input }) => {
        return resetClass(input.id);
      }),

    /** Set showSolution flag (0/1) */
    setShowSolution: publicProcedure
      .input(z.object({ id: z.string(), show: z.number().int().min(0).max(1) }))
      .mutation(async ({ input }) => {
        return setShowSolution(input.id, input.show);
      }),

    /** Get students for a class */
    getStudents: publicProcedure
      .input(z.object({ id: z.string() }))
      .query(async ({ input }) => {
        return getStudentsByClass(input.id);
      }),

    /** Get report data for class */
    getReport: publicProcedure
      .input(z.object({ id: z.string() }))
      .query(async ({ input }) => {
        return getReportData(input.id);
      }),

    /** Delete a class permanently */
    delete: publicProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ input }) => {
        return deleteClass(input.id);
      }),


  }),

  // ==========================================================================
  // SCHEMA DATA
  // ==========================================================================

  schema: router({
    /** Get the schema rows (structure without answers) */
    rows: publicProcedure.query(() => {
      return SCHEMA_ROWS;
    }),

    /** Get grid rows (5×4 table structure) */
    gridRows: publicProcedure.query(() => {
      return GRID_ROWS;
    }),

    /** Get grid slots (flat list of all 12 slots) */
    gridSlots: publicProcedure.query(() => {
      return GRID_SLOTS;
    }),

    /** Get all keywords */
    keywords: publicProcedure.query(() => {
      return ALL_KEYWORDS;
    }),

    /** Get the total slot count */
    totalSlots: publicProcedure.query(() => {
      return TOTAL_SLOTS;
    }),

    /** Get built schema slots with options (for student use) */
    slots: publicProcedure.query(() => {
      return buildSchemaSlots();
    }),

    /** Check if a keyword is the correct answer for a specific slot */
    check: publicProcedure
      .input(z.object({ slotId: z.string(), selectedKeyword: z.string() }))
      .query(async ({ input }) => {
        const allSlots = buildSchemaSlots();
        const slot = allSlots.find(s => s.id === input.slotId);
        if (!slot) throw new Error("Slot not found");
        return {
          isCorrect: slot.correctAnswer === input.selectedKeyword,
          correctAnswer: slot.correctAnswer,
        };
      }),
  }),

  // ==========================================================================
  // ANSWERS
  // ==========================================================================

  answers: router({
    /** Submit an answer for a schema slot */
    submit: publicProcedure
      .input(z.object({
        studentId: z.string(),
        classId: z.string(),
        slotId: z.string(),
        selectedKeyword: z.string(),
        isCorrect: z.boolean(),
      }))
      .mutation(async ({ input }) => {
        return saveAnswer(input);
      }),

    /** Get all answers for a student */
    list: publicProcedure
      .input(z.object({ studentId: z.string() }))
      .query(async ({ input }) => {
        if (!db) return [];
        const { answers } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        return db.select().from(answers).where(eq(answers.studentId, input.studentId));
      }),

    /** Complete schema activity and save score */
    complete: publicProcedure
      .input(z.object({
        studentId: z.string(),
        score: z.number().int().min(0).max(TOTAL_SLOTS),
      }))
      .mutation(async ({ input }) => {
        return updateStudentScore(input.studentId, input.score);
      }),
  }),
});

export type AppRouter = typeof appRouter;
