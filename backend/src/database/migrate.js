// Executor de migrations bem simples.
// Cada arquivo .sql da pasta migrations roda UMA única vez, em ordem alfabética.
// Os arquivos já aplicados ficam registrados na tabela schema_migrations.
// Para mudar o banco no futuro, crie um arquivo novo (ex.: 002_add_avatar.sql);
// nunca edite um arquivo que já foi aplicado.
const fs = require("node:fs/promises");
const path = require("node:path");
const { pool } = require("./pool");

const MIGRATIONS_DIR = path.join(__dirname, "migrations");
// Número arbitrário para o "advisory lock": impede que dois processos migrem ao mesmo tempo.
const LOCK_ID = 727274;

async function runMigrations({ silent = false } = {}) {
  const client = await pool.connect();
  try {
    await client.query("SELECT pg_advisory_lock($1)", [LOCK_ID]);

    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name       VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMPTZ  NOT NULL DEFAULT now()
      )
    `);

    const { rows } = await client.query("SELECT name FROM schema_migrations");
    const applied = new Set(rows.map((row) => row.name));

    const files = (await fs.readdir(MIGRATIONS_DIR))
      .filter((file) => file.endsWith(".sql"))
      .sort();

    for (const file of files) {
      if (applied.has(file)) continue;

      const sql = await fs.readFile(path.join(MIGRATIONS_DIR, file), "utf8");

      try {
        await client.query("BEGIN");
        await client.query(sql);
        await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [file]);
        await client.query("COMMIT");
        if (!silent) console.log(`[migrate] aplicada: ${file}`);
      } catch (error) {
        await client.query("ROLLBACK");
        error.message = `Falha na migration ${file}: ${error.message}`;
        throw error;
      }
    }
  } finally {
    await client.query("SELECT pg_advisory_unlock($1)", [LOCK_ID]).catch(() => {});
    client.release();
  }
}

// Permite rodar direto pelo terminal: npm run migrate
if (require.main === module) {
  runMigrations()
    .then(() => console.log("[migrate] banco atualizado."))
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}

module.exports = { runMigrations };
