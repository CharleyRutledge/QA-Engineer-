/**
 * TestResults Component
 * 
 * Displays test execution results including status, summary,
 * screenshots, logs, and reports.
 */

import React, { useState } from 'react';
import ScreenshotGallery from './ScreenshotGallery';
import LogViewer from './LogViewer';
import './TestResults.css';

const TestResults = ({ testResults, testId }) => {
  const [activeTab, setActiveTab] = useState('summary');

  if (!testResults) {
    return (
      <div className="test-results">
        <h2>Test Results</h2>
        <p>No test results available.</p>
      </div>
    );
  }

  /**
   * Gets status badge class
   * @param {string} status - Test status
   * @returns {string} CSS class name
   */
  const getStatusClass = (status) => {
    const statusLower = (status || 'unknown').toLowerCase();
    return `status-badge status-${statusLower}`;
  };

  const status = testResults.status || 'unknown';
  const summary = testResults.summary || {};
  const evidence = testResults.evidence || {};

  return (
    <div className="test-results">
      <div className="test-results-header">
        <h2>Test Results</h2>
        {testId && (
          <span className="test-id">Test ID: {testId}</span>
        )}
      </div>

      <div className="test-status-section">
        <div className="status-display">
          <span className={getStatusClass(status)}>
            {status.toUpperCase()}
          </span>
          {testResults.timestamps && testResults.timestamps.executedAt && (
            <span className="execution-time">
              Executed: {new Date(testResults.timestamps.executedAt).toLocaleString()}
            </span>
          )}
        </div>
      </div>

      {summary && Object.keys(summary).length > 0 && (
        <div className="test-summary">
          <h3>Summary</h3>
          <div className="summary-grid">
            <div className="summary-item">
              <span className="summary-label">Total:</span>
              <span className="summary-value">{summary.total || 0}</span>
            </div>
            <div className="summary-item success">
              <span className="summary-label">Passed:</span>
              <span className="summary-value">{summary.passed || 0}</span>
            </div>
            <div className="summary-item failed">
              <span className="summary-label">Failed:</span>
              <span className="summary-value">{summary.failed || 0}</span>
            </div>
            <div className="summary-item skipped">
              <span className="summary-label">Skipped:</span>
              <span className="summary-value">{summary.skipped || 0}</span>
            </div>
            {summary.duration && (
              <div className="summary-item">
                <span className="summary-label">Duration:</span>
                <span className="summary-value">{(summary.duration / 1000).toFixed(2)}s</span>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="test-results-tabs">
        <button
          className={`tab ${activeTab === 'summary' ? 'active' : ''}`}
          onClick={() => setActiveTab('summary')}
        >
          Summary
        </button>
        {evidence.screenshots && evidence.screenshots.length > 0 && (
          <button
            className={`tab ${activeTab === 'screenshots' ? 'active' : ''}`}
            onClick={() => setActiveTab('screenshots')}
          >
            Screenshots ({evidence.screenshots.length})
          </button>
        )}
        {evidence.logs && evidence.logs.length > 0 && (
          <button
            className={`tab ${activeTab === 'logs' ? 'active' : ''}`}
            onClick={() => setActiveTab('logs')}
          >
            Logs ({evidence.logs.length})
          </button>
        )}
        {evidence.reports && evidence.reports.length > 0 && (
          <button
            className={`tab ${activeTab === 'reports' ? 'active' : ''}`}
            onClick={() => setActiveTab('reports')}
          >
            Reports ({evidence.reports.length})
          </button>
        )}
      </div>

      <div className="test-results-content">
        {activeTab === 'summary' && (
          <div className="tab-content">
            <div className="results-summary">
              <p>Test execution completed with status: <strong>{status}</strong></p>
              {testResults.summaryBlobUrl && (
                <div className="summary-link">
                  <a href={testResults.summaryBlobUrl} target="_blank" rel="noopener noreferrer">
                    View Full Summary
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'screenshots' && (
          <div className="tab-content">
            <ScreenshotGallery screenshots={evidence.screenshots || []} />
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="tab-content">
            <LogViewer logs={evidence.logs || []} />
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="tab-content">
            <div className="reports-list">
              {evidence.reports.map((report, index) => (
                <div key={index} className="report-item">
                  <h4>{report.name}</h4>
                  <div className="report-info">
                    <span className="report-type">{report.type}</span>
                    {report.size && (
                      <span className="report-size">
                        {(report.size / 1024).toFixed(2)} KB
                      </span>
                    )}
                  </div>
                  <a
                    href={report.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="report-link"
                  >
                    View Report
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TestResults;
