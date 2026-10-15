import type { NextConfig } from "next";
import { parseSupabaseUrl } from "./src/lib/supabase-url";

const supabaseUrl = parseSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);

// Локальный Supabase (supabase start) отдаёт файлы с 127.0.0.1 — оптимизатору изображений
// Next.js нужно явно разрешить локальные адреса. Для облачного проекта это не требуется.
const isLocalSupabase =
  supabaseUrl !== null && ["localhost", "127.0.0.1", "0.0.0.0"].includes(supabaseUrl.hostname);

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Content-Security-Policy",
    value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'",
  },
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      ...(supabaseUrl
        ? [
            {
              protocol: supabaseUrl.protocol === "https:" ? ("https" as const) : ("http" as const),
              hostname: supabaseUrl.hostname,
              port: supabaseUrl.port,
              pathname: "/storage/v1/object/public/**",
            },
          ]
        : []),
    ],
    qualities: [70, 80],
    dangerouslyAllowLocalIP: isLocalSupabase,
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
