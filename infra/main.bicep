// Main Bicep Template for QA Agent Infrastructure
// Deploys Storage Account, Function App, Container Registry, and Consumption Plan

@description('The name of the resource group where resources will be deployed')
param resourceGroupName string = resourceGroup().name

@description('The location for all resources')
param location string = resourceGroup().location

@description('The name prefix for all resources (must be globally unique)')
param namePrefix string = 'qaagent'

@description('The environment name (e.g., dev, staging, prod)')
param environment string = 'dev'

@description('Azure Functions runtime version')
param functionRuntimeVersion string = '~4'

@description('Node.js version for Function App')
param nodeVersion string = '20'

@description('Storage account SKU')
param storageAccountSku string = 'Standard_LRS'

@description('Storage account kind')
param storageAccountKind string = 'StorageV2'

@description('Container Registry SKU')
param containerRegistrySku string = 'Basic'

@description('Enable Application Insights')
param enableApplicationInsights bool = true

@description('Application Insights instrumentation key (optional)')
param appInsightsInstrumentationKey string = ''

// Generate unique resource names
var storageAccountName = '${namePrefix}storage${environment}'
var functionAppName = '${namePrefix}func${environment}'
var appServicePlanName = '${namePrefix}plan${environment}'
var containerRegistryName = '${toLower(namePrefix)}acr${environment}'
var appInsightsName = '${namePrefix}insights${environment}'
var applicationInsightsComponentName = '${namePrefix}appinsights${environment}'

// Storage Account for queues and blobs
resource storageAccount 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: storageAccountName
  location: location
  kind: storageAccountKind
  sku: {
    name: storageAccountSku
  }
  properties: {
    supportsHttpsTrafficOnly: true
    minimumTlsVersion: 'TLS1_2'
    allowBlobPublicAccess: false
    accessTier: 'Hot'
  }
}

// Storage Account Blob Service
resource blobService 'Microsoft.Storage/storageAccounts/blobServices@2023-01-01' = {
  parent: storageAccount
  name: 'default'
  properties: {
    deleteRetentionPolicy: {
      enabled: true
      days: 7
    }
    containerDeleteRetentionPolicy: {
      enabled: true
      days: 7
    }
  }
}

// Storage Account Queue Service
resource queueService 'Microsoft.Storage/storageAccounts/queueServices@2023-01-01' = {
  parent: storageAccount
  name: 'default'
}

// Container Registry for Playwright runner images
resource containerRegistry 'Microsoft.ContainerRegistry/registries@2023-07-01' = {
  name: containerRegistryName
  location: location
  sku: {
    name: containerRegistrySku
  }
  properties: {
    adminUserEnabled: true
    publicNetworkAccess: 'Enabled'
  }
}

// Application Insights for monitoring
resource applicationInsights 'Microsoft.Insights/components@2020-02-02' = if (enableApplicationInsights) {
  name: applicationInsightsComponentName
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
    Request_Source: 'rest'
    IngestionMode: 'ApplicationInsights'
  }
}

// App Service Plan (Consumption Plan for Azure Functions)
resource appServicePlan 'Microsoft.Web/serverfarms@2022-09-01' = {
  name: appServicePlanName
  location: location
  kind: 'functionapp'
  sku: {
    name: 'Y1'
    tier: 'Dynamic'
  }
  properties: {
    reserved: true
  }
}

