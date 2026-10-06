// Camada de comunicação com o backend (API REST).
// Todo o resto do frontend fala com o servidor SÓ por aqui.
// Ela cuida de:
// - enviar o token JWT em cada requisição;
// - transformar erros HTTP em mensagens claras;
// - converter os campos da API (inglês) para os nomes usados na tela (português).
(function () {
  const API_URL = window.APP_CONFIG.API_URL.replace(/\/$/, "");
  const TOKEN_KEY = "easydesk_token";
  const REQUEST_TIMEOUT_MS = 70000; // o servidor gratuito pode levar até ~1 min para "acordar"
  const SLOW_REQUEST_MS = 5000;

  class ApiError extends Error {
    constructor(message, status, details) {
      super(message);
      this.name = "ApiError";
      this.status = status; // 0 = sem resposta do servidor
      this.details = details;
    }
  }

  // ---------- Token (sessão) ----------
  // Só o token fica no navegador. Os dados (grupos, chamados) ficam no servidor.

  function getToken() {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  }

  function setToken(token) {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      /* navegador sem armazenamento: a sessão dura até fechar a aba */
    }
  }

  function clearToken() {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* nada a fazer */
    }
  }

  // ---------- Eventos para a interface ----------

  let pendingRequests = 0;
  const handlers = {
    loadingChange: () => {},
    unauthorized: () => {},
    slowRequest: () => {},
  };

  function setPending(delta) {
    const wasLoading = pendingRequests > 0;
    pendingRequests += delta;
    const isLoading = pendingRequests > 0;
    if (wasLoading !== isLoading) handlers.loadingChange(isLoading);
  }

  // ---------- Requisição genérica ----------

  async function request(method, path, body, { auth = true } = {}) {
    const headers = { Accept: "application/json" };
    if (body !== undefined) headers["Content-Type"] = "application/json";

    const token = getToken();
    if (auth && token) headers.Authorization = `Bearer ${token}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    const slowTimer = setTimeout(() => handlers.slowRequest(), SLOW_REQUEST_MS);

    setPending(1);
    let response;
    try {
      response = await fetch(API_URL + path, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
    } catch (error) {
      throw new ApiError(
        error.name === "AbortError"
          ? "O servidor demorou demais para responder. Tente novamente."
          : "Erro de conexão com o servidor. Verifique sua internet ou se a API está no ar.",
        0,
      );
    } finally {
      clearTimeout(timeout);
      clearTimeout(slowTimer);
      setPending(-1);
    }

    if (response.status === 204) return null;

    let data = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok) {
      // Em erros de validação, a primeira mensagem detalhada é a mais útil para o usuário.
      const message =
        data?.details?.[0]?.message || data?.message || `Erro inesperado (${response.status}).`;

      // Token ausente, inválido ou expirado: encerra a sessão.
      if (response.status === 401 && auth) {
        clearToken();
        handlers.unauthorized(message);
      }

      throw new ApiError(message, response.status, data?.details);
    }

    return data;
  }

  // ---------- Conversão API (inglês) -> tela (português) ----------

  function toGroup(group) {
    return {
      id: group.id,
      nome: group.name,
      prefixo: group.prefix,
      totalChamados: group.totalTickets,
      chamadosAbertos: group.openTickets,
    };
  }

  function toComment(comment) {
    return {
      id: comment.id,
      autor: comment.author,
      texto: comment.body,
      data: comment.createdAt,
    };
  }

  function toTicket(ticket) {
    return {
      id: ticket.id,
      codigo: ticket.code,
      grupoId: ticket.groupId,
      titulo: ticket.title,
      descricao: ticket.description,
      solicitante: ticket.requester,
      responsavel: ticket.owner,
      criticidade: ticket.priority,
      status: ticket.status,
      data: ticket.openedOn,
      comentarios: (ticket.comments || []).map(toComment),
    };
  }

  // ---------- Funções usadas pela tela ----------

  async function authenticate(path, body) {
    const { user, token } = await request("POST", path, body, { auth: false });
    setToken(token);
    return user;
  }

  window.ApiError = ApiError;

  window.Api = {
    hasToken: () => Boolean(getToken()),
    on(event, handler) {
      handlers[event] = handler;
    },

    // Autenticação
    login: (email, password) => authenticate("/auth/login", { email, password }),
    register: (name, email, password) => authenticate("/auth/register", { name, email, password }),
    me: () => request("GET", "/users/me"),
    logout: clearToken,

    // Grupos
    listGroups: async () => (await request("GET", "/groups")).map(toGroup),
    createGroup: async ({ nome, prefixo }) =>
      toGroup(await request("POST", "/groups", { name: nome, prefix: prefixo })),
    deleteGroup: (id) => request("DELETE", `/groups/${id}`),

    // Chamados
    listTickets: async () => (await request("GET", "/tickets")).map(toTicket),
    createTicket: async (chamado) =>
      toTicket(
        await request("POST", "/tickets", {
          groupId: Number(chamado.grupoId),
          title: chamado.titulo,
          description: chamado.descricao,
          requester: chamado.solicitante,
          owner: chamado.responsavel || null,
          priority: chamado.criticidade,
          openedOn: chamado.data || undefined,
        }),
      ),
    changeStatus: async (id, status) =>
      toTicket(await request("PATCH", `/tickets/${id}/status`, { status })),
    deleteTicket: (id) => request("DELETE", `/tickets/${id}`),

    // Comentários
    addComment: async (ticketId, { autor, texto }) =>
      toComment(
        await request("POST", `/tickets/${ticketId}/comments`, {
          author: autor || null,
          body: texto,
        }),
      ),
  };
})();
