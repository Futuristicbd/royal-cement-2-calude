/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Frames are served through our own API route (same-origin), so no remote
  // image config is required. Blob URLs are only fetched server-side.
};

export default nextConfig;
