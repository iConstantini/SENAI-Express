# SENAI Express V3 — Guia completo de instalação

## Tecnologias
Expo/React Native no celular, Express/Node.js no backend e MySQL 8 no banco. A identidade visual é inspirada nas cores SENAI; não representa um aplicativo oficial da instituição.

## Passo 1 — Banco
Faça backup de um banco existente. Para banco novo execute `database/database.sql` no MySQL Workbench, depois `database/migrate-v3.sql`. Para banco antigo já atualizado com v2, execute somente `database/migrate-v3.sql`. Não renomeie tabelas ou colunas. SQL v3 acrescenta favoritos, comunicados e cupons, sem apagar dados.

## Passo 2 — Backend
Abra terminal em `backend`, execute `npm install`, copie `.env.example` para `.env`, configure credenciais do MySQL e JWT_SECRET (chave aleatória longa), ADMIN_EMAIL e ADMIN_PASSWORD. Execute `npm run create-admin` e `npm run dev`. Abra http://localhost:3333/api/health. **Nunca publique o .env.**

## Passo 3 — Expo
Em `mobile/src/config.ts`, configure `http://IPV4_DO_COMPUTADOR:3333/api` (descubra com `ipconfig`). Celular e PC devem estar na mesma rede; libere a porta no firewall de rede privada. Abra terminal em `mobile`, execute `npm install` e `npx expo start`; escaneie o QR Code com Expo Go. Não execute Expo na raiz do repositório.

## Passo 4 — Acesso ao painel
Na tela de login, escolha acesso da loja e use o administrador criado no passo 2. O backend verifica o papel admin por JWT. Não coloque a senha administrativa no App.js.

## APIs adicionais V3
- GET /api/announcements — comunicados públicos
- GET /api/favorites — favoritos do cliente (Bearer JWT)
- POST /api/favorites/:id — adicionar favorito (Bearer JWT)
- DELETE /api/favorites/:id — remover favorito (Bearer JWT)
- POST /api/coupons/validate — verificar cupom (Bearer JWT, body {"codigo":"EXEMPLO"}); **não aplica desconto**
- GET /api/admin/low-stock — estoque baixo (admin)
- POST /api/admin/announcements — publicar aviso (admin, body {"titulo":"...","mensagem":"..."})

As novas rotas V3 estão prontas no backend, mas ainda não têm telas próprias no aplicativo. Para usá-las no Expo, é necessário adicionar componentes e chamadas à API. Não use a validação de cupom como cálculo de desconto: a regra de desconto deve ser implementada atomicamente no checkout do servidor.

## Pagamentos
Pix e cartão são simulações; não há cobrança bancária nem gateway integrado. Para pagamentos reais, configure provedor autorizado, crie cobrança no backend, verifique webhooks autenticados, proteja contra notificações duplicadas e reconcilie estados. Não armazene números de cartão ou CVV.

## Verificação
`node --check backend/src/server.js` valida a sintaxe do servidor. Para validar a operação de ponta a ponta, é necessário rodar MySQL, backend e Expo, criar usuário, testar carrinho, pedidos, painel e migrações em uma instalação real.
