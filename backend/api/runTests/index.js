/**
 * Azure Function: Run Tests
 * 
 * Triggered by Azure Storage Queue messages.
 * Executes Playwright tests in Docker containers and stores results.
 * 
 * Queue Message Format:
 * {
 *   "testId": "string",
 *   "scriptBlobUrl": "string",
 *   "scriptBlobName": "string",
 *   "containerName": "string",
 *   "workItemId": "string (optional)",
 *   "options": {} (optional)
 * }
 * 
 * Environment Variables Required:
 * - AZURE_STORAGE_CONNECTION_STRING: Azure Storage connection string
 * - PLAYWRIGHT_DOCKER_IMAGE: Docker image for Playwright (default: mcr.microsoft.com/playwright/python:v1.40.0)
 * - RESULTS_CONTAINER_NAME: Container name for storing test results (default: test-results)
 * - JOB_STATUS_QUEUE_NAME: Queue name for job status updates (optional)
 */

const { v4: uuidv4 } = require('uuid');
const fs = require('fs').promises;
const path = require('path');
const storageHelper = require('../../shared/storage');
const queueHelper = require('../../shared/queue');
const dockerHelper = require('./dockerHelper');

/**
 * Updates job status in queue
 * @param {string} queueName - Queue name for status updates
 * @param {Object} statusData - Status data to enqueue
 */
async function updateJobStatus(queueName, statusData) {
  if (!queueName) {
    return; // Skip if queue name not configured
  }

  try {
    await queueHelper.enqueueMessage(queueName, statusData);
  } catch (error) {
    // Log error but don't fail the function
    console.error(`Failed to update job status: ${error.message}`);
  }
}

/**
 * Collects test results from results directory
 * @param {string} resultsPath - Path to results directory
 * @returns {Promise<Object>} Collected results with screenshots, logs, and status
 */
async function collectTestResults(resultsPath) {
  const results = {
    screenshots: [],
    logs: [],
    reports: [],
    status: 'unknown',
    summary: null
  };

  try {
    const files = await fs.readdir(resultsPath, { withFileTypes: true });

    for (const file of files) {
      const filePath = path.join(resultsPath, file.name);

      if (file.isDirectory()) {
        // Recursively process subdirectories
        const subResults = await collectTestResults(filePath);
        results.screenshots.push(...subResults.screenshots);
        results.logs.push(...subResults.logs);
        results.reports.push(...subResults.reports);
      } else {
        const ext = path.extname(file.name).toLowerCase();
        const fileName = file.name.toLowerCase();

        // Collect screenshots
        if (ext === '.png' || ext === '.jpg' || ext === '.jpeg' || fileName.includes('screenshot')) {
          const content = await fs.readFile(filePath);
          results.screenshots.push({
            name: file.name,
            path: filePath,
            size: content.length,
            content: content
          });
        }
        // Collect logs
        else if (ext === '.log' || ext === '.txt' || fileName.includes('log')) {
          const content = await fs.readFile(filePath, 'utf8');
          results.logs.push({
            name: file.name,
            path: filePath,
            content: content
          });
        }
        // Collect reports (JSON, HTML)
        else if (ext === '.json' || ext === '.html') {
          const content = ext === '.json' 
            ? JSON.parse(await fs.readFile(filePath, 'utf8'))
            : await fs.readFile(filePath, 'utf8');
          
          results.reports.push({
            name: file.name,
            path: filePath,
            type: ext === '.json' ? 'json' : 'html',
            content: content
          });

          // Extract status from JSON report
          if (ext === '.json' && content.stats) {
            results.status = content.stats.failed > 0 ? 'failed' : 
                           content.stats.passed > 0 ? 'passed' : 'unknown';
            results.summary = {
              total: content.stats.total || 0,
              passed: content.stats.passed || 0,
              failed: content.stats.failed || 0,
              skipped: content.stats.skipped || 0,
              duration: content.stats.duration || 0
            };
          }
        }
      }
    }
  } catch (error) {
    console.error(`Error collecting test results: ${error.message}`);
  }

  return results;
}

