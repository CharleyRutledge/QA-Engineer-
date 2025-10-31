/**
 * LogViewer Component
 * 
 * Displays test execution logs in a readable format.
 * Supports filtering and searching through logs.
 */

import React, { useState } from 'react';
import './LogViewer.css';

const LogViewer = ({ logs }) => {
  const [selectedLog, setSelectedLog] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  if (!logs || logs.length === 0) {
    return (
      <div className="log-viewer">
        <p>No logs available.</p>
      </div>
    );
  }

  /**
   * Filters logs based on search term
   * @param {Array} logList - List of logs
   * @returns {Array} Filtered logs
   */
  const filterLogs = (logList) => {
    if (!searchTerm) return logList;
    const term = searchTerm.toLowerCase();
    return logList.filter(log => 
      log.name.toLowerCase().includes(term) ||
      (log.url && log.url.toLowerCase().includes(term))
    );
  };

  /**
   * Handles log selection
   * @param {number} index - Log index
   */
  const selectLog = (index) => {
    setSelectedLog(index);
  };

  /**
   * Closes log viewer
   */
  const closeLogViewer = () => {
    setSelectedLog(null);
  };

  const filteredLogs = filterLogs(logs);

  return (
    <div className="log-viewer">
      <div className="log-viewer-header">
        <h3>Test Execution Logs</h3>
        <div className="log-search">
          <input
            type="text"
            placeholder="Search logs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="log-search-input"
          />
        </div>
      </div>

      <div className="log-list">
        {filteredLogs.length === 0 ? (
          <p className="no-logs">No logs match your search.</p>
        ) : (
          filteredLogs.map((log, index) => (
            <div
              key={index}
              className="log-item"
              onClick={() => selectLog(index)}
            >
              <div className="log-item-header">
                <span className="log-name">{log.name}</span>
                {log.size && (
                  <span className="log-size">
                    {(log.size / 1024).toFixed(2)} KB
                  </span>
                )}
              </div>
              {log.lastModified && (
                <div className="log-meta">
                  Modified: {new Date(log.lastModified).toLocaleString()}
                </div>
              )}
              <a
                href={log.url}
                target="_blank"
                rel="noopener noreferrer"
                className="log-link"
                onClick={(e) => e.stopPropagation()}
              >
                View Log
              </a>
            </div>
          ))
        )}
      </div>

      {selectedLog !== null && (
        <div className="log-modal" onClick={closeLogViewer}>
          <div className="log-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="log-modal-header">
              <h3>{logs[selectedLog].name}</h3>
              <button className="log-close" onClick={closeLogViewer}>×</button>
            </div>
            <div className="log-modal-body">
              <iframe
                src={logs[selectedLog].url}
                title={logs[selectedLog].name}
                className="log-iframe"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LogViewer;
