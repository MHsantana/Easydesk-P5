// =====================================================================
// EasyDesk - Painel de Chamados
// Os dados agora vêm do servidor (API) em vez do localStorage.
// A comunicação com o servidor fica no arquivo api.js.
// =====================================================================

// Elementos da tela

const authScreen = document.querySelector("#auth-screen");
const appScreen = document.querySelector(".app");
const loginForm = document.querySelector("#login-form");
const registerForm = document.querySelector("#register-form");
const authTabs = document.querySelectorAll(".auth-tab");
const userNameLabel = document.querySelector("#user-name");
const logoutBtn = document.querySelector("#logout-btn");
const loadingBar = document.querySelector("#loading-bar");
const toastContainer = document.querySelector("#toast-container");

const btnChamados = document.querySelector(".view-btn:first-child");
const btnGrupos = document.querySelector(".view-btn:last-child");
const ticketsView = document.querySelector(".tickets-view");
const groupsView = document.querySelector(".groups-view");
const ticketSearch = document.querySelector(".ticket-search");
const statusFilter = document.querySelector(".status-filter");
const sortTickets = document.querySelector("#sort-tickets");
const ticketForm = document.querySelector("#ticket-form");
const ticketsList = document.querySelector(".tickets-list");
const newTicketBtn = document.querySelector("#new-ticket-btn");
const ticketModal = document.querySelector("#ticket-modal");
const closeTicketModalBtn = document.querySelector(".close-ticket-modal");
const ticketGroupSelect = document.querySelector("#ticket-group");
const topbarGroupSelect = document.querySelector("#group-select");
const toggleAllTickets = document.querySelector("#toggle-all-tickets");

const newGroupBtn = document.querySelector("#new-group-btn");
const groupModal = document.querySelector("#group-modal");
const closeModalBtn = document.querySelector(".close-modal");
const groupForm = document.querySelector("#group-form");
const groupsList = document.querySelector(".groups-list");

// Estado da aplicação

let usuarioAtual = null;
let grupos = [];
let chamados = [];
let dadosCarregados = false;
let carregandoDados = false;
let recarregarDepois = false;
let ultimaVersaoDosDados = "";

let ticketsExpandidos = new Set();
let todosExpandidos = false;

// De quanto em quanto tempo a tela busca novidades no servidor
// (para ver mudanças feitas por outras pessoas ou em outro dispositivo).
const INTERVALO_ATUALIZACAO_MS = 30000;

// =====================================================================
// Utilidades
// =====================================================================

// Os dados vêm do servidor e são digitados por outras pessoas.
// Escapar o HTML impede que alguém injete código na tela de todos (XSS).
function escapeHtml(valor) {
  return String(valor ?? "").replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char],
  );
}

// "2026-10-06" -> "06/10/2026"
function formatarData(dataIso) {
  if (!dataIso) return "-";
  const [ano, mes, dia] = dataIso.split("-");
  return `${dia}/${mes}/${ano}`;
}

function formatarDataHora(dataIso) {
  const data = new Date(dataIso);
  return Number.isNaN(data.getTime()) ? "" : data.toLocaleString("pt-BR");
}

// Data de hoje no formato do <input type="date"> (AAAA-MM-DD), no fuso do usuário.
function hojeIso() {
  const hoje = new Date();
  const mes = String(hoje.getMonth() + 1).padStart(2, "0");
  const dia = String(hoje.getDate()).padStart(2, "0");
  return `${hoje.getFullYear()}-${mes}-${dia}`;
}

function mostrarMensagem(texto, tipo = "erro") {
  const toast = document.createElement("div");
  toast.className = `toast toast-${tipo}`;
  toast.textContent = texto;
  toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.classList.add("saindo");
    setTimeout(() => toast.remove(), 300);
  }, 4500);
}

