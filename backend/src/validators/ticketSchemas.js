const { z, requiredText, optionalText, idSchema, dateSchema } = require("./common");

const PRIORITIES = ["Baixa", "Média", "Alta", "Crítica"];
const STATUSES = ["Pendente", "Em Progresso", "Pausado", "Concluído", "Cancelado"];
const ACTIVE_STATUSES = ["Pendente", "Em Progresso", "Pausado"];
const FINISHED_STATUSES = ["Concluído", "Cancelado"];

const priorityField = z.enum(PRIORITIES, {
  errorMap: () => ({ message: `Criticidade inválida. Use: ${PRIORITIES.join(", ")}.` }),
});

const statusField = z.enum(STATUSES, {
  errorMap: () => ({ message: `Status inválido. Use: ${STATUSES.join(", ")}.` }),
});

const ticketFields = {
  title: requiredText("título", 64),
  description: requiredText("descrição", 4000),
  requester: requiredText("solicitante", 64),
  owner: optionalText("responsável", 64),
  priority: priorityField,
  openedOn: dateSchema.optional(),
};

const createTicketBody = z.object({
  groupId: idSchema("grupo"),
  ...ticketFields,
});

// PUT substitui os dados editáveis do chamado. Grupo e código não mudam;
// o status tem rota própria porque segue um fluxo (veja ticketService).
const updateTicketBody = z.object(ticketFields);

const updateStatusBody = z.object({ status: statusField });

const listTicketsQuery = z.object({
  groupId: idSchema("grupo").optional(),
  status: z
    .enum(["Todos", "Ativos", "Finalizados", ...STATUSES], {
      errorMap: () => ({
        message: `Filtro de status inválido. Use: Todos, Ativos, Finalizados, ${STATUSES.join(", ")}.`,
      }),
    })
    .default("Todos"),
  search: z.string().trim().max(100, "Busca muito longa.").optional(),
  sort: z
    .enum(["newest", "oldest", "priority"], {
      errorMap: () => ({ message: "Ordenação inválida. Use: newest, oldest ou priority." }),
    })
    .default("newest"),
});

const commentParams = z.object({
  id: idSchema("chamado"),
  commentId: idSchema("comentário"),
});

const createCommentBody = z.object({
  // Se não vier autor, usamos o nome do usuário logado.
  author: optionalText("autor", 32),
  body: requiredText("comentário", 4000),
});

module.exports = {
  PRIORITIES,
  STATUSES,
  ACTIVE_STATUSES,
  FINISHED_STATUSES,
  createTicketBody,
  updateTicketBody,
  updateStatusBody,
  listTicketsQuery,
  commentParams,
  createCommentBody,
};
