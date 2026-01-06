# Backend API - Sistema de Gestão de Despesas

Backend Node.js/Express para integração com SQL Server Express usando Windows Authentication.

## 🚀 Quick Start

### Pré-requisitos
- Node.js 18+
- SQL Server Express instalado
- Windows Authentication configurado

### Instalação

```bash
# Instalar dependências
npm install

# Copiar arquivo de ambiente
copy .env.example .env

# Editar .env com suas configurações
notepad .env

# Inicializar banco de dados
npm run db:init

# Iniciar em modo desenvolvimento
npm run dev
```

## 📁 Estrutura do Projeto

```
server/
├── src/
│   ├── config/
│   │   └── database.ts          # Configuração SQL Server
│   ├── controllers/             # Lógica de negócio
│   │   ├── departamentosController.ts
│   │   ├── usuariosController.ts
│   │   ├── orcamentosController.ts
│   │   ├── rubricasController.ts
│   │   ├── despesasController.ts
│   │   ├── aprovacoesController.ts
│   │   └── dashboardController.ts
│   ├── routes/                  # Rotas da API
│   ├── types/                   # TypeScript types
│   ├── scripts/                 # Scripts utilitários
│   └── index.ts                 # Entry point
├── database/
│   ├── schema.sql               # Schema do banco
│   └── seed.sql                 # Dados iniciais
├── .env.example                 # Exemplo de variáveis de ambiente
├── package.json
└── tsconfig.json
```

## 🔌 Endpoints da API

### Base URL
```
http://localhost:3001/api
```

### Departamentos
- `GET /api/departamentos` - Listar todos
- `POST /api/departamentos` - Criar novo
- `PUT /api/departamentos/:id` - Atualizar
- `DELETE /api/departamentos/:id` - Deletar

### Usuários
- `GET /api/usuarios` - Listar todos
- `GET /api/usuarios/:id` - Buscar por ID
- `POST /api/usuarios` - Criar novo
- `PUT /api/usuarios/:id` - Atualizar
- `DELETE /api/usuarios/:id` - Deletar

### Orçamentos
- `GET /api/orcamentos` - Listar todos
- `GET /api/orcamentos/:id` - Buscar por ID
- `POST /api/orcamentos` - Criar novo
- `PUT /api/orcamentos/:id` - Atualizar
- `DELETE /api/orcamentos/:id` - Deletar

### Rubricas
- `GET /api/rubricas` - Listar todas
- `GET /api/rubricas/orcamento/:orcamentoId` - Por orçamento
- `POST /api/rubricas` - Criar nova
- `PUT /api/rubricas/:id` - Atualizar
- `DELETE /api/rubricas/:id` - Deletar

### Despesas
- `GET /api/despesas?status=pendente&usuario_id=xxx` - Listar (com filtros)
- `GET /api/despesas/:id` - Buscar por ID
- `POST /api/despesas` - Criar nova
- `PUT /api/despesas/:id` - Atualizar
- `DELETE /api/despesas/:id` - Deletar

### Aprovações
- `GET /api/aprovacoes` - Listar todas
- `POST /api/aprovacoes` - Criar aprovação

### Dashboard
- `GET /api/dashboard/stats?userRole=admin&departamentoId=xxx` - Estatísticas

### Health Check
- `GET /api/health` - Status da API

## ⚙️ Configuração

### Variáveis de Ambiente (.env)

```env
# SQL Server
SQL_SERVER=localhost\SQLEXPRESS
SQL_DATABASE=DESPESAS
SQL_TRUSTED_CONNECTION=true
SQL_ENCRYPT=true
SQL_TRUST_SERVER_CERTIFICATE=true

# Server
PORT=3001
NODE_ENV=development

# CORS
FRONTEND_URL=http://localhost:5173
```

### Windows Authentication vs SQL Authentication

**Windows Authentication (Padrão):**
```env
SQL_TRUSTED_CONNECTION=true
```

**SQL Authentication:**
```env
SQL_TRUSTED_CONNECTION=false
SQL_USER=sa
SQL_PASSWORD=SuaSenha123!
```

## 🗄️ Banco de Dados

### Inicializar Database

```bash
npm run db:init
```

Isso executará:
1. `database/schema.sql` - Cria tabelas e índices
2. `database/seed.sql` - Insere dados iniciais

### Credenciais Padrão

Após `db:init`:
- Email: `admin@empresa.ao`
- Senha: `senha123`

### Tabelas Criadas

- `departamentos`
- `usuarios`
- `orcamentos`
- `rubricas`
- `despesas`
- `aprovacoes`
- `fornecedores`

## 🛠️ Scripts Disponíveis

```bash
# Desenvolvimento (hot reload)
npm run dev

# Build para produção
npm run build

# Executar produção
npm start

# Inicializar banco de dados
npm run db:init
```

## 🔒 Segurança

- Helmet.js para headers HTTP seguros
- CORS configurado para frontend específico
- Windows Authentication para SQL Server
- Prepared statements (proteção contra SQL Injection)

## 📝 Logs

O servidor usa Morgan para logging HTTP:
- Modo desenvolvimento: formato `dev`
- Logs aparecem no console

## 🐛 Debug

### Testar Conexão SQL Server

```bash
# Windows
sqlcmd -S localhost\SQLEXPRESS -E -Q "SELECT @@VERSION"
```

### Verificar Logs

```bash
# Se usando PM2
pm2 logs despesas-api

# Modo dev (console)
npm run dev
```

## 📦 Dependências Principais

- **express** - Framework web
- **mssql** - Driver SQL Server
- **cors** - CORS middleware
- **helmet** - Security headers
- **morgan** - HTTP logger
- **dotenv** - Environment variables

## 🚀 Deploy

Ver [README-DEPLOY.md](../README-DEPLOY.md) para instruções completas de deploy em servidor Windows.

## 📄 Licença

ISC
