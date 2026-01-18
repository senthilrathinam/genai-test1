import { NextResponse } from 'next/server';
import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, GRANTS_TABLE } from '@/lib/dynamodb';
import { generateAnswer } from '@/lib/bedrock';
import { GrantResponse } from '@/types';

const ORG_ID = 'default-org';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    console.log('Fetching grant:', id);

    const grantResult = await docClient.send(new GetCommand({
      TableName: GRANTS_TABLE,
      Key: { grant_id: id },
    }));

    if (!grantResult.Item) {
      return NextResponse.json({ error: 'Grant not found' }, { status: 404 });
    }

    console.log('Fetching org profile');

    const orgResult = await docClient.send(new GetCommand({
      TableName: GRANTS_TABLE,
      Key: { grant_id: ORG_ID },
    }));

    const orgProfile = orgResult.Item || {
      legal_name: '',
      mission_short: '',
      mission_long: '',
    };

    const grant = grantResult.Item;

    console.log('Generating answers for', grant.responses.length, 'questions');

    // Process in batches of 5 with minimal delay
    const updatedResponses: GrantResponse[] = [];
    const batchSize = 5;
    
    for (let i = 0; i < grant.responses.length; i += batchSize) {
      const batch = grant.responses.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(async (response: GrantResponse, batchIndex: number) => {
          const index = i + batchIndex;
          console.log(`Generating answer ${index + 1}/${grant.responses.length}`);
          
          try {
            const { answer, needsManualInput } = await generateAnswer(response, orgProfile);
            return {
              ...response,
              answer,
              reviewed: false,
              needs_manual_input: needsManualInput,
            };
          } catch (error) {
            console.error(`Error generating answer for question ${index + 1}:`, error);
            return {
              ...response,
              answer: response.type === 'multi_choice' ? [] : '',
              reviewed: false,
              needs_manual_input: true,
            };
          }
        })
      );
      
      updatedResponses.push(...batchResults);
      
      // Small delay between batches
      if (i + batchSize < grant.responses.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    console.log('Saving updated grant');

    const updatedGrant = {
      ...grant,
      responses: updatedResponses,
      status: 'ready',
      updated_at: new Date().toISOString(),
    };

    await docClient.send(new PutCommand({
      TableName: GRANTS_TABLE,
      Item: updatedGrant,
    }));

    console.log('Grant updated successfully');

    return NextResponse.json(updatedGrant);
  } catch (error) {
    console.error('Error generating drafts:', error);
    return NextResponse.json({ 
      error: 'Failed to generate drafts',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
