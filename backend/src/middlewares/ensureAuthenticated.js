// Protege as rotas privadas.
// Espera o cabeçalho:  Authorization: Bearer <token>
// Se o token estiver ausente, inválido ou expirado, responde 401 (Não Autorizado).
// Se for válido, coloca o id do usuário em req.user.id para os próximos passos.
const AppError = require("../errors/AppError");
const { verifyToken } = require("../utils/token");
const userRepository = require("../repositories/userRepository");

async function ensureAuthenticated(req, res, next) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    throw AppError.unauthorized("Token de autenticação não informado.");
  }

  let userId;
  try {
    userId = verifyToken(token);
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      throw AppError.unauthorized("Sessão expirada. Faça login novamente.");
    }
    throw AppError.unauthorized("Token inválido.");
  }

  // O token pode ser de um usuário que já excluiu a conta.
  const exists = await userRepository.existsById(userId);
  if (!exists) {
    throw AppError.unauthorized("Usuário do token não existe mais.");
  }

  req.user = { id: userId };
  next();
}

module.exports = ensureAuthenticated;
