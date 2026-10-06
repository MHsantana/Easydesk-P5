# EasyDesk API

Backend do **EasyDesk**, um sistema de chamados (help desk), feito no projeto **ConnectHub**.
Ele substitui o `localStorage` do frontend por um servidor Node.js com banco PostgreSQL,
cadastro e login de usuários, senhas protegidas com bcrypt e sessões com JWT.

## Stack

| Camada | Tecnologia |
| --- | --- |
| Runtime | Node.js 20+ |
| Framework HTTP | Express 5 |
| Banco de dados | PostgreSQL (driver `pg`, SQL puro com consultas parametrizadas) |
| Senhas | bcrypt (`bcryptjs`) |
| Sessão | JSON Web Token (`jsonwebtoken`) |
| Validação | Zod |
| Segurança HTTP | Helmet, CORS, limite de tentativas no login (`express-rate-limit`) |
| Testes | Jest + Supertest |

## Estrutura de pastas

Arquitetura em camadas (no estilo MVC). Cada camada tem uma única responsabilidade:

```
backend/
├── src/
│   ├── server.js              # Ponto de entrada: roda as migrations e abre a porta
│   ├── app.js                 # Monta o Express (middlewares + rotas)
│   ├── config/env.js          # Lê e valida as variáveis de ambiente (.env)
│   ├── database/
│   │   ├── pool.js            # Conexão com o PostgreSQL + helper de transação
│   │   ├── migrate.js         # Executor de migrations
│   │   └── migrations/        # Arquivos .sql que criam/alteram as tabelas
│   ├── routes/                # URL + verbo HTTP -> validação -> controller
│   ├── middlewares/           # Autenticação, validação, 404 e tratamento de erros
│   ├── validators/            # Schemas Zod (o que cada requisição pode enviar)
│   ├── controllers/           # Traduzem HTTP <-> serviço (status code, JSON)
│   ├── services/              # Regras de negócio
│   ├── repositories/          # Únicas camadas que escrevem SQL
│   ├── errors/AppError.js     # Erro "esperado" com status HTTP
│   └── utils/token.js         # Geração/validação do JWT
├── tests/                     # Testes automatizados (Jest + Supertest)
├── docs/                      # Coleção do Postman
├── docker-compose.yml         # (Opcional, não é necessário) PostgreSQL local via Docker
└── .env.example               # Modelo das variáveis de ambiente
```

Fluxo de uma requisição:
`rota → ensureAuthenticated → validate → controller → service → repository → PostgreSQL`

## Modelo de dados

```
users (1) ──cria──> (N) ticket_groups (1) ──possui──> (N) tickets (1) ──possui──> (N) comments
```

| Tabela | Principais colunas |
| --- | --- |
| `users` | `id`, `name`, `email` (único), `password_hash`, `role` |
| `ticket_groups` | `id`, `name` (único), `prefix` (único, ex.: `INF`), `ticket_seq`, `created_by` → users |
| `tickets` | `id`, `group_id` → ticket_groups, `code` (ex.: `INF-001`), `title`, `description`, `requester`, `owner`, `priority`, `status`, `opened_on`, `created_by` → users |
| `comments` | `id`, `ticket_id` → tickets, `author`, `body`, `created_by` → users |

**Exclusões (como evitamos dados órfãos):**

- Apagar um **grupo** apaga os chamados dele, e apagar um **chamado** apaga os comentários dele (`ON DELETE CASCADE`).
- Apagar um **usuário** não apaga nada da equipe. Os grupos, chamados e comentários continuam, e o `created_by` deles vira `NULL` (`ON DELETE SET NULL`).

### Modelo de acesso

Hoje todo usuário autenticado é **superuser**: pode ver, criar, editar e excluir todos os grupos e chamados, que são compartilhados pela equipe. Sem token, nenhuma rota de dados funciona (**401**).

A coluna `users.role` e os campos `created_by` já existem para que uma camada de permissões (IAM) possa ser adicionada no futuro sem refazer o banco.

