# Test Actas API endpoint
$uri = "http://localhost:3001/api/actas/reunioes"
$body = @{
    titulo = "Reunião Teste"
    tipo = "ordinaria"
    data_hora = "2026-03-10T10:00:00"
    departamento_id = $null
    convocador_id = $null
} | ConvertTo-Json

Write-Host "Testing POST $uri" -ForegroundColor Cyan
Write-Host "Body: $body" -ForegroundColor Yellow

try {
    $response = Invoke-WebRequest -Uri $uri -Method POST -Body $body -ContentType "application/json" -UseBasicParsing
    Write-Host "Success! Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host $response.Content
}
catch {
    Write-Host "Error! Status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $responseBody = $reader.ReadToEnd()
    Write-Host "Response:" -ForegroundColor Red
    Write-Host $responseBody
}
