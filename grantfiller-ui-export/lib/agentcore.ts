import { BedrockAgentRuntimeClient, InvokeAgentCommand } from '@aws-sdk/client-bedrock-agent-runtime';

const client = new BedrockAgentRuntimeClient({
  region: process.env.AGENTCORE_REGION || 'us-east-1',
});

const AGENT_ID = process.env.AGENTCORE_AGENT_ID || '';
const AGENT_ALIAS_ID = process.env.AGENTCORE_AGENT_ALIAS_ID || 'TSTALIASID';

export async function parseGrantQuestions(grantUrl: string): Promise<string[]> {
  // If agent not configured, return fallback immediately
  if (!AGENT_ID) {
    console.warn('AgentCore not configured, using fallback questions');
    return getFallbackQuestions();
  }

  const prompt = `Extract the EXACT grant application questions from this URL: ${grantUrl}

Visit the URL and find all questions applicants must answer. Return ONLY a JSON array of question strings.

Example: ["Question 1 text here", "Question 2 text here"]`;

  try {
    console.log('Calling AgentCore with agent ID:', AGENT_ID);
    
    const command = new InvokeAgentCommand({
      agentId: AGENT_ID,
      agentAliasId: AGENT_ALIAS_ID,
      sessionId: `parse-${Date.now()}`,
      inputText: prompt,
    });

    const response = await client.send(command);
    
    // Parse streaming response
    let fullResponse = '';
    if (response.completion) {
      for await (const event of response.completion) {
        if (event.chunk?.bytes) {
          const text = new TextDecoder().decode(event.chunk.bytes);
          fullResponse += text;
        }
      }
    }

    console.log('Agent full response:', fullResponse);

    // Try to extract JSON array
    const jsonMatch = fullResponse.match(/\[[\s\S]*?\]/);
    if (jsonMatch) {
      try {
        const questions = JSON.parse(jsonMatch[0]);
        if (Array.isArray(questions) && questions.length > 0) {
          console.log('Successfully parsed', questions.length, 'questions');
          return questions;
        }
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
      }
    }

    console.warn('Could not extract questions from agent response, using fallback');
    return getFallbackQuestions();
  } catch (error: any) {
    console.error('AgentCore error:', error.message || error);
    return getFallbackQuestions();
  }
}

function getFallbackQuestions(): string[] {
  return [
    'Describe your organization and its mission.',
    'What is the purpose of this grant request?',
    'How will the funds be used?',
  ];
}
