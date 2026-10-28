import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL)
  : null;

// Локальный Supabase (supabase start) отдаёт файлы с 127.0.0.1 — оптимизатору изображений
// Next.js нужно явно разрешить локальные адреса. Для облачного проекта это не требуется.
const localHosts = ["localhost", "127.0.0.1", "0.0.0.0"];
const isLocalSupabase = supabaseUrl !== null && localHosts.includes(supabaseUrl.hostname);
// Публичные ссылки на файлы сохраняются в базе целиком: локально в ней могут быть адреса и
// с localhost, и с 127.0.0.1 (до смены [api] external_url) — разрешаем оба.
const supabaseHosts = supabaseUrl ? (isLocalSupabase ? localHosts : [supabaseUrl.hostname]) : [];

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
      ...supabaseHosts.map((hostname) => ({
        protocol: supabaseUrl!.protocol.replace(":", "") as "http" | "https",
        hostname,
        port: supabaseUrl!.port,
        pathname: "/storage/v1/object/public/**",
      })),
    ],
    qualities: [70, 80],
    dangerouslyAllowLocalIP: isLocalSupabase,
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
