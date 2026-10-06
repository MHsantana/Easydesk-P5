// Regras de negócio dos grupos.
const AppError = require("../errors/AppError");
const groupRepository = require("../repositories/groupRepository");

const NOT_FOUND = "Grupo não encontrado.";

// Converte a violação de índice único do banco em uma mensagem clara (409 Conflict).
function translateUniqueViolation(error) {
  if (error.code === "23505") {
    if (error.constraint === "ticket_groups_prefix_unique") {
      return AppError.conflict("Já existe um grupo com este prefixo.");
    }
    if (error.constraint === "ticket_groups_name_unique") {
      return AppError.conflict("Já existe um grupo com este nome.");
    }
  }
  return error;
}

async function list() {
  return groupRepository.findAll();
}

async function getById(id) {
  const group = await groupRepository.findById(id);
  if (!group) throw AppError.notFound(NOT_FOUND);
  return group;
}

async function create({ name, prefix }, userId) {
  try {
    const id = await groupRepository.create({ name, prefix, createdBy: userId });
    return groupRepository.findById(id);
  } catch (error) {
    throw translateUniqueViolation(error);
  }
}

/**
 * Atualiza nome e prefixo. Os códigos dos chamados que já existem
 * (ex.: INF-001) são mantidos; só os novos chamados usam o prefixo novo.
 */
async function update(id, { name, prefix }) {
  let updated;
  try {
    updated = await groupRepository.update(id, { name, prefix });
  } catch (error) {
    throw translateUniqueViolation(error);
  }
  if (!updated) throw AppError.notFound(NOT_FOUND);
  return groupRepository.findById(id);
}

async function remove(id) {
  const removed = await groupRepository.remove(id);
  if (!removed) throw AppError.notFound(NOT_FOUND);
}

module.exports = { list, getById, create, update, remove };
