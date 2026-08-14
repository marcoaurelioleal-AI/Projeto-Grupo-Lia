# Exclusao de Produto do Estoque Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir exclusao permanente e confirmada de produtos do estoque, respeitando permissao e loja.

**Architecture:** O router expora `DELETE /inventory/{item_id}`, o service validara permissao e loja, e o repository removera o registro. O React confirmara a acao antes de chamar a API e invalidara a consulta do estoque depois do sucesso.

**Tech Stack:** FastAPI, SQLAlchemy, React, TypeScript, TanStack Query, Vitest e pytest.

## Global Constraints

- Nao alterar o modelo do banco nem criar migration.
- Manter `manage_inventory` e `require_store_access` como controles de acesso.
- Retornar `204 No Content` em exclusao concluida.
- Nao incluir o arquivo nao relacionado que ja esta solto no workspace.

---

### Task 1: Exclusao protegida no backend

**Files:**
- Modify: `apps/api/tests/test_inventory.py`
- Modify: `apps/api/app/routers/inventory.py`
- Modify: `apps/api/app/services/inventory_service.py`
- Modify: `apps/api/app/repositories/inventory_repository.py`

**Interfaces:**
- Produces: `InventoryService.delete_item(item_id: int, user: User) -> None`
- Produces: `InventoryRepository.delete(item: InventoryItem) -> None`
- Produces: `DELETE /api/inventory/{item_id}` com status `204`

- [x] **Step 1: Escrever testes que criam e excluem um produto, verificam `404` e bloqueiam outra loja.**
- [x] **Step 2: Rodar `pytest apps/api/tests/test_inventory.py -q` e confirmar falha por rota ausente.**
- [x] **Step 3: Implementar repository, service e router com permissao e validacao por loja.**
- [x] **Step 4: Rodar `pytest apps/api/tests/test_inventory.py -q` e confirmar sucesso.**

### Task 2: Confirmacao e exclusao no React

**Files:**
- Modify: `apps/web/src/api/client.ts`
- Modify: `apps/web/src/pages/InventoryPage.test.tsx`
- Modify: `apps/web/src/pages/InventoryPage.tsx`

**Interfaces:**
- Produces: `api.deleteInventoryItem(itemId: number): Promise<void>`
- Consumes: `DELETE /api/inventory/{item_id}` com resposta sem corpo.

- [x] **Step 1: Escrever testes para cancelamento e confirmacao da exclusao.**
- [x] **Step 2: Rodar o Vitest focado e confirmar falha pela ausencia do botao/API.**
- [x] **Step 3: Fazer o cliente aceitar `204`, adicionar mutation e botao de lixeira com confirmacao.**
- [x] **Step 4: Rodar o Vitest focado e confirmar sucesso.**

### Task 3: Validacao e publicacao

**Files:**
- Include: todos os arquivos alterados nas Tasks 1 e 2 e este plano.

**Interfaces:**
- Produces: commit publicado na branch `main` e deploy Render validado.

- [x] **Step 1: Rodar `ruff check .` e `pytest -q`.**
- [x] **Step 2: Rodar `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build` e `npm run e2e`.**
- [ ] **Step 3: Revisar o diff e criar commit com nome compreensivel.**
- [ ] **Step 4: Fazer push para `origin/main`, acompanhar CI e Render ate `live`.**
- [ ] **Step 5: Validar `/health` e o bundle publico antes de entregar o link.**