/**
 * Uploads test results to blob storage
 * @param {string} testId - Test ID
 * @param {Object} testResults - Test results object
 * @param {string} containerName - Container name for results
 * @returns {Promise<Object>} Upload results with URLs
 */
async function uploadTestResults(testId, testResults, containerName) {
  const uploadResults = {
    screenshots: [],
    logs: [],
    reports: [],
    summaryBlobUrl: null
  };

  try {
    // Upload screenshots
    for (const screenshot of testResults.screenshots) {
      const blobName = `${testId}/screenshots/${screenshot.name}`;
      const result = await storageHelper.uploadBlob(
        containerName,
        blobName,
        screenshot.content,
        {
          contentType: 'image/png',
          metadata: {
            testId: testId,
            uploadedAt: new Date().toISOString()
          }
        }
      );
      uploadResults.screenshots.push({
        name: screenshot.name,
        url: result.url,
        blobName: blobName
      });
    }

    // Upload logs
    for (const log of testResults.logs) {
      const blobName = `${testId}/logs/${log.name}`;
      const result = await storageHelper.uploadBlob(
        containerName,
        blobName,
        Buffer.from(log.content, 'utf8'),
        {
          contentType: 'text/plain',
          metadata: {
            testId: testId,
            uploadedAt: new Date().toISOString()
          }
        }
      );
      uploadResults.logs.push({
        name: log.name,
        url: result.url,
        blobName: blobName
      });
    }

    // Upload reports
    for (const report of testResults.reports) {
      const blobName = `${testId}/reports/${report.name}`;
      const contentType = report.type === 'json' ? 'application/json' : 'text/html';
      const content = report.type === 'json' 
        ? Buffer.from(JSON.stringify(report.content, null, 2), 'utf8')
        : Buffer.from(report.content, 'utf8');

      const result = await storageHelper.uploadBlob(
        containerName,
        blobName,
        content,
        {
          contentType: contentType,
          metadata: {
            testId: testId,
            uploadedAt: new Date().toISOString()
          }
        }
      );
      uploadResults.reports.push({
        name: report.name,
        url: result.url,
        blobName: blobName,
        type: report.type
      });
    }

    // Upload summary
    const summary = {
      testId: testId,
      status: testResults.status,
      summary: testResults.summary,
      screenshots: uploadResults.screenshots.map(s => ({ name: s.name, url: s.url })),
      logs: uploadResults.logs.map(l => ({ name: l.name, url: l.url })),
      reports: uploadResults.reports.map(r => ({ name: r.name, url: r.url, type: r.type })),
      executedAt: new Date().toISOString()
    };

    const summaryBlobName = `${testId}/summary.json`;
    const summaryResult = await storageHelper.uploadBlob(
      containerName,
      summaryBlobName,
      Buffer.from(JSON.stringify(summary, null, 2), 'utf8'),
      {
        contentType: 'application/json',
        metadata: {
          testId: testId,
          uploadedAt: new Date().toISOString()
        }
      }
    );

    uploadResults.summaryBlobUrl = summaryResult.url;

    return uploadResults;
  } catch (error) {
    throw new Error(`Failed to upload test results: ${error.message}`);
  }
}

/**
 * Main Azure Function entry point
 * @param {Object} context - Azure Functions context
 * @param {Object} queueItem - Queue message item
 */
