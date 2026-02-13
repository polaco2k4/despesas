# Habilitar Autenticação SQL Server (Mixed Mode)

## Problema
O SQL Server Express está configurado apenas para autenticação Windows. Precisa aceitar logins SQL também.

## Solução 1: Via SQL Server Management Studio (RECOMENDADO)

1. **Abra o SQL Server Management Studio (SSMS)**
2. **Conecte-se** a `localhost\SQLEXPRESS` usando autenticação Windows
3. **Clique com botão direito** no servidor (nome do servidor no topo da árvore)
4. Selecione **Properties** (Propriedades)
5. Vá para a página **Security** (Segurança)
6. Em **Server authentication**, selecione:
   - **SQL Server and Windows Authentication mode** (Modo misto)
7. Clique **OK**
8. **IMPORTANTE**: Reinicie o serviço SQL Server

### Reiniciar o Serviço SQL Server

Abra PowerShell **como Administrador** e execute:

```powershell
Restart-Service -Name "MSSQL$SQLEXPRESS" -Force
```

## Solução 2: Via Script SQL (Requer Reinício)

1. Execute o script `server/database/enable_mixed_mode.sql` no SSMS
2. Reinicie o serviço SQL Server com o comando acima

## Solução 3: Via Registry (Avançado)

Execute no PowerShell **como Administrador**:

```powershell
# Habilitar Mixed Mode
Set-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Microsoft SQL Server\MSSQL16.SQLEXPRESS\MSSQLServer" -Name "LoginMode" -Value 2

# Reiniciar o serviço
Restart-Service -Name "MSSQL$SQLEXPRESS" -Force
```

**Nota**: O caminho pode variar dependendo da versão. Verifique em:
- SQL Server 2022: `MSSQL16.SQLEXPRESS`
- SQL Server 2019: `MSSQL15.SQLEXPRESS`
- SQL Server 2017: `MSSQL14.SQLEXPRESS`

## Após Habilitar Mixed Mode

1. Execute o script `server/database/create_sql_user.sql` no SSMS
2. Verifique se o arquivo `server/.env` tem:
   ```env
   SQL_USER=despesas_user
   SQL_PASSWORD=Despesas@2024
   SQL_TRUSTED_CONNECTION=false
   ```
3. Reinicie o servidor backend: `npm run dev`

## Verificar se Funcionou

Após reiniciar o SQL Server, teste a conexão:

```powershell
# No PowerShell
sqlcmd -S localhost\SQLEXPRESS -U despesas_user -P Despesas@2024 -Q "SELECT @@VERSION"
```

Se retornar a versão do SQL Server, a autenticação está funcionando!
