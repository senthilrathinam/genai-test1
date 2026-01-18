import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { GrantResponse, QuestionType } from '@/types';
import crypto from 'crypto';

const bedrockClient = new BedrockRuntimeClient({
  region: process.env.BEDROCK_REGION || 'us-east-1',
});

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
});

const MODEL_ID = process.env.BEDROCK_MODEL_ID || 'us.anthropic.claude-sonnet-4-5-20250929-v1:0';
const BUCKET = process.env.S3_BUCKET || '';

function safeParseQuestionArray(raw: string): any[] {
  try {
    return JSON.parse(raw);
  } catch (error) {
    console.log('Initial JSON parse failed, attempting repair...');
    try {
      const startIdx = raw.indexOf('[');
      if (startIdx === -1) throw new Error('No opening bracket found');
      
      const lastBrace = raw.lastIndexOf('}');
      if (lastBrace === -1) throw new Error('No closing brace found');
      
      const repaired = raw.slice(startIdx, lastBrace + 1) + ']';
      return JSON.parse(repaired);
    } catch (repairError) {
      console.error('JSON repair failed:', repairError);
      throw repairError;
    }
  }
}

export async function parseDocumentQuestions(s3Key: string, fileType: string): Promise<GrantResponse[]> {
  try {
    console.log('Fetching document from S3:', s3Key);

    const s3Response = await s3Client.send(new GetObjectCommand({
      Bucket: BUCKET,
      Key: s3Key,
    }));

    const documentBytes = await s3Response.Body?.transformToByteArray();
    if (!documentBytes) {
      throw new Error('Failed to read document from S3');
    }

    const base64Document = Buffer.from(documentBytes).toString('base64');
    const mediaType = fileType === 'application/pdf' ? 'application/pdf' : 
                      'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

    const prompt = `Analyze this grant application document and extract ALL questions from ALL pages with their types.

IMPORTANT: This document may have multiple pages. Scan the ENTIRE document from first page to last page.

For each question, determine:
1. question_text: The exact question text
2. type: one of: text, textarea, single_choice, multi_choice, yes_no, number, date
3. options: array of choices (for single_choice, multi_choice, yes_no) - keep each option under 80 characters
4. required: if marked as required
5. char_limit: if a character/word limit is mentioned

CRITICAL: Return ONLY the JSON array. No markdown, no code fences, no text before or after. Just the raw JSON array starting with [ and ending with ].

Example format:
[{"question_text":"Organization name","type":"text","required":true},{"question_text":"Select your organization type","type":"single_choice","options":["Nonprofit","For-profit","Government"]},{"question_text":"Describe your project (max 500 words)","type":"textarea","char_limit":500}]`;

    const payload = {
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: 16000,
      messages: [{
        role: "user",
        content: [
          {
            type: "document",
            source: {
              type: "base64",
              media_type: mediaType,
              data: base64Document
            }
          },
          { type: "text", text: prompt }
        ]
      }]
    };

    const command = new InvokeModelCommand({
      modelId: MODEL_ID,
      body: JSON.stringify(payload),
    });

    console.log('Invoking Bedrock model for document parsing...');
    const response = await bedrockClient.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    
    if (!responseBody.content || !responseBody.content[0]) {
      throw new Error('Invalid response from Bedrock');
    }
    
    const text = responseBody.content[0].text;
    console.log('Document parser response:', text.substring(0, 500));

    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error('No JSON array found in response');
      return getFallbackQuestions();
    }

    let parsed;
    try {
      parsed = safeParseQuestionArray(jsonMatch[0]);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Attempted to parse:', jsonMatch[0].substring(0, 1000));
      return getFallbackQuestions();
    }

    if (!Array.isArray(parsed)) {
      console.error('Parsed result is not an array');
      return getFallbackQuestions();
    }

    console.log(`Successfully parsed ${parsed.length} questions after repair`);

    return parsed.map((q: any) => ({
      question_id: crypto.randomUUID(),
      question_text: q.question_text || 'Untitled Question',
      type: (q.type || 'textarea') as QuestionType,
      options: q.options,
      answer: q.type === 'multi_choice' ? [] : '',
      required: q.required || false,
      char_limit: q.char_limit,
      reviewed: false,
    }));
  } catch (error) {
    console.error('Document parsing error:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      console.error('Stack:', error.stack);
    }
    return getFallbackQuestions();
  }
}

function getFallbackQuestions(): GrantResponse[] {
  return [
    {
      question_id: crypto.randomUUID(),
      question_text: 'Describe your organization and its mission.',
      type: 'textarea',
      answer: '',
      reviewed: false,
    },
    {
      question_id: crypto.randomUUID(),
      question_text: 'What is the purpose of this grant request?',
      type: 'textarea',
      answer: '',
      reviewed: false,
    },
    {
      question_id: crypto.randomUUID(),
      question_text: 'How will the funds be used?',
      type: 'textarea',
      answer: '',
      reviewed: false,
    },
  ];
}
