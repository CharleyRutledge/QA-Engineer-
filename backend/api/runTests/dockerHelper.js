/**
 * Docker Execution Helper
 * 
 * Provides utilities for executing Playwright tests in Docker containers.
 * Supports both Docker API (dockerode) and Docker CLI execution.
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

const execAsync = promisify(exec);

/**
 * Executes a Docker container with Playwright test execution
 * @param {Object} options - Execution options
 * @param {string} options.containerImage - Docker image name (default: mcr.microsoft.com/playwright/python:v1.40.0)
 * @param {string} options.testScriptPath - Path to test script file (inside container or mounted)
 * @param {string} options.workingDir - Working directory inside container (default: /tests)
 * @param {string} options.outputDir - Directory for test results (default: /test-results)
 * @param {Object} options.envVars - Environment variables to pass to container
 * @param {Array} options.mounts - Volume mounts (optional)
 * @param {string} options.containerName - Custom container name (optional)
 * @returns {Promise<Object>} Execution result with exitCode, stdout, stderr, outputPath
 */
async function runTestsInContainer(options = {}) {
  const {
    containerImage = process.env.PLAYWRIGHT_DOCKER_IMAGE || 'mcr.microsoft.com/playwright/python:v1.40.0',
    testScriptPath,
    workingDir = '/tests',
    outputDir = '/test-results',
    envVars = {},
    mounts = [],
    containerName = `playwright-test-${Date.now()}`
  } = options;

  if (!testScriptPath) {
    throw new Error('Test script path is required');
  }

  // Build environment variables string
  const envString = Object.entries(envVars)
    .map(([key, value]) => `-e ${key}="${value}"`)
    .join(' ');

  // Build volume mounts string
  const mountString = mounts
    .map(mount => `-v "${mount.source}:${mount.target}"`)
    .join(' ');

  // Playwright command to run tests
  const testCommand = `npx playwright test ${testScriptPath} --reporter=json,html --output-dir=${outputDir}`;

  // Docker run command
  const dockerCommand = `docker run --rm --name ${containerName} ${envString} ${mountString} -w ${workingDir} ${containerImage} ${testCommand}`;

  try {
    const { stdout, stderr } = await execAsync(dockerCommand, {
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      timeout: 600000 // 10 minutes timeout
    });

    return {
      exitCode: 0,
      stdout,
      stderr,
      outputDir,
      containerName
    };
  } catch (error) {
    // Docker exec may throw even on test failures, check exit code
    const exitCode = error.code || 1;
    return {
      exitCode,
      stdout: error.stdout || '',
      stderr: error.stderr || error.message,
      outputDir,
      containerName
    };
  }
}

/**
 * Executes tests using Docker API (dockerode) - alternative approach
 * Requires dockerode package
 * @param {Object} options - Execution options
 * @param {string} options.testScriptContent - Test script content as string
 * @param {string} options.containerImage - Docker image name
 * @param {Object} options.envVars - Environment variables
 * @returns {Promise<Object>} Execution result
 */
async function runTestsWithDockerAPI(options = {}) {
  // This is an alternative implementation using dockerode
  // Uncomment and install dockerode if preferred over CLI
  /*
  const Docker = require('dockerode');
  const docker = new Docker();
  
  const {
    testScriptContent,
    containerImage = 'mcr.microsoft.com/playwright/python:v1.40.0',
    envVars = {}
  } = options;

  if (!testScriptContent) {
    throw new Error('Test script content is required');
  }

  // Create container
  const container = await docker.createContainer({
    Image: containerImage,
    Cmd: ['npx', 'playwright', 'test', '/test.spec.js', '--reporter=json,html'],
    Env: Object.entries(envVars).map(([k, v]) => `${k}=${v}`),
    WorkingDir: '/tests',
    HostConfig: {
      AutoRemove: true
    }
  });

  // Start container
  await container.start();

  // Wait for container to finish
  const result = await container.wait();

  // Get logs
  const logs = await container.logs({
    stdout: true,
    stderr: true
  });

  return {
    exitCode: result.StatusCode,
    logs: logs.toString(),
    containerId: container.id
  };
  */
  
  throw new Error('Docker API implementation requires dockerode package. Use runTestsInContainer instead.');
}

/**
 * Copies files from Docker container to host
 * @param {string} containerName - Container name or ID
 * @param {string} containerPath - Path inside container
 * @param {string} hostPath - Path on host
 * @returns {Promise<void>}
 */
async function copyFromContainer(containerName, containerPath, hostPath) {
  const command = `docker cp ${containerName}:${containerPath} ${hostPath}`;
  await execAsync(command);
}

/**
 * Executes tests with file mounting (recommended for Azure Functions)
 * Creates temporary directory, writes test script, mounts it, executes, copies results
 * @param {Object} options - Execution options
 * @param {string} options.testScriptContent - Test script content
 * @param {string} options.containerImage - Docker image name
 * @param {string} options.testFileName - Test file name (default: test.spec.js)
 * @param {Object} options.envVars - Environment variables
 * @returns {Promise<Object>} Execution result with resultsPath
 */
async function runTestsWithMount(options = {}) {
  const {
    testScriptContent,
    containerImage = process.env.PLAYWRIGHT_DOCKER_IMAGE || 'mcr.microsoft.com/playwright/python:v1.40.0',
    testFileName = 'test.spec.js',
    envVars = {}
  } = options;

  if (!testScriptContent) {
    throw new Error('Test script content is required');
  }

  // Create temporary directory
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'playwright-test-'));
  const testScriptPath = path.join(tempDir, testFileName);
  const resultsPath = path.join(tempDir, 'results');

  try {
    // Write test script
    await fs.writeFile(testScriptPath, testScriptContent, 'utf8');

    // Create results directory
    await fs.mkdir(resultsPath, { recursive: true });

    // Build environment variables
    const envString = Object.entries(envVars)
      .map(([key, value]) => `-e ${key}="${value}"`)
      .join(' ');

    const containerName = `playwright-test-${Date.now()}`;
    const containerTestPath = `/tests/${testFileName}`;
    const containerResultsPath = '/test-results';

    // Run Docker container with mounts
    const dockerCommand = `docker run --rm --name ${containerName} ` +
      `${envString} ` +
      `-v "${tempDir}:/tests" ` +
      `-v "${resultsPath}:${containerResultsPath}" ` +
      `-w /tests ` +
      `${containerImage} ` +
      `npx playwright test ${containerTestPath} --reporter=json,html --output-dir=${containerResultsPath}`;

    const { stdout, stderr } = await execAsync(dockerCommand, {
      maxBuffer: 10 * 1024 * 1024,
      timeout: 600000
    });

    // Read results
    const resultFiles = await fs.readdir(resultsPath).catch(() => []);
    const results = {
      exitCode: 0,
      stdout,
      stderr,
      resultsPath,
      resultFiles
    };

    return results;
  } catch (error) {
    const exitCode = error.code || 1;
    return {
      exitCode,
      stdout: error.stdout || '',
      stderr: error.stderr || error.message,
      resultsPath,
      resultFiles: []
    };
  } finally {
    // Cleanup temp directory (optional - might want to keep for debugging)
    // await fs.rm(tempDir, { recursive: true, force: true });
  }
}

module.exports = {
  runTestsInContainer,
  runTestsWithDockerAPI,
  copyFromContainer,
  runTestsWithMount
};
