Set-Location "D:\Lomba\privai"

Write-Host "Cleaning PrivAI runtime files..." -ForegroundColor Yellow

$paths = @(
    "backend\storage\privai.db",
    "backend\storage\*.sqlite",
    "backend\storage\*.sqlite3",
    "backend\storage\operational_zone\redacted\*",
    "backend\storage\operational_zone\metadata\*",
    "backend\storage\sovereign_vault\encrypted_original\*",
    "backend\storage\sovereign_vault\metadata\*",
    "backend\storage\sovereign_vault\keys_simulated\*",
    "backend\storage\user_zone\trusted_vault_keys\*",
    "backend\storage\audit\*",
    "backend\storage\config\runtime_policy.json"
)

foreach ($path in $paths) {
    Remove-Item $path -Force -Recurse -ErrorAction SilentlyContinue
}

Write-Host "Runtime files cleaned. Folder structure is preserved by .gitkeep files." -ForegroundColor Green
Write-Host "Restart backend to regenerate database and vault keypair." -ForegroundColor Cyan
