/**
 * QA Workflow Orchestration Function
 * 
 * Orchestrates the complete QA workflow:
 * 1. Fetches work items from Azure Boards
 * 2. Generates exploratory scenarios and Playwright tests
 * 3. Executes tests in Docker runner
 * 4. Captures results and evidence
 * 5. Sends Teams notifications
 * 6. Optionally creates bugs for failures
 * 
 * Output: JSON structure suitable for Azure Functions processing
 */

const { v4: uuidv4 } = require('uuid');
const storageHelper = require('../../shared/storage');
const queueHelper = require('../../shared/queue');
const teamsHelper = require('../../shared/teams');
const workItemFetcher = require('../../shared/qa-workflow/workItemFetcher');
const testGenerator = require('../../shared/qa-workflow/testGenerator');
const teamsNotifier = require('../../shared/qa-workflow/teamsNotifier');

/**
 * Processes a single work item through the QA workflow
 * @param {Object} workItem - Work item to process
 * @param {Object} context - Azure Functions context
 * @returns {Promise<Object>} Processed work item result
 */
async function processWorkItem(workItem, context) {
  const testId = uuidv4();
  const result = {
    workItemId: workItem.workItemId,
    title: workItem.title,
    exploratoryScenarios: [],
    automatedTestScripts: [],
    testResults: {
      status: 'unknown',
      logs: null,
      screenshots: []
    },
    evidenceURLs: [],
    teamsNotifications: [],
    bugCreated: false
  };

  try {
    context.log(`Processing work item: ${workItem.workItemId} - ${workItem.title}`);

    // Step 1: Generate exploratory scenarios
    context.log('Generating exploratory scenarios...');
    const scenarios = await testGenerator.generateExploratoryScenarios(workItem);
    result.exploratoryScenarios = scenarios;
    context.log(`Generated ${scenarios.length} exploratory scenarios`);

    // Step 2: Generate Playwright test script
    context.log('Generating Playwright test script...');
    const testScript = await testGenerator.generatePlaywrightTestScript(workItem, scenarios);
    
    // Step 3: Store test script in blob storage
    const scriptBlobName = `${testId}/test.spec.js`;
    const scriptContainerName = process.env.STORAGE_CONTAINER_NAME || 'test-scripts';
    
    const scriptUploadResult = await storageHelper.uploadBlob(
      scriptContainerName,
      scriptBlobName,
      Buffer.from(testScript, 'utf8'),
      {
        contentType: 'application/javascript',
        metadata: {
          testId: testId,
          workItemId: workItem.workItemId,
          generatedAt: new Date().toISOString()
        }
      }
    );
    
    result.automatedTestScripts.push(scriptUploadResult.url);
    context.log(`Test script stored: ${scriptUploadResult.url}`);

    // Step 4: Enqueue test execution job
    context.log('Enqueuing test execution...');
    const executionQueueName = process.env.TEST_EXECUTION_QUEUE_NAME || 'test-execution-queue';
    await queueHelper.enqueueMessage(executionQueueName, {
      testId: testId,
      workItemId: workItem.workItemId,
      scriptBlobName: scriptBlobName,
      containerName: scriptContainerName,
      title: workItem.title,
      url: workItem.url
    });

    // Step 5: Wait for test execution (in production, this would be async)
    // For now, we'll simulate or use a polling mechanism
    context.log('Test execution enqueued. Results will be processed asynchronously.');

    // Step 6: Send Teams notification (with available data)
    const teamsWebhookUrl = process.env.TEAMS_WEBHOOK_URL;
    if (teamsWebhookUrl) {
      try {
        const notificationResult = await teamsNotifier.notifyTeams(
          workItem,
          scenarios,
          { status: 'pending', summary: null },
          [scriptUploadResult.url],
          teamsWebhookUrl
        );
        result.teamsNotifications.push(teamsWebhookUrl);
        context.log('Teams notification sent');
      } catch (error) {
        context.log.warn(`Failed to send Teams notification: ${error.message}`);
      }
    }

    // Note: Test execution results would be processed by the runTests function
    // and updates would be sent via the job-status-queue

    return result;

  } catch (error) {
    context.log.error(`Error processing work item ${workItem.workItemId}: ${error.message}`);
    result.testResults.status = 'error';
    result.testResults.error = error.message;
    return result;
  }
}

/**
 * Retrieves test results for a test ID
 * @param {string} testId - Test ID
 * @returns {Promise<Object>} Test results
 */
async function getTestResults(testId) {
  const resultsContainerName = process.env.RESULTS_CONTAINER_NAME || 'test-results';
  
  try {
    const summaryBlobName = `${testId}/summary.json`;
    const summary = await storageHelper.downloadBlobAsJson(resultsContainerName, summaryBlobName);
    
    // Collect evidence URLs
    const evidenceUrls = [];
    
    if (summary.screenshots) {
      summary.screenshots.forEach(s => evidenceUrls.push(s.url));
    }
    if (summary.logs) {
      summary.logs.forEach(l => evidenceUrls.push(l.url));
    }
    if (summary.reports) {
      summary.reports.forEach(r => evidenceUrls.push(r.url));
    }
    if (summary.summaryBlobUrl) {
      evidenceUrls.push(summary.summaryBlobUrl);
    }

    return {
      status: summary.status || 'unknown',
      summary: summary.summary || null,
      evidenceUrls: evidenceUrls,
      executedAt: summary.executedAt || null
    };
  } catch (error) {
    return {
      status: 'not_found',
      summary: null,
      evidenceUrls: [],
      executedAt: null
    };
  }
}

/**
 * Creates bug in Azure Boards for failed tests
 * @param {Object} workItem - Original work item
 * @param {Object} testResults - Test results
 * @param {Array} evidenceUrls - Evidence URLs
 * @returns {Promise<Object>} Created bug object
 */
