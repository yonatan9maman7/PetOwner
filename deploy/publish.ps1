# ============================================================
# PetOwner — Build & Deploy to Azure
# Run this after azure-setup.ps1 to deploy the app.
# ============================================================

$APP_NAME       = "petowner-app"
$RESOURCE_GROUP = "rg-petowner"
$ROOT           = Split-Path $PSScriptRoot -Parent

Write-Host "[1/4] Building Angular for production..." -ForegroundColor Cyan
Set-Location "$ROOT\src\pet-owner-client"
npx ng build --configuration production

Write-Host "`n[2/4] Copying Angular output to API wwwroot..." -ForegroundColor Cyan
$angularDist = "$ROOT\src\pet-owner-client\dist\pet-owner-client\browser"
$wwwroot     = "$ROOT\src\PetOwner.Api\wwwroot"

if (Test-Path $wwwroot) { Remove-Item $wwwroot -Recurse -Force }
Copy-Item -Path $angularDist -Destination $wwwroot -Recurse

Write-Host "`n[3/4] Publishing .NET app..." -ForegroundColor Cyan
Set-Location $ROOT
$publishDir = "$ROOT\publish"
if (Test-Path $publishDir) { Remove-Item $publishDir -Recurse -Force }
dotnet publish src\PetOwner.Api -c Release -o $publishDir

Write-Host "`n[4/4] Deploying to Azure..." -ForegroundColor Cyan
Compress-Archive -Path "$publishDir\*" -DestinationPath "$publishDir\deploy.zip" -Force
az webapp deploy `
    --resource-group $RESOURCE_GROUP `
    --name $APP_NAME `
    --src-path "$publishDir\deploy.zip" `
    --type zip

Write-Host "`n Deployed!" -ForegroundColor Green
Write-Host "Live at: https://${APP_NAME}.azurewebsites.net" -ForegroundColor Yellow
Write-Host "Wizard:  https://${APP_NAME}.azurewebsites.net/register" -ForegroundColor Yellow
