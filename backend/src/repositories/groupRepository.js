// Acesso ao banco para grupos.
// Modelo atual: todo usuário autenticado enxerga e gerencia todos os grupos.
// Todas as consultas são parametrizadas ($1, $2...) para impedir SQL Injection.
const db = require("../database/pool");

const SELECT_WITH_COUNTS = `
  SELECT
    g.id,
    g.name,
    g.prefix,
    COUNT(t.id)::int AS "totalTickets",
    COUNT(t.id) FILTER (WHERE t.status IN ('Pendente', 'Em Progresso', 'Pausado'))::int AS "openTickets",
    CASE WHEN u.id IS NULL THEN NULL
         ELSE json_build_object('id', u.id, 'name', u.name)
    END AS "createdBy",
    g.created_at AS "createdAt",
    g.updated_at AS "updatedAt"
  FROM ticket_groups g
  LEFT JOIN users u   ON u.id = g.created_by
  LEFT JOIN tickets t ON t.group_id = g.id
`;

async function findAll() {
  const { rows } = await db.query(
    `${SELECT_WITH_COUNTS}
      GROUP BY g.id, u.id
      ORDER BY LOWER(g.name)`,
  );
  return rows;
}

async function findById(id) {
  const { rows } = await db.query(
    `${SELECT_WITH_COUNTS}
      WHERE g.id = $1
      GROUP BY g.id, u.id`,
    [id],
  );
  return rows[0] || null;
}

async function create({ name, prefix, createdBy }) {
  const { rows } = await db.query(
    `INSERT INTO ticket_groups (name, prefix, created_by)
     VALUES ($1, $2, $3)
     RETURNING id`,
    [name, prefix, createdBy],
  );
  return rows[0].id;
}

/** Retorna true se atualizou (ou seja, se o grupo existe). */
async function update(id, { name, prefix }) {
  const { rowCount } = await db.query(
    `UPDATE ticket_groups
        SET name = $1, prefix = $2, updated_at = now()
      WHERE id = $3`,
    [name, prefix, id],
  );
  return rowCount > 0;
}

/** Retorna true se apagou. Os chamados do grupo são apagados junto (ON DELETE CASCADE). */
async function remove(id) {
  const { rowCount } = await db.query("DELETE FROM ticket_groups WHERE id = $1", [id]);
  return rowCount > 0;
}

/**
 * Reserva o próximo número de chamado do grupo de forma atômica.
 * Mesmo com duas requisições simultâneas, cada uma recebe um número diferente.
 * Deve ser chamado dentro de uma transação (recebe o client).
 */
async function nextTicketNumber(client, groupId) {
  const { rows } = await client.query(
    `UPDATE ticket_groups
        SET ticket_seq = ticket_seq + 1
      WHERE id = $1
      RETURNING prefix, ticket_seq AS "ticketSeq"`,
    [groupId],
  );
  return rows[0] || null;
}

module.exports = { findAll, findById, create, update, remove, nextTicketNumber };
