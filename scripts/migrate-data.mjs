/**
 * Script per migrare i dati dal vecchio database (neondb) al nuovo (becquer_schema)
 * Usa il driver `postgres` già presente nelle dipendenze.
 */
import { postgres } from "../node_modules/.pnpm/postgres@3.4.5/node_modules/postgres/src/index.js";

// Non possiamo importare direttamente, usiamo invece il driver postgres via CDN dinamico
// In realtà postgres è una dipendenza, usiamo require tramite createRequire
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { default: postgres } = require("postgres");

const OLD_URL = "postgresql://neondb_owner:npg_RZ2qtHgLYX7E@ep-steep-wave-atswmlqj.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require";
const NEW_URL = "postgresql://becquer_app:becquer_persistent_2024@ep-steep-wave-atswmlqj.c-9.us-east-1.aws.neon.tech/becquer_schema?sslmode=require";

async function migrate() {
  console.log("Connessione al database vecchio...");
  const oldSql = postgres(OLD_URL);
  
  console.log("Connessione al database nuovo...");
  const newSql = postgres(NEW_URL);

  try {
    // 1. Migra classi
    console.log("\n--- Classi ---");
    const classes = await oldSql`SELECT * FROM classes`;
    console.log(`  Trovate ${classes.length} classi`);
    for (const c of classes) {
      await newSql`
        INSERT INTO classes (id, name, year, student_count, password, code, is_active, session_started, date, created_at)
        VALUES (${c.id}, ${c.name}, ${c.year}, ${c.student_count}, ${c.password}, ${c.code}, ${c.is_active}, ${c.session_started}, ${c.date}, ${c.created_at})
        ON CONFLICT (id) DO NOTHING
      `;
      console.log(`  ✓ Classe "${c.name}" (codice: ${c.code})`);
    }

    // 2. Migra studenti
    console.log("\n--- Studenti ---");
    const students = await oldSql`SELECT * FROM students`;
    console.log(`  Trovati ${students.length} studenti`);
    for (const s of students) {
      await newSql`
        INSERT INTO students (id, class_id, name, score, completed, created_at)
        VALUES (${s.id}, ${s.class_id}, ${s.name}, ${s.score}, ${s.completed}, ${s.created_at})
        ON CONFLICT (id) DO NOTHING
      `;
      console.log(`  ✓ Studente "${s.name}"`);
    }

    // 3. Migra risposte
    console.log("\n--- Risposte ---");
    const answers = await oldSql`SELECT * FROM answers`;
    console.log(`  Trovate ${answers.length} risposte`);
    for (const a of answers) {
      await newSql`
        INSERT INTO answers (id, student_id, class_id, slot_id, selected_keyword, is_correct, created_at)
        VALUES (${a.id}, ${a.student_id}, ${a.class_id}, ${a.slot_id}, ${a.selected_keyword}, ${a.is_correct}, ${a.created_at})
        ON CONFLICT (id) DO NOTHING
      `;
    }
    console.log(`  ✓ ${answers.length} risposte migrate`);

    // Verifica finale
    const nc = await newSql`SELECT COUNT(*)::int as cnt FROM classes`;
    const ns = await newSql`SELECT COUNT(*)::int as cnt FROM students`;
    const na = await newSql`SELECT COUNT(*)::int as cnt FROM answers`;
    console.log(`\n✅ Migrazione completata! ${nc[0].cnt} classi, ${ns[0].cnt} studenti, ${na[0].cnt} risposte`);

  } catch (err) {
    console.error("ERRORE:", err);
  } finally {
    await oldSql.end();
    await newSql.end();
  }
}

migrate();
