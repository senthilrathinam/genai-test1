import { NextResponse } from 'next/server';
import { uploadFile } from '@/lib/s3';
import { randomUUID } from 'crypto';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Only PDF and DOCX files are supported' }, { status: 400 });
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generate unique key
    const ext = file.name.split('.').pop();
    const key = `grants/${randomUUID()}.${ext}`;

    // Upload to S3
    const s3Uri = await uploadFile(buffer, key, file.type);

    return NextResponse.json({ 
      success: true,
      s3_key: key,
      s3_uri: s3Uri,
      file_type: file.type,
      file_name: file.name,
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
  }
}
