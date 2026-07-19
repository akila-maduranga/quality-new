"use client";

const SPECS = [
  {
    label: "Container",
    value: "MP4 (Haze-patched)",
    hint: "ISO BMFF + binary AST patch",
  },
  {
    label: "Video codec",
    value: "H.264 (avc1)",
    hint: "libx264 encoder",
  },
  {
    label: "Profile / Level",
    value: "High @ L4.0–5.2",
    hint: "Auto-scaled by resolution",
  },
  {
    label: "Resolution",
    value: "1080p · 4K (UHD)",
    hint: "Up to 3840×2160",
  },
  {
    label: "Pixel format",
    value: "yuv420p",
    hint: "8-bit 4:2:0 chroma",
  },
  {
    label: "Color metadata",
    value: "bt709 / bt709 / bt709",
    hint: "primaries / trc / matrix",
  },
  {
    label: "Bitrate strategy",
    value: "Hard CBR",
    hint: "maxrate == bitrate, no bufsize",
  },
  {
    label: "Bitrate range",
    value: "8M – 80M",
    hint: "Compact → 4K Ultra",
  },
  {
    label: "Frame multiplier",
    value: "19× internal",
    hint: "Frame-hold duplication",
  },
  {
    label: "GOP / keyframes",
    value: "2s @ internal fps",
    hint: "sc_threshold=0",
  },
  {
    label: "B-frames",
    value: "2 / pyramidal",
    hint: "b_strategy=2",
  },
  {
    label: "Audio codec",
    value: "AAC-LC 48 kHz",
    hint: "Stereo, 160–320 kbps",
  },
  {
    label: "MOOV atom",
    value: "END of file",
    hint: "No +faststart (mdat first)",
  },
  {
    label: "Encoder tag",
    value: "Haze Method",
    hint: "Embedded in track metadata",
  },
  {
    label: "AST patcher",
    value: "stts delta × 19",
    hint: "Declares display fps",
  },
  {
    label: "Sample count",
    value: "19× display fps × duration",
    hint: "All real frames, no phantoms",
  },
  {
    label: "Max input size",
    value: "2 GB",
    hint: "Browser memory is the real limit",
  },
];

export function SpecSheet() {
  return (
    <section id="specs" className="px-4 sm:px-6 py-16 sm:py-24 border-y border-border/40 bg-white/[0.01]">
      <div className="mx-auto max-w-6xl">
        <div className="text-center mb-12">
          <p className="text-xs uppercase tracking-wider text-primary font-semibold mb-2">
            Spec sheet
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
            The Haze Method, in 17 lines.
          </h2>
          <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">
            Every output file produced by this optimizer carries the exact
            spec below. This is the same recipe TikTok&apos;s transcoder
            already outputs, so it does the least additional damage.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {SPECS.map((spec) => (
            <div
              key={spec.label}
              className="rounded-xl border border-border/60 bg-card/40 backdrop-blur-sm p-4 hover:border-primary/40 transition-colors"
            >
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">
                {spec.label}
              </p>
              <p className="text-sm font-semibold text-foreground font-mono">
                {spec.value}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {spec.hint}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-xl border border-border/60 bg-black/30 p-4 sm:p-6 overflow-x-auto">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
            Equivalent FFmpeg command (Haze Method)
          </p>
          <pre className="text-xs font-mono text-foreground/90 leading-relaxed whitespace-pre-wrap break-all">
            <span className="text-primary">ffmpeg</span> -i input.mp4 {"\""}{"\n"}
            <span className="text-accent">-vf</span> scale=1080:1920:flags=lanczos,fps=1140:round=up{"\""}{"\n"}
            <span className="text-accent">-c:v</span> libx264 <span className="text-accent">-profile:v</span> high{" "}
            <span className="text-accent">-level</span> 4.0 <span className="text-accent">-pix_fmt</span> yuv420p{"\n"}
            <span className="text-accent">-b:v</span> 16M <span className="text-accent">-maxrate</span> 16M
            <span className="text-muted-foreground">  # hard CBR, no -bufsize</span>{"\n"}
            <span className="text-accent">-g</span> 2280 <span className="text-accent">-keyint_min</span> 1140{" "}
            <span className="text-accent">-sc_threshold</span> 0{"\n"}
            <span className="text-accent">-c:a</span> aac <span className="text-accent">-b:a</span> 256k{" "}
            <span className="text-accent">-ar</span> 48000 <span className="text-accent">-ac</span> 2{"\n"}
            <span className="text-accent">-metadata:s:v:0</span> encoder=&quot;Haze Method - https://hazemethod.xyz&quot;{"\n"}
            <span className="text-accent">-movflags</span> +use_metadata_tags{"\n"}
            haze_output.mp4
            <span className="text-muted-foreground">  # NO +faststart — moov stays at END</span>
          </pre>
          <p className="text-[11px] text-muted-foreground mt-3 leading-relaxed">
            Then a stage-2 binary AST patcher multiplies{" "}
            <code className="font-mono text-foreground/80">stts.sample_delta</code>{" "}
            by 19 to slow the declared fps back down to the display fps (e.g.
            1140 → 60), matching the working hazemethod.xyz sample.
          </p>
        </div>
      </div>
    </section>
  );
}
