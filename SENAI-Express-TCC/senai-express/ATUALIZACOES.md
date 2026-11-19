# O que mudou nesta versão

- Mantida a arquitetura Expo + React Native + Express + MySQL do projeto original.
- Criado acesso separado visualmente para a loja; a API só libera o painel para usuários com função `admin`.
- Adicionado cadastro visual de produtos no painel e ação para pausar/reativar produtos.
- Adicionadas opções de cartão simulado e Pix simulado, além de pagamento na retirada.
- O pedido pago na retirada passa a ficar como `aguardando_pagamento`.
- Cancelar um pedido devolve ao estoque os itens que tinham sido reservados.
- Painel agora exibe pedidos e faturamento do dia, pedidos em andamento e total de produtos.
- Incluída migração para banco existente, sem renomear tabelas usadas pela API.
- Removidos arquivos `.env` e `node_modules` do pacote compartilhável para não expor credenciais nem incluir dependências pesadas.

## Atenção
Os pagamentos continuam simulados. A confirmação exibida no app é somente para apresentação acadêmica; não existe cobrança bancária real.
