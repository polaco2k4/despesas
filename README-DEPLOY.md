# Guia de Deploy - Sistema de Gestão de Despesas

## 📋 Pré-requisitos

### Servidor Windows (VM ou Físico)
- Windows Server 2016 ou superior (ou Windows 10/11 Pro)
- SQL Server Express 2019 ou superior
- Node.js 18.x ou superior
- Git (opcional, para clone do repositório)

### Configurações de Rede
- Porta 3001 liberada para o backend API
- Porta 5173 ou 80/443 para o frontend (dependendo do servidor web)

---

## 🗄️ Configuração do SQL Server Express

### 1. Instalação do SQL Server Express

1. Baixar SQL Server Express: https://www.microsoft.com/pt-br/sql-server/sql-server-downloads
2. Durante a instalação:
   - Escolher **"Instalação Básica"** ou **"Personalizada"**
   - Anotar o nome da instância (padrão: `SQLEXPRESS`)
   - Habilitar **"Modo de Autenticação Mista"** (Windows + SQL)

### 2. Configurar Windows Authentication

Por padrão, o sistema usa **Windows Authentication** (mais seguro em ambiente corporativo).

**Verificar permissões:**
```powershell
# Abrir SQL Server Management Studio (SSMS)
# Conectar em: localhost\SQLEXPRESS (Windows Authentication)
# Verificar se o usuário do Windows que vai rodar o backend tem permissões
```

**Conceder permissões ao usuário do serviço:**
```sql
-- No SSMS, executar:
USE master;
GO

-- Substituir DOMAIN\Username pelo usuário que vai rodar o backend
CREATE LOGIN [DOMAIN\Username] FROM WINDOWS;
GO

ALTER SERVER ROLE sysadmin ADD MEMBER [DOMAIN\Username];
GO
```

### 3. Habilitar TCP/IP (se necessário para acesso remoto)

1. Abrir **SQL Server Configuration Manager**
2. Expandir **SQL Server Network Configuration**
3. Clicar em **Protocols for SQLEXPRESS**
4. Habilitar **TCP/IP**
5. Reiniciar o serviço **SQL Server (SQLEXPRESS)**

---

## 🚀 Instalação do Backend

### 1. Preparar o ambiente

```powershell
# Navegar até o diretório do projeto
cd C:\caminho\para\DESPESAS

# Navegar para o diretório do servidor
cd server

# Instalar dependências
npm install
```

### 2. Configurar variáveis de ambiente

Criar arquivo `.env` no diretório `server/`:

```env
# SQL Server Configuration
SQL_SERVER=localhost\SQLEXPRESS
SQL_DATABASE=DESPESAS
SQL_TRUSTED_CONNECTION=true
SQL_ENCRYPT=true
SQL_TRUST_SERVER_CERTIFICATE=true

# Server Configuration
PORT=3001
NODE_ENV=production

# CORS Configuration (URL do frontend)
FRONTEND_URL=http://seu-servidor:80
```

**Notas importantes:**
- `SQL_TRUSTED_CONNECTION=true` usa Windows Authentication
- Para SQL Authentication, use:
  ```env
  SQL_TRUSTED_CONNECTION=false
  SQL_USER=sa
  SQL_PASSWORD=SuaSenhaSegura123!
  ```

### 3. Inicializar o banco de dados

```powershell
# Executar script de criação do schema e dados iniciais
npm run db:init
```

Isso criará:
- Database `DESPESAS`
- Todas as tabelas necessárias
- Dados iniciais (departamentos, usuários, etc.)

**Credenciais padrão:**
- Email: `admin@empresa.ao`
- Senha: `senha123`

### 4. Testar o backend

```powershell
# Modo desenvolvimento
npm run dev

# Modo produção
npm run build
npm start
```

Acessar: http://localhost:3001/api/health

---

## 🌐 Deploy do Frontend

### Opção 1: Servir com Node.js (Recomendado para desenvolvimento)

```powershell
# No diretório raiz do projeto
npm install
npm run build

# Servir os arquivos estáticos
npx serve -s dist -p 80
```

### Opção 2: IIS (Internet Information Services)

1. **Instalar IIS:**
   - Painel de Controle → Programas → Ativar recursos do Windows
   - Marcar **Internet Information Services**

2. **Configurar site:**
   ```powershell
   # Build do frontend
   npm run build
   
   # Copiar pasta dist para C:\inetpub\wwwroot\despesas
   ```

3. **Criar site no IIS:**
   - Abrir **IIS Manager**
   - Adicionar novo site
   - Caminho físico: `C:\inetpub\wwwroot\despesas`
   - Porta: 80 ou 443 (HTTPS)

4. **Configurar URL Rewrite (para SPA):**
   - Instalar URL Rewrite Module
   - Criar `web.config` na pasta `dist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <rule name="React Routes" stopProcessing="true">
          <match url=".*" />
          <conditions logicalGrouping="MatchAll">
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
            <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
          </conditions>
          <action type="Rewrite" url="/" />
        </rule>
      </rules>
    </rewrite>
  </system.webServer>
</configuration>
```

