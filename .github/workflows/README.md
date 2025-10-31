# GitHub Actions Workflows

This directory contains GitHub Actions workflows for CI/CD automation.

## Workflows

### deploy.yml

Main CI/CD pipeline that:
1. Runs CI tests using the runner container
2. Deploys infrastructure via Bicep templates
3. Builds and pushes Docker runner image to Azure Container Registry
4. Publishes Azure Functions to Function App
5. Verifies deployment

## Prerequisites

### Required GitHub Secrets

Configure the following secrets in your GitHub repository settings:

#### Azure Credentials
- `AZURE_CREDENTIALS`: Azure service principal credentials (JSON)
  ```json
  {
    "clientId": "xxx",
    "clientSecret": "xxx",
    "subscriptionId": "xxx",
    "tenantId": "xxx"
  }
  ```

#### Azure Resource Configuration
- `AZURE_RG_NAME`: Azure Resource Group name (e.g., `rg-qa-agent-dev`)

#### Azure DevOps Configuration
- `AZURE_DEVOPS_ORG_URL`: Azure DevOps organization URL (e.g., `https://dev.azure.com/yourorg`)
- `AZURE_DEVOPS_PROJECT`: Azure DevOps project name
- `AZURE_DEVOPS_PAT`: Azure DevOps Personal Access Token

#### OpenAI Configuration
- `OPENAI_API_KEY`: OpenAI API key (if using OpenAI)
- `AZURE_OPENAI_API_KEY`: Azure OpenAI API key (if using Azure OpenAI)
- `AZURE_OPENAI_ENDPOINT`: Azure OpenAI endpoint URL
- `AZURE_OPENAI_MODEL`: Model name (default: `gpt-4`)

#### Optional Configuration
- `QA_JOBS_QUEUE_NAME`: Queue name (default: `test-generation-queue`)
- `STORAGE_CONTAINER_NAME`: Container name (default: `test-scripts`)
- `RESULTS_CONTAINER_NAME`: Container name (default: `test-results`)
- `JOB_STATUS_QUEUE_NAME`: Queue name (default: `job-status-queue`)
- `WORK_ITEM_STATUS`: Work item status filter (default: `Ready for Testing`)
- `PLAYWRIGHT_DOCKER_IMAGE`: Docker image (default: Playwright official image)

## Creating Azure Service Principal

To create the service principal for `AZURE_CREDENTIALS`:

```bash
# Login to Azure
az login

# Create service principal
az ad sp create-for-rbac --name "github-actions-qa-agent" \
  --role contributor \
  --scopes /subscriptions/{subscription-id}/resourceGroups/{resource-group-name} \
  --sdk-auth
```

Copy the JSON output and add it as the `AZURE_CREDENTIALS` secret.

## Workflow Triggers

The workflow triggers on:
- Push to `main` branch
- Pull requests to `main` branch
- Manual workflow dispatch (with environment selection)

## Workflow Stages

### 1. CI Tests
- Checks out code
- Installs dependencies
- Runs linting
- Builds runner Docker image
- Runs Playwright tests in container
- Sets test results output

### 2. Deploy Infrastructure
- Validates Bicep template
- Deploys infrastructure via Azure Bicep
- Configures Function App environment variables
- Only runs if CI tests pass

### 3. Build and Push Docker Image
- Logs into Azure Container Registry
- Builds Playwright runner image
- Pushes image with `latest` and commit SHA tags
- Only runs if CI tests pass

### 4. Deploy Function App
- Installs Azure Functions Core Tools
- Installs backend dependencies
- Publishes Function App code
- Verifies deployment
- Only runs if CI tests pass

### 5. Verify Deployment
- Verifies Function App is running
- Verifies Container Registry has images
- Creates deployment summary

## Environment Protection

The workflow uses GitHub Environments for deployment:
- `dev`: Development environment
- `staging`: Staging environment (if configured)
- `prod`: Production environment (if configured)

You can configure environment protection rules in GitHub repository settings:
- Required reviewers
- Wait timer
- Deployment branches

## Manual Deployment

To manually trigger deployment:

1. Go to Actions tab in GitHub
2. Select "CI/CD Pipeline"
3. Click "Run workflow"
4. Select environment (dev/staging/prod)
5. Click "Run workflow"

## Troubleshooting

### Tests Fail

- Check test output in CI Tests job
- Verify Docker image builds correctly
- Ensure test files exist in runner directory

### Infrastructure Deployment Fails

- Verify Azure credentials are correct
- Check resource group exists
- Validate Bicep template locally first
- Check for name conflicts (storage account, ACR names must be unique)

### Docker Build Fails

- Verify Dockerfile syntax
- Check base image availability
- Ensure ACR exists and credentials are correct

### Function App Deployment Fails

- Verify Function App exists (created by infrastructure deployment)
- Check Node.js version compatibility
- Ensure all dependencies are in package.json
- Verify Azure Functions Core Tools version

### Permission Errors

- Ensure service principal has Contributor role
- Verify ACR admin user is enabled
- Check Function App deployment permissions

## Best Practices

1. **Never commit secrets**: Use GitHub Secrets for all sensitive values
2. **Test locally first**: Run tests and validate deployments locally before pushing
3. **Use branch protection**: Protect main branch and require PR reviews
4. **Monitor deployments**: Set up alerts for failed deployments
5. **Version images**: Use commit SHA for image tagging
6. **Clean up**: Remove old images from ACR periodically

## Customization

### Adding More Test Stages

Add additional test steps in the `ci-tests` job:

```yaml
- name: Run custom tests
  run: |
    # Your test commands
```

### Changing Deployment Environments

Modify the `environment` trigger input or add more environment-specific jobs.

### Adding Notification

Add notification steps using GitHub Actions or third-party integrations:

```yaml
- name: Notify on deployment
  uses: 8398a7/action-slack@v3
  with:
    status: ${{ job.status }}
    text: 'Deployment completed'
```

## License

ISC
