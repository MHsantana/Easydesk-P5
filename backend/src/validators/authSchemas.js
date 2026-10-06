const { z, requiredText } = require("./common");

const emailSchema = z
  .string({
    required_error: 'O campo "e-mail" é obrigatório.',
    invalid_type_error: 'O campo "e-mail" deve ser um texto.',
  })
  .trim()
  .toLowerCase()
  .max(254, "E-mail muito longo.")
  .email("E-mail inválido.");

// O bcrypt só considera os primeiros 72 bytes da senha, por isso o limite.
const passwordSchema = z
  .string({
    required_error: 'O campo "senha" é obrigatório.',
    invalid_type_error: 'O campo "senha" deve ser um texto.',
  })
  .min(8, "A senha deve ter pelo menos 8 caracteres.")
  .refine((value) => Buffer.byteLength(value, "utf8") <= 72, "A senha é muito longa.");

const registerBody = z.object({
  name: requiredText("nome", 64),
  email: emailSchema,
  password: passwordSchema,
});

const loginBody = z.object({
  email: emailSchema,
  // No login não revelamos regras de senha: só exigimos que venha algo.
  password: z
    .string({ required_error: 'O campo "senha" é obrigatório.' })
    .min(1, 'O campo "senha" é obrigatório.')
    .max(200, "Senha inválida."),
});

const updateProfileBody = z.object({
  name: requiredText("nome", 64),
  email: emailSchema,
});

const changePasswordBody = z.object({
  currentPassword: z
    .string({ required_error: 'O campo "senha atual" é obrigatório.' })
    .min(1, 'O campo "senha atual" é obrigatório.')
    .max(200, "Senha inválida."),
  newPassword: passwordSchema,
});

const deleteAccountBody = z.object({
  password: z
    .string({ required_error: "Confirme sua senha para excluir a conta." })
    .min(1, "Confirme sua senha para excluir a conta.")
    .max(200, "Senha inválida."),
});

module.exports = {
  registerBody,
  loginBody,
  updateProfileBody,
  changePasswordBody,
  deleteAccountBody,
};
