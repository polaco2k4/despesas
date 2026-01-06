# 🚀 Guia de Instalação Rápida - Sistema de Gestão de Despesas

## ✅ Sistema Preparado para SQL Server Express

O sistema foi configurado com backend Node.js/Express para integrar com **SQL Server Express** usando **Windows Authentication**.

---

## 📋 Pré-requisitos

1. **SQL Server Express** instalado
2. **Node.js 18+** instalado
3. **Windows** (para Windows Authentication)

---

## 🔧 Instalação Passo a Passo

### 1️⃣ Instalar Dependências do Backend

```powershell
# Navegar para o diretório do servidor
cd server

# Instalar dependências
npm install
```

### 2️⃣ Configurar Variáveis de Ambiente

```powershell
# Copiar arquivo de exemplo
copy .env.example .env

# Editar o arquivo .env
notepad .env
```

**Configuração padrão (Windows Authentication):**
```env
SQL_SERVER=localhost\SQLEXPRESS
SQL_DATABASE=DESPESAS
SQL_TRUSTED_CONNECTION=true
SQL_ENCRYPT=true
SQL_TRUST_SERVER_CERTIFICATE=true
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

### 3️⃣ Inicializar Banco de Dados

```powershell
# Ainda no diretório server/
npm run db:init
```

Isso criará:
- ✅ Database `DESPESAS`
- ✅ Todas as tabelas necessárias
- ✅ Dados iniciais (departamentos, usuários, orçamentos)

**Credenciais padrão criadas:**
- 📧 Email: `admin@empresa.ao`
- 🔑 Senha: `senha123`

### 4️⃣ Iniciar Backend

```powershell
# Modo desenvolvimento (com hot reload)
npm run dev

# Ou modo produção
npm run build
npm start
```

O backend estará rodando em: **http://localhost:3001**

### 5️⃣ Testar Backend

Abrir no navegador ou usar curl:
```powershell
# Health check
curl http://localhost:3001/api/health

# Listar departamentos
curl http://localhost:3001/api/departamentos
```

---

## 🌐 Frontend (Opcional - para desenvolvimento)

O frontend atual usa dados mock. Para conectar ao backend SQL Server:

```powershell
# No diretório raiz do projeto
npm install
npm run dev
```

Frontend estará em: **http://localhost:5173**

---

## 📁 Estrutura do Projeto

```
DESPESAS/
├── server/                    # Backend Node.js/Express
│   ├── src/
│   │   ├── config/           # Configuração SQL Server
│   │   ├── controllers/      # Lógica de negócio
│   │   ├── routes/           # Rotas da API
│   │   └── index.ts          # Entry point
│   ├── database/
│   │   ├── schema.sql        # Schema do banco
│   │   └── seed.sql          # Dados iniciais
│   ├── .env.example          # Exemplo de configuração
│   └── package.json
├── src/                       # Frontend React/Vite
│   ├── lib/
│   │   ├── mockApi.ts        # API mock (atual)
│   │   ├── sqlServerApi.ts   # API SQL Server (referência)
│   │   └── api.ts            # API Supabase (referência)
│   └── components/
├── README-DEPLOY.md           # Guia completo de deploy
└── INSTALACAO.md             # Este arquivo
```

---

## 🔌 Endpoints da API

Base URL: `http://localhost:3001/api`

### Principais Endpoints

- `GET /api/health` - Status da API
- `GET /api/departamentos` - Listar departamentos
- `GET /api/usuarios` - Listar usuários
- `GET /api/orcamentos` - Listar orçamentos
- `GET /api/rubricas` - Listar rubricas
- `GET /api/despesas` - Listar despesas
- `GET /api/aprovacoes` - Listar aprovações
- `GET /api/dashboard/stats` - Estatísticas do dashboard

Ver documentação completa em `server/README.md`

---

## 🐛 Solução de Problemas

### ❌ Erro: "Cannot connect to SQL Server"

**Verificar se SQL Server está rodando:**
```powershell
Get-Service -Name "MSSQL$SQLEXPRESS"
```

**Iniciar se necessário:**
```powershell
Start-Service -Name "MSSQL$SQLEXPRESS"
```

### ❌ Erro: "Login failed for user"

**Usar Windows Authentication:**
```env
SQL_TRUSTED_CONNECTION=true
```

**Ou configurar SQL Authentication:**
```env
SQL_TRUSTED_CONNECTION=false
SQL_USER=sa
SQL_PASSWORD=SuaSenha
```

### ❌ Erro: "Cannot find module 'express'"

```powershell
# Reinstalar dependências
cd server
rm -rf node_modules
npm install
```

### ❌ Porta 3001 já em uso

Alterar porta no `.env`:
```env
PORT=3002
```

---

## 📚 Documentação Adicional

- **Deploy em Produção:** Ver `README-DEPLOY.md`
- **API Backend:** Ver `server/README.md`
- **Schema do Banco:** Ver `server/database/schema.sql`

---

## 🔐 Segurança

### Dados Padrão (Desenvolvimento)

O script `seed.sql` cria usuários com senha padrão `senha123`.

**⚠️ IMPORTANTE:** Em produção, alterar todas as senhas!

### Windows Authentication

O sistema usa Windows Authentication por padrão, que é mais seguro em ambientes corporativos Windows.

---

## ✅ Checklist de Instalação

- [ ] SQL Server Express instalado
- [ ] Node.js 18+ instalado
- [ ] Dependências do backend instaladas (`npm install`)
- [ ] Arquivo `.env` configurado
- [ ] Banco de dados inicializado (`npm run db:init`)
- [ ] Backend rodando (`npm run dev`)
- [ ] Testado endpoint `/api/health`

---

## 🚀 Próximos Passos

1. **Desenvolvimento:**
   - Backend está pronto para uso
   - Frontend pode continuar usando `mockApi.ts`
   - Quando pronto, trocar para chamadas HTTP ao backend

2. **Deploy:**
   - Seguir guia completo em `README-DEPLOY.md`
   - Configurar backend como serviço Windows
   - Configurar IIS para frontend
   - Configurar HTTPS

3. **Customização:**
   - Ajustar dados seed em `server/database/seed.sql`
   - Adicionar novos endpoints conforme necessário
   - Implementar autenticação JWT (se necessário)

---

## 📞 Suporte

Para problemas técnicos:
1. Verificar logs do backend (`npm run dev` mostra no console)
2. Verificar conexão com SQL Server
3. Consultar `README-DEPLOY.md` para troubleshooting

---

**Versão:** 1.0.0  
**Data:** Janeiro 2026  
**Status:** ✅ Sistema preparado para SQL Server Express
