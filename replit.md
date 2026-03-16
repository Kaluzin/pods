# 011 dos Pods

Landing page de e-commerce brasileiro para pods/vapes com backend completo.

## Stack
- **Frontend**: HTML5, CSS3, JavaScript vanilla
- **Backend**: Node.js + Express.js
- **Banco de dados**: PostgreSQL (via `pg` + `connect-pg-simple`)
- **Auth**: Passport.js (local email/senha + Google OAuth)
- **Sessions**: `express-session` com sessões persistidas no PostgreSQL
- **Workflow**: `node server.js` na porta 5000

## Arquivos principais
| Arquivo | Descrição |
|---|---|
| `server.js` | Servidor Express com todas as rotas de API e auth |
| `index.html` | Landing page principal |
| `script.js` | Lógica JS frontend (checkout, auth, frete, CEP) |
| `style.css` | Todos os estilos |
| `minha-conta.html` | Dashboard completo do cliente |
| `redefinir-senha.html` | Página de redefinição de senha por token |

## Banco de dados (tabelas)
- `users` — cadastro com CPF, telefone, data de nascimento
- `orders` — pedidos associados ao usuário
- `favorites` — produtos favoritos
- `addresses` — endereços de entrega
- `password_reset_tokens` — tokens de reset de senha (expiram em 1h)

## Rotas de API
| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/auth/register` | Cadastro |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/auth/me` | Sessão atual |
| POST | `/api/auth/forgot-password` | Gera link de reset |
| POST | `/api/auth/reset-password` | Confirma nova senha |
| GET/PUT | `/api/user/profile` | Dados do perfil |
| GET | `/api/user/orders` | Lista pedidos |
| GET/POST | `/api/user/favorites` | Favoritos |
| DELETE | `/api/user/favorites/:id` | Remove favorito |
| GET/POST | `/api/user/addresses` | Endereços |
| GET | `/auth/google` | OAuth Google |
| GET | `/auth/google/callback` | Callback Google |

## Variáveis de ambiente necessárias
- `DATABASE_URL` — string de conexão PostgreSQL (obrigatório)
- `SESSION_SECRET` — segredo da sessão (obrigatório)
- `GOOGLE_CLIENT_ID` — para login com Google
- `GOOGLE_CLIENT_SECRET` — para login com Google

## Funcionalidades
- Modal de login/cadastro com abas (Entrar | Criar Conta)
- Cadastro completo: CPF, RG, celular, telefone, data de nascimento, confirmação de e-mail e senha, checkboxes de newsletter/marketing
- Login com Google OAuth (outros provedores: stub com instrução de configuração)
- Fluxo "esqueci minha senha" com link de redefinição exibido na tela
- Checkout com abas de pagamento: PIX (5% desconto) e Cartão de Crédito
- Frete calculado por CEP incluído no total do checkout
- Página Minha Conta com: Pedidos, Meus Dados, Endereços, Favoritos, Créditos
- Avatar com iniciais do usuário no header após login
