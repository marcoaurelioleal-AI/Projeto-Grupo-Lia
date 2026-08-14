# Remover diagnostico tecnico da Lia

**Objetivo:** retirar metadados tecnicos da experiencia do cliente e limitar o status interno da integracao Gemini a administradores.

## Tarefas

1. Adicionar testes de API que neguem `/api/ai/status` para operacao e validem uma resposta administrativa sem dados derivados da chave.
2. Adicionar teste de interface garantindo que o diagnostico nao aparece e que falhas do chat exibem uma mensagem amigavel.
3. Restringir o endpoint com `require_admin_user` e retornar apenas `configured` e `model`.
4. Remover a consulta e o card de diagnostico da pagina da Lia, alem dos tipos e cliente sem uso.
5. Executar testes, lint, typecheck, build e E2E; publicar e verificar a versao em producao.
