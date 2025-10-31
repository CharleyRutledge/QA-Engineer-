/**
 * Azure Blob Storage Helper
 * 
 * Provides utilities for uploading and downloading files from Azure Blob Storage.
 * Designed to be reusable across all Azure Functions.
 * 
 * Prerequisites:
 * - Azure Storage account connection string or account name/key
 * - Container name
 * 
 * Usage:
 *   const storageHelper = require('./shared/storage');
 *   await storageHelper.uploadBlob('container-name', 'blob-name', buffer);
 *   const data = await storageHelper.downloadBlob('container-name', 'blob-name');
 */

const { BlobServiceClient, StorageSharedKeyCredential } = require('@azure/storage-blob');

/**
 * Gets or creates a BlobServiceClient instance
 * @param {string} connectionString - Azure Storage connection string (optional if using default)
 * @returns {BlobServiceClient} Blob service client instance
 */
function getBlobServiceClient(connectionString) {
  const connString = connectionString || process.env.AZURE_STORAGE_CONNECTION_STRING;
  
  if (!connString) {
    throw new Error('Azure Storage connection string is required. Set AZURE_STORAGE_CONNECTION_STRING environment variable or pass it as parameter.');
  }

  return BlobServiceClient.fromConnectionString(connString);
}

/**
 * Gets or creates a container client
 * @param {string} containerName - Name of the container
 * @param {string} connectionString - Azure Storage connection string (optional)
 * @returns {Object} Container client instance
 */
function getContainerClient(containerName, connectionString) {
  if (!containerName) {
    throw new Error('Container name is required');
  }

  const blobServiceClient = getBlobServiceClient(connectionString);
  return blobServiceClient.getContainerClient(containerName);
}

/**
 * Uploads a blob to Azure Storage
 * @param {string} containerName - Name of the container
 * @param {string} blobName - Name/path of the blob
 * @param {Buffer|string|Stream} data - Data to upload
 * @param {Object} options - Optional settings
 * @param {string} options.contentType - MIME type of the blob (e.g., 'application/json', 'text/plain')
 * @param {Object} options.metadata - Metadata key-value pairs to associate with the blob
 * @param {string} options.connectionString - Azure Storage connection string (optional)
 * @param {boolean} options.createContainerIfNotExists - Create container if it doesn't exist (default: true)
 * @returns {Promise<Object>} Result object with blob URL and properties
 */
async function uploadBlob(containerName, blobName, data, options = {}) {
  try {
    const containerClient = getContainerClient(containerName, options.connectionString);

    // Create container if it doesn't exist
    if (options.createContainerIfNotExists !== false) {
      await containerClient.createIfNotExists();
    }

    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    // Prepare upload options
    const uploadOptions = {};
    if (options.contentType) {
      uploadOptions.blobHTTPHeaders = {
        blobContentType: options.contentType
      };
    }
    if (options.metadata) {
      uploadOptions.metadata = options.metadata;
    }

    // Upload blob
    const response = await blockBlobClient.upload(data, data.length || Buffer.byteLength(data), uploadOptions);

    return {
      blobName: blobName,
      containerName: containerName,
      url: blockBlobClient.url,
      etag: response.etag,
      lastModified: response.lastModified,
      contentLength: response.contentLength
    };
  } catch (error) {
    throw new Error(`Failed to upload blob "${blobName}" to container "${containerName}": ${error.message}`);
  }
}

/**
 * Downloads a blob from Azure Storage
 * @param {string} containerName - Name of the container
 * @param {string} blobName - Name/path of the blob
 * @param {Object} options - Optional settings
 * @param {string} options.connectionString - Azure Storage connection string (optional)
 * @param {boolean} options.asBuffer - Return as Buffer instead of stream (default: true)
 * @returns {Promise<Buffer|Stream>} Blob data as Buffer or Stream
 */
