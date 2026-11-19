-- SENAI Express v2
-- Execute uma única vez no MySQL Workbench se o banco já existir.
-- Não renomeia tabelas/colunas: mantém compatibilidade com a API atual.
USE senai_express_v5_novo;

ALTER TABLE pagamentos
  MODIFY COLUMN metodo ENUM(
    'pix_simulado',
    'cartao_simulado',
    'pagar_na_retirada'
  ) NOT NULL;

-- Índices auxiliares para consultas do painel e histórico.
CREATE INDEX idx_pedidos_data_status ON pedidos (criado_em, status);
CREATE INDEX idx_pagamentos_status ON pagamentos (status);
