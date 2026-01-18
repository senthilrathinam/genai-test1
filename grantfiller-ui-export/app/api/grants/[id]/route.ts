import { NextResponse } from 'next/server';
import { GetCommand, PutCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, GRANTS_TABLE } from '@/lib/dynamodb';
import { deleteFile } from '@/lib/s3';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const result = await docClient.send(new GetCommand({
      TableName: GRANTS_TABLE,
      Key: { grant_id: id },
    }));

    if (!result.Item) {
      return NextResponse.json({ error: 'Grant not found' }, { status: 404 });
    }

    return NextResponse.json(result.Item);
  } catch (error) {
    console.error('Error fetching grant:', error);
    return NextResponse.json({ error: 'Failed to fetch grant' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Fetch existing grant
    const result = await docClient.send(new GetCommand({
      TableName: GRANTS_TABLE,
      Key: { grant_id: id },
    }));

    if (!result.Item) {
      return NextResponse.json({ error: 'Grant not found' }, { status: 404 });
    }

    // Update grant with new data
    const updatedGrant = {
      ...result.Item,
      ...body,
      updated_at: new Date().toISOString(),
    };

    await docClient.send(new PutCommand({
      TableName: GRANTS_TABLE,
      Item: updatedGrant,
    }));

    return NextResponse.json(updatedGrant);
  } catch (error) {
    console.error('Error updating grant:', error);
    return NextResponse.json({ error: 'Failed to update grant' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Fetch grant to get S3 keys before deleting
    const result = await docClient.send(new GetCommand({
      TableName: GRANTS_TABLE,
      Key: { grant_id: id },
    }));

    // Delete from DynamoDB
    await docClient.send(new DeleteCommand({
      TableName: GRANTS_TABLE,
      Key: { grant_id: id },
    }));

    // Clean up S3 files if they exist
    if (result.Item) {
      const deletePromises = [];
      if (result.Item.source_file_key) {
        deletePromises.push(deleteFile(result.Item.source_file_key).catch(err => 
          console.error('Failed to delete source file:', err)
        ));
      }
      if (result.Item.export_file_key) {
        deletePromises.push(deleteFile(result.Item.export_file_key).catch(err => 
          console.error('Failed to delete export file:', err)
        ));
      }
      await Promise.all(deletePromises);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting grant:', error);
    return NextResponse.json({ error: 'Failed to delete grant' }, { status: 500 });
  }
}
