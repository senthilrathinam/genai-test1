import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { GrantResponse } from '@/types';

const client = new BedrockRuntimeClient({
  region: process.env.BEDROCK_REGION || 'us-east-1',
});

export const MODEL_ID = process.env.BEDROCK_MODEL_ID || 'us.anthropic.claude-sonnet-4-5-20250929-v1:0';

export async function generateAnswer(
  question: GrantResponse, 
  orgProfile: any
): Promise<{ answer: string | string[]; needsManualInput: boolean }> {
  const { question_text, type, options } = question;

  const effectiveOptions = type === 'yes_no' ? ['Yes', 'No'] : options;

  let prompt = `You are helping draft a grant application answer based on the organization's profile information.

Organization Profile:
- Legal Name: ${orgProfile.legal_name || 'Not provided'}
- Mission: ${orgProfile.mission_short || 'Not provided'}
${orgProfile.mission_long ? `- Detailed Mission: ${orgProfile.mission_long}` : ''}
${orgProfile.address ? `- Address: ${orgProfile.address}` : ''}`;

  if (orgProfile.extra_sections && orgProfile.extra_sections.length > 0) {
    prompt += `\n\nAdditional Information:`;
    for (const section of orgProfile.extra_sections) {
      if (section.title && section.content) {
        const truncatedContent = section.content.length > 800 
          ? section.content.substring(0, 800) + '...' 
          : section.content;
        prompt += `\n\n${section.title}:\n${truncatedContent}`;
      }
    }
  }

  prompt += `\n\nQuestion: ${question_text}
Question Type: ${type}`;

  if (effectiveOptions && effectiveOptions.length > 0) {
    prompt += `\nAvailable Options:\n${effectiveOptions.map((o, i) => `${i + 1}. ${o}`).join('\n')}`;
  }

  prompt += `\n\nRULES:
- Answer directly as if you are the organization filling out this application
- For factual questions (names, numbers, dates, contact info, EIN, specific amounts): respond "INSUFFICIENT_INFO" if not explicitly stated
- For descriptive questions: craft answers based on the mission and information provided
- Do NOT include meta-commentary like "based on the profile" or "according to the information"
- Do NOT invent specific facts, numbers, dates, names, or contact information
- Write in first person as the organization (e.g., "Our mission is..." not "The organization's mission is...")`;

  if (type === 'single_choice') {
    prompt += `\n\nIf you can answer: Select EXACTLY ONE option. Return ONLY the exact option text, nothing else.
If you cannot answer: Respond with "INSUFFICIENT_INFO"`;
  } else if (type === 'multi_choice') {
    prompt += `\n\nIf you can answer: Select one or more options. Return ONLY a JSON array: ["Option 1","Option 2"]
If you cannot answer: Respond with "INSUFFICIENT_INFO"`;
  } else if (type === 'yes_no') {
    prompt += `\n\nIf you can answer: Respond with EXACTLY "Yes" or "No", nothing else.
If you cannot answer: Respond with "INSUFFICIENT_INFO"`;
  } else if (type === 'number') {
    prompt += `\n\nIf you have the exact number: Provide ONLY the numeric value, nothing else.
If you do not have the exact number: Respond with "INSUFFICIENT_INFO"`;
  } else if (type === 'date') {
    prompt += `\n\nIf you have the date: Provide in YYYY-MM-DD format only.
If you do not have the date: Respond with "INSUFFICIENT_INFO"`;
  } else {
    prompt += `\n\nIf you can answer: Write a direct, professional response as the organization. No meta-commentary.
If you lack relevant information: Respond with "INSUFFICIENT_INFO"`;
  }

  const payload = {
    anthropic_version: "bedrock-2023-05-31",
    max_tokens: 4000,
    messages: [{ role: "user", content: prompt }]
  };

  try {
    const command = new InvokeModelCommand({
      modelId: MODEL_ID,
      body: JSON.stringify(payload),
    });

    const response = await client.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    const text = responseBody.content[0].text.trim();

    const isInsufficient = text === 'INSUFFICIENT_INFO' || 
                          text.toUpperCase() === 'INSUFFICIENT_INFO' ||
                          (text.length < 50 && text.toUpperCase().includes('INSUFFICIENT'));

    if (isInsufficient) {
      return { 
        answer: type === 'multi_choice' ? [] : '', 
        needsManualInput: true 
      };
    }

    if (type === 'multi_choice') {
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const validated = parsed.filter((opt: string) => effectiveOptions?.includes(opt));
        return { answer: validated, needsManualInput: false };
      }
      return { answer: [], needsManualInput: true };
    }

    if (type === 'single_choice' || type === 'yes_no') {
      const match = effectiveOptions?.find(opt => 
        text.toLowerCase().includes(opt.toLowerCase())
      );
      return { 
        answer: match || text, 
        needsManualInput: !match 
      };
    }

    return { answer: text, needsManualInput: false };
  } catch (error) {
    console.error('Bedrock error:', error);
    throw new Error(`Failed to generate answer: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
