# EasyDesk

Sistema de chamados (help desk) full-stack, feito no projeto **ConnectHub**.

| Pasta | O que é |
| --- | --- |
| [`backend/`](backend/README.md) | API REST em Node.js + Express + PostgreSQL, com login (bcrypt + JWT) |
| `frontend/` | Interface em HTML, CSS e JavaScript puro, que consome a API |

## Como rodar no seu computador

### 1. Backend

Siga o passo a passo do [README do backend](backend/README.md). Em resumo:

```bash
cd backend
npm install
copy .env.example .env    # depois preencha o .env com os dados do seu banco
npm run dev
```

A API sobe em <http://localhost:3333>. Para conferir, abra <http://localhost:3333/health>.

### 2. Frontend

Com a API rodando, abra o frontend de uma destas formas:

- **Recomendado:** no VS Code, instale a extensão **Live Server**, clique com o botão direito em `frontend/index.html` e escolha **Open with Live Server**. O site abre em `http://127.0.0.1:5500`.
- **Ou:** dê dois cliques em `frontend/index.html` para abrir direto no navegador.

Rodando no seu computador, o frontend usa a API de `http://localhost:3333` automaticamente. Isso é definido em `frontend/config.js`.

Na primeira vez, clique em **Criar conta**.

## Como o frontend conversa com o backend

```
script.js (tela)  ──>  api.js (fetch + token JWT)  ──>  API Node.js  ──>  PostgreSQL
```

- **`config.js`:** endereço da API, local ou de produção.
- **`api.js`:**
  - É o único arquivo que faz requisições ao servidor.
  - Envia o token em cada chamada e converte os campos da API (`title`, `requester`...) para os nomes usados na tela (`titulo`, `solicitante`...).
  - Transforma erros em mensagens claras, como "E-mail ou senha incorretos." ou "Erro de conexão com o servidor".
- **`script.js`:** desenha a tela e reage aos cliques. Os dados vêm da API, e o `localStorage` guarda só o token da sessão.

### Comportamentos importantes

- **Sessão:** sem login, só a tela de entrada aparece. Se o token expirar ou for inválido, o usuário volta para o login com um aviso.
- **Carregamento:** uma barra no topo aparece enquanto o app espera o servidor. Os botões mostram "Salvando...", "Criando..." etc. e ficam desativados, o que evita cliques duplos.
- **Sincronização:** a tela busca novidades a cada 30 segundos e quando a aba volta ao foco. Assim, mudanças feitas em outro dispositivo aparecem sozinhas. A atualização é pausada enquanto você está digitando um comentário ou com um formulário aberto.
- **Segurança:** todo texto vindo do servidor é "escapado" antes de ir para a tela. Isso impede que alguém salve código malicioso num chamado e ele rode no navegador dos outros (XSS).

## Publicação (deploy)

1. **API:** publique no Render seguindo a seção *Deploy* do [README do backend](backend/README.md).
2. **Frontend:**
   - Em `frontend/config.js`, troque `PRODUCTION_API_URL` pelo endereço da API no Render (ex.: `https://easydesk-api.onrender.com`).
   - Publique a pasta `frontend` no Vercel, no Netlify ou no GitHub Pages.
3. **CORS:** no Render, coloque o endereço do frontend publicado na variável `CORS_ORIGIN` (ex.: `https://easydesk.vercel.app`).
