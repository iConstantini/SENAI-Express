# SENAI Express V6 — instalação isolada da V3

**Estado do projeto:** base de desenvolvimento derivada da V5; as 25 funcionalidades propostas NÃO estão todas implementadas ou testadas. Não use para pagamentos reais. A V3 não precisa ser modificada.

## 1. Pré-requisitos
Windows, Node.js e npm, MySQL Server em execução, MySQL Workbench, VS Code, celular com Expo Go. O servidor MySQL pode ser o mesmo da V3; o banco de dados será outro.

## 2. Pasta do projeto
Extraia o ZIP em `C:\Users\SEU_USUARIO\Documents\SENAI-Express-V6` (não substitua a pasta V3). Dentro dela entre em `SENAI-Express-TCC\senai-express`.

## 3. Banco novo
Abra MySQL Workbench, conecte ao servidor existente, escolha File > Open SQL Script e abra `database/INSTALAR_BANCO_V6.sql`. Inspecione o nome do banco no início e execute todo o script. Ele usa apenas `senai_express_v6`. Depois rode `SHOW DATABASES;` e `USE senai_express_v6; SHOW TABLES;` para conferir. Não execute SQLs da V3 no banco novo. Guarde um backup antes de qualquer alteração no servidor.

## 4. Backend
No CMD, entre em `SENAI-Express-TCC\senai-express\backend` e execute `copy .env.example .env`. Edite `.env` com DB_USER e DB_PASSWORD válidos do seu MySQL, mantendo `DB_NAME=senai_express_v6` e `PORT=3334`. Defina JWT_SECRET aleatório com pelo menos 32 caracteres e ADMIN_PASSWORD forte. Rode `npm install` e `npm run dev`. Teste `http://localhost:3334/api/health`. Se não responder, examine o erro do terminal e confira MySQL e credenciais.

## 5. Admin
Em outro CMD, na pasta backend, rode `npm run create-admin` depois de configurar o `.env`. Isso cria/atualiza o administrador NO BANCO NOVO. Não compartilhe senhas ou o `.env`.

## 6. Aplicativo
Abra CMD em `SENAI-Express-TCC\senai-express\mobile`. Rode `ipconfig` e copie o IPv4 do adaptador Wi-Fi ativo. Edite `mobile/src/config.ts`: troque SEU_IP_ATUAL pelo IPv4, mantendo a porta 3334. O celular deve estar na mesma rede do computador. Rode `npm install` e `npx expo start -c`; leia o QR com Expo Go. Se não conectar, teste `http://IP_DO_PC:3334/api/health` no navegador do celular e verifique firewall do Windows.

## 7. Testes iniciais
Teste cadastro, login, listagem de produtos, carrinho, pedidos e painel administrativo. A V5/V6 ainda exige desenvolvimento para concluir integralmente Face ID, digital, push, upload da galeria, recuperação de senha, cupons e modo offline. Biometria e notificações podem exigir build nativo de desenvolvimento, não apenas Expo Go.

## 8. Rodar depois
Inicie o MySQL se necessário; abra um CMD no backend e execute `npm run dev`; abra outro CMD no mobile e execute `npx expo start -c`. A V3 pode continuar na porta 3333; a V6 usa 3334.
