import { NextResponse } from 'next/server';
import { ScanCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, GRANTS_TABLE } from '@/lib/dynamodb';
import { randomUUID } from 'crypto';

export async function GET() {
  try {
    const result = await docClient.send(new ScanCommand({
      TableName: GRANTS_TABLE,
    }));

    // Filter out org profile and sort by created_at
    const grants = (result.Items || [])
      .filter(item => item.grant_id !== 'default-org')
      .sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

    return NextResponse.json(grants);
  } catch (error) {
    console.error('Error fetching grants:', error);
    return NextResponse.json({ error: 'Failed to fetch grants' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { grant_name, grant_url } = body;

    const grant_id = randomUUID();
    const now = new Date().toISOString();

    // Detect source type from URL
    const urlLower = (grant_url || '').toLowerCase();
    let source_type: 'pdf' | 'web' | 'docx' = 'web';
    if (urlLower.endsWith('.pdf')) {
      source_type = 'pdf';
    } else if (urlLower.endsWith('.docx')) {
      source_type = 'docx';
    }

    // Seed with dummy questions using new format
    const dummyQuestions = [
      { 
        question_id: randomUUID(), 
        question_text: 'Describe your organization and its mission.', 
        type: 'textarea' as const,
        answer: '', 
        reviewed: false 
      },
      { 
        question_id: randomUUID(), 
        question_text: 'What is the purpose of this grant request?', 
        type: 'textarea' as const,
        answer: '', 
        reviewed: false 
      },
      { 
        question_id: randomUUID(), 
        question_text: 'How will the funds be used?', 
        type: 'textarea' as const,
        answer: '', 
        reviewed: false 
      },
    ];

    const grant = {
      grant_id,
      grant_name,
      grant_url: grant_url || '',
      status: 'draft',
      created_at: now,
      updated_at: now,
      responses: dummyQuestions,
      source_type,
    };

    await docClient.send(new PutCommand({
      TableName: GRANTS_TABLE,
      Item: grant,
    }));

    return NextResponse.json(grant);
  } catch (error) {
    console.error('Error creating grant:', error);
    return NextResponse.json({ error: 'Failed to create grant' }, { status: 500 });
  }
}