// Desativa o botão e troca o texto enquanto espera o servidor,
// evitando cliques duplos (e registros duplicados).
async function comBotaoOcupado(botao, textoOcupado, acao) {
  const textoOriginal = botao.textContent;
  botao.disabled = true;
  botao.textContent = textoOcupado;
  try {
    return await acao();
  } finally {
    botao.disabled = false;
    botao.textContent = textoOriginal;
  }
}

// =====================================================================
// Eventos vindos da camada de API
// =====================================================================

Api.on("loadingChange", (carregando) => {
  loadingBar.classList.toggle("active", carregando);
});

let avisoServidorLentoMostrado = false;
Api.on("slowRequest", () => {
  if (avisoServidorLentoMostrado) return;
  avisoServidorLentoMostrado = true;
  mostrarMensagem("O servidor está iniciando, isso pode levar até 1 minuto...", "info");
});

Api.on("unauthorized", (mensagem) => {
  if (!usuarioAtual) return;
  encerrarSessao();
  mostrarMensagem(mensagem || "Sua sessão expirou. Faça login novamente.");
});

// =====================================================================
// Login, cadastro e sessão
// =====================================================================

function mostrarTelaLogin() {
  appScreen.classList.add("hidden");
  authScreen.classList.remove("hidden");
}

function mostrarApp() {
  authScreen.classList.add("hidden");
  appScreen.classList.remove("hidden");
  userNameLabel.textContent = usuarioAtual ? usuarioAtual.name : "";
  userNameLabel.title = usuarioAtual ? usuarioAtual.email : "";
}

function encerrarSessao() {
  Api.logout();
  usuarioAtual = null;
  grupos = [];
  chamados = [];
  dadosCarregados = false;
  ultimaVersaoDosDados = "";
  ticketsExpandidos.clear();
  groupModal.classList.add("hidden");
  ticketModal.classList.add("hidden");
  mostrarTelaLogin();
}

function trocarAbaAuth(aba) {
  authTabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.tab === aba));
  loginForm.classList.toggle("hidden", aba !== "login");
  registerForm.classList.toggle("hidden", aba !== "register");
  document.querySelectorAll(".auth-error").forEach((erro) => (erro.textContent = ""));
}

authTabs.forEach((tab) => {
  tab.addEventListener("click", () => trocarAbaAuth(tab.dataset.tab));
});

async function entrarNoApp(usuario) {
  usuarioAtual = usuario;
  loginForm.reset();
  registerForm.reset();
  mostrarApp();
  await carregarDados();
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const erro = loginForm.querySelector(".auth-error");
  const email = document.querySelector("#login-email").value.trim();
  const senha = document.querySelector("#login-password").value;

  erro.textContent = "";
  if (!email || !senha) {
    erro.textContent = "Preencha e-mail e senha.";
    return;
  }

  await comBotaoOcupado(loginForm.querySelector("button[type=submit]"), "Entrando...", async () => {
    try {
      const usuario = await Api.login(email, senha);
      await entrarNoApp(usuario);
    } catch (error) {
      erro.textContent = error.message;
    }
  });
});

registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const erro = registerForm.querySelector(".auth-error");
  const nome = document.querySelector("#register-name").value.trim();
  const email = document.querySelector("#register-email").value.trim();
  const senha = document.querySelector("#register-password").value;
  const confirmacao = document.querySelector("#register-password-confirm").value;

  erro.textContent = "";
  if (!nome || !email || !senha) {
    erro.textContent = "Preencha nome, e-mail e senha.";
    return;
  }
  if (senha.length < 8) {
    erro.textContent = "A senha deve ter pelo menos 8 caracteres.";
    return;
  }
  if (senha !== confirmacao) {
    erro.textContent = "As senhas não conferem.";
    return;
  }

  await comBotaoOcupado(
    registerForm.querySelector("button[type=submit]"),
    "Criando conta...",
    async () => {
      try {
        const usuario = await Api.register(nome, email, senha);
        await entrarNoApp(usuario);
        mostrarMensagem(`Conta criada. Bem-vindo(a), ${usuario.name}!`, "sucesso");
      } catch (error) {
        erro.textContent = error.message;
      }
    },
  );
});