// Function App
resource functionApp 'Microsoft.Web/sites@2022-09-01' = {
  name: functionAppName
  location: location
  kind: 'functionapp'
  properties: {
    serverFarmId: appServicePlan.id
    siteConfig: {
      appSettings: [
        {
          name: 'AzureWebJobsStorage'
          value: 'DefaultEndpointsProtocol=https;AccountName=${storageAccount.name};AccountKey=${storageAccount.listKeys().keys[0].value};EndpointSuffix=${environment().suffixes.storage}'
        }
        {
          name: 'WEBSITE_CONTENTAZUREFILECONNECTIONSTRING'
          value: 'DefaultEndpointsProtocol=https;AccountName=${storageAccount.name};AccountKey=${storageAccount.listKeys().keys[0].value};EndpointSuffix=${environment().suffixes.storage}'
        }
        {
          name: 'WEBSITE_CONTENTSHARE'
          value: toLower(functionAppName)
        }
        {
          name: 'FUNCTIONS_EXTENSION_VERSION'
          value: functionRuntimeVersion
        }
        {
          name: 'FUNCTIONS_WORKER_RUNTIME'
          value: 'node'
        }
        {
          name: 'WEBSITE_NODE_DEFAULT_VERSION'
          value: '~${nodeVersion}'
        }
        {
          name: 'AZURE_STORAGE_CONNECTION_STRING'
          value: 'DefaultEndpointsProtocol=https;AccountName=${storageAccount.name};AccountKey=${storageAccount.listKeys().keys[0].value};EndpointSuffix=${environment().suffixes.storage}'
        }
        {
          name: 'STORAGE_CONTAINER_NAME'
          value: 'test-scripts'
        }
        {
          name: 'RESULTS_CONTAINER_NAME'
          value: 'test-results'
        }
        {
          name: 'QA_JOBS_QUEUE_NAME'
          value: 'test-generation-queue'
        }
        {
          name: 'JOB_STATUS_QUEUE_NAME'
          value: 'job-status-queue'
        }
        {
          name: 'PLAYWRIGHT_DOCKER_IMAGE'
          value: 'mcr.microsoft.com/playwright/python:v1.40.0'
        }
        {
          name: 'WORK_ITEM_STATUS'
          value: 'Ready for Testing'
        }
        {
          name: 'APPINSIGHTS_INSTRUMENTATIONKEY'
          value: enableApplicationInsights ? applicationInsights.properties.InstrumentationKey : ''
        }
        {
          name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
          value: enableApplicationInsights ? applicationInsights.properties.ConnectionString : ''
        }
      ]
      use32BitWorkerProcess: false
      linuxFxVersion: 'NODE|${nodeVersion}'
      http20Enabled: true
      minTlsVersion: '1.2'
      ftpsState: 'Disabled'
      alwaysOn: false
    }
    httpsOnly: true
    clientAffinityEnabled: false
  }
  identity: {
    type: 'SystemAssigned'
  }
}

// Storage Account Blob Containers
// Test scripts container
resource testScriptsContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-01-01' = {
  parent: blobService
  name: 'test-scripts'
  properties: {
    publicAccess: 'None'
    metadata: {
      description: 'Container for storing generated test scripts'
    }
  }
}

// Test results container
resource testResultsContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-01-01' = {
  parent: blobService
  name: 'test-results'
  properties: {
    publicAccess: 'None'
    metadata: {
      description: 'Container for storing test execution results'
    }
  }
}

// Storage Account Queues
// Test generation queue
resource testGenerationQueue 'Microsoft.Storage/storageAccounts/queueServices/queues@2023-01-01' = {
  parent: queueService
  name: 'test-generation-queue'
  properties: {
    metadata: {
      description: 'Queue for work items ready for test generation'
    }
  }
}

// Test execution queue
resource testExecutionQueue 'Microsoft.Storage/storageAccounts/queueServices/queues@2023-01-01' = {
  parent: queueService
  name: 'test-execution-queue'
  properties: {
    metadata: {
      description: 'Queue for test execution jobs'
    }
  }
}

// Job status queue
resource jobStatusQueue 'Microsoft.Storage/storageAccounts/queueServices/queues@2023-01-01' = {
  parent: queueService
  name: 'job-status-queue'
  properties: {
    metadata: {
      description: 'Queue for job status updates'
    }
  }
}

// Outputs
output storageAccountName string = storageAccount.name
output storageAccountConnectionString string = 'DefaultEndpointsProtocol=https;AccountName=${storageAccount.name};AccountKey=${storageAccount.listKeys().keys[0].value};EndpointSuffix=${environment().suffixes.storage}'
output functionAppName string = functionApp.name
output functionAppUrl string = 'https://${functionApp.properties.defaultHostName}'
output containerRegistryName string = containerRegistry.name
output containerRegistryLoginServer string = containerRegistry.properties.loginServer
output appServicePlanName string = appServicePlan.name
output applicationInsightsInstrumentationKey string = enableApplicationInsights ? applicationInsights.properties.InstrumentationKey : ''
output applicationInsightsConnectionString string = enableApplicationInsights ? applicationInsights.properties.ConnectionString : ''
