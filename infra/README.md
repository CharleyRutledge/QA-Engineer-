# Azure Infrastructure Deployment

This directory contains Azure Bicep templates for deploying the QA Agent infrastructure.

## Prerequisites

- Azure CLI installed and configured
- Azure subscription with appropriate permissions
- Bicep CLI (included with Azure CLI 2.20.0+)
- Contributor or Owner role on the target subscription

## Architecture

The infrastructure includes:

- **Storage Account**: For Azure Storage Queues and Blob Storage
  - Queues: test-generation-queue, test-execution-queue, job-status-queue
  - Containers: test-scripts, test-results

- **Function App**: Azure Functions for backend APIs
  - Consumption Plan (serverless)
  - Node.js 20 runtime
  - Application Insights integration

- **Container Registry**: Azure Container Registry for Playwright runner images
  - Basic SKU (can be upgraded to Standard/Premium)

- **Application Insights**: Monitoring and logging for Function App

## Files

- **main.bicep**: Main infrastructure template
- **parameters.json**: Default parameter values
- **README.md**: This file

## Deployment Steps

### 1. Login to Azure

```bash
az login
az account set --subscription "Your Subscription Name or ID"
```

### 2. Create Resource Group

```bash
az group create \
  --name rg-qa-agent-dev \
  --location eastus
```

### 3. Review Parameters

Edit `parameters.json` to customize:
- Resource group name
- Location
- Name prefix (must be globally unique)
- Environment name
- Storage account SKU
- Container Registry SKU

### 4. Validate Deployment

Validate the Bicep template before deploying:

```bash
az deployment group validate \
  --resource-group rg-qa-agent-dev \
  --template-file main.bicep \
  --parameters @parameters.json
```

### 5. Deploy Infrastructure

Deploy the infrastructure:

```bash
az deployment group create \
  --resource-group rg-qa-agent-dev \
  --template-file main.bicep \
  --parameters @parameters.json \
  --name qa-agent-deployment
```

### 6. Get Deployment Outputs

After deployment, retrieve output values:

```bash
az deployment group show \
  --resource-group rg-qa-agent-dev \
  --name qa-agent-deployment \
  --query properties.outputs
```

Or get individual outputs:

```bash
# Storage account name
az deployment group show \
  --resource-group rg-qa-agent-dev \
  --name qa-agent-deployment \
  --query properties.outputs.storageAccountName.value

# Function App URL
az deployment group show \
  --resource-group rg-qa-agent-dev \
  --name qa-agent-deployment \
  --query properties.outputs.functionAppUrl.value
```

## Post-Deployment Configuration

### 1. Configure Function App Environment Variables

Set Azure DevOps and OpenAI credentials:

```bash
# Get Function App name from outputs
FUNCTION_APP_NAME=$(az deployment group show \
  --resource-group rg-qa-agent-dev \
  --name qa-agent-deployment \
  --query properties.outputs.functionAppName.value -o tsv)

# Set Azure DevOps configuration
az functionapp config appsettings set \
  --resource-group rg-qa-agent-dev \
  --name $FUNCTION_APP_NAME \
  --settings \
    AZURE_DEVOPS_ORG_URL="https://dev.azure.com/yourorg" \
    AZURE_DEVOPS_PROJECT="YourProject" \
    AZURE_DEVOPS_PAT="your-pat-token"

# Set OpenAI configuration
az functionapp config appsettings set \
  --resource-group rg-qa-agent-dev \
  --name $FUNCTION_APP_NAME \
  --settings \
    OPENAI_API_KEY="your-openai-key" \
    AZURE_OPENAI_ENDPOINT="https://your-resource.openai.azure.com" \
    AZURE_OPENAI_MODEL="gpt-4"
```

### 2. Build and Push Playwright Runner Image

```bash
# Get Container Registry name from outputs
ACR_NAME=$(az deployment group show \
  --resource-group rg-qa-agent-dev \
  --name qa-agent-deployment \
  --query properties.outputs.containerRegistryName.value -o tsv)

# Login to ACR
az acr login --name $ACR_NAME

# Build and push runner image
cd ../runner
az acr build --registry $ACR_NAME --image playwright-runner:latest .
```

### 3. Deploy Function App Code

```bash
# Get Function App name
FUNCTION_APP_NAME=$(az deployment group show \
  --resource-group rg-qa-agent-dev \
  --name qa-agent-deployment \
  --query properties.outputs.functionAppName.value -o tsv)

# Deploy Function App code
cd ../backend
func azure functionapp publish $FUNCTION_APP_NAME
```

## Parameters Reference

| Parameter | Description | Default |
|-----------|-------------|---------|
| resourceGroupName | Resource group name | rg-qa-agent-dev |
| location | Azure region | eastus |
| namePrefix | Prefix for resource names | qaagent |
| environment | Environment name | dev |
| functionRuntimeVersion | Functions runtime version | ~4 |
| nodeVersion | Node.js version | 20 |
| storageAccountSku | Storage account SKU | Standard_LRS |
| storageAccountKind | Storage account kind | StorageV2 |
| containerRegistrySku | ACR SKU | Basic |
| enableApplicationInsights | Enable App Insights | true |

## Outputs

After deployment, the following outputs are available:

- `storageAccountName`: Storage account name
- `storageAccountConnectionString`: Storage account connection string
- `functionAppName`: Function App name
- `functionAppUrl`: Function App URL
- `containerRegistryName`: Container Registry name
- `containerRegistryLoginServer`: ACR login server
- `appServicePlanName`: App Service Plan name
- `applicationInsightsInstrumentationKey`: App Insights key
- `applicationInsightsConnectionString`: App Insights connection string

## Resource Naming

Resources are named using the pattern: `{namePrefix}{resourceType}{environment}`

Example with default values:
- Storage Account: `qaagentstoragedev`
- Function App: `qaagentfuncdev`
- Container Registry: `qaagentacrdev`
- App Service Plan: `qaagentplandev`

## Cost Considerations

- **Consumption Plan**: Pay-per-execution, suitable for low-to-medium traffic
- **Storage Account**: Standard_LRS is cost-effective for development
- **Container Registry**: Basic SKU is sufficient for development
- **Application Insights**: Pay-as-you-go pricing

For production, consider:
- Premium Storage Account SKU for better performance
- Standard or Premium Container Registry for better performance
- Monitor Function App execution costs

## Updating Infrastructure

To update existing infrastructure:

```bash
az deployment group create \
  --resource-group rg-qa-agent-dev \
  --template-file main.bicep \
  --parameters @parameters.json \
  --name qa-agent-update
```

## Cleanup

To delete all resources:

```bash
az group delete --name rg-qa-agent-dev --yes --no-wait
```

## Troubleshooting

### Deployment Fails with Name Already Exists

- Change the `namePrefix` parameter to a unique value
- Storage account names must be globally unique (3-24 characters, lowercase)
- Container Registry names must be globally unique (5-50 characters, alphanumeric)

### Function App Deployment Fails

- Ensure Node.js 20 is supported in your region
- Check that the Function App name is available
- Verify storage account was created successfully

### Container Registry Access Issues

- Ensure admin user is enabled (set in template)
- Use `az acr login` to authenticate
- Check network access settings if using private endpoints

## Security Considerations

- Storage account connection strings are stored in Function App settings
- Consider using Key Vault references for sensitive values
- Enable HTTPS only on storage account
- Use managed identity where possible
- Limit public access to storage containers

## License

ISC
