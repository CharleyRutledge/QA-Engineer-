/**
 * Azure Function: Fetch Work Items
 * 
 * Triggered by timer (every 30 minutes by default).
 * Fetches work items from Azure Boards with status "Ready for Testing"
 * and enqueues them in the QA jobs queue.
 * 
 * Environment Variables Required:
 * - AZURE_DEVOPS_ORG_URL: Azure DevOps organization URL (e.g., https://dev.azure.com/orgname)
 * - AZURE_DEVOPS_PROJECT: Azure DevOps project name
 * - AZURE_DEVOPS_PAT: Azure DevOps Personal Access Token
 * - AZURE_STORAGE_CONNECTION_STRING: Azure Storage connection string
 * - QA_JOBS_QUEUE_NAME: Queue name for QA jobs (default: test-generation-queue)
 * 
 * Optional Environment Variables:
 * - WORK_ITEM_STATUS: Status to filter by (default: "Ready for Testing")
 * - WORK_ITEM_TYPES: Comma-separated list of work item types to include (default: all)
 */

const https = require('https');
const { URL } = require('url');
const queueHelper = require('../../shared/queue');

/**
 * Makes an authenticated HTTP request to Azure DevOps API
 * @param {string} apiUrl - Full API URL
 * @param {string} pat - Personal Access Token
 * @param {string} method - HTTP method (default: GET)
 * @param {Object} body - Request body for POST/PATCH (optional)
 * @returns {Promise<Object>} Response object with statusCode and data
 */
