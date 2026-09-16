import { NextRequest, NextResponse } from "next/server";
import { getCampaign, StorageNotConfiguredError } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/campaigns/:id/frame  -> streams the frame PNG from the same origin,
// so the editor <canvas> stays untainted and can be exported to a PNG download.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const campaign = await getCampaign(id);
    if (!campaign) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const upstream = await fetch(campaign.frameUrl, { cache: "no-store" });
    if (!upstream.ok || !upstream.body) {
      return NextResponse.json(
        { error: "Frame image unavailable" },
        { status: 502 }
      );
    }
    return new NextResponse(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": campaign.frameContentType || "image/png",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (err) {
    if (err instanceof StorageNotConfiguredError) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    return NextResponse.json(
      { error: "Failed to load frame" },
      { status: 500 }
    );
  }
}
