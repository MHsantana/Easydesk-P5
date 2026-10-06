// Lê e valida as variáveis de ambiente em um único lugar.
// Assim o resto do código nunca acessa process.env diretamente.
const path = require("node:path");

require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });

const nodeEnv = process.env.NODE_ENV || "development";
const isTest = nodeEnv === "test";
const isProduction = nodeEnv === "production";

function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Variável de ambiente obrigatória ausente: ${name}. Veja o arquivo .env.example.`,
    );
  }
  return value;
}

const jwtSecret = required("JWT_SECRET");

if (isProduction && jwtSecret.length < 32) {
  throw new Error("JWT_SECRET precisa ter pelo menos 32 caracteres em produção.");
}

const env = {
  nodeEnv,
  isTest,
  isProduction,
  port: Number(process.env.PORT) || 3333,
  // Os testes usam um banco separado para nunca apagar seus dados de desenvolvimento.
  databaseUrl: isTest ? required("TEST_DATABASE_URL") : required("DATABASE_URL"),
  databaseSsl: process.env.DATABASE_SSL === "true",
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "1d",
  corsOrigins: (process.env.CORS_ORIGIN || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  // Custo do bcrypt: 10 é um bom padrão; nos testes usamos 4 para rodar rápido.
  bcryptRounds: isTest ? 4 : 10,
};

module.exports = env;
