# PowerShell script to run Actas migration
$ServerInstance = "localhost\SQLEXPRESS"
$Database = "DESPESAS"
$SqlFile = "create_actas_tables.sql"

Write-Host "Connecting to SQL Server: $ServerInstance" -ForegroundColor Cyan
Write-Host "Database: $Database" -ForegroundColor Cyan

try {
    # Read the SQL file
    $SqlScript = Get-Content -Path $SqlFile -Raw -Encoding UTF8
    
    # Create connection
    $ConnectionString = "Server=$ServerInstance;Database=$Database;Integrated Security=True;TrustServerCertificate=True;"
    $Connection = New-Object System.Data.SqlClient.SqlConnection
    $Connection.ConnectionString = $ConnectionString
    $Connection.Open()
    
    Write-Host "Connected successfully!" -ForegroundColor Green
    
    # Split by GO statements and execute each batch
    $Batches = $SqlScript -split '\r?\nGO\r?\n'
    
    $BatchNumber = 0
    foreach ($Batch in $Batches) {
        $Batch = $Batch.Trim()
        if ($Batch -ne "") {
            $BatchNumber++
            Write-Host "Executing batch $BatchNumber..." -ForegroundColor Yellow
            
            $Command = New-Object System.Data.SqlClient.SqlCommand
            $Command.Connection = $Connection
            $Command.CommandText = $Batch
            $Command.CommandTimeout = 30
            
            try {
                $Command.ExecuteNonQuery() | Out-Null
                Write-Host "  Batch $BatchNumber executed successfully" -ForegroundColor Green
            }
            catch {
                Write-Host "  Error in batch $BatchNumber : $_" -ForegroundColor Red
            }
        }
    }
    
    # Verify tables were created
    Write-Host "`nVerifying tables..." -ForegroundColor Cyan
    $VerifyQuery = @"
SELECT name, create_date 
FROM sys.tables 
WHERE name IN ('reunioes', 'reunioes_participantes', 'actas', 'actas_acoes')
ORDER BY name
"@
    
    $Command = New-Object System.Data.SqlClient.SqlCommand
    $Command.Connection = $Connection
    $Command.CommandText = $VerifyQuery
    
    $Adapter = New-Object System.Data.SqlClient.SqlDataAdapter $Command
    $DataSet = New-Object System.Data.DataSet
    $Adapter.Fill($DataSet) | Out-Null
    
    if ($DataSet.Tables[0].Rows.Count -eq 4) {
        Write-Host "`n✅ SUCCESS! All 4 tables created:" -ForegroundColor Green
        foreach ($Row in $DataSet.Tables[0].Rows) {
            Write-Host "  - $($Row.name) (created: $($Row.create_date))" -ForegroundColor Green
        }
    }
    else {
        Write-Host "`n⚠️ WARNING: Only $($DataSet.Tables[0].Rows.Count) tables found:" -ForegroundColor Yellow
        foreach ($Row in $DataSet.Tables[0].Rows) {
            Write-Host "  - $($Row.name)" -ForegroundColor Yellow
        }
    }
    
    $Connection.Close()
    Write-Host "`nMigration completed!" -ForegroundColor Cyan
}
catch {
    Write-Host "ERROR: $_" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    if ($Connection.State -eq 'Open') {
        $Connection.Close()
    }
    exit 1
}