---

## 🔧 Configurar Backend como Serviço Windows

### Usando PM2

```powershell
# Instalar PM2 globalmente
npm install -g pm2
npm install -g pm2-windows-service

# No diretório server/
pm2 start dist/index.js --name despesas-api

# Configurar para iniciar com o Windows
pm2 save
pm2-service-install
```

### Usando NSSM (Non-Sucking Service Manager)

1. Baixar NSSM: https://nssm.cc/download
2. Instalar o serviço:

```powershell
# Extrair nssm.exe
cd C:\nssm\win64

# Instalar serviço
.\nssm.exe install DespesasAPI "C:\Program Files\nodejs\node.exe"

# Configurar parâmetros
.\nssm.exe set DespesasAPI AppDirectory "C:\caminho\para\DESPESAS\server"
.\nssm.exe set DespesasAPI AppParameters "dist\index.js"
.\nssm.exe set DespesasAPI DisplayName "Despesas API Backend"
.\nssm.exe set DespesasAPI Description "Backend API para Sistema de Gestão de Despesas"

# Iniciar serviço
.\nssm.exe start DespesasAPI
```

---

## 🔒 Segurança

### Firewall

```powershell
# Liberar porta do backend
New-NetFirewallRule -DisplayName "Despesas API" -Direction Inbound -LocalPort 3001 -Protocol TCP -Action Allow

# Liberar porta do frontend (se necessário)
New-NetFirewallRule -DisplayName "Despesas Frontend" -Direction Inbound -LocalPort 80 -Protocol TCP -Action Allow
```

### HTTPS (Recomendado para produção)

1. **Obter certificado SSL:**
   - Let's Encrypt (gratuito)
   - Certificado comercial
   - Certificado auto-assinado (apenas para testes internos)

2. **Configurar no backend:**
   ```typescript
   // Adicionar em server/src/index.ts
   import https from 'https';
   import fs from 'fs';
   
   const options = {
     key: fs.readFileSync('path/to/private-key.pem'),
     cert: fs.readFileSync('path/to/certificate.pem')
   };
   
   https.createServer(options, app).listen(443);
   ```

---

## 📊 Monitoramento

### Logs do Backend

```powershell
# Com PM2
pm2 logs despesas-api

# Logs do Windows Event Viewer (se usando NSSM)
# Abrir Event Viewer → Application Logs
```

### Health Check

```powershell
# Verificar status da API
curl http://localhost:3001/api/health

# Verificar conexão com SQL Server
# Acessar http://localhost:3001/api/departamentos
```

---

## 🔄 Atualização do Sistema

### Backend

```powershell
cd server

# Parar serviço
pm2 stop despesas-api

# Atualizar código
git pull  # ou copiar novos arquivos

# Reinstalar dependências (se necessário)
npm install

# Rebuild
npm run build

# Reiniciar serviço
pm2 start despesas-api
```

### Frontend

```powershell
# Build nova versão
npm run build

# Copiar para IIS ou servidor web
Copy-Item -Path dist\* -Destination C:\inetpub\wwwroot\despesas -Recurse -Force
```

---

## 🐛 Troubleshooting

### Backend não conecta ao SQL Server

1. Verificar se SQL Server está rodando:
   ```powershell
   Get-Service -Name "MSSQL$SQLEXPRESS"
   ```

2. Testar conexão:
   ```powershell
   sqlcmd -S localhost\SQLEXPRESS -E
   ```

3. Verificar logs do backend:
   ```powershell
   pm2 logs despesas-api --lines 100
   ```

### Erro de permissão no SQL Server

```sql
-- Conceder permissões ao usuário
USE DESPESAS;
GO

GRANT SELECT, INSERT, UPDATE, DELETE ON SCHEMA::dbo TO [DOMAIN\Username];
GO
```

### CORS Error no frontend

Verificar se `FRONTEND_URL` no `.env` do backend está correto:
```env
FRONTEND_URL=http://ip-do-servidor:80
```

---

## 📞 Suporte

Para problemas ou dúvidas:
1. Verificar logs do sistema
2. Consultar documentação do SQL Server Express
3. Revisar configurações de rede e firewall

---

## ✅ Checklist de Deploy

- [ ] SQL Server Express instalado e configurado
- [ ] Database DESPESAS criada (via `npm run db:init`)
- [ ] Backend instalado e testado
- [ ] Variáveis de ambiente configuradas
- [ ] Backend rodando como serviço Windows
- [ ] Frontend buildado e servido
- [ ] Firewall configurado
- [ ] HTTPS configurado (produção)
- [ ] Backup do banco de dados configurado
- [ ] Monitoramento ativo

---

**Versão:** 1.0.0  
**Última atualização:** Janeiro 2026
