# ============================================================
# PetOwner — Azure Resource Setup (FREE Tier)
# Run this once to create all Azure resources.
# Prerequisites: Azure CLI installed, logged in (az login)
# ============================================================

# ---------- Variables (edit these) ----------
$RESOURCE_GROUP = "rg-petowner"
$LOCATION       = "westeurope"
$APP_NAME       = "petowner-app"           # must be globally unique
$SQL_SERVER     = "petowner-sql"           # must be globally unique
$SQL_DB         = "PetOwner"
$SQL_ADMIN      = "petowneradmin"
$SQL_PASSWORD   = Read-Host -Prompt "Enter SQL admin password" -AsSecureString
$SQL_PASSWORD_PLAIN = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($SQL_PASSWORD))

# ---------- 1. Resource Group ----------
Write-Host "`n[1/6] Creating resource group..." -ForegroundColor Cyan
az group create --name $RESOURCE_GROUP --location $LOCATION

# ---------- 2. App Service Plan (FREE F1) ----------
Write-Host "`n[2/6] Creating App Service Plan (F1 Free)..." -ForegroundColor Cyan
az appservice plan create `
    --name "${APP_NAME}-plan" `
    --resource-group $RESOURCE_GROUP `
    --sku F1 `
    --is-linux

# ---------- 3. Web App (.NET 8) ----------
Write-Host "`n[3/6] Creating Web App..." -ForegroundColor Cyan
az webapp create `
    --name $APP_NAME `
    --resource-group $RESOURCE_GROUP `
    --plan "${APP_NAME}-plan" `
    --runtime "DOTNETCORE:8.0"

# ---------- 4. SQL Server ----------
Write-Host "`n[4/6] Creating SQL Server..." -ForegroundColor Cyan
az sql server create `
    --name $SQL_SERVER `
    --resource-group $RESOURCE_GROUP `
    --location $LOCATION `
    --admin-user $SQL_ADMIN `
    --admin-password $SQL_PASSWORD_PLAIN

# Allow Azure services to access the SQL server
az sql server firewall-rule create `
    --resource-group $RESOURCE_GROUP `
    --server $SQL_SERVER `
    --name "AllowAzureServices" `
    --start-ip-address 0.0.0.0 `
    --end-ip-address 0.0.0.0

# ---------- 5. SQL Database (FREE Offer) ----------
Write-Host "`n[5/6] Creating SQL Database (Free Offer - Serverless)..." -ForegroundColor Cyan
az sql db create `
    --resource-group $RESOURCE_GROUP `
    --server $SQL_SERVER `
    --name $SQL_DB `
    --edition GeneralPurpose `
    --family Gen5 `
    --capacity 2 `
    --compute-model Serverless `
    --auto-pause-delay 60 `
    --min-capacity 0.5 `
    --use-free-limit `
    --free-limit-exhaustion-behavior AutoPause `
    --backup-storage-redundancy Local `
    --zone-redundant false

# ---------- 6. Set Connection String on App Service ----------
Write-Host "`n[6/6] Configuring connection string..." -ForegroundColor Cyan
$CONN_STRING = "Server=tcp:${SQL_SERVER}.database.windows.net,1433;Initial Catalog=${SQL_DB};Persist Security Info=False;User ID=${SQL_ADMIN};Password=${SQL_PASSWORD_PLAIN};MultipleActiveResultSets=False;Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;"

az webapp config connection-string set `
    --resource-group $RESOURCE_GROUP `
    --name $APP_NAME `
    --settings DefaultConnection=$CONN_STRING `
    --connection-string-type SQLAzure

Write-Host "`n Done! Resources created." -ForegroundColor Green
Write-Host "App URL: https://${APP_NAME}.azurewebsites.net" -ForegroundColor Yellow
Write-Host "`nNext step: run deploy\publish.ps1 to build and deploy the app." -ForegroundColor Yellow
