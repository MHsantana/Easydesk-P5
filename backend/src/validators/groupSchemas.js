const { z, requiredText } = require("./common");

const groupBody = z.object({
  name: requiredText("nome", 64),
  prefix: z
    .string({
      required_error: 'O campo "prefixo" é obrigatório.',
      invalid_type_error: 'O campo "prefixo" deve ser um texto.',
    })
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{1,5}$/, "O prefixo deve ter de 1 a 5 letras ou números, sem espaços."),
});

module.exports = { groupBody };