logoutBtn.addEventListener("click", () => {
  encerrarSessao();
  trocarAbaAuth("login");
});

// Ao abrir a página: se já existe um token salvo, tenta continuar a sessão.
async function iniciar() {
  if (!Api.hasToken()) {
    mostrarTelaLogin();
    return;
  }

  try {
    usuarioAtual = await Api.me();
  } catch (error) {
    if (error.status === 401) {
      encerrarSessao();
      return;
    }
    // Servidor fora do ar: mostra o painel com a mensagem de erro e opção de tentar de novo.
  }

  mostrarApp();
  await carregarDados();
}

// =====================================================================
// Carregamento dos dados
// =====================================================================

function mostrarEstadoNasListas(htmlChamados, htmlGrupos) {
  ticketsList.innerHTML = `<div class="empty-state">${htmlChamados}</div>`;
  groupsList.innerHTML = `<div class="empty-state">${htmlGrupos}</div>`;
}

function mostrarErroNasListas(mensagem) {
  const html = `
    <p>${escapeHtml(mensagem)}</p>
    <p><button class="secondary-btn retry-btn">Tentar novamente</button></p>
  `;
  mostrarEstadoNasListas(html, html);
  document.querySelectorAll(".retry-btn").forEach((botao) => {
    botao.addEventListener("click", iniciar);
  });
}

/**
 * Busca grupos e chamados no servidor e redesenha a tela.
 * silencioso = atualização automática em segundo plano (sem mensagens de erro).
 */
async function carregarDados({ silencioso = false } = {}) {
  if (carregandoDados) {
    // Já existe uma busca em andamento: faz outra assim que ela terminar,
    // para não perder uma alteração que acabou de ser feita.
    recarregarDepois = true;
    return;
  }

  carregandoDados = true;
  if (!dadosCarregados && !silencioso) {
    mostrarEstadoNasListas("<p>Carregando chamados...</p>", "<p>Carregando grupos...</p>");
  }

  try {
    const [novosGrupos, novosChamados] = await Promise.all([
      Api.listGroups(),
      Api.listTickets(),
    ]);

    const versao = JSON.stringify([novosGrupos, novosChamados]);
    const mudou = versao !== ultimaVersaoDosDados;

    grupos = novosGrupos;
    chamados = novosChamados;
    dadosCarregados = true;
    ultimaVersaoDosDados = versao;

    // Só redesenha se algo mudou (evita perder a rolagem dos comentários à toa).
    if (mudou) {
      populateGroupSelects();
      refreshUI();
    }
  } catch (error) {
    if (error.status === 401) return; // a sessão já foi encerrada pelo evento "unauthorized"
    if (silencioso) return;
    if (!dadosCarregados) {
      mostrarErroNasListas(error.message);
    } else {
      mostrarMensagem(error.message);
    }
  } finally {
    carregandoDados = false;
    if (recarregarDepois) {
      recarregarDepois = false;
      carregarDados({ silencioso: true });
    }
  }
}

// Atualização automática: não atrapalha quem está digitando ou com um formulário aberto.
function usuarioEstaEditando() {
  const modalAberto =
    !groupModal.classList.contains("hidden") || !ticketModal.classList.contains("hidden");
  const focoEmComentario = document.activeElement?.closest?.(".comment-form");
  const temRascunho = [...document.querySelectorAll(".comment-text")].some((campo) =>
    campo.value.trim(),
  );
  return modalAberto || Boolean(focoEmComentario) || temRascunho;
}

function atualizarEmSegundoPlano() {
  if (!usuarioAtual || !dadosCarregados) return;
  if (document.visibilityState !== "visible" || usuarioEstaEditando()) return;
  carregarDados({ silencioso: true });
}

setInterval(atualizarEmSegundoPlano, INTERVALO_ATUALIZACAO_MS);
window.addEventListener("focus", atualizarEmSegundoPlano);

// =====================================================================
// Troca de view
// =====================================================================

