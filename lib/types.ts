export interface Campaign {
  id: string;
  title: string;
  caption: string;
  /** Public Vercel Blob URL of the frame PNG (fetched server-side / proxied). */
  frameUrl: string;
  frameContentType: string;
  /** Natural pixel size of the frame — the download is produced at this size. */
  frameWidth: number;
  frameHeight: number;
  createdAt: number;
}

/** Public shape sent to the browser (no internal blob URL leaked). */
export interface PublicCampaign {
  id: string;
  title: string;
  caption: string;
  frameWidth: number;
  frameHeight: number;
  createdAt: number;
}

export function toPublicCampaign(c: Campaign): PublicCampaign {
  return {
    id: c.id,
    title: c.title,
    caption: c.caption,
    frameWidth: c.frameWidth,
    frameHeight: c.frameHeight,
    createdAt: c.createdAt,
  };
}
