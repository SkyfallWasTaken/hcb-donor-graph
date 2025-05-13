import { Hono } from "hono"
import pLimit from "p-limit"
import satori from "satori"
import sharp from "sharp"
import { AvatarGrid } from "./image"

const avatarCache = new Map()
const CACHE_TTL = 1000 * 60 * 60 * 24 // 24h

// Concurrency & retry settings
const CONCURRENCY = 50
const MAX_RETRIES = 3
const INITIAL_BACKOFF = 500 // ms

const limit = pLimit(CONCURRENCY)

async function fetchAvatarBase64(url: string, attempt = 1) {
  // Check cache first
  const now = Date.now()
  const cached = avatarCache.get(url)
  if (cached && cached.expiresAt > now) {
    return cached.base64
  }

  try {
    const res = await fetch(url)
    if (res.status === 429 && attempt <= MAX_RETRIES) {
      // Rate-limited: back off then retry
      const retryAfter = Number(res.headers.get("Retry-After") || 1) * 1000
      const backoff = Math.max(INITIAL_BACKOFF * attempt, retryAfter)
      console.warn(`429 on ${url}, retrying after ${backoff}ms (attempt ${attempt})`)
      await new Promise(r => setTimeout(r, backoff))
      return fetchAvatarBase64(url, attempt + 1)
    }
    if (!res.ok) {
      // Other HTTP errors
      throw new Error(`HTTP ${res.status}`)
    }

    const buffer = await res.arrayBuffer()
    const mime = res.headers.get("Content-Type") || "image/png"
    const base64 = `data:${mime};base64,${Buffer.from(buffer).toString("base64")}`
    avatarCache.set(url, { base64, expiresAt: now + CACHE_TTL })
    return base64

  } catch (err) {
    if (attempt < MAX_RETRIES) {
      const backoff = INITIAL_BACKOFF * Math.pow(2, attempt - 1)
      console.warn(`Error fetching ${url} (${err}), retrying in ${backoff}ms`)
      await new Promise(r => setTimeout(r, backoff))
      return fetchAvatarBase64(url, attempt + 1)
    }
    // If we reach here, we've exhausted our retries
    console.error(`Failed to fetch ${url} after ${attempt} attempts:`, err)
    throw err
  }
}

async function downloadAllAvatars(urls: string[]) {
  const tasks = urls.map(url =>
    limit(() =>
      fetchAvatarBase64(url).catch(() => null)
    )
  )
  const results = await Promise.all(tasks)
  return results.filter(b => b !== null)
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
    { width: 1200, height: 1080, fonts: [] }
  )

  return sharp(Buffer.from(svg))
    .resize(1200, 1080)
    .png({ quality: 100 })
    .toBuffer()
}

const app = new Hono()

app.get("/:orgslug", async c => {
  const orgSlug = c.req.param("orgslug")
  const iconSize = Number(c.req.query("icon_size")) || 64
  const gap = Number(c.req.query("gap")) || 12

  console.log(`Generating grid for ${orgSlug}, size ${iconSize}, gap ${gap}`)

  // Fetch donation pages in parallel
  const pageFetches = Array.from({ length: 15 }, (_, i) =>
    fetch(`https://hcb.hackclub.com/api/v3/organizations/${orgSlug}/donations?per_page=100&page=${i + 1}`)
      .then(r => r.json())
      .then(data =>
        data
          .map((d: any) => d.donor?.avatar?.replace("/128/", `/${iconSize}/`))
          .filter(Boolean)
      )
      .catch(() => [])
  )
  const pages = await Promise.all(pageFetches)
  const avatarUrls = [...new Set(pages.flat())]

  console.time("downloadAvatars")
  const avatarsBase64 = await downloadAllAvatars(avatarUrls)
  console.timeEnd("downloadAvatars")

  console.time("generateImage")
  const img = await generateAvatarGridImage(iconSize, gap, avatarsBase64)
  console.timeEnd("generateImage")

  c.header("Content-Type", "image/png")
  c.header('Cache-Control', 'public, max-age=43200, must-revalidate');
  return c.body(img)
})

app.get("*", c => c.redirect("https://github.com/hackclub/hcb-donor-graph"))

Bun.serve({
  fetch: app.fetch,
  idleTimeout: 60,
})
console.log("Server running on http://localhost:3000")
