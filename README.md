# QA Agent Backend

Automated test generation and execution system using Azure Functions, OpenAI, and Playwright.

## Overview

This project provides a complete backend system for automatically generating and executing Playwright test scripts based on Azure Boards work items. The system uses AI to generate test scripts and exploratory scenarios, then executes them in Docker containers.

## Project Structure

```
backend/
  api/
    fetchWorkItems/     # Fetches work items from Azure Boards
    generateTests/      # Generates Playwright tests using AI
    runTests/          # Executes tests in Docker containers
    jobStatus/          # HTTP endpoint for test status queries
  shared/
    queue.js           # Azure Storage Queue helper
    storage.js         # Azure Blob Storage helper
    teams.js           # Teams notifications and Azure DevOps integration
```

## Quick Start

1. Install dependencies:
```bash
cd backend
npm install
```

2. Configure environment variables (see `backend/local.settings.json.example`)

3. Deploy to Azure Functions:
```bash
func azure functionapp publish <function-app-name>
```

## Documentation

See [backend/README.md](backend/README.md) for detailed documentation including:
- Architecture overview
- Function descriptions
- Environment variables
- Workflow explanation
- API usage examples

## Features

- Automated work item fetching from Azure Boards
- AI-powered test script generation (OpenAI/Azure OpenAI)
- Docker-based test execution
- Comprehensive result storage (screenshots, logs, reports)
- RESTful API for status queries
- Teams notifications and Azure DevOps integration

## Requirements

- Node.js 18+
- Azure Functions Core Tools
- Azure Storage Account
- Azure DevOps account with PAT
- OpenAI API key or Azure OpenAI resource
- Docker (for test execution)

## License

ISC
