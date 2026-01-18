import { NextResponse } from 'next/server';
import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, GRANTS_TABLE } from '@/lib/dynamodb';
import { parseDocumentQuestions } from '@/lib/document-parser';
import { parseHtmlQuestions } from '@/lib/html-parser';
import { uploadFile } from '@/lib/s3';
import crypto from 'crypto';
import { GrantResponse } from '@/types';

async function downloadUrlToS3(url: string): Promise<{ s3_key: string; file_type: string } | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;

    const contentType = response.headers.get('content-type') || '';
    const buffer = Buffer.from(await response.arrayBuffer());

    let ext = 'pdf';
    let fileType = 'application/pdf';
    if (contentType.includes('wordprocessingml') || url.endsWith('.docx')) {
      ext = 'docx';
      fileType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    }

    const key = `grants/${crypto.randomUUID()}.${ext}`;
    await uploadFile(buffer, key, fileType);

    return { s3_key: key, file_type: fileType };
  } catch (error) {
    console.error('Error downloading URL:', error);
    return null;
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    console.log('Fetching grant:', id);

    const grantResult = await docClient.send(new GetCommand({
      TableName: GRANTS_TABLE,
      Key: { grant_id: id },
    }));

    if (!grantResult.Item) {
      return NextResponse.json({ error: 'Grant not found' }, { status: 404 });
    }

    const grant = grantResult.Item;
    const url = grant.grant_url || '';

    if (!url) {
      return NextResponse.json({ error: 'Grant URL is missing' }, { status: 400 });
    }

    let questions: GrantResponse[];
    let s3Key = body.s3_key;
    let fileType = body.file_type;
    let fileName = body.file_name;

    const isPdfUrl = url.toLowerCase().endsWith('.pdf') || url.includes('.pdf?');
    const isDocxUrl = url.toLowerCase().endsWith('.docx') || url.includes('.docx?');

    if ((isPdfUrl || isDocxUrl) && !s3Key) {
      console.log('URL points to document, downloading:', url);
      const downloaded = await downloadUrlToS3(url);
      if (downloaded) {
        s3Key = downloaded.s3_key;
        fileType = downloaded.file_type;
        fileName = url.split('/').pop() || 'document';
        console.log('Downloaded to S3:', s3Key);
      }
    }

    if (s3Key && fileType) {
      console.log('Parsing questions from document:', s3Key);
      questions = await parseDocumentQuestions(s3Key, fileType);
    } else {
      console.log('Parsing questions from HTML:', url);
      questions = await parseHtmlQuestions(url);
    }

    console.log('Parsed', questions.length, 'questions');

    // Validate and deduplicate questions
    const validQuestions = questions.filter(q => {
      // Remove questions with empty text
      if (!q.question_text || q.question_text.trim() === '') {
        console.warn('Skipping question with empty text');
        return false;
      }
      
      // Remove single/multi choice questions with no options
      if ((q.type === 'single_choice' || q.type === 'multi_choice') && 
          (!q.options || q.options.length === 0)) {
        console.warn(`Skipping ${q.type} question with no options: ${q.question_text}`);
        return false;
      }
      
      return true;
    });

    // Deduplicate by question text (case-insensitive)
    const seen = new Set<string>();
    const uniqueQuestions = validQuestions.filter(q => {
      const normalized = q.question_text.toLowerCase().trim();
      if (seen.has(normalized)) {
        console.warn(`Skipping duplicate question: ${q.question_text}`);
        return false;
      }
      seen.add(normalized);
      return true;
    });

    console.log(`After validation: ${uniqueQuestions.length} valid unique questions`);

    if (uniqueQuestions.length === 0) {
      console.warn('No valid questions found after validation, using fallback');
      return NextResponse.json({ 
        error: 'No valid questions found',
        details: 'Parsing may have failed or document has no questions'
      }, { status: 400 });
    }

    // Determine source_type
    let source_type: 'pdf' | 'web' | 'docx' = 'web';
    if (fileType?.includes('pdf')) {
      source_type = 'pdf';
    } else if (fileType?.includes('wordprocessingml') || fileType?.includes('docx')) {
      source_type = 'docx';
    }

    const updatedGrant = {
      ...grant,
      responses: uniqueQuestions,
      source_file_key: s3Key || grant.source_file_key,
      source_type: s3Key ? source_type : grant.source_type,
      file_name: fileName || grant.file_name,
      updated_at: new Date().toISOString(),
    };

    await docClient.send(new PutCommand({
      TableName: GRANTS_TABLE,
      Item: updatedGrant,
    }));

    console.log('Grant updated with parsed questions');

    return NextResponse.json(updatedGrant);
  } catch (error) {
    console.error('Error parsing questions:', error);
    return NextResponse.json({ 
      error: 'Failed to parse questions',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
