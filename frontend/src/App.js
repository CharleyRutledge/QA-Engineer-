/**
 * Main App Component
 * 
 * Root component of the QA Agent Frontend application.
 * Manages routing between work item list and detail views.
 */

import React, { useState } from 'react';
import WorkItemList from './components/WorkItemList';
import WorkItemDetail from './components/WorkItemDetail';
import './App.css';

function App() {
  const [selectedWorkItem, setSelectedWorkItem] = useState(null);

  /**
   * Handles work item selection from the list
   * @param {Object} workItem - Selected work item
   */
  const handleSelectWorkItem = (workItem) => {
    setSelectedWorkItem(workItem);
  };

  /**
   * Handles navigation back to work item list
   */
  const handleBackToList = () => {
    setSelectedWorkItem(null);
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>QA Agent</h1>
        <p>Automated Test Generation and Execution</p>
      </header>

      <main className="App-main">
        {selectedWorkItem ? (
          <WorkItemDetail
            workItem={selectedWorkItem}
            onBack={handleBackToList}
          />
        ) : (
          <WorkItemList onSelectWorkItem={handleSelectWorkItem} />
        )}
      </main>

      <footer className="App-footer">
        <p>QA Agent Frontend - Powered by Azure Functions and OpenAI</p>
      </footer>
    </div>
  );
}

export default App;
