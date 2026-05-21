# Projeto LIA

Central operacional para o **Grupo Empresarial Lia**, reunindo processos internos da Lia Burguer, Lia Pizza e Lia Salgados em uma plataforma web com login, dashboard, checklists, manuais técnicos e a assistente operacional **Lia**.

O projeto nasceu como uma aplicação Streamlit e hoje evolui sobre uma arquitetura web com **React + TypeScript** no frontend e **FastAPI** no backend. A versão Streamlit permanece apenas como referência legado enquanto a Central LIA atual concentra a evolução do produto.

## Visão Geral

O objetivo da Central LIA é ajudar a operação diária das lojas a manter padrão, organização e rastreabilidade.

Principais recursos:

- Login interno com usuário, senha com hash e token JWT.
- Dashboard operacional.
- Checklists persistentes por data e loja.
- Observação de fechamento de turno.
- Manuais técnicos por unidade.
- Chatbot **Lia**, com respostas baseadas nos manuais internos.
- Histórico resumido das conversas da Lia.
- Painel administrativo inicial para gestão.
- Gestão administrativa básica de usuários e lojas.
- Área exclusiva da liderança com login próprio, cadastro de funcionários, feedbacks e medidas disciplinares.
- Ocorrências operacionais com status e severidade.
- Upload protegido de fotos como evidências de checklist.
- Relatórios semanais/mensais de checklists, pendências, ocorrências e evidências.
- Auditoria automática de escritas da API.
- Observabilidade básica com `X-Request-ID` e métricas agregadas.
- Backend preparado para SQLite em desenvolvimento e PostgreSQL em produção.
- Migrations com Alembic.
- Deploy Docker com React e FastAPI no mesmo serviço.

## Arquitetura

```text
PROJETO_LIA/
├── apps/
│   ├── api/
│   │   └── app/
│   │       ├── routers/
│   │       ├── services/
│   │       ├── repositories/
│   │       ├── config.py
│   │       ├── database.py
│   │       ├── models.py
│   │       ├── schemas.py
│   │       ├── security.py
│   │       └── seed.py
│   └── web/
│       └── src/
├── alembic/
├── assets/
├── Dockerfile
├── render.yaml
├── requirements.txt
└── meu_assistente.py
```

### Backend

O backend fica em `apps/api` e usa:

- FastAPI para API HTTP.
- SQLAlchemy para ORM.
- Alembic para migrations.
- PyJWT para autenticação.
- Gemini via `google-genai` para a Lia.
- Repository/Service em checklists, ocorrências, evidências, relatórios e admin para separar responsabilidades.

Camadas principais:

- `routers`: endpoints e injeção de dependências.
- `services`: regras de negócio.
- `repositories`: consultas e persistência no banco.
- `models.py`: modelos SQLAlchemy.
- `schemas.py`: contratos Pydantic.

### Frontend

O frontend fica em `apps/web` e usa:

- React.
- TypeScript.
- Vite.
- Tailwind CSS.
- TanStack Query.
- React Router.
- Lucide React.

### Legado

`meu_assistente.py` mantém a versão Streamlit original como referência temporária. A evolução principal do produto deve acontecer em `apps/web` e `apps/api`.

## Requisitos

- Python 3.11+ recomendado para produção.
- Node.js compatível com o projeto Vite.
- npm.
- Git.

No ambiente atual de desenvolvimento, o projeto também foi validado com Python instalado localmente no Windows.

## Configuração Local

Crie um arquivo `.env` a partir do exemplo:

```powershell
copy .env.example .env
```

Edite o `.env` com seus valores locais.

Exemplo mínimo para desenvolvimento:

```env
DATABASE_URL="sqlite:///./lia.db"
AUTO_CREATE_TABLES="true"
APP_ENV="development"
JWT_SECRET="troque-esse-segredo"
ACCESS_TOKEN_MINUTES="480"
SESSION_COOKIE_SECURE="false"
SESSION_COOKIE_SAMESITE="lax"
FRONTEND_ORIGINS="http://localhost:5173,http://127.0.0.1:5173,http://127.0.0.1:8062"

LIA_ADMIN_USER="admin"
LIA_ADMIN_PASSWORD="troque-essa-senha"
LIA_LEADERSHIP_USER="lideranca"
LIA_LEADERSHIP_PASSWORD="troque-essa-senha-da-lideranca"

GEMINI_API_KEY="sua_chave_gemini"
MODELO_GEMINI="gemini-2.5-flash"
UPLOAD_DIR="data/uploads/checklist-evidences"
MAX_UPLOAD_BYTES="5242880"
```

Não commite `.env`. Ele deve ficar apenas na máquina local ou nas variáveis do Render.

## Rodando Localmente

### Backend

```powershell
cd E:\PROJETO_LIA
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt -r requirements-dev.txt
alembic upgrade head
uvicorn apps.api.app.main:app --reload --host 127.0.0.1 --port 8000
```

API local:

```text
http://127.0.0.1:8000
```

Healthcheck:

```text
http://127.0.0.1:8000/health
```

### Frontend

Em outro terminal:

```powershell
cd E:\PROJETO_LIA\apps\web
npm install
npm run dev
```

Frontend local:

```text
http://127.0.0.1:5173
```

### Rodando o Build Integrado

Quando o frontend já foi buildado, o FastAPI pode servir a SPA diretamente:

```powershell
cd E:\PROJETO_LIA
npm --prefix apps/web run build
.\.venv\Scripts\python.exe -m uvicorn apps.api.app.main:app --host 127.0.0.1 --port 8062
```

Acesse:

```text
http://127.0.0.1:8062
```

Esse endereço só funciona enquanto o `uvicorn` estiver rodando.

## Banco de Dados

O projeto usa `DATABASE_URL` como configuração central.

### SQLite

Recomendado apenas para desenvolvimento local e testes simples:

```env
DATABASE_URL="sqlite:///./lia.db"
AUTO_CREATE_TABLES="true"
```

### PostgreSQL

Recomendado para produção:

```env
DATABASE_URL="postgresql+psycopg://usuario:senha@host:5432/banco"
AUTO_CREATE_TABLES="false"
APP_ENV="production"
SESSION_COOKIE_SECURE="true"
SESSION_COOKIE_SAMESITE="lax"
```

O backend também normaliza URLs `postgres://` e `postgresql://` para o driver `postgresql+psycopg://`.

Com `APP_ENV=production`, a API bloqueia o startup se `DATABASE_URL` apontar para SQLite, se
`AUTO_CREATE_TABLES=true`, ou se `JWT_SECRET`, `LIA_ADMIN_PASSWORD` e `LIA_LEADERSHIP_PASSWORD`
estiverem ausentes/fracos. Isso evita subir producao com configuracao de demonstracao.

## Migrations com Alembic

Aplicar migrations:

```powershell
alembic upgrade head
```

Ver migration atual:

```powershell
alembic current
```

Gerar nova migration:

```powershell
alembic revision --autogenerate -m "descricao_da_migration"
```

Em produção, não dependa de `Base.metadata.create_all`. Use migrations com `AUTO_CREATE_TABLES=false`.

## Variáveis de Ambiente

### Backend

