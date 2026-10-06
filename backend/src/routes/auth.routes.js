const { Router } = require("express");
const rateLimit = require("express-rate-limit");
const env = require("../config/env");
const validate = require("../middlewares/validate");
const authController = require("../controllers/authController");
const { registerBody, loginBody } = require("../validators/authSchemas");

const router = Router();

// Limita tentativas de login/cadastro por IP para dificultar ataques de força bruta.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skip: () => env.isTest,
  message: { message: "Muitas tentativas. Aguarde alguns minutos e tente novamente." },
});

router.post("/register", authLimiter, validate({ body: registerBody }), authController.register);
router.post("/login", authLimiter, validate({ body: loginBody }), authController.login);

module.exports = router;