module.exports = async function (context, queueItem) {
  const startTime = Date.now();
  context.log('RunTests function triggered');

  let testId = null;
  let workItemId = null;

  try {
    // Validate queue item
    if (!queueItem) {
      throw new Error('Queue item is required');
    }

    testId = queueItem.testId || queueItem.id || uuidv4();
    workItemId = queueItem.workItemId || null;
    const scriptBlobUrl = queueItem.scriptBlobUrl;
    const scriptBlobName = queueItem.scriptBlobName;
    const scriptContainerName = queueItem.containerName || 'test-scripts';
    const resultsContainerName = process.env.RESULTS_CONTAINER_NAME || 'test-results';
    const statusQueueName = process.env.JOB_STATUS_QUEUE_NAME || '';

    context.log(`Processing test execution. Test ID: ${testId}`);

    // Update status: started
    if (statusQueueName) {
      await updateJobStatus(statusQueueName, {
        testId: testId,
        workItemId: workItemId,
        status: 'started',
        timestamp: new Date().toISOString()
      });
    }

    // Download test script from blob storage
    if (!scriptBlobName && !scriptBlobUrl) {
      throw new Error('Either scriptBlobName or scriptBlobUrl is required');
    }

    context.log(`Downloading test script from blob storage...`);
    let testScriptContent;

    if (scriptBlobName) {
      testScriptContent = await storageHelper.downloadBlobAsString(
        scriptContainerName,
        scriptBlobName
      );
    } else {
      // Extract container and blob name from URL if needed
      // For now, assume scriptBlobName is provided
      throw new Error('scriptBlobName is required when scriptBlobUrl is provided');
    }

    context.log(`Test script downloaded, length: ${testScriptContent.length} characters`);

    // Execute tests in Docker container
    context.log('Executing tests in Docker container...');
    const dockerImage = process.env.PLAYWRIGHT_DOCKER_IMAGE || 'mcr.microsoft.com/playwright/python:v1.40.0';
    
    const executionOptions = {
      testScriptContent: testScriptContent,
      containerImage: dockerImage,
      testFileName: 'test.spec.js',
      envVars: {
        ...queueItem.options?.envVars,
        TEST_ID: testId,
        WORK_ITEM_ID: workItemId || ''
      }
    };

    const executionResult = await dockerHelper.runTestsWithMount(executionOptions);

    context.log(`Test execution completed with exit code: ${executionResult.exitCode}`);
    context.log(`Results path: ${executionResult.resultsPath}`);

    // Collect test results
    context.log('Collecting test results...');
    const testResults = await collectTestResults(executionResult.resultsPath);

    // Determine final status
    let finalStatus = testResults.status;
    if (finalStatus === 'unknown') {
      finalStatus = executionResult.exitCode === 0 ? 'passed' : 'failed';
    }

    context.log(`Test status: ${finalStatus}`);
    if (testResults.summary) {
      context.log(`Summary: ${testResults.summary.passed} passed, ${testResults.summary.failed} failed, ${testResults.summary.skipped} skipped`);
    }

    // Upload results to blob storage
    context.log('Uploading test results to blob storage...');
    const uploadResults = await uploadTestResults(testId, testResults, resultsContainerName);

    context.log(`Uploaded ${uploadResults.screenshots.length} screenshots, ${uploadResults.logs.length} logs, ${uploadResults.reports.length} reports`);

    // Update status: completed
    if (statusQueueName) {
      await updateJobStatus(statusQueueName, {
        testId: testId,
        workItemId: workItemId,
        status: finalStatus,
        summary: testResults.summary,
        summaryBlobUrl: uploadResults.summaryBlobUrl,
        timestamp: new Date().toISOString(),
        executionTimeMs: Date.now() - startTime
      });
    }

    // Prepare response
    const response = {
      testId: testId,
      workItemId: workItemId,
      status: finalStatus,
      summary: testResults.summary,
      exitCode: executionResult.exitCode,
      screenshots: uploadResults.screenshots,
      logs: uploadResults.logs,
      reports: uploadResults.reports,
      summaryBlobUrl: uploadResults.summaryBlobUrl,
      executedAt: new Date().toISOString(),
      executionTimeMs: Date.now() - startTime
    };

    context.log(`Test execution completed successfully. Test ID: ${testId}, Status: ${finalStatus}`);

    return response;

  } catch (error) {
    context.log.error(`Error in RunTests function: ${error.message}`);
    context.log.error(error.stack);

    // Update status: failed
    if (statusQueueName && testId) {
      await updateJobStatus(statusQueueName, {
        testId: testId,
        workItemId: workItemId,
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }

    // Return error response
    return {
      error: true,
      message: error.message,
      testId: testId || uuidv4(),
      workItemId: workItemId,
      executedAt: new Date().toISOString()
    };
  }
};