## Como rodar localmente

### 1. Pré-requisitos

- [Node.js](https://nodejs.org/) 20 ou superior.
- Um PostgreSQL com dois bancos: `easydesk` (desenvolvimento) e `easydesk_test` (testes automatizados). Escolha uma das opções:

**Opção A: PostgreSQL na nuvem com o Neon (recomendada, nada para instalar)**

1. Crie uma conta gratuita em <https://neon.tech> e um projeto. Escolha a região *AWS São Paulo* (`sa-east-1`) para ter menos latência.
2. Em **Databases**, crie dois bancos: `easydesk` e `easydesk_test`.
3. Em **Connect**, **desligue** a opção *Connection pooling*. A conexão precisa ser direta, sem `-pooler` no endereço, porque as migrations usam um lock de sessão.
4. Copie a connection string de cada banco e **apague tudo a partir do `?`** (o `?sslmode=require...`).
5. No `.env`, coloque `DATABASE_SSL=true`.

Exemplo:

```
DATABASE_URL=postgresql://usuario:senha@ep-nome-123456.sa-east-1.aws.neon.tech/easydesk
TEST_DATABASE_URL=postgresql://usuario:senha@ep-nome-123456.sa-east-1.aws.neon.tech/easydesk_test
DATABASE_SSL=true
```

O mesmo projeto do Neon pode ser usado depois no deploy, então não há nada novo para configurar nessa hora.

**Opção B: PostgreSQL instalado no Windows**

Baixe o instalador em <https://www.postgresql.org/download/windows/>. Depois crie os dois bancos pelo pgAdmin (que vem junto), pelo DBeaver ou com:

```sql
CREATE DATABASE easydesk;
CREATE DATABASE easydesk_test;
```

**Opção C: Docker**

Dentro da pasta `backend`, rode `docker compose up -d`. Os dois bancos são criados automaticamente, com usuário e senha `postgres`.

### 2. Instalar e configurar

```bash
cd backend
npm install
cp .env.example .env      # no Windows (PowerShell): copy .env.example .env
```

Abra o `.env` e ajuste:

- `DATABASE_URL` e `TEST_DATABASE_URL` com os endereços dos seus dois bancos.
- `DATABASE_SSL=true` se usar o Neon ou outro banco na nuvem.
- `JWT_SECRET` com um texto longo e aleatório. Para gerar um:
  `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`

### 3. Rodar

```bash
npm run dev     # desenvolvimento (reinicia sozinho a cada alteração, via nodemon)
npm start       # produção
```

As tabelas são criadas automaticamente na primeira execução (migrations). Para conferir, acesse <http://localhost:3333/health>. A resposta esperada é:

```json
{ "status": "ok", "database": "ok" }
```

### 4. Testes automatizados

```bash
npm test
```

Os testes usam o banco de `TEST_DATABASE_URL`, que é **apagado** a cada teste. Nunca aponte essa variável para o banco de desenvolvimento ou de produção.

## Endpoints

Rotas marcadas com 🔒 exigem o cabeçalho `Authorization: Bearer <token>`.

### Autenticação

| Método | Rota | Corpo | Resposta |
| --- | --- | --- | --- |
| POST | `/auth/register` | `{ name, email, password }` | `201 { user, token }` |
| POST | `/auth/login` | `{ email, password }` | `200 { user, token }` |

Regras: a senha tem no mínimo 8 caracteres e o e-mail é único, sem diferenciar maiúsculas de minúsculas.

### Conta do usuário logado 🔒

| Método | Rota | Corpo | Resposta |
| --- | --- | --- | --- |
| GET | `/users/me` | — | `200 user` |
| PUT | `/users/me` | `{ name, email }` | `200 user` |
| PUT | `/users/me/password` | `{ currentPassword, newPassword }` | `204` |
| DELETE | `/users/me` | `{ password }` | `204` |

### Grupos 🔒

| Método | Rota | Corpo | Resposta |
| --- | --- | --- | --- |
| GET | `/groups` | — | `200 [group]` |
| POST | `/groups` | `{ name, prefix }` | `201 group` |
| GET | `/groups/:id` | — | `200 group` |
| PUT | `/groups/:id` | `{ name, prefix }` | `200 group` |
| DELETE | `/groups/:id` | — | `204` (apaga os chamados do grupo) |

Exemplo de grupo:

```json
{
  "id": 1,
  "name": "Infraestrutura",
  "prefix": "INF",
  "totalTickets": 3,
  "openTickets": 2,
  "createdBy": { "id": 1, "name": "Mario" },
  "createdAt": "2026-10-06T12:00:00.000Z",
  "updatedAt": "2026-10-06T12:00:00.000Z"
}
```

### Chamados 🔒

| Método | Rota | Corpo | Resposta |
| --- | --- | --- | --- |
| GET | `/tickets` | — | `200 [ticket]` |
| POST | `/tickets` | `{ groupId, title, description, requester, owner?, priority, openedOn? }` | `201 ticket` |
| GET | `/tickets/:id` | — | `200 ticket` |
| PUT | `/tickets/:id` | `{ title, description, requester, owner?, priority, openedOn? }` | `200 ticket` |
| PATCH | `/tickets/:id/status` | `{ status }` | `200 ticket` |
| DELETE | `/tickets/:id` | — | `204` |

**Filtros da listagem** (todos opcionais):

- `groupId`
- `status`: `Todos`, `Ativos`, `Finalizados` ou um status específico
- `search`: busca em código, título, solicitante e responsável
- `sort`: `newest`, `oldest` ou `priority`

Exemplo: `/tickets?groupId=1&status=Ativos&search=impressora&sort=priority`

**Regras dos chamados:**

- **Código:** gerado automaticamente a partir do prefixo do grupo (`INF-001`, `INF-002`...). Os números nunca se repetem, nem depois de apagar chamados ou com várias pessoas criando ao mesmo tempo.
- **Criticidade:** `Baixa`, `Média`, `Alta` ou `Crítica`.
- **`openedOn`:** data no formato `AAAA-MM-DD`. Se não for enviada, a data de hoje é usada.
- **Status:** segue o fluxo abaixo. Qualquer outra mudança devolve **409**.

```
Pendente ──> Em Progresso ──> Concluído
   │            │   ▲
   │            ▼   │
   │          Pausado
   └──────────────┴──> Cancelado     (Concluído e Cancelado são finais)
```

Exemplo de chamado:

```json
{
  "id": 1,
  "code": "INF-001",
  "groupId": 1,
  "title": "Impressora não liga",
  "description": "A impressora do 2º andar não liga desde ontem.",
  "requester": "Maria",
  "owner": "João",
  "priority": "Alta",
  "status": "Pendente",
  "openedOn": "2026-10-06",
  "createdBy": { "id": 1, "name": "Mario" },
  "createdAt": "2026-10-06T12:00:00.000Z",
  "updatedAt": "2026-10-06T12:00:00.000Z",
  "comments": [
    { "id": 1, "author": "Suporte N1", "body": "Verificando.", "createdBy": 1, "createdAt": "2026-10-06T12:05:00+00:00" }
  ]
}
```

### Comentários 🔒

| Método | Rota | Corpo | Resposta |
| --- | --- | --- | --- |
| GET | `/tickets/:id/comments` | — | `200 [comment]` |
| POST | `/tickets/:id/comments` | `{ author?, body }` | `201 comment` |
| DELETE | `/tickets/:id/comments/:commentId` | — | `204` |

Se `author` não for enviado, a API usa o nome do usuário logado.

### Outras

| Método | Rota | Descrição |
| --- | --- | --- |
| GET | `/` | Identificação da API |
| GET | `/health` | Verifica se a API e o banco estão no ar |

## Erros

Todos os erros seguem o mesmo formato:

```json
{
  "message": "Dados inválidos.",
  "details": [{ "field": "email", "message": "E-mail inválido." }]
}
```

| Status | Quando |
| --- | --- |
| 400 | Dados inválidos, JSON mal formado, senha atual incorreta |
| 401 | Sem token, token inválido/expirado, e-mail ou senha incorretos |
| 404 | Grupo, chamado, comentário ou rota não encontrados |
| 409 | E-mail, nome ou prefixo já em uso; mudança de status não permitida |
| 429 | Muitas tentativas de login/cadastro em pouco tempo |
| 500 | Erro inesperado. O detalhe aparece só no terminal do servidor, nunca na resposta |

## Segurança

- **Senhas:** são guardadas como hash bcrypt (com salt) e nunca em texto puro. O hash nunca aparece em nenhuma resposta.
- **JWT:**
  - Assinado com HS256 e `JWT_SECRET`, com expiração configurável (`JWT_EXPIRES_IN`).
  - O token de um usuário que excluiu a conta deixa de funcionar.
- **SQL Injection:** todas as consultas são parametrizadas (`$1, $2...`). Nenhum valor enviado pelo usuário é concatenado no SQL.
- **Validação:** todo corpo, parâmetro e query string passa por um schema Zod antes de chegar ao banco. O banco ainda tem suas próprias regras (`CHECK`, `UNIQUE`, `FOREIGN KEY`) como segunda barreira.
- **Login:**
  - A mesma mensagem é usada para e-mail inexistente e senha errada, e o tempo de resposta é igual nos dois casos.
  - Há um limite de 20 tentativas a cada 15 minutos por IP.
- **Segredos:** ficam no `.env`, que está no `.gitignore`. Use o `.env.example` como modelo.
- **Exceções:** o Express 5 encaminha automaticamente erros de funções `async` para o middleware de erros. Se o banco falhar, o servidor não cai e o cliente sempre recebe uma resposta.

## Testando com o Postman ou Insomnia

Importe `docs/EasyDesk.postman_collection.json`. Depois:

1. Rode **Autenticação → Cadastro** (ou **Login**). O token é salvo automaticamente na coleção.
2. As outras requisições já enviam o token. Ao criar um grupo, um chamado ou um comentário, o `id` também é salvo para as próximas requisições.
3. Para testar contra o deploy, troque a variável `baseUrl`.

## Deploy (sugestão gratuita: Neon + Render)

1. **Banco:** use o projeto do [Neon](https://neon.tech) (veja a Opção A acima). Se quiser separar os dados de produção dos de desenvolvimento, crie um terceiro banco, por exemplo `easydesk_prod`. Use a connection string direta, sem pooling e sem o trecho a partir do `?`.
2. **API:** no [Render](https://render.com), crie um **Web Service** a partir do repositório no GitHub:
   - Root Directory: `backend`
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Variáveis de ambiente:

     | Variável | Valor |
     | --- | --- |
     | `NODE_ENV` | `production` |
     | `DATABASE_URL` | a connection string do Neon |
     | `DATABASE_SSL` | `true` |
     | `JWT_SECRET` | um segredo novo, diferente do usado em desenvolvimento |
     | `JWT_EXPIRES_IN` | `1d` |
     | `CORS_ORIGIN` | o endereço do frontend publicado, ex.: `https://easydesk.vercel.app` |

   - Health Check Path: `/health`
3. As tabelas são criadas automaticamente no primeiro start.

No plano gratuito do Render a API "dorme" depois de um tempo sem uso. A primeira requisição depois disso pode levar uns 30 a 50 segundos.

## Próximos passos

- [x] Integrar o frontend: trocar o `localStorage` por chamadas `fetch` à API, com tela de login e estados de carregamento (veja o README na raiz do projeto).
- [ ] Publicar o frontend (Vercel, Netlify ou GitHub Pages) e configurar `CORS_ORIGIN`.
- [ ] Camada de permissões (IAM) usando a coluna `role`.
