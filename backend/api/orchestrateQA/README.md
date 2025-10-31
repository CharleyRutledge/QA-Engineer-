# QA Workflow Orchestration Function

This Azure Function orchestrates the complete automated QA workflow.

## Overview

The function runs on a schedule (default: weekdays at 9 AM) and:

1. Fetches work items from Azure Boards with status "Ready for Testing" or high-priority bugs
2. For each work item:
   - Generates 3-5 exploratory test scenarios using AI
   - Generates Playwright automated test script for the most critical scenario
   - Stores scripts in Azure Blob Storage
   - Enqueues test execution jobs
3. Captures test results (pass/fail, logs, screenshots, timestamps)
4. Sends Teams notifications to stakeholders
5. Optionally creates bugs in Azure Boards for failures
6. Provides daily summary

## Output Format

The function returns a JSON structure suitable for Azure Functions processing:

```json
{
  "timestamp": "2024-01-01T09:00:00Z",
  "workItemsProcessed": 5,
  "testsPassed": 4,
  "testsFailed": 1,
  "exploratoryScenariosGenerated": 15,
  "highPriorityFailures": [
    {
      "workItemId": "1234",
      "title": "Feature title",
      "testResults": {
        "status": "fail",
        "summary": { "total": 5, "passed": 3, "failed": 2 }
      }
    }
  ],
  "results": [
    {
      "workItemId": "1234",
      "title": "User can reset password",
      "exploratoryScenarios": [
        "Test password reset with invalid email format",
        "Test password reset with non-existent email",
        "Test password reset link expiration",
        "Test password reset with weak new password"
      ],
      "automatedTestScripts": [
        "https://storageaccount.blob.core.windows.net/test-scripts/test123/test.spec.js"
      ],
      "testResults": {
        "status": "pass",
        "logs": "https://storageaccount.blob.core.windows.net/test-results/test123/logs/test.log",
        "screenshots": [
          "https://storageaccount.blob.core.windows.net/test-results/test123/screenshots/screenshot1.png"
        ]
      },
      "evidenceURLs": [
        "https://storageaccount.blob.core.windows.net/test-results/test123/screenshots/screenshot1.png",
        "https://storageaccount.blob.core.windows.net/test-results/test123/logs/test.log"
      ],
      "teamsNotifications": [
        "https://teams.webhook.url"
      ],
      "bugCreated": false
    }
  ]
}
```

## Configuration

### Environment Variables

**Required:**
- `AZURE_DEVOPS_ORG_URL` - Azure DevOps organization URL
- `AZURE_DEVOPS_PROJECT` - Project name
- `AZURE_DEVOPS_PAT` - Personal Access Token
- `AZURE_STORAGE_CONNECTION_STRING` - Storage connection string
- `OPENAI_API_KEY` or `AZURE_OPENAI_API_KEY` - OpenAI API key
- `TEAMS_WEBHOOK_URL` - Teams webhook URL for notifications

**Optional:**
- `STORAGE_CONTAINER_NAME` - Container for test scripts (default: test-scripts)
- `RESULTS_CONTAINER_NAME` - Container for results (default: test-results)
- `TEST_EXECUTION_QUEUE_NAME` - Queue name (default: test-execution-queue)
- `CREATE_BUGS_FOR_FAILURES` - Create bugs for failures (default: false)
- `BASE_URL` - Application base URL for tests
- `AZURE_OPENAI_ENDPOINT` - Azure OpenAI endpoint
- `AZURE_OPENAI_MODEL` - Model name (default: gpt-4)

### Schedule

Modify the schedule in `function.json`:

```json
{
  "schedule": "0 0 9 * * 1-5"  // Weekdays at 9 AM
}
```

Cron format:
- `0 0 9 * * 1-5` - Weekdays at 9 AM
- `0 */6 * * *` - Every 6 hours
- `0 0 * * *` - Daily at midnight

## Workflow Steps

### 1. Fetch Work Items

Queries Azure Boards for:
- Work items with status "Ready for Testing"
- Bugs with priority <= 1 (high priority)

### 2. Generate Test Scenarios

Uses AI to generate 3-5 exploratory test scenarios focusing on:
- Edge cases
- Risk-based testing
- Boundary conditions
- Error handling

### 3. Generate Playwright Scripts

Creates automated test scripts for the most critical scenario with:
- Screenshot capture
- Console logging
- Proper assertions
- Error handling

### 4. Execute Tests

Test execution is handled asynchronously by the `runTests` function:
- Scripts are enqueued to test-execution-queue
- Tests run in Docker Playwright container
- Results stored in blob storage

### 5. Send Notifications

Teams notifications include:
- Work item summary
- Exploratory scenarios
- Test results
- Evidence links (screenshots, logs)
- Action buttons to view work items and evidence

### 6. Create Bugs (Optional)

If `CREATE_BUGS_FOR_FAILURES=true`:
- Creates bug in Azure Boards for failed tests
- Includes test evidence links
- Tags with "Automated-Test-Failure"

## Teams Notification Format

Notifications are sent as Teams message cards with:
- Color-coded status (green for pass, red for fail)
- Work item details
- Test summary
- Evidence links as clickable buttons
- Link to original work item

## Integration with Other Functions

This function integrates with:
- `fetchWorkItems` - Can trigger manual work item fetching
- `generateTests` - Uses similar test generation logic
- `runTests` - Enqueues test execution jobs
- `jobStatus` - Can query test results

## Monitoring

Monitor the function via:
- Application Insights (if enabled)
- Function App logs
- Teams notifications
- Daily summary reports

## Troubleshooting

### No Work Items Found

- Verify Azure DevOps PAT has correct permissions
- Check work item status values match exactly
- Verify project name is correct

### Test Generation Fails

- Verify OpenAI API key is valid
- Check API quota/limits
- Verify model name is available

### Teams Notifications Not Sent

- Verify webhook URL is correct
- Check webhook is not expired
- Verify Teams connector permissions

### Tests Not Executing

- Verify test-execution-queue exists
- Check runTests function is running
- Verify Docker/container configuration

## License

ISC
