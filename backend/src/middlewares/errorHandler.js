// Middleware central de erros.
// No Express 5, se uma função async lançar erro (ou uma Promise for rejeitada),
// o erro chega aqui automaticamente. Por isso os controllers não precisam de try/catch
// e o servidor não cai quando o banco falha: o cliente sempre recebe uma resposta.
const AppError = require("../errors/AppError");
const env = require("../config/env");

// Códigos de erro do PostgreSQL que podem ser causados pelo cliente.
const PG_UNIQUE_VIOLATION = "23505";
const PG_FOREIGN_KEY_VIOLATION = "23503";
const PG_CHECK_VIOLATION = "23514";
const PG_INVALID_TEXT = "22P02";

// eslint-disable-next-line no-unused-vars
function errorHandler(error, req, res, next) {
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      message: error.message,
      ...(error.details && { details: error.details }),
    });
  }

  // JSON mal formatado no corpo da requisição.
  if (error.type === "entity.parse.failed") {
    return res.status(400).json({ message: "JSON inválido no corpo da requisição." });
  }

  if (error.type === "entity.too.large") {
    return res.status(413).json({ message: "Corpo da requisição muito grande." });
  }

  // Redes de segurança: as regras de negócio já validam isso antes,
  // mas se algo escapar o banco ainda protege a integridade dos dados.
  if (error.code === PG_UNIQUE_VIOLATION) {
    return res.status(409).json({ message: "Registro duplicado." });
  }
  if (error.code === PG_FOREIGN_KEY_VIOLATION) {
    return res.status(400).json({ message: "Registro relacionado não existe." });
  }
  if (error.code === PG_CHECK_VIOLATION || error.code === PG_INVALID_TEXT) {
    return res.status(400).json({ message: "Dados inválidos." });
  }

  // Erro inesperado: registra no terminal e devolve mensagem genérica
  // (nunca expor detalhes internos, como SQL ou stack trace, para o cliente).
  if (!env.isTest) {
    console.error("[erro]", req.method, req.originalUrl, error);
  }
  return res.status(500).json({ message: "Erro interno do servidor." });
}

module.exports = errorHandler;
