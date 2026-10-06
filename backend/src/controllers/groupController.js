const groupService = require("../services/groupService");

async function index(req, res) {
  res.json(await groupService.list());
}

async function show(req, res) {
  res.json(await groupService.getById(req.validated.params.id));
}

async function create(req, res) {
  const group = await groupService.create(req.validated.body, req.user.id);
  res.status(201).json(group);
}

async function update(req, res) {
  res.json(await groupService.update(req.validated.params.id, req.validated.body));
}

async function remove(req, res) {
  await groupService.remove(req.validated.params.id);
  res.status(204).end();
}

module.exports = { index, show, create, update, remove };
