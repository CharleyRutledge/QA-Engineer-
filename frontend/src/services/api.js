/**
 * API Service Layer
 * 
 * Handles all API calls to the backend Azure Functions.
 * Centralizes API configuration and error handling.
 */

import axios from 'axios';

// Base URL for Azure Functions API
// In production, this should be set to your Azure Functions app URL
// For local development, use proxy in package.json or set REACT_APP_API_URL
const API_BASE_URL = process.env.REACT_APP_API_URL || '';

/**
 * Creates an axios instance with default configuration
 */
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

/**
 * Request interceptor for adding auth tokens if needed
 */
apiClient.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Response interceptor for error handling
 */
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle common errors
    if (error.response) {
      console.error('API Error:', error.response.status, error.response.data);
    } else if (error.request) {
      console.error('Network Error:', error.message);
    } else {
      console.error('Error:', error.message);
    }
    return Promise.reject(error);
  }
);

/**
 * Fetches work items ready for testing
 * This would typically call the fetchWorkItems function or a work items API
 * @returns {Promise<Array>} Array of work items
 */
export const fetchWorkItems = async () => {
  try {
    // Note: This is a placeholder. In a real implementation, you might:
    // 1. Call an Azure Function that returns work items
    // 2. Query Azure DevOps API directly
    // 3. Use a dedicated work items endpoint
    
    // For now, return empty array - this would be replaced with actual API call
    const response = await apiClient.get('/api/workItems');
    return response.data;
  } catch (error) {
    console.error('Failed to fetch work items:', error);
    throw error;
  }
};

/**
 * Gets test generation status for a work item
 * @param {string} testId - Test ID
 * @returns {Promise<Object>} Test status object
 */
export const getTestStatus = async (testId) => {
  try {
    const response = await apiClient.get(`/api/jobStatus`, {
      params: { testId }
    });
    return response.data;
  } catch (error) {
    console.error('Failed to fetch test status:', error);
    throw error;
  }
};

/**
 * Gets test results including screenshots, logs, and reports
 * @param {string} testId - Test ID
 * @returns {Promise<Object>} Test results object
 */
export const getTestResults = async (testId) => {
  try {
    const response = await apiClient.get(`/api/jobStatus`, {
      params: { testId }
    });
    return response.data;
  } catch (error) {
    console.error('Failed to fetch test results:', error);
    throw error;
  }
};

/**
 * Triggers test generation for a work item
 * @param {string} workItemId - Work item ID
 * @returns {Promise<Object>} Generation result
 */
export const triggerTestGeneration = async (workItemId) => {
  try {
    // This would enqueue a message to the test-generation-queue
    // Implementation depends on your backend API design
    const response = await apiClient.post('/api/generateTests', {
      workItemId
    });
    return response.data;
  } catch (error) {
    console.error('Failed to trigger test generation:', error);
    throw error;
  }
};

/**
 * Triggers test execution for a test ID
 * @param {string} testId - Test ID
 * @returns {Promise<Object>} Execution result
 */
export const triggerTestExecution = async (testId) => {
  try {
    // This would enqueue a message to the test-execution-queue
    const response = await apiClient.post('/api/runTests', {
      testId
    });
    return response.data;
  } catch (error) {
    console.error('Failed to trigger test execution:', error);
    throw error;
  }
};

/**
 * Creates a bug in Azure DevOps
 * @param {Object} bugData - Bug data
 * @param {string} bugData.title - Bug title
 * @param {string} bugData.description - Bug description
 * @param {string} bugData.testId - Associated test ID
 * @param {string} bugData.workItemId - Associated work item ID
 * @returns {Promise<Object>} Created bug object
 */
export const createBug = async (bugData) => {
  try {
    const response = await apiClient.post('/api/createBug', bugData);
    return response.data;
  } catch (error) {
    console.error('Failed to create bug:', error);
    throw error;
  }
};

/**
 * Tags a work item for BA review
 * @param {string} workItemId - Work item ID
 * @param {string} tag - Tag to add
 * @returns {Promise<Object>} Update result
 */
export const tagWorkItem = async (workItemId, tag) => {
  try {
    const response = await apiClient.post('/api/tagWorkItem', {
      workItemId,
      tag
    });
    return response.data;
  } catch (error) {
    console.error('Failed to tag work item:', error);
    throw error;
  }
};

export default apiClient;
