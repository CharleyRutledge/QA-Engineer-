/**
 * WorkItemDetail Component
 * 
 * Displays detailed information about a selected work item.
 * Shows exploratory scenarios, test results, and allows actions like bug creation.
 */

import React, { useState, useEffect } from 'react';
import { getTestResults, triggerTestGeneration, triggerTestExecution } from '../services/api';
import ExploratoryScenarios from './ExploratoryScenarios';
import TestResults from './TestResults';
import BugCreation from './BugCreation';
import TaggingPanel from './TaggingPanel';
import './WorkItemDetail.css';

const WorkItemDetail = ({ workItem, onBack }) => {
  const [testResults, setTestResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [testId, setTestId] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [executing, setExecuting] = useState(false);

  useEffect(() => {
    if (workItem && workItem.testId) {
      loadTestResults(workItem.testId);
      setTestId(workItem.testId);
    }
  }, [workItem]);

  /**
   * Loads test results for a given test ID
   * @param {string} id - Test ID
   */
  const loadTestResults = async (id) => {
    try {
      setLoading(true);
      setError(null);
      const results = await getTestResults(id);
      setTestResults(results);
    } catch (err) {
      setError('Failed to load test results.');
      console.error('Error loading test results:', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Triggers test generation for the work item
   */
  const handleGenerateTests = async () => {
    try {
      setGenerating(true);
      setError(null);
      const result = await triggerTestGeneration(workItem.workItemId || workItem.id);
      if (result.testId) {
        setTestId(result.testId);
        // Poll for results after a delay
        setTimeout(() => {
          loadTestResults(result.testId);
        }, 5000);
      }
    } catch (err) {
      setError('Failed to generate tests.');
      console.error('Error generating tests:', err);
    } finally {
      setGenerating(false);
    }
  };

  /**
   * Triggers test execution
   */
  const handleRunTests = async () => {
    if (!testId) {
      setError('No test ID available. Please generate tests first.');
      return;
    }

    try {
      setExecuting(true);
      setError(null);
      await triggerTestExecution(testId);
      // Poll for results after a delay
      setTimeout(() => {
        loadTestResults(testId);
      }, 10000);
    } catch (err) {
      setError('Failed to execute tests.');
      console.error('Error executing tests:', err);
    } finally {
      setExecuting(false);
    }
  };

  if (!workItem) {
    return (
      <div className="work-item-detail">
        <p>No work item selected.</p>
        {onBack && <button onClick={onBack}>Back to List</button>}
      </div>
    );
  }

  return (
    <div className="work-item-detail">
      <div className="work-item-detail-header">
        {onBack && (
          <button onClick={onBack} className="back-btn">← Back</button>
        )}
        <div className="work-item-detail-title">
          <h1>#{workItem.workItemId || workItem.id} - {workItem.title || 'Untitled'}</h1>
          <span className={`work-item-type ${workItem.workItemType?.toLowerCase() || ''}`}>
            {workItem.workItemType || 'Unknown'}
          </span>
        </div>
      </div>

      <div className="work-item-detail-content">
        <div className="work-item-info">
          <div className="info-section">
            <h3>Description</h3>
            <p>{workItem.description || 'No description provided.'}</p>
          </div>

          <div className="info-section">
            <h3>Details</h3>
            <div className="info-grid">
              <div>
                <strong>State:</strong> {workItem.state || 'Unknown'}
              </div>
              {workItem.assignedTo && (
                <div>
                  <strong>Assigned To:</strong> {workItem.assignedTo}
                </div>
              )}
              {workItem.url && (
                <div>
                  <strong>Link:</strong>{' '}
                  <a href={workItem.url} target="_blank" rel="noopener noreferrer">
                    View in Azure DevOps
                  </a>
                </div>
              )}
            </div>
          </div>

          {workItem.tags && workItem.tags.length > 0 && (
            <div className="info-section">
              <h3>Tags</h3>
              <div className="tags">
                {workItem.tags.map((tag, index) => (
                  <span key={index} className="tag">{tag}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="work-item-actions">
          <h3>Actions</h3>
          <div className="action-buttons">
            {!testId && (
              <button
                onClick={handleGenerateTests}
                disabled={generating}
                className="btn btn-primary"
              >
                {generating ? 'Generating Tests...' : 'Generate Tests'}
              </button>
            )}
            {testId && (
              <button
                onClick={handleRunTests}
                disabled={executing}
                className="btn btn-primary"
              >
                {executing ? 'Running Tests...' : 'Run Tests'}
              </button>
            )}
            {testId && (
              <button
                onClick={() => loadTestResults(testId)}
                disabled={loading}
                className="btn btn-secondary"
              >
                {loading ? 'Loading...' : 'Refresh Results'}
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {testResults && testResults.scenarios && (
          <ExploratoryScenarios scenarios={testResults.scenarios} />
        )}

        {testResults && (
          <TestResults
            testResults={testResults}
            testId={testId || workItem.testId}
          />
        )}

        <div className="work-item-secondary-actions">
          <TaggingPanel workItemId={workItem.workItemId || workItem.id} />
          <BugCreation
            workItemId={workItem.workItemId || workItem.id}
            testId={testId}
            testResults={testResults}
          />
        </div>
      </div>
    </div>
  );
};

export default WorkItemDetail;
