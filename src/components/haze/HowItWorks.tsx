"use client";

import { Upload, Settings2, Cpu, Download } from "lucide-react";

const STEPS = [
  {
    icon: Upload,
    title: "Drop your clip",
    body: "MP4, MOV, WebM or MKV up to 500 MB. The file is read entirely in your browser — it never touches a server.",
  },
  {
    icon: Settings2,
    title: "Pick a preset + FPS",
    body: "Choose Maximum Quality, Balanced, Compact or High Motion. Pick 24–120 fps — 120 fps automatically engages Haze Engine 2.0.",
  },
  {
    icon: Cpu,
    title: "Stage 1: Re-encode",
    body: "FFmpeg.wasm runs libx264 with yuv420p, bt709 color tags, closed 2-second GOPs and +faststart — the exact recipe TikTok already accepts.",
  },
  {
    icon: Download,
    title: "Stage 2: Binary AST patch",
    body: "Haze Engine 2.0 walks the MP4 box tree and rewrites stts / stsz / stsc tables — injecting fake samples up to 400 fps, or applying a metadata-only patch for higher targets.",
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="px-4 sm:px-6 py-16 sm:py-24">
      <div className="mx-auto max-w-6xl">
        <div className="text-center mb-12">
          <p className="text-xs uppercase tracking-wider text-primary font-semibold mb-2">
            How it works
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Two stages. Zero uploads.
          </h2>
          <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
            Stage 1 re-encodes with libx264. Stage 2 runs the binary AST
            patcher to inflate the declared frame cadence — so platforms
            skip their heaviest compression pass.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <div
                key={step.title}
                className="relative rounded-2xl border border-border/60 bg-card/40 backdrop-blur-sm p-5 hover:border-primary/40 hover:bg-card/60 transition-colors"
              >
                <div className="absolute top-4 right-4 text-5xl font-bold text-white/[0.04] leading-none select-none">
                  {i + 1}
                </div>
                <div className="relative h-10 w-10 rounded-lg grid place-items-center bg-gradient-to-br from-primary/20 to-accent/20 border border-border/60 mb-3">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-base font-semibold text-foreground mb-1.5">
                  {step.title}
                </h3>
                <p
                  className="text-sm text-muted-foreground leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: step.body }}
                />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
