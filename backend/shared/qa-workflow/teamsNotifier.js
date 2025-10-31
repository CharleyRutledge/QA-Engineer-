/**
 * Teams Notifier
 * 
 * Sends formatted notifications to Microsoft Teams
 * with work item summaries, test results, and evidence links.
 */

const https = require('https');
const { URL } = require('url');

/**
 * Formats Teams message card for QA workflow notification
 * @param {Object} workItem - Work item data
 * @param {Array} scenarios - Exploratory scenarios
 * @param {Object} testResults - Test execution results
 * @param {Array} evidenceUrls - URLs to evidence (screenshots, logs)
 * @returns {Object} Teams message card object
 */
function formatTeamsMessage(workItem, scenarios, testResults, evidenceUrls) {
  const statusColor = testResults.status === 'pass' ? '28a745' : 
                      testResults.status === 'fail' ? 'dc3545' : 'ffc107';
  
  const statusText = testResults.status === 'pass' ? 'PASSED' :
                     testResults.status === 'fail' ? 'FAILED' : 'UNKNOWN';

  const sections = [
    {
      activityTitle: `Work Item: #${workItem.workItemId} - ${workItem.title}`,
      activitySubtitle: `Type: ${workItem.workItemType} | Status: ${workItem.state}`,
      facts: [
        {
          name: 'Work Item ID',
          value: workItem.workItemId.toString()
        },
        {
          name: 'Assigned To',
          value: workItem.assignedTo || 'Unassigned'
        },
        {
          name: 'Test Status',
          value: statusText
        }
      ]
    }
  ];

  // Add exploratory scenarios section
  if (scenarios && scenarios.length > 0) {
    sections.push({
      title: 'Exploratory Test Scenarios',
      text: scenarios.map((s, i) => `${i + 1}. ${s}`).join('\n')
    });
  }

  // Add test results section
  if (testResults) {
    const testFacts = [];
    if (testResults.summary) {
      testFacts.push(
        { name: 'Total Tests', value: testResults.summary.total?.toString() || '0' },
        { name: 'Passed', value: testResults.summary.passed?.toString() || '0' },
        { name: 'Failed', value: testResults.summary.failed?.toString() || '0' }
      );
    }
    if (testResults.executionTimeMs) {
      testFacts.push({
        name: 'Execution Time',
        value: `${(testResults.executionTimeMs / 1000).toFixed(2)}s`
      });
    }

    sections.push({
      title: 'Automated Test Results',
      facts: testFacts
    });
  }

  // Add evidence links section
  if (evidenceUrls && evidenceUrls.length > 0) {
    const evidenceText = evidenceUrls.map((url, i) => {
      const type = url.includes('screenshot') ? 'Screenshot' :
                   url.includes('log') ? 'Log' :
                   url.includes('report') ? 'Report' : 'Evidence';
      return `[${type} ${i + 1}](${url})`;
    }).join(' | ');

    sections.push({
      title: 'Evidence Links',
      text: evidenceText
    });
  }

  // Add work item link
  const potentialActions = [
    {
      '@type': 'OpenUri',
      name: 'View Work Item',
      targets: [
        {
          os: 'default',
          uri: workItem.url
        }
      ]
    }
  ];

  // Add evidence links as actions
  if (evidenceUrls && evidenceUrls.length > 0) {
    evidenceUrls.forEach((url, index) => {
      const type = url.includes('screenshot') ? 'Screenshot' :
                   url.includes('log') ? 'Log' : 'Evidence';
      potentialActions.push({
        '@type': 'OpenUri',
        name: `View ${type} ${index + 1}`,
        targets: [
          {
            os: 'default',
            uri: url
          }
        ]
      });
    });
  }

  return {
    '@type': 'MessageCard',
    '@context': 'https://schema.org/extensions',
    summary: `QA Test Results for Work Item #${workItem.workItemId}: ${statusText}`,
    themeColor: statusColor,
    title: `QA Test Results: ${workItem.title}`,
    sections: sections,
    potentialAction: potentialActions
  };
}

/**
 * Sends notification to Teams webhook
 * @param {string} webhookUrl - Teams webhook URL
 * @param {Object} messageCard - Teams message card object
 * @returns {Promise<Object>} Response object
 */
async function sendTeamsNotification(webhookUrl, messageCard) {
  return new Promise((resolve, reject) => {
    try {
      const url = new URL(webhookUrl);
      const postData = JSON.stringify(messageCard);

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
 * Sends QA workflow notification to Teams
 * @param {Object} workItem - Work item data
 * @param {Array} scenarios - Exploratory scenarios
 * @param {Object} testResults - Test execution results
 * @param {Array} evidenceUrls - Evidence URLs
 * @param {string} webhookUrl - Teams webhook URL
 * @returns {Promise<Object>} Notification result
 */
async function notifyTeams(workItem, scenarios, testResults, evidenceUrls, webhookUrl) {
  if (!webhookUrl) {
    throw new Error('Teams webhook URL is required');
  }

  const messageCard = formatTeamsMessage(workItem, scenarios, testResults, evidenceUrls);
  return await sendTeamsNotification(webhookUrl, messageCard);
}

module.exports = {
  notifyTeams,
  formatTeamsMessage
};
