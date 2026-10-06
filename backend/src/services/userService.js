// Regras da conta do usuário logado (/users/me).
const bcrypt = require("bcryptjs");
const env = require("../config/env");
const AppError = require("../errors/AppError");
const userRepository = require("../repositories/userRepository");
const { isEmailUniqueViolation, EMAIL_IN_USE } = require("./authService");

async function getProfile(userId) {
  const user = await userRepository.findById(userId);
  if (!user) throw AppError.notFound("Usuário não encontrado.");
  return user;
}

async function updateProfile(userId, { name, email }) {
  if (await userRepository.emailTakenByAnother(email, userId)) {
    throw AppError.conflict(EMAIL_IN_USE);
  }

  try {
    const user = await userRepository.updateProfile(userId, { name, email });
    if (!user) throw AppError.notFound("Usuário não encontrado.");
    return user;
  } catch (error) {
    if (isEmailUniqueViolation(error)) throw AppError.conflict(EMAIL_IN_USE);
    throw error;
  }
}

async function assertPassword(userId, password, message) {
  const hash = await userRepository.findPasswordHashById(userId);
  if (!hash) throw AppError.notFound("Usuário não encontrado.");

  const matches = await bcrypt.compare(password, hash);
  if (!matches) throw AppError.badRequest(message);
}

async function changePassword(userId, { currentPassword, newPassword }) {
  await assertPassword(userId, currentPassword, "Senha atual incorreta.");

  const passwordHash = await bcrypt.hash(newPassword, env.bcryptRounds);
  await userRepository.updatePasswordHash(userId, passwordHash);
}

async function deleteAccount(userId, { password }) {
  await assertPassword(userId, password, "Senha incorreta.");
  await userRepository.remove(userId);
}

module.exports = { getProfile, updateProfile, changePassword, deleteAccount };
