const {
  api,
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

describe("Grupos", () => {
  test("cria grupo com prefixo em maiúsculas e contadores zerados", async () => {
    const { auth, user } = await createUser();
    const res = await api()
      .post("/groups")
      .set(auth)
      .send({ name: " Infraestrutura ", prefix: "inf" });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      id: 1,
      name: "Infraestrutura",
      prefix: "INF",
      totalTickets: 0,
      openTickets: 0,
      createdBy: { id: user.id, name: user.name },
    });
  });

  test("valida nome e prefixo", async () => {
    const { auth } = await createUser();
    for (const body of [
      {},
      { name: "Ok", prefix: "COM ESPAÇO" },
      { name: "Ok", prefix: "ABCDEF" },
      { name: "Ok", prefix: "A-B" },
      { name: "x".repeat(65), prefix: "OK" },
      { name: 123, prefix: "OK" },
    ]) {
      const res = await api().post("/groups").set(auth).send(body);
      expect(res.status).toBe(400);
    }
  });

  test("recusa prefixo ou nome repetidos com 409", async () => {
    const { auth } = await createUser();
    await createGroup(auth, { name: "Suporte", prefix: "SUP" });

    const samePrefix = await api().post("/groups").set(auth).send({ name: "Outro", prefix: "sup" });
    expect(samePrefix.status).toBe(409);
    expect(samePrefix.body.message).toBe("Já existe um grupo com este prefixo.");

    const sameName = await api().post("/groups").set(auth).send({ name: "SUPORTE", prefix: "XYZ" });
    expect(sameName.status).toBe(409);
    expect(sameName.body.message).toBe("Já existe um grupo com este nome.");
  });

  test("lista em ordem alfabética com a contagem de chamados", async () => {
    const { auth } = await createUser();
    const b = await createGroup(auth, { name: "Bravo", prefix: "BRA" });
    await createGroup(auth, { name: "alfa", prefix: "ALF" });

    const t1 = await createTicket(auth, b.id);
    await createTicket(auth, b.id);
    await api().patch(`/tickets/${t1.id}/status`).set(auth).send({ status: "Cancelado" });

    const res = await api().get("/groups").set(auth);
    expect(res.status).toBe(200);
    expect(res.body.map((g) => g.name)).toEqual(["alfa", "Bravo"]);
    expect(res.body[1]).toMatchObject({ totalTickets: 2, openTickets: 1 });
  });

  test("busca, atualiza e apaga por id", async () => {
    const { auth } = await createUser();
    const group = await createGroup(auth, { name: "Redes", prefix: "RED" });

    expect((await api().get(`/groups/${group.id}`).set(auth)).body.name).toBe("Redes");

    const updated = await api()
      .put(`/groups/${group.id}`)
      .set(auth)
      .send({ name: "Redes e Telefonia", prefix: "rtl" });
    expect(updated.status).toBe(200);
    expect(updated.body).toMatchObject({ name: "Redes e Telefonia", prefix: "RTL" });

    await api().delete(`/groups/${group.id}`).set(auth).expect(204);
    expect((await api().get(`/groups/${group.id}`).set(auth)).status).toBe(404);
  });

  test("atualizar para um prefixo de outro grupo dá 409", async () => {
    const { auth } = await createUser();
    await createGroup(auth, { name: "A", prefix: "AAA" });
    const b = await createGroup(auth, { name: "B", prefix: "BBB" });
    const res = await api().put(`/groups/${b.id}`).set(auth).send({ name: "B", prefix: "AAA" });
    expect(res.status).toBe(409);
  });

  test("id inexistente dá 404 e id inválido dá 400", async () => {
    const { auth } = await createUser();
    expect((await api().get("/groups/999").set(auth)).status).toBe(404);
    expect((await api().put("/groups/999").set(auth).send({ name: "X", prefix: "X" })).status).toBe(404);
    expect((await api().delete("/groups/999").set(auth)).status).toBe(404);
    expect((await api().get("/groups/abc").set(auth)).status).toBe(400);
    expect((await api().get("/groups/-1").set(auth)).status).toBe(400);
    expect((await api().get("/groups/99999999999").set(auth)).status).toBe(400);
  });

  test("apagar o grupo apaga os chamados dele (sem dados órfãos)", async () => {
    const { auth } = await createUser();
    const group = await createGroup(auth);
    const ticket = await createTicket(auth, group.id);

    await api().delete(`/groups/${group.id}`).set(auth).expect(204);
    expect((await api().get(`/tickets/${ticket.id}`).set(auth)).status).toBe(404);
  });

  test("dados são compartilhados: qualquer usuário logado vê, edita e apaga", async () => {
    const ana = await createUser();
    const bruno = await createUser();
    const group = await createGroup(ana.auth, { name: "Compartilhado", prefix: "CMP" });

    expect((await api().get("/groups").set(bruno.auth)).body).toHaveLength(1);
    expect(
      (await api().put(`/groups/${group.id}`).set(bruno.auth).send({ name: "Editado", prefix: "CMP" }))
        .status,
    ).toBe(200);
    await api().delete(`/groups/${group.id}`).set(bruno.auth).expect(204);
  });
});
