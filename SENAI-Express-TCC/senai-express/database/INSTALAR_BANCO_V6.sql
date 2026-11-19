-- INSTALACAO NOVA E ISOLADA: nao acessa o banco senai_express.
-- Execute UMA UNICA VEZ no MySQL Workbench (File > Open SQL Script).

-- ===== database.sql =====
-- Banco padronizado: nomes em snake_case, sem acentos, compatível com MySQL 8.0.16+.
CREATE DATABASE IF NOT EXISTS senai_express_v6
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE senai_express_v6;

CREATE TABLE IF NOT EXISTS usuarios (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  senha_hash VARCHAR(255) NOT NULL,
  funcao ENUM('aluno','admin') NOT NULL DEFAULT 'aluno',
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS categorias (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(80) NOT NULL UNIQUE,
  slug VARCHAR(90) NOT NULL UNIQUE,
  ativa BOOLEAN NOT NULL DEFAULT TRUE,
  ordem INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS produtos (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  categoria_id BIGINT UNSIGNED NOT NULL,
  nome VARCHAR(120) NOT NULL,
  descricao VARCHAR(500) NULL,
  preco DECIMAL(10,2) NOT NULL,
  imagem_url VARCHAR(500) NULL,
  disponivel BOOLEAN NOT NULL DEFAULT TRUE,
  estoque INT NULL,
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_produtos_categoria FOREIGN KEY (categoria_id) REFERENCES categorias(id),
  CONSTRAINT chk_produtos_preco CHECK (preco >= 0),
  INDEX idx_produtos_categoria (categoria_id),
  INDEX idx_produtos_disponivel (disponivel)
);

CREATE TABLE IF NOT EXISTS horarios_retirada (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  inicio DATETIME NOT NULL,
  fim DATETIME NOT NULL,
  capacidade INT NOT NULL DEFAULT 10,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  CONSTRAINT chk_horario_capacidade CHECK (capacidade >= 0),
  INDEX idx_horarios_inicio (inicio),
  CONSTRAINT chk_horario_intervalo CHECK (fim > inicio)
);

CREATE TABLE IF NOT EXISTS pedidos (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  usuario_id BIGINT UNSIGNED NOT NULL,
  horario_id BIGINT UNSIGNED NULL,
  codigo_retirada VARCHAR(12) NOT NULL UNIQUE,
  status ENUM('aguardando_pagamento','confirmado','em_preparo','pronto','entregue','cancelado') NOT NULL DEFAULT 'aguardando_pagamento',
  subtotal DECIMAL(10,2) NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  observacao VARCHAR(500) NULL,
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_pedidos_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
  CONSTRAINT fk_pedidos_horario FOREIGN KEY (horario_id) REFERENCES horarios_retirada(id),
  INDEX idx_pedidos_usuario (usuario_id),
  INDEX idx_pedidos_status (status),
  INDEX idx_pedidos_criado (criado_em)
);

CREATE TABLE IF NOT EXISTS itens_pedido (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  pedido_id BIGINT UNSIGNED NOT NULL,
  produto_id BIGINT UNSIGNED NOT NULL,
  nome_produto VARCHAR(120) NOT NULL,
  preco_unitario DECIMAL(10,2) NOT NULL,
  quantidade INT NOT NULL,
  total_item DECIMAL(10,2) NOT NULL,
  CONSTRAINT fk_itens_pedido FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE,
  CONSTRAINT fk_itens_produto FOREIGN KEY (produto_id) REFERENCES produtos(id),
  CONSTRAINT chk_itens_quantidade CHECK (quantidade > 0),
  INDEX idx_itens_pedido (pedido_id)
);

CREATE TABLE IF NOT EXISTS pagamentos (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  pedido_id BIGINT UNSIGNED NOT NULL,
  metodo ENUM('pix_simulado','cartao_simulado','pagar_na_retirada') NOT NULL,
  status ENUM('simulado_aprovado','pendente_retirada','cancelado') NOT NULL,
  valor DECIMAL(10,2) NOT NULL,
  referencia VARCHAR(80) NOT NULL UNIQUE,
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_pagamentos_pedido FOREIGN KEY (pedido_id) REFERENCES pedidos(id),
  INDEX idx_pagamentos_pedido (pedido_id)
);

CREATE TABLE IF NOT EXISTS historico_pedidos (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  pedido_id BIGINT UNSIGNED NOT NULL,
  usuario_responsavel BIGINT UNSIGNED NULL,
  status_anterior VARCHAR(40) NULL,
  status_novo VARCHAR(40) NOT NULL,
  observacao VARCHAR(255) NULL,
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_historico_pedido FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE,
  CONSTRAINT fk_historico_usuario FOREIGN KEY (usuario_responsavel) REFERENCES usuarios(id),
  INDEX idx_historico_pedido (pedido_id)
);

INSERT IGNORE INTO categorias (nome, slug, ordem) VALUES
('Salgados', 'salgados', 1),
('Lanches e sanduíches', 'lanches', 2),
('Doces', 'doces', 3),
('Brownies, cones e sobremesas', 'sobremesas', 4),
('Bebidas geladas', 'bebidas-geladas', 5),
('Bebidas quentes', 'bebidas-quentes', 6);

INSERT INTO produtos (categoria_id, nome, descricao, preco, imagem_url, disponivel)
SELECT c.id, p.nome, p.descricao, p.preco, p.imagem_url, TRUE
FROM (
  SELECT 'salgados' slug, 'Coxinha' nome, 'Salgado demonstrativo' descricao, 6.00 preco,
  'https://images.unsplash.com/photo-1626100131195-8a8f8f3e3c76?w=700' imagem_url
  UNION ALL SELECT 'salgados','Pão de queijo','Porção demonstrativa',4.00,'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=700'
  UNION ALL SELECT 'lanches','Misto-quente','Sanduíche demonstrativo',8.00,'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=700'
  UNION ALL SELECT 'doces','Brigadeiro','Doce demonstrativo',3.00,'https://images.unsplash.com/photo-1581798459219-318e76aecc7b?w=700'
  UNION ALL SELECT 'sobremesas','Brownie','Brownie demonstrativo',5.00,'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=700'
  UNION ALL SELECT 'sobremesas','Cone recheado','Sobremesa demonstrativa',6.00,'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=700'
  UNION ALL SELECT 'bebidas-geladas','Suco','Bebida demonstrativa',5.00,'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=700'
  UNION ALL SELECT 'bebidas-geladas','Água','Bebida demonstrativa',3.00,'https://images.unsplash.com/photo-1523362628745-0c100150b504?w=700'
  UNION ALL SELECT 'bebidas-quentes','Café','Bebida demonstrativa',3.50,'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=700'
) p
JOIN categorias c ON c.slug = p.slug
WHERE NOT EXISTS (SELECT 1 FROM produtos existing WHERE existing.nome = p.nome AND existing.categoria_id = c.id);

-- Horários demonstrativos para facilitar o primeiro teste.
-- IMPORTANTE: ajuste os horários para os intervalos reais da sua escola.
-- O script evita duplicar os mesmos horários se for executado novamente.
INSERT INTO horarios_retirada (inicio, fim, capacidade, ativo)
SELECT s.inicio, s.fim, 10, TRUE
FROM (
  SELECT TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 1 DAY), '09:30:00') AS inicio,
         TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 1 DAY), '09:45:00') AS fim
  UNION ALL SELECT TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 1 DAY), '12:00:00'),
                   TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 1 DAY), '12:15:00')
  UNION ALL SELECT TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 1 DAY), '15:30:00'),
                   TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 1 DAY), '15:45:00')
  UNION ALL SELECT TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 2 DAY), '09:30:00'),
                   TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 2 DAY), '09:45:00')
  UNION ALL SELECT TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 2 DAY), '12:00:00'),
                   TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 2 DAY), '12:15:00')
  UNION ALL SELECT TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 2 DAY), '15:30:00'),
                   TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 2 DAY), '15:45:00')
) s
WHERE NOT EXISTS (
  SELECT 1 FROM horarios_retirada h
  WHERE h.inicio = s.inicio AND h.fim = s.fim
);
-- Para uso real, edite os horários acima e a capacidade conforme os intervalos da cantina.