async function createBugForFailure(workItem, testResults, evidenceUrls) {
  const bugDescription = `Bug created from automated test failure.

Original Work Item: ${workItem.workItemId} - ${workItem.title}
Test Status: ${testResults.status}

Test Summary:
- Total: ${testResults.summary?.total || 0}
- Passed: ${testResults.summary?.passed || 0}
- Failed: ${testResults.summary?.failed || 0}

Evidence:
${evidenceUrls.map((url, i) => `${i + 1}. ${url}`).join('\n')}

Please review the test evidence and fix the issues.`;

  try {
    const bugData = {
      title: `Test Failure: ${workItem.title}`,
      description: bugDescription,
      priority: '1',
      severity: '2',
      tags: ['Automated-Test-Failure', `WI-${workItem.workItemId}`]
    };

    const bug = await teamsHelper.createBug(bugData);
    return bug;
  } catch (error) {
    throw new Error(`Failed to create bug: ${error.message}`);
  }
}

/**
 * Main Azure Function entry point
 * @param {Object} context - Azure Functions context
 * @param {Object} timer - Timer trigger object
 */
module.exports = async function (context, timer) {
  const startTime = Date.now();
  context.log('QA Workflow Orchestration started');

  const dailySummary = {
    timestamp: new Date().toISOString(),
    workItemsProcessed: 0,
    testsPassed: 0,
    testsFailed: 0,
    exploratoryScenariosGenerated: 0,
    highPriorityFailures: [],
    results: []
  };

  try {
    // Get configuration
    const orgUrl = process.env.AZURE_DEVOPS_ORG_URL;
    const projectName = process.env.AZURE_DEVOPS_PROJECT;
    const pat = process.env.AZURE_DEVOPS_PAT;
    const teamsWebhookUrl = process.env.TEAMS_WEBHOOK_URL;
    const createBugsForFailures = process.env.CREATE_BUGS_FOR_FAILURES === 'true';

    if (!orgUrl || !projectName || !pat) {
      throw new Error('Azure DevOps configuration is required');
    }

    // Step 1: Fetch work items ready for testing
    context.log('Fetching work items from Azure Boards...');
    const workItems = await workItemFetcher.fetchWorkItemsReadyForTesting(
      orgUrl,
      projectName,
      pat,
      ['Ready for Testing'],
      1 // High priority bugs (priority <= 1)
    );

    context.log(`Found ${workItems.length} work items ready for testing`);

    if (workItems.length === 0) {
      context.log('No work items to process');
      return dailySummary;
    }

    // Step 2: Process each work item
    for (const workItem of workItems) {
      try {
        const result = await processWorkItem(workItem, context);
        dailySummary.results.push(result);
        dailySummary.workItemsProcessed++;
        dailySummary.exploratoryScenariosGenerated += result.exploratoryScenarios.length;

        // If test results are available, update summary
        if (result.testResults && result.testResults.status !== 'unknown') {
          if (result.testResults.status === 'pass') {
            dailySummary.testsPassed++;
          } else if (result.testResults.status === 'fail') {
            dailySummary.testsFailed++;
            if (workItem.priority <= 2) {
              dailySummary.highPriorityFailures.push({
                workItemId: workItem.workItemId,
                title: workItem.title,
                testResults: result.testResults
              });
            }

            // Create bug if configured
            if (createBugsForFailures && result.evidenceURLs.length > 0) {
              try {
                const bug = await createBugForFailure(workItem, result.testResults, result.evidenceURLs);
                result.bugCreated = true;
                result.bugId = bug.id;
                context.log(`Created bug ${bug.id} for failed test`);
              } catch (error) {
                context.log.warn(`Failed to create bug: ${error.message}`);
              }
            }
          }
        }
      } catch (error) {
        context.log.error(`Failed to process work item ${workItem.workItemId}: ${error.message}`);
      }
    }

    // Step 3: Send daily summary to Teams
    if (teamsWebhookUrl && dailySummary.workItemsProcessed > 0) {
      try {
        const summaryCard = {
          '@type': 'MessageCard',
          '@context': 'https://schema.org/extensions',
          summary: `Daily QA Summary: ${dailySummary.workItemsProcessed} work items processed`,
          themeColor: dailySummary.testsFailed > 0 ? 'dc3545' : '28a745',
          title: 'Daily QA Workflow Summary',
          sections: [
            {
              facts: [
                { name: 'Work Items Processed', value: dailySummary.workItemsProcessed.toString() },
                { name: 'Tests Passed', value: dailySummary.testsPassed.toString() },
                { name: 'Tests Failed', value: dailySummary.testsFailed.toString() },
                { name: 'Exploratory Scenarios Generated', value: dailySummary.exploratoryScenariosGenerated.toString() }
              ]
            }
          ]
        };

        if (dailySummary.highPriorityFailures.length > 0) {
          summaryCard.sections.push({
            title: 'High Priority Failures',
            text: dailySummary.highPriorityFailures.map(f => 
              `- #${f.workItemId}: ${f.title}`
            ).join('\n')
          });
        }

        await teamsNotifier.sendTeamsNotification(teamsWebhookUrl, summaryCard);
        context.log('Daily summary sent to Teams');
      } catch (error) {
        context.log.warn(`Failed to send daily summary: ${error.message}`);
      }
    }

    context.log(`QA Workflow completed. Processed ${dailySummary.workItemsProcessed} work items`);

    return dailySummary;

  } catch (error) {
    context.log.error(`Error in QA Workflow Orchestration: ${error.message}`);
    context.log.error(error.stack);
    
    dailySummary.error = error.message;
    return dailySummary;
  }
};
