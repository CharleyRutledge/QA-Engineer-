# Development Container Setup

This directory contains configuration for VS Code Dev Containers and Docker Compose orchestration.

## Files

- **devcontainer.json** - VS Code Dev Container configuration
- **Dockerfile** - Development container image definition
- **post-create.sh** - Script run after container creation

## Prerequisites

- Docker Desktop or Docker Engine
- VS Code with Dev Containers extension
- Docker Compose

## Environment Variables

Create a `.env` file in the workspace root with the following variables:

```env
# Azure Storage
AZURE_STORAGE_CONNECTION_STRING=your-connection-string

# Azure DevOps
AZURE_DEVOPS_ORG_URL=https://dev.azure.com/yourorg
AZURE_DEVOPS_PROJECT=YourProject
AZURE_DEVOPS_PAT=your-personal-access-token

# OpenAI
OPENAI_API_KEY=your-openai-key
AZURE_OPENAI_API_KEY=your-azure-openai-key
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_MODEL=gpt-4

# Optional Configuration
QA_JOBS_QUEUE_NAME=test-generation-queue
STORAGE_CONTAINER_NAME=test-scripts
RESULTS_CONTAINER_NAME=test-results
WORK_ITEM_STATUS=Ready for Testing
```

## Usage

### Using VS Code Dev Containers

1. Open the workspace in VS Code
2. When prompted, click "Reopen in Container"
3. Or use Command Palette: "Dev Containers: Reopen in Container"

The container will:
- Install all dependencies
- Set up the development environment
- Forward ports for frontend (3000) and backend (7071)

### Using Docker Compose Directly

Start all services:
```bash
docker-compose up
```

Start specific services:
```bash
docker-compose up backend frontend
```

Run in detached mode:
```bash
docker-compose up -d
```

View logs:
```bash
docker-compose logs -f backend
```

Stop services:
```bash
docker-compose down
```

## Services

### devcontainer
Development container with Node.js 20, Azure Functions Core Tools, and Docker support.

### backend
Azure Functions emulator running on port 7071.

### frontend
React development server running on port 3000 with hot-reload.

### runner
Playwright test container for executing tests.

### azurite
Azure Storage emulator for local development:
- Blob service: http://localhost:10000
- Queue service: http://localhost:10001
- Table service: http://localhost:10002

## Ports

- **3000** - Frontend (React)
- **7071** - Backend (Azure Functions)
- **9229** - Node.js Debugger
- **10000** - Azurite Blob Service
- **10001** - Azurite Queue Service
- **10002** - Azurite Table Service

## Troubleshooting

### Port Already in Use

If ports are already in use, modify the port mappings in `docker-compose.yml`:

```yaml
ports:
  - "3001:3000"  # Use port 3001 instead of 3000
```

### Permission Issues

If you encounter permission issues with Docker socket:
```bash
sudo chmod 666 /var/run/docker.sock
```

### Reset Environment

To reset the development environment:
```bash
docker-compose down -v
docker-compose up --build
```

## Local Development Without Docker

If you prefer to run services locally:

### Backend
```bash
cd backend
npm install
func start
```

### Frontend
```bash
cd frontend
npm install
npm start
```

## License

ISC
