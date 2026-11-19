-- Executar UMA vez após migrate-v3.sql. Não apaga registros existentes.
USE senai_express_v5_novo;
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
