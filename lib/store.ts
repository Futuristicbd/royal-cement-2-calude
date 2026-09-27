import { put, list, del } from "@vercel/blob";
import { nanoid } from "nanoid";
import { Campaign } from "./types";
import { readImageSize } from "./imageSize";

const META_PREFIX = "campaigns/";
const FRAME_PREFIX = "frames/";

export class StorageNotConfiguredError extends Error {
  constructor() {
    super(
      "Vercel Blob is not configured. Connect a Blob store to this project in the Vercel dashboard (Storage → Create Database → Blob → Connect Project) and redeploy."
    );
    this.name = "StorageNotConfiguredError";
  }
}

function assertConfigured() {
  // A connected Blob store injects BLOB_STORE_ID (OIDC auth, no token needed on
  // Vercel) — or a classic BLOB_READ_WRITE_TOKEN. Either one means we're wired up.
  if (!process.env.BLOB_READ_WRITE_TOKEN && !process.env.BLOB_STORE_ID) {
    throw new StorageNotConfiguredError();
  }
}

function metaPath(id: string) {
  return `${META_PREFIX}${id}.json`;
}
function framePath(id: string, contentType: string) {
  const ext = contentType.split("/")[1]?.replace("jpeg", "jpg") || "png";
  return `${FRAME_PREFIX}${id}.${ext}`;
}

export interface CreateCampaignInput {
  title: string;
  caption: string;
  frameBuffer: Buffer;
  frameContentType: string;
}

export async function createCampaign(
  input: CreateCampaignInput
): Promise<Campaign> {
  assertConfigured();

  const size = readImageSize(input.frameBuffer);
  if (!size || size.width < 1 || size.height < 1) {
    throw new Error(
      "Could not read the frame image dimensions. Please upload a valid PNG, JPG or WEBP file."
    );
  }

  const id = nanoid(10);

  const frameBlob = await put(
    framePath(id, input.frameContentType),
    input.frameBuffer,
    {
      access: "public",
      contentType: input.frameContentType,
      addRandomSuffix: false,
      allowOverwrite: true,
      cacheControlMaxAge: 31536000,
    }
  );

  const campaign: Campaign = {
    id,
    title: input.title.trim() || "Untitled Frame",
    caption: input.caption,
    frameUrl: frameBlob.url,
    frameContentType: input.frameContentType,
    frameWidth: size.width,
    frameHeight: size.height,
    createdAt: Date.now(),
  };

  await put(metaPath(id), JSON.stringify(campaign), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
    cacheControlMaxAge: 60, // v2 minimum; reads are also cache-busted below
  });

  return campaign;
}

async function fetchJson(url: string): Promise<Campaign | null> {
  // Cache-bust so freshly-updated metadata is read back immediately.
  const res = await fetch(`${url}?t=${Date.now()}`, { cache: "no-store" });
  if (!res.ok) return null;
  try {
    return (await res.json()) as Campaign;
  } catch {
    return null;
  }
}

export async function getCampaign(id: string): Promise<Campaign | null> {
  assertConfigured();
  const { blobs } = await list({ prefix: metaPath(id), limit: 1 });
  const blob = blobs.find((b) => b.pathname === metaPath(id)) || blobs[0];
  if (!blob) return null;
  return fetchJson(blob.downloadUrl || blob.url);
}

export async function listCampaigns(): Promise<Campaign[]> {
  assertConfigured();
  const { blobs } = await list({ prefix: META_PREFIX, limit: 1000 });
  const metas = blobs.filter((b) => b.pathname.endsWith(".json"));
  const campaigns = await Promise.all(
    metas.map((b) => fetchJson(b.downloadUrl || b.url))
  );
  return campaigns
    .filter((c): c is Campaign => c !== null)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function deleteCampaign(id: string): Promise<void> {
  assertConfigured();
  const campaign = await getCampaign(id);
  const urls: string[] = [];
  const { blobs: metaBlobs } = await list({ prefix: metaPath(id), limit: 1 });
  metaBlobs.forEach((b) => urls.push(b.url));
  if (campaign?.frameUrl) urls.push(campaign.frameUrl);
  if (urls.length) await del(urls);
}
