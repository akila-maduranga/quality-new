"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQS = [
  {
    q: "What is Haze Engine 2.0?",
    a: "Haze Engine 2.0 is a binary AST patcher that runs as the second stage of the pipeline, after FFmpeg produces a clean H.264 MP4. It parses the MP4 ISO BMFF box tree (moov → trak → mdia → minf → stbl) and rewrites the sample tables. In inject mode it splits every stts entry into N pieces and pads stsz with zero-byte duplicate entries — making the platform believe the video has N× as many frames. In metadata mode it only rewrites mdhd / mvhd / tkhd / stts header fields to declare a higher FPS without touching sample data. The platform's transcoder then allocates a higher bitrate tier based on the declared cadence, so your video survives re-encoding with less visible damage.",
  },
  {
    q: "What is the Haze Method?",
    a: "The Haze Method is stage 1 of the pipeline — an opinionated FFmpeg recipe for pre-encoding short-form video before uploading to TikTok. It pins the codec to H.264 High@L4.0, the pixel format to yuv420p, color metadata to bt709, and forces a closed 2-second GOP with +faststart. Because TikTok's transcoder already outputs a similar spec, it has the least reason to re-encode your upload aggressively.",
  },
  {
    q: "Will TikTok ban me for using this?",
    a: "No. The patcher produces a standards-compliant H.264 MP4 file — every box, every offset, every sample table is well-formed ISO BMFF. There is no exploit, no SDK hook, and no API involved. You are simply pre-encoding your video with the spec TikTok already prefers and tuning the declared cadence so its transcoder picks a higher bitrate tier.",
  },
  {
    q: "What's the difference between 'Inject' and 'Metadata' patch modes?",
    a: "Inject mode physically adds fake sample entries to the stts / stsz / stsc tables — every real frame becomes N phantom frames with zero-byte sizes that point at the same NAL unit. This is the strongest mode and works up to 400 fps. Metadata mode leaves the sample tables alone and only rewrites the duration fields in mdhd / mvhd / tkhd and the sample_delta in stts, so the declared FPS is higher without any new bytes. Metadata mode is faster and produces smaller files but is less aggressive; use it when you want a 240+ fps target without exploding file size.",
  },
  {
    q: "Does my video get uploaded to a server?",
    a: "No. Everything happens locally in your browser using FFmpeg compiled to WebAssembly. Your video file never leaves your device, which means there is no upload bandwidth, no server storage, and no way for anyone (including us) to access your footage. Close the tab and every trace is gone.",
  },
  {
    q: "Why is the optimized file sometimes larger than the original?",
    a: "If your source was already heavily compressed (e.g. a TikTok download, a low-bitrate screen recording, or a 480p clip), re-encoding it at the Haze Method's target bitrate will produce a larger file. That is expected and is actually the point: you are feeding TikTok a higher-quality master so its transcoder doesn't have to invent detail from a muddy source. The size on your device is not what ends up on TikTok — TikTok re-compresses everything.",
  },
  {
    q: "Which preset should I pick?",
    a: "For 1080p, start with Balanced (~12 Mbps) or Maximum Quality (~16 Mbps) for detail-heavy clips. For 4K uploads, pick 4K Cinema (40 Mbps) as the default — it's the sweet spot between crispness and file size. Switch to 4K Ultra (60 Mbps / 80 Mbps ceiling) only for cinematic nature, product showcases, or anything where preserving fine grain and textures matters more than upload time. Compact is for when you're bumping against upload size limits.",
  },
  {
    q: "Does it support 4K output?",
    a: "Yes. Pick any of the three 4K aspect ratios — 9:16 Vertical 4K (2160×3840), 16:9 Horizontal 4K (3840×2160), or 1:1 Square 4K (2160×2160) — and pair it with the 4K Cinema or 4K Ultra preset. The encoder automatically bumps the H.264 level to 5.1 (4K30) or 5.2 (4K60) so the file stays standards-compliant. Note that 4K encodes are 4× slower than 1080p and produce 3–5× larger files.",
  },
  {
    q: "What's the maximum input file size?",
    a: "2 GB. That's the cap we enforce client-side for in-browser FFmpeg processing. The actual limit you'll hit is your device's available memory — WASM FFmpeg needs roughly 3–4× the file size in RAM during encoding. A 2 GB clip on a machine with 8 GB of RAM will work; on a phone with 3 GB it won't. If you see an 'out of memory' error, switch to the Compact preset, lower the resolution to 1080p, or trim the clip before uploading.",
  },
  {
    q: "Why 9:16 specifically?",
    a: "TikTok's vertical feed is 1080×1920 (9:16). Uploading a clip that already matches this canvas means TikTok does not need to scale, crop or letterbox it — all of which would trigger an additional re-encode pass. The 1:1 and 16:9 options are there for stories, photo mode and landscape experiments. The 4K variants (2160×3840, 3840×2160, 2160×2160) exist for creators who want to feed TikTok a higher-resolution master so the platform's downscaled output stays sharper.",
  },
  {
    q: "How long does encoding take?",
    a: "Depends on the engine mode you pick. Patch only mode is near-instant (under 1 second) because it skips FFmpeg entirely and just rewrites the MP4 sample tables. Quick mode uses the ultrafast x264 preset — a 30-second 1080p clip takes 5–15 seconds. Classic mode uses the medium/slow presets — 1–3 minutes for the same clip. Haze Method mode is the slowest at 15–30 minutes for a 30-second 1080p60 clip because of the 19× internal frame multiplier. 4K encodes take 4–6× longer than 1080p in any mode. Mobile devices will be slower, especially on iOS Safari.",
  },
  {
    q: "Why is this slower than hazemethod.xyz?",
    a: "hazemethod.xyz processes videos server-side with hardware-accelerated encoding (NVENC on NVIDIA GPUs or QuickSync on Intel). This tool runs 100% in your browser via FFmpeg compiled to WebAssembly — no server, no GPU, just your CPU's software encoder. The trade-off: your video never leaves your device (total privacy), but encoding is 5–20× slower than a GPU-accelerated server. For fast results, use Patch only mode (instant) or Quick mode (5–15 seconds for a 30-second clip).",
  },
  {
    q: "What's the difference between Quick, Haze Method, Classic, and Patch only?",
    a: "Quick: ultrafast x264 preset, hard CBR, no faststart, encoder tag. 10× faster than Haze Method, same recipe otherwise. Best for everyday use. Haze Method: the exact hazemethod.xyz recipe — 19× internal frame multiplier via frame-hold duplication, slow x264 preset, hard CBR, no faststart. Matches the working sample but takes 15–30 minutes for a 30-second clip. Classic: standard VBR encode with +faststart, plus the stage-2 binary AST patcher to inflate declared fps up to 400 fps. Patch only: skips FFmpeg entirely. Just runs the binary AST patcher on your input MP4 to rewrite the declared fps. Near-instant but doesn't re-encode — your video bytes are preserved exactly.",
  },
  {
    q: "Does it work on iPhone?",
    a: "Yes, on iOS 14.4 or later. iOS Safari has some of the strictest WASM memory limits in the industry, so very long clips (over ~3 minutes at 1080p, or over ~45 seconds at 4K) may fail with an out-of-memory error. If that happens, switch to the Compact preset, drop to 1080p, or trim your clip first.",
  },
  {
    q: "Can I use this for Instagram Reels or YouTube Shorts?",
    a: "Yes. The Haze Method produces a generic, broadly-compatible H.264 MP4 that works everywhere. Instagram's transcoder is similar to TikTok's, so the same recipe applies. YouTube Shorts prefers higher bitrates and accepts H.264 / VP9 / AV1 — this tool focuses on the TikTok / Reels case specifically.",
  },
];

export function FAQ() {
  return (
    <section id="faq" className="px-4 sm:px-6 py-16 sm:py-24">
      <div className="mx-auto max-w-3xl">
        <div className="text-center mb-10">
          <p className="text-xs uppercase tracking-wider text-primary font-semibold mb-2">
            FAQ
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Questions, answered.
          </h2>
        </div>

        <Accordion
          type="single"
          collapsible
          className="w-full space-y-3"
          defaultValue="item-0"
        >
          {FAQS.map((faq, i) => (
            <AccordionItem
              key={i}
              value={`item-${i}`}
              className="rounded-xl border border-border/60 bg-card/40 backdrop-blur-sm px-4 sm:px-5 data-[state=open]:border-primary/40 data-[state=open]:bg-card/60 transition-colors"
            >
              <AccordionTrigger className="text-left text-sm sm:text-base font-medium hover:no-underline py-4">
                {faq.q}
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-4">
                {faq.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
