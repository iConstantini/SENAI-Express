# SENAI Express — versão aprimorada

Aplicativo acadêmico de pedidos para a cantina do SENAI. O projeto usa **Expo / React Native**, **Node.js / Express**, **JWT** e **MySQL**.

> Pagamentos Pix e cartão continuam em modo de demonstração. O sistema não cobra dinheiro, não gera QR Code Pix bancário e não deve ser apresentado como pagamento real. Para cobrança real, é necessário integrar um provedor (por exemplo, Mercado Pago) com credenciais próprias, webhook e validação no servidor.

## Estrutura

- `mobile/` — aplicativo Android/iOS feito com Expo.
- `backend/` — API REST, autenticação e regras de negócio.
- `database/database.sql` — banco novo com tabelas e produtos de demonstração.
- `database/migrate-v2.sql` — atualização do banco já existente para habilitar cartão simulado e índices.
- `database/create-admin.js` — cria ou atualiza a conta protegida da loja.

## Banco de dados: nomes padronizados

O banco usa `senai_express` e tabelas em `snake_case`, sem espaços ou acentos: `usuarios`, `categorias`, `produtos`, `horarios_retirada`, `pedidos`, `itens_pedido`, `pagamentos` e `historico_pedidos`.

**Não renomeie essas tabelas ou colunas isoladamente:** a API usa exatamente esses nomes. Se estiver criando do zero, execute `database/database.sql`. Se já tem o banco e os dados, faça backup e execute uma vez `database/migrate-v2.sql` no MySQL Workbench. A migração preserva os nomes e os registros existentes.

Compatibilidade recomendada: MySQL 8.0.16 ou superior (o script usa constraints `CHECK`).

## 1. Preparar o MySQL

1. Inicie o MySQL Server.
2. Abra o MySQL Workbench.
3. Para uma instalação nova, abra `database/database.sql` e execute o script inteiro.
4. Para um banco existente, faça backup primeiro e execute `database/migrate-v2.sql` uma única vez.
5. Crie um usuário exclusivo para a aplicação (recomendado):

```sql
CREATE USER 'senai_app'@'localhost' IDENTIFIED BY 'SUA_SENHA_FORTE';
GRANT SELECT, INSERT, UPDATE, DELETE ON senai_express.* TO 'senai_app'@'localhost';
FLUSH PRIVILEGES;
```

Se o usuário já existir, use `ALTER USER` em vez de `CREATE USER`. Não exponha a porta 3306 na internet.

## 2. Configurar o backend

Abra um terminal na pasta `senai-express/backend`:

```bash
npm install
```

Crie `backend/.env` copiando `backend/.env.example`.

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Edite `backend/.env` e configure `DB_USER`, `DB_PASSWORD`, `JWT_SECRET`, `ADMIN_EMAIL` e `ADMIN_PASSWORD`. A senha do painel da loja é a variável `ADMIN_PASSWORD`; use uma senha forte e não a compartilhe com clientes. O arquivo `.env` não deve ser enviado nem publicado.

Gere uma chave JWT longa e aleatória. Exemplo no PowerShell:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Cole o resultado em `JWT_SECRET`. Defina uma senha administrativa com pelo menos 10 caracteres.

Crie/atualize a conta da loja:

```bash
npm run create-admin
```

Inicie a API:

```bash
npm run dev
```

Teste no navegador do computador: `http://localhost:3333/api/health`. A resposta deve indicar `ok: true` e banco conectado.

## 3. Configurar o aplicativo Expo

Abra um **segundo terminal** na pasta `senai-express/mobile`:

```bash
npm install
```

Abra `mobile/src/config.ts` e coloque o IPv4 local do computador que executa o backend:

```ts
export const API_URL = 'http://SEU_IPV4:3333/api';
```

No Windows, descubra o IPv4 com `ipconfig` (adaptador Wi-Fi). Não use `localhost` no celular físico. O computador e o celular precisam estar na mesma rede Wi-Fi; permita o Node.js no firewall para rede privada.

Inicie o Expo **dentro de `mobile/`**:

```bash
npx expo start
```

Abra o Expo Go e escaneie o QR Code.

## 4. Acesso de cliente e painel da loja

- Cliente: crie uma conta na tela inicial e entre com e-mail e senha.
- Loja: toque em **Acesso exclusivo da loja** e use o e-mail e a senha configurados em `ADMIN_EMAIL` e `ADMIN_PASSWORD`.
- O backend verifica a função `admin`; não basta conhecer o endereço da tela.
- No painel é possível acompanhar pedidos, atualizar status, ver indicadores de vendas e cadastrar produtos com preço, categoria, imagem e estoque.

## Recursos incluídos

- Cadastro e login com senha criptografada por bcrypt e sessão JWT.
- Catálogo, categorias, busca e carrinho.
- Validação de disponibilidade e estoque no servidor.
- Horários de retirada com limite de vagas.
- Pedidos com código de retirada e histórico.
- Pix demonstrativo, cartão demonstrativo e pagamento na retirada.
- Painel de loja com autenticação administrativa.
- Cadastro de produtos pelo aplicativo.
- Indicadores de pedidos, vendas do dia, itens mais vendidos e pedidos em andamento.
- Cancelamento de pedido com devolução de estoque e registro no histórico.

## Pagamentos

`pix_simulado` e `cartao_simulado` apenas registram uma aprovação de demonstração. O texto gerado para Pix é um identificador didático e **não é copiável para um banco como cobrança válida**. `pagar_na_retirada` fica pendente até ser tratado pela loja.

Para pagamento real, será necessário:
1. Criar conta no provedor de pagamento.
2. Guardar tokens secretos apenas no backend `.env`.
3. Criar a cobrança no servidor, nunca no aplicativo.
4. Confirmar o pagamento por webhook autenticado do provedor.
5. Atualizar `pagamentos` e `pedidos` somente após validar a confirmação.

## Solução de problemas

- `ConfigError: package.json does not exist`: o comando Expo foi executado na pasta errada. Entre em `senai-express/mobile`.
- `ECONNREFUSED`: verifique se o MySQL e a API estão iniciados.
- `Access denied`: confira usuário, senha e permissões no `.env`.
- Celular não conecta: confirme o IPv4 em `mobile/src/config.ts`, a mesma rede Wi-Fi e o firewall.
- Erro de coluna/tabela: confirme que executou o SQL correto e não renomeou tabelas/colunas manualmente.
- Painel não abre: execute `npm run create-admin` depois de configurar as variáveis administrativas.

## Segurança antes de qualquer uso real

Este é um projeto acadêmico. Antes de colocar em produção, implemente HTTPS, limitação de tentativas de login, recuperação de senha, logs/auditoria, backups, política de privacidade, testes de segurança e integração oficial de pagamentos. Não compartilhe `.env`, senhas ou tokens.
