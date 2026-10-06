// Regras de cadastro e login.
const bcrypt = require("bcryptjs");
const env = require("../config/env");
const AppError = require("../errors/AppError");
const userRepository = require("../repositories/userRepository");
const { signToken } = require("../utils/token");

const INVALID_CREDENTIALS = "E-mail ou senha incorretos.";
const EMAIL_IN_USE = "Este e-mail já está cadastrado.";

// Hash "falso" usado quando o e-mail não existe. Comparar com ele leva o mesmo tempo
// que comparar com um hash real, então um atacante não descobre quais e-mails
// estão cadastrados medindo o tempo de resposta do login.
const DUMMY_HASH = bcrypt.hashSync("senha-que-nao-existe", env.bcryptRounds);

function isEmailUniqueViolation(error) {
  return error.code === "23505" && error.constraint === "users_email_unique";
}

async function register({ name, email, password }) {
  if (await userRepository.emailTakenByAnother(email)) {
    throw AppError.conflict(EMAIL_IN_USE);
  }

  // A senha nunca é salva: guardamos apenas o hash bcrypt (que já inclui o "salt").
  const passwordHash = await bcrypt.hash(password, env.bcryptRounds);

  let user;
  try {
    user = await userRepository.create({ name, email, passwordHash });
  } catch (error) {
    // Dois cadastros simultâneos com o mesmo e-mail: o índice único do banco barra o segundo.
    if (isEmailUniqueViolation(error)) throw AppError.conflict(EMAIL_IN_USE);
    throw error;
  }

  return { user, token: signToken(user.id) };
}

async function login({ email, password }) {
  const credentials = await userRepository.findCredentialsByEmail(email);

  const passwordMatches = await bcrypt.compare(
    password,
    credentials ? credentials.passwordHash : DUMMY_HASH,
  );

  // Mesma mensagem para "e-mail não existe" e "senha errada": não revelamos qual dos dois falhou.
  if (!credentials || !passwordMatches) {
    throw AppError.unauthorized(INVALID_CREDENTIALS);
  }

  const { passwordHash, ...user } = credentials;
  return { user, token: signToken(user.id) };
}

module.exports = { register, login, isEmailUniqueViolation, EMAIL_IN_USE };
