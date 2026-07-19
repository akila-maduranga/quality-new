"use client";

import { ShieldCheck, Zap, Lock } from "lucide-react";

export function Hero() {
  return (
    <section
      id="top"
      className="relative px-4 sm:px-6 pt-12 sm:pt-20 pb-8 sm:pb-12 text-center"
    >
      <div className="mx-auto max-w-3xl flex flex-col items-center gap-5">
        <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-white/5 px-3 py-1 text-xs text-muted-foreground backdrop-blur-sm">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
          </span>
          100% in-browser • no upload • no watermark
        </div>

        <h1 className="text-4xl sm:text-6xl font-bold tracking-tight leading-[1.05]">
          <span className="gradient-text">Bypass TikTok</span>
          <br />
          <span className="text-foreground">compression, cleanly.</span>
        </h1>

        <p className="max-w-2xl text-base sm:text-lg text-muted-foreground leading-relaxed">
          A binary AST patcher — it restructures the MP4 container, injects
          fake video samples into chunk tables, and shifts offsets so
          platforms skip their heaviest compression. Backed by Haze Engine
          2.0 with smart FPS targeting up to 400 fps.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-muted-foreground">
          <Badge icon={<Lock className="h-3.5 w-3.5" />}>
            Files never leave your device
          </Badge>
          <Badge icon={<Zap className="h-3.5 w-3.5" />}>
            Up to 4K · 120 fps · 2 GB
          </Badge>
          <Badge icon={<ShieldCheck className="h-3.5 w-3.5" />}>
            Haze Method + binary AST
          </Badge>
        </div>
      </div>
    </section>
  );
}

function Badge({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-white/5 px-3 py-1.5 backdrop-blur-sm">
      <span className="text-primary">{icon}</span>
      {children}
    </span>
  );
}
