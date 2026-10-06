const {
  api,
  pool,
  setupDatabase,
  resetDatabase,
  closeDatabase,
  createUser,
  createGroup,
  createTicket,
} = require("./helpers");

beforeAll(setupDatabase);
beforeEach(resetDatabase);
afterAll(closeDatabase);

async function setup() {
  const user = await createUser({ name: "Atendente" });
  const group = await createGroup(user.auth, { name: "Infraestrutura", prefix: "INF" });
  return { ...user, group };
}

describe("Criação de chamados", () => {
  test("gera o código pelo prefixo do grupo e começa como Pendente", async () => {
    const { auth, group, user } = await setup();
    const first = await createTicket(auth, group.id);
    const second = await createTicket(auth, group.id, { openedOn: "2026-01-15", owner: "João" });

    expect(first).toMatchObject({
      code: "INF-001",
      groupId: group.id,
      status: "Pendente",
      owner: null,
      comments: [],
      createdBy: { id: user.id, name: "Atendente" },
    });
    expect(first.openedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(second).toMatchObject({ code: "INF-002", openedOn: "2026-01-15", owner: "João" });
  });

  test("não reaproveita códigos depois de apagar um chamado", async () => {
    const { auth, group } = await setup();
    await createTicket(auth, group.id);
    const second = await createTicket(auth, group.id);
    await api().delete(`/tickets/${second.id}`).set(auth).expect(204);
    const third = await createTicket(auth, group.id);
    expect(third.code).toBe("INF-003");
  });

  test("requisições simultâneas recebem códigos diferentes", async () => {
    const { auth, group } = await setup();
    const tickets = await Promise.all(
      Array.from({ length: 10 }, () => createTicket(auth, group.id)),
    );
    const codes = new Set(tickets.map((t) => t.code));
    expect(codes.size).toBe(10);
  });

  test("grupo inexistente dá 404", async () => {
    const { auth } = await setup();
    const res = await api().post("/tickets").set(auth).send({
      groupId: 999,
      title: "T",
      description: "D",
      requester: "R",
      priority: "Alta",
    });
    expect(res.status).toBe(404);
    expect(res.body.message).toBe("Grupo não encontrado.");
  });

  test("valida os campos", async () => {
    const { auth, group } = await setup();
    const valid = {
      groupId: group.id,
      title: "Título",
      description: "Descrição",
      requester: "Maria",
      priority: "Alta",
    };
    for (const override of [
      { title: "" },
      { title: "x".repeat(65) },
      { description: "x".repeat(4001) },
      { requester: "   " },
      { priority: "Urgente" },
      { groupId: "abc" },
      { openedOn: "2026-02-30" },
      { openedOn: "06/10/2026" },
      { owner: "x".repeat(65) },
    ]) {
      const res = await api().post("/tickets").set(auth).send({ ...valid, ...override });
      expect(res.status).toBe(400);
    }
  });

  test("tentativa de SQL Injection é salva como texto comum", async () => {
    const { auth, group } = await setup();
    const malicious = "'; DROP TABLE users; --";
    const ticket = await createTicket(auth, group.id, { title: malicious, requester: malicious });
    expect(ticket.title).toBe(malicious);

    const { rows } = await pool.query("SELECT COUNT(*)::int AS total FROM users");
    expect(rows[0].total).toBe(1);

    const search = await api().get("/tickets").set(auth).query({ search: "' OR 1=1 --" });
    expect(search.status).toBe(200);
    expect(search.body).toHaveLength(0);
  });
});

describe("Listagem com filtros", () => {
  async function seed() {
    const ctx = await setup();
    const other = await createGroup(ctx.auth, { name: "Sistemas", prefix: "SIS" });
    const a = await createTicket(ctx.auth, ctx.group.id, { title: "Wi-Fi caiu", priority: "Baixa" });
    const b = await createTicket(ctx.auth, ctx.group.id, {
      title: "Servidor fora",
      priority: "Crítica",
      owner: "Carlos",
    });
    const c = await createTicket(ctx.auth, other.id, {
      title: "Erro no ERP",
      priority: "Alta",
      requester: "Financeiro 100%",
    });
    await api().patch(`/tickets/${b.id}/status`).set(ctx.auth).send({ status: "Em Progresso" });
    await api().patch(`/tickets/${b.id}/status`).set(ctx.auth).send({ status: "Concluído" });
    return { ...ctx, other, a, b, c };
  }

  const titles = (res) => res.body.map((t) => t.title);

  test("sem filtros traz todos, do mais novo para o mais antigo", async () => {
    const { auth } = await seed();
    const res = await api().get("/tickets").set(auth);
    expect(res.status).toBe(200);
    expect(titles(res)).toEqual(["Erro no ERP", "Servidor fora", "Wi-Fi caiu"]);
  });

  test("filtra por grupo, status e busca; ordena por criticidade", async () => {
    const { auth, other } = await seed();
    const q = (query) => api().get("/tickets").set(auth).query(query);

    expect(titles(await q({ groupId: other.id }))).toEqual(["Erro no ERP"]);
    expect(titles(await q({ status: "Ativos", sort: "oldest" }))).toEqual(["Wi-Fi caiu", "Erro no ERP"]);
    expect(titles(await q({ status: "Finalizados" }))).toEqual(["Servidor fora"]);
    expect(titles(await q({ status: "Pendente", sort: "oldest" }))).toEqual(["Wi-Fi caiu", "Erro no ERP"]);
    expect(titles(await q({ search: "inf-002" }))).toEqual(["Servidor fora"]);
    expect(titles(await q({ search: "carlos" }))).toEqual(["Servidor fora"]);
    expect(titles(await q({ search: "100%" }))).toEqual(["Erro no ERP"]);
    expect(titles(await q({ search: "%" }))).toEqual(["Erro no ERP"]);
    expect(titles(await q({ sort: "priority" }))).toEqual(["Servidor fora", "Erro no ERP", "Wi-Fi caiu"]);
  });

  test("filtros inválidos dão 400", async () => {
    const { auth } = await seed();
    expect((await api().get("/tickets").set(auth).query({ status: "Qualquer" })).status).toBe(400);
    expect((await api().get("/tickets").set(auth).query({ sort: "random" })).status).toBe(400);
    expect((await api().get("/tickets").set(auth).query({ groupId: "x" })).status).toBe(400);
  });
});

describe("Edição, status e exclusão", () => {
  test("PUT atualiza os campos editáveis", async () => {
    const { auth, group } = await setup();
    const ticket = await createTicket(auth, group.id, { owner: "Ana" });

    const res = await api().put(`/tickets/${ticket.id}`).set(auth).send({
      title: "Novo título",
      description: "Nova descrição",
      requester: "Pedro",
      priority: "Crítica",
    });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      code: "INF-001",
      title: "Novo título",
      requester: "Pedro",
      priority: "Crítica",
      owner: null,
      openedOn: ticket.openedOn,
      status: "Pendente",
    });
    expect((await api().put("/tickets/999").set(auth).send(res.body)).status).toBe(404);
  });

  test("segue o fluxo de status e recusa transições inválidas com 409", async () => {
    const { auth, group } = await setup();
    const ticket = await createTicket(auth, group.id);
    const setStatus = (status) =>
      api().patch(`/tickets/${ticket.id}/status`).set(auth).send({ status });

    expect((await setStatus("Concluído")).status).toBe(409); // Pendente -> Concluído não pode
    expect((await setStatus("Pendente")).status).toBe(409); // já está Pendente
    expect((await setStatus("Em Progresso")).body.status).toBe("Em Progresso");
    expect((await setStatus("Pausado")).body.status).toBe("Pausado");
    expect((await setStatus("Em Progresso")).body.status).toBe("Em Progresso");
    expect((await setStatus("Concluído")).body.status).toBe("Concluído");

    const blocked = await setStatus("Em Progresso"); // Concluído é final
    expect(blocked.status).toBe(409);
    expect(blocked.body.message).toBe('Não é possível mudar o status de "Concluído" para "Em Progresso".');

    expect((await setStatus("Inventado")).status).toBe(400);
    expect(
      (await api().patch("/tickets/999/status").set(auth).send({ status: "Pausado" })).status,
    ).toBe(404);
  });

  test("DELETE apaga o chamado e os comentários dele", async () => {
    const { auth, group } = await setup();
    const ticket = await createTicket(auth, group.id);
    await api().post(`/tickets/${ticket.id}/comments`).set(auth).send({ body: "Oi" });

    await api().delete(`/tickets/${ticket.id}`).set(auth).expect(204);
    expect((await api().get(`/tickets/${ticket.id}`).set(auth)).status).toBe(404);
    expect((await api().delete(`/tickets/${ticket.id}`).set(auth)).status).toBe(404);

    const { rows } = await pool.query("SELECT COUNT(*)::int AS total FROM comments");
    expect(rows[0].total).toBe(0);
  });

  test("outro usuário logado também gerencia o chamado (dados compartilhados)", async () => {
    const { auth, group } = await setup();
    const ticket = await createTicket(auth, group.id);
    const other = await createUser();

    expect((await api().get(`/tickets/${ticket.id}`).set(other.auth)).status).toBe(200);
    expect(
      (await api().patch(`/tickets/${ticket.id}/status`).set(other.auth).send({ status: "Cancelado" }))
        .status,
    ).toBe(200);
    await api().delete(`/tickets/${ticket.id}`).set(other.auth).expect(204);
  });
});

