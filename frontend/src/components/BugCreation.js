/**
 * BugCreation Component
 * 
 * Allows creating bugs in Azure DevOps based on test results.
 * Pre-fills bug information from test results and work item.
 */

import React, { useState } from 'react';
import { createBug } from '../services/api';
import './BugCreation.css';

const BugCreation = ({ workItemId, testId, testResults }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: '2',
    severity: '2'
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  /**
   * Opens the bug creation form
   */
  const openForm = () => {
    setIsOpen(true);
    // Pre-fill form with test results if available
    if (testResults) {
      const status = testResults.status || 'unknown';
      const summary = testResults.summary || {};
      
      setFormData({
        title: `Test Failure: ${workItemId || 'Unknown Work Item'}`,
        description: generateBugDescription(testResults),
        priority: status === 'failed' ? '1' : '2',
        severity: summary.failed > 0 ? '1' : '2'
      });
    }
  };

  /**
   * Closes the bug creation form
   */
  const closeForm = () => {
    setIsOpen(false);
    setError(null);
    setSuccess(false);
    setFormData({
      title: '',
      description: '',
      priority: '2',
      severity: '2'
    });
  };

  /**
   * Generates bug description from test results
   * @param {Object} results - Test results object
   * @returns {string} Bug description
   */
  const generateBugDescription = (results) => {
    let description = `Bug created from test execution.\n\n`;
    
    if (testId) {
      description += `Test ID: ${testId}\n`;
    }
    
    if (workItemId) {
      description += `Work Item ID: ${workItemId}\n`;
    }
    
    description += `Test Status: ${results.status || 'unknown'}\n\n`;
    
    if (results.summary) {
      description += `Test Summary:\n`;
      description += `- Total: ${results.summary.total || 0}\n`;
      description += `- Passed: ${results.summary.passed || 0}\n`;
      description += `- Failed: ${results.summary.failed || 0}\n`;
      description += `- Skipped: ${results.summary.skipped || 0}\n\n`;
    }
    
    if (results.evidence && results.evidence.screenshots && results.evidence.screenshots.length > 0) {
      description += `Screenshots:\n`;
      results.evidence.screenshots.forEach((screenshot, index) => {
        description += `${index + 1}. ${screenshot.url}\n`;
      });
      description += `\n`;
    }
    
    if (results.summaryBlobUrl) {
      description += `Full test results: ${results.summaryBlobUrl}\n`;
    }
    
    return description;
  };

  /**
   * Handles form input changes
   * @param {Event} e - Input event
   */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  /**
   * Handles form submission
   * @param {Event} e - Form submit event
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      const bugData = {
        title: formData.title,
        description: formData.description,
        priority: parseInt(formData.priority, 10),
        severity: formData.severity,
        testId: testId,
        workItemId: workItemId
      };

      const result = await createBug(bugData);
      setSuccess(true);
      
      // Close form after a delay
      setTimeout(() => {
        closeForm();
      }, 2000);
    } catch (err) {
      setError('Failed to create bug. Please try again.');
      console.error('Error creating bug:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) {
    return (
      <div className="bug-creation">
        <button onClick={openForm} className="btn btn-primary">
          Create Bug
        </button>
      </div>
    );
  }

  return (
    <div className="bug-creation">
      <div className="bug-creation-form">
        <div className="form-header">
          <h3>Create Bug in Azure DevOps</h3>
          <button onClick={closeForm} className="close-btn">×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="bug-title">Title *</label>
            <input
              type="text"
              id="bug-title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="bug-description">Description *</label>
            <textarea
              id="bug-description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              required
              rows="10"
              className="form-textarea"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="bug-priority">Priority</label>
              <select
                id="bug-priority"
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                className="form-select"
              >
                <option value="1">1 - Critical</option>
                <option value="2">2 - High</option>
                <option value="3">3 - Medium</option>
                <option value="4">4 - Low</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="bug-severity">Severity</label>
              <select
                id="bug-severity"
                name="severity"
                value={formData.severity}
                onChange={handleChange}
                className="form-select"
              >
                <option value="1">1 - Critical</option>
                <option value="2">2 - High</option>
                <option value="3">3 - Medium</option>
                <option value="4">4 - Low</option>
              </select>
            </div>
          </div>

          {error && (
            <div className="form-error">{error}</div>
          )}

          {success && (
            <div className="form-success">Bug created successfully!</div>
          )}

          <div className="form-actions">
            <button
              type="button"
              onClick={closeForm}
              className="btn btn-secondary"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
            >
              {submitting ? 'Creating...' : 'Create Bug'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BugCreation;
