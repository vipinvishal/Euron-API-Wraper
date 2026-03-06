import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for Docker / ECS Fargate deployment
  output: "standalone",

  // Allow the app to read REDIS_URL from ECS task environment
  env: {
    REDIS_URL: process.env.REDIS_URL ?? "",
  },

  // Security headers
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options",         value: "DENY"         },
          { key: "X-Content-Type-Options",   value: "nosniff"      },
          { key: "Referrer-Policy",          value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy",       value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
