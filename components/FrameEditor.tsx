"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PublicCampaign } from "@/lib/types";

interface Props {
  campaign: PublicCampaign;
}

const MIN_ZOOM = 0.2;
const MAX_ZOOM = 6;

export default function FrameEditor({ campaign }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const photoRef = useRef<HTMLImageElement | null>(null);
  const frameRef = useRef<HTMLImageElement | null>(null);

  const zoomRef = useRef(1);
  const offsetRef = useRef({ x: 0, y: 0 });
  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchRef = useRef<{ dist: number; zoom: number } | null>(null);
  const draggingRef = useRef(false);

  const [frameReady, setFrameReady] = useState(false);
  const [hasPhoto, setHasPhoto] = useState(false);
  const [zoomDisplay, setZoomDisplay] = useState(1);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ---- drawing ----
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = canvas.width;
    const H = canvas.height;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#0d0f12";
    ctx.fillRect(0, 0, W, H);

    const photo = photoRef.current;
    if (photo) {
      const cover = Math.max(W / photo.naturalWidth, H / photo.naturalHeight);
      const s = cover * zoomRef.current;
      const dw = photo.naturalWidth * s;
      const dh = photo.naturalHeight * s;
      const x = (W - dw) / 2 + offsetRef.current.x;
      const y = (H - dh) / 2 + offsetRef.current.y;
      ctx.drawImage(photo, x, y, dw, dh);
    }

    const frame = frameRef.current;
    if (frame) ctx.drawImage(frame, 0, 0, W, H);
  }, []);

  // ---- load the frame ----
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = campaign.frameWidth;
    canvas.height = campaign.frameHeight;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      frameRef.current = img;
      setFrameReady(true);
      draw();
    };
    img.src = `/api/campaigns/${campaign.id}/frame`;
  }, [campaign.id, campaign.frameWidth, campaign.frameHeight, draw]);

  // ---- photo upload ----
  const loadPhoto = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/")) return;
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        photoRef.current = img;
        zoomRef.current = 1;
        offsetRef.current = { x: 0, y: 0 };
        setZoomDisplay(1);
        setHasPhoto(true);
        draw();
        URL.revokeObjectURL(url);
      };
      img.src = url;
    },
    [draw]
  );

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) loadPhoto(file);
    e.target.value = "";
  };

  // ---- interaction: pan + pinch/wheel zoom ----
  const canvasScale = () => {
    const canvas = canvasRef.current;
    if (!canvas) return 1;
    const rect = canvas.getBoundingClientRect();
    return rect.width ? canvas.width / rect.width : 1;
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (!hasPhoto) return;
    (e.target as Element).setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 1) draggingRef.current = true;
    if (pointers.current.size === 2) {
      const pts = Array.from(pointers.current.values());
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      pinchRef.current = { dist, zoom: zoomRef.current };
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    const prev = pointers.current.get(e.pointerId)!;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size === 2 && pinchRef.current) {
      const pts = Array.from(pointers.current.values());
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const next = clampZoom(
        (pinchRef.current.zoom * dist) / pinchRef.current.dist
      );
      zoomRef.current = next;
      setZoomDisplay(next);
      draw();
      return;
    }

    if (draggingRef.current) {
      const scale = canvasScale();
      offsetRef.current.x += (e.clientX - prev.x) * scale;
      offsetRef.current.y += (e.clientY - prev.y) * scale;
      draw();
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinchRef.current = null;
    if (pointers.current.size === 0) draggingRef.current = false;
  };

  const onWheel = (e: React.WheelEvent) => {
    if (!hasPhoto) return;
    const factor = Math.exp(-e.deltaY * 0.0015);
    const next = clampZoom(zoomRef.current * factor);
    zoomRef.current = next;
    setZoomDisplay(next);
    draw();
  };

  const onZoomSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = clampZoom(parseFloat(e.target.value));
    zoomRef.current = next;
    setZoomDisplay(next);
    draw();
  };

  const reset = () => {
    zoomRef.current = 1;
    offsetRef.current = { x: 0, y: 0 };
    setZoomDisplay(1);
    draw();
  };

  // ---- caption ----
  const copyCaption = async () => {
    try {
      await navigator.clipboard.writeText(campaign.caption);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = campaign.caption;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  // ---- download ----
  const download = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setDownloading(true);
    draw();
    try {
      const blob: Blob | null = await new Promise((resolve) =>
        canvas.toBlob((b) => resolve(b), "image/png")
      );
      if (!blob) throw new Error("Export failed");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${slugify(campaign.title)}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    } catch {
      alert("Could not export the image. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="editor">
      <div className="stage">
        {!frameReady ? (
          <div className="canvas-empty">
            <span className="spinner" /> &nbsp;Loading frame…
          </div>
        ) : (
          <div
            className="canvas-wrap"
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const file = e.dataTransfer.files?.[0];
              if (file) loadPhoto(file);
            }}
          >
            <canvas
              ref={canvasRef}
              className={draggingRef.current ? "dragging" : ""}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              onWheel={onWheel}
            />
            {!hasPhoto && (
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  gap: 8,
                  color: dragOver ? "var(--accent)" : "var(--muted)",
                  background: "rgba(13,15,18,0.35)",
                  borderRadius: 8,
                  textAlign: "center",
                  padding: 24,
                }}
              >
                <strong style={{ fontSize: 16, color: "var(--text)" }}>
                  Tap to upload your photo
                </strong>
                <span>or drag &amp; drop an image here</span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="controls">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={onFileChange}
        />

        <div className="control-block">
          <h4>Your photo</h4>
          <button
            className="btn primary block"
            onClick={() => fileInputRef.current?.click()}
          >
            {hasPhoto ? "Change photo" : "Upload photo"}
          </button>

          {hasPhoto && (
            <>
              <div style={{ marginTop: 16 }}>
                <label className="field">
                  Zoom · {zoomDisplay.toFixed(2)}×
                </label>
                <input
                  type="range"
                  min={MIN_ZOOM}
                  max={MAX_ZOOM}
                  step={0.01}
                  value={zoomDisplay}
                  onChange={onZoomSlider}
                />
              </div>
              <div className="row" style={{ marginTop: 8 }}>
                <button className="btn ghost" onClick={reset}>
                  Reset position
                </button>
              </div>
              <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
                Drag the photo to reposition · scroll or pinch to zoom.
              </p>
            </>
          )}
        </div>

        {campaign.caption?.trim() && (
          <div className="control-block">
            <h4>Caption</h4>
            <div className="caption-box">{campaign.caption}</div>
            <button
              className="btn block"
              style={{ marginTop: 12 }}
              onClick={copyCaption}
            >
              {copied ? "✓ Copied!" : "Copy caption"}
            </button>
          </div>
        )}

        <div className="control-block">
          <button
            className="btn primary block"
            disabled={!hasPhoto || downloading}
            onClick={download}
            style={{ padding: "14px 18px", fontSize: 16 }}
          >
            {downloading ? (
              <>
                <span className="spinner" /> Preparing…
              </>
            ) : (
              "Download"
            )}
          </button>
          <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>
            Exports at {campaign.frameWidth}×{campaign.frameHeight}px (frame
            native size).
          </p>
        </div>
      </div>
    </div>
  );
}

function clampZoom(z: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));
}

function slugify(s: string) {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "framed-photo"
  );
}
