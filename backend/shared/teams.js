/**
 * Microsoft Teams and Azure DevOps Helper
 * 
 * Provides utilities for sending Teams notifications and creating Azure DevOps bugs.
 * Designed to be reusable across all Azure Functions.
 * 
 * Prerequisites:
 * - Teams webhook URL for notifications
 * - Azure DevOps organization URL, personal access token, and project name for bug creation
 * 
 * Usage:
 *   const teamsHelper = require('./shared/teams');
 *   await teamsHelper.sendNotification(webhookUrl, { title: 'Alert', text: 'Message' });
 *   await teamsHelper.createBug({ title: 'Bug title', description: 'Bug description' });
 */

const https = require('https');
const { URL } = require('url');

/**
 * Sends a notification to Microsoft Teams via webhook
 * @param {string} webhookUrl - Teams webhook URL
 * @param {Object} message - Message object
 * @param {string} message.title - Title of the message
 * @param {string} message.text - Text content of the message
 * @param {string} message.summary - Summary text (optional)
 * @param {string} message.themeColor - Theme color in hex format (e.g., 'FF0000') (optional)
 * @param {Array} message.sections - Array of section objects for rich formatting (optional)
 * @param {Array} message.potentialAction - Array of action objects (optional)
 * @returns {Promise<Object>} Response from Teams webhook
 */