| Variável | Uso |
| --- | --- |
| `DATABASE_URL` | URL do banco SQLite ou PostgreSQL. |
| `AUTO_CREATE_TABLES` | Controla criação automática de tabelas no startup. Use `false` em produção. |
| `APP_ENV` | Ambiente da API. Use `production` no Render/producao para ativar validacoes de seguranca. |
| `JWT_SECRET` | Segredo para assinar tokens JWT. |
| `ACCESS_TOKEN_MINUTES` | Duração da sessão. |
| `SESSION_COOKIE_SECURE` | Define cookie de sessao como `Secure`. Use `true` em HTTPS/producao. |
| `SESSION_COOKIE_SAMESITE` | Politica SameSite do cookie de sessao: `lax`, `strict` ou `none`. |
| `FRONTEND_ORIGINS` | Origens permitidas no CORS. |
| `LIA_ADMIN_USER` | Usuário admin inicial. |
| `LIA_ADMIN_PASSWORD` | Senha admin inicial. |
| `LIA_LEADERSHIP_USER` | Usuário do acesso exclusivo da liderança. |
| `LIA_LEADERSHIP_PASSWORD` | Senha do acesso exclusivo da liderança. |
| `STORAGE_PROVIDER` | `local` no desenvolvimento ou `supabase` em producao. |
| `SUPABASE_URL` | URL do projeto Supabase usada apenas no backend. |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key do Supabase. Nunca enviar ao frontend. |
| `SUPABASE_STORAGE_BUCKET` | Bucket privado de evidencias. |
| `SUPABASE_SIGNED_URL_EXPIRES_SECONDS` | Duracao das URLs assinadas para visualizar evidencias. |
| `GEMINI_API_KEY` | Chave da API Gemini usada pela Lia. |
| `MODELO_GEMINI` | Modelo Gemini. Padrão recomendado: `gemini-2.5-flash`. |
| `UPLOAD_DIR` | Pasta local para evidências em desenvolvimento. |
| `MAX_UPLOAD_BYTES` | Tamanho máximo de upload. Padrão: `5242880` (5MB). |

### Frontend

| Variável | Uso |
| --- | --- |
| `VITE_API_URL` | URL da API quando frontend e backend rodam separados. |

Quando o FastAPI serve o build React no mesmo domínio, `VITE_API_URL` pode ficar vazio.

## IA: Chatbot Lia

A Lia é a assistente operacional da Central LIA.

Na versão atual, ela:

- responde dúvidas operacionais;
- usa RAG operacional com chunks persistidos e similaridade local para recuperar trechos relevantes dos manuais internos;
- aceita modos de resposta: `rapido`, `detalhado` e `treinamento`;
- mostra fontes usadas;
- salva histórico resumido;
- registra interações auditáveis com pergunta, resposta, modo, fontes e latência;
- registra feedback `ajudou` / `nao_ajudou` por interação;
- agrupa dúvidas com baixa qualidade para orientar melhorias nos manuais;
- pede confirmação da gestão quando a base não é suficiente;
- não executa ações no sistema.

Camada de conhecimento:

```text
apps/api/app/services/rag_service.py
apps/api/app/services/ai_service.py
apps/api/app/repositories/manual_repository.py
apps/api/app/repositories/ai_repository.py
apps/api/app/models.py
```

A camada atual sincroniza os manuais em `ai_knowledge_chunks`, gera embeddings locais determinístico-lexicais e mantém fallback textual. Isso entrega rastreabilidade imediata e preserva o caminho para trocar o recuperador por vector store externo futuramente sem reescrever a rota `/ai/chat`.

## Endpoints Principais

As rotas de API ficam sob o prefixo `/api` para não conflitar com as páginas React, como `/checklists`, `/manuals`, `/admin`, `/api/incidents` e `/reports`.