btnChamados.addEventListener("click", () => {
  ticketsView.classList.remove("hidden");
  groupsView.classList.add("hidden");
  btnChamados.classList.add("active");
  btnGrupos.classList.remove("active");
  ticketSearch.classList.remove("hidden");
  statusFilter.classList.remove("hidden");
  sortTickets.classList.remove("hidden");
  toggleAllTickets.classList.remove("hidden");
});

btnGrupos.addEventListener("click", () => {
  groupsView.classList.remove("hidden");
  ticketsView.classList.add("hidden");
  btnGrupos.classList.add("active");
  btnChamados.classList.remove("active");
  ticketSearch.classList.add("hidden");
  statusFilter.classList.add("hidden");
  sortTickets.classList.add("hidden");
  toggleAllTickets.classList.add("hidden");
});

// =====================================================================
// Grupos
// =====================================================================

newGroupBtn.addEventListener("click", () => {
  groupModal.classList.remove("hidden");
});

closeModalBtn.addEventListener("click", () => {
  groupModal.classList.add("hidden");
});

function renderGroups() {
  groupsList.innerHTML = "";

  if (grupos.length === 0) {
    groupsList.innerHTML = `
      <div class="empty-state">
        <p>Nenhum grupo ainda.</p>
        <p>Crie o primeiro em <strong>Novo Grupo</strong>.</p>
      </div>
    `;
    return;
  }

  grupos.forEach((grupo) => {
    const groupCard = document.createElement("div");
    groupCard.classList.add("group-card");
    groupCard.innerHTML = `
  <div class="group-card-layout">
    <div class="group-info">
      <h3>${escapeHtml(grupo.nome)}</h3>
      <span>${escapeHtml(grupo.prefixo)}</span>
    </div>
    <div class="group-card-stats">
      <div class="group-stat">
        <small>
          Chamados Abertos
        </small>
        <strong>
          ${grupo.chamadosAbertos}
        </strong>
      </div>
      <div class="group-stat">
        <small>
          Total
        </small>
        <strong>
           ${grupo.totalChamados}
        </strong>
      </div>
    </div>
    <div class="group-card-actions">
      <button class="save-group-btn" data-id="${grupo.id}">
        Exportar CSV
      </button>
      <button
        class="delete-group-btn"
        data-id="${grupo.id}"
      >
        Apagar
      </button>
    </div>
  </div>
`;
    groupsList.appendChild(groupCard);
  });

  document.querySelectorAll(".delete-group-btn").forEach((button) => {
    button.addEventListener("click", async () => {
      const grupo = grupos.find((g) => g.id === Number(button.dataset.id));
      if (!grupo) return;

      const aviso =
        grupo.totalChamados > 0
          ? `Apagar o grupo "${grupo.nome}"? Os ${grupo.totalChamados} chamado(s) dele também serão apagados.`
          : `Apagar o grupo "${grupo.nome}"?`;
      if (!confirm(aviso)) return;

      await comBotaoOcupado(button, "Apagando...", async () => {
        try {
          await Api.deleteGroup(grupo.id);
          mostrarMensagem("Grupo apagado.", "sucesso");
          await carregarDados();
        } catch (error) {
          mostrarMensagem(error.message);
        }
      });
    });
  });

  document.querySelectorAll(".save-group-btn").forEach((button) => {
    button.addEventListener("click", () => {
      exportGroupCSV(Number(button.dataset.id));
    });
  });
}

groupForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const groupName = document.querySelector("#group-name").value.trim();
  const groupPrefix = document.querySelector("#group-prefix").value.trim().toUpperCase();

  if (groupName === "" || groupPrefix === "") {
    mostrarMensagem("Preencha todos os campos.");
    return;
  }

  if (!/^[A-Z0-9]+$/.test(groupPrefix)) {
    mostrarMensagem("O prefixo só pode conter letras e números.");
    return;
  }

  await comBotaoOcupado(groupForm.querySelector("button[type=submit]"), "Criando...", async () => {
    try {
      // O servidor confere se já existe grupo com o mesmo nome ou prefixo.
      await Api.createGroup({ nome: groupName, prefixo: groupPrefix });
      groupForm.reset();
      groupModal.classList.add("hidden");
      mostrarMensagem("Grupo criado.", "sucesso");
      await carregarDados();
    } catch (error) {
      mostrarMensagem(error.message);
    }
  });
});

