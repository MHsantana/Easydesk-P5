const jwt = require("jsonwebtoken");
const {
  api,
  pool,
  setupDatabase,
  resetDatabase,
  closeDatabase,
  createUser,
  createGroup,
} = require("./helpers");

beforeAll(setupDatabase);
beforeEach(resetDatabase);
afterAll(closeDatabase);

describe("Cadastro", () => {
  test("cria a conta e devolve token + usuário sem a senha", async () => {
    const res = await api()
      .post("/auth/register")
      .send({ name: "  Ana  ", email: "ANA@Teste.com", password: "senha-segura-123" });

    expect(res.status).toBe(201);
    expect(typeof res.body.token).toBe("string");
    expect(res.body.user).toMatchObject({ id: 1, name: "Ana", email: "ana@teste.com", role: "superuser" });
    expect(res.body.user).not.toHaveProperty("password");
    expect(res.body.user).not.toHaveProperty("passwordHash");
  });

  test("salva a senha como hash bcrypt, nunca em texto puro", async () => {
    await createUser({ email: "hash@teste.com", password: "minha-senha-123" });
    const { rows } = await pool.query("SELECT password_hash FROM users WHERE email = $1", [
      "hash@teste.com",
    ]);
    expect(rows[0].password_hash).not.toBe("minha-senha-123");
    expect(rows[0].password_hash).toMatch(/^\$2[aby]\$\d{2}\$/);
  });

  test("recusa e-mail repetido (sem diferenciar maiúsculas) com 409", async () => {
    await createUser({ email: "repetido@teste.com" });
    const res = await api()
      .post("/auth/register")
      .send({ name: "Outro", email: "Repetido@TESTE.com", password: "senha-segura-123" });
    expect(res.status).toBe(409);
    expect(res.body.message).toBe("Este e-mail já está cadastrado.");
  });

  test("valida os campos e devolve 400 com detalhes", async () => {
    const res = await api()
      .post("/auth/register")
      .send({ name: "", email: "nao-e-email", password: "123" });
    expect(res.status).toBe(400);
    const fields = [...new Set(res.body.details.map((d) => d.field))].sort();
    expect(fields).toEqual(["email", "name", "password"]);
  });

  test("corpo vazio ou JSON inválido devolve 400", async () => {
    expect((await api().post("/auth/register")).status).toBe(400);
    const res = await api()
      .post("/auth/register")
      .set("Content-Type", "application/json")
      .send("{ isso não é json");
    expect(res.status).toBe(400);
    expect(res.body.message).toBe("JSON inválido no corpo da requisição.");
  });
});

describe("Login", () => {
  test("com credenciais corretas devolve token", async () => {
    await createUser({ email: "login@teste.com", password: "senha-segura-123" });
    const res = await api()
      .post("/auth/login")
      .send({ email: "LOGIN@teste.com", password: "senha-segura-123" });
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe("login@teste.com");
    expect(res.body.user).not.toHaveProperty("passwordHash");

    const me = await api().get("/users/me").set("Authorization", `Bearer ${res.body.token}`);
    expect(me.status).toBe(200);
  });

  test("senha errada e e-mail inexistente dão o mesmo 401", async () => {
    await createUser({ email: "existe@teste.com" });
    const wrongPassword = await api()
      .post("/auth/login")
      .send({ email: "existe@teste.com", password: "senha-errada" });
    const unknownEmail = await api()
      .post("/auth/login")
      .send({ email: "nao-existe@teste.com", password: "senha-errada" });

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.body.message).toBe(unknownEmail.body.message);
  });
});

describe("Proteção das rotas privadas", () => {
  const privateRoutes = [
    ["get", "/users/me"],
    ["get", "/groups"],
    ["post", "/groups"],
    ["get", "/tickets"],
    ["post", "/tickets"],
    ["delete", "/tickets/1"],
  ];

  test.each(privateRoutes)("%s %s sem token devolve 401", async (method, path) => {
    const res = await api()[method](path);
    expect(res.status).toBe(401);
  });

  test("token mal formado, com outra assinatura, expirado ou sem 'Bearer' devolve 401", async () => {
    const { user, token } = await createUser();
    const secret = process.env.JWT_SECRET;

    const forged = jwt.sign({}, "outro-segredo-qualquer", { subject: String(user.id) });
    const expired = jwt.sign({ sub: String(user.id), exp: Math.floor(Date.now() / 1000) - 10 }, secret);
    const algNone = jwt.sign({}, null, { subject: String(user.id), algorithm: "none" });

    for (const header of [
      "Bearer abc.def.ghi",
      `Bearer ${forged}`,
      `Bearer ${expired}`,
      `Bearer ${algNone}`,
      token, // sem o prefixo Bearer
    ]) {
      const res = await api().get("/groups").set("Authorization", header);
      expect(res.status).toBe(401);
    }

    const res = await api().get("/groups").set("Authorization", `Bearer ${expired}`);
    expect(res.body.message).toBe("Sessão expirada. Faça login novamente.");
  });

  test("token de usuário que excluiu a conta deixa de funcionar", async () => {
    const { auth, password } = await createUser();
    await api().delete("/users/me").set(auth).send({ password }).expect(204);
    const res = await api().get("/groups").set(auth);
    expect(res.status).toBe(401);
  });
});

describe("Conta do usuário (/users/me)", () => {
  test("mostra e atualiza o perfil", async () => {
    const { auth } = await createUser({ email: "perfil@teste.com" });
    const res = await api()
      .put("/users/me")
      .set(auth)
      .send({ name: "Nome Novo", email: "Novo@Teste.com" });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ name: "Nome Novo", email: "novo@teste.com" });
  });

  test("não deixa usar o e-mail de outra pessoa", async () => {
    await createUser({ email: "ocupado@teste.com" });
    const { auth } = await createUser();
    const res = await api().put("/users/me").set(auth).send({ name: "X", email: "ocupado@teste.com" });
    expect(res.status).toBe(409);
  });

  test("troca a senha só com a senha atual correta", async () => {
    const { auth, password, user } = await createUser();

    const wrong = await api()
      .put("/users/me/password")
      .set(auth)
      .send({ currentPassword: "errada", newPassword: "nova-senha-123" });
    expect(wrong.status).toBe(400);

    await api()
      .put("/users/me/password")
      .set(auth)
      .send({ currentPassword: password, newPassword: "nova-senha-123" })
      .expect(204);

    const oldLogin = await api().post("/auth/login").send({ email: user.email, password });
    expect(oldLogin.status).toBe(401);
    const newLogin = await api()
      .post("/auth/login")
      .send({ email: user.email, password: "nova-senha-123" });
    expect(newLogin.status).toBe(200);
  });

  test("excluir a conta exige senha e mantém os dados da equipe", async () => {
    const { auth, password } = await createUser();
    const group = await createGroup(auth);

    expect((await api().delete("/users/me").set(auth).send({ password: "errada" })).status).toBe(400);
    await api().delete("/users/me").set(auth).send({ password }).expect(204);

    const other = await createUser();
    const res = await api().get(`/groups/${group.id}`).set(other.auth);
    expect(res.status).toBe(200);
    expect(res.body.createdBy).toBeNull();
  });
});
