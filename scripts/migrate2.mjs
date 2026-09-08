import postgres from "postgres";

const OLD = "postgresql://neondb_owner:npg_RZ2qtHgLYX7E@ep-steep-wave-atswmlqj.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require";
const NEW = "postgresql://becquer_app:becquer_persistent_2024@ep-steep-wave-atswmlqj.c-9.us-east-1.aws.neon.tech/becquer_schema?sslmode=require";

const oldSql = postgres(OLD);
const newSql = postgres(NEW);

const tables = ["classes", "students", "answers"];

for (const table of tables) {
  const rows = await oldSql`SELECT * FROM ${oldSql(table)}`;
  console.log(`${table}: ${rows.length} righe`);
  if (rows.length === 0) continue;
  const keys = Object.keys(rows[0]);
  for (const row of rows) {
    const cols = {};
    for (const k of keys) cols[k] = row[k] ?? null;
    await newSql`INSERT INTO ${newSql(table)} ${newSql(cols)} ON CONFLICT (id) DO NOTHING`;
  }
  console.log(`  ✅ migrate`);
}

const [nc] = await newSql`SELECT COUNT(*)::int as c FROM classes`;
const [ns] = await newSql`SELECT COUNT(*)::int as c FROM students`;
const [na] = await newSql`SELECT COUNT(*)::int as c FROM answers`;
console.log(`\n✅ Fatto: ${nc.c} classi, ${ns.c} studenti, ${na.c} risposte`);

await oldSql.end();
await newSql.end();