function exportGroupCSV(grupoId) {
  const grupo = grupos.find((g) => g.id === grupoId);
  const ticketsGrupo = chamados.filter((ticket) => ticket.grupoId === grupoId);

  if (!grupo || ticketsGrupo.length === 0) {
    mostrarMensagem("Este grupo não possui chamados.", "info");
    return;
  }

  const linhas = [
    ["Codigo", "Titulo", "Solicitante", "Responsavel", "Criticidade", "Status", "Data", "Descricao"],
  ];

  ticketsGrupo.forEach((ticket) => {
    linhas.push([
      ticket.codigo,
      ticket.titulo,
      ticket.solicitante,
      ticket.responsavel || "",
      ticket.criticidade,
      ticket.status,
      formatarData(ticket.data),
      ticket.descricao.replaceAll("\n", " "),
    ]);
  });

  // Aspas dentro do texto são duplicadas, como manda o formato CSV.
  const csv = linhas
    .map((linha) => linha.map((valor) => `"${String(valor).replaceAll('"', '""')}"`).join(";"))
    .join("\n");

  // O "﻿" faz o Excel reconhecer os acentos corretamente.
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${grupo.prefixo}-chamados.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

function populateGroupSelects() {
  const selectedValue = topbarGroupSelect.value;

  ticketGroupSelect.innerHTML = "";
  topbarGroupSelect.innerHTML = `
    <option value="all">
      Todos
    </option>
  `;

  grupos.forEach((grupo) => {
    const option = document.createElement("option");
    option.value = grupo.id;
    option.textContent = `${grupo.prefixo} - ${grupo.nome}`;
    ticketGroupSelect.appendChild(option.cloneNode(true));
    topbarGroupSelect.appendChild(option);
  });

  const optionExists = [...topbarGroupSelect.options].some(
    (option) => option.value === selectedValue,
  );
  topbarGroupSelect.value = optionExists ? selectedValue : "all";
}

// =====================================================================
// Chamados
// =====================================================================

const PRIORIDADES = { Crítica: 4, Alta: 3, Média: 2, Baixa: 1 };

function filtrarChamados() {
  const selectedGroup = topbarGroupSelect.value;
  const selectedStatus = statusFilter.value;
  const searchTerm = ticketSearch.value.trim().toLowerCase();

  let ticketsFiltrados =
    selectedGroup === "all"
      ? [...chamados]
      : chamados.filter((ticket) => ticket.grupoId === Number(selectedGroup));

  if (searchTerm) {
    ticketsFiltrados = ticketsFiltrados.filter((ticket) => {
      return (
        ticket.codigo.toLowerCase().includes(searchTerm) ||
        ticket.titulo.toLowerCase().includes(searchTerm) ||
        ticket.solicitante.toLowerCase().includes(searchTerm) ||
        (ticket.responsavel || "").toLowerCase().includes(searchTerm)
      );
    });
  }

  if (selectedStatus !== "Todos") {
    ticketsFiltrados = ticketsFiltrados.filter((ticket) => {
      switch (selectedStatus) {
        case "Ativos":
          return ["Pendente", "Em Progresso", "Pausado"].includes(ticket.status);
        case "Finalizados":
          return ["Concluído", "Cancelado"].includes(ticket.status);
        default:
          return ticket.status === selectedStatus;
      }
    });
  }

  switch (sortTickets.value) {
    case "newest":
      ticketsFiltrados.sort((a, b) => b.id - a.id);
      break;
    case "oldest":
      ticketsFiltrados.sort((a, b) => a.id - b.id);
      break;
    case "priority":
      ticketsFiltrados.sort(
        (a, b) => PRIORIDADES[b.criticidade] - PRIORIDADES[a.criticidade] || b.id - a.id,
      );
      break;
  }

  return ticketsFiltrados;
}

function botoesDeStatus(ticket) {
  switch (ticket.status) {
    case "Pendente":
      return `
          <button
            class="ticket-action-btn"
            data-id="${ticket.id}"
            data-action="start"
          >
            Avançar chamado
          </button>
        `;
    case "Em Progresso":
      return `
          <div class="ticket-actions">
            <button
             class="ticket-action-btn"
              data-id="${ticket.id}"
              data-action="pause"
            >
             Pausar
            </button>
            <button
             class="ticket-action-btn"
              data-id="${ticket.id}"
             data-action="finish"
            >
              Concluir
            </button>
           <button
              class="ticket-action-btn danger"
              data-id="${ticket.id}"
              data-action="cancel"
            >
              Cancelar
            </button>
          </div>
        `;
    case "Pausado":
      return `
          <button
            class="ticket-action-btn"
           data-id="${ticket.id}"
           data-action="resume"
          >
            Retomar chamado
          </button>
        `;
    default:
      return "";
  }
}

function renderTickets() {
  ticketsList.innerHTML = "";

  const ticketsFiltrados = filtrarChamados();

  if (ticketsFiltrados.length === 0) {
    ticketsList.innerHTML = `
      <div class="empty-state">
        <p>${chamados.length === 0 ? "Nenhum chamado ainda." : "Nenhum chamado encontrado com esses filtros."}</p>
      </div>
    `;
    return;
  }

  const nomePadraoComentario = escapeHtml((usuarioAtual?.name || "").slice(0, 32));

  ticketsFiltrados.forEach((ticket) => {
    const expandido = ticketsExpandidos.has(ticket.id);
    const ticketCard = document.createElement("div");
    ticketCard.classList.add("ticket-card");
    if (!expandido) {
      ticketCard.classList.add("collapsed");
    }

    const comentariosHTML = ticket.comentarios
      .map(
        (comentario) => `
          <div class="comment-item">
            <strong>
              ${escapeHtml(comentario.autor)}
            </strong>
            <p>${escapeHtml(comentario.texto)}</p>
            <small>
             ${formatarDataHora(comentario.data)}
            </small>
          </div>
        `,
      )
      .join("");

    const statusClasse = ticket.status.toLowerCase().replace(" ", "-");

    ticketCard.innerHTML = `
    <div class="ticket-layout">
    <div class="ticket-main ${expandido ? "expanded" : "collapsed-card"}">
      <div class="ticket-card-header">
        <div>
          <div class="ticket-title-row">
            <h3>
              ${escapeHtml(ticket.codigo)}
            </h3>
            <span class="ticket-title">
              ${escapeHtml(ticket.titulo)}
            </span>
          </div>
        </div>
        <div class="ticket-header-right">
          <div
            class="priority-badge priority-${escapeHtml(ticket.criticidade.toLowerCase())}"
          >
            ${escapeHtml(ticket.criticidade)}
          </div>
          <div
            class="ticket-badge status-${escapeHtml(statusClasse)}"
          >
            ${escapeHtml(ticket.status)}
        </div>
        </div>
      </div>
      <p
        class="ticket-description collapsed"
        >${escapeHtml(ticket.descricao)}</p>
        <button class="expand-description-btn">Ver mais</button>
      <div class="ticket-people">
        <div>
          <strong>Solicitante:</strong>
          ${escapeHtml(ticket.solicitante || "-")}
        </div>
        <div>
          <strong>Responsável:</strong>
          ${escapeHtml(ticket.responsavel || "-")}
        </div>
      </div>
      <div class="ticket-footer">
        <span>
          ${formatarData(ticket.data)}
        </span>
        <button class="delete-ticket-btn" data-id="${ticket.id}">
          Excluir
        </button>
      </div>
      ${botoesDeStatus(ticket)}
      </div>
        <div class="ticket-comments">
          <div class="comments-list">
            ${comentariosHTML}
          </div>
      <div class="comment-form">
        <input
          type="text"
          class="comment-author"
           placeholder="Nome"
           maxlength="32"
           value="${nomePadraoComentario}"
         >
         <small class="comment-author-counter">
          0 / 32
        </small>
        <textarea
          class="comment-text"
          placeholder="Comentário"
          maxlength="4000"
        ></textarea>
        <small class="comment-text-counter">
          0 / 4000
        </small>
          <button
          class="add-comment-btn"
          data-ticket-id="${ticket.id}"
        >
          Enviar
          </button>
        </div>
        </div>
      </div>
    `;

    ticketsList.appendChild(ticketCard);

    ticketCard.addEventListener("click", (event) => {
      if (
        event.target.closest("button") ||
        event.target.closest("input") ||
        event.target.closest("textarea")
      ) {
        return;
      }
      if (ticketsExpandidos.has(ticket.id)) {
        ticketsExpandidos.delete(ticket.id);
      } else {
        ticketsExpandidos.add(ticket.id);
      }
      renderTickets();
    });
  });

  document.querySelectorAll(".expand-description-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const description = button.previousElementSibling;
      description.classList.toggle("collapsed");
      button.textContent = description.classList.contains("collapsed") ? "Ver mais" : "Ver menos";
    });
  });

  document.querySelectorAll(".ticket-card").forEach((card) => {
    const description = card.querySelector(".ticket-description");
    const button = card.querySelector(".expand-description-btn");
    if (description && button && description.scrollHeight <= 90) {
      button.style.display = "none";
    }
  });

  document.querySelectorAll(".add-comment-btn").forEach((button) => {
    button.addEventListener("click", async () => {
      const ticketId = Number(button.dataset.ticketId);
      const card = button.closest(".ticket-comments");
      const autor = card.querySelector(".comment-author").value.trim();
      const texto = card.querySelector(".comment-text").value.trim();

      if (texto === "") {
        mostrarMensagem("Escreva o comentário antes de enviar.");
        return;
      }

      await comBotaoOcupado(button, "Enviando...", async () => {
        try {
          await Api.addComment(ticketId, { autor, texto });
          card.querySelector(".comment-text").value = "";
          await carregarDados();
        } catch (error) {
          mostrarMensagem(error.message);
        }
      });
    });
  });

  document.querySelectorAll(".comment-author").forEach((input) => {
    const counter = input.nextElementSibling;
    const update = () => {
      counter.textContent = `${input.value.length} / 32`;
    };
    input.addEventListener("input", update);
    update();
  });

  document.querySelectorAll(".comment-text").forEach((textarea) => {
    const counter = textarea.nextElementSibling;
    const update = () => {
      counter.textContent = `${textarea.value.length} / 4000`;
    };
    textarea.addEventListener("input", update);
    update();
  });

  const novoStatusPorAcao = {
    start: "Em Progresso",
    pause: "Pausado",
    resume: "Em Progresso",
    finish: "Concluído",
    cancel: "Cancelado",
  };

  document.querySelectorAll(".ticket-action-btn").forEach((button) => {
    button.addEventListener("click", async () => {
      const ticketId = Number(button.dataset.id);
      const novoStatus = novoStatusPorAcao[button.dataset.action];
      if (!novoStatus) return;

      await comBotaoOcupado(button, "Salvando...", async () => {
        try {
          await Api.changeStatus(ticketId, novoStatus);
          await carregarDados();
        } catch (error) {
          mostrarMensagem(error.message);
          // Se outra pessoa mudou o chamado antes, mostra o estado atual.
          if (error.status === 409) await carregarDados();
        }
      });
    });
  });

  document.querySelectorAll(".delete-ticket-btn").forEach((button) => {
    button.addEventListener("click", async () => {
      const ticket = chamados.find((t) => t.id === Number(button.dataset.id));
      if (!ticket || !confirm(`Excluir o chamado ${ticket.codigo}? Isso não pode ser desfeito.`)) {
        return;
      }

      await comBotaoOcupado(button, "Excluindo...", async () => {
        try {
          await Api.deleteTicket(ticket.id);
          ticketsExpandidos.delete(ticket.id);
          mostrarMensagem(`Chamado ${ticket.codigo} excluído.`, "sucesso");
          await carregarDados();
        } catch (error) {
          mostrarMensagem(error.message);
        }
      });
    });
  });
}

