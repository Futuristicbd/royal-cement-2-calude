import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container">
      <div className="center">
        <h1>Campaign not found</h1>
        <p className="muted">
          This frame link may have been removed or never existed.
        </p>
        <Link href="/" className="btn primary">
          Browse campaigns
        </Link>
      </div>
    </div>
  );
}