| Método | Rota | Descrição |
| --- | --- | --- |
| `GET` | `/health` | Healthcheck da API. |
| `POST` | `/api/auth/login` | Login. |
| `GET` | `/api/auth/me` | Usuário autenticado. |
| `GET` | `/api/manuals` | Lista manuais técnicos. |
| `GET` | `/api/checklists` | Lista checklists por data e loja. |
| `PATCH` | `/api/checklists/{run_id}/items` | Atualiza item de checklist. |
| `PATCH` | `/api/checklists/{run_id}/closing-note` | Atualiza observação de fechamento. |
| `POST` | `/api/ai/chat` | Conversa com a Lia. |
| `GET` | `/api/ai/history` | Histórico resumido da Lia. |
| `GET` | `/api/ai/interactions` | Histórico auditável das interações da IA para administradores. |
| `POST` | `/api/ai/interactions/{interaction_id}/feedback` | Registra se a resposta da Lia ajudou. |
| `GET` | `/api/ai/knowledge-gaps` | Lista dúvidas recorrentes/ruins para melhoria de manuais. |
| `GET` | `/api/ai/status` | Diagnóstico seguro da configuração de IA. |
| `POST` | `/api/leadership/login` | Login exclusivo da liderança. |
| `GET` | `/api/leadership/me` | Valida sessão da liderança. |
| `GET` | `/api/leadership/employees` | Lista funcionários cadastrados pela liderança. |
| `POST` | `/api/leadership/employees` | Cadastra funcionário para registros internos. |
| `PATCH` | `/api/leadership/employees/{employee_id}` | Atualiza status/dados do funcionário. |
| `GET` | `/api/leadership/records` | Lista registros recentes da liderança. |
| `POST` | `/api/leadership/employees/{employee_id}/records` | Registra feedback, advertência, suspensão ou demissão. |
| `GET` | `/api/admin/users` | Lista usuários para administradores. |
| `POST` | `/api/admin/users` | Cria usuário. |
| `PATCH` | `/api/admin/users/{user_id}` | Atualiza nome, papel ou status do usuário. |
| `DELETE` | `/api/admin/users/{user_id}` | Desativa usuário sem remover histórico. |
| `GET` | `/api/admin/stores` | Lista lojas derivadas dos dados atuais. |
| `POST` | `/api/admin/stores` | Cria loja. |
| `PATCH` | `/api/admin/stores/{store_id}` | Atualiza nome ou status da loja. |
| `DELETE` | `/api/admin/stores/{store_id}` | Desativa loja sem remover histórico. |
| `GET` | `/api/admin/checklist-templates` | Lista templates de checklist. |
| `POST` | `/api/admin/checklist-templates` | Cria template de checklist. |
| `PATCH` | `/api/admin/checklist-templates/{template_id}` | Atualiza template de checklist. |
| `DELETE` | `/api/admin/checklist-templates/{template_id}` | Desativa template sem remover histórico. |
| `POST` | `/api/admin/checklist-templates/{template_id}/items` | Cria item em um template. |
| `PATCH` | `/api/admin/checklist-template-items/{item_id}` | Atualiza item de template. |
| `DELETE` | `/api/admin/checklist-template-items/{item_id}` | Desativa item sem remover histórico. |
| `GET` | `/api/admin/manuals` | Lista manuais para administradores. |
| `POST` | `/api/admin/manuals` | Cria manual operacional. |
| `PATCH` | `/api/admin/manuals/{manual_id}` | Atualiza manual operacional. |
| `DELETE` | `/api/admin/manuals/{manual_id}` | Desativa manual sem remover histórico. |
| `POST` | `/api/admin/manuals/{manual_id}/sections` | Cria seção em um manual. |
| `PATCH` | `/api/admin/manual-sections/{section_id}` | Atualiza seção de manual. |
| `DELETE` | `/api/admin/manual-sections/{section_id}` | Desativa seção de manual. |
| `POST` | `/api/admin/manual-sections/{section_id}/steps` | Cria passo em uma seção. |
| `PATCH` | `/api/admin/manual-steps/{step_id}` | Atualiza passo de manual. |
| `DELETE` | `/api/admin/manual-steps/{step_id}` | Desativa passo de manual. |
| `GET` | `/api/incidents` | Lista ocorrências operacionais. |
| `POST` | `/api/incidents` | Cria ocorrência operacional. |
| `GET` | `/api/incidents/{incident_id}` | Consulta uma ocorrência. |
| `PATCH` | `/api/incidents/{incident_id}` | Atualiza status/dados de uma ocorrência. |
| `POST` | `/api/checklists/items/{item_id}/evidences` | Envia foto de evidência para item de checklist. |
| `GET` | `/api/checklists/items/{item_id}/evidences` | Lista evidências de um item. |
| `GET` | `/api/checklists/{run_id}/evidences` | Lista evidências de um checklist. |
| `GET` | `/api/evidences` | Auditoria de evidências para administradores. |
| `GET` | `/api/audit/logs` | Lista eventos de auditoria de escritas da API para perfis com `view_audit`. |
| `GET` | `/api/observability/status` | Snapshot seguro de ambiente, banco, storage e métricas de requisições. |
| `GET` | `/api/reports/summary` | Resumo operacional por período. |

