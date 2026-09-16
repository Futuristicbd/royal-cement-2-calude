"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PublicCampaign } from "@/lib/types";

export default function AdminPanel() {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(false);
  const [authError, setAuthError] = useState("");

  // restore session password
  useEffect(() => {
    const saved = sessionStorage.getItem("admin_pw");
    if (saved) {
      setPassword(saved);
      verify(saved);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const verify = useCallback(async (pw: string) => {
    setChecking(true);
    setAuthError("");
    try {
      const res = await fetch("/api/campaigns", {
        headers: { "x-admin-password": pw },
      });
      if (res.ok) {
        sessionStorage.setItem("admin_pw", pw);
        setAuthed(true);
      } else {
        const data = await res.json().catch(() => ({}));
        setAuthError(data.error || "Wrong password.");
        setAuthed(false);
      }
    } catch {
      setAuthError("Network error. Try again.");
    } finally {
      setChecking(false);
    }
  }, []);

  if (!authed) {
    return (
      <div className="panel" style={{ maxWidth: 420, margin: "0 auto" }}>
        <div className="stack">
          <div>
            <label className="field">Admin password</label>
            <input
              type="password"
              value={password}
              placeholder="Enter password"
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && verify(password)}
            />
          </div>
          {authError && <div className="notice error">{authError}</div>}
          <button
            className="btn primary block"
            disabled={checking || !password}
            onClick={() => verify(password)}
          >
            {checking ? <span className="spinner" /> : "Unlock"}
          </button>
        </div>
      </div>
    );
  }

  return <Dashboard password={password} />;
}

function Dashboard({ password }: { password: string }) {
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [campaigns, setCampaigns] = useState<PublicCampaign[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [justCreated, setJustCreated] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const authHeaders = { "x-admin-password": password };

  const loadCampaigns = useCallback(async () => {
    setLoadingList(true);
    try {
      const res = await fetch("/api/campaigns", { headers: authHeaders });
      const data = await res.json();
      setCampaigns(data.campaigns || []);
    } catch {
      /* ignore */
    } finally {
      setLoadingList(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [password]);

  useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns]);

  const pickFile = (f: File | null) => {
    if (!f) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(f.type)) {
      setError("Frame must be a PNG, JPG or WEBP.");
      return;
    }
    setError("");
    setFile(f);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(f));
  };

  const submit = async () => {
    if (!file) {
      setError("Please choose a frame image.");
      return;
    }
    if (!title.trim()) {
      setError("Please enter a campaign title.");
      return;
    }
    setSubmitting(true);
    setError("");
    setJustCreated(null);
    try {
      const fd = new FormData();
      fd.append("title", title.trim());
      fd.append("caption", caption);
      fd.append("frame", file);
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: authHeaders,
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create campaign.");
        return;
      }
      setJustCreated(data.campaign.id);
      setTitle("");
      setCaption("");
      setFile(null);
      if (preview) URL.revokeObjectURL(preview);
      setPreview(null);
      loadCampaigns();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this campaign? The shared link will stop working."))
      return;
    try {
      const res = await fetch(`/api/campaigns/${id}`, {
        method: "DELETE",
        headers: authHeaders,
      });
      if (res.ok) setCampaigns((cs) => cs.filter((c) => c.id !== id));
    } catch {
      /* ignore */
    }
  };

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div className="stack" style={{ gap: 28 }}>
      <div className="panel">
        <h3 style={{ marginTop: 0 }}>Create a campaign</h3>
        <div className="stack">
          <div>
            <label className="field">Campaign title</label>
            <input
              type="text"
              value={title}
              placeholder="e.g. PKKMB 2026"
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div>
            <label className="field">Caption (users can copy this)</label>
            <textarea
              value={caption}
              placeholder="Write the caption / hashtags users should copy…"
              onChange={(e) => setCaption(e.target.value)}
            />
          </div>

          <div>
            <label className="field">Frame image (PNG with transparency)</label>
            <input
              ref={inputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              hidden
              onChange={(e) => pickFile(e.target.files?.[0] || null)}
            />
            <div
              className={`dropzone ${dragOver ? "drag" : ""}`}
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                pickFile(e.dataTransfer.files?.[0] || null);
              }}
            >
              {preview ? (
                <div
                  style={{
                    display: "flex",
                    gap: 16,
                    alignItems: "center",
                    justifyContent: "center",
                    flexWrap: "wrap",
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={preview}
                    alt="frame preview"
                    style={{
                      width: 120,
                      height: 120,
                      objectFit: "contain",
                      background:
                        "repeating-conic-gradient(#2a2f3a 0% 25%, #1d2129 0% 50%) 50% / 20px 20px",
                      borderRadius: 8,
                    }}
                  />
                  <div style={{ textAlign: "left" }}>
                    <strong>{file?.name}</strong>
                    <div className="muted" style={{ fontSize: 13 }}>
                      Click to replace
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <strong>Click to choose a frame</strong>
                  <div style={{ fontSize: 13, marginTop: 4 }}>
                    PNG / JPG / WEBP · up to 12 MB · the download uses this
                    image&apos;s exact pixel size
                  </div>
                </>
              )}
            </div>
          </div>

          {error && <div className="notice error">{error}</div>}

          <button
            className="btn primary block"
            disabled={submitting}
            onClick={submit}
          >
            {submitting ? (
              <>
                <span className="spinner" /> Publishing…
              </>
            ) : (
              "Publish campaign"
            )}
          </button>

          {justCreated && (
            <div className="notice info">
              ✓ Published! Share this link:{" "}
              <a href={`/c/${justCreated}`} target="_blank" rel="noreferrer">
                {origin}/c/{justCreated}
              </a>
            </div>
          )}
        </div>
      </div>

      <div className="panel">
        <div
          className="row"
          style={{ justifyContent: "space-between", marginBottom: 8 }}
        >
          <h3 style={{ margin: 0 }}>Your campaigns</h3>
          <button className="btn ghost" onClick={loadCampaigns}>
            Refresh
          </button>
        </div>

        {loadingList ? (
          <div className="muted">Loading…</div>
        ) : campaigns.length === 0 ? (
          <div className="muted">No campaigns yet.</div>
        ) : (
          <div className="grid">
            {campaigns.map((c) => (
              <div key={c.id} className="card">
                <div className="card-thumb">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/api/campaigns/${c.id}/frame`} alt={c.title} />
                </div>
                <div className="card-body">
                  <h3>{c.title}</h3>
                  <div className="muted" style={{ marginBottom: 10 }}>
                    {c.frameWidth}×{c.frameHeight}px
                  </div>
                  <div className="row">
                    <a
                      className="btn ghost"
                      href={`/c/${c.id}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{ flex: 1 }}
                    >
                      Open
                    </a>
                    <button
                      className="btn danger"
                      onClick={() => remove(c.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
