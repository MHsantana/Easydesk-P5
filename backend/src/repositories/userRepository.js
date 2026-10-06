// Repository = única camada que conversa com o banco sobre usuários.
// Todas as consultas são parametrizadas ($1, $2...) para impedir SQL Injection.
const db = require("../database/pool");

// Campos públicos: o hash da senha NUNCA sai desta camada por acidente.
const PUBLIC_COLUMNS = `
  id,
  name,
  email,
  role,
  created_at AS "createdAt",
  updated_at AS "updatedAt"
`;

async function existsById(id) {
  const { rowCount } = await db.query("SELECT 1 FROM users WHERE id = $1", [id]);
  return rowCount > 0;
}

async function findById(id) {
  const { rows } = await db.query(`SELECT ${PUBLIC_COLUMNS} FROM users WHERE id = $1`, [id]);
  return rows[0] || null;
}

/** Usado só no login/troca de senha: inclui o hash para comparação. */
async function findCredentialsByEmail(email) {
  const { rows } = await db.query(
    `SELECT ${PUBLIC_COLUMNS}, password_hash AS "passwordHash"
       FROM users
      WHERE LOWER(email) = LOWER($1)`,
    [email],
  );
  return rows[0] || null;
}

async function findPasswordHashById(id) {
  const { rows } = await db.query("SELECT password_hash FROM users WHERE id = $1", [id]);
  return rows[0]?.password_hash ?? null;
}

async function emailTakenByAnother(email, exceptUserId = null) {
  const { rowCount } = await db.query(
    `SELECT 1 FROM users
      WHERE LOWER(email) = LOWER($1)
        AND ($2::int IS NULL OR id <> $2::int)`,
    [email, exceptUserId],
  );
  return rowCount > 0;
}

async function create({ name, email, passwordHash }) {
  const { rows } = await db.query(
    `INSERT INTO users (name, email, password_hash)
     VALUES ($1, $2, $3)
     RETURNING ${PUBLIC_COLUMNS}`,
    [name, email, passwordHash],
  );
  return rows[0];
}

async function updateProfile(id, { name, email }) {
  const { rows } = await db.query(
    `UPDATE users
        SET name = $1, email = $2, updated_at = now()
      WHERE id = $3
      RETURNING ${PUBLIC_COLUMNS}`,
    [name, email, id],
  );
  return rows[0] || null;
}

async function updatePasswordHash(id, passwordHash) {
  await db.query(
    "UPDATE users SET password_hash = $1, updated_at = now() WHERE id = $2",
    [passwordHash, id],
  );
}

/**
 * Apaga o usuário. Os grupos, chamados e comentários que ele criou continuam
 * existindo (são da equipe); o campo created_by deles vira NULL (ON DELETE SET NULL).
 */
async function remove(id) {
  await db.query("DELETE FROM users WHERE id = $1", [id]);
}

module.exports = {
  existsById,
  findById,
  findCredentialsByEmail,
  findPasswordHashById,
  emailTakenByAnother,
  create,
  updateProfile,
  updatePasswordHash,
  remove,
};
