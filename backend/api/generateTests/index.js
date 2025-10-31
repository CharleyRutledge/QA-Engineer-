/**
 * Azure Function: Generate Tests
 * 
 * Triggered by Azure Storage Queue messages.
 * Generates Playwright test scripts and exploratory scenarios using OpenAI/Azure OpenAI.
 * Stores results in Azure Blob Storage.
 * 
 * Queue Message Format:
 * {
 *   "workItemId": "string",
 *   "title": "string",
 *   "description": "string",
 *   "url": "string (optional)",
 *   "metadata": {} (optional)
 * }
 * 
 * Environment Variables Required:
 * - AZURE_STORAGE_CONNECTION_STRING: Azure Storage connection string
 * - OPENAI_API_KEY or AZURE_OPENAI_API_KEY: OpenAI API key
 * - OPENAI_API_ENDPOINT or AZURE_OPENAI_ENDPOINT: Azure OpenAI endpoint (if using Azure OpenAI)
 * - OPENAI_MODEL or AZURE_OPENAI_MODEL: Model name (default: gpt-4)
 * - STORAGE_CONTAINER_NAME: Container name for storing test scripts (default: test-scripts)
 */

const { v4: uuidv4 } = require('uuid');
const { OpenAI } = require('openai');
const storageHelper = require('../../shared/storage');
const promptTemplates = require('./promptTemplates');

/**
 * Gets OpenAI client instance (supports both OpenAI and Azure OpenAI)
 * @returns {OpenAI} OpenAI client instance
 */
function getOpenAIClient() {
  // Check for Azure OpenAI configuration first
  const azureEndpoint = process.env.AZURE_OPENAI_ENDPOINT || process.env.OPENAI_API_ENDPOINT;
  const azureApiKey = process.env.AZURE_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
  const model = process.env.AZURE_OPENAI_MODEL || process.env.OPENAI_MODEL || 'gpt-4';

  if (!azureApiKey) {
    throw new Error('OpenAI API key is required. Set OPENAI_API_KEY or AZURE_OPENAI_API_KEY environment variable.');
  }

  // If Azure OpenAI endpoint is provided, use Azure OpenAI
  if (azureEndpoint) {
    return new OpenAI({
      apiKey: azureApiKey,
      baseURL: `${azureEndpoint}/openai/deployments/${model}`,
      defaultQuery: { 'api-version': '2023-05-15' },
      defaultHeaders: {
        'api-key': azureApiKey
      }
    });
  }

  // Otherwise use standard OpenAI
  return new OpenAI({
    apiKey: azureApiKey
  });
}

/**
 * Generates test script and scenarios using OpenAI
 * @param {Object} workItem - Work item data
 * @returns {Promise<Object>} Object with testScript and scenarios
 */
async function generateTestsWithAI(workItem) {
  const client = getOpenAIClient();
  const model = process.env.AZURE_OPENAI_MODEL || process.env.OPENAI_MODEL || 'gpt-4';

  // Use combined prompt for efficiency
  const prompt = promptTemplates.generateCombinedPrompt(workItem);

  try {
    const completion = await client.chat.completions.create({
      model: model,
      messages: [
        {
          role: 'system',
          content: 'You are an expert QA engineer specializing in Playwright test automation and exploratory testing. Always respond with valid JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 4000,
      response_format: { type: 'json_object' }
    });

    const responseContent = completion.choices[0].message.content;
    let result;

    try {
      result = JSON.parse(responseContent);
    } catch (parseError) {
      // If JSON parsing fails, try to extract JSON from markdown code blocks
      const jsonMatch = responseContent.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[1]);
      } else {
        throw new Error(`Failed to parse AI response as JSON: ${parseError.message}`);
      }
    }

    // Ensure we have the expected structure
    if (!result.testScript && !result.scenarios) {
      // Fallback: if structure is different, try to extract what we need
      result = {
        testScript: result.testScript || result.script || '',
        scenarios: result.scenarios || result.exploratoryScenarios || []
      };
    }

    return {
      testScript: result.testScript || '',
      scenarios: Array.isArray(result.scenarios) ? result.scenarios : []
    };
  } catch (error) {
    throw new Error(`Failed to generate tests with AI: ${error.message}`);
  }
}

/**
 * Generates tests separately (test script and scenarios)
 * @param {Object} workItem - Work item data
 * @returns {Promise<Object>} Object with testScript and scenarios
 */
