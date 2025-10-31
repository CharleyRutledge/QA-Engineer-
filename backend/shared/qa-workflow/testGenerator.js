/**
 * Test Generator
 * 
 * Generates exploratory test scenarios and Playwright test scripts
 * using OpenAI/Azure OpenAI based on work item details.
 */

const { OpenAI } = require('openai');

/**
 * Gets OpenAI client instance
 * @returns {OpenAI} OpenAI client
 */
function getOpenAIClient() {
  const azureEndpoint = process.env.AZURE_OPENAI_ENDPOINT || process.env.OPENAI_API_ENDPOINT;
  const azureApiKey = process.env.AZURE_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
  const model = process.env.AZURE_OPENAI_MODEL || process.env.OPENAI_MODEL || 'gpt-4';

  if (!azureApiKey) {
    throw new Error('OpenAI API key is required');
  }

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

  return new OpenAI({
    apiKey: azureApiKey
  });
}

/**
 * Generates exploratory test scenarios
 * @param {Object} workItem - Work item object
 * @returns {Promise<Array>} Array of exploratory scenarios
 */
async function generateExploratoryScenarios(workItem) {
  const client = getOpenAIClient();
  const model = process.env.AZURE_OPENAI_MODEL || process.env.OPENAI_MODEL || 'gpt-4';

  const prompt = `You are an expert QA engineer. Generate 3-5 concise exploratory test scenarios for the following work item.

Work Item Title: ${workItem.title}
Description: ${workItem.description || 'No description'}
Acceptance Criteria: ${workItem.acceptanceCriteria || 'No acceptance criteria'}
Work Item Type: ${workItem.workItemType}

Requirements:
1. Focus on edge cases and risk-based testing
2. Each scenario should be human-readable and concise (1-2 sentences)
3. Consider boundary conditions, error handling, and user workflows
4. Prioritize scenarios by risk level

Return ONLY a JSON array of scenario strings, no additional text:
["Scenario 1 description", "Scenario 2 description", ...]`;

  try {
    const completion = await client.chat.completions.create({
      model: model,
      messages: [
        {
          role: 'system',
          content: 'You are an expert QA engineer. Always respond with valid JSON arrays.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1000,
      response_format: { type: 'json_object' }
    });

    const responseContent = completion.choices[0].message.content;
    let result;

    try {
      result = JSON.parse(responseContent);
    } catch (parseError) {
      // Try to extract array from response
      const arrayMatch = responseContent.match(/\[[\s\S]*\]/);
      if (arrayMatch) {
        result = { scenarios: JSON.parse(arrayMatch[0]) };
      } else {
        throw new Error(`Failed to parse scenarios: ${parseError.message}`);
      }
    }

    return Array.isArray(result.scenarios) ? result.scenarios : 
           Array.isArray(result) ? result : 
           [];
  } catch (error) {
    throw new Error(`Failed to generate exploratory scenarios: ${error.message}`);
  }
}

/**
 * Generates Playwright test script for the most critical scenario
 * @param {Object} workItem - Work item object
 * @param {Array} scenarios - Array of exploratory scenarios
 * @returns {Promise<string>} Playwright test script as string
 */
async function generatePlaywrightTestScript(workItem, scenarios) {
  const client = getOpenAIClient();
  const model = process.env.AZURE_OPENAI_MODEL || process.env.OPENAI_MODEL || 'gpt-4';

  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  const criticalScenario = scenarios && scenarios.length > 0 ? scenarios[0] : 'Test the main functionality';

  const prompt = `You are an expert QA engineer specializing in Playwright test automation. Generate a complete Playwright test script for the following work item.

Work Item Title: ${workItem.title}
Description: ${workItem.description || 'No description'}
Acceptance Criteria: ${workItem.acceptanceCriteria || 'No acceptance criteria'}
Critical Scenario: ${criticalScenario}
Base URL: ${baseUrl}

Requirements:
1. Generate valid JavaScript Playwright test code
2. Include proper imports and setup
3. Test the most critical scenario from the scenarios list
4. Include screenshot capture on failure and success
5. Include console logging for debugging
6. Use proper selectors and waits
7. Include assertions
8. Handle async operations correctly
9. Add descriptive test names and comments
10. Include error handling

Generate the complete test file. Start directly with the code, including necessary imports.`;

  try {
    const completion = await client.chat.completions.create({
      model: model,
      messages: [
        {
          role: 'system',
          content: 'You are an expert QA engineer specializing in Playwright test automation. Generate complete, executable Playwright test scripts in JavaScript.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 3000
    });

    let testScript = completion.choices[0].message.content.trim();

    // Remove markdown code blocks if present
    const codeBlockMatch = testScript.match(/```(?:javascript|typescript|js|ts)?\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch) {
      testScript = codeBlockMatch[1].trim();
    }

    // Ensure proper imports if missing
    if (!testScript.includes('require') && !testScript.includes('import')) {
      testScript = `const { test, expect } = require('@playwright/test');\n\n${testScript}`;
    }

    return testScript;
  } catch (error) {
    throw new Error(`Failed to generate Playwright test script: ${error.message}`);
  }
}

module.exports = {
  generateExploratoryScenarios,
  generatePlaywrightTestScript
};
