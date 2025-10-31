/**
 * TaggingPanel Component
 * 
 * Allows tagging work items for BA review or other purposes.
 * Supports adding custom tags and predefined tags.
 */

import React, { useState } from 'react';
import { tagWorkItem } from '../services/api';
import './TaggingPanel.css';

const TaggingPanel = ({ workItemId }) => {
  const [tags, setTags] = useState([]);
  const [newTag, setNewTag] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Predefined tags
  const predefinedTags = [
    'BA Review',
    'Needs Clarification',
    'Blocked',
    'In Progress',
    'Ready for QA'
  ];

  /**
   * Handles adding a new tag
   * @param {string} tag - Tag to add
   */
  const handleAddTag = async (tag) => {
    if (!tag || !tag.trim()) return;

    const tagToAdd = tag.trim();
    
    // Check if tag already exists
    if (tags.includes(tagToAdd)) {
      setError('Tag already exists');
      return;
    }

    setAdding(true);
    setError(null);
    setSuccess(false);

    try {
      await tagWorkItem(workItemId, tagToAdd);
      setTags(prev => [...prev, tagToAdd]);
      setNewTag('');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch (err) {
      setError('Failed to add tag. Please try again.');
      console.error('Error adding tag:', err);
    } finally {
      setAdding(false);
    }
  };

  /**
   * Handles predefined tag click
   * @param {string} tag - Predefined tag
   */
  const handlePredefinedTag = (tag) => {
    handleAddTag(tag);
  };

  /**
   * Handles custom tag input
   * @param {Event} e - Input event
   */
  const handleInputChange = (e) => {
    setNewTag(e.target.value);
    setError(null);
  };

  /**
   * Handles form submission
   * @param {Event} e - Form submit event
   */
  const handleSubmit = (e) => {
    e.preventDefault();
    handleAddTag(newTag);
  };

  return (
    <div className="tagging-panel">
      <h3>Tag Work Item</h3>
      
      <div className="tagging-section">
        <h4>Predefined Tags</h4>
        <div className="predefined-tags">
          {predefinedTags.map((tag, index) => (
            <button
              key={index}
              onClick={() => handlePredefinedTag(tag)}
              disabled={adding || tags.includes(tag)}
              className={`tag-btn ${tags.includes(tag) ? 'active' : ''}`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      <div className="tagging-section">
        <h4>Custom Tag</h4>
        <form onSubmit={handleSubmit} className="tag-form">
          <input
            type="text"
            value={newTag}
            onChange={handleInputChange}
            placeholder="Enter custom tag..."
            className="tag-input"
            disabled={adding}
          />
          <button
            type="submit"
            disabled={adding || !newTag.trim()}
            className="btn btn-primary"
          >
            {adding ? 'Adding...' : 'Add Tag'}
          </button>
        </form>
      </div>

      {tags.length > 0 && (
        <div className="tagging-section">
          <h4>Current Tags</h4>
          <div className="current-tags">
            {tags.map((tag, index) => (
              <span key={index} className="tag">{tag}</span>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="tagging-error">{error}</div>
      )}

      {success && (
        <div className="tagging-success">Tag added successfully!</div>
      )}
    </div>
  );
};

export default TaggingPanel;
