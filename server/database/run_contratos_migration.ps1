# Script para executar a migration da tabela contratos
$ServerInstance = "localhost\SQLEXPRESS"
$Database = "DESPESAS"
$SqlFile = Join-Path $PSScriptRoot "migrations\create_contratos_table.sql"

Write-Host "Executando migration: create_contratos_table.sql" -ForegroundColor Cyan
Write-Host "Servidor: $ServerInstance" -ForegroundColor Yellow
Write-Host "Database: $Database" -ForegroundColor Yellow

try {
    # Ler o conteúdo do arquivo SQL
    $SqlContent = Get-Content -Path $SqlFile -Raw
    
    # Executar o SQL
    Invoke-Sqlcmd -ServerInstance $ServerInstance -Database $Database -Query $SqlContent -ErrorAction Stop
    
    Write-Host "`nMigration executada com sucesso!" -ForegroundColor Green
    Write-Host "Tabela 'contratos' criada." -ForegroundColor Green
}
catch {
    Write-Host "`nErro ao executar migration:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}
