-- Execute SOMENTE depois de database.sql (instalação nova) ou migrate-v2.sql (existente).
USE senai_express_v5_novo;
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
