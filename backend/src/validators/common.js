// Peças reutilizáveis de validação (Zod) com mensagens em português.
const { z } = require("zod");

const MAX_INT = 2147483647; // limite do tipo INTEGER do PostgreSQL

/** Texto obrigatório: remove espaços das pontas e limita o tamanho. */
function requiredText(label, max) {
  return z
    .string({
      required_error: `O campo "${label}" é obrigatório.`,
      invalid_type_error: `O campo "${label}" deve ser um texto.`,
    })
    .trim()
    .min(1, `O campo "${label}" é obrigatório.`)
    .max(max, `O campo "${label}" deve ter no máximo ${max} caracteres.`);
}

/** Texto opcional: vazio ou ausente vira null. */
function optionalText(label, max) {
  return z
    .string({ invalid_type_error: `O campo "${label}" deve ser um texto.` })
    .trim()
    .max(max, `O campo "${label}" deve ter no máximo ${max} caracteres.`)
    .nullish()
    .transform((value) => (value ? value : null));
}

/** Id numérico vindo da URL (ex.: /tickets/12). */
function idSchema(label = "id") {
  return z.coerce
    .number({ invalid_type_error: `O ${label} deve ser um número.` })
    .int(`O ${label} deve ser um número inteiro.`)
    .positive(`O ${label} deve ser positivo.`)
    .max(MAX_INT, `O ${label} é inválido.`);
}

const idParams = z.object({ id: idSchema() });

/** Data no formato AAAA-MM-DD que realmente exista no calendário. */
const dateSchema = z
  .string({ invalid_type_error: "A data deve ser um texto no formato AAAA-MM-DD." })
  .regex(/^\d{4}-\d{2}-\d{2}$/, "A data deve estar no formato AAAA-MM-DD.")
  .refine((value) => {
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
  }, "Data inválida.");

module.exports = { z, requiredText, optionalText, idSchema, idParams, dateSchema };
