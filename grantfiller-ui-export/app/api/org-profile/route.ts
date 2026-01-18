import { NextResponse } from 'next/server';
import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, GRANTS_TABLE } from '@/lib/dynamodb';

const ORG_ID = 'default-org';

export async function GET() {
  try {
    const result = await docClient.send(new GetCommand({
      TableName: GRANTS_TABLE,
      Key: { grant_id: ORG_ID },
    }));

    if (!result.Item) {
      // Return empty profile if not found
      return NextResponse.json({
        org_id: ORG_ID,
        legal_name: '',
        mission_short: '',
        mission_long: '',
        address: '',
        extra_sections: [],
      });
    }

    return NextResponse.json({
      ...result.Item,
      extra_sections: result.Item.extra_sections || [],
    });
  } catch (error) {
    console.error('Error fetching org profile:', error);
    return NextResponse.json({ error: 'Failed to fetch org profile' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();

    const profile = {
      grant_id: ORG_ID, // Using grant_id as PK for same table
      org_id: ORG_ID,
      legal_name: body.legal_name || '',
      mission_short: body.mission_short || '',
      mission_long: body.mission_long || '',
      address: body.address || '',
      extra_sections: body.extra_sections || [],
      updated_at: new Date().toISOString(),
    };

    await docClient.send(new PutCommand({
      TableName: GRANTS_TABLE,
      Item: profile,
    }));

    return NextResponse.json(profile);
  } catch (error) {
    console.error('Error updating org profile:', error);
    return NextResponse.json({ error: 'Failed to update org profile' }, { status: 500 });
  }
}
