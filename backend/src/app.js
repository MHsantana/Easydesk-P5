// Monta a aplicação Express (sem abrir a porta).
// Separar app.js de server.js permite que os testes usem a app sem subir um servidor real.
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const env = require("./config/env");
const routes = require("./routes");
const notFound = require("./middlewares/notFound");
const errorHandler = require("./middlewares/errorHandler");

const app = express();

// Em produção a API fica atrás do proxy do provedor de nuvem;
// isso faz o Express enxergar o IP real do cliente (usado no limite de tentativas).
if (env.isProduction) app.set("trust proxy", 1);

app.use(helmet()); // cabeçalhos HTTP de segurança

// CORS: autoriza o navegador a chamar a API a partir do endereço do frontend.
app.use(
  cors({
    origin: env.corsOrigins.length > 0 ? env.corsOrigins : true,
  }),
);

app.use(express.json({ limit: "100kb" }));

if (!env.isTest) app.use(morgan("dev")); // log de cada requisição no terminal

app.use(routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
