/**
 * Azure Storage Queue Helper
 * 
 * Provides utilities for enqueueing jobs in Azure Storage Queue.
 * Designed to be reusable across all Azure Functions.
 * 
 * Prerequisites:
 * - Azure Storage account connection string or account name/key
 * - Queue name
 * 
 * Usage:
 *   const queueHelper = require('./shared/queue');
 *   await queueHelper.enqueueMessage('queue-name', { data: 'message' });
 */

const { QueueClient, QueueServiceClient } = require('@azure/storage-queue');

/**
 * Gets or creates a QueueClient instance for the specified queue
 * @param {string} queueName - Name of the queue
 * @param {string} connectionString - Azure Storage connection string (optional if using default)
 * @returns {QueueClient} Queue client instance
 */
function getQueueClient(queueName, connectionString) {
  if (!queueName) {
    throw new Error('Queue name is required');
  }

  // Use connection string from environment variable if not provided
  const connString = connectionString || process.env.AZURE_STORAGE_CONNECTION_STRING;
  
  if (!connString) {
    throw new Error('Azure Storage connection string is required. Set AZURE_STORAGE_CONNECTION_STRING environment variable or pass it as parameter.');
  }

  const queueServiceClient = QueueServiceClient.fromConnectionString(connString);
  return queueServiceClient.getQueueClient(queueName);
}

/**
 * Enqueues a message to the specified Azure Storage Queue
 * @param {string} queueName - Name of the queue
 * @param {Object|string} message - Message to enqueue (will be JSON stringified if object)
 * @param {Object} options - Optional settings
 * @param {number} options.visibilityTimeoutInSeconds - Visibility timeout in seconds (default: 0)
 * @param {number} options.timeToLiveInSeconds - Time to live in seconds (default: queue default)
 * @param {string} options.connectionString - Azure Storage connection string (optional)
 * @returns {Promise<Object>} Result object with messageId and popReceipt
 */
async function enqueueMessage(queueName, message, options = {}) {
  try {
    const queueClient = getQueueClient(queueName, options.connectionString);

    // Ensure queue exists
    await queueClient.createIfNotExists();

    // Convert message to string if it's an object
    const messageText = typeof message === 'string' 
      ? message 
      : JSON.stringify(message);

    // Prepare message options
    const messageOptions = {};
    if (options.visibilityTimeoutInSeconds !== undefined) {
      messageOptions.visibilityTimeoutInSeconds = options.visibilityTimeoutInSeconds;
    }
    if (options.timeToLiveInSeconds !== undefined) {
      messageOptions.timeToLiveInSeconds = options.timeToLiveInSeconds;
    }

    // Send message
    const response = await queueClient.sendMessage(messageText, messageOptions);

    return {
      messageId: response.messageId,
      popReceipt: response.popReceipt,
      insertedOn: response.insertedOn,
      expiresOn: response.expiresOn
    };
  } catch (error) {
    throw new Error(`Failed to enqueue message to queue "${queueName}": ${error.message}`);
  }
}

/**
 * Enqueues multiple messages in batch
 * @param {string} queueName - Name of the queue
 * @param {Array<Object|string>} messages - Array of messages to enqueue
 * @param {Object} options - Optional settings
 * @param {string} options.connectionString - Azure Storage connection string (optional)
 * @returns {Promise<Array>} Array of results for each message
 */
async function enqueueMessages(queueName, messages, options = {}) {
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new Error('Messages must be a non-empty array');
  }

  // Azure Storage Queue supports up to 32 messages per batch
  const maxBatchSize = 32;
  const results = [];

  for (let i = 0; i < messages.length; i += maxBatchSize) {
    const batch = messages.slice(i, i + maxBatchSize);
    const batchPromises = batch.map(msg => enqueueMessage(queueName, msg, options));
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
  }

  return results;
}

/**
 * Gets approximate number of messages in the queue
 * @param {string} queueName - Name of the queue
 * @param {Object} options - Optional settings
 * @param {string} options.connectionString - Azure Storage connection string (optional)
 * @returns {Promise<number>} Approximate message count
 */
async function getQueueLength(queueName, options = {}) {
  try {
    const queueClient = getQueueClient(queueName, options.connectionString);
    const properties = await queueClient.getProperties();
    return properties.approximateMessagesCount || 0;
  } catch (error) {
    throw new Error(`Failed to get queue length for "${queueName}": ${error.message}`);
  }
}

module.exports = {
  enqueueMessage,
  enqueueMessages,
  getQueueLength,
  getQueueClient
};
