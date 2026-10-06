// Acesso ao banco para chamados e comentários.
// Modelo atual: todo usuário autenticado enxerga e gerencia todos os chamados.
// Todas as consultas são parametrizadas ($1, $2...) para impedir SQL Injection.
const db = require("../database/pool");
const { ACTIVE_STATUSES, FINISHED_STATUSES } = require("../validators/ticketSchemas");

// Cada chamado já vem com seus comentários (array JSON), para o frontend
// conseguir montar a tela com uma única requisição.
const TICKET_COLUMNS = `
  t.id,
  t.code,
  t.group_id    AS "groupId",
  t.title,
  t.description,
  t.requester,
  t.owner,
  t.priority,
  t.status,
  t.opened_on   AS "openedOn",
  CASE WHEN u.id IS NULL THEN NULL
       ELSE json_build_object('id', u.id, 'name', u.name)
  END AS "createdBy",
  t.created_at  AS "createdAt",
  t.updated_at  AS "updatedAt",
  COALESCE(
    (SELECT json_agg(
              json_build_object(
                'id', c.id,
                'author', c.author,
                'body', c.body,
                'createdBy', c.created_by,
                'createdAt', c.created_at
              )
              ORDER BY c.created_at, c.id
            )
       FROM comments c
      WHERE c.ticket_id = t.id),
    '[]'::json
  ) AS comments
`;

const FROM_TICKETS = `
  FROM tickets t
  LEFT JOIN users u ON u.id = t.created_by
`;

// Ordenações permitidas. O valor vem de uma lista fixa (nunca direto do usuário),
// então é seguro colocá-lo no SQL.
const ORDER_BY = {
  newest: "t.created_at DESC, t.id DESC",
  oldest: "t.created_at ASC, t.id ASC",
  priority: `CASE t.priority
               WHEN 'Crítica' THEN 4
               WHEN 'Alta'    THEN 3
               WHEN 'Média'   THEN 2
               ELSE 1
             END DESC, t.created_at DESC, t.id DESC`,
};

/** Escapa %, _ e \ para que a busca trate esses caracteres como texto comum. */
function escapeLike(value) {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

async function findAll({ groupId, status, search, sort } = {}) {
  const params = [];
  const conditions = [];

  if (groupId) {
    params.push(groupId);
    conditions.push(`t.group_id = $${params.length}`);
  }

  if (status === "Ativos") {
    params.push(ACTIVE_STATUSES);
    conditions.push(`t.status = ANY($${params.length})`);
  } else if (status === "Finalizados") {
    params.push(FINISHED_STATUSES);
    conditions.push(`t.status = ANY($${params.length})`);
  } else if (status && status !== "Todos") {
    params.push(status);
    conditions.push(`t.status = $${params.length}`);
  }

  if (search) {
    params.push(`%${escapeLike(search)}%`);
    const p = `$${params.length}`;
    conditions.push(
      `(t.code ILIKE ${p} OR t.title ILIKE ${p} OR t.requester ILIKE ${p} OR COALESCE(t.owner, '') ILIKE ${p})`,
    );
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const orderBy = ORDER_BY[sort] || ORDER_BY.newest;

  const { rows } = await db.query(
    `SELECT ${TICKET_COLUMNS} ${FROM_TICKETS} ${where} ORDER BY ${orderBy}`,
    params,
  );
  return rows;
}

async function findById(id) {
  const { rows } = await db.query(
    `SELECT ${TICKET_COLUMNS} ${FROM_TICKETS} WHERE t.id = $1`,
    [id],
  );
  return rows[0] || null;
}

async function findStatus(id) {
  const { rows } = await db.query("SELECT status FROM tickets WHERE id = $1", [id]);
  return rows[0]?.status ?? null;
}

async function exists(id) {
  const { rowCount } = await db.query("SELECT 1 FROM tickets WHERE id = $1", [id]);
  return rowCount > 0;
}

/** Deve ser chamado dentro de uma transação (recebe o client). */
async function create(client, data) {
  const { rows } = await client.query(
    `INSERT INTO tickets
       (group_id, code, title, description, requester, owner, priority, opened_on, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8::date, CURRENT_DATE), $9)
     RETURNING id`,
    [
      data.groupId,
      data.code,
      data.title,
      data.description,
      data.requester,
      data.owner,
      data.priority,
      data.openedOn ?? null,
      data.createdBy,
    ],
  );
  return rows[0].id;
}

/** Retorna true se atualizou. Se openedOn não vier, mantém a data atual. */
async function update(id, data) {
  const { rowCount } = await db.query(
    `UPDATE tickets
        SET title       = $1,
            description = $2,
            requester   = $3,
            owner       = $4,
            priority    = $5,
            opened_on   = COALESCE($6::date, opened_on),
            updated_at  = now()
      WHERE id = $7`,
    [
      data.title,
      data.description,
      data.requester,
      data.owner,
      data.priority,
      data.openedOn ?? null,
      id,
    ],
  );
  return rowCount > 0;
}

/**
 * Muda o status só se o status atual ainda for o esperado.
 * Evita que duas requisições simultâneas "pulem" etapas do fluxo.
 */
async function updateStatus(id, fromStatus, toStatus) {
  const { rowCount } = await db.query(
    `UPDATE tickets
        SET status = $1, updated_at = now()
      WHERE id = $2 AND status = $3`,
    [toStatus, id, fromStatus],
  );
  return rowCount > 0;
}

/** Retorna true se apagou. Os comentários são apagados junto (ON DELETE CASCADE). */
async function remove(id) {
  const { rowCount } = await db.query("DELETE FROM tickets WHERE id = $1", [id]);
  return rowCount > 0;
}

// ---------- Comentários ----------

const COMMENT_COLUMNS = `id, author, body, created_by AS "createdBy", created_at AS "createdAt"`;

async function findComments(ticketId) {
  const { rows } = await db.query(
    `SELECT ${COMMENT_COLUMNS}
       FROM comments
      WHERE ticket_id = $1
      ORDER BY created_at, id`,
    [ticketId],
  );
  return rows;
}

async function createComment({ ticketId, author, body, createdBy }) {
  const { rows } = await db.query(
    `INSERT INTO comments (ticket_id, author, body, created_by)
     VALUES ($1, $2, $3, $4)
     RETURNING ${COMMENT_COLUMNS}`,
    [ticketId, author, body, createdBy],
  );
  return rows[0];
}

async function removeComment(commentId, ticketId) {
  const { rowCount } = await db.query(
    "DELETE FROM comments WHERE id = $1 AND ticket_id = $2",
    [commentId, ticketId],
  );
  return rowCount > 0;
}

module.exports = {
  findAll,
  findById,
  findStatus,
  exists,
  create,
  update,
  updateStatus,
  remove,
  findComments,
  createComment,
  removeComment,
};
