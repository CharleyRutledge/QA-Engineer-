#!/bin/bash
# Post-create script for dev container
# Installs dependencies and sets up the development environment

set -e

echo "Setting up QA Agent development environment..."

# Install backend dependencies
if [ -d "/workspace/backend" ]; then
    echo "Installing backend dependencies..."
    cd /workspace/backend
    if [ -f "package.json" ]; then
        npm install
    fi
fi

# Install frontend dependencies
if [ -d "/workspace/frontend" ]; then
    echo "Installing frontend dependencies..."
    cd /workspace/frontend
    if [ -f "package.json" ]; then
        npm install
    fi
fi

# Create local.settings.json for Azure Functions if it doesn't exist
if [ -d "/workspace/backend" ] && [ ! -f "/workspace/backend/local.settings.json" ]; then
    echo "Creating local.settings.json template..."
    cat > /workspace/backend/local.settings.json << 'EOF'
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "AZURE_STORAGE_CONNECTION_STRING": "DefaultEndpointsProtocol=http;AccountName=devstoreaccount1;AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==;BlobEndpoint=http://azurite:10000/devstoreaccount1;QueueEndpoint=http://azurite:10001/devstoreaccount1;",
    "AZURE_DEVOPS_ORG_URL": "",
    "AZURE_DEVOPS_PROJECT": "",
    "AZURE_DEVOPS_PAT": "",
    "OPENAI_API_KEY": "",
    "AZURE_OPENAI_ENDPOINT": "",
    "AZURE_OPENAI_MODEL": "gpt-4",
    "QA_JOBS_QUEUE_NAME": "test-generation-queue",
    "STORAGE_CONTAINER_NAME": "test-scripts",
    "RESULTS_CONTAINER_NAME": "test-results"
  }
}
EOF
fi

# Set up Git (if not already configured)
if [ -z "$(git config --global user.name)" ]; then
    echo "Git user name not set. Please configure Git:"
    echo "  git config --global user.name 'Your Name'"
    echo "  git config --global user.email 'your.email@example.com'"
fi

echo "Development environment setup complete!"
echo ""
echo "To start services, run:"
echo "  docker-compose up"
echo ""
echo "Or start individual services:"
echo "  docker-compose up backend   # Azure Functions"
echo "  docker-compose up frontend # React dev server"
echo "  docker-compose up runner   # Playwright container"
