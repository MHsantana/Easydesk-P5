// Valida params, query e body com schemas do Zod ANTES de chegar no controller.
// Dados inválidos são barrados aqui e nunca chegam ao banco.
// Os dados já limpos (trim, tipos convertidos, campos extras removidos) ficam em req.validated.
const AppError = require("../errors/AppError");

const SOURCES = ["params", "query", "body"];

function validate(schemas) {
  return (req, res, next) => {
    req.validated = req.validated || {};

    for (const source of SOURCES) {
      const schema = schemas[source];
      if (!schema) continue;

      const result = schema.safeParse(req[source] ?? {});

      if (!result.success) {
        const details = result.error.issues.map((issue) => ({
          field: issue.path.join(".") || source,
          message: issue.message,
        }));
        throw AppError.badRequest("Dados inválidos.", details);
      }

      req.validated[source] = result.data;
    }

    next();
  };
}

module.exports = validate;
