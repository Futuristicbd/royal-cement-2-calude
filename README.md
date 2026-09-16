# Frame Studio — Twibbonize-style frame campaign platform

Upload a frame as an admin, share the link, and let anyone overlay their photo
and download it at full resolution. Built with **Next.js (App Router)** and
**Vercel Blob** storage.

## What it does

- **Admin panel** (`/admin`, password-protected) — publish campaigns: upload a
  frame PNG, add a title and a copyable caption.
- **User page** (`/c/<id>`, shareable) — upload a photo, drag / zoom / pinch to
  adjust it behind the frame, copy the caption, and **download** the result.
- **Downloads are 1:1** — the exported PNG matches the frame image's exact pixel
  dimensions, with the frame composited on top of the user's photo.

## Routes

| Route              | Who        | Purpose                                  |
| ------------------ | ---------- | ---------------------------------------- |
| `/`                | Everyone   | Landing page + list of published frames  |
| `/c/<id>`          | Everyone   | The frame editor for one campaign (share this) |
| `/admin`           | Admin only | Create / delete campaigns                |

## Deploy to Vercel (2 things to set up)

1. **Import the repo** into Vercel (New Project → import
   `Futuristicbd/royal-cement-2-calude`). It's a standard Next.js app, no build
   config needed.

2. **Connect Blob storage** — in the Vercel project:
   `Storage → Create Database → Blob → Connect Project`. This automatically adds
   the `BLOB_READ_WRITE_TOKEN` environment variable. Frames + campaign data live
   here.

3. **Set the admin password** — in
   `Settings → Environment Variables`, add:

   ```
   ADMIN_PASSWORD = your-secret-password
   ```

4. **Redeploy** so the new env vars are picked up.

Then open `https://<your-app>.vercel.app/admin`, log in, and publish a frame.

## Local development

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run dev
```

For local Blob access, copy `BLOB_READ_WRITE_TOKEN` from your Vercel Blob store
into `.env.local`. Set `ADMIN_PASSWORD` there too.

## Notes

- Frames should be **PNGs with a transparent cut-out** where the photo shows
  through (JPG/WEBP also accepted). Max 12 MB.
- The user's photo never leaves their browser — compositing and export happen
  fully client-side on a `<canvas>`.
- The frame is served through a same-origin API route so the canvas stays
  exportable (no cross-origin tainting).
