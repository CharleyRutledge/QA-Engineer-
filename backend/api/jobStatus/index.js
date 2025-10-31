/**
 * Azure Function: Job Status
 * 
 * HTTP GET endpoint to retrieve test execution status and results.
 * 
 * Endpoint: GET /api/jobStatus?testId={testId}
 * 
 * Query Parameters:
 * - testId (required): Test ID to retrieve status for
 * 
 * Environment Variables Required:
 * - AZURE_STORAGE_CONNECTION_STRING: Azure Storage connection string
 * - RESULTS_CONTAINER_NAME: Container name for test results (default: test-results)
 * 
 * Response Format:
 * {
 *   "testId": "string",
 *   "workItemId": "string",
 *   "status": "passed|failed|error|unknown",
 *   "summary": {
 *     "total": number,
 *     "passed": number,
 *     "failed": number,
 *     "skipped": number,
 *     "duration": number
 *   },
 *   "evidence": {
 *     "screenshots": [{"name": "string", "url": "string"}],
 *     "logs": [{"name": "string", "url": "string"}],
 *     "reports": [{"name": "string", "url": "string", "type": "json|html"}]
 *   },
 *   "timestamps": {
 *     "executedAt": "ISO timestamp",
 *     "retrievedAt": "ISO timestamp"
 *   },
 *   "summaryBlobUrl": "string"
 * }
 */

const storageHelper = require('../../shared/storage');

/**
 * Retrieves test status summary from blob storage
 * @param {string} testId - Test ID
 * @param {string} containerName - Container name
 * @returns {Promise<Object|null>} Summary object or null if not found
 */
async function getTestSummary(testId, containerName) {
  try {
    const summaryBlobName = `${testId}/summary.json`;
    const summary = await storageHelper.downloadBlobAsJson(containerName, summaryBlobName);
    return summary;
  } catch (error) {
    if (error.message.includes('does not exist')) {
      return null;
    }
    throw error;
  }
}

/**
 * Lists blobs in a specific path prefix
 * @param {string} containerName - Container name
 * @param {string} prefix - Path prefix (e.g., "testId/screenshots/")
 * @returns {Promise<Array>} Array of blob objects with name and URL
 */
async function listBlobsByPrefix(containerName, prefix) {
  try {
    const blobs = await storageHelper.listBlobs(containerName, { prefix });
    
    // Generate URLs for each blob using blob client
    const containerClient = storageHelper.getContainerClient(containerName);
    
    return blobs.map(blob => {
      // Get blob client to generate proper URL
      const blockBlobClient = containerClient.getBlockBlobClient(blob.name);
      
      return {
        name: blob.name.replace(prefix, ''), // Remove prefix from name
        url: blockBlobClient.url,
        size: blob.properties.contentLength,
        lastModified: blob.properties.lastModified
      };
    });
  } catch (error) {
    // If container or path doesn't exist, return empty array
    return [];
  }
}

/**
 * Retrieves all evidence (screenshots, logs, reports) for a test
 * @param {string} testId - Test ID
 * @param {string} containerName - Container name
 * @returns {Promise<Object>} Evidence object with screenshots, logs, and reports
 */
async function getTestEvidence(testId, containerName) {
  const evidence = {
    screenshots: [],
    logs: [],
    reports: []
  };

  try {
    // Get screenshots
    const screenshots = await listBlobsByPrefix(containerName, `${testId}/screenshots/`);
    evidence.screenshots = screenshots.map(blob => ({
      name: blob.name,
      url: blob.url,
      size: blob.size,
      lastModified: blob.lastModified
    }));

    // Get logs
    const logs = await listBlobsByPrefix(containerName, `${testId}/logs/`);
    evidence.logs = logs.map(blob => ({
      name: blob.name,
      url: blob.url,
      size: blob.size,
      lastModified: blob.lastModified
    }));

    // Get reports
    const reports = await listBlobsByPrefix(containerName, `${testId}/reports/`);
    evidence.reports = reports.map(blob => {
      const ext = blob.name.toLowerCase().endsWith('.json') ? 'json' : 'html';
      return {
        name: blob.name,
        url: blob.url,
        type: ext,
        size: blob.size,
        lastModified: blob.lastModified
      };
    });
  } catch (error) {
    // Log error but don't fail - return what we have
    console.error(`Error retrieving evidence: ${error.message}`);
  }

  return evidence;
}

/**
 * Builds the full response object with test status and evidence
 * @param {Object} summary - Summary object from blob storage
 * @param {Object} evidence - Evidence object with screenshots, logs, reports
 * @param {string} testId - Test ID
 * @returns {Object} Complete response object
 */
function buildResponse(summary, evidence, testId) {
  // If summary exists, use it; otherwise create a default structure
  if (summary) {
    return {
      testId: summary.testId || testId,
      workItemId: summary.workItemId || null,
      status: summary.status || 'unknown',
      summary: summary.summary || null,
      evidence: {
        screenshots: summary.screenshots || evidence.screenshots,
        logs: summary.logs || evidence.logs,
        reports: summary.reports || evidence.reports
      },
      timestamps: {
        executedAt: summary.executedAt || null,
        retrievedAt: new Date().toISOString()
      },
      summaryBlobUrl: summary.summaryBlobUrl || null
    };
  }

  // No summary found - return structure indicating test not found or not completed
  return {
    testId: testId,
    workItemId: null,
    status: 'not_found',
    summary: null,
    evidence: evidence,
    timestamps: {
      executedAt: null,
      retrievedAt: new Date().toISOString()
    },
    summaryBlobUrl: null
  };
}

/**
 * Main Azure Function entry point
 * @param {Object} context - Azure Functions context
 * @param {Object} req - HTTP request object
 */
module.exports = async function (context, req) {
  context.log('JobStatus function triggered');

  try {
    // Extract testId from query parameters
    const testId = req.query.testId || req.params.testId;

    if (!testId) {
      context.res = {
        status: 400,
        body: {
          error: true,
          message: 'testId query parameter is required',
          example: '/api/jobStatus?testId=your-test-id'
        },
        headers: {
          'Content-Type': 'application/json'
        }
      };
      return;
    }

    context.log(`Retrieving status for test ID: ${testId}`);

    const containerName = process.env.RESULTS_CONTAINER_NAME || 'test-results';

    // Retrieve test summary from blob storage
    const summary = await getTestSummary(testId, containerName);

    // Retrieve evidence (screenshots, logs, reports)
    const evidence = await getTestEvidence(testId, containerName);

    // Build response
    const response = buildResponse(summary, evidence, testId);

    // Determine HTTP status code
    let httpStatus = 200;
    if (response.status === 'not_found') {
      httpStatus = 404;
    } else if (response.status === 'error') {
      httpStatus = 500;
    }

    context.log(`Status retrieved successfully. Status: ${response.status}, Screenshots: ${response.evidence.screenshots.length}, Logs: ${response.evidence.logs.length}, Reports: ${response.evidence.reports.length}`);

    context.res = {
      status: httpStatus,
      body: response,
      headers: {
        'Content-Type': 'application/json'
      }
    };

  } catch (error) {
    context.log.error(`Error in JobStatus function: ${error.message}`);
    context.log.error(error.stack);

    context.res = {
      status: 500,
      body: {
        error: true,
        message: 'Internal server error while retrieving test status',
        details: error.message
      },
      headers: {
        'Content-Type': 'application/json'
      }
    };
  }
};
