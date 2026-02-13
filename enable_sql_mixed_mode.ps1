# Script para habilitar Mixed Mode Authentication no SQL Server
# EXECUTE ESTE SCRIPT COMO ADMINISTRADOR

Write-Host "Habilitando Mixed Mode Authentication no SQL Server..." -ForegroundColor Yellow

try {
    # Habilitar Mixed Mode (LoginMode = 2)
    Set-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Microsoft SQL Server\MSSQL17.SQLEXPRESS\MSSQLServer" -Name "LoginMode" -Value 2
    Write-Host "✓ Mixed Mode habilitado com sucesso!" -ForegroundColor Green
    
    # Reiniciar o serviço SQL Server
    Write-Host "`nReiniciando o serviço SQL Server..." -ForegroundColor Yellow
    Restart-Service -Name "MSSQL`$SQLEXPRESS" -Force
    Write-Host "✓ Serviço SQL Server reiniciado!" -ForegroundColor Green
    
    Write-Host "`n✓ Configuração concluída!" -ForegroundColor Green
    Write-Host "Agora você pode executar 'npm run dev' no servidor backend." -ForegroundColor Cyan
}
catch {
    Write-Host "✗ Erro: $_" -ForegroundColor Red
    Write-Host "`nCertifique-se de que está executando o PowerShell como Administrador!" -ForegroundColor Yellow
}

Write-Host "`nPressione qualquer tecla para fechar..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