async function sendNotification(webhookUrl, message) {
  if (!webhookUrl) {
    throw new Error('Teams webhook URL is required');
  }

  if (!message || (!message.title && !message.text)) {
    throw new Error('Message must have at least a title or text');
  }

  // Build Teams message card format
  const teamsMessage = {
    '@type': 'MessageCard',
    '@context': 'https://schema.org/extensions',
    summary: message.summary || message.title || 'Notification',
    themeColor: message.themeColor || '0078D4',
    title: message.title,
    text: message.text,
    sections: message.sections || [],
    potentialAction: message.potentialAction || []
  };

  // Remove undefined fields
  Object.keys(teamsMessage).forEach(key => {
    if (teamsMessage[key] === undefined || 
        (Array.isArray(teamsMessage[key]) && teamsMessage[key].length === 0)) {
      delete teamsMessage[key];
    }
  });

  return new Promise((resolve, reject) => {
    try {
      const url = new URL(webhookUrl);
      const postData = JSON.stringify(teamsMessage);

      const options = {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname + url.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      const req = https.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({
              statusCode: res.statusCode,
              statusMessage: res.statusMessage,
              body: data
            });
          } else {
            reject(new Error(`Teams webhook returned status ${res.statusCode}: ${data}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(new Error(`Failed to send Teams notification: ${error.message}`));
      });

      req.write(postData);
      req.end();
    } catch (error) {
      reject(new Error(`Invalid webhook URL: ${error.message}`));
    }
  });
}

/**
 * Sends a simple text notification to Teams
 * @param {string} webhookUrl - Teams webhook URL
 * @param {string} title - Title of the notification
 * @param {string} text - Text content
 * @param {Object} options - Optional settings
 * @param {string} options.themeColor - Theme color in hex format (optional)
 * @returns {Promise<Object>} Response from Teams webhook
 */
async function sendSimpleNotification(webhookUrl, title, text, options = {}) {
  return sendNotification(webhookUrl, {
    title,
    text,
    themeColor: options.themeColor
  });
}

/**
 * Creates a bug/work item in Azure DevOps
 * @param {Object} bugData - Bug data object
 * @param {string} bugData.title - Title of the bug
 * @param {string} bugData.description - Description of the bug
 * @param {string} bugData.priority - Priority (1-4, where 1 is critical) (optional)
 * @param {string} bugData.severity - Severity (1-4, where 1 is critical) (optional)
 * @param {Array} bugData.tags - Array of tags (optional)
 * @param {string} bugData.assignedTo - Email of person to assign to (optional)
 * @param {Object} options - Optional settings
 * @param {string} options.organizationUrl - Azure DevOps organization URL (e.g., 'https://dev.azure.com/orgname')
 * @param {string} options.projectName - Azure DevOps project name
 * @param {string} options.personalAccessToken - Azure DevOps personal access token
 * @param {string} options.workItemType - Work item type (default: 'Bug')
 * @returns {Promise<Object>} Created work item object
 */
async function createBug(bugData, options = {}) {
  if (!bugData || !bugData.title) {
    throw new Error('Bug title is required');
  }

  const orgUrl = options.organizationUrl || process.env.AZURE_DEVOPS_ORG_URL;
  const projectName = options.projectName || process.env.AZURE_DEVOPS_PROJECT;
  const pat = options.personalAccessToken || process.env.AZURE_DEVOPS_PAT;
  const workItemType = options.workItemType || 'Bug';

  if (!orgUrl || !projectName || !pat) {
    throw new Error('Azure DevOps configuration is required. Set AZURE_DEVOPS_ORG_URL, AZURE_DEVOPS_PROJECT, and AZURE_DEVOPS_PAT environment variables or pass them as options.');
  }

  // Build work item payload
  const workItemPayload = [
    {
      op: 'add',
      path: '/fields/System.Title',
      value: bugData.title
    },
    {
      op: 'add',
      path: '/fields/System.Description',
      value: bugData.description || ''
    }
  ];

  if (bugData.priority) {
    workItemPayload.push({
      op: 'add',
      path: '/fields/Microsoft.VSTS.Common.Priority',
      value: parseInt(bugData.priority, 10)
    });
  }

  if (bugData.severity) {
    workItemPayload.push({
      op: 'add',
      path: '/fields/Microsoft.VSTS.Common.Severity',
      value: bugData.severity
    });
  }

  if (bugData.tags && Array.isArray(bugData.tags) && bugData.tags.length > 0) {
    workItemPayload.push({
      op: 'add',
      path: '/fields/System.Tags',
      value: bugData.tags.join('; ')
    });
  }

  if (bugData.assignedTo) {
    workItemPayload.push({
      op: 'add',
      path: '/fields/System.AssignedTo',
      value: bugData.assignedTo
    });
  }

  // Create API URL
  const apiUrl = `${orgUrl}/${projectName}/_apis/wit/workitems/$${workItemType}?api-version=6.0`;

  return new Promise((resolve, reject) => {
    try {
      const url = new URL(apiUrl);
      const postData = JSON.stringify(workItemPayload);

      // Create Basic Auth header from PAT
      const auth = Buffer.from(`:${pat}`).toString('base64');

      const requestOptions = {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname + url.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json-patch+json',
          'Content-Length': Buffer.byteLength(postData),
          'Authorization': `Basic ${auth}`
        }
      };

      const req = https.request(requestOptions, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              const result = JSON.parse(data);
              resolve({
                id: result.id,
                url: result.url,
                rev: result.rev,
                fields: result.fields
              });
            } catch (parseError) {
              resolve({ rawResponse: data });
            }
          } else {
            reject(new Error(`Azure DevOps API returned status ${res.statusCode}: ${data}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(new Error(`Failed to create Azure DevOps bug: ${error.message}`));
      });

      req.write(postData);
      req.end();
    } catch (error) {
      reject(new Error(`Invalid Azure DevOps URL: ${error.message}`));
    }
  });
}

/**
 * Sends a Teams notification and optionally creates an Azure DevOps bug
 * @param {string} webhookUrl - Teams webhook URL
 * @param {Object} notification - Notification message object
 * @param {Object} bugData - Bug data object (optional, if provided will create bug)
 * @param {Object} options - Optional settings for bug creation
 * @returns {Promise<Object>} Object with notification and bug results
 */
async function sendNotificationAndCreateBug(webhookUrl, notification, bugData = null, options = {}) {
  const results = {
    notification: null,
    bug: null
  };

  // Send notification
  try {
    results.notification = await sendNotification(webhookUrl, notification);
  } catch (error) {
    results.notification = { error: error.message };
  }

  // Create bug if bugData is provided
  if (bugData) {
    try {
      results.bug = await createBug(bugData, options);
    } catch (error) {
      results.bug = { error: error.message };
    }
  }

  return results;
}

module.exports = {
  sendNotification,
  sendSimpleNotification,
  createBug,
  sendNotificationAndCreateBug
};
