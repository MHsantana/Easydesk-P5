const userService = require("../services/userService");

async function me(req, res) {
  res.json(await userService.getProfile(req.user.id));
}

async function updateMe(req, res) {
  res.json(await userService.updateProfile(req.user.id, req.validated.body));
}

async function changePassword(req, res) {
  await userService.changePassword(req.user.id, req.validated.body);
  res.status(204).end();
}

async function deleteMe(req, res) {
  await userService.deleteAccount(req.user.id, req.validated.body);
  res.status(204).end();
}

module.exports = { me, updateMe, changePassword, deleteMe };