async function generateTestsSeparately(workItem) {
  const client = getOpenAIClient();
  const model = process.env.AZURE_OPENAI_MODEL || process.env.OPENAI_MODEL || 'gpt-4';

  // Generate test script
  const scriptPrompt = promptTemplates.generateTestScriptPrompt(workItem);
  const scriptCompletion = await client.chat.completions.create({
    model: model,
    messages: [
      {
        role: 'system',
        content: 'You are an expert QA engineer specializing in Playwright test automation. Generate complete, executable Playwright test scripts.'
      },
      {
        role: 'user',
        content: scriptPrompt
      }
    ],
    temperature: 0.7,
    max_tokens: 3000
  });

  const testScript = scriptCompletion.choices[0].message.content.trim();

  // Generate exploratory scenarios
  const scenariosPrompt = promptTemplates.generateExploratoryScenariosPrompt(workItem);
  const scenariosCompletion = await client.chat.completions.create({
    model: model,
    messages: [
      {
        role: 'system',
        content: 'You are an expert QA engineer. Generate exploratory test scenarios as a JSON array.'
      },
      {
        role: 'user',
        content: scenariosPrompt
      }
    ],
    temperature: 0.7,
    max_tokens: 2000,
    response_format: { type: 'json_object' }
  });

  let scenarios = [];
  try {
    const scenariosContent = scenariosCompletion.choices[0].message.content;
    const parsed = JSON.parse(scenariosContent);
    scenarios = Array.isArray(parsed) ? parsed : (parsed.scenarios || []);
  } catch (error) {
    // Try to extract JSON array from response
    const jsonMatch = scenariosCompletion.choices[0].message.content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      scenarios = JSON.parse(jsonMatch[0]);
    }
  }

  return {
    testScript,
    scenarios
  };
}

/**
 * Main Azure Function entry point
 * @param {Object} context - Azure Functions context
 * @param {Object} queueItem - Queue message item
 */
module.exports = async function (context, queueItem) {
  const startTime = Date.now();
  context.log('GenerateTests function triggered');

  try {
    // Validate queue item
    if (!queueItem) {
      throw new Error('Queue item is required');
    }

    const workItemId = queueItem.workItemId || queueItem.id || uuidv4();
    const testId = uuidv4();
    context.log(`Processing work item: ${workItemId}, Test ID: ${testId}`);

    // Extract work item data
    const workItem = {
      id: workItemId,
      title: queueItem.title || 'Untitled Work Item',
      description: queueItem.description || '',
      url: queueItem.url || queueItem.targetUrl || '',
      metadata: queueItem.metadata || {}
    };

    // Generate tests using AI
    context.log('Generating tests with AI...');
    let testResults;
    
    try {
      // Try combined approach first
      testResults = await generateTestsWithAI(workItem);
    } catch (error) {
      context.log(`Combined generation failed, trying separate generation: ${error.message}`);
      // Fallback to separate generation
      testResults = await generateTestsSeparately(workItem);
    }

    // Clean up test script (remove markdown code blocks if present)
    let testScript = testResults.testScript;
    const codeBlockMatch = testScript.match(/```(?:javascript|typescript|js|ts)?\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch) {
      testScript = codeBlockMatch[1].trim();
    }

    // Ensure scenarios is an array
    const scenarios = Array.isArray(testResults.scenarios) ? testResults.scenarios : [];

    // Store test script in blob storage
    const containerName = process.env.STORAGE_CONTAINER_NAME || 'test-scripts';
    const blobName = `${testId}/test.spec.js`;
    
    context.log(`Uploading test script to blob storage: ${containerName}/${blobName}`);
    const uploadResult = await storageHelper.uploadBlob(
      containerName,
      blobName,
      Buffer.from(testScript, 'utf8'),
      {
        contentType: 'application/javascript',
        metadata: {
          testId: testId,
          workItemId: workItemId,
          generatedAt: new Date().toISOString()
        }
      }
    );

    // Prepare response
    const response = {
      testId: testId,
      workItemId: workItemId,
      scenarios: scenarios,
      scriptBlobUrl: uploadResult.url,
      scriptBlobName: blobName,
      containerName: containerName,
      generatedAt: new Date().toISOString(),
      generationTimeMs: Date.now() - startTime
    };

    context.log(`Test generation completed successfully. Test ID: ${testId}`);
    context.log(`Generated ${scenarios.length} exploratory scenarios`);
    context.log(`Script stored at: ${uploadResult.url}`);

    return response;

  } catch (error) {
    context.log.error(`Error in GenerateTests function: ${error.message}`);
    context.log.error(error.stack);
    
    // Return error response
    return {
      error: true,
      message: error.message,
      testId: context.bindingData.testId || uuidv4(),
      generatedAt: new Date().toISOString()
    };
  }
};
