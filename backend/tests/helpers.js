const request = require("supertest");
const app = require("../src/app");
const { pool } = require("../src/database/pool");
const { runMigrations } = require("../src/database/migrate");

const api = () => request(app);

async function setupDatabase() {
  await runMigrations({ silent: true });
}

async function resetDatabase() {
  await pool.query(
    "TRUNCATE users, ticket_groups, tickets, comments RESTART IDENTITY CASCADE",
  );
}

async function closeDatabase() {
  await pool.end();
}

let counter = 0;

/** Cadastra um usuário e devolve { user, token, password, auth } para usar nos testes. */
async function createUser(overrides = {}) {
  counter += 1;
  const body = {
    name: `Usuário ${counter}`,
    email: `usuario${counter}@teste.com`,
    password: "senha-segura-123",
    ...overrides,
  };

  const res = await api().post("/auth/register").send(body);
  if (res.status !== 201) {
    throw new Error(`Falha ao criar usuário de teste: ${res.status} ${JSON.stringify(res.body)}`);
  }

  return {
    ...res.body,
    password: body.password,
    auth: { Authorization: `Bearer ${res.body.token}` },
  };
}

async function createGroup(auth, overrides = {}) {
  counter += 1;
  const res = await api()
    .post("/groups")
    .set(auth)
    .send({ name: `Grupo ${counter}`, prefix: `G${counter}`, ...overrides });
  if (res.status !== 201) {
    throw new Error(`Falha ao criar grupo de teste: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return res.body;
}

async function createTicket(auth, groupId, overrides = {}) {
  const res = await api()
    .post("/tickets")
    .set(auth)
    .send({
      groupId,
      title: "Impressora não liga",
      description: "A impressora do 2º andar não liga desde ontem.",
      requester: "Maria",
      priority: "Média",
      ...overrides,
    });
  if (res.status !== 201) {
    throw new Error(`Falha ao criar chamado de teste: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return res.body;
}

module.exports = {
  api,
  pool,
  setupDatabase,
  resetDatabase,
  closeDatabase,
  createUser,
  createGroup,
  createTicket,
};