function makeAzureDevOpsRequest(apiUrl, pat, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    try {
      const url = new URL(apiUrl);
      const auth = Buffer.from(`:${pat}`).toString('base64');

      const options = {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname + url.search,
        method: method,
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        }
      };

      if (body) {
        const bodyString = JSON.stringify(body);
        options.headers['Content-Length'] = Buffer.byteLength(bodyString);
      }

      const req = https.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              const parsed = data ? JSON.parse(data) : {};
              resolve({
                statusCode: res.statusCode,
                data: parsed
              });
            } catch (parseError) {
              resolve({
                statusCode: res.statusCode,
                data: data
              });
            }
          } else {
            reject(new Error(`Azure DevOps API returned status ${res.statusCode}: ${data}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(new Error(`Request failed: ${error.message}`));
      });

      if (body) {
        req.write(JSON.stringify(body));
      }

      req.end();
    } catch (error) {
      reject(new Error(`Invalid API URL: ${error.message}`));
    }
  });
}

/**
 * Queries work items from Azure Boards using WIQL
 * @param {string} orgUrl - Azure DevOps organization URL
 * @param {string} projectName - Project name
 * @param {string} pat - Personal Access Token
 * @param {string} status - Work item status to filter by
 * @param {Array} workItemTypes - Array of work item types to include (optional)
 * @returns {Promise<Array>} Array of work item IDs
 */
async function queryWorkItemsByStatus(orgUrl, projectName, pat, status, workItemTypes = []) {
  // Build WIQL query
  let wiqlQuery = `SELECT [System.Id] FROM WorkItems WHERE [System.State] = '${status}'`;
  
  if (workItemTypes && workItemTypes.length > 0) {
    const typeFilter = workItemTypes.map(type => `'${type}'`).join(', ');
    wiqlQuery += ` AND [System.WorkItemType] IN (${typeFilter})`;
  }
  
  wiqlQuery += ` ORDER BY [System.ChangedDate] DESC`;

  const apiUrl = `${orgUrl}/${projectName}/_apis/wit/wiql?api-version=6.0`;

  try {
    const response = await makeAzureDevOpsRequest(apiUrl, pat, 'POST', {
      query: wiqlQuery
    });

    // Extract work item IDs from response
    const workItemIds = response.data.workItems.map(item => item.id);
    return workItemIds;
  } catch (error) {
    throw new Error(`Failed to query work items: ${error.message}`);
  }
}

/**
 * Retrieves detailed work item information
 * @param {string} orgUrl - Azure DevOps organization URL
 * @param {string} projectName - Project name
 * @param {string} pat - Personal Access Token
 * @param {Array} workItemIds - Array of work item IDs
 * @returns {Promise<Array>} Array of work item objects
 */
async function getWorkItemDetails(orgUrl, projectName, pat, workItemIds) {
  if (!workItemIds || workItemIds.length === 0) {
    return [];
  }

  // Azure DevOps API supports batch retrieval
  const idsString = workItemIds.join(',');
  const fields = 'System.Id,System.Title,System.Description,System.State,System.WorkItemType,System.Url,System.AssignedTo,System.Tags';
  const apiUrl = `${orgUrl}/${projectName}/_apis/wit/workitems?ids=${idsString}&fields=${fields}&api-version=6.0`;

  try {
    const response = await makeAzureDevOpsRequest(apiUrl, pat, 'GET');
    
    // Transform response to simpler format
    return response.data.value.map(item => {
      const fields = item.fields || {};
      return {
        id: item.id,
        workItemId: item.id.toString(),
        title: fields['System.Title'] || '',
        description: fields['System.Description'] || '',
        state: fields['System.State'] || '',
        workItemType: fields['System.WorkItemType'] || '',
        url: fields['System.Url'] || item.url || '',
        assignedTo: fields['System.AssignedTo'] ? fields['System.AssignedTo'].displayName : null,
        tags: fields['System.Tags'] ? fields['System.Tags'].split(';').map(t => t.trim()) : [],
        rev: item.rev
      };
    });
  } catch (error) {
    throw new Error(`Failed to get work item details: ${error.message}`);
  }
}

/**
 * Enqueues work items in the QA jobs queue
 * @param {string} queueName - Queue name
 * @param {Array} workItems - Array of work item objects
 * @returns {Promise<Array>} Array of enqueue results
 */
async function enqueueWorkItems(queueName, workItems) {
  const results = [];

  for (const workItem of workItems) {
    try {
      // Prepare message for queue
      const queueMessage = {
        workItemId: workItem.workItemId,
        id: workItem.workItemId,
        title: workItem.title,
        description: workItem.description,
        url: workItem.url,
        state: workItem.state,
        workItemType: workItem.workItemType,
        assignedTo: workItem.assignedTo,
        tags: workItem.tags,
        metadata: {
          fetchedAt: new Date().toISOString(),
          rev: workItem.rev
        }
      };

      const result = await queueHelper.enqueueMessage(queueName, queueMessage);
      results.push({
        workItemId: workItem.workItemId,
        success: true,
        messageId: result.messageId
      });
    } catch (error) {
      results.push({
        workItemId: workItem.workItemId,
        success: false,
        error: error.message
      });
    }
  }

  return results;
}

/**
 * Main Azure Function entry point
 * @param {Object} context - Azure Functions context
 * @param {Object} timer - Timer trigger object
 */
module.exports = async function (context, timer) {
  const startTime = Date.now();
  context.log('FetchWorkItems function triggered');

  try {
    // Get configuration from environment variables
    const orgUrl = process.env.AZURE_DEVOPS_ORG_URL;
    const projectName = process.env.AZURE_DEVOPS_PROJECT;
    const pat = process.env.AZURE_DEVOPS_PAT;
    const queueName = process.env.QA_JOBS_QUEUE_NAME || 'test-generation-queue';
    const statusFilter = process.env.WORK_ITEM_STATUS || 'Ready for Testing';
    const workItemTypes = process.env.WORK_ITEM_TYPES 
      ? process.env.WORK_ITEM_TYPES.split(',').map(t => t.trim())
      : [];

    // Validate required configuration
    if (!orgUrl || !projectName || !pat) {
      throw new Error('Azure DevOps configuration is required. Set AZURE_DEVOPS_ORG_URL, AZURE_DEVOPS_PROJECT, and AZURE_DEVOPS_PAT environment variables.');
    }

    context.log(`Fetching work items with status: "${statusFilter}"`);
    if (workItemTypes.length > 0) {
      context.log(`Filtering by work item types: ${workItemTypes.join(', ')}`);
    }

    // Query work items by status
    const workItemIds = await queryWorkItemsByStatus(orgUrl, projectName, pat, statusFilter, workItemTypes);
    context.log(`Found ${workItemIds.length} work items with status "${statusFilter}"`);

    if (workItemIds.length === 0) {
      context.log('No work items found. Exiting.');
      return {
        success: true,
        workItemsFound: 0,
        workItemsEnqueued: 0,
        durationMs: Date.now() - startTime
      };
    }

    // Get detailed work item information
    context.log('Retrieving work item details...');
    const workItems = await getWorkItemDetails(orgUrl, projectName, pat, workItemIds);
    context.log(`Retrieved details for ${workItems.length} work items`);

    // Enqueue work items
    context.log(`Enqueuing work items to queue: ${queueName}`);
    const enqueueResults = await enqueueWorkItems(queueName, workItems);

    // Calculate summary
    const successful = enqueueResults.filter(r => r.success).length;
    const failed = enqueueResults.filter(r => !r.success).length;

    context.log(`Enqueued ${successful} work items successfully, ${failed} failed`);

    // Log failed items
    if (failed > 0) {
      const failedItems = enqueueResults.filter(r => !r.success);
      context.log.warn('Failed to enqueue work items:');
      failedItems.forEach(item => {
        context.log.warn(`  - Work Item ${item.workItemId}: ${item.error}`);
      });
    }

    // Return summary
    return {
      success: true,
      workItemsFound: workItems.length,
      workItemsEnqueued: successful,
      workItemsFailed: failed,
      enqueueResults: enqueueResults,
      durationMs: Date.now() - startTime,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    context.log.error(`Error in FetchWorkItems function: ${error.message}`);
    context.log.error(error.stack);

    return {
      success: false,
      error: error.message,
      durationMs: Date.now() - startTime,
      timestamp: new Date().toISOString()
    };
  }
};
