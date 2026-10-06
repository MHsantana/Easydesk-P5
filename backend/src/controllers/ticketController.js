const ticketService = require("../services/ticketService");

async function index(req, res) {
  res.json(await ticketService.list(req.validated.query));
}

async function show(req, res) {
  res.json(await ticketService.getById(req.validated.params.id));
}

async function create(req, res) {
  const ticket = await ticketService.create(req.validated.body, req.user.id);
  res.status(201).json(ticket);
}

async function update(req, res) {
  res.json(await ticketService.update(req.validated.params.id, req.validated.body));
}

async function changeStatus(req, res) {
  const { id } = req.validated.params;
  const { status } = req.validated.body;
  res.json(await ticketService.changeStatus(id, status));
}

async function remove(req, res) {
  await ticketService.remove(req.validated.params.id);
  res.status(204).end();
}

async function listComments(req, res) {
  res.json(await ticketService.listComments(req.validated.params.id));
}

async function addComment(req, res) {
  const comment = await ticketService.addComment(
    req.validated.params.id,
    req.validated.body,
    req.user.id,
  );
  res.status(201).json(comment);
}

async function removeComment(req, res) {
  const { id, commentId } = req.validated.params;
  await ticketService.removeComment(id, commentId);
  res.status(204).end();
}

module.exports = {
  index,
  show,
  create,
  update,
  changeStatus,
  remove,
  listComments,
  addComment,
  removeComment,
};
