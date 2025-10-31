# QA Agent Frontend

React frontend application for the QA Agent system. Provides a user interface for viewing work items, test results, and managing QA workflows.

## Features

- **Work Item Management**: View and manage work items ready for testing
- **Test Generation**: Trigger AI-powered test script generation
- **Test Execution**: Monitor test execution and view results
- **Exploratory Scenarios**: View AI-generated exploratory test scenarios
- **Test Results**: View test execution results including screenshots, logs, and reports
- **Bug Creation**: Create bugs in Azure DevOps from test results
- **Tagging**: Tag work items for BA review or other purposes

## Installation

```bash
npm install
```

## Configuration

Create a `.env` file in the frontend directory:

```
REACT_APP_API_URL=https://your-function-app.azurewebsites.net
```

For local development, the proxy in `package.json` will forward requests to `http://localhost:7071`.

## Running the Application

### Development

```bash
npm start
```

The application will open at `http://localhost:3000`.

### Production Build

```bash
npm run build
```

This creates an optimized production build in the `build` directory.

## Project Structure

```
frontend/
  public/
    index.html          # HTML template
  src/
    components/         # React components
      WorkItemList.js
      WorkItemDetail.js
      ExploratoryScenarios.js
      TestResults.js
      ScreenshotGallery.js
      LogViewer.js
      BugCreation.js
      TaggingPanel.js
    services/
      api.js           # API service layer
    App.js             # Main application component
    index.js           # Application entry point
    *.css              # Component styles
```

## Components

### WorkItemList
Displays a list of work items ready for testing. Allows selection to view details.

### WorkItemDetail
Shows detailed information about a work item, including:
- Work item details
- Action buttons (Generate Tests, Run Tests)
- Exploratory scenarios
- Test results
- Bug creation and tagging panels

### ExploratoryScenarios
Displays AI-generated exploratory test scenarios with expandable details.

### TestResults
Shows test execution results with tabs for:
- Summary
- Screenshots
- Logs
- Reports

### ScreenshotGallery
Gallery view of test execution screenshots with full-screen viewing.

### LogViewer
Viewer for test execution logs with search functionality.

### BugCreation
Form for creating bugs in Azure DevOps with pre-filled information from test results.

### TaggingPanel
Panel for tagging work items with predefined or custom tags.

## API Integration

The frontend uses the API service layer (`src/services/api.js`) to communicate with the backend Azure Functions:

- `fetchWorkItems()` - Get work items ready for testing
- `getTestStatus(testId)` - Get test execution status
- `getTestResults(testId)` - Get test results
- `triggerTestGeneration(workItemId)` - Trigger test generation
- `triggerTestExecution(testId)` - Trigger test execution
- `createBug(bugData)` - Create bug in Azure DevOps
- `tagWorkItem(workItemId, tag)` - Tag work item

## Styling

Each component has its own CSS file for modular styling. Global styles are in `index.css` and `App.css`.

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## License

ISC
