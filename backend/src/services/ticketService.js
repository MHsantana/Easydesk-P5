// Regras de negócio dos chamados e comentários.
const AppError = require("../errors/AppError");
const { withTransaction } = require("../database/pool");
const groupRepository = require("../repositories/groupRepository");
const ticketRepository = require("../repositories/ticketRepository");
const userRepository = require("../repositories/userRepository");

const NOT_FOUND = "Chamado não encontrado.";

// Fluxo de status permitido (o mesmo dos botões do frontend, e qualquer
// chamado ainda aberto pode ser cancelado). Concluído e Cancelado são finais.
const STATUS_TRANSITIONS = {
  Pendente: ["Em Progresso", "Cancelado"],
  "Em Progresso": ["Pausado", "Concluído", "Cancelado"],
  Pausado: ["Em Progresso", "Cancelado"],
  Concluído: [],
  Cancelado: [],
};

function formatCode(prefix, number) {
  return `${prefix}-${String(number).padStart(3, "0")}`;
}

async function list(filters) {
  return ticketRepository.findAll(filters);
}

async function getById(id) {
  const ticket = await ticketRepository.findById(id);
  if (!ticket) throw AppError.notFound(NOT_FOUND);
  return ticket;
}

async function create(data, userId) {
  // Transação: reservar o número do código e inserir o chamado acontecem juntos.
  // Se o INSERT falhar, o número reservado é devolvido (ROLLBACK).
  const id = await withTransaction(async (client) => {
    const group = await groupRepository.nextTicketNumber(client, data.groupId);
    if (!group) throw AppError.notFound("Grupo não encontrado.");

    return ticketRepository.create(client, {
      ...data,
      code: formatCode(group.prefix, group.ticketSeq),
      createdBy: userId,
    });
  });

  return ticketRepository.findById(id);
}

async function update(id, data) {
  const updated = await ticketRepository.update(id, data);
  if (!updated) throw AppError.notFound(NOT_FOUND);
  return ticketRepository.findById(id);
}

async function changeStatus(id, newStatus) {
  const currentStatus = await ticketRepository.findStatus(id);
  if (!currentStatus) throw AppError.notFound(NOT_FOUND);

  if (currentStatus === newStatus) {
    throw AppError.conflict(`O chamado já está com o status "${newStatus}".`);
  }

  const allowed = STATUS_TRANSITIONS[currentStatus] || [];
  if (!allowed.includes(newStatus)) {
    throw AppError.conflict(
      `Não é possível mudar o status de "${currentStatus}" para "${newStatus}".`,
    );
  }

  const changed = await ticketRepository.updateStatus(id, currentStatus, newStatus);
  if (!changed) {
    // Outra pessoa mudou o status entre a leitura e a gravação.
    throw AppError.conflict("O chamado foi alterado por outra pessoa. Atualize e tente novamente.");
  }

  return ticketRepository.findById(id);
}

async function remove(id) {
  const removed = await ticketRepository.remove(id);
  if (!removed) throw AppError.notFound(NOT_FOUND);
}

// ---------- Comentários ----------

async function listComments(ticketId) {
  if (!(await ticketRepository.exists(ticketId))) throw AppError.notFound(NOT_FOUND);
  return ticketRepository.findComments(ticketId);
}

async function addComment(ticketId, { author, body }, userId) {
  if (!(await ticketRepository.exists(ticketId))) throw AppError.notFound(NOT_FOUND);

  // Sem autor informado, usamos o nome de quem está logado (cortado em 32 caracteres).
  let commentAuthor = author;
  if (!commentAuthor) {
    const user = await userRepository.findById(userId);
    commentAuthor = (user?.name || "Usuário").slice(0, 32);
  }

  return ticketRepository.createComment({
    ticketId,
    author: commentAuthor,
    body,
    createdBy: userId,
  });
}

async function removeComment(ticketId, commentId) {
  const removed = await ticketRepository.removeComment(commentId, ticketId);
  if (!removed) throw AppError.notFound("Comentário não encontrado.");
}

module.exports = {
  STATUS_TRANSITIONS,
  list,
  getById,
  create,
  update,
  changeStatus,
  remove,
  listComments,
  addComment,
  removeComment,
};
