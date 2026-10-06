// Ponto de entrada: atualiza o banco (migrations) e abre a porta HTTP.
const env = require("./config/env");
const app = require("./app");
const { pool } = require("./database/pool");
const { runMigrations } = require("./database/migrate");

async function start() {
  await runMigrations();

  const server = app.listen(env.port, () => {
    console.log(`EasyDesk API rodando em http://localhost:${env.port} (${env.nodeEnv})`);
    if (env.isProduction && env.corsOrigins.length === 0) {
      console.warn("[aviso] CORS_ORIGIN vazio: qualquer site pode chamar esta API.");
    }
  });

  server.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
      console.error(
        `A porta ${env.port} já está em uso. Feche o outro processo ou mude PORT no .env.`,
      );
    } else {
      console.error(error);
    }
    process.exit(1);
  });

  // Encerramento limpo (Ctrl+C ou parada pelo provedor de nuvem).
  const shutdown = () => {
    server.close(() => pool.end().then(() => process.exit(0)));
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

start().catch((error) => {
  console.error("Falha ao iniciar a API:", error.message);
  process.exit(1);
});
