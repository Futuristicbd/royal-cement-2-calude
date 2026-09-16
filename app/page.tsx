import Link from "next/link";
import { listCampaigns } from "@/lib/store";
import { toPublicCampaign } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function Home() {
  let campaigns: ReturnType<typeof toPublicCampaign>[] = [];
  let storageError = false;

  try {
    campaigns = (await listCampaigns()).map(toPublicCampaign);
  } catch {
    storageError = true;
  }

  return (
    <div className="container">
      <div className="topbar">
        <div className="brand">
          <span className="dot" />
          Frame Studio
        </div>
        <Link href="/admin" className="btn ghost">
          Admin
        </Link>
      </div>

      <div className="hero">
        <h1>Apply a campaign frame to your photo</h1>
        <p>
          Pick a campaign below, upload your photo, adjust it, copy the caption
          and download your framed image in full resolution.
        </p>
      </div>

      {storageError && (
        <div className="notice warn" style={{ marginTop: 24 }}>
          Storage isn&apos;t connected yet. An admin needs to connect a Vercel
          Blob store to this project. See the README for the one-time setup.
        </div>
      )}

      {!storageError && campaigns.length === 0 && (
        <div className="notice info" style={{ marginTop: 24 }}>
          No campaigns yet. Head to the{" "}
          <Link href="/admin">Admin panel</Link> to publish your first frame.
        </div>
      )}

      <div className="grid">
        {campaigns.map((c) => (
          <Link key={c.id} href={`/c/${c.id}`} className="card">
            <div className="card-thumb">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/campaigns/${c.id}/frame`} alt={c.title} />
            </div>
            <div className="card-body">
              <h3>{c.title}</h3>
              <div className="muted">
                {c.frameWidth}×{c.frameHeight}px
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="footer">
        Built with Next.js · Frames render 1:1 at the frame&apos;s native
        resolution.
      </div>
    </div>
  );
}
