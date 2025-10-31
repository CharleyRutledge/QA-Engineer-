/**
 * WorkItemList Component
 * 
 * Displays a list of work items that are ready for testing.
 * Shows work item details and allows navigation to detail view.
 */

import React, { useState, useEffect } from 'react';
import { fetchWorkItems } from '../services/api';
import './WorkItemList.css';

const WorkItemList = ({ onSelectWorkItem }) => {
  const [workItems, setWorkItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadWorkItems();
  }, []);

  /**
   * Loads work items from the API
   */
  const loadWorkItems = async () => {
    try {
      setLoading(true);
      setError(null);
      const items = await fetchWorkItems();
      setWorkItems(items);
    } catch (err) {
      setError('Failed to load work items. Please try again.');
      console.error('Error loading work items:', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handles work item selection
   * @param {Object} workItem - Selected work item
   */
  const handleSelect = (workItem) => {
    if (onSelectWorkItem) {
      onSelectWorkItem(workItem);
    }
  };

  if (loading) {
    return (
      <div className="work-item-list loading">
        <p>Loading work items...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="work-item-list error">
        <p>{error}</p>
        <button onClick={loadWorkItems}>Retry</button>
      </div>
    );
  }

  if (workItems.length === 0) {
    return (
      <div className="work-item-list empty">
        <p>No work items ready for testing.</p>
        <button onClick={loadWorkItems}>Refresh</button>
      </div>
    );
  }

  return (
    <div className="work-item-list">
      <div className="work-item-list-header">
        <h2>Work Items Ready for Testing</h2>
        <button onClick={loadWorkItems} className="refresh-btn">Refresh</button>
      </div>
      <div className="work-item-list-items">
        {workItems.map((item) => (
          <div
            key={item.id || item.workItemId}
            className="work-item-card"
            onClick={() => handleSelect(item)}
          >
            <div className="work-item-header">
              <span className="work-item-id">#{item.workItemId || item.id}</span>
              <span className={`work-item-type ${item.workItemType?.toLowerCase() || ''}`}>
                {item.workItemType || 'Unknown'}
              </span>
            </div>
            <h3 className="work-item-title">{item.title || 'Untitled'}</h3>
            <p className="work-item-description">
              {item.description ? 
                (item.description.length > 150 
                  ? `${item.description.substring(0, 150)}...` 
                  : item.description)
                : 'No description'}
            </p>
            <div className="work-item-footer">
              <span className="work-item-state">{item.state || 'Unknown'}</span>
              {item.assignedTo && (
                <span className="work-item-assigned">Assigned to: {item.assignedTo}</span>
              )}
            </div>
            {item.tags && item.tags.length > 0 && (
              <div className="work-item-tags">
                {item.tags.map((tag, index) => (
                  <span key={index} className="tag">{tag}</span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default WorkItemList;
