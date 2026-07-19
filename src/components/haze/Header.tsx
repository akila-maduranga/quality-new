"use client";

import { Sparkles, Github } from "lucide-react";

export function Header() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/40 backdrop-blur-xl bg-background/60">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <a href="#top" className="flex items-center gap-2.5 group">
          <div className="relative h-9 w-9 rounded-lg overflow-hidden glow-pill grid place-items-center">
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.72 0.22 310), oklch(0.6 0.24 200))",
              }}
            />
            <Sparkles className="relative h-4 w-4 text-white" />
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-sm font-semibold tracking-tight">
              Haze Bypass
            </span>
            <span className="text-[10px] text-muted-foreground tracking-wider uppercase">
              TikTok Optimizer
            </span>
          </div>
        </a>

        <nav className="hidden md:flex items-center gap-1 text-sm">
          <a
            href="#optimizer"
            className="px-3 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
          >
            Optimizer
          </a>
          <a
            href="#how"
            className="px-3 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
          >
            How it works
          </a>
          <a
            href="#specs"
            className="px-3 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
          >
            Spec sheet
          </a>
          <a
            href="#faq"
            className="px-3 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
          >
            FAQ
          </a>
        </nav>

        <a
          href="https://github.com"
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border/60 text-muted-foreground hover:text-foreground hover:border-border transition-colors"
          aria-label="GitHub"
        >
          <Github className="h-4 w-4" />
        </a>
      </div>
    </header>
  );
}
