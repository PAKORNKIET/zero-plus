/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Cloudflare Pages runs Next.js via the @cloudflare/next-on-pages adapter
  // (see docs/MASTER_GUIDE.md Phase 7) — no special settings needed here
  // for a standard pages-router app; the adapter handles the rest at
  // build/deploy time.
};

module.exports = nextConfig;
