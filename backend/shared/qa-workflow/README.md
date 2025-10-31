# QA Workflow Modules

This directory contains modules for the automated QA workflow orchestration.

## Modules

### workItemFetcher.js

Fetches work items from Azure Boards that are ready for testing.

**Functions:**
- `fetchWorkItemsReadyForTesting(orgUrl, projectName, pat, statusFilters, priorityThreshold)`
  - Fetches work items with specified status or high-priority bugs
  - Returns array of work item objects with full details

### testGenerator.js

Generates exploratory test scenarios and Playwright test scripts using AI.

**Functions:**
- `generateExploratoryScenarios(workItem)`
  - Generates 3-5 exploratory test scenarios
  - Returns array of scenario strings
  
- `generatePlaywrightTestScript(workItem, scenarios)`
  - Generates Playwright test script for most critical scenario
  - Returns JavaScript test code as string

### teamsNotifier.js

Sends formatted notifications to Microsoft Teams.

**Functions:**
- `notifyTeams(workItem, scenarios, testResults, evidenceUrls, webhookUrl)`
  - Sends comprehensive Teams notification
  - Includes work item details, scenarios, test results, and evidence links

- `formatTeamsMessage(workItem, scenarios, testResults, evidenceUrls)`
  - Formats Teams message card structure
  - Returns message card object

## Usage

These modules are used by the `orchestrateQA` Azure Function to automate the QA workflow.

## Environment Variables

Required:
- `AZURE_DEVOPS_ORG_URL`
- `AZURE_DEVOPS_PROJECT`
- `AZURE_DEVOPS_PAT`
- `OPENAI_API_KEY` or `AZURE_OPENAI_API_KEY`
- `AZURE_OPENAI_ENDPOINT` (if using Azure OpenAI)
- `TEAMS_WEBHOOK_URL`

Optional:
- `STORAGE_CONTAINER_NAME` (default: test-scripts)
- `RESULTS_CONTAINER_NAME` (default: test-results)
- `TEST_EXECUTION_QUEUE_NAME` (default: test-execution-queue)
- `CREATE_BUGS_FOR_FAILURES` (default: false)
- `BASE_URL` (default: http://localhost:3000)

## License

ISC
