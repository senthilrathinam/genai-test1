import { BedrockAgentRuntimeClient, InvokeAgentCommand } from "@aws-sdk/client-bedrock-agent-runtime";
import { GrantApplicationInstance } from "@/types";

const client = new BedrockAgentRuntimeClient({
  region: "us-west-2", // Computer use only available in us-west-2
});

export interface WebFillResult {
  fieldsFilled: number;
  fieldsSkipped: number;
  notes: string;
  fieldMappingSamples?: Array<{
    question: string;
    selector: string;
    value: string;
  }>;
}

export async function runWebFillAgent(input: {
  targetUrl: string;
  grant: GrantApplicationInstance;
}): Promise<WebFillResult> {
  const agentId = process.env.AGENTCORE_WEBFILL_AGENT_ID;
  const agentAliasId = process.env.AGENTCORE_WEBFILL_AGENT_ALIAS_ID;

  if (!agentId || !agentAliasId) {
    throw new Error("AGENTCORE_WEBFILL_AGENT_ID and AGENTCORE_WEBFILL_AGENT_ALIAS_ID must be set");
  }

  const formData = input.grant.responses.map(r => ({
    question_text: r.question_text,
    type: r.type,
    options: r.options,
    answer: r.answer,
  }));

  const prompt = `Fill the web form at ${input.targetUrl} with the following grant application data:

${JSON.stringify(formData, null, 2)}

Instructions:
1. Navigate to the URL
2. Find matching form fields based on labels, IDs, or names
3. Fill each field with the corresponding answer
4. DO NOT click submit
5. Return a JSON summary with: fieldsFilled, fieldsSkipped, notes, and fieldMappingSamples`;

  console.log("AgentCore request:", { agentId, targetUrl: input.targetUrl, grantId: input.grant.grant_id });

  const command = new InvokeAgentCommand({
    agentId,
    agentAliasId,
    sessionId: `webfill-${input.grant.grant_id}-${Date.now()}`,
    inputText: prompt,
  });

  const response = await client.send(command);
  
  let fullResponse = "";
  if (response.completion) {
    for await (const event of response.completion) {
      if (event.chunk?.bytes) {
        const text = new TextDecoder().decode(event.chunk.bytes);
        fullResponse += text;
      }
    }
  }

  console.log("AgentCore response:", fullResponse.substring(0, 500));

  try {
    const jsonMatch = fullResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.error("Failed to parse AgentCore response as JSON:", e);
  }

  return {
    fieldsFilled: 0,
    fieldsSkipped: input.grant.responses.length,
    notes: `Agent response: ${fullResponse.substring(0, 200)}`,
  };
}
