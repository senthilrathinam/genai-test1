import { NextRequest, NextResponse } from 'next/server';
import { GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, GRANTS_TABLE } from '@/lib/dynamodb';
import { uploadFile, getPresignedUrl, downloadFile } from '@/lib/s3';
import { generateFilledPDF } from '@/lib/pdf-generator';
import { fillPDFForm } from '@/lib/pdf-form-filler';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Fetch grant
    const grantResult = await docClient.send(new GetCommand({
      TableName: GRANTS_TABLE,
      Key: { grant_id: id },
    }));

    if (!grantResult.Item) {
      return NextResponse.json({ error: 'Grant not found' }, { status: 404 });
    }

    const grant = grantResult.Item;

    // Fetch org profile
    const orgResult = await docClient.send(new GetCommand({
      TableName: GRANTS_TABLE,
      Key: { grant_id: 'default-org' },
    }));

    const orgName = orgResult.Item?.legal_name || 'Organization';

    let pdfBuffer: Buffer;
    let exportKey: string;

    // Try to fill original PDF form if available
    if (grant.source_file_key && grant.source_type === 'pdf') {
      try {
        console.log('Attempting to fill original PDF form:', grant.source_file_key);
        const originalPDF = await downloadFile(grant.source_file_key);
        const { filled, pdfBytes } = await fillPDFForm(originalPDF, grant as any);

        if (filled) {
          console.log('Successfully filled PDF form fields');
          pdfBuffer = pdfBytes;
          exportKey = `exports/${id}-filled.pdf`;
        } else {
          console.log('No form fields found, generating Q&A PDF');
          pdfBuffer = await generateFilledPDF(grant as any, orgName);
          exportKey = `exports/${id}.pdf`;
        }
      } catch (error) {
        console.error('Error processing original PDF, falling back to Q&A:', error);
        pdfBuffer = await generateFilledPDF(grant as any, orgName);
        exportKey = `exports/${id}.pdf`;
      }
    } else {
      // Generate Q&A PDF
      console.log('Generating Q&A PDF');
      pdfBuffer = await generateFilledPDF(grant as any, orgName);
      exportKey = `exports/${id}.pdf`;
    }

    // Upload to S3
    await uploadFile(pdfBuffer, exportKey, 'application/pdf');

    // Update grant with export_file_key
    await docClient.send(new UpdateCommand({
      TableName: GRANTS_TABLE,
      Key: { grant_id: id },
      UpdateExpression: 'SET export_file_key = :key, updated_at = :updated',
      ExpressionAttributeValues: {
        ':key': exportKey,
        ':updated': new Date().toISOString(),
      },
    }));

    // Get presigned URL
    const downloadUrl = await getPresignedUrl(exportKey);

    return NextResponse.json({
      downloadUrl,
      export_file_key: exportKey,
    });
  } catch (error) {
    console.error('Error exporting PDF:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : '';
    console.error('Error details:', { errorMessage, errorStack });
    
    return NextResponse.json(
      { error: 'Failed to export PDF', details: errorMessage },
      { status: 500 }
    );
  }
}
