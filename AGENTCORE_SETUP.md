# AgentCore Setup Instructions

## Overview

This guide helps you create a minimal Bedrock Agent (AgentCore) for parsing grant questions from URLs.

## 1. Create the Agent

### Via AWS Console

1. Go to **Amazon Bedrock** → **Agents** → **Create Agent**

2. **Agent details:**
   - Agent name: `GrantParserAgent`
   - Description: `Extracts grant application questions from URLs`
   - User input: Enable

3. **Agent resource role:**
   - Create a new service role (auto-generated)

4. **Model selection:**
   - Select: `Claude 3.5 Sonnet` or `Claude Sonnet 4.5`

5. **Instructions for the Agent:**
```
You are a grant question parser. Your job is to extract grant application questions from web pages.

When given a URL:
1. Fetch the page content
2. Look for form fields, text areas, and question prompts
3. Extract all questions that applicants need to answer
4. Return ONLY a JSON array of question strings

Example output format:
["What is your organization's mission?", "How will you use the funds?", "What is your budget?"]

Be thorough but only extract actual questions, not navigation or metadata.
```

6. **Action groups:** Skip for now (we'll use built-in web fetch)

7. **Knowledge bases:** Skip

8. **Advanced prompts:** Skip (use defaults)

9. Click **Create Agent**

## 2. Create Agent Alias

1. After agent is created, go to **Aliases** tab
2. Click **Create alias**
3. Alias name: `prod` or `test`
4. Click **Create**
5. Note the **Alias ID** (e.g., `TSTALIASID`)

## 3. Prepare the Agent (Important!)

1. Go back to your agent
2. Click **Prepare** button (top right)
3. Wait for preparation to complete (~30 seconds)

**Note:** You must prepare the agent after any changes before it can be invoked.

## 4. Get Agent ID

1. In the agent details page, copy the **Agent ID**
2. It looks like: `ABCDEFGHIJ`

## 5. Configure IAM Permissions

Add these permissions to your AWS credentials:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeAgent"
      ],
      "Resource": "arn:aws:bedrock:us-east-1:*:agent/*"
    }
  ]
}
```

## 6. Update Environment Variables

Edit `.env.local`:

```bash
AGENTCORE_REGION=us-east-1
AGENTCORE_AGENT_ID=ABCDEFGHIJ  # Your agent ID
AGENTCORE_AGENT_ALIAS_ID=TSTALIASID  # Your alias ID
```

## 7. Install Dependencies

```bash
npm install
```

## 8. Test the Agent

### Via AWS Console (Recommended first test)

1. Go to your agent → **Test** tab
2. Enter: `Extract questions from https://example.com/grant-application`
3. Verify it returns a JSON array of questions

### Via Application

1. Start dev server: `npm run dev`
2. Create a new grant with a URL
3. Click "Parse Questions from Source"
4. Check server logs for any errors
5. Questions should appear on the review page

## Troubleshooting

### Agent not found error
- Verify `AGENTCORE_AGENT_ID` is correct
- Ensure agent is in the same region as `AGENTCORE_REGION`

### Agent not prepared error
- Click **Prepare** button in the agent console
- Wait for preparation to complete

### Permission denied error
- Check IAM permissions include `bedrock:InvokeAgent`
- Verify agent resource role has necessary permissions

### No questions returned
- Test agent in console first with a simple URL
- Check server logs for agent response
- Agent falls back to dummy questions on error

## Fallback Behavior

If AgentCore fails or is not configured, the app will:
1. Log the error
2. Return 3 default questions
3. Continue functioning normally

This ensures the app works even without AgentCore configured.

## Next Steps

Once question parsing works:
- Add more sophisticated parsing logic
- Handle file uploads (PDF/DOCX)
- Add web form filling capabilities
- Implement multi-step agent workflows
