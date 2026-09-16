import Link from "next/link";
import { notFound } from "next/navigation";
import { getCampaign } from "@/lib/store";
import { toPublicCampaign } from "@/lib/types";
import FrameEditor from "@/components/FrameEditor";

export const dynamic = "force-dynamic";

export default async function CampaignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let campaign;
  try {
    campaign = await getCampaign(id);
  } catch {
    return (
      <div className="container">
        <div className="center">
          <div className="notice warn">
            Storage isn&apos;t connected yet. Please try again later.
          </div>
          <Link href="/" className="btn ghost">
            Back home
          </Link>
        </div>
      </div>
    );
  }

  if (!campaign) notFound();

  return (
    <div className="container">
      <div className="topbar">
        <Link href="/" className="brand" style={{ color: "inherit" }}>
          <span className="dot" />
          Frame Studio
        </Link>
        <Link href="/" className="btn ghost">
          All campaigns
        </Link>
      </div>

      <div className="hero" style={{ padding: "8px 0 20px" }}>
        <h1 style={{ fontSize: "clamp(24px,5vw,34px)" }}>{campaign.title}</h1>
        <p>Upload your photo, adjust it, then download your framed image.</p>
      </div>

      <FrameEditor campaign={toPublicCampaign(campaign)} />
    </div>
  );
}
