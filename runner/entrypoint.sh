#!/bin/bash
# Playwright Test Runner Entrypoint
# Handles downloading test scripts from Blob Storage and executing them

set -e

# Color output helpers (for better logging)
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Environment variables
# AZURE_STORAGE_CONNECTION_STRING - Azure Storage connection string
# TEST_SCRIPT_BLOB_URL - Direct URL to test script blob (optional)
# TEST_SCRIPT_BLOB_NAME - Blob name for test script (requires container name)
# STORAGE_CONTAINER_NAME - Container name for test scripts
# TEST_ID - Test ID for tracking
# RESULTS_DIR - Directory for test results (default: /test-results)
# TEST_DIR - Directory for test scripts (default: /tests)

RESULTS_DIR=${RESULTS_DIR:-/test-results}
TEST_DIR=${TEST_DIR:-/tests}
STORAGE_CONTAINER_NAME=${STORAGE_CONTAINER_NAME:-test-scripts}

log_info "Playwright Test Runner starting..."
log_info "Test ID: ${TEST_ID:-not-set}"
log_info "Test Directory: ${TEST_DIR}"
log_info "Results Directory: ${RESULTS_DIR}"

# Create directories
mkdir -p "${TEST_DIR}" "${RESULTS_DIR}"

# Download test script from Blob Storage if provided
if [ -n "${TEST_SCRIPT_BLOB_URL}" ]; then
    log_info "Downloading test script from URL: ${TEST_SCRIPT_BLOB_URL}"
    curl -o "${TEST_DIR}/test.spec.js" "${TEST_SCRIPT_BLOB_URL}" || {
        log_error "Failed to download test script from URL"
        exit 1
    }
elif [ -n "${TEST_SCRIPT_BLOB_NAME}" ] && [ -n "${STORAGE_CONTAINER_NAME}" ]; then
    log_info "Downloading test script: ${STORAGE_CONTAINER_NAME}/${TEST_SCRIPT_BLOB_NAME}"
    
    # Use Azure CLI if available, otherwise use curl with SAS token
    if command -v az &> /dev/null && [ -n "${AZURE_STORAGE_CONNECTION_STRING}" ]; then
        export AZURE_STORAGE_CONNECTION_STRING
        az storage blob download \
            --container-name "${STORAGE_CONTAINER_NAME}" \
            --name "${TEST_SCRIPT_BLOB_NAME}" \
            --file "${TEST_DIR}/test.spec.js" || {
            log_error "Failed to download test script using Azure CLI"
            exit 1
        }
    else
        log_error "Azure CLI not available or connection string not set"
        log_error "Cannot download test script. Please provide TEST_SCRIPT_BLOB_URL or install Azure CLI."
        exit 1
    fi
elif [ -n "${TEST_SCRIPT_CONTENT}" ]; then
    log_info "Using test script from TEST_SCRIPT_CONTENT environment variable"
    echo "${TEST_SCRIPT_CONTENT}" > "${TEST_DIR}/test.spec.js"
else
    log_warn "No test script provided. Checking for mounted test files..."
    
    # Check if test files are mounted or already present
    if [ -f "${TEST_DIR}/test.spec.js" ] || [ -f "${TEST_DIR}/*.spec.js" ]; then
        log_info "Found test files in ${TEST_DIR}"
    else
        log_error "No test script found. Please provide one of:"
        log_error "  - TEST_SCRIPT_BLOB_URL"
        log_error "  - TEST_SCRIPT_BLOB_NAME (with STORAGE_CONTAINER_NAME)"
        log_error "  - TEST_SCRIPT_CONTENT"
        log_error "  - Mount test files to ${TEST_DIR}"
        exit 1
    fi
fi

# Verify test script exists
if [ ! -f "${TEST_DIR}/test.spec.js" ] && [ -z "$(find "${TEST_DIR}" -name "*.spec.js" -type f)" ]; then
    log_error "Test script not found in ${TEST_DIR}"
    exit 1
fi

log_info "Test script ready. Preparing Playwright configuration..."

# Create playwright.config.js if it doesn't exist
if [ ! -f "${TEST_DIR}/playwright.config.js" ]; then
    log_info "Creating default playwright.config.js"
    cat > "${TEST_DIR}/playwright.config.js" << 'EOF'
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './',
  outputDir: process.env.RESULTS_DIR || './test-results',
  timeout: 30000,
  expect: {
    timeout: 5000
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: './test-results/html' }],
    ['json', { outputFile: './test-results/report.json' }],
    ['list']
  ],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...require('@playwright/test').devices['Desktop Chrome'] }
    },
    {
      name: 'firefox',
      use: { ...require('@playwright/test').devices['Desktop Firefox'] }
    },
    {
      name: 'webkit',
      use: { ...require('@playwright/test').devices['Desktop Safari'] }
    }
  ]
});
EOF
fi

# Change to test directory
cd "${TEST_DIR}"

log_info "Starting test execution..."

# Execute tests using the run-tests.sh script or directly
if [ -f /usr/local/bin/run-tests.sh ]; then
    exec /usr/local/bin/run-tests.sh "$@"
else
    # Fallback: run Playwright directly
    exec npx playwright test "$@" --reporter=json,html --output-dir="${RESULTS_DIR}"
fi
