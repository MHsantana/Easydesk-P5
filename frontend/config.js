// Configuração do frontend.
// API_URL é o endereço do backend:
// - abrindo o site no seu computador (localhost, 127.0.0.1 ou o arquivo direto), usa a API local;
// - publicado na internet, usa o endereço do backend publicado.
// Depois do deploy, troque PRODUCTION_API_URL pelo endereço do seu backend no Render.
(function () {
  const PRODUCTION_API_URL = "https://SEU-BACKEND.onrender.com";

  const isLocal = ["localhost", "127.0.0.1", ""].includes(window.location.hostname);

  window.APP_CONFIG = {
    API_URL: isLocal ? "http://localhost:3333" : PRODUCTION_API_URL,
  };
})();
