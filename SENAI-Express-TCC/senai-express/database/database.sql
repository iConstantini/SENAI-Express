-- Banco padronizado: nomes em snake_case, sem acentos, compatível com MySQL 8.0.16+.
CREATE DATABASE IF NOT EXISTS senai_express_v5_novo
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE senai_express_v5_novo;

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
