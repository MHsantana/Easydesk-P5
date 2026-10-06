// Conexão com o PostgreSQL.
// Um "pool" mantém algumas conexões abertas e as reutiliza entre as requisições,
// em vez de abrir uma conexão nova a cada consulta.
const { Pool, types } = require("pg");
const env = require("../config/env");

// Colunas DATE (código 1082) chegam como texto "AAAA-MM-DD".
// Sem isso o driver converte para Date e o fuso horário pode mudar o dia.
types.setTypeParser(1082, (value) => value);

const pool = new Pool({
  connectionString: env.databaseUrl,
  ssl: env.databaseSsl ? { rejectUnauthorized: false } : false,
  max: 10,
});

pool.on("error", (error) => {
  console.error("[db] Erro inesperado em uma conexão ociosa:", error);
});

/**
 * Executa uma consulta SQL parametrizada.
 * SEMPRE passe os valores em `params` ($1, $2...) e nunca concatene na string:
 * é isso que impede SQL Injection.
 */
function query(text, params) {
  return pool.query(text, params);
}

/**
 * Executa várias consultas dentro de uma transação:
 * ou todas são gravadas, ou nenhuma é (ROLLBACK em caso de erro).
 */
async function withTransaction(callback) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { pool, query, withTransaction };
