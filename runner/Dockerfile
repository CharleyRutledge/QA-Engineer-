# Playwright Test Runner Docker Image
# Based on Node.js 20 with Playwright and browser support

FROM node:20-slim

# Set working directory
WORKDIR /app

# Install system dependencies required for Playwright browsers
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libatspi2.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libwayland-client0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxkbcommon0 \
    libxrandr2 \
    xdg-utils \
    libu2f-udev \
    libvulkan1 \
    && rm -rf /var/lib/apt/lists/*

# Install Playwright and browsers
# Using PLAYWRIGHT_BROWSERS_PATH to install browsers in a specific location
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

# Install Playwright packages (CLI/core and test runner)
RUN npm install -g playwright@latest @playwright/test@latest

# Install Chromium, Firefox, and WebKit browsers
RUN npx playwright install chromium firefox webkit \
    && npx playwright install-deps chromium firefox webkit

# Create directories for tests and results
RUN mkdir -p /tests /test-results /scripts

# Copy entrypoint and helper scripts
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
COPY run-tests.sh /usr/local/bin/run-tests.sh
RUN chmod +x /usr/local/bin/entrypoint.sh /usr/local/bin/run-tests.sh

# Set environment variables
ENV NODE_ENV=production
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
ENV TEST_DIR=/tests
ENV RESULTS_DIR=/test-results

# Expose port for Playwright if needed (optional)
# EXPOSE 3000

# Set entrypoint
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]

# Default command (can be overridden)
CMD ["playwright", "test"]
