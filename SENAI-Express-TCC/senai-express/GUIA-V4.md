# SENAI Express V4 — Instalação e limites

## O que foi adicionado
- Catálogo SQL com 10 novos itens de demonstração em cada uma das 6 categorias originais (sem duplicar nomes já existentes). Ajuste preços, ingredientes, fotos e estoque antes de uso real.
- Edição visual de nome, descrição, preço e estoque de produtos no painel admin; ativação/pausa já existente.
- Perfil editável com nome e foto por URL HTTPS (ainda não há upload da galeria).
- Tela de notificações dentro do aplicativo, criadas quando o administrador altera o status de um pedido.
- Histórico de mudanças de produtos/status e listagem de pagamentos simulados para administradores.
- Navegação para perfil pelo menu inferior, e acesso a notificações pela tela inicial.

## Passo a passo no Windows
1. Faça backup do banco atual com MySQL Workbench antes de qualquer migração. Não execute database.sql novamente se já tiver o banco funcionando.
2. Certifique-se de que seu banco atual já recebeu migrate-v3.sql; se não recebeu, execute primeiro esse arquivo.
3. No MySQL Workbench conectado ao banco correto, execute `database/migrate-v4.sql` **uma única vez**. Ele acrescenta duas colunas a usuarios, notificacoes e auditoria_admin. O arquivo ALTER não foi desenhado para reexecução.
4. Execute `database/catalogo-v4.sql`. Ele pode ser executado mais de uma vez sem duplicar os produtos com mesmo nome/categoria. A base original possui seis categorias.
5. Abra `backend/.env` (crie copiando `.env.example` se necessário), configure DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, JWT_SECRET. Não compartilhe nem publique esse arquivo. Mantenha seu banco atual.
6. Em `backend`: `npm install` e `npm run dev`. Não execute `create-admin` de novo a menos que precise criar ou redefinir o admin.
7. Confira `http://localhost:3333/api/health` no PC.
8. Em `mobile/src/config.ts`, atualize o IP para o IPv4 do computador que executa o backend (`ipconfig`). O IP 10.106.3.62 foi o último informado e pode mudar.
9. Em `mobile`: `npm install` e `npx expo start -c`. Conecte celular e PC à mesma rede e libere a porta 3333 no firewall de rede privada.
10. Teste registro, login, catálogo, carrinho, pedido, alteração de status, notificações, edição de perfil, edição de produtos e auditoria.

## Limitações importantes
- **Biometria Face ID/Android:** ainda não implementada. Requer integração segura com `expo-local-authentication` e armazenamento protegido de sessão; autenticação biométrica não deve ser usada como prova de identidade para o backend sem credenciais válidas.
- **Pagamento:** Pix/cartão permanecem simulações, sem cobrança real. Nunca informe cartão real no app de teste.
- **Foto:** aceita URL HTTPS; selecionar foto da galeria/upload ainda não está implementado.
- **Notificações:** são internas ao aplicativo (consultadas ao abrir a tela), não push no sistema operacional.
- **Horários:** seleção de retirada já existe; gestão visual de horários ainda não foi adicionada.
- **Testes:** sintaxe do backend foi verificada; execução completa com MySQL e Expo em seu Windows precisa ser testada por você. Não há garantia de ausência de erros sem teste no ambiente real.
- **Dados:** não substitua o banco existente pelo arquivo de exemplo. Faça backup e migre.

## Próximas melhorias sugeridas
Upload real de foto com validação; autenticação biométrica e armazenamento seguro de tokens; recuperação de senha; notificações push Expo; dashboard de vendas com filtros; relatórios CSV; administração de horários e capacidade; fotos verificadas e alergênicos; regras de desconto transacionais; idempotência no checkout; rate limiting e renovação segura de sessão; testes automatizados de integração.
