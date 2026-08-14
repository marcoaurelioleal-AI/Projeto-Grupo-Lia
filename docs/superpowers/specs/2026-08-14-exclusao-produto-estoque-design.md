# Exclusao permanente de produto do estoque

## Objetivo

Permitir que usuarios autorizados removam definitivamente um produto da aba Estoque, com confirmacao explicita antes da operacao.

## Backend

- Adicionar `DELETE /api/inventory/{item_id}`.
- Exigir autenticacao e a permissao `manage_inventory`.
- Validar o acesso do usuario a loja vinculada ao produto antes da exclusao.
- Retornar `404` com a mensagem atual de produto nao encontrado quando o registro nao existir.
- Retornar `204 No Content` quando a exclusao for concluida.
- Manter a regra de acesso global para administradores e o filtro por loja para os demais papeis.

O router apenas recebera a requisicao e chamara o service. O service aplicara as regras de permissao e loja. O repository executara a exclusao e o commit.

## Frontend

- Adicionar um botao com icone de lixeira em cada produto na secao "Produtos em estoque".
- Exibir tooltip ou rotulo acessivel "Excluir produto".
- Solicitar confirmacao com o nome do produto antes da exclusao permanente.
- Chamar a API somente depois da confirmacao.
- Desabilitar o botao enquanto a exclusao estiver em andamento.
- Atualizar a lista e os indicadores do estoque apos o sucesso.
- Exibir uma mensagem amigavel se a API rejeitar ou falhar.

## Testes

- Backend: produto autorizado e excluido com `204`.
- Backend: produto inexistente retorna `404`.
- Backend: usuario de outra loja recebe `403` e o produto permanece salvo.
- Frontend: cancelar a confirmacao nao chama a API.
- Frontend: confirmar chama a API com o id correto e atualiza a consulta.

## Fora do escopo

- Arquivamento ou restauracao de produtos.
- Historico de exclusoes.
- Exclusao em lote.
- Mudancas no modelo ou migration do banco.