ticketSearch.addEventListener("input", renderTickets);
topbarGroupSelect.addEventListener("change", renderTickets);
sortTickets.addEventListener("change", renderTickets);
statusFilter.addEventListener("change", renderTickets);

toggleAllTickets.addEventListener("click", () => {
  if (todosExpandidos) {
    ticketsExpandidos.clear();
  } else {
    chamados.forEach((ticket) => ticketsExpandidos.add(ticket.id));
  }
  todosExpandidos = !todosExpandidos;
  toggleAllTickets.textContent = todosExpandidos ? "Minimizar todos" : "Expandir todos";
  renderTickets();
});

// Modal de novo chamado

newTicketBtn.addEventListener("click", () => {
  if (grupos.length === 0) {
    mostrarMensagem("Crie um grupo antes de criar chamados.", "info");
    return;
  }
  populateGroupSelects();
  // Já abre no grupo filtrado na barra do topo, se houver um.
  if (topbarGroupSelect.value !== "all") {
    ticketGroupSelect.value = topbarGroupSelect.value;
  }
  const campoData = document.querySelector("#ticket-date");
  if (!campoData.value) campoData.value = hojeIso();
  ticketModal.classList.remove("hidden");
});

closeTicketModalBtn.addEventListener("click", () => {
  ticketModal.classList.add("hidden");
});

ticketForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const novoChamado = {
    grupoId: document.querySelector("#ticket-group").value,
    data: document.querySelector("#ticket-date").value,
    descricao: document.querySelector("#ticket-description").value.trim(),
    titulo: document.querySelector("#ticket-title").value.trim(),
    solicitante: document.querySelector("#ticket-requester").value.trim(),
    criticidade: document.querySelector("#ticket-priority").value,
    responsavel: document.querySelector("#ticket-owner").value.trim(),
  };

  if (
    novoChamado.titulo === "" ||
    novoChamado.solicitante === "" ||
    novoChamado.data === "" ||
    novoChamado.descricao === "" ||
    novoChamado.criticidade === ""
  ) {
    mostrarMensagem("Preencha os campos obrigatórios.");
    return;
  }

  await comBotaoOcupado(ticketForm.querySelector("button[type=submit]"), "Criando...", async () => {
    try {
      // O código (ex.: INF-001) é gerado pelo servidor.
      const criado = await Api.createTicket(novoChamado);
      ticketForm.reset();
      document
        .querySelectorAll("#ticket-form .char-counter")
        .forEach((contador) => contador.dispatchEvent(new Event("reset")));
      ticketModal.classList.add("hidden");
      mostrarMensagem(`Chamado ${criado.codigo} criado.`, "sucesso");
      await carregarDados();
    } catch (error) {
      mostrarMensagem(error.message);
    }
  });
});

function setupCounter(inputSelector, counterSelector) {
  const input = document.querySelector(inputSelector);
  const counter = document.querySelector(counterSelector);

  if (!input || !counter) {
    return;
  }

  const updateCounter = () => {
    counter.textContent = `${input.value.length} / ${input.maxLength}`;
  };

  input.addEventListener("input", updateCounter);
  counter.addEventListener("reset", updateCounter);
  updateCounter();
}

function refreshUI() {
  renderGroups();
  renderTickets();
}

setupCounter("#ticket-title", '[data-for="ticket-title"]');
setupCounter("#ticket-requester", '[data-for="ticket-requester"]');
setupCounter("#ticket-description", '[data-for="ticket-description"]');

iniciar();
