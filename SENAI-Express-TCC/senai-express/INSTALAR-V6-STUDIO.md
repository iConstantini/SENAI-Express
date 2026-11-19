# SENAI Express V6 Studio — instalação e limites

## O que foi modificado nesta entrega
- Navbar **superior** persistente para alunos: Início, Cardápio, Carrinho (contador), Pedidos, Perfil, sino de notificações.
- Nova identidade visual vermelho/branco, banner com camadas e profundidade, cards com sombras, carrinho com miniaturas.
- Cadastro com foto escolhida na galeria, upload limitado a 600 KB e foto associada ao novo usuário.
- Perfil com troca de foto pela galeria, sem precisar digitar URL.
- Mantidos: login, catálogo, carrinho, pedidos, horários, pagamentos simulados, favoritos, avaliações, painel e rotas já presentes na base recebida.
- Backend com upload de avatar em `/api/uploads/avatar` e arquivos servidos em `/uploads`.
- Banco antigo V3 **não é alterado**.

## Importante
**Esta não é a implementação completa nem testada das 25 funções prometidas.**
Biometria Face ID/Android, notificações push reais, modo offline sincronizado, cupons aplicados no checkout, animação 3D nativa e vários fluxos administrativos ainda precisam de implementação.
O visual de profundidade usa camadas e sombras, não motor 3D. Não foi possível validar em aparelhos reais ou no seu MySQL.

## Instalação Windows — projeto novo
1. Faça backup da V6 atual e **não substitua a V3**.
2. Extraia este ZIP em uma pasta própria.
3. Use o banco já criado `senai_express_v6` (29 tabelas, conforme seu print). **Não execute novamente o instalador SQL** sobre o banco existente.
4. No `backend`, copie `.env.example` para `.env` e configure `PORT=3334`, `DB_NAME=senai_express_v6`, `DB_USER` e senha. Gere `JWT_SECRET` com `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
5. **Troque a senha do MySQL que apareceu no print anterior**, sem alterar a V3 inadvertidamente. Melhor: crie um usuário exclusivo V6 e dê permissão apenas em `senai_express_v6.*`.
6. No terminal da pasta raiz `senai-express`, execute `npm install --no-save --no-package-lock dotenv mysql2 bcryptjs` caso use o script legado de admin. Em `backend`, execute `npm install` e `npm run dev`.
7. Teste `http://localhost:3334/api/health`.
8. Em `mobile/src/config.ts`, substitua o IP pelo IPv4 atual do computador e mantenha porta `3334`.
9. Na pasta `mobile`, execute `npm install`, depois `npx expo install expo-image-picker` e então `npx expo start -c`.
10. Abra Expo Go no celular, na mesma rede Wi-Fi, e teste `http://SEU_IP:3334/api/health` no navegador do celular.
11. Faça um novo cadastro com foto, login, teste carrinho, pedidos, perfil e acesso administrativo.

## Uploads e segurança
- Fotos ficam em `backend/uploads/` no disco do computador, não no MySQL; o banco guarda a URL.
- Se o IP do computador mudar, as URLs antigas das fotos podem deixar de funcionar. Para produção, usar domínio fixo e armazenamento de objetos.
- A rota de upload permite upload antes do login para viabilizar cadastro; para produção requer proteção antiabuso, rate limiting e limpeza de uploads órfãos.
- O pagamento é **simulado**, não movimenta dinheiro.
- Não publique a API na internet com credenciais de teste ou `root`.
- Biometria requer fluxo seguro de credenciais e teste em builds nativos.

## Verificação funcional
- Cadastro com foto e sem foto.
- Login cliente e administrador.
- Atualização de foto no perfil.
- Adição/remoção de produtos do carrinho.
- Horários, pedido e pagamento simulado.
- CRUD administrativo, logs, favoritos, avaliações e suporte.
- Falha de rede, produtos sem estoque e campos inválidos.

Se algo falhar, envie o erro do terminal (sem senhas) e a tela envolvida.
