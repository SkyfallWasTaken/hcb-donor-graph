import { Hono } from "hono";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { AvatarGrid } from "./image";

// In-memory cache: Map<url, { base64: string, expiresAt: number }>
const avatarCache = new Map<string, { base64: string; expiresAt: number }>();
const TIMEOUT = 1000 * 60 * 60 * 24;

async function fetchAvatarBase64(url: string): Promise<string> {
  const cached = avatarCache.get(url);
  const now = Date.now();

  if (cached && cached.expiresAt > now) {
    return cached.base64;
  }

  console.log(`Cachedasdasdad avatar: ${url}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}`);
  const buffer = await res.arrayBuffer();
  const mime = res.headers.get("content-type") || "image/png";
  const base64 = `data:${mime};base64,${Buffer.from(buffer).toString("base64")}`;

  avatarCache.set(url, { base64, expiresAt: now + TIMEOUT });
  console.log(`Cached avatar: ${url}`);
  return base64;
}

async function generateAvatarGridImage(iconSize: number, gap: number, avatarUrls: string[]) {
  const svg = await satori(
    <AvatarGrid
      avatarUrls={avatarUrls}
      avatarSize={iconSize}
      gap={gap}
      imageWidth={1200}
      imageHeight={1080}
      backgroundColor="#222222"
    />,
    {
      width: 1200,
      height: 1080,
      fonts: [],
    }
  );

  const resvg = new Resvg(svg, {
    background: 'rgba(255, 255, 255, .0)',
    fitTo: {
      mode: 'width',
      value: 1200,
    },
  });
  return resvg.render().asPng();
}

const app = new Hono();

app.get("/:orgslug", async (c) => {
  const orgSlug = c.req.param("orgslug");
  const iconSize = Number(c.req.query("icon_size")) ?? 64;
  const gap = Number(c.req.query("gap")) || 12;
  console.log(`Generating avatar grid for org: ${orgSlug}, icon size: ${iconSize}, gap: ${gap}`);

  console.time("fetchAllPages");
  const fetches = [];
  for (let i = 1; i <= 15; i++) {
    fetches.push(
      fetch(`https://hcb.hackclub.com/api/v3/organizations/${orgSlug}/donations?per_page=100&page=${i}`)
        .then(res => res.json())
        .then(data => data.map((donation: any) => donation.donor.avatar).filter(Boolean))
    );
  }
  const pages = await Promise.all(fetches);
  const avatarUrls = [...new Set(pages.flat())];
  console.timeEnd("fetchAllPages");

  console.time("downloadAvatars");
  const avatarsBase64: string[] = [];
  for (const url of avatarUrls) {
    try {
      const base64 = await fetchAvatarBase64(url);
      avatarsBase64.push(base64);
    } catch (err) {
      console.warn(`Failed to download avatar: ${url}`);
    }
  }
  console.timeEnd("downloadAvatars");

  console.time("generateAvatarGridImage");
  c.header('Content-Type', 'image/png');
  c.header('Cache-Control', 'public, max-age=31536000, immutable');
  const img = await generateAvatarGridImage(iconSize, gap, avatarsBase64);
  console.timeEnd("generateAvatarGridImage");

  return c.body(img);
});

Bun.serve({
  fetch: app.fetch,
  idleTimeout: 60,
});
console.log("Server running on http://localhost:3000");
