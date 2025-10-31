# Development Container Dockerfile
# Base image with Node.js 20 and development tools

FROM node:20-bullseye

# Set working directory
WORKDIR /workspace

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    curl \
    wget \
    vim \
    nano \
    build-essential \
    python3 \
    python3-pip \
    ca-certificates \
    gnupg \
    lsb-release \
    && rm -rf /var/lib/apt/lists/*

# Install Azure Functions Core Tools (via npm for reliability)
RUN npm install -g azure-functions-core-tools@4 --unsafe-perm=true

# Install Azure CLI
RUN curl -sL https://aka.ms/InstallAzureCLIDeb | bash

# Install Docker CLI (for Docker-in-Docker support)
RUN apt-get update && apt-get install -y \
    docker.io \
    && rm -rf /var/lib/apt/lists/*

# Install global npm packages for development
RUN npm install -g \
    npm@latest \
    typescript \
    @azure/static-web-apps-cli

# Create or update non-root user for development
RUN (id -u node >/dev/null 2>&1 || useradd -m -s /bin/bash node) && \
    usermod -aG docker node

# Set up directory permissions
RUN chown -R node:node /workspace

# Switch to non-root user
USER node

# Set environment variables
ENV NODE_ENV=development
ENV PATH="/home/node/.local/bin:${PATH}"

# Default command
CMD ["/bin/bash"]
