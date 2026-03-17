@description('Azure region for all resources.')
param location string = resourceGroup().location

@description('Base name for resource naming.')
param prefix string = 'digitalbarnfinds'

@description('Admin token shared by web, API, and worker.')
@secure()
param adminToken string

@description('NextAuth secret used by the web app.')
@secure()
param nextAuthSecret string = ''

@description('Google OAuth client id.')
@secure()
param googleClientId string = ''

@description('Google OAuth client secret.')
@secure()
param googleClientSecret string = ''

@description('Disable auth in the first deployment so the admin UI is accessible before OAuth is configured.')
param authDisabled bool = true

@description('Comma separated admin email allowlist.')
param adminAllowlist string = 'hjwurl@gmail.com,michael.ruggiero@gmail.com'

@description('PostgreSQL admin login name.')
param postgresAdminLogin string = 'dbfadmin'

@description('PostgreSQL admin password.')
@secure()
param postgresAdminPassword string

var appServicePlanName = '${prefix}-plan'
var webAppName = '${prefix}-web'
var apiAppName = '${prefix}-api'
var functionAppName = '${prefix}-worker'
var storageAccountName = 'dbf${take(uniqueString(resourceGroup().id, prefix), 20)}'
var postgresServerName = '${prefix}-psql'
var postgresDbName = 'digital_barn_finds'
var webHostName = '${webAppName}.azurewebsites.net'
var apiHostName = '${apiAppName}.azurewebsites.net'

resource plan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: appServicePlanName
  location: location
  sku: {
    name: 'B1'
    tier: 'Basic'
  }
  kind: 'linux'
  properties: {
    reserved: true
  }
}

resource storage 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: storageAccountName
  location: location
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
}

resource postgres 'Microsoft.DBforPostgreSQL/flexibleServers@2024-08-01' = {
  name: postgresServerName
  location: location
  sku: {
    name: 'Standard_B1ms'
    tier: 'Burstable'
  }
  properties: {
    administratorLogin: postgresAdminLogin
    administratorLoginPassword: postgresAdminPassword
    version: '16'
    storage: {
      storageSizeGB: 32
    }
    backup: {
      backupRetentionDays: 7
    }
    network: {
      publicNetworkAccess: 'Enabled'
    }
  }
}

resource postgresDb 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2024-08-01' = {
  parent: postgres
  name: postgresDbName
  properties: {
    charset: 'UTF8'
    collation: 'en_US.utf8'
  }
}

resource postgresAzureFirewallRule 'Microsoft.DBforPostgreSQL/flexibleServers/firewallRules@2024-08-01' = {
  parent: postgres
  name: 'AllowAzureServices'
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '0.0.0.0'
  }
}

resource webApp 'Microsoft.Web/sites@2023-12-01' = {
  name: webAppName
  location: location
  kind: 'app,linux'
  properties: {
    serverFarmId: plan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'NODE|20-lts'
      appCommandLine: 'node apps/web/server.js'
      appSettings: [
        {
          name: 'WEBSITES_PORT'
          value: '3000'
        }
        {
          name: 'SCM_DO_BUILD_DURING_DEPLOYMENT'
          value: 'true'
        }
        {
          name: 'NEXTAUTH_URL'
          value: 'https://${webHostName}'
        }
        {
          name: 'NEXTAUTH_SECRET'
          value: nextAuthSecret
        }
        {
          name: 'AUTH_DISABLED'
          value: authDisabled ? 'true' : 'false'
        }
        {
          name: 'NEXT_PUBLIC_AUTH_DISABLED'
          value: authDisabled ? 'true' : 'false'
        }
        {
          name: 'DEV_AUTH_BYPASS'
          value: authDisabled ? 'true' : 'false'
        }
        {
          name: 'GOOGLE_CLIENT_ID'
          value: googleClientId
        }
        {
          name: 'GOOGLE_CLIENT_SECRET'
          value: googleClientSecret
        }
        {
          name: 'ADMIN_ALLOWLIST'
          value: adminAllowlist
        }
        {
          name: 'API_BASE_URL'
          value: 'https://${apiHostName}'
        }
        {
          name: 'API_ADMIN_TOKEN'
          value: adminToken
        }
      ]
    }
  }
}

resource apiApp 'Microsoft.Web/sites@2023-12-01' = {
  name: apiAppName
  location: location
  kind: 'app,linux'
  properties: {
    serverFarmId: plan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'PYTHON|3.12'
      appCommandLine: 'bash startup.sh'
      appSettings: [
        {
          name: 'SCM_DO_BUILD_DURING_DEPLOYMENT'
          value: 'true'
        }
        {
          name: 'DBF_APP_ENV'
          value: 'production'
        }
        {
          name: 'DBF_DATABASE_URL'
          value: 'postgresql+psycopg://${postgresAdminLogin}:${postgresAdminPassword}@${postgres.name}.postgres.database.azure.com:5432/${postgresDbName}?sslmode=require'
        }
        {
          name: 'DBF_ADMIN_TOKEN'
          value: adminToken
        }
        {
          name: 'DBF_PUBLIC_BASE_URL'
          value: 'https://${apiHostName}'
        }
        {
          name: 'DBF_ALLOWED_ORIGINS'
          value: 'https://${webHostName}'
        }
        {
          name: 'DBF_MEDIA_STORAGE_MODE'
          value: 'azure_blob'
        }
        {
          name: 'DBF_MEDIA_STORAGE_CONNECTION_STRING'
          value: 'DefaultEndpointsProtocol=https;AccountName=${storage.name};AccountKey=${storage.listKeys().keys[0].value};EndpointSuffix=${environment().suffixes.storage}'
        }
        {
          name: 'DBF_MEDIA_STORAGE_CONTAINER'
          value: 'car-media'
        }
        {
          name: 'DBF_BARCHETTA_BASE_URL'
          value: 'https://www.barchetta.cc'
        }
        {
          name: 'DBF_RESPECTFUL_USER_AGENT'
          value: 'DigitalBarnFindsBot/1.0'
        }
      ]
    }
  }
}

resource functionApp 'Microsoft.Web/sites@2023-12-01' = {
  name: functionAppName
  location: location
  kind: 'functionapp,linux'
  properties: {
    serverFarmId: plan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'PYTHON|3.12'
      appSettings: [
        {
          name: 'AzureWebJobsStorage'
          value: 'DefaultEndpointsProtocol=https;AccountName=${storage.name};AccountKey=${storage.listKeys().keys[0].value};EndpointSuffix=${environment().suffixes.storage}'
        }
        {
          name: 'FUNCTIONS_WORKER_RUNTIME'
          value: 'python'
        }
        {
          name: 'SCM_DO_BUILD_DURING_DEPLOYMENT'
          value: 'true'
        }
        {
          name: 'DBF_APP_ENV'
          value: 'production'
        }
        {
          name: 'API_BASE_URL'
          value: 'https://${apiHostName}'
        }
        {
          name: 'API_ADMIN_TOKEN'
          value: adminToken
        }
      ]
    }
  }
}

output webAppName string = webApp.name
output apiAppName string = apiApp.name
output functionAppName string = functionApp.name
output postgresServerName string = postgres.name
