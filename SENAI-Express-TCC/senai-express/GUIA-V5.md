# SENAI Express V5 — instalação e limitações

## 1. Antes de tudo
Faça backup do banco `senai_express` (Workbench: Server > Data Export). NÃO apague o banco antigo. Guarde também o ZIP V3/V4.

## 2. Banco de dados MySQL 8
No Workbench ou phpMyAdmin, para instalação do ZERO execute nesta ordem: `database.sql`, `migrate-v2.sql`, `migrate-v3.sql`, `migrate-v4.sql`, `migrate-v5.sql`, `catalogo-v4.sql`. Para atualizar V4 existente execute APENAS `migrate-v5.sql`. Os ALTER TABLE de versões antigas não são repetíveis. O catálogo V4 é opcional e só deve ser executado uma vez.

## 3. Backend
Copie `backend/.env.example` para `backend/.env`, ajuste DB_HOST, DB_USER, DB_PASSWORD, DB_NAME=senai_express e JWT_SECRET (chave longa e aleatória). Abra CMD em `backend`: `npm install` e `npm run dev`. Verifique `http://localhost:3333/api/health`. NÃO publique .env nem senhas. Para criar administrador, configure ADMIN_EMAIL e ADMIN_PASSWORD no .env e execute `npm run create-admin` apenas quando necessário.

## 4. Expo
Em CMD: `ipconfig`; use o IPv4 do Wi-Fi (não VMware). Em `mobile/src/config.ts`, configure `http://SEU_IP:3333/api`. Celular e computador devem estar na mesma rede. Em `mobile`: `npm install` e `npx expo start -c`. Deixe backend e Expo abertos; o MySQL também precisa estar em execução. Se o login falhar, teste `http://SEU_IP:3333/api/health` no navegador do celular e confira firewall/porta 3333.

## 5. O que está funcionando nesta entrega
Base V4: login, cadastro, produtos, 60 itens adicionais no catálogo SQL, carrinho, checkout fictício, pedidos, agenda de retirada, edição administrativa, perfil por URL HTTPS, notificações internas, logs e relatório resumido.
V5: telas de favoritos, avaliações, pontos/carteira demonstrativa (consulta), abertura de suporte, gestão de horários, relatório diário, endpoints de preferências e configurações da loja. Estrutura SQL para ingredientes, adicionais, dispositivos push, segurança, sessões, personalização, cupons utilizados e conversas de suporte.

## 6. Funcionalidades ainda NÃO prontas
Face ID/Touch ID e digital Android com login seguro, recuperação de senha por e-mail, upload da galeria, push remoto, pagamentos reais, aplicação de cupons no checkout, descontos e pontos efetivamente lançados, carteira transacional, QR Code verificável, reordenação, adicionais calculados no checkout, chat em tempo real, offline sincronizado, papéis granulares, tema escuro efetivo e testes integrados de produção. As tabelas para alguns desses recursos estão preparadas, mas banco de dados não significa funcionalidade implementada.

## 7. Segurança e testes
NUNCA armazene senha em texto puro nem dados de cartão. Pix exibido é DEMO, sem cobrança. O token atual expira em 12 horas e não tem refresh automático. Para produção, use HTTPS, validação adicional, rate limiting, permissões refinadas e testes end-to-end. Teste cadastro, login, produto, pedido, estoque, cancelamento, horários e permissões antes de usar com alunos reais.
