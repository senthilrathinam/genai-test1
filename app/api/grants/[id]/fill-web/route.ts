import { NextRequest, NextResponse } from "next/server";
import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { docClient, GRANTS_TABLE } from "@/lib/dynamodb";
import { fillFormWithPlaywright } from "@/lib/webFillPlaywright";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const result = await docClient.send(new GetCommand({
      TableName: GRANTS_TABLE,
      Key: { grant_id: id },
    }));

    const grant = result.Item;

    if (!grant) {
      return NextResponse.json({ error: "Grant not found" }, { status: 404 });
    }

    // Use portal_url if provided, otherwise fall back to grant_url
    // If grant_url is a PDF/document, this will fail - user should provide portal_url
    const targetUrl = grant.portal_url || grant.grant_url;
    
    if (!targetUrl) {
      return NextResponse.json({ error: "No URL provided for form filling" }, { status: 400 });
    }

    console.log(`[fill-web] Grant ${id}: Filling form at ${targetUrl}`);
    console.log(`[fill-web] Grant has ${grant.responses.length} responses`);

    const result2 = await fillFormWithPlaywright({ targetUrl, grant });

    console.log(`[fill-web] Result: ${result2.fieldsFilled} filled, ${result2.fieldsSkipped} skipped`);

    return NextResponse.json({
      status: "ok",
      fieldsFilled: result2.fieldsFilled,
      fieldsSkipped: result2.fieldsSkipped,
      mappings: result2.mappings,
    });
  } catch (error: any) {
    console.error("[fill-web] Error:", error);
    return NextResponse.json(
      { 
        status: "error",
        message: error.message || "Failed to fill web form"
      },
      { status: 500 }
    );
  }
}
