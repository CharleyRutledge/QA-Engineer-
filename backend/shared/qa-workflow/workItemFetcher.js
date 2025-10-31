/**
 * Work Item Fetcher
 * 
 * Fetches work items from Azure Boards with status "Ready for Testing"
 * or high-priority bugs. Returns structured work item data.
 */

const https = require('https');
const { URL } = require('url');

/**
 * Makes authenticated request to Azure DevOps API
 * @param {string} apiUrl - Full API URL
 * @param {string} pat - Personal Access Token
 * @param {string} method - HTTP method
 * @param {Object} body - Request body (optional)
 * @returns {Promise<Object>} Response object
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
              resolve({
                statusCode: res.statusCode,
                data: data ? JSON.parse(data) : {}
              });
            } catch (parseError) {
              resolve({ statusCode: res.statusCode, data: data });
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
 * Fetches work items ready for testing
 * @param {string} orgUrl - Azure DevOps organization URL
 * @param {string} projectName - Project name
 * @param {string} pat - Personal Access Token
 * @param {Array} statusFilters - Array of status values to filter by
 * @param {number} priorityThreshold - Minimum priority for bugs (1-4)
 * @returns {Promise<Array>} Array of work items
 */
async function fetchWorkItemsReadyForTesting(orgUrl, projectName, pat, statusFilters = ['Ready for Testing'], priorityThreshold = 1) {
  // Build WIQL query for work items ready for testing
  const statusFilter = statusFilters.map(s => `'${s}'`).join(', ');
  const wiqlQuery = `
    SELECT [System.Id], [System.Title], [System.Description], [System.State], 
           [System.WorkItemType], [System.Priority], [System.AcceptanceCriteria],
           [System.AssignedTo], [System.Tags], [System.Url]
    FROM WorkItems 
    WHERE (
      [System.State] IN (${statusFilter})
      OR ([System.WorkItemType] = 'Bug' AND [Microsoft.VSTS.Common.Priority] <= ${priorityThreshold})
    )
    ORDER BY [System.ChangedDate] DESC
  `;

  const apiUrl = `${orgUrl}/${projectName}/_apis/wit/wiql?api-version=6.0`;

  try {
    const response = await makeAzureDevOpsRequest(apiUrl, pat, 'POST', {
      query: wiqlQuery
    });

    const workItemIds = response.data.workItems.map(item => item.id);
    
    if (workItemIds.length === 0) {
      return [];
    }

    // Get detailed work item information
    const idsString = workItemIds.join(',');
    const fields = 'System.Id,System.Title,System.Description,System.State,System.WorkItemType,System.Priority,System.AcceptanceCriteria,System.AssignedTo,System.Tags,System.Url,System.AreaPath';
    const detailsUrl = `${orgUrl}/${projectName}/_apis/wit/workitems?ids=${idsString}&fields=${fields}&api-version=6.0`;

    const detailsResponse = await makeAzureDevOpsRequest(detailsUrl, pat, 'GET');

    return detailsResponse.data.value.map(item => {
      const fields = item.fields || {};
      return {
        id: item.id,
        workItemId: item.id.toString(),
        title: fields['System.Title'] || '',
        description: fields['System.Description'] || '',
        acceptanceCriteria: fields['System.AcceptanceCriteria'] || '',
        state: fields['System.State'] || '',
        workItemType: fields['System.WorkItemType'] || '',
        priority: fields['Microsoft.VSTS.Common.Priority'] || 3,
        assignedTo: fields['System.AssignedTo'] ? fields['System.AssignedTo'].displayName : null,
        tags: fields['System.Tags'] ? fields['System.Tags'].split(';').map(t => t.trim()) : [],
        url: fields['System.Url'] || item.url || '',
        areaPath: fields['System.AreaPath'] || ''
      };
    });
  } catch (error) {
    throw new Error(`Failed to fetch work items: ${error.message}`);
  }
}

module.exports = {
  fetchWorkItemsReadyForTesting
};
