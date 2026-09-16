import { NextRequest, NextResponse } from "next/server";
import {
  createCampaign,
  listCampaigns,
  StorageNotConfiguredError,
} from "@/lib/store";
import { toPublicCampaign } from "@/lib/types";
import { isAdmin, adminPasswordConfigured } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FRAME_BYTES = 12 * 1024 * 1024; // 12 MB
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];

// GET /api/campaigns  -> list (admin only, includes full metadata)
export async function GET(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const campaigns = await listCampaigns();
    return NextResponse.json({ campaigns: campaigns.map(toPublicCampaign) });
  } catch (err) {
    return handleError(err);
  }
}

// POST /api/campaigns  -> create (admin only, multipart form)
export async function POST(req: NextRequest) {
  if (!adminPasswordConfigured()) {
    return NextResponse.json(
      {
        error:
          "ADMIN_PASSWORD is not set on the server. Add it in your Vercel project's Environment Variables and redeploy.",
      },
      { status: 503 }
    );
  }
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "Wrong password" }, { status: 401 });
  }

  try {
    const form = await req.formData();
    const title = String(form.get("title") || "").trim();
    const caption = String(form.get("caption") || "");
    const file = form.get("frame");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Frame image is required." },
        { status: 400 }
      );
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Frame must be a PNG, JPG or WEBP image." },
        { status: 400 }
      );
    }
    if (file.size > MAX_FRAME_BYTES) {
      return NextResponse.json(
        { error: "Frame is too large (max 12 MB)." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const campaign = await createCampaign({
      title,
      caption,
      frameBuffer: buffer,
      frameContentType: file.type,
    });

    return NextResponse.json(
      { campaign: toPublicCampaign(campaign) },
      { status: 201 }
    );
  } catch (err) {
    return handleError(err);
  }
}

function handleError(err: unknown) {
  if (err instanceof StorageNotConfiguredError) {
    return NextResponse.json({ error: err.message }, { status: 503 });
  }
  const message = err instanceof Error ? err.message : "Something went wrong.";
  return NextResponse.json({ error: message }, { status: 500 });
}
