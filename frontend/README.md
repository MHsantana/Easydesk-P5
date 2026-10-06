# EasyDesk – Documentação do Projeto (ConnectHub)

Este documento reúne os artefatos de planejamento do EasyDesk no **Projeto 5 (ConnectHub)** do Programa Trends IT 2026.

A apresentação, os links da aplicação publicada e as instruções para rodar o projeto estão no [README principal](../README.md). Os detalhes técnicos da API estão no [README do backend](../backend/README.md).

> O EasyDesk começou no Projeto 3 como uma aplicação só de frontend, com os dados no LocalStorage ([repositório anterior](https://github.com/MHsantana/Easydesk)). Os documentos abaixo foram atualizados para a versão full-stack. Quando uma decisão mudou em relação à versão anterior, isso está indicado.

## Documento de Visão do Projeto – EasyDesk

O EasyDesk é uma aplicação web para o gerenciamento simplificado de chamados internos. O sistema prioriza facilidade de uso, organização das informações e acompanhamento do ciclo de vida das solicitações. Nesta versão, os dados ficam em um servidor central e o acesso exige login, o que permite que uma equipe inteira trabalhe no mesmo painel, de qualquer dispositivo.

<details>
    <summary>Descrição(<i>clique para expandir</i>):</summary>
&nbsp;

## 1. Resumo do Problema

Em muitas equipes, principalmente em pequenos departamentos e organizações, o gerenciamento de solicitações internas ainda é feito por conversas em aplicativos de mensagens, e-mails ou planilhas. Essa abordagem:

* dificulta acompanhar o andamento das solicitações;
* causa perda de informações e falta de organização;
* reduz a visibilidade sobre o que está pendente, em andamento ou concluído;
* dificulta identificar o responsável por cada solicitação e manter um histórico dos atendimentos.

A primeira versão do EasyDesk resolveu a organização, mas guardava os dados no navegador de um único usuário. Por isso:

* **não havia colaboração:** cada pessoa via apenas os próprios dados;
* **os dados eram frágeis:** trocar de dispositivo, limpar o cache ou abrir em outro computador fazia tudo desaparecer;
* **não havia segurança:** qualquer pessoa com acesso à máquina podia ver os dados.

Esta versão resolve essas limitações. Os dados ficam em um servidor com banco de dados relacional, protegidos por autenticação, e são compartilhados entre todos os usuários da equipe.

## 2. Usuários-alvo

O sistema foi projetado para atender principalmente:

* Pequenas empresas e equipes internas
* Departamentos de Tecnologia da Informação (TI)
* Equipes de Infraestrutura
* Equipes Administrativas
* Organizações que precisam registrar solicitações sem usar ferramentas complexas de Service Desk

Cada membro da equipe tem a própria conta. Todos podem registrar chamados, acompanhar o andamento e atualizar o status, tanto pelo computador quanto pelo celular.

## 3. Objetivo Principal

O objetivo do EasyDesk é fornecer um sistema simples e seguro de gerenciamento de chamados que permita:

* Cadastro de contas e login seguro
* Acesso aos mesmos dados a partir de qualquer dispositivo
* Cadastro de grupos de atendimento
* Criação organizada de chamados
* Classificação por criticidade
* Acompanhamento do ciclo de vida de cada chamado
* Registro de comentários
* Busca rápida, filtros e ordenação
* Exportação dos dados em formato CSV

O sistema mantém a interface limpa e fácil de usar da primeira versão. A mudança principal está por trás da tela: um servidor que valida, protege e armazena as informações de forma permanente.

## 4. Principais Funcionalidades

O EasyDesk contempla as seguintes funcionalidades:

**Conta e acesso**

* Cadastro de conta (nome, e-mail e senha)
* Login e logout
* Sessão mantida ao recarregar a página, com aviso quando expira
* Bloqueio de todo o painel para quem não está autenticado

**Grupos e chamados**

* Cadastro e exclusão de grupos de atendimento
* Criação de chamados associados a um grupo
* Geração automática do código do chamado pelo servidor (ex.: INF-001)
* Definição de solicitante, responsável, data, criticidade e descrição
* Controle de status do chamado:

  * Pendente;
  * Em Progresso;
  * Pausado;
  * Concluído;
  * Cancelado;
* Avanço do fluxo de atendimento por meio de botões específicos, com as regras do fluxo validadas pelo servidor
* Exclusão de chamados
* Sistema de comentários em ordem cronológica

**Organização da lista**

* Busca por código, título, solicitante ou responsável
* Filtros por grupo e status
* Ordenação por data ou criticidade
* Contadores automáticos de caracteres nos campos de texto
* Expansão e minimização individual e global dos chamados
* Exportação dos chamados de cada grupo em arquivo CSV

**Funcionamento**

* Armazenamento permanente em banco de dados PostgreSQL
* Atualização automática da tela com as mudanças feitas por outros usuários
* Indicador de carregamento e mensagens claras de erro e sucesso

## 5. Restrições de Tecnologia e Escopo

### Restrições Tecnológicas

* **Frontend:** HTML5, CSS3 e JavaScript (ES6) puros, sem frameworks de interface ou de CSS.
* **Backend:** Node.js com Express, seguindo os princípios REST.
* **Banco de dados:** relacional (PostgreSQL). Bancos NoSQL não são permitidos nesta fase.
* **Segurança:**
  * senhas protegidas com hash (bcrypt);
  * sessões controladas por JWT;
  * segredos em variáveis de ambiente (`.env`), nunca no repositório.

### Restrições de Escopo

Algumas funcionalidades ficaram fora do escopo desta versão:

* Controle de permissões por perfil de usuário (IAM). Hoje, todo usuário autenticado pode gerenciar todos os dados.
* Edição dos dados de um chamado pela tela (a API já oferece essa operação)
* Histórico detalhado das alterações realizadas nos chamados
* Notificações automáticas e atualização em tempo real por WebSockets
* Upload de arquivos e anexos
* Login social (Google, GitHub etc.) e integração com serviços externos

</details>
&nbsp;

## Lista de Requisitos (Backlog)

A lista de requisitos, combinada com o Documento de Visão, forma o Plano de Projeto deste desafio. Os requisitos novos ou alterados em relação ao Projeto 3 estão indicados com **(novo)** ou **(alterado)**.

<details>
    <summary>Descrição(<i>clique para expandir</i>):</summary>
&nbsp;

## 1. Requisitos Funcionais (RF)

| Código   | Requisito Funcional                                                                                                      |
| -------- | ------------------------------------------------------------------------------------------------------------------------ |
| **RF01** | O sistema deve permitir o cadastro de grupos de atendimento.                                                             |
| **RF02** | O sistema deve permitir a exclusão de grupos de atendimento, junto com os chamados do grupo, após confirmação. **(alterado)** |
| **RF03** | O sistema deve impedir o cadastro de grupos com nome ou prefixo duplicados.                                              |
| **RF04** | O sistema deve permitir a criação de chamados vinculados a um grupo.                                                     |
| **RF05** | O sistema deve gerar automaticamente um código único para cada chamado (ex.: INF-001), sem reaproveitar números.         |
| **RF06** | O sistema deve permitir informar título, solicitante, responsável, data, criticidade e descrição do chamado.             |
| **RF07** | O sistema deve validar o preenchimento dos campos obrigatórios antes da criação do chamado.                              |
| **RF08** | O sistema deve listar todos os chamados cadastrados.                                                                     |
| **RF09** | O sistema deve permitir pesquisar chamados por código, título, solicitante ou responsável.                               |
| **RF10** | O sistema deve permitir filtrar chamados por grupo.                                                                      |
| **RF11** | O sistema deve permitir filtrar chamados pelos estados: Todos, Ativos, Finalizados, Pendente, Em Progresso, Pausado, Concluído e Cancelado. |
| **RF12** | O sistema deve permitir ordenar os chamados por mais novos, mais antigos ou criticidade.                                 |
| **RF13** | O sistema deve permitir alterar o status de um chamado para Em Progresso.                                                |
| **RF14** | O sistema deve permitir pausar um chamado em andamento.                                                                  |
| **RF15** | O sistema deve permitir retomar um chamado pausado.                                                                      |
| **RF16** | O sistema deve permitir concluir um chamado.                                                                             |
| **RF17** | O sistema deve permitir cancelar um chamado.                                                                             |
| **RF18** | O sistema deve exibir comentários associados a cada chamado em ordem cronológica.                                        |
| **RF19** | O sistema deve permitir adicionar comentários aos chamados.                                                              |
| **RF20** | O sistema deve manter os comentários salvos junto ao chamado.                                                            |
| **RF21** | O sistema deve exibir a quantidade de chamados abertos e o total de chamados por grupo.                                  |
| **RF22** | O sistema deve contabilizar como chamados abertos os estados Pendente, Em Progresso e Pausado.                           |
| **RF23** | O sistema deve permitir expandir ou recolher individualmente cada chamado.                                               |
| **RF24** | O sistema deve permitir expandir ou recolher todos os chamados simultaneamente.                                          |
| **RF25** | O sistema deve exibir, no modo recolhido, apenas as informações principais do chamado.                                   |
| **RF26** | O sistema deve permitir expandir e recolher descrições longas utilizando o botão "Ver mais".                             |
| **RF27** | O sistema deve exportar os chamados de um grupo para um arquivo CSV.                                                     |
| **RF28** | O sistema deve armazenar grupos, chamados e comentários em um banco de dados relacional no servidor. **(alterado)**     |
| **RF29** | O sistema deve atualizar automaticamente a interface após qualquer alteração realizada nos dados.                        |
| **RF30** | O sistema deve impedir comentários sem texto. Quando o nome não for informado, deve usar o nome do usuário logado. **(alterado)** |
| **RF31** | O sistema deve limitar o tamanho dos campos de entrada, tanto na tela quanto no servidor. **(alterado)**                  |
| **RF32** | O sistema deve exibir um contador de caracteres para os campos de texto do formulário de chamados e comentários.         |
| **RF33** | O sistema deve permitir o cadastro de novos usuários com nome, e-mail e senha. **(novo)**                                |
| **RF34** | O sistema deve impedir o cadastro de dois usuários com o mesmo e-mail. **(novo)**                                         |
| **RF35** | O sistema deve permitir a autenticação de usuários existentes por e-mail e senha. **(novo)**                             |
| **RF36** | O sistema deve permitir que o usuário encerre a sessão (logout). **(novo)**                                               |
| **RF37** | O sistema deve impedir o acesso a qualquer dado quando o usuário não estiver autenticado. **(novo)**                      |
| **RF38** | O sistema deve permitir a exclusão de chamados, após confirmação. **(novo)**                                              |
| **RF39** | O sistema deve recusar mudanças de status que não sigam o fluxo de atendimento. **(novo)**                                |
| **RF40** | O sistema deve refletir na tela, periodicamente, as alterações feitas por outros usuários. **(novo)**                     |
| **RF41** | O sistema deve exibir mensagens de erro claras, como "Senha incorreta" ou "Erro de conexão com o servidor". **(novo)**    |
| **RF42** | O sistema deve indicar visualmente quando estiver aguardando uma resposta do servidor. **(novo)**                        |

## 2. Requisitos Não Funcionais (RNF)

| Código    | Requisito Não Funcional                                                                                               |
| --------- | --------------------------------------------------------------------------------------------------------------------- |
| **RNF01** | A interface deve ser responsiva para utilização em computadores, tablets e smartphones.                               |
| **RNF02** | O frontend deve usar HTML5, CSS3 e JavaScript puro (Vanilla JS), e o backend deve usar Node.js. **(alterado)**        |
| **RNF03** | Os dados devem ser armazenados em um banco de dados relacional (PostgreSQL). **(alterado)**                           |
| **RNF04** | As senhas nunca devem ser armazenadas em texto puro: deve-se usar hash com bcrypt. **(alterado)**                     |
| **RNF05** | A interface deve possuir navegação simples e intuitiva.                                                               |
| **RNF06** | O sistema deve utilizar componentes visuais padronizados para manter consistência na interface.                       |
| **RNF07** | Os formulários devem validar os dados antes do envio, e o servidor deve validar novamente antes de gravar. **(alterado)** |
| **RNF08** | Os campos de entrada devem possuir limite máximo de caracteres.                                                       |
| **RNF09** | O sistema deve exibir contadores de caracteres em tempo real nos campos de texto.                                     |
| **RNF10** | O sistema deve utilizar cores e indicadores visuais para representar criticidade e status dos chamados.               |
| **RNF11** | O sistema deve permitir navegação sem recarregar a página durante as operações.                                       |
| **RNF12** | O sistema deve manter desempenho adequado mesmo com dezenas de chamados cadastrados.                                  |
| **RNF13** | O código-fonte deve ser organizado em camadas (rotas, controllers, services, repositories) para facilitar manutenção. **(alterado)** |
| **RNF14** | O layout deve adaptar automaticamente seus componentes para diferentes resoluções de tela.                            |
| **RNF15** | Os arquivos CSV exportados devem ser compatíveis com softwares de planilhas, como Microsoft Excel e LibreOffice Calc. |
| **RNF16** | O acesso às rotas privadas da API deve ser controlado por tokens JWT com prazo de validade. **(novo)**                |
| **RNF17** | A API deve retornar códigos HTTP adequados (400, 401, 404, 409, 500) e seguir os princípios REST. **(novo)**          |
| **RNF18** | As consultas ao banco devem ser parametrizadas, para impedir SQL Injection. **(novo)**                                 |
| **RNF19** | Senhas, chaves e endereços de banco devem ficar em variáveis de ambiente (`.env`), fora do repositório. **(novo)**     |
| **RNF20** | Textos digitados por usuários devem ser exibidos de forma segura, sem executar código (proteção contra XSS). **(novo)** |
| **RNF21** | A API deve aceitar requisições apenas do endereço do frontend publicado (CORS). **(novo)**                            |
| **RNF22** | O sistema deve estar publicado na nuvem e acessível por celular e computador. **(novo)**                               |
| **RNF23** | O backend deve ter testes automatizados cobrindo autenticação, CRUD e acesso sem token. **(novo)**                     |

</details>
&nbsp;

## Histórias de Usuário e Planejamento do Quadro Kanban

As User Stories (US) guiam o desenvolvimento de forma concisa e servem de base para um quadro Kanban, que mostra o que é esperado do projeto e as etapas até o entregável. Por ser uma ferramenta viva, o quadro pode mudar e crescer durante o desenvolvimento.

As histórias US01 a US17 vêm do Projeto 3 e tiveram as subtarefas atualizadas para usar a API. As histórias US18 a US24 são novas.

<details>
    <summary>Descrição(<i>clique para expandir</i>):</summary>
&nbsp;

## Histórias de Usuário (User Stories)

### US01 – Cadastro de grupos

**História de Usuário**

Como um administrador, eu quero cadastrar grupos de atendimento, para que os chamados possam ser organizados por departamento.

**Subtarefas**

* Criar formulário de cadastro de grupos
* Validar nome e prefixo na tela e no servidor
* Impedir grupos duplicados (regra no banco de dados)
* Salvar grupo pela API (`POST /groups`)
* Atualizar a lista de grupos automaticamente

---

### US02 – Exclusão de grupos

**História de Usuário**

Como um administrador, eu quero remover grupos de atendimento, para manter o sistema organizado.

**Subtarefas**

* Criar botão de exclusão com confirmação
* Excluir pela API (`DELETE /groups/:id`), removendo também os chamados do grupo
* Atualizar interface após exclusão

---

### US03 – Cadastro de chamados

**História de Usuário**

Como um usuário, eu quero registrar um chamado, para solicitar atendimento.

**Subtarefas**

* Criar formulário de chamado
* Validar campos obrigatórios
* Associar chamado ao grupo
* Gerar código automático no servidor
* Salvar pela API (`POST /tickets`)

---

### US04 – Consulta dos chamados

**História de Usuário**

Como um usuário, eu quero visualizar todos os chamados cadastrados, para acompanhar as solicitações existentes.

**Subtarefas**

* Buscar chamados pela API (`GET /tickets`)
* Renderizar cards dinamicamente
* Exibir estado vazio quando não houver chamados
* Atualizar listagem automaticamente

---

### US05 – Controle do fluxo de atendimento

**História de Usuário**

Como um responsável, eu quero alterar o status dos chamados, para controlar seu andamento.

**Subtarefas**

* Implementar botão "Avançar chamado"
* Implementar estados "Em Progresso" e "Pausado"
* Implementar retomada, conclusão e cancelamento
* Enviar a mudança pela API (`PATCH /tickets/:id/status`)
* Recusar no servidor as transições fora do fluxo

---

### US06 – Comentários

**História de Usuário**

Como um usuário, eu quero registrar comentários em um chamado, para documentar seu andamento.

**Subtarefas**

* Criar formulário de comentários
* Pré-preencher o nome com o usuário logado
* Validar o texto do comentário
* Salvar pela API (`POST /tickets/:id/comments`)
* Exibir comentários em ordem cronológica

---

### US07 – Pesquisa

**História de Usuário**

Como um usuário, eu quero pesquisar chamados rapidamente, para localizar uma solicitação específica.

**Subtarefas**

* Criar campo de busca
* Filtrar por código, título, solicitante e responsável

---

### US08 – Filtros

**História de Usuário**

Como um usuário, eu quero filtrar chamados por status e grupo, para visualizar somente as informações relevantes.

**Subtarefas**

* Filtro por grupo
* Filtro por status
* Categoria "Ativos"
* Categoria "Finalizados"

---

### US09 – Ordenação

**História de Usuário**

Como um usuário, eu quero ordenar os chamados, para visualizar primeiro os itens mais importantes.

**Subtarefas**

* Ordenação por data
* Ordenação por criticidade

---

### US10 – Expansão dos chamados

**História de Usuário**

Como um usuário, eu quero expandir apenas o chamado que estou consultando, para reduzir a quantidade de informações exibidas na tela.

**Subtarefas**

* Criar modo recolhido
* Criar expansão por clique
* Ajustar layout resumido

---

### US11 – Expandir/Recolher todos

**História de Usuário**

Como um usuário, eu quero expandir ou recolher todos os chamados simultaneamente, para facilitar a navegação entre muitos registros.

**Subtarefas**

* Criar botão na barra de ferramentas
* Controlar estado global
* Atualizar todos os cards

---

### US12 – Controle da descrição

**História de Usuário**

Como um usuário, eu quero expandir descrições longas somente quando necessário, para manter a interface organizada.

**Subtarefas**

* Limitar altura da descrição
* Criar botões "Ver mais" e "Ver menos"

---

### US13 – Contadores de caracteres

**História de Usuário**

Como um usuário, eu quero visualizar quantos caracteres ainda posso digitar, para evitar ultrapassar os limites permitidos.

**Subtarefas**

* Contadores do título, do nome e da descrição
* Contadores do nome e do texto do comentário

---

### US14 – Exportação CSV

**História de Usuário**

Como um administrador, eu quero exportar os chamados de um grupo para um arquivo CSV, para gerar relatórios ou realizar análises externas.

**Subtarefas**

* Gerar arquivo CSV compatível com Excel (acentos e aspas)
* Criar botão Exportar
* Baixar arquivo automaticamente

---

### US15 – Estatísticas dos grupos

**História de Usuário**

Como um administrador, eu quero visualizar a quantidade de chamados abertos em cada grupo, para acompanhar sua carga de trabalho.

**Subtarefas**

* Calcular total e abertos no banco de dados
* Considerar chamados pausados como abertos
* Atualizar automaticamente

---

### US16 – Persistência dos dados **(alterada)**

**História de Usuário**

Como um usuário, eu quero que meus dados fiquem salvos em um servidor, para encontrá-los intactos em qualquer dispositivo, mesmo depois de limpar o navegador.

**Subtarefas**

* Modelar as tabelas no PostgreSQL (usuários, grupos, chamados e comentários)
* Criar as migrations
* Substituir o LocalStorage por chamadas à API
* Garantir que os dados sobrevivam a um reinício do servidor

---

### US17 – Interface Responsiva

**História de Usuário**

Como um usuário, eu quero utilizar o sistema em computadores e dispositivos móveis, para acessar os chamados de qualquer lugar.

**Subtarefas**

* Adaptar toolbar, cards, modais e formulários
* Adaptar a tela de login
* Evitar rolagem horizontal com textos longos

---

### US18 – Cadastro de conta **(nova)**

**História de Usuário**

Como um novo membro da equipe, eu quero criar uma conta, para acessar o painel de chamados.

**Subtarefas**

* Criar tela de cadastro (nome, e-mail, senha e confirmação)
* Criar rota `POST /auth/register`
* Validar e-mail e senha (mínimo de 8 caracteres)
* Impedir e-mail duplicado
* Salvar a senha com hash bcrypt

---

### US19 – Login e logout **(nova)**

**História de Usuário**

Como um usuário, eu quero entrar com meu e-mail e senha e sair quando terminar, para usar o sistema com segurança.

**Subtarefas**

* Criar tela de login
* Criar rota `POST /auth/login`, que gera um token JWT
* Guardar o token e enviá-lo em cada requisição
* Manter a sessão ao recarregar a página
* Criar botão "Sair"

---

### US20 – Proteção dos dados **(nova)**

**História de Usuário**

Como um usuário, eu quero que os dados da equipe só sejam acessíveis por quem fez login, para que fiquem protegidos.

**Subtarefas**

* Criar middleware que verifica o token
* Responder 401 (Não Autorizado) sem token ou com token inválido/expirado
* Levar o usuário de volta ao login quando a sessão expirar
* Limitar tentativas de login por IP

---

### US21 – Sincronização entre dispositivos **(nova)**

**História de Usuário**

Como um usuário, eu quero ver as mudanças feitas pelos colegas sem precisar recarregar a página, para trabalhar com informações atualizadas.

**Subtarefas**

* Buscar novidades a cada 30 segundos e ao voltar para a aba
* Pausar a atualização enquanto o usuário digita
* Redesenhar a tela só quando algo mudou

---

### US22 – Exclusão de chamados **(nova)**

**História de Usuário**

Como um responsável, eu quero excluir um chamado criado por engano, para manter a lista limpa.

**Subtarefas**

* Criar botão "Excluir" com confirmação
* Criar rota `DELETE /tickets/:id`, removendo também os comentários

---

### US23 – Feedback de carregamento e erros **(nova)**

**História de Usuário**

Como um usuário, eu quero saber quando o sistema está trabalhando e o que deu errado, para não ficar sem resposta.

**Subtarefas**

* Barra de carregamento no topo
* Botões desativados com texto "Salvando..." durante as requisições
* Mensagens de erro e sucesso
* Estado de erro com botão "Tentar novamente"
* Aviso quando o servidor está "acordando"

---

### US24 – Publicação na nuvem **(nova)**

**História de Usuário**

Como um usuário, eu quero acessar o sistema por um endereço na internet, para usá-lo no celular e no computador.

**Subtarefas**

* Publicar o banco no Neon
* Publicar a API no Render
* Publicar o frontend no Vercel
* Configurar variáveis de ambiente e CORS

</details>
&nbsp;


## Registro de Decisões Técnicas

Este documento registra as principais decisões técnicas do desenvolvimento: o motivo de cada escolha e as alternativas consideradas.

As decisões DT01 a DT14 vêm do Projeto 3 e foram revisadas para a versão full-stack. As decisões a partir da DT15 são novas.

<details>
    <summary>Descrição(<i>clique para expandir</i>):</summary>
&nbsp;

### DT01 – Utilização de HTML, CSS e JavaScript puro no frontend

**Decisão**

Manter o frontend em HTML5, CSS3 e JavaScript puro (Vanilla JS), sem frameworks como React, Vue ou Angular.

**Justificativa**

O foco deste projeto é o backend. Manter o frontend em JavaScript puro preservou o trabalho do Projeto 3 e reforçou os fundamentos de manipulação da DOM, eventos e requisições HTTP com `fetch`, sem depender de bibliotecas externas.

---

### DT02 – Persistência em banco de dados no servidor **(substitui o LocalStorage)**

**Decisão**

Guardar grupos, chamados e comentários em um banco PostgreSQL, acessado por uma API. O LocalStorage passa a guardar apenas o token da sessão.

**Justificativa**

No Projeto 3, o LocalStorage foi escolhido por ser simples e funcionar offline. Ele, porém, prende os dados a um único navegador, o que impede colaboração, sincronização entre dispositivos e segurança. Um banco no servidor resolve as três limitações.

---

### DT03 – Arrays de objetos na tela e camada de conversão

**Decisão**

Na tela, grupos e chamados continuam representados como arrays de objetos JavaScript, agora carregados da API. O arquivo `api.js` converte os campos da API, em inglês (`title`, `requester`, `priority`), para os nomes usados na tela, em português (`titulo`, `solicitante`, `criticidade`).

**Justificativa**

A conversão permitiu reaproveitar quase toda a lógica de renderização, filtros e ordenação do Projeto 3. Ao mesmo tempo, a API seguiu a convenção de mercado de usar nomes em inglês.

---

### DT04 – Geração do código do chamado no servidor

**Decisão**

O código (`PREFIXO-001`) passou a ser gerado pelo servidor. Cada grupo tem um contador no banco, incrementado de forma atômica dentro de uma transação.

Exemplo:

```
SUP-001
FIN-004
RH-012
```

**Justificativa**

No Projeto 3, o código era calculado pela quantidade de chamados do grupo, o que repetia números depois de uma exclusão. Com várias pessoas usando o sistema ao mesmo tempo, o cálculo também precisa ser feito em um único lugar.

O contador atômico garante que:

- o código nunca se repete;
- os números não são reaproveitados, mesmo depois de excluir chamados;
- duas pessoas criando chamados ao mesmo tempo recebem códigos diferentes.

---

### DT05 – Status em fluxo controlado, validado pelo servidor

**Decisão**

O sistema tem um fluxo fixo de estados:

```
Pendente ──> Em Progresso ──> Concluído
   │            │   ▲
   │            ▼   │
   │          Pausado
   └──────────────┴──> Cancelado     (Concluído e Cancelado são finais)
```

Nesta versão, o fluxo também é validado pela API. Uma mudança fora dele, ou feita sobre um chamado que outra pessoa acabou de alterar, recebe a resposta **409 (Conflito)**.

**Justificativa**

Esse fluxo representa o ciclo real de atendimento das centrais de suporte. A validação no servidor impede mudanças de status incoerentes, mesmo que alguém tente chamar a API diretamente, sem passar pela tela.

---

### DT06 – Comentários em tabela própria, entregues junto ao chamado

**Decisão**

No banco, os comentários ficam em uma tabela própria, ligada ao chamado por chave estrangeira. Ao listar os chamados, a API já envia os comentários de cada um em um array, como na versão anterior:

```javascript
comentarios: [
    {
        autor,
        texto,
        data
    }
]
```

**Justificativa**

A tabela separada é a forma correta de modelar uma relação "um para muitos" em um banco relacional. Entregar os comentários junto ao chamado mantém a renderização simples e evita uma requisição extra para cada chamado.

---

### DT07 – Contadores de caracteres em tempo real

**Decisão**

Todos os campos com limite de caracteres exibem um contador em tempo real.

Exemplo:

```
18 / 64
```

**Justificativa**

Melhora a experiência do usuário e reduz erros de preenchimento.

Foi implementado nos campos:

- título
- solicitante
- descrição
- nome do comentário
- comentário

---

### DT08 – Cards expansíveis

**Decisão**

Os chamados iniciam recolhidos e podem ser expandidos individualmente ou todos de uma vez.

**Justificativa**

Com muitos chamados cadastrados, a interface ficava excessivamente longa.

A solução melhora:

- navegação
- leitura
- organização visual

---

### DT09 – Busca dinâmica

**Decisão**

Implementar busca em tempo real, considerando:

- código
- título
- solicitante
- responsável

**Justificativa**

Permite localizar rapidamente chamados específicos sem recarregar a página. A busca é feita na tela, sobre os dados já carregados, e responde a cada tecla sem fazer uma requisição ao servidor. A API também oferece busca e filtros (`GET /tickets?search=...`) para uso futuro.

---

### DT10 – Filtros por status

**Decisão**

Implementar filtros rápidos:

- Todos
- Ativos
- Finalizados
- Pendente, Em Progresso, Pausado, Concluído e Cancelado

**Justificativa**

Facilita o acompanhamento operacional dos chamados.

O agrupamento "Ativos" inclui:

- Pendente
- Em Progresso
- Pausado

---

### DT11 – Exportação em CSV

**Decisão**

Cada grupo tem a opção de exportar seus chamados em formato CSV.

**Justificativa**

Permite:

- backup
- compartilhamento
- abertura no Excel
- relatórios

O CSV foi escolhido por ser um formato universal e simples. Nesta versão, o arquivo também trata corretamente aspas e acentos no Excel.

---

### DT12 – Interface Responsiva

**Decisão**

Toda a interface, incluindo a nova tela de login, foi construída com Flexbox, Grid Layout e Media Queries.

**Justificativa**

Permite usar o sistema em:

- desktop
- notebook
- tablet
- smartphone

Sem necessidade de desenvolver versões diferentes da aplicação.

---

### DT13 – Limitação de caracteres na tela e no servidor

**Decisão**

Foram definidos limites máximos para diversos campos. Eles são aplicados na tela (`maxlength`), validados pela API e garantidos pelo banco (tamanho das colunas).

| Campo | Limite |
|--------|---------|
| Nome do grupo | 64 |
| Prefixo do grupo | 5 (letras e números) |
| Título | 64 |
| Solicitante | 64 |
| Responsável | 64 |
| Descrição | 4000 |
| Nome do comentário | 32 |
| Comentário | 4000 |

**Justificativa**

Evita excesso de informações e mantém a consistência dos dados. A validação no servidor é obrigatória, porque os limites da tela podem ser contornados por quem chama a API diretamente.

---

### DT14 – Uso da Inteligência Artificial como ferramenta de apoio

**Decisão**

Utilizar ferramentas de IA como apoio durante o desenvolvimento.

**Justificativa**

A IA foi utilizada para:

- dividir a complexidade do backend em etapas menores
- esclarecer conceitos (REST, JWT, hashing, SQL)
- gerar e revisar trechos de código
- comparar alternativas de implementação e de hospedagem
- auxiliar na documentação do projeto

---

### DT15 – Node.js com Express 5 **(nova)**

**Decisão**

Construir a API em Node.js com o framework Express (versão 5).

**Justificativa**

O Node.js é exigido pelo desafio e permite usar JavaScript também no servidor. O Express é o framework mais usado para APIs em Node. A versão 5 encaminha automaticamente os erros de funções `async` para o tratamento central, o que evita que o servidor caia quando o banco falha.

---

### DT16 – PostgreSQL hospedado no Neon **(nova)**

**Decisão**

Usar PostgreSQL como banco relacional, hospedado no Neon, tanto no desenvolvimento quanto em produção. O acesso é feito com a biblioteca `pg`, com SQL escrito à mão e consultas parametrizadas.

**Alternativas consideradas**

- **SQLite:** permitido pelo desafio, mas o disco dos serviços gratuitos de hospedagem é apagado a cada reinício, o que faria os dados se perderem.
- **PostgreSQL instalado localmente ou via Docker:** descartado para evitar instalações e conflitos com outros programas na máquina de desenvolvimento.
- **ORM (Prisma, Sequelize):** descartado para praticar SQL de verdade, que é um dos objetivos do desafio.

**Justificativa**

O Neon é gratuito e não exige instalação. O mesmo serviço atende o desenvolvimento, os testes e a produção, cada um em um banco separado.

---

### DT17 – Arquitetura em camadas **(nova)**

**Decisão**

Organizar o backend em camadas:

```
rotas -> middlewares (autenticação, validação) -> controllers -> services -> repositories -> banco
```

**Justificativa**

Cada camada tem uma única responsabilidade:

- as rotas definem as URLs;
- os controllers lidam com HTTP;
- os services aplicam as regras de negócio;
- os repositories são os únicos que escrevem SQL.

Isso facilita encontrar e corrigir problemas, testar e evoluir o sistema.

---

### DT18 – Senhas com bcrypt **(nova)**

**Decisão**

Guardar apenas o hash bcrypt das senhas (biblioteca `bcryptjs`), nunca o texto original.

**Justificativa**

O bcrypt é lento de propósito e inclui um "salt" aleatório, o que torna inviável descobrir as senhas mesmo que o banco vaze. A versão `bcryptjs` foi escolhida por ser escrita em JavaScript puro e não precisar de compilação no Windows.

---

### DT19 – Sessão com JWT **(nova)**

**Decisão**

Depois do login, a API gera um token JWT assinado, com validade configurável (1 dia por padrão). O frontend envia esse token no cabeçalho `Authorization` de cada requisição.

**Justificativa**

O JWT é exigido pelo desafio e não obriga o servidor a guardar sessões. O token guarda apenas o id do usuário. Ele não é criptografado, mas a assinatura impede que seja alterado sem o segredo da aplicação.

---

### DT20 – Validação de dados com Zod **(nova)**

**Decisão**

Validar o corpo, os parâmetros e a busca de cada requisição com schemas da biblioteca Zod, antes de chegar às regras de negócio.

**Justificativa**

Dados inválidos são barrados na entrada, com mensagens claras em português. O banco tem suas próprias regras (`CHECK`, `UNIQUE`, chaves estrangeiras) como segunda barreira.

---

### DT21 – Modelo de acesso compartilhado (IAM para o futuro) **(nova)**

**Decisão**

Nesta versão, todo usuário autenticado funciona como "superusuário" e pode ver, criar, editar e excluir todos os grupos e chamados.

**Justificativa**

Um sistema completo de perfis e permissões (IAM) aumentaria muito a complexidade. Como o EasyDesk é usado por uma equipe que compartilha os mesmos chamados, os dados foram tratados como da equipe. O banco já foi preparado para essa evolução, com uma coluna `role` nos usuários e um registro de quem criou cada item.

---

### DT22 – Exclusões sem dados órfãos **(nova)**

**Decisão**

- Excluir um grupo exclui os chamados dele, e excluir um chamado exclui os comentários dele.
- Excluir um usuário **não** exclui os dados da equipe: o registro de "criado por" apenas fica vazio.

**Justificativa**

Evita que o banco acumule registros sem dono. Ao mesmo tempo, impede que a saída de uma pessoa da equipe apague o trabalho de todos.

---

### DT23 – Proteção contra XSS no frontend **(nova)**

**Decisão**

Todo texto vindo do servidor é "escapado" antes de ser inserido no HTML.

**Justificativa**

Com os dados compartilhados, um texto malicioso salvo por um usuário (por exemplo, `<img onerror=...>` no título de um chamado) poderia rodar no navegador de todos os outros. O escape faz esse conteúdo aparecer como texto comum.

---

### DT24 – Sincronização por consulta periódica **(nova)**

**Decisão**

A tela busca novidades a cada 30 segundos e quando a aba volta ao foco. A atualização pausa enquanto o usuário está digitando.

**Alternativa considerada**

WebSockets (Socket.io), que atualizam em tempo real. A opção ficou como possível expansão futura, porque exige um servidor sempre ativo e aumenta a complexidade.

**Justificativa**

É simples, funciona no plano gratuito de hospedagem e atende ao requisito de refletir na tela as mudanças feitas no servidor.

---

### DT25 – Hospedagem: Neon + Render + Vercel **(nova)**

**Decisão**

- **Banco:** Neon (PostgreSQL)
- **API:** Render (Web Service)
- **Frontend:** Vercel (site estático)

**Justificativa**

Os três têm plano gratuito, se conectam ao GitHub e publicam automaticamente a cada `git push`. A limitação conhecida é que a API do Render "dorme" depois de um tempo sem uso. Por isso o frontend mostra um aviso quando o servidor está iniciando.

---

### DT26 – Testes automatizados **(nova)**

**Decisão**

Testar a API com Jest e Supertest, usando um banco de testes separado, que é limpo antes de cada teste.

**Justificativa**

Os testes verificam de forma automática os pontos críticos do desafio:

- cadastro, login e senha guardada como hash;
- respostas 401 sem token ou com token inválido/expirado;
- CRUD completo de grupos, chamados e comentários;
- fluxo de status e validações;
- tentativa de SQL Injection;
- códigos únicos mesmo com criações simultâneas.

</details>
&nbsp;

## O projeto

A interface mantém a identidade visual do Projeto 3: fundo branco com botões em tons de azul, inspirada em ferramentas empresariais como o Azure DevOps.

As principais mudanças estão por trás da tela:

- tela de login e cadastro;
- nome do usuário e botão "Sair" no topo;
- barra de carregamento;
- mensagens de erro e sucesso.

O HTML contém a estrutura da tela de login, do painel e dos formulários (modais). O CSS contém toda a estilização e a adaptação para celular. O JavaScript está dividido em três arquivos:

| Arquivo | Responsabilidade |
| --- | --- |
| `config.js` | Endereço da API (local ou de produção) |
| `api.js` | Comunicação com o servidor: requisições, token, conversão de campos e mensagens de erro |
| `script.js` | Telas, renderização dos cards, filtros, formulários e eventos |

O projeto segue os requisitos e restrições do desafio ConnectHub:

<details>
    <summary>Descrição(<i>clique para expandir</i>):</summary>
&nbsp;

### Requisitos funcionais

- permitir o cadastro de novos usuários
- permitir a autenticação dos usuários existentes
- garantir que só usuários autenticados acessem e alterem os dados
- armazenar todas as informações em um banco de dados relacional SQL
- permitir que o frontend consuma os dados da API, refletindo na interface as mudanças feitas no servidor

### Requisitos não funcionais

- **Proteção de credenciais:** é proibido salvar senhas em texto puro; deve-se usar hashing com algoritmos como bcrypt
- **Sessões seguras:** o acesso às rotas privadas deve ser controlado por JWT
- **Tratamento de exceções:** a API deve retornar códigos HTTP apropriados, como 401 para não autorizado e 404 para não encontrado

### Restrições técnicas

- o backend deve ser desenvolvido obrigatoriamente em Node.js
- o banco deve ser relacional (MySQL, PostgreSQL ou SQLite); bancos NoSQL, como MongoDB, não são permitidos nesta fase
- a API deve seguir os princípios REST, usando corretamente GET, POST, PUT e DELETE
- frontend e backend devem estar organizados em uma estrutura de pastas clara, com instruções de instalação no README

### Critérios de aceite

- [x] O usuário consegue criar uma conta e fazer login
- [x] A aplicação impede o acesso a dados privados quando o usuário não está autenticado
- [x] O CRUD completo funciona e os dados persistem no banco SQL
- [x] O frontend exibe mensagens de erro claras, como "Senha incorreta" ou "Erro de conexão com o servidor"
- [x] As senhas estão guardadas no banco como hash
- [x] O backend usa JWT para validar sessões e proteger rotas
- [x] Todas as variáveis sensíveis estão no `.env`, fora do repositório público
- [x] O código segue uma estrutura de pastas organizada (camadas, no estilo MVC)
- [x] A aplicação mostra o estado de carregamento enquanto espera o servidor
- [x] O sistema é responsivo e funciona no celular e no computador
- [x] Frontend e backend estão no GitHub com README detalhado
- [x] A API e o banco estão publicados na nuvem, com link funcional para testes externos

</details>
&nbsp;

Além do cobrado, foram implementados alguns itens extras:

- **Testes automatizados** da API (Jest + Supertest), incluindo tentativas de acesso sem token e de SQL Injection.
- **Coleção do Postman** com todas as rotas, que salva o token automaticamente após o login (`backend/docs`).
- **Validação com Zod** em todas as rotas, com mensagens em português.
- **Limite de tentativas** de login e cadastro por IP, contra ataques de força bruta.
- **Cabeçalhos de segurança HTTP** (Helmet) e **CORS** restrito ao endereço do frontend.
- **Proteção contra XSS** na exibição de textos digitados por usuários.
- **Fluxo de status validado pelo servidor**, com detecção de alterações simultâneas.
- **Códigos de chamado únicos** mesmo com várias pessoas criando chamados ao mesmo tempo.
- **Sincronização automática** da tela com as mudanças feitas por outros usuários.
- **Exclusão de chamados** pela interface.
- **Conta do usuário:** rotas para ver e editar o perfil, trocar a senha e excluir a conta (disponíveis na API).
- **Migrations** que criam e atualizam as tabelas automaticamente ao iniciar o servidor.

## Como visualizar e executar

O link da aplicação publicada e o passo a passo para rodar localmente estão no [README principal](../README.md).
