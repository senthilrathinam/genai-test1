# AgentCore Web Fill Agent Setup

This guide explains how to set up the AgentCore agent for automated web form filling.

## Overview

The Web Fill Agent uses browser automation tools to:
1. Navigate to a grant application form URL
2. Match form fields with grant question/answer data
3. Fill the form fields automatically
4. Return a summary of what was filled (without submitting)

## Agent Configuration

### 1. Create the Agent

In the AWS Console → Bedrock → Agents:

**Agent Name:** `GrantFillerWebAgent`

**Agent Description:**
```
Automated web form filler for grant applications. Given a URL and structured grant data, 
navigates to the page, identifies form fields, and fills them with appropriate values.
```

### 2. Agent Instructions

```
You are a web form filling assistant. Your role is to:

1. Navigate to the provided URL using browser tools
2. Analyze the page structure and identify form fields (inputs, textareas, selects, radios, checkboxes)
3. Match form fields to the provided grant question/answer data based on:
   - Field labels
   - Field IDs and names
   - Field types
   - Semantic similarity
4. Fill each matched field with the corresponding answer value
5. DO NOT click submit buttons
6. Return a JSON summary with:
   - fieldsFilled: number of fields successfully filled
   - fieldsSkipped: number of fields that couldn't be matched
   - notes: any relevant observations
   - fieldMappingSamples: array of sample mappings showing question → selector → value

Example output format:
{
  "fieldsFilled": 7,
  "fieldsSkipped": 2,
  "notes": "Successfully filled most fields. Skipped 'budget_narrative' (no matching field found).",
  "fieldMappingSamples": [
    {
      "question": "Organization Name",
      "selector": "#org_name",
      "value": "Example Org"
    }
  ]
}
```

### 3. Required Tools

The agent needs browser automation capabilities. Configure these tools:

- **Web Navigation**: Navigate to URLs, wait for page load
- **DOM Query**: Query and inspect page elements
- **Form Interaction**: Fill text inputs, select dropdowns, check boxes, select radio buttons
- **Element Identification**: Find elements by ID, name, label text, or CSS selector

### 4. Model Selection

Recommended: **Claude 3.5 Sonnet** or **Claude 3 Opus**
- Good at understanding form semantics
- Reliable field matching
- Structured JSON output

### 5. Deploy the Agent

1. Save the agent configuration
2. Create an alias (e.g., `PROD` or `TEST`)
3. Note the Agent ID and Alias ID

## Environment Variables

Add to your `.env.local`:

```bash
AGENTCORE_WEBFILL_AGENT_ID=YOUR_AGENT_ID
AGENTCORE_WEBFILL_AGENT_ALIAS_ID=YOUR_ALIAS_ID
```

## Testing

### Test with Local Portal

1. Start the app: `npm run dev`
2. Create a grant with some responses
3. Click "Fill Grant Form on Website" on the review page
4. The agent will fill `http://localhost:3000/test-portal/basic-grant`
5. Check `/test-portal/submissions` after manually submitting to verify

### Test with External URL

1. Update a grant's `grant_url` to point to a real form
2. Click "Fill Grant Form on Website"
3. Agent will attempt to fill the external form
4. Check the browser logs for field mapping details

## Observability

The backend logs include:
- Grant ID being filled
- Target URL
- Number of responses being sent to agent
- Agent's response summary
- Field mapping samples

Check your terminal where `npm run dev` is running for detailed logs.

## Troubleshooting

**Agent returns 0 fields filled:**
- Check that the target URL is accessible
- Verify form fields have stable IDs or labels
- Review agent logs for field matching issues

**Agent times out:**
- Increase agent timeout in AWS Console
- Check if target site has anti-bot protection
- Verify network connectivity

**Fields filled incorrectly:**
- Review field mapping samples in response
- Adjust agent instructions for better matching
- Consider adding field hints to grant questions

## Next Steps

- Add support for multi-page forms
- Implement field validation before filling
- Add screenshot capture for debugging
- Support CAPTCHA handling
- Add retry logic for failed fills
