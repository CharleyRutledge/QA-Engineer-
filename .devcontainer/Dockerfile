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

# Install Azure Functions Core Tools
RUN curl https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor > microsoft.gpg \
    && mv microsoft.gpg /etc/apt/trusted.gpg.d/microsoft.gpg \
    && sh -c 'echo "deb [arch=amd64,arm64,armhf] https://packages.microsoft.com/debian/$(lsb_release -rs | cut -d. -f1)/prod $(lsb_release -cs) main" > /etc/apt/sources.list.d/dotnetdev.list' \
    && apt-get update \
    && apt-get install -y azure-functions-core-tools-4

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

# Create non-root user for development
RUN useradd -m -s /bin/bash node && \
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
