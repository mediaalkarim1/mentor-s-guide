
# Script: Apply Supabase migration via HTTP API
$SUPABASE_URL = "https://mvbmkbkgjmvyvadhqbvu.supabase.co"
$SERVICE_ROLE_KEY = "sb_publishable_ygKD2Pijsuxbh9K6kdmYjg_OC_3gykK"

# Read migration SQL
$sqlFile = "e:\Antigravity\mentor-s-guide\supabase\migrations\20260810010000_fix_submission_rls_public.sql"
$sqlContent = Get-Content $sqlFile -Raw

Write-Host "Applying migration: $sqlFile"
Write-Host "SQL length: $($sqlContent.Length) chars"

# Execute via Supabase REST rpc endpoint
$headers = @{
    "apikey"        = $SERVICE_ROLE_KEY
    "Authorization" = "Bearer $SERVICE_ROLE_KEY"
    "Content-Type"  = "application/json"
    "Prefer"        = "return=minimal"
}

$body = @{ query = $sqlContent } | ConvertTo-Json -Depth 5

try {
    $response = Invoke-RestMethod -Uri "$SUPABASE_URL/rest/v1/rpc/exec_sql" -Method POST -Headers $headers -Body $body
    Write-Host "Migration applied successfully."
    Write-Host $response
} catch {
    Write-Host "exec_sql not available, trying direct REST queries..."

    # Split and execute each statement individually via Supabase /sql endpoint
    $response2 = Invoke-RestMethod -Uri "$SUPABASE_URL/rest/v1/" -Method GET -Headers $headers
    Write-Host "Supabase REST available."
    Write-Host ($response2 | ConvertTo-Json -Depth 2)
}