-- ===== migrate-v2.sql =====
-- SENAI Express v2
-- Execute uma única vez no MySQL Workbench se o banco já existir.
-- Não renomeia tabelas/colunas: mantém compatibilidade com a API atual.
USE senai_express_v6;

ALTER TABLE pagamentos
  MODIFY COLUMN metodo ENUM(
    'pix_simulado',
    'cartao_simulado',
    'pagar_na_retirada'
  ) NOT NULL;

-- Índices auxiliares para consultas do painel e histórico.
CREATE INDEX idx_pedidos_data_status ON pedidos (criado_em, status);
CREATE INDEX idx_pagamentos_status ON pagamentos (status);


-- ===== migrate-v3.sql =====
-- Execute SOMENTE depois de database.sql (instalação nova) ou migrate-v2.sql (existente).
USE senai_express_v6;
CREATE TABLE IF NOT EXISTS favoritos (
 usuario_id INT NOT NULL, produto_id INT NOT NULL, criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(usuario_id,produto_id),
 FOREIGN KEY(usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
 FOREIGN KEY(produto_id) REFERENCES produtos(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS comunicados (
 id INT AUTO_INCREMENT PRIMARY KEY, titulo VARCHAR(100) NOT NULL,
 mensagem VARCHAR(500) NOT NULL, tipo VARCHAR(20) NOT NULL DEFAULT 'info',
 ativo BOOLEAN NOT NULL DEFAULT TRUE, criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS cupons (
 id INT AUTO_INCREMENT PRIMARY KEY, codigo VARCHAR(32) NOT NULL UNIQUE,
 percentual DECIMAL(5,2) NOT NULL, validade DATETIME NULL,
 limite_usos INT NULL, usos INT NOT NULL DEFAULT 0,
 ativo BOOLEAN NOT NULL DEFAULT TRUE,
 CONSTRAINT chk_cupom_percentual CHECK(percentual>0 AND percentual<=100)
);
INSERT INTO comunicados(titulo,mensagem,tipo)
SELECT 'Bem-vindo ao SENAI Express','Confira os produtos da cantina e acompanhe seus pedidos.','info'
WHERE NOT EXISTS(SELECT 1 FROM comunicados WHERE titulo='Bem-vindo ao SENAI Express');


-- ===== migrate-v4.sql =====
-- Executar UMA vez após migrate-v3.sql. Não apaga registros existentes.
USE senai_express_v6;
ALTER TABLE usuarios ADD COLUMN foto_url VARCHAR(500) NULL;
ALTER TABLE usuarios ADD COLUMN notificacoes_ativas BOOLEAN NOT NULL DEFAULT TRUE;
CREATE TABLE IF NOT EXISTS notificacoes (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 usuario_id BIGINT UNSIGNED NOT NULL,
 titulo VARCHAR(120) NOT NULL,
 mensagem VARCHAR(500) NOT NULL,
 lida BOOLEAN NOT NULL DEFAULT FALSE,
 criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
 INDEX idx_notificacoes_usuario(usuario_id,lida,criado_em)
);
CREATE TABLE IF NOT EXISTS auditoria_admin (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 usuario_id BIGINT UNSIGNED NULL,
 acao VARCHAR(50) NOT NULL,
 entidade VARCHAR(50) NOT NULL,
 entidade_id BIGINT UNSIGNED NULL,
 detalhes TEXT NULL,
 criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
 INDEX idx_auditoria_data(criado_em)
);


-- ===== migrate-v5.sql =====
-- V5: executar UMA VEZ depois de migrate-v4.sql; faça backup antes.
USE senai_express_v6;
CREATE TABLE IF NOT EXISTS avaliacoes (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, usuario_id BIGINT UNSIGNED NOT NULL, produto_id BIGINT UNSIGNED NOT NULL, nota TINYINT UNSIGNED NOT NULL, comentario VARCHAR(500), criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP, UNIQUE KEY uq_avaliacao(usuario_id,produto_id), FOREIGN KEY(usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE, FOREIGN KEY(produto_id) REFERENCES produtos(id), CHECK(nota BETWEEN 1 AND 5));
CREATE TABLE IF NOT EXISTS pontos_fidelidade (usuario_id BIGINT UNSIGNED PRIMARY KEY, saldo INT NOT NULL DEFAULT 0, FOREIGN KEY(usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS movimentos_pontos (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, usuario_id BIGINT UNSIGNED NOT NULL, pedido_id BIGINT UNSIGNED NULL, pontos INT NOT NULL, motivo VARCHAR(100) NOT NULL, criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(usuario_id) REFERENCES usuarios(id), FOREIGN KEY(pedido_id) REFERENCES pedidos(id), UNIQUE KEY uq_pontos_pedido(pedido_id));
CREATE TABLE IF NOT EXISTS carteiras_demo (usuario_id BIGINT UNSIGNED PRIMARY KEY, saldo DECIMAL(10,2) NOT NULL DEFAULT 0, FOREIGN KEY(usuario_id) REFERENCES usuarios(id));
CREATE TABLE IF NOT EXISTS transacoes_carteira_demo (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, usuario_id BIGINT UNSIGNED NOT NULL, pedido_id BIGINT UNSIGNED NULL, valor DECIMAL(10,2) NOT NULL, tipo ENUM('credito_demo','debito_demo','estorno_demo') NOT NULL, criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(usuario_id) REFERENCES usuarios(id), FOREIGN KEY(pedido_id) REFERENCES pedidos(id));
CREATE TABLE IF NOT EXISTS chamados_suporte (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, usuario_id BIGINT UNSIGNED NOT NULL, assunto VARCHAR(120) NOT NULL, mensagem TEXT NOT NULL, status ENUM('aberto','respondido','fechado') DEFAULT 'aberto', criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(usuario_id) REFERENCES usuarios(id));
CREATE TABLE IF NOT EXISTS mensagens_suporte (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, chamado_id BIGINT UNSIGNED NOT NULL, usuario_id BIGINT UNSIGNED NOT NULL, mensagem VARCHAR(1500) NOT NULL, criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(chamado_id) REFERENCES chamados_suporte(id) ON DELETE CASCADE, FOREIGN KEY(usuario_id) REFERENCES usuarios(id));
CREATE TABLE IF NOT EXISTS dispositivos_push (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, usuario_id BIGINT UNSIGNED NOT NULL, expo_token VARCHAR(255) NOT NULL UNIQUE, criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS ingredientes_produto (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, produto_id BIGINT UNSIGNED NOT NULL, nome VARCHAR(100) NOT NULL, removivel BOOLEAN DEFAULT TRUE, FOREIGN KEY(produto_id) REFERENCES produtos(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS adicionais_produto (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, produto_id BIGINT UNSIGNED NOT NULL, nome VARCHAR(100) NOT NULL, preco DECIMAL(10,2) NOT NULL DEFAULT 0, ativo BOOLEAN DEFAULT TRUE, FOREIGN KEY(produto_id) REFERENCES produtos(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS preferencia_usuario (usuario_id BIGINT UNSIGNED PRIMARY KEY, tema ENUM('claro','escuro','sistema') DEFAULT 'sistema', biometria_habilitada BOOLEAN DEFAULT FALSE, FOREIGN KEY(usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS eventos_seguranca (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, usuario_id BIGINT UNSIGNED NULL, evento VARCHAR(80) NOT NULL, ip VARCHAR(45), criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL);
CREATE TABLE IF NOT EXISTS sessoes_refresh (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, usuario_id BIGINT UNSIGNED NOT NULL, token_hash CHAR(64) NOT NULL UNIQUE, expira_em DATETIME NOT NULL, revogado_em DATETIME NULL, FOREIGN KEY(usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS cupons_utilizados (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, cupom_id BIGINT UNSIGNED NOT NULL, usuario_id BIGINT UNSIGNED NOT NULL, pedido_id BIGINT UNSIGNED NOT NULL UNIQUE, criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(cupom_id) REFERENCES cupons(id), FOREIGN KEY(usuario_id) REFERENCES usuarios(id), FOREIGN KEY(pedido_id) REFERENCES pedidos(id));
CREATE TABLE IF NOT EXISTS pedido_personalizacoes (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, item_pedido_id BIGINT UNSIGNED NOT NULL, descricao VARCHAR(500) NOT NULL, adicional_valor DECIMAL(10,2) NOT NULL DEFAULT 0, FOREIGN KEY(item_pedido_id) REFERENCES itens_pedido(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS configuracoes_loja (chave VARCHAR(80) PRIMARY KEY, valor VARCHAR(500) NOT NULL);
INSERT IGNORE INTO configuracoes_loja(chave,valor) VALUES ('nome_loja','SENAI Express'),('aceitando_pedidos','true'),('tempo_preparo_minutos','15');


-- ===== catalogo-v4.sql =====
USE senai_express_v6;
-- Catálogo demonstrativo. INSERT IGNORE impede duplicar itens com mesmo nome/categoria.

INSERT IGNORE INTO produtos(categoria_id,nome,descricao,preco,disponivel,estoque) SELECT id,'Coxinha de frango','Coxinha de frango preparado para retirada na cantina. Consulte ingredientes e alergênicos com a equipe.',4.50,TRUE,30 FROM categorias WHERE slug='salgados' AND NOT EXISTS (SELECT 1 FROM produtos p WHERE p.categoria_id=categorias.id AND p.nome='Coxinha de frango');
INSERT IGNORE INTO produtos(categoria_id,nome,descricao,preco,disponivel,estoque) SELECT id,'Esfiha de carne','Esfiha de carne preparado para retirada na cantina. Consulte ingredientes e alergênicos com a equipe.',5.85,TRUE,30 FROM categorias WHERE slug='salgados' AND NOT EXISTS (SELECT 1 FROM produtos p WHERE p.categoria_id=categorias.id AND p.nome='Esfiha de carne');
INSERT IGNORE INTO produtos(categoria_id,nome,descricao,preco,disponivel,estoque) SELECT id,'Pastel de queijo','Pastel de queijo preparado para retirada na cantina. Consulte ingredientes e alergênicos com a equipe.',7.20,TRUE,30 FROM categorias WHERE slug='salgados' AND NOT EXISTS (SELECT 1 FROM produtos p WHERE p.categoria_id=categorias.id AND p.nome='Pastel de queijo');
INSERT IGNORE INTO produtos(categoria_id,nome,descricao,preco,disponivel,estoque) SELECT id,'Pastel de carne','Pastel de carne preparado para retirada na cantina. Consulte ingredientes e alergênicos com a equipe.',8.55,TRUE,30 FROM categorias WHERE slug='salgados' AND NOT EXISTS (SELECT 1 FROM produtos p WHERE p.categoria_id=categorias.id AND p.nome='Pastel de carne');
INSERT IGNORE INTO produtos(categoria_id,nome,descricao,preco,disponivel,estoque) SELECT id,'Pão de queijo','Pão de queijo preparado para retirada na cantina. Consulte ingredientes e alergênicos com a equipe.',9.90,TRUE,30 FROM categorias WHERE slug='salgados' AND NOT EXISTS (SELECT 1 FROM produtos p WHERE p.categoria_id=categorias.id AND p.nome='Pão de queijo');
INSERT IGNORE INTO produtos(categoria_id,nome,descricao,preco,disponivel,estoque) SELECT id,'Enroladinho de salsicha','Enroladinho de salsicha preparado para retirada na cantina. Consulte ingredientes e alergênicos com a equipe.',11.25,TRUE,30 FROM categorias WHERE slug='salgados' AND NOT EXISTS (SELECT 1 FROM produtos p WHERE p.categoria_id=categorias.id AND p.nome='Enroladinho de salsicha');
INSERT IGNORE INTO produtos(categoria_id,nome,descricao,preco,disponivel,estoque) SELECT id,'Empada de frango','Empada de frango preparado para retirada na cantina. Consulte ingredientes e alergênicos com a equipe.',12.60,TRUE,30 FROM categorias WHERE slug='salgados' AND NOT EXISTS (SELECT 1 FROM produtos p WHERE p.categoria_id=categorias.id AND p.nome='Empada de frango');
INSERT IGNORE INTO produtos(categoria_id,nome,descricao,preco,disponivel,estoque) SELECT id,'Quibe assado','Quibe assado preparado para retirada na cantina. Consulte ingredientes e alergênicos com a equipe.',13.95,TRUE,30 FROM categorias WHERE slug='salgados' AND NOT EXISTS (SELECT 1 FROM produtos p WHERE p.categoria_id=categorias.id AND p.nome='Quibe assado');
INSERT IGNORE INTO produtos(categoria_id,nome,descricao,preco,disponivel,estoque) SELECT id,'Croissant de presunto','Croissant de presunto preparado para retirada na cantina. Consulte ingredientes e alergênicos com a equipe.',15.30,TRUE,30 FROM categorias WHERE slug='salgados' AND NOT EXISTS (SELECT 1 FROM produtos p WHERE p.categoria_id=categorias.id AND p.nome='Croissant de presunto');
INSERT IGNORE INTO produtos(categoria_id,nome,descricao,preco,disponivel,estoque) SELECT id,'Mini pizza','Mini pizza preparado para retirada na cantina. Consulte ingredientes e alergênicos com a equipe.',16.65,TRUE,30 FROM categorias WHERE slug='salgados' AND NOT EXISTS (SELECT 1 FROM produtos p WHERE p.categoria_id=categorias.id AND p.nome='Mini pizza');
INSERT IGNORE INTO produtos(categoria_id,nome,descricao,preco,disponivel,estoque) SELECT id,'Água mineral','Água mineral preparado para retirada na cantina. Consulte ingredientes e alergênicos com a equipe.',3.00,TRUE,30 FROM categorias WHERE slug='bebidas-geladas' AND NOT EXISTS (SELECT 1 FROM produtos p WHERE p.categoria_id=categorias.id AND p.nome='Água mineral');
INSERT IGNORE INTO produtos(categoria_id,nome,descricao,preco,disponivel,estoque) SELECT id,'Água com gás','Água com gás preparado para retirada na cantina. Consulte ingredientes e alergênicos com a equipe.',3.90,TRUE,30 FROM categorias WHERE slug='bebidas-geladas' AND NOT EXISTS (SELECT 1 FROM produtos p WHERE p.categoria_id=categorias.id AND p.nome='Água com gás');
INSERT IGNORE INTO produtos(categoria_id,nome,descricao,preco,disponivel,estoque) SELECT id,'Suco de laranja','Suco de laranja preparado para retirada na cantina. Consulte ingredientes e alergênicos com a equipe.',4.80,TRUE,30 FROM categorias WHERE slug='bebidas-geladas' AND NOT EXISTS (SELECT 1 FROM produtos p WHERE p.categoria_id=categorias.id AND p.nome='Suco de laranja');
INSERT IGNORE INTO produtos(categoria_id,nome,descricao,preco,disponivel,estoque) SELECT id,'Suco de uva','Suco de uva preparado para retirada na cantina. Consulte ingredientes e alergênicos com a equipe.',5.70,TRUE,30 FROM categorias WHERE slug='bebidas-geladas' AND NOT EXISTS (SELECT 1 FROM produtos p WHERE p.categoria_id=categorias.id AND p.nome='Suco de uva');
INSERT IGNORE INTO produtos(categoria_id,nome,descricao,preco,disponivel,estoque) SELECT id,'Chá gelado','Chá gelado preparado para retirada na cantina. Consulte ingredientes e alergênicos com a equipe.',6.60,TRUE,30 FROM categorias WHERE slug='bebidas-geladas' AND NOT EXISTS (SELECT 1 FROM produtos p WHERE p.categoria_id=categorias.id AND p.nome='Chá gelado');
INSERT IGNORE INTO produtos(categoria_id,nome,descricao,preco,disponivel,estoque) SELECT id,'Refrigerante cola','Refrigerante cola preparado para retirada na cantina. Consulte ingredientes e alergênicos com a equipe.',7.50,TRUE,30 FROM categorias WHERE slug='bebidas-geladas' AND NOT EXISTS (SELECT 1 FROM produtos p WHERE p.categoria_id=categorias.id AND p.nome='Refrigerante cola');
INSERT IGNORE INTO produtos(categoria_id,nome,descricao,preco,disponivel,estoque) SELECT id,'Refrigerante guaraná','Refrigerante guaraná preparado para retirada na cantina. Consulte ingredientes e alergênicos com a equipe.',8.40,TRUE,30 FROM categorias WHERE slug='bebidas-geladas' AND NOT EXISTS (SELECT 1 FROM produtos p WHERE p.categoria_id=categorias.id AND p.nome='Refrigerante guaraná');
INSERT IGNORE INTO produtos(categoria_id,nome,descricao,preco,disponivel,estoque) SELECT id,'Vitamina de banana','Vitamina de banana preparado para retirada na cantina. Consulte ingredientes e alergênicos com a equipe.',9.30,TRUE,30 FROM categorias WHERE slug='bebidas-geladas' AND NOT EXISTS (SELECT 1 FROM produtos p WHERE p.categoria_id=categorias.id AND p.nome='Vitamina de banana');
INSERT IGNORE INTO produtos(categoria_id,nome,descricao,preco,disponivel,estoque) SELECT id,'Achocolatado','Achocolatado preparado para retirada na cantina. Consulte ingredientes e alergênicos com a equipe.',10.20,TRUE,30 FROM categorias WHERE slug='bebidas-geladas' AND NOT EXISTS (SELECT 1 FROM produtos p WHERE p.categoria_id=categorias.id AND p.nome='Achocolatado');
INSERT IGNORE INTO produtos(categoria_id,nome,descricao,preco,disponivel,estoque) SELECT id,'Água de coco','Água de coco preparado para retirada na cantina. Consulte ingredientes e alergênicos com a equipe.',11.10,TRUE,30 FROM categorias WHERE slug='bebidas-geladas' AND NOT EXISTS (SELECT 1 FROM produtos p WHERE p.categoria_id=categorias.id AND p.nome='Água de coco');
INSERT IGNORE INTO produtos(categoria_id,nome,descricao,preco,disponivel,estoque) SELECT id,'Brigadeiro','Brigadeiro preparado para retirada na cantina. Consulte ingredientes e alergênicos com a equipe.',4.50,TRUE,30 FROM categorias WHERE slug='doces' AND NOT EXISTS (SELECT 1 FROM produtos p WHERE p.categoria_id=categorias.id AND p.nome='Brigadeiro');
INSERT IGNORE INTO produtos(categoria_id,nome,descricao,preco,disponivel,estoque) SELECT id,'Beijinho','Beijinho preparado para retirada na cantina. Consulte ingredientes e alergênicos com a equipe.',5.85,TRUE,30 FROM categorias WHERE slug='doces' AND NOT EXISTS (SELECT 1 FROM produtos p WHERE p.categoria_id=categorias.id AND p.nome='Beijinho');
INSERT IGNORE INTO produtos(categoria_id,nome,descricao,preco,disponivel,estoque) SELECT id,'Brownie','Brownie preparado para retirada na cantina. Consulte ingredientes e alergênicos com a equipe.',7.20,TRUE,30 FROM categorias WHERE slug='doces' AND NOT EXISTS (SELECT 1 FROM produtos p WHERE p.categoria_id=categorias.id AND p.nome='Brownie');
INSERT IGNORE INTO produtos(categoria_id,nome,descricao,preco,disponivel,estoque) SELECT id,'Cookie de chocolate','Cookie de chocolate preparado para retirada na cantina. Consulte ingredientes e alergênicos com a equipe.',8.55,TRUE,30 FROM categorias WHERE slug='doces' AND NOT EXISTS (SELECT 1 FROM produtos p WHERE p.categoria_id=categorias.id AND p.nome='Cookie de chocolate');
INSERT IGNORE INTO produtos(categoria_id,nome,descricao,preco,disponivel,estoque) SELECT id,'Bolo de cenoura','Bolo de cenoura preparado para retirada na cantina. Consulte ingredientes e alergênicos com a equipe.',9.90,TRUE,30 FROM categorias WHERE slug='doces' AND NOT EXISTS (SELECT 1 FROM produtos p WHERE p.categoria_id=categorias.id AND p.nome='Bolo de cenoura');
INSERT IGNORE INTO produtos(categoria_id,nome,descricao,preco,disponivel,estoque) SELECT id,'Pudim','Pudim preparado para retirada na cantina. Consulte ingredientes e alergênicos com a equipe.',11.25,TRUE,30 FROM categorias WHERE slug='doces' AND NOT EXISTS (SELECT 1 FROM produtos p WHERE p.categoria_id=categorias.id AND p.nome='Pudim');
INSERT IGNORE INTO produtos(categoria_id,nome,descricao,preco,disponivel,estoque) SELECT id,'Palha italiana','Palha italiana preparado para retirada na cantina. Consulte ingredientes e alergênicos com a equipe.',12.60,TRUE,30 FROM categorias WHERE slug='doces' AND NOT EXISTS (SELECT 1 FROM produtos p WHERE p.categoria_id=categorias.id AND p.nome='Palha italiana');
INSERT IGNORE INTO produtos(categoria_id,nome,descricao,preco,disponivel,estoque) SELECT id,'Mousse de maracujá','Mousse de maracujá preparado para retirada na cantina. Consulte ingredientes e alergênicos com a equipe.',13.95,TRUE,30 FROM categorias WHERE slug='doces' AND NOT EXISTS (SELECT 1 FROM produtos p WHERE p.categoria_id=categorias.id AND p.nome='Mousse de maracujá');
INSERT IGNORE INTO produtos(categoria_id,nome,descricao,preco,disponivel,estoque) SELECT id,'Trufa de chocolate','Trufa de chocolate preparado para retirada na cantina. Consulte ingredientes e alergênicos com a equipe.',15.30,TRUE,30 FROM categorias WHERE slug='doces' AND NOT EXISTS (SELECT 1 FROM produtos p WHERE p.categoria_id=categorias.id AND p.nome='Trufa de chocolate');
INSERT IGNORE INTO produtos(categoria_id,nome,descricao,preco,disponivel,estoque) SELECT id,'Paçoca','Paçoca preparado para retirada na cantina. Consulte ingredientes e alergênicos com a equipe.',16.65,TRUE,30 FROM categorias WHERE slug='doces' AND NOT EXISTS (SELECT 1 FROM produtos p WHERE p.categoria_id=categorias.id AND p.nome='Paçoca');
INSERT IGNORE INTO produtos(categoria_id,nome,descricao,preco,disponivel,estoque) SELECT id,'Sanduíche natural','Sanduíche natural preparado para retirada na cantina. Consulte ingredientes e alergênicos com a equipe.',4.50,TRUE,30 FROM categorias WHERE slug='lanches' AND NOT EXISTS (SELECT 1 FROM produtos p WHERE p.categoria_id=categorias.id AND p.nome='Sanduíche natural');
INSERT IGNORE INTO produtos(categoria_id,nome,descricao,preco,disponivel,estoque) SELECT id,'Misto quente','Misto quente preparado para retirada na cantina. Consulte ingredientes e alergênicos com a equipe.',5.85,TRUE,30 FROM categorias WHERE slug='lanches' AND NOT EXISTS (SELECT 1 FROM produtos p WHERE p.categoria_id=categorias.id AND p.nome='Misto quente');
INSERT IGNORE INTO produtos(categoria_id,nome,descricao,preco,disponivel,estoque) SELECT id,'Hambúrguer clássico','Hambúrguer clássico preparado para retirada na cantina. Consulte ingredientes e alergênicos com a equipe.',7.20,TRUE,30 FROM categorias WHERE slug='lanches' AND NOT EXISTS (SELECT 1 FROM produtos p WHERE p.categoria_id=categorias.id AND p.nome='Hambúrguer clássico');
INSERT IGNORE INTO produtos(categoria_id,nome,descricao,preco,disponivel,estoque) SELECT id,'X-salada','X-salada preparado para retirada na cantina. Consulte ingredientes e alergênicos com a equipe.',8.55,TRUE,30 FROM categorias WHERE slug='lanches' AND NOT EXISTS (SELECT 1 FROM produtos p WHERE p.categoria_id=categorias.id AND p.nome='X-salada');
INSERT IGNORE INTO produtos(categoria_id,nome,descricao,preco,disponivel,estoque) SELECT id,'Wrap de frango','Wrap de frango preparado para retirada na cantina. Consulte ingredientes e alergênicos com a equipe.',9.90,TRUE,30 FROM categorias WHERE slug='lanches' AND NOT EXISTS (SELECT 1 FROM produtos p WHERE p.categoria_id=categorias.id AND p.nome='Wrap de frango');
INSERT IGNORE INTO produtos(categoria_id,nome,descricao,preco,disponivel,estoque) SELECT id,'Tapioca de queijo','Tapioca de queijo preparado para retirada na cantina. Consulte ingredientes e alergênicos com a equipe.',11.25,TRUE,30 FROM categorias WHERE slug='lanches' AND NOT EXISTS (SELECT 1 FROM produtos p WHERE p.categoria_id=categorias.id AND p.nome='Tapioca de queijo');
INSERT IGNORE INTO produtos(categoria_id,nome,descricao,preco,disponivel,estoque) SELECT id,'Baguete de peito de peru','Baguete de peito de peru preparado para retirada na cantina. Consulte ingredientes e alergênicos com a equipe.',12.60,TRUE,30 FROM categorias WHERE slug='lanches' AND NOT EXISTS (SELECT 1 FROM produtos p WHERE p.categoria_id=categorias.id AND p.nome='Baguete de peito de peru');
INSERT IGNORE INTO produtos(categoria_id,nome,descricao,preco,disponivel,estoque) SELECT id,'Hot dog','Hot dog preparado para retirada na cantina. Consulte ingredientes e alergênicos com a equipe.',13.95,TRUE,30 FROM categorias WHERE slug='lanches' AND NOT EXISTS (SELECT 1 FROM produtos p WHERE p.categoria_id=categorias.id AND p.nome='Hot dog');
INSERT IGNORE INTO produtos(categoria_id,nome,descricao,preco,disponivel,estoque) SELECT id,'Pão na chapa','Pão na chapa preparado para retirada na cantina. Consulte ingredientes e alergênicos com a equipe.',15.30,TRUE,30 FROM categorias WHERE slug='lanches' AND NOT EXISTS (SELECT 1 FROM produtos p WHERE p.categoria_id=categorias.id AND p.nome='Pão na chapa');
INSERT IGNORE INTO produtos(categoria_id,nome,descricao,preco,disponivel,estoque) SELECT id,'Torrada integral','Torrada integral preparado para retirada na cantina. Consulte ingredientes e alergênicos com a equipe.',16.65,TRUE,30 FROM categorias WHERE slug='lanches' AND NOT EXISTS (SELECT 1 FROM produtos p WHERE p.categoria_id=categorias.id AND p.nome='Torrada integral');
INSERT INTO produtos(categoria_id,nome,descricao,preco,disponivel,estoque) SELECT id,'Água mineral','Água mineral para retirada na cantina. Consulte ingredientes e alergênicos com a equipe.',4.50,TRUE,30 FROM categorias WHERE slug='bebidas-geladas' AND NOT EXISTS (SELECT 1 FROM produtos p WHERE p.categoria_id=categorias.id AND p.nome='Água mineral');
INSERT INTO produtos(categoria_id,nome,descricao,preco,disponivel,estoque) SELECT id,'Água com gás','Água com gás para retirada na cantina. Consulte ingredientes e alergênicos com a equipe.',5.60,TRUE,30 FROM categorias WHERE slug='bebidas-geladas' AND NOT EXISTS (SELECT 1 FROM produtos p WHERE p.categoria_id=categorias.id AND p.nome='Água com gás');
INSERT INTO produtos(categoria_id,nome,descricao,preco,disponivel,estoque) SELECT id,'Suco de laranja','Suco de laranja para retirada na cantina. Consulte ingredientes e alergênicos com a equipe.',6.70,TRUE,30 FROM categorias WHERE slug='bebidas-geladas' AND NOT EXISTS (SELECT 1 FROM produtos p WHERE p.categoria_id=categorias.id AND p.nome='Suco de laranja');
INSERT INTO produtos(categoria_id,nome,descricao,preco,disponivel,estoque) SELECT id,'Suco de uva','Suco de uva para retirada na cantina. Consulte ingredientes e alergênicos com a equipe.',7.80,TRUE,30 FROM categorias WHERE slug='bebidas-geladas' AND NOT EXISTS (SELECT 1 FROM produtos p WHERE p.categoria_id=categorias.id AND p.nome='Suco de uva');
INSERT INTO produtos(categoria_id,nome,descricao,preco,disponivel,estoque) SELECT id,'Chá gelado','Chá gelado para retirada na cantina. Consulte ingredientes e alergênicos com a equipe.',8.90,TRUE,30 FROM categorias WHERE slug='bebidas-geladas' AND NOT EXISTS (SELECT 1 FROM produtos p WHERE p.categoria_id=categorias.id AND p.nome='Chá gelado');
INSERT INTO produtos(categoria_id,nome,descricao,preco,disponivel,estoque) SELECT id,'Refrigerante cola','Refrigerante cola para retirada na cantina. Consulte ingredientes e alergênicos com a equipe.',10.00,TRUE,30 FROM categorias WHERE slug='bebidas-geladas' AND NOT EXISTS (SELECT 1 FROM produtos p WHERE p.categoria_id=categorias.id AND p.nome='Refrigerante cola');
INSERT INTO produtos(categoria_id,nome,descricao,preco,disponivel,estoque) SELECT id,'Refrigerante guaraná','Refrigerante guaraná para retirada na cantina. Consulte ingredientes e alergênicos com a equipe.',11.10,TRUE,30 FROM categorias WHERE slug='bebidas-geladas' AND NOT EXISTS (SELECT 1 FROM produtos p WHERE p.categoria_id=categorias.id AND p.nome='Refrigerante guaraná');
INSERT INTO produtos(categoria_id,nome,descricao,preco,disponivel,estoque) SELECT id,'Vitamina de banana','Vitamina de banana para retirada na cantina. Consulte ingredientes e alergênicos com a equipe.',12.20,TRUE,30 FROM categorias WHERE slug='bebidas-geladas' AND NOT EXISTS (SELECT 1 FROM produtos p WHERE p.categoria_id=categorias.id AND p.nome='Vitamina de banana');
INSERT INTO produtos(categoria_id,nome,descricao,preco,disponivel,estoque) SELECT id,'Achocolatado','Achocolatado para retirada na cantina. Consulte ingredientes e alergênicos com a equipe.',13.30,TRUE,30 FROM categorias WHERE slug='bebidas-geladas' AND NOT EXISTS (SELECT 1 FROM produtos p WHERE p.categoria_id=categorias.id AND p.nome='Achocolatado');
INSERT INTO produtos(categoria_id,nome,descricao,preco,disponivel,estoque) SELECT id,'Água de coco','Água de coco para retirada na cantina. Consulte ingredientes e alergênicos com a equipe.',14.40,TRUE,30 FROM categorias WHERE slug='bebidas-geladas' AND NOT EXISTS (SELECT 1 FROM produtos p WHERE p.categoria_id=categorias.id AND p.nome='Água de coco');
INSERT INTO produtos(categoria_id,nome,descricao,preco,disponivel,estoque) SELECT id,'Café expresso','Café expresso para retirada na cantina. Consulte ingredientes e alergênicos com a equipe.',4.50,TRUE,30 FROM categorias WHERE slug='bebidas-quentes' AND NOT EXISTS (SELECT 1 FROM produtos p WHERE p.categoria_id=categorias.id AND p.nome='Café expresso');
INSERT INTO produtos(categoria_id,nome,descricao,preco,disponivel,estoque) SELECT id,'Café com leite','Café com leite para retirada na cantina. Consulte ingredientes e alergênicos com a equipe.',5.60,TRUE,30 FROM categorias WHERE slug='bebidas-quentes' AND NOT EXISTS (SELECT 1 FROM produtos p WHERE p.categoria_id=categorias.id AND p.nome='Café com leite');
INSERT INTO produtos(categoria_id,nome,descricao,preco,disponivel,estoque) SELECT id,'Cappuccino','Cappuccino para retirada na cantina. Consulte ingredientes e alergênicos com a equipe.',6.70,TRUE,30 FROM categorias WHERE slug='bebidas-quentes' AND NOT EXISTS (SELECT 1 FROM produtos p WHERE p.categoria_id=categorias.id AND p.nome='Cappuccino');
INSERT INTO produtos(categoria_id,nome,descricao,preco,disponivel,estoque) SELECT id,'Chocolate quente','Chocolate quente para retirada na cantina. Consulte ingredientes e alergênicos com a equipe.',7.80,TRUE,30 FROM categorias WHERE slug='bebidas-quentes' AND NOT EXISTS (SELECT 1 FROM produtos p WHERE p.categoria_id=categorias.id AND p.nome='Chocolate quente');
INSERT INTO produtos(categoria_id,nome,descricao,preco,disponivel,estoque) SELECT id,'Chá de camomila','Chá de camomila para retirada na cantina. Consulte ingredientes e alergênicos com a equipe.',8.90,TRUE,30 FROM categorias WHERE slug='bebidas-quentes' AND NOT EXISTS (SELECT 1 FROM produtos p WHERE p.categoria_id=categorias.id AND p.nome='Chá de camomila');
INSERT INTO produtos(categoria_id,nome,descricao,preco,disponivel,estoque) SELECT id,'Chá de hortelã','Chá de hortelã para retirada na cantina. Consulte ingredientes e alergênicos com a equipe.',10.00,TRUE,30 FROM categorias WHERE slug='bebidas-quentes' AND NOT EXISTS (SELECT 1 FROM produtos p WHERE p.categoria_id=categorias.id AND p.nome='Chá de hortelã');
INSERT INTO produtos(categoria_id,nome,descricao,preco,disponivel,estoque) SELECT id,'Leite quente','Leite quente para retirada na cantina. Consulte ingredientes e alergênicos com a equipe.',11.10,TRUE,30 FROM categorias WHERE slug='bebidas-quentes' AND NOT EXISTS (SELECT 1 FROM produtos p WHERE p.categoria_id=categorias.id AND p.nome='Leite quente');
INSERT INTO produtos(categoria_id,nome,descricao,preco,disponivel,estoque) SELECT id,'Café descafeinado','Café descafeinado para retirada na cantina. Consulte ingredientes e alergênicos com a equipe.',12.20,TRUE,30 FROM categorias WHERE slug='bebidas-quentes' AND NOT EXISTS (SELECT 1 FROM produtos p WHERE p.categoria_id=categorias.id AND p.nome='Café descafeinado');
INSERT INTO produtos(categoria_id,nome,descricao,preco,disponivel,estoque) SELECT id,'Mocha','Mocha para retirada na cantina. Consulte ingredientes e alergênicos com a equipe.',13.30,TRUE,30 FROM categorias WHERE slug='bebidas-quentes' AND NOT EXISTS (SELECT 1 FROM produtos p WHERE p.categoria_id=categorias.id AND p.nome='Mocha');
INSERT INTO produtos(categoria_id,nome,descricao,preco,disponivel,estoque) SELECT id,'Chá de frutas','Chá de frutas para retirada na cantina. Consulte ingredientes e alergênicos com a equipe.',14.40,TRUE,30 FROM categorias WHERE slug='bebidas-quentes' AND NOT EXISTS (SELECT 1 FROM produtos p WHERE p.categoria_id=categorias.id AND p.nome='Chá de frutas');
INSERT INTO produtos(categoria_id,nome,descricao,preco,disponivel,estoque) SELECT id,'Pudim de leite','Pudim de leite para retirada na cantina. Consulte ingredientes e alergênicos com a equipe.',4.50,TRUE,30 FROM categorias WHERE slug='sobremesas' AND NOT EXISTS (SELECT 1 FROM produtos p WHERE p.categoria_id=categorias.id AND p.nome='Pudim de leite');
INSERT INTO produtos(categoria_id,nome,descricao,preco,disponivel,estoque) SELECT id,'Torta de limão','Torta de limão para retirada na cantina. Consulte ingredientes e alergênicos com a equipe.',5.60,TRUE,30 FROM categorias WHERE slug='sobremesas' AND NOT EXISTS (SELECT 1 FROM produtos p WHERE p.categoria_id=categorias.id AND p.nome='Torta de limão');
INSERT INTO produtos(categoria_id,nome,descricao,preco,disponivel,estoque) SELECT id,'Mousse de chocolate','Mousse de chocolate para retirada na cantina. Consulte ingredientes e alergênicos com a equipe.',6.70,TRUE,30 FROM categorias WHERE slug='sobremesas' AND NOT EXISTS (SELECT 1 FROM produtos p WHERE p.categoria_id=categorias.id AND p.nome='Mousse de chocolate');
INSERT INTO produtos(categoria_id,nome,descricao,preco,disponivel,estoque) SELECT id,'Cone de brigadeiro','Cone de brigadeiro para retirada na cantina. Consulte ingredientes e alergênicos com a equipe.',7.80,TRUE,30 FROM categorias WHERE slug='sobremesas' AND NOT EXISTS (SELECT 1 FROM produtos p WHERE p.categoria_id=categorias.id AND p.nome='Cone de brigadeiro');
INSERT INTO produtos(categoria_id,nome,descricao,preco,disponivel,estoque) SELECT id,'Gelatina de morango','Gelatina de morango para retirada na cantina. Consulte ingredientes e alergênicos com a equipe.',8.90,TRUE,30 FROM categorias WHERE slug='sobremesas' AND NOT EXISTS (SELECT 1 FROM produtos p WHERE p.categoria_id=categorias.id AND p.nome='Gelatina de morango');
INSERT INTO produtos(categoria_id,nome,descricao,preco,disponivel,estoque) SELECT id,'Bolo no pote','Bolo no pote para retirada na cantina. Consulte ingredientes e alergênicos com a equipe.',10.00,TRUE,30 FROM categorias WHERE slug='sobremesas' AND NOT EXISTS (SELECT 1 FROM produtos p WHERE p.categoria_id=categorias.id AND p.nome='Bolo no pote');
INSERT INTO produtos(categoria_id,nome,descricao,preco,disponivel,estoque) SELECT id,'Salada de frutas','Salada de frutas para retirada na cantina. Consulte ingredientes e alergênicos com a equipe.',11.10,TRUE,30 FROM categorias WHERE slug='sobremesas' AND NOT EXISTS (SELECT 1 FROM produtos p WHERE p.categoria_id=categorias.id AND p.nome='Salada de frutas');
INSERT INTO produtos(categoria_id,nome,descricao,preco,disponivel,estoque) SELECT id,'Mini cheesecake','Mini cheesecake para retirada na cantina. Consulte ingredientes e alergênicos com a equipe.',12.20,TRUE,30 FROM categorias WHERE slug='sobremesas' AND NOT EXISTS (SELECT 1 FROM produtos p WHERE p.categoria_id=categorias.id AND p.nome='Mini cheesecake');
INSERT INTO produtos(categoria_id,nome,descricao,preco,disponivel,estoque) SELECT id,'Pavê de chocolate','Pavê de chocolate para retirada na cantina. Consulte ingredientes e alergênicos com a equipe.',13.30,TRUE,30 FROM categorias WHERE slug='sobremesas' AND NOT EXISTS (SELECT 1 FROM produtos p WHERE p.categoria_id=categorias.id AND p.nome='Pavê de chocolate');
INSERT INTO produtos(categoria_id,nome,descricao,preco,disponivel,estoque) SELECT id,'Banoffee no pote','Banoffee no pote para retirada na cantina. Consulte ingredientes e alergênicos com a equipe.',14.40,TRUE,30 FROM categorias WHERE slug='sobremesas' AND NOT EXISTS (SELECT 1 FROM produtos p WHERE p.categoria_id=categorias.id AND p.nome='Banoffee no pote');

