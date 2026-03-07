$ErrorActionPreference = "Stop"
$ROOT = $PSScriptRoot

# Ensure Azure CLI is in PATH
$azDir = "C:\Program Files\Microsoft SDKs\Azure\CLI2\wbin"
if ($env:PATH -notlike "*$azDir*") {
    $env:PATH = "$azDir;$env:PATH"
}

Write-Host "=== 1/4 Building Angular ===" -ForegroundColor Cyan
Set-Location "$ROOT\src\pet-owner-client"
npx ng build --configuration production
if ($LASTEXITCODE -ne 0) { throw "Angular build failed" }

Write-Host "=== 2/4 Publishing .NET ===" -ForegroundColor Cyan
Set-Location $ROOT
if (Test-Path "publish") { Remove-Item "publish" -Recurse -Force }
dotnet publish src\PetOwner.Api -c Release -o publish --runtime linux-x64 --self-contained false
if ($LASTEXITCODE -ne 0) { throw ".NET publish failed" }

Write-Host "=== 3/4 Creating deploy.zip ===" -ForegroundColor Cyan
Copy-Item "src\pet-owner-client\dist\pet-owner-client\browser\*" "publish\wwwroot\" -Recurse -Force
if (Test-Path "deploy.zip") { Remove-Item "deploy.zip" -Force }
Add-Type -Assembly "System.IO.Compression"
$zs = [System.IO.File]::Create("$ROOT\deploy.zip")
$ar = New-Object System.IO.Compression.ZipArchive($zs, [System.IO.Compression.ZipArchiveMode]::Create)
$pd = "$ROOT\publish"
Get-ChildItem $pd -Recurse -File | ForEach-Object {
    $rp = $_.FullName.Substring($pd.Length + 1).Replace('\', '/')
    $e = $ar.CreateEntry($rp, [System.IO.Compression.CompressionLevel]::Optimal)
    $es = $e.Open()
    $fs = [System.IO.File]::OpenRead($_.FullName)
    $fs.CopyTo($es)
    $fs.Dispose()
    $es.Dispose()
}
$ar.Dispose()
$zs.Dispose()

Write-Host "=== 4/4 Deploying to Azure ===" -ForegroundColor Cyan
az webapp deployment source config-zip --resource-group rg-petowner --name petowner-app --src "deploy.zip" -o json --query "properties.status"
if ($LASTEXITCODE -ne 0) { throw "Azure deploy failed" }

Write-Host ""
Write-Host "DONE! Live at https://petowner-app.azurewebsites.net" -ForegroundColor Green
Set-Location $ROOT
