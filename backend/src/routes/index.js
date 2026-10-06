// Junta todas as rotas da API.
// Rotas públicas: /, /health e /auth. Todo o resto exige token (ensureAuthenticated).
const { Router } = require("express");
const db = require("../database/pool");
const ensureAuthenticated = require("../middlewares/ensureAuthenticated");
const authRoutes = require("./auth.routes");
const usersRoutes = require("./users.routes");
const groupsRoutes = require("./groups.routes");
const ticketsRoutes = require("./tickets.routes");

const router = Router();

router.get("/", (req, res) => {
  res.json({ name: "EasyDesk API", status: "ok" });
});

// Usado por serviços de deploy e por você para checar se a API e o banco estão no ar.
router.get("/health", async (req, res) => {
  try {
    await db.query("SELECT 1");
    res.json({ status: "ok", database: "ok" });
  } catch {
    res.status(503).json({ status: "error", database: "indisponível" });
  }
});

router.use("/auth", authRoutes);
router.use("/users", ensureAuthenticated, usersRoutes);
router.use("/groups", ensureAuthenticated, groupsRoutes);
router.use("/tickets", ensureAuthenticated, ticketsRoutes);

module.exports = router;
