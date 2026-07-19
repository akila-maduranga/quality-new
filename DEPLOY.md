# Haze Bypass — Deploy to Vercel

A 100% client-side TikTok compression optimizer. Re-encodes videos in the
browser using FFmpeg.wasm with the Haze Method (H.264 High@L4.0 + yuv420p +
bt709 + closed GOP + +faststart).

## Deploy

### Option A — One-click via Vercel dashboard

1. Push this repo to GitHub / GitLab / Bitbucket.
2. Go to <https://vercel.com/new> and import the repo.
3. Vercel auto-detects Next.js. Keep the defaults:
   - **Build Command:** `next build` (auto-detected)
   - **Output Directory:** `.next` (auto-detected)
   - **Install Command:** `bun install` (or `npm install` / `pnpm install`)
4. Click **Deploy**.

That's it. No environment variables, no database, no server functions.

### Option B — Vercel CLI

```bash
npm i -g vercel
cd haze-bypass
vercel          # preview deployment
vercel --prod   # production deployment
```

## Why this works on Vercel

- **No server, no API routes.** The entire app is a static Next.js page +
  client components. FFmpeg runs in the browser via WebAssembly.
- **Self-hosted FFmpeg core.** The ~31 MB `ffmpeg-core.wasm` lives in
  `public/ffmpeg/` and is served by Vercel's edge CDN. No runtime dependency
  on unpkg or jsdelivr.
- **COOP / COEP headers configured in `vercel.json`.** Vercel serves
  `/_next/static/*` and `/public/*` from its CDN, which bypasses
  `next.config.ts`'s `headers()` function. `vercel.json` ensures
  `Cross-Origin-Opener-Policy: same-origin` and
  `Cross-Origin-Embedder-Policy: credentialless` are applied to **every**
  route, including static assets.
- **No SharedArrayBuffer requirement.** We use the single-threaded FFmpeg
  core, so cross-origin isolation is a safety net, not a hard requirement.

## Configuration files

| File | Purpose |
|---|---|
| `vercel.json` | Headers + cache rules for all routes (incl. static) |
| `next.config.ts` | Same headers for local dev + non-Vercel deploys |
| `public/ffmpeg/` | Self-hosted FFmpeg 0.12.10 single-threaded core |
| `src/lib/haze/ffmpeg.ts` | Loads core from `/ffmpeg/ffmpeg-core.{js,wasm}` |

## Limits

- **Max upload size:** 500 MB (enforced client-side). Vercel doesn't impose
  a limit here because the file never leaves the browser.
- **Browser memory:** ~2 GB on desktop Chrome, ~384 MB on iOS Safari. Very
  long clips may fail with `Compact` preset.
- **Build size:** ~32 MB deployment (most of which is `ffmpeg-core.wasm`).
  Well under Vercel's 100 MB compressed limit.

## Updating FFmpeg core

```bash
cd public/ffmpeg
curl -sSL -o ffmpeg-core.js https://unpkg.com/@ffmpeg/core@<VERSION>/dist/umd/ffmpeg-core.js
curl -sSL -o ffmpeg-core.wasm https://unpkg.com/@ffmpeg/core@<VERSION>/dist/umd/ffmpeg-core.wasm
```

Then bump `@ffmpeg/ffmpeg` and `@ffmpeg/util` in `package.json` to match.

## Local development

```bash
bun install
bun run dev     # http://localhost:3000
bun run lint    # eslint
```
