#!/bin/bash
# Test Execution Script
# Runs Playwright tests with proper configuration and result handling

set -e

# Environment variables
# BASE_URL - Base URL for tests (optional)
# BROWSER - Browser to use: chromium, firefox, webkit, or all (default: all)
# HEADLESS - Run in headless mode: true/false (default: true)
# TIMEOUT - Test timeout in milliseconds (default: 30000)
# WORKERS - Number of workers (default: auto)
# RETRIES - Number of retries (default: 0)
# RESULTS_DIR - Results directory (default: /test-results)

RESULTS_DIR=${RESULTS_DIR:-/test-results}
BASE_URL=${BASE_URL:-http://localhost:3000}
HEADLESS=${HEADLESS:-true}
TIMEOUT=${TIMEOUT:-30000}
BROWSER=${BROWSER:-all}

echo "[TEST] Starting Playwright test execution"
echo "[TEST] Base URL: ${BASE_URL}"
echo "[TEST] Browser: ${BROWSER}"
echo "[TEST] Headless: ${HEADLESS}"
echo "[TEST] Results Directory: ${RESULTS_DIR}"

# Build Playwright command
PLAYWRIGHT_CMD="npx playwright test"

# Add browser filter if specified
if [ "${BROWSER}" != "all" ]; then
    PLAYWRIGHT_CMD="${PLAYWRIGHT_CMD} --project=${BROWSER}"
fi

# Add headless option
if [ "${HEADLESS}" = "true" ]; then
    export PLAYWRIGHT_HEADLESS=1
else
    export PLAYWRIGHT_HEADLESS=0
fi

# Add timeout
PLAYWRIGHT_CMD="${PLAYWRIGHT_CMD} --timeout=${TIMEOUT}"

# Add workers if specified
if [ -n "${WORKERS}" ]; then
    PLAYWRIGHT_CMD="${PLAYWRIGHT_CMD} --workers=${WORKERS}"
fi

# Add retries if specified
if [ -n "${RETRIES}" ]; then
    PLAYWRIGHT_CMD="${PLAYWRIGHT_CMD} --retries=${RETRIES}"
fi

# Add reporters
PLAYWRIGHT_CMD="${PLAYWRIGHT_CMD} --reporter=json,html,list"

# Add output directory
PLAYWRIGHT_CMD="${PLAYWRIGHT_CMD} --output-dir=${RESULTS_DIR}"

# Add any additional arguments passed to the script
if [ $# -gt 0 ]; then
    PLAYWRIGHT_CMD="${PLAYWRIGHT_CMD} $@"
fi

echo "[TEST] Executing: ${PLAYWRIGHT_CMD}"
echo ""

# Execute tests
EXIT_CODE=0
${PLAYWRIGHT_CMD} || EXIT_CODE=$?

echo ""
echo "[TEST] Test execution completed with exit code: ${EXIT_CODE}"

# List results
if [ -d "${RESULTS_DIR}" ]; then
    echo "[TEST] Results saved to: ${RESULTS_DIR}"
    echo "[TEST] Result files:"
    find "${RESULTS_DIR}" -type f | head -20
fi

# Exit with test exit code
exit ${EXIT_CODE}