describe("Comentários", () => {
  test("adiciona, lista e remove comentários", async () => {
    const { auth, group } = await setup();
    const ticket = await createTicket(auth, group.id);

    const withAuthor = await api()
      .post(`/tickets/${ticket.id}/comments`)
      .set(auth)
      .send({ author: "Suporte N1", body: "Verificando o cabo de energia." });
    expect(withAuthor.status).toBe(201);
    expect(withAuthor.body).toMatchObject({ author: "Suporte N1", body: "Verificando o cabo de energia." });

    // Sem autor: usa o nome do usuário logado.
    const withoutAuthor = await api()
      .post(`/tickets/${ticket.id}/comments`)
      .set(auth)
      .send({ body: "Resolvido." });
    expect(withoutAuthor.body.author).toBe("Atendente");

    const list = await api().get(`/tickets/${ticket.id}/comments`).set(auth);
    expect(list.body.map((c) => c.body)).toEqual(["Verificando o cabo de energia.", "Resolvido."]);

    const detail = await api().get(`/tickets/${ticket.id}`).set(auth);
    expect(detail.body.comments).toHaveLength(2);

    await api()
      .delete(`/tickets/${ticket.id}/comments/${withAuthor.body.id}`)
      .set(auth)
      .expect(204);
    expect((await api().get(`/tickets/${ticket.id}/comments`).set(auth)).body).toHaveLength(1);
  });

  test("valida e devolve 404 quando o chamado ou o comentário não existem", async () => {
    const { auth, group } = await setup();
    const ticket = await createTicket(auth, group.id);

    expect((await api().post(`/tickets/${ticket.id}/comments`).set(auth).send({ body: "" })).status).toBe(400);
    expect(
      (await api().post(`/tickets/${ticket.id}/comments`).set(auth).send({ author: "x".repeat(33), body: "a" }))
        .status,
    ).toBe(400);
    expect((await api().post("/tickets/999/comments").set(auth).send({ body: "a" })).status).toBe(404);
    expect((await api().get("/tickets/999/comments").set(auth)).status).toBe(404);
    expect((await api().delete(`/tickets/${ticket.id}/comments/999`).set(auth)).status).toBe(404);
  });
});

describe("Rotas gerais", () => {
  test("health check e rota inexistente", async () => {
    expect((await api().get("/health")).body).toEqual({ status: "ok", database: "ok" });
    expect((await api().get("/nao-existe")).status).toBe(404);
  });
});
