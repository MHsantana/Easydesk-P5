-- Esquema inicial do EasyDesk.
--
-- Modelo de acesso atual: todo usuário autenticado é "superuser" e pode ver,
-- criar, editar e excluir todos os grupos e chamados (dados compartilhados pela equipe).
-- A coluna users.role e as colunas created_by já existem para que, no futuro,
-- seja possível criar uma camada de permissões (IAM) sem refazer o banco.
--
-- Relações:
--   um grupo possui muitos chamados       (apagar o grupo apaga os chamados: CASCADE)
--   um chamado possui muitos comentários  (apagar o chamado apaga os comentários: CASCADE)
--   um usuário cria grupos/chamados/comentários (apagar o usuário NÃO apaga os dados
--   da equipe; o created_by apenas vira NULL: SET NULL)

CREATE TABLE users (
  id            INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name          VARCHAR(64)  NOT NULL,
  email         VARCHAR(254) NOT NULL,
  password_hash VARCHAR(100) NOT NULL,
  role          VARCHAR(20)  NOT NULL DEFAULT 'superuser',
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- E-mail único sem diferenciar maiúsculas/minúsculas.
CREATE UNIQUE INDEX users_email_unique ON users (LOWER(email));

CREATE TABLE ticket_groups (
  id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name        VARCHAR(64) NOT NULL,
  prefix      VARCHAR(5)  NOT NULL CHECK (prefix ~ '^[A-Z0-9]{1,5}$'),
  -- Último número usado nos códigos dos chamados (ex.: INF-001, INF-002...).
  ticket_seq  INTEGER     NOT NULL DEFAULT 0,
  created_by  INTEGER     REFERENCES users (id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Não pode haver dois grupos com o mesmo prefixo ou o mesmo nome.
CREATE UNIQUE INDEX ticket_groups_prefix_unique ON ticket_groups (prefix);
CREATE UNIQUE INDEX ticket_groups_name_unique   ON ticket_groups (LOWER(name));

CREATE TABLE tickets (
  id           INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  group_id     INTEGER       NOT NULL REFERENCES ticket_groups (id) ON DELETE CASCADE,
  code         VARCHAR(16)   NOT NULL,
  title        VARCHAR(64)   NOT NULL,
  description  VARCHAR(4000) NOT NULL,
  requester    VARCHAR(64)   NOT NULL,
  owner        VARCHAR(64),
  priority     VARCHAR(10)   NOT NULL CHECK (priority IN ('Baixa', 'Média', 'Alta', 'Crítica')),
  status       VARCHAR(16)   NOT NULL DEFAULT 'Pendente'
               CHECK (status IN ('Pendente', 'Em Progresso', 'Pausado', 'Concluído', 'Cancelado')),
  opened_on    DATE          NOT NULL DEFAULT CURRENT_DATE,
  created_by   INTEGER       REFERENCES users (id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ   NOT NULL DEFAULT now(),
  CONSTRAINT tickets_group_code_unique UNIQUE (group_id, code)
);

CREATE INDEX tickets_group_id_idx ON tickets (group_id);
CREATE INDEX tickets_status_idx   ON tickets (status);

CREATE TABLE comments (
  id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ticket_id   INTEGER       NOT NULL REFERENCES tickets (id) ON DELETE CASCADE,
  author      VARCHAR(32)   NOT NULL,
  body        VARCHAR(4000) NOT NULL,
  created_by  INTEGER       REFERENCES users (id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX comments_ticket_id_idx ON comments (ticket_id);
