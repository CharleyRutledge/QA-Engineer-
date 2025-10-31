# QA Agent Backend

Azure Functions backend for automated test generation and execution using OpenAI/Azure OpenAI and Playwright.

## Architecture

The system consists of four main Azure Functions and shared utilities:

1. **fetchWorkItems** - Fetches work items from Azure Boards and enqueues them
2. **generateTests** - Generates Playwright test scripts using AI
3. **runTests** - Executes tests in Docker containers
4. **jobStatus** - Retrieves test execution status and results

## Shared Utilities

Located in `backend/shared/`:

- **queue.js** - Azure Storage Queue helper for enqueueing jobs
- **storage.js** - Azure Blob Storage helper for file operations
- **teams.js** - Microsoft Teams notifications and Azure DevOps bug creation

## Azure Functions

### 1. fetchWorkItems

**Trigger**: Timer (every 30 minutes)

**Purpose**: Fetches work items from Azure Boards with status "Ready for Testing" and enqueues them for test generation.

**Queue**: `test-generation-queue` (configurable via `QA_JOBS_QUEUE_NAME`)

**Environment Variables**:
- `AZURE_DEVOPS_ORG_URL` - Azure DevOps organization URL
- `AZURE_DEVOPS_PROJECT` - Project name
- `AZURE_DEVOPS_PAT` - Personal Access Token
- `AZURE_STORAGE_CONNECTION_STRING` - Storage connection string
- `QA_JOBS_QUEUE_NAME` - Queue name (default: `test-generation-queue`)
- `WORK_ITEM_STATUS` - Status filter (default: `Ready for Testing`)
- `WORK_ITEM_TYPES` - Comma-separated work item types (optional)

### 2. generateTests

**Trigger**: Queue (`test-generation-queue`)

**Purpose**: Generates Playwright test scripts and exploratory scenarios using OpenAI/Azure OpenAI.

**Input Queue Message**:
```json
{
  "workItemId": "12345",
  "title": "Feature Title",
  "description": "Feature Description",
  "url": "https://example.com",
  "metadata": {}
}
```

**Output**: JSON with testId, scenarios, and script blob URL

**Environment Variables**:
- `AZURE_STORAGE_CONNECTION_STRING` - Storage connection string
- `OPENAI_API_KEY` or `AZURE_OPENAI_API_KEY` - OpenAI API key
- `AZURE_OPENAI_ENDPOINT` - Azure OpenAI endpoint (if using Azure OpenAI)
- `AZURE_OPENAI_MODEL` or `OPENAI_MODEL` - Model name (default: `gpt-4`)
- `STORAGE_CONTAINER_NAME` - Container for test scripts (default: `test-scripts`)

**Output Queue**: Enqueues to `test-execution-queue` (configurable)

### 3. runTests

**Trigger**: Queue (`test-execution-queue`)

**Purpose**: Executes Playwright tests in Docker containers and stores results.

**Input Queue Message**:
```json
{
  "testId": "uuid",
  "scriptBlobName": "testId/test.spec.js",
  "containerName": "test-scripts",
  "workItemId": "12345"
}
```

**Output**: JSON with test results, screenshots, logs, and reports

**Environment Variables**:
- `AZURE_STORAGE_CONNECTION_STRING` - Storage connection string
- `PLAYWRIGHT_DOCKER_IMAGE` - Docker image (default: `mcr.microsoft.com/playwright/python:v1.40.0`)
- `RESULTS_CONTAINER_NAME` - Container for results (default: `test-results`)
- `JOB_STATUS_QUEUE_NAME` - Queue for status updates (optional)

**Prerequisites**: Docker must be available in the Azure Functions environment

### 4. jobStatus

**Trigger**: HTTP GET

**Purpose**: Retrieves test execution status and results from blob storage.

**Endpoint**: `GET /api/jobStatus?testId={testId}`

**Response**: JSON with status, summary, evidence URLs, and timestamps

**Environment Variables**:
- `AZURE_STORAGE_CONNECTION_STRING` - Storage connection string
- `RESULTS_CONTAINER_NAME` - Container name (default: `test-results`)

## Workflow

1. **fetchWorkItems** runs on a schedule (every 30 minutes)
2. Queries Azure Boards for work items with status "Ready for Testing"
3. Enqueues each work item to `test-generation-queue`
4. **generateTests** processes each queue message:
   - Downloads work item details
   - Generates Playwright test script using AI
   - Generates exploratory test scenarios
   - Uploads test script to blob storage
   - Enqueues test execution job to `test-execution-queue`
5. **runTests** processes each test execution job:
   - Downloads test script from blob storage
   - Executes tests in Docker container
   - Captures screenshots, logs, and reports
   - Uploads results to blob storage
   - Updates job status (optional)
6. **jobStatus** provides HTTP endpoint to query test results

## Blob Storage Structure

```
test-scripts/
  {testId}/
    test.spec.js

test-results/
  {testId}/
    summary.json
    screenshots/
      screenshot.png
    logs/
      test.log
    reports/
      report.json
      report.html
```

## Queue Structure

### test-generation-queue
Work items ready for test generation

### test-execution-queue
Test execution jobs with script references

### job-status-queue (optional)
Status updates for test executions

## Installation

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables in Azure Functions app settings

3. Deploy Azure Functions:
```bash
func azure functionapp publish <function-app-name>
```

## Environment Variables Summary

### Required
- `AZURE_STORAGE_CONNECTION_STRING` - Azure Storage connection string
- `AZURE_DEVOPS_ORG_URL` - Azure DevOps organization URL
- `AZURE_DEVOPS_PROJECT` - Azure DevOps project name
- `AZURE_DEVOPS_PAT` - Azure DevOps Personal Access Token
- `OPENAI_API_KEY` or `AZURE_OPENAI_API_KEY` - OpenAI API key

### Optional
- `AZURE_OPENAI_ENDPOINT` - Azure OpenAI endpoint
- `AZURE_OPENAI_MODEL` - Model name (default: `gpt-4`)
- `QA_JOBS_QUEUE_NAME` - QA jobs queue name (default: `test-generation-queue`)
- `STORAGE_CONTAINER_NAME` - Test scripts container (default: `test-scripts`)
- `RESULTS_CONTAINER_NAME` - Test results container (default: `test-results`)
- `PLAYWRIGHT_DOCKER_IMAGE` - Docker image for Playwright
- `WORK_ITEM_STATUS` - Work item status filter (default: `Ready for Testing`)
- `WORK_ITEM_TYPES` - Comma-separated work item types

## Azure DevOps PAT Permissions

The Personal Access Token requires:
- **Work Items**: Read
- **Project and Team**: Read

## Docker Requirements

The `runTests` function requires Docker to be available. Options:
- Use Azure Container Instances
- Use a container-enabled Azure Functions environment
- Modify `dockerHelper.js` to use Azure Container Instances API

## Testing

### Manual Queue Trigger

To manually trigger test generation, enqueue a message to `test-generation-queue`:

```json
{
  "workItemId": "12345",
  "title": "Test Feature",
  "description": "Test Description",
  "url": "https://example.com"
}
```

### Query Test Status

```bash
curl "https://<function-app>.azurewebsites.net/api/jobStatus?testId=<test-id>"
```

## Error Handling

All functions include comprehensive error handling:
- Queue processing errors are logged and tracked
- Blob storage errors are handled gracefully
- API errors include detailed error messages
- Failed operations are logged with context

## Logging

All functions use Azure Functions context logging:
- Info logs for normal operations
- Warning logs for recoverable errors
- Error logs for failures with stack traces

## License

ISC