## Auditoria e Observabilidade

- Toda requisição `POST`, `PATCH` e `DELETE` sob `/api/*` gera um evento em `audit_logs`, com método, rota, status, latência, `request_id`, ator autenticado quando existir e metadados seguros.
- Toda resposta recebe `X-Request-ID`, permitindo correlacionar logs de aplicação, resposta HTTP e eventos de auditoria.
- `/api/audit/logs` permite filtrar eventos por `action`, `status`, `entity_type`, `store` e `limit`.
- `/api/observability/status` expõe apenas dados operacionais seguros: ambiente, tipo do banco, provider de storage, tempo de início e métricas agregadas em memória.

## Novas Áreas Operacionais

- `/admin`: painel administrativo com criação/edição/desativação de usuários, lojas, templates de checklist, itens, manuais, seções e passos, além de ocorrências, relatórios e auditoria de evidências.
- `/lideranca`: área exclusiva para liderança registrar funcionários, feedbacks e medidas disciplinares.
- `/incidents`: registro e acompanhamento de ocorrências reais do turno.
- `/reports`: resumo semanal ou mensal para gestão.
- Checklists: cada item agora aceita foto como evidência, com storage local em desenvolvimento e Supabase Storage em producao.

## Supabase em producao

O Projeto LIA usa Supabase apenas pelo backend: PostgreSQL para dados e Storage privado para evidencias.
Nao coloque `SUPABASE_SERVICE_ROLE_KEY` no frontend.

### Supabase PostgreSQL

Passos manuais:

1. Crie um projeto no Supabase.
2. Em Project Settings > Database, copie a connection string PostgreSQL.
3. Se o Render apresentar problema de IPv6, use a connection string do Session Pooler.
4. No Render, configure `DATABASE_URL` com o formato `postgresql+psycopg://...`.
5. Mantenha `APP_ENV=production` e `AUTO_CREATE_TABLES=false`.
6. Redeploy. O Dockerfile ja executa `alembic upgrade head` antes do `uvicorn`.

SQLite deve ficar apenas para desenvolvimento local.

### Supabase Storage

Passos manuais:

