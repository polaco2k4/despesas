# Script para executar a migration de renovação automática de contratos
$ServerInstance = "localhost\SQLEXPRESS"
$Database = "DESPESAS"
$SqlFile = Join-Path $PSScriptRoot "migrations\add_renovacao_contratos.sql"

Write-Host "Executando migration: add_renovacao_contratos.sql" -ForegroundColor Cyan
Write-Host "Servidor: $ServerInstance" -ForegroundColor Yellow
Write-Host "Database: $Database" -ForegroundColor Yellow

try {
    # Ler o conteúdo do arquivo SQL
    $SqlContent = Get-Content -Path $SqlFile -Raw

    # Executar o SQL
    Invoke-Sqlcmd -ServerInstance $ServerInstance -Database $Database -Query $SqlContent -ErrorAction Stop

    Write-Host "`nMigration executada com sucesso!" -ForegroundColor Green
    Write-Host "Campos de renovação automática adicionados à tabela 'contratos'." -ForegroundColor Green
}
catch {
    Write-Host "`nErro ao executar migration:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}
