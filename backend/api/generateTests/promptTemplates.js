/**
 * Prompt Templates for Test Generation
 * 
 * Contains templates for generating Playwright test scripts and exploratory scenarios
 * using OpenAI/Azure OpenAI.
 */

/**
 * Generates the main prompt for creating Playwright test scripts
 * @param {Object} workItem - Work item data from queue
 * @param {string} workItem.title - Title of the work item
 * @param {string} workItem.description - Description of the work item
 * @param {string} workItem.url - URL of the application/page to test (optional)
 * @param {Object} workItem.metadata - Additional metadata (optional)
 * @returns {string} Formatted prompt for OpenAI
 */
function generateTestScriptPrompt(workItem) {
  const title = workItem.title || 'Unknown Feature';
  const description = workItem.description || 'No description provided';
  const url = workItem.url || 'Not specified';

  return `You are an expert QA engineer specializing in Playwright test automation. Generate comprehensive Playwright test scripts based on the following work item:

Work Item Title: ${title}
Description: ${description}
Target URL: ${url}

Requirements:
1. Generate a complete Playwright test script in JavaScript/TypeScript
2. Include proper imports and setup
3. Use Playwright best practices (page object model where appropriate, proper selectors, waits)
4. Include multiple test cases covering:
   - Happy path scenarios
   - Edge cases
   - Error handling
   - Form validations (if applicable)
   - Navigation flows (if applicable)
5. Add descriptive test names and comments
6. Include proper assertions
7. Handle async operations correctly
8. Make tests independent and idempotent where possible

Generate the complete Playwright test file. Start directly with the code, including necessary imports and configuration.`;
}

/**
 * Generates the prompt for creating exploratory test scenarios
 * @param {Object} workItem - Work item data from queue
 * @param {string} workItem.title - Title of the work item
 * @param {string} workItem.description - Description of the work item
 * @param {string} workItem.url - URL of the application/page to test (optional)
 * @returns {string} Formatted prompt for OpenAI
 */
function generateExploratoryScenariosPrompt(workItem) {
  const title = workItem.title || 'Unknown Feature';
  const description = workItem.description || 'No description provided';
  const url = workItem.url || 'Not specified';

  return `You are an expert QA engineer. Generate exploratory test scenarios based on the following work item:

Work Item Title: ${title}
Description: ${description}
Target URL: ${url}

Generate a comprehensive list of exploratory test scenarios that a QA engineer should explore manually. For each scenario, provide:
1. Scenario title
2. Brief description
3. Key areas to investigate
4. Potential edge cases or risks

Format the output as a JSON array with the following structure:
[
  {
    "title": "Scenario title",
    "description": "What to test",
    "focusAreas": ["area1", "area2"],
    "riskLevel": "low|medium|high"
  }
]

Return only valid JSON, no additional text or markdown formatting.`;
}

/**
 * Generates a combined prompt for both test scripts and scenarios
 * @param {Object} workItem - Work item data from queue
 * @returns {string} Formatted prompt for OpenAI
 */
function generateCombinedPrompt(workItem) {
  const title = workItem.title || 'Unknown Feature';
  const description = workItem.description || 'No description provided';
  const url = workItem.url || 'Not specified';

  return `You are an expert QA engineer specializing in Playwright test automation and exploratory testing.

Work Item Details:
- Title: ${title}
- Description: ${description}
- Target URL: ${url}

Task 1: Generate Playwright Test Script
Create a complete Playwright test script in JavaScript/TypeScript that includes:
- Proper imports and setup
- Multiple test cases (happy path, edge cases, error handling)
- Best practices (proper selectors, waits, assertions)
- Descriptive test names and comments
- Proper async handling

Task 2: Generate Exploratory Test Scenarios
Create a list of exploratory test scenarios as a JSON array with this structure:
[
  {
    "title": "Scenario title",
    "description": "What to test",
    "focusAreas": ["area1", "area2"],
    "riskLevel": "low|medium|high"
  }
]

Format your response as JSON:
{
  "testScript": "complete Playwright test code here",
  "scenarios": [array of scenario objects]
}

Return only valid JSON.`;
}

module.exports = {
  generateTestScriptPrompt,
  generateExploratoryScenariosPrompt,
  generateCombinedPrompt
};
