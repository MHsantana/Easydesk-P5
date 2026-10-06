// Responde 404 para qualquer rota que não exista.
function notFound(req, res) {
  res.status(404).json({ message: `Rota não encontrada: ${req.method} ${req.path}` });
}

module.exports = notFound;
