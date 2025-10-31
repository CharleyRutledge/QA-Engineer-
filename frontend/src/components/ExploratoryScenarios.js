/**
 * ExploratoryScenarios Component
 * 
 * Displays AI-generated exploratory test scenarios.
 * Shows scenarios with their focus areas and risk levels.
 */

import React, { useState } from 'react';
import './ExploratoryScenarios.css';

const ExploratoryScenarios = ({ scenarios }) => {
  const [expandedScenario, setExpandedScenario] = useState(null);

  if (!scenarios || scenarios.length === 0) {
    return (
      <div className="exploratory-scenarios">
        <h2>Exploratory Scenarios</h2>
        <p>No exploratory scenarios available.</p>
      </div>
    );
  }

  /**
   * Toggles scenario expansion
   * @param {number} index - Scenario index
   */
  const toggleScenario = (index) => {
    setExpandedScenario(expandedScenario === index ? null : index);
  };

  /**
   * Gets risk level color class
   * @param {string} riskLevel - Risk level (low/medium/high)
   * @returns {string} CSS class name
   */
  const getRiskLevelClass = (riskLevel) => {
    const level = (riskLevel || 'low').toLowerCase();
    return `risk-level risk-${level}`;
  };

  return (
    <div className="exploratory-scenarios">
      <h2>Exploratory Test Scenarios</h2>
      <p className="scenarios-count">{scenarios.length} scenario(s) generated</p>
      
      <div className="scenarios-list">
        {scenarios.map((scenario, index) => (
          <div
            key={index}
            className={`scenario-card ${expandedScenario === index ? 'expanded' : ''}`}
          >
            <div
              className="scenario-header"
              onClick={() => toggleScenario(index)}
            >
              <div className="scenario-title-section">
                <h3 className="scenario-title">{scenario.title || `Scenario ${index + 1}`}</h3>
                <span className={getRiskLevelClass(scenario.riskLevel)}>
                  {scenario.riskLevel || 'low'}
                </span>
              </div>
              <span className="expand-icon">
                {expandedScenario === index ? '▼' : '▶'}
              </span>
            </div>

            {expandedScenario === index && (
              <div className="scenario-content">
                <div className="scenario-description">
                  <h4>Description</h4>
                  <p>{scenario.description || 'No description provided.'}</p>
                </div>

                {scenario.focusAreas && scenario.focusAreas.length > 0 && (
                  <div className="scenario-focus-areas">
                    <h4>Focus Areas</h4>
                    <ul>
                      {scenario.focusAreas.map((area, areaIndex) => (
                        <li key={areaIndex}>{area}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="scenario-meta">
                  <span className="risk-label">
                    Risk Level: <span className={getRiskLevelClass(scenario.riskLevel)}>
                      {scenario.riskLevel || 'low'}
                    </span>
                  </span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ExploratoryScenarios;