1. No Supabase, crie um bucket privado, por exemplo `lia-evidences`.
2. Configure no Render:
   - `STORAGE_PROVIDER=supabase`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_STORAGE_BUCKET=lia-evidences`
   - `SUPABASE_SIGNED_URL_EXPIRES_SECONDS=300`
3. Nao torne o bucket publico. O backend valida permissao antes de gerar URL assinada temporaria.

## Validação local antes do push

Backend:

```powershell
python -m compileall apps/api/app apps/api/tests tests meu_assistente.py dados_operacionais.py
ruff check .
pytest --cov=apps.api.app
alembic current
alembic upgrade head
```

Frontend:

```powershell
cd apps/web
npm run lint
npm run typecheck
npm run test
npm run build
npx playwright install chromium
npm run e2e
```

O `pytest --cov=apps.api.app` usa `pytest-cov` para medir a cobertura do backend. O frontend usa Vitest para testes de componentes e Playwright para o fluxo crítico de login até o dashboard.

## Deploy no Render

O projeto possui `Dockerfile` multi-stage:

1. builda o React;
2. instala dependências Python;
3. copia o build do frontend para a API;
4. roda `alembic upgrade head`;
5. inicia o Uvicorn.

Comando final do container:

```sh
alembic upgrade head && uvicorn apps.api.app.main:app --host 0.0.0.0 --port ${PORT:-8000}
```

Variáveis recomendadas no Render:

```env
DATABASE_URL=postgresql+psycopg://usuario:senha@host:5432/banco
AUTO_CREATE_TABLES=false
APP_ENV=production
JWT_SECRET=um_segredo_forte
SESSION_COOKIE_SECURE=true
SESSION_COOKIE_SAMESITE=lax
LIA_ADMIN_USER=admin
LIA_ADMIN_PASSWORD=senha_forte
LIA_LEADERSHIP_USER=lideranca
LIA_LEADERSHIP_PASSWORD=senha_forte_da_lideranca
STORAGE_PROVIDER=supabase
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key
SUPABASE_STORAGE_BUCKET=lia-evidences
SUPABASE_SIGNED_URL_EXPIRES_SECONDS=300
GEMINI_API_KEY=sua_chave_gemini
MODELO_GEMINI=gemini-2.5-flash
FRONTEND_ORIGINS=https://seu-dominio.onrender.com
MAX_UPLOAD_BYTES=5242880
```

Para desenvolvimento local, SQLite e storage local continuam funcionando:

```env
DATABASE_URL=sqlite:///./lia.db
STORAGE_PROVIDER=local
```

Para produção real, use PostgreSQL. SQLite em serviço cloud gratuito pode perder dados dependendo da configuração de disco.

## Git e Versionamento

Fluxo básico:

```powershell
git status
git add .
git commit -m "Descricao objetiva da mudanca"
git push origin main
```

Antes de commitar:

- confirme que `.env` não aparece no `git status`;
- rode testes quando houver mudança de backend;
- rode `npm run build` quando houver mudança de frontend.

## Segurança

Boas práticas atuais:

- Chaves Gemini ficam apenas no backend.
- Senhas são armazenadas com hash.
- Tokens JWT são assinados com `JWT_SECRET`.
- Sessoes web usam cookie `HttpOnly`; o frontend nao armazena mais JWT em `localStorage`.
- Logout remove o cookie de sessao no backend.
- Em `APP_ENV=production`, a API valida PostgreSQL, migrations e secrets fortes antes de subir.
- `.env` não deve ser versionado.

Pontos importantes para produção:

- trocar todos os segredos padrão;
- usar PostgreSQL;
- usar domínio HTTPS;
- evitar plano gratuito com cold start para entrega final;
- revisar política de usuários e permissões antes de uso amplo.

## Status do Produto

**Status atual: piloto operacional em evolução ativa.**

A Central LIA já está disponível como aplicação web para acompanhamento do cliente e possui uma base técnica mais próxima de produto: frontend React responsivo, API FastAPI, autenticação por cookie `HttpOnly`, RBAC inicial, vínculo de usuários a lojas, migrations Alembic e produção preparada para PostgreSQL e Supabase Storage.

Entregue na versão atual:

- login interno, área de liderança e rotas protegidas;
- dashboard operacional, checklists persistentes e manuais técnicos;
- assistente **Lia** com contexto dos manuais e histórico de interações;
- painel administrativo para usuários, lojas, templates e manuais;
- ocorrências operacionais, relatórios por período e auditoria de evidências;
- upload protegido de fotos com storage local no desenvolvimento e Supabase Storage em produção;
- auditoria de escritas da API e observabilidade básica com `X-Request-ID`;
- deploy Docker no Render com migrations antes da inicialização da API.

Em validação com a operação:

- qualidade e completude dos manuais das três lojas;
- regras de acesso por perfil e por loja no uso real;
- fluxo de evidências, ocorrências, feedbacks e medidas da liderança;
- experiência mobile em rotina de loja, balcão e cozinha;
- perguntas frequentes da equipe para evoluir a base de conhecimento da Lia.

Próximos passos recomendados para entrega madura:

- usar infraestrutura sem cold start na apresentação final ao cliente;
- configurar domínio próprio, backup e monitoramento de produção;
- revisar permissões, usuários iniciais e política de senhas com a gestão;
- consolidar documentação operacional para funcionários e liderança;
- evoluir a IA com documentos validados pelo cliente e avaliação contínua das respostas.
