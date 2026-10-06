// Erro "esperado" da aplicação: algo que o cliente fez de errado
// (dado inválido, recurso inexistente, sem permissão...).
// O errorHandler transforma este erro em uma resposta HTTP com o status certo.
class AppError extends Error {
  constructor(message, statusCode = 400, details) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.details = details;
  }

  static badRequest(message, details) {
    return new AppError(message, 400, details);
  }

  static unauthorized(message = "Não autorizado.") {
    return new AppError(message, 401);
  }

  static notFound(message = "Recurso não encontrado.") {
    return new AppError(message, 404);
  }

  static conflict(message) {
    return new AppError(message, 409);
  }
}

module.exports = AppError;
