import Link from "next/link";
import AdminPanel from "@/components/AdminPanel";

export const dynamic = "force-dynamic";

export default function AdminPage() {
  return (
    <div className="container">
      <div className="topbar">
        <Link href="/" className="brand" style={{ color: "inherit" }}>
          <span className="dot" />
          Frame Studio
        </Link>
        <Link href="/" className="btn ghost">
          View site
        </Link>
      </div>

      <div className="hero" style={{ padding: "8px 0 20px" }}>
        <h1 style={{ fontSize: "clamp(24px,5vw,34px)" }}>Admin panel</h1>
        <p>Publish a frame campaign, then share its link with everyone.</p>
      </div>

      <AdminPanel />
    </div>
  );
}
