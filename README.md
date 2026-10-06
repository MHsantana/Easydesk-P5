![Banner do programa](./frontend/assets/img_readme/Banner.png)

# EasyDesk

Sistema de chamados full-stack | Programa Trends IT 2026

Olá! Meu nome é Mario Henrique Gimenes Santana e sou de Guarujá/SP. Comecei minha carreira na Engenharia Mecânica, pela Universidade Santa Cecília (UNISANTA). Hoje sou formado em Tecnologia da Informação e estudo Ciência de Dados, as duas pela Universidade Virtual do Estado de São Paulo (UNIVESP), onde estou no quinto semestre.

Durante a graduação em Engenharia Mecânica, tive meus primeiros contatos com programação pelo MATLAB e com CLPs (Controladores Lógicos Programáveis). Do que aprendi, gosto especialmente de desenho 3D (CAD, CAE e CAM) e de impressão 3D.

Trabalhei por cerca de dois anos como freelancer na empresa americana Lionbridge. A experiência me acostumou ao trabalho remoto e desenvolveu meu inglês, já que toda a comunicação era nesse idioma.

Hoje sigo minha recolocação na área de tecnologia, onde tenho mais de um ano de experiência.

Este projeto faz parte do **Programa Trends IT 2026**, oferecido pelo Núcleo Softex Campinas (NSC) em parceria com a Univesp. O programa forma e capacita profissionais em tecnologias emergentes, com foco em inovação digital e desenvolvimento de software.

O **EasyDesk** é um sistema de chamados centralizado. Ele organiza solicitações, acompanha o status de cada uma e deixa visível o que antes se perdia em mensagens soltas e processos improvisados.

Na etapa anterior do programa (Projeto 3), ele foi construído só com frontend, e os dados ficavam no navegador de um único usuário. Nesta etapa (Projeto 5, **ConnectHub**), ele virou um sistema **full-stack**:

- uma API em Node.js;
- um banco de dados PostgreSQL;
- login com senha criptografada e sessão por token JWT.

Assim, uma equipe inteira pode usar o mesmo painel, de qualquer dispositivo.

## Links

- **Aplicação:** https://easydesk-p5-frontend.vercel.app
- **API:** https://easydesk-api-mqop.onrender.com (status: [/health](https://easydesk-api-mqop.onrender.com/health))
- **Versão anterior (Projeto 3, só frontend):** https://github.com/MHsantana/Easydesk

> A API está no plano gratuito do Render. Depois de um tempo sem uso, o primeiro acesso pode levar até 1 minuto, enquanto o servidor "acorda".

## Documentação do projeto

Os artefatos de planejamento deste desafio estão no [README do frontend](frontend/README.md):

- Documento de Visão
- Lista de Requisitos (funcionais e não funcionais)
- Histórias de Usuário
- Registro de Decisões Técnicas
- O projeto: requisitos do desafio e o que foi entregue

Os detalhes técnicos da API estão no [README do backend](backend/README.md): endpoints, modelo de dados, segurança e deploy.

## Estrutura do repositório

| Pasta | O que é |
| --- | --- |
| [`backend/`](backend/README.md) | API REST em Node.js + Express + PostgreSQL, com login (bcrypt + JWT) |
| [`frontend/`](frontend/README.md) | Interface em HTML, CSS e JavaScript puro, que consome a API |

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

- **Direto no navegador:** dê dois cliques em `frontend/index.html`.
- **Com o Live Server:** no VS Code, clique com o botão direito em `frontend/index.html` e escolha **Open with Live Server**.

Rodando no seu computador, o frontend usa automaticamente a API de `http://localhost:3333`. Isso é definido em `frontend/config.js`.

Na primeira vez, clique em **Criar conta**.

## Como o frontend conversa com o backend

```
script.js (tela)  ──>  api.js (fetch + token JWT)  ──>  API Node.js  ──>  PostgreSQL
```

- **`config.js`:** endereço da API, local ou de produção.
- **`api.js`:** único arquivo que faz requisições ao servidor. Ele:
  - envia o token em cada chamada;
  - converte os campos da API (`title`, `requester`...) para os nomes usados na tela (`titulo`, `solicitante`...);
  - transforma erros em mensagens claras, como "E-mail ou senha incorretos." ou "Erro de conexão com o servidor".
- **`script.js`:** desenha a tela e reage aos cliques. Os dados vêm da API, e o `localStorage` guarda só o token da sessão.

### Comportamentos importantes

- **Sessão:** sem login, só a tela de entrada aparece. Se o token expirar ou for inválido, o usuário volta para o login com um aviso.
- **Carregamento:** uma barra no topo aparece enquanto o app espera o servidor. Os botões mostram "Salvando...", "Criando..." etc. e ficam desativados, o que evita cliques duplos.
- **Sincronização:** a tela busca novidades a cada 30 segundos e quando a aba volta ao foco. Assim, mudanças feitas em outro dispositivo aparecem sozinhas. A atualização pausa enquanto você digita um comentário ou está com um formulário aberto.
- **Segurança:** todo texto vindo do servidor é "escapado" antes de ir para a tela. Isso impede que alguém salve código malicioso num chamado e ele rode no navegador dos outros (XSS).

## Publicação (deploy)

| Parte | Serviço |
| --- | --- |
| Banco de dados | [Neon](https://neon.tech) (PostgreSQL gerenciado) |
| API | [Render](https://render.com), publicada a partir da pasta `backend` |
| Frontend | [Vercel](https://vercel.com), publicado a partir da pasta `frontend` |

A API e o frontend são publicados de novo automaticamente a cada `git push` na branch `main`, e as migrations atualizam o banco quando a API inicia. Para montar o seu próprio deploy:

1. **Banco:** crie um banco no Neon e copie a connection string direta (sem pooling).
2. **API:** publique no Render seguindo a seção *Deploy* do [README do backend](backend/README.md).
3. **Frontend:** em `frontend/config.js`, troque `PRODUCTION_API_URL` pelo endereço da sua API e publique a pasta `frontend` no Vercel (Framework: *Other*, sem build).
4. **CORS:** no Render, coloque o endereço do frontend publicado, **sem barra no final**, na variável `CORS_ORIGIN`.