async function downloadBlob(containerName, blobName, options = {}) {
  try {
    const containerClient = getContainerClient(containerName, options.connectionString);
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    // Check if blob exists
    const exists = await blockBlobClient.exists();
    if (!exists) {
      throw new Error(`Blob "${blobName}" does not exist in container "${containerName}"`);
    }

    // Download blob
    if (options.asBuffer !== false) {
      // Download as buffer
      const downloadResponse = await blockBlobClient.download(0);
      const chunks = [];
      
      for await (const chunk of downloadResponse.readableStreamBody) {
        chunks.push(chunk);
      }

      return Buffer.concat(chunks);
    } else {
      // Return as stream
      const downloadResponse = await blockBlobClient.download(0);
      return downloadResponse.readableStreamBody;
    }
  } catch (error) {
    throw new Error(`Failed to download blob "${blobName}" from container "${containerName}": ${error.message}`);
  }
}

/**
 * Downloads a blob as a string (assumes text content)
 * @param {string} containerName - Name of the container
 * @param {string} blobName - Name/path of the blob
 * @param {Object} options - Optional settings
 * @param {string} options.connectionString - Azure Storage connection string (optional)
 * @param {string} options.encoding - Text encoding (default: 'utf8')
 * @returns {Promise<string>} Blob content as string
 */
async function downloadBlobAsString(containerName, blobName, options = {}) {
  const buffer = await downloadBlob(containerName, blobName, { ...options, asBuffer: true });
  const encoding = options.encoding || 'utf8';
  return buffer.toString(encoding);
}

/**
 * Downloads a blob as JSON (assumes JSON content)
 * @param {string} containerName - Name of the container
 * @param {string} blobName - Name/path of the blob
 * @param {Object} options - Optional settings
 * @param {string} options.connectionString - Azure Storage connection string (optional)
 * @returns {Promise<Object>} Parsed JSON object
 */
async function downloadBlobAsJson(containerName, blobName, options = {}) {
  const content = await downloadBlobAsString(containerName, blobName, options);
  try {
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`Failed to parse JSON from blob "${blobName}": ${error.message}`);
  }
}

/**
 * Checks if a blob exists
 * @param {string} containerName - Name of the container
 * @param {string} blobName - Name/path of the blob
 * @param {Object} options - Optional settings
 * @param {string} options.connectionString - Azure Storage connection string (optional)
 * @returns {Promise<boolean>} True if blob exists, false otherwise
 */
async function blobExists(containerName, blobName, options = {}) {
  try {
    const containerClient = getContainerClient(containerName, options.connectionString);
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    return await blockBlobClient.exists();
  } catch (error) {
    throw new Error(`Failed to check if blob "${blobName}" exists: ${error.message}`);
  }
}

/**
 * Deletes a blob from Azure Storage
 * @param {string} containerName - Name of the container
 * @param {string} blobName - Name/path of the blob
 * @param {Object} options - Optional settings
 * @param {string} options.connectionString - Azure Storage connection string (optional)
 * @returns {Promise<boolean>} True if blob was deleted, false if it didn't exist
 */
async function deleteBlob(containerName, blobName, options = {}) {
  try {
    const containerClient = getContainerClient(containerName, options.connectionString);
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    const response = await blockBlobClient.deleteIfExists();
    return response.succeeded;
  } catch (error) {
    throw new Error(`Failed to delete blob "${blobName}": ${error.message}`);
  }
}

/**
 * Lists blobs in a container
 * @param {string} containerName - Name of the container
 * @param {Object} options - Optional settings
 * @param {string} options.prefix - Filter blobs by prefix
 * @param {string} options.connectionString - Azure Storage connection string (optional)
 * @returns {Promise<Array>} Array of blob names
 */
async function listBlobs(containerName, options = {}) {
  try {
    const containerClient = getContainerClient(containerName, options.connectionString);
    const blobs = [];
    
    const listOptions = {};
    if (options.prefix) {
      listOptions.prefix = options.prefix;
    }

    for await (const blob of containerClient.listBlobsFlat(listOptions)) {
      blobs.push({
        name: blob.name,
        properties: {
          contentLength: blob.properties.contentLength,
          contentType: blob.properties.contentType,
          lastModified: blob.properties.lastModified,
          etag: blob.properties.etag
        }
      });
    }

    return blobs;
  } catch (error) {
    throw new Error(`Failed to list blobs in container "${containerName}": ${error.message}`);
  }
}

module.exports = {
  uploadBlob,
  downloadBlob,
  downloadBlobAsString,
  downloadBlobAsJson,
  blobExists,
  deleteBlob,
  listBlobs,
  getBlobServiceClient,
  getContainerClient
};
