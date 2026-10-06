// Controllers só traduzem HTTP <-> serviço: leem a requisição já validada,
// chamam o serviço e escolhem o status da resposta.
const authService = require("../services/authService");

async function register(req, res) {
  const result = await authService.register(req.validated.body);
  res.status(201).json(result);
}

async function login(req, res) {
  const result = await authService.login(req.validated.body);
  res.json(result);
}

module.exports = { register, login };
