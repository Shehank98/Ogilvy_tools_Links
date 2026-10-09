import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ticket attachments are posted with the form (up to 25 MB in total).
  experimental: {
    serverActions: { bodySizeLimit: "30mb" },
  },
  // Loaded at runtime on the server instead of being bundled.
  serverExternalPackages: ["@google-cloud/storage"],
};

export default nextConfig;
