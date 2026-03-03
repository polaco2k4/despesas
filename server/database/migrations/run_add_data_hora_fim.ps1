# PowerShell script to add data_hora_fim column to reunioes table

$serverName = "localhost"
$databaseName = "DESPESAS_DB"
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$sqlFile = Join-Path $scriptPath "add_data_hora_fim.sql"

Write-Host "Adding data_hora_fim column to reunioes table..." -ForegroundColor Cyan

try {
    # Read SQL file
    $sqlContent = Get-Content -Path $sqlFile -Raw
    
    # Create connection
    $connectionString = "Server=$serverName;Database=$databaseName;Integrated Security=True;TrustServerCertificate=True;"
    $connection = New-Object System.Data.SqlClient.SqlConnection($connectionString)
    $connection.Open()
    
    # Execute SQL
    $command = $connection.CreateCommand()
    $command.CommandText = $sqlContent
    $command.ExecuteNonQuery() | Out-Null
    
    $connection.Close()
    
    Write-Host "Column data_hora_fim added successfully!" -ForegroundColor Green
    
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
    exit 1
}
