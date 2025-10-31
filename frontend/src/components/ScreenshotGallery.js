/**
 * ScreenshotGallery Component
 * 
 * Displays test execution screenshots in a gallery view.
 * Supports full-screen viewing and navigation.
 */

import React, { useState } from 'react';
import './ScreenshotGallery.css';

const ScreenshotGallery = ({ screenshots }) => {
  const [selectedScreenshot, setSelectedScreenshot] = useState(null);

  if (!screenshots || screenshots.length === 0) {
    return (
      <div className="screenshot-gallery">
        <p>No screenshots available.</p>
      </div>
    );
  }

  /**
   * Opens screenshot in full-screen view
   * @param {number} index - Screenshot index
   */
  const openScreenshot = (index) => {
    setSelectedScreenshot(index);
  };

  /**
   * Closes full-screen view
   */
  const closeScreenshot = () => {
    setSelectedScreenshot(null);
  };

  /**
   * Navigates to next screenshot
   */
  const nextScreenshot = () => {
    if (selectedScreenshot !== null && selectedScreenshot < screenshots.length - 1) {
      setSelectedScreenshot(selectedScreenshot + 1);
    }
  };

  /**
   * Navigates to previous screenshot
   */
  const prevScreenshot = () => {
    if (selectedScreenshot !== null && selectedScreenshot > 0) {
      setSelectedScreenshot(selectedScreenshot - 1);
    }
  };

  /**
   * Handles keyboard navigation
   * @param {Event} e - Keyboard event
   */
  const handleKeyDown = (e) => {
    if (selectedScreenshot === null) return;
    
    if (e.key === 'Escape') {
      closeScreenshot();
    } else if (e.key === 'ArrowRight') {
      nextScreenshot();
    } else if (e.key === 'ArrowLeft') {
      prevScreenshot();
    }
  };

  React.useEffect(() => {
    if (selectedScreenshot !== null) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [selectedScreenshot]);

  return (
    <div className="screenshot-gallery">
      <div className="screenshot-grid">
        {screenshots.map((screenshot, index) => (
          <div
            key={index}
            className="screenshot-item"
            onClick={() => openScreenshot(index)}
          >
            <img
              src={screenshot.url}
              alt={screenshot.name || `Screenshot ${index + 1}`}
              loading="lazy"
            />
            <div className="screenshot-overlay">
              <span className="screenshot-name">{screenshot.name}</span>
            </div>
          </div>
        ))}
      </div>

      {selectedScreenshot !== null && (
        <div className="screenshot-modal" onClick={closeScreenshot}>
          <div className="screenshot-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="screenshot-close" onClick={closeScreenshot}>×</button>
            {selectedScreenshot > 0 && (
              <button className="screenshot-nav screenshot-prev" onClick={prevScreenshot}>
                ‹
              </button>
            )}
            <img
              src={screenshots[selectedScreenshot].url}
              alt={screenshots[selectedScreenshot].name}
            />
            {selectedScreenshot < screenshots.length - 1 && (
              <button className="screenshot-nav screenshot-next" onClick={nextScreenshot}>
                ›
              </button>
            )}
            <div className="screenshot-modal-info">
              <p>{screenshots[selectedScreenshot].name}</p>
              <p>
                {selectedScreenshot + 1} of {screenshots.length}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScreenshotGallery;
