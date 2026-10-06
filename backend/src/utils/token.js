// Geração e verificação de tokens JWT.
// O token guarda só o id do usuário (campo "sub") e a data de expiração.
// Ele é ASSINADO (não criptografado): qualquer um consegue ler o conteúdo,
// mas ninguém consegue alterá-lo sem o JWT_SECRET. Por isso nunca coloque dados sensíveis nele.
const jwt = require("jsonwebtoken");
const env = require("../config/env");

const ALGORITHM = "HS256";

function signToken(userId) {
  return jwt.sign({}, env.jwtSecret, {
    subject: String(userId),
    expiresIn: env.jwtExpiresIn,
    algorithm: ALGORITHM,
  });
}

/** Retorna o id do usuário ou lança o erro do jsonwebtoken se o token for inválido/expirado. */
function verifyToken(token) {
  const payload = jwt.verify(token, env.jwtSecret, { algorithms: [ALGORITHM] });
  const userId = Number(payload.sub);
  if (!Number.isInteger(userId) || userId <= 0) {
    throw new jwt.JsonWebTokenError("invalid subject");
  }
  return userId;
}

module.exports = { signToken, verifyToken };
