# Playwright Test Runner Docker Image

Docker image for executing Playwright test scripts with support for Chromium, Firefox, and WebKit browsers.

## Features

- Node.js 20 runtime
- Playwright with Chromium, Firefox, and WebKit browsers
- Support for downloading test scripts from Azure Blob Storage
- Configurable test execution options
- Comprehensive result generation (JSON, HTML reports, screenshots)

## Building the Image

```bash
docker build -t playwright-runner:latest .
```

## Usage

### Basic Usage

Run tests with a mounted test file:

```bash
docker run --rm \
  -v $(pwd)/tests:/tests \
  -v $(pwd)/results:/test-results \
  playwright-runner:latest
```

### With Blob Storage Download

Download test script from Azure Blob Storage:

```bash
docker run --rm \
  -e AZURE_STORAGE_CONNECTION_STRING="your-connection-string" \
  -e STORAGE_CONTAINER_NAME="test-scripts" \
  -e TEST_SCRIPT_BLOB_NAME="test-id/test.spec.js" \
  -e TEST_ID="test-id" \
  -v $(pwd)/results:/test-results \
  playwright-runner:latest
```

### With Direct Blob URL

Use a direct blob URL (requires SAS token or public access):

```bash
docker run --rm \
  -e TEST_SCRIPT_BLOB_URL="https://storage.../test.spec.js?sas-token" \
  -e TEST_ID="test-id" \
  -v $(pwd)/results:/test-results \
  playwright-runner:latest
```

### With Test Script Content

Pass test script as environment variable:

```bash
docker run --rm \
  -e TEST_SCRIPT_CONTENT="$(cat test.spec.js)" \
  -e TEST_ID="test-id" \
  -v $(pwd)/results:/test-results \
  playwright-runner:latest
```

## Environment Variables

### Required (one of the following)

- `TEST_SCRIPT_BLOB_URL` - Direct URL to test script blob
- `TEST_SCRIPT_BLOB_NAME` - Blob name (requires `STORAGE_CONTAINER_NAME`)
- `TEST_SCRIPT_CONTENT` - Test script content as string
- Mount test files to `/tests` directory

### Optional

- `AZURE_STORAGE_CONNECTION_STRING` - Azure Storage connection string (for blob download)
- `STORAGE_CONTAINER_NAME` - Container name (default: `test-scripts`)
- `TEST_ID` - Test ID for tracking
- `RESULTS_DIR` - Results directory (default: `/test-results`)
- `TEST_DIR` - Test directory (default: `/tests`)
- `BASE_URL` - Base URL for tests (default: `http://localhost:3000`)
- `BROWSER` - Browser to use: `chromium`, `firefox`, `webkit`, or `all` (default: `all`)
- `HEADLESS` - Run in headless mode: `true`/`false` (default: `true`)
- `TIMEOUT` - Test timeout in milliseconds (default: `30000`)
- `WORKERS` - Number of workers (default: auto)
- `RETRIES` - Number of retries (default: `0`)

## Test Execution Options

### Run Specific Browser

```bash
docker run --rm \
  -e BROWSER=chromium \
  -v $(pwd)/tests:/tests \
  -v $(pwd)/results:/test-results \
  playwright-runner:latest
```

### Run with Headed Browser (for debugging)

```bash
docker run --rm \
  -e HEADLESS=false \
  -e DISPLAY=:99 \
  -v $(pwd)/tests:/tests \
  -v $(pwd)/results:/test-results \
  playwright-runner:latest
```

### Custom Timeout and Retries

```bash
docker run --rm \
  -e TIMEOUT=60000 \
  -e RETRIES=2 \
  -v $(pwd)/tests:/tests \
  -v $(pwd)/results:/test-results \
  playwright-runner:latest
```

## Output

Test results are saved to the `/test-results` directory (or `RESULTS_DIR` if specified):

- `report.json` - JSON test report
- `html/index.html` - HTML test report
- Screenshots (on failure)
- Videos (on failure, if configured)
- Traces (on retry, if configured)

## Integration with Azure Functions

This image is designed to work with the `runTests` Azure Function:

1. Azure Function downloads test script from blob storage
2. Test script is mounted or passed to container
3. Container executes tests
4. Results are collected and uploaded back to blob storage

## Prerequisites

- Docker installed and running
- Azure CLI (optional, for blob download via CLI)
- Sufficient disk space for browsers (~2GB)

## Troubleshooting

### Browser Installation Issues

If browsers fail to install, ensure sufficient disk space and network connectivity:

```bash
docker run --rm playwright-runner:latest npx playwright install --with-deps
```

### Permission Issues

Ensure the container has write access to the results directory:

```bash
docker run --rm \
  -u $(id -u):$(id -g) \
  -v $(pwd)/results:/test-results \
  playwright-runner:latest
```

### Network Issues

If tests need to access external URLs, ensure the container has network access:

```bash
docker run --rm \
  --network host \
  -v $(pwd)/tests:/tests \
  playwright-runner:latest
```

## Sample Test Script

See `sample-test.spec.js` for a reference test script structure.

## License

ISC
