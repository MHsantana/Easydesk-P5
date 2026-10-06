// Roda antes de cada arquivo de teste.
// NODE_ENV=test faz a API usar TEST_DATABASE_URL (banco separado, que é apagado nos testes).
process.env.NODE_ENV = "test";
process.env.JWT_SECRET =
  process.env.JWT_SECRET || "segredo-apenas-para-testes-automatizados-0123456789";
