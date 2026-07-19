"use client";

import { Loader2, Cpu, Clapperboard, Zap, Flame, FileSearch } from "lucide-react";

interface ProcessingViewProps {
  progress: number;
  stage: string;
}

export function ProcessingView({ progress, stage }: ProcessingViewProps) {
  const pct = Math.round(progress * 100);

  // Pick title + icon based on the stage text.
  const isPatchOnly = stage.toLowerCase().includes("patch-only");
  const isHaze = stage.toLowerCase().includes("haze method") || stage.toLowerCase().includes("haze patch");
  const isQuick = stage.toLowerCase().includes("quick");

  const title = isPatchOnly
    ? "Patching MP4 sample tables"
    : isHaze
      ? "Encoding with the Haze Method"
      : isQuick
        ? "Quick encoding"
        : "Encoding video";

  const subtitle = isPatchOnly
    ? "Running the binary AST patcher on your input file. Near-instant — no re-encoding."
    : isHaze
      ? "19× internal frame multiplier — this will take a while. Don't close this tab."
      : isQuick
        ? "Ultrafast x264 preset, hard CBR. Should finish in seconds."
        : "Running libx264 in your browser. Don't close this tab — the file is being processed locally.";

  const Icon = isPatchOnly ? FileSearch : isHaze ? Flame : isQuick ? Zap : Clapperboard;

  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm p-6 sm:p-8">
      <div
        aria-hidden
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
          background:
            "linear-gradient(110deg, transparent 30%, oklch(0.72 0.22 310 / 0.15) 50%, transparent 70%)",
          backgroundSize: "200% 100%",
          animation: "marquee 2s linear infinite",
        }}
      />

      <div className="relative flex flex-col items-center gap-5 text-center">
        <div className="relative">
          <div
            className="absolute inset-0 rounded-full blur-2xl"
            style={{
              background:
                "radial-gradient(circle, oklch(0.72 0.22 310 / 0.45), transparent 70%)",
            }}
          />
          <div className="relative h-16 w-16 rounded-full grid place-items-center bg-gradient-to-br from-primary to-accent text-white shadow-lg">
            {isPatchOnly ? (
              <Icon className="h-7 w-7" />
            ) : (
              <Loader2 className="h-7 w-7 animate-spin" />
            )}
          </div>
        </div>

        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-foreground">
            {title}
          </h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            {subtitle}
          </p>
        </div>

        {/* Progress bar */}
        <div className="w-full max-w-md space-y-2">
          <div className="relative h-2 w-full overflow-hidden rounded-full bg-white/5">
            <div
              className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-300 ease-out"
              style={{
                width: `${pct}%`,
                background:
                  "linear-gradient(90deg, oklch(0.72 0.22 310), oklch(0.6 0.24 200))",
                boxShadow: "0 0 12px oklch(0.72 0.22 310 / 0.6)",
              }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Cpu className="h-3.5 w-3.5" />
              {stage}
            </span>
            <span className="tabular-nums font-mono text-foreground">
              {pct}%
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 text-[10px] text-muted-foreground">
          {isPatchOnly ? (
            <>
              <span className="inline-flex items-center gap-1 rounded-md bg-white/5 px-2 py-1">
                <FileSearch className="h-3 w-3" /> AST patcher
              </span>
              <span className="inline-flex items-center gap-1 rounded-md bg-white/5 px-2 py-1">
                stts / mdhd / mvhd
              </span>
              <span className="inline-flex items-center gap-1 rounded-md bg-white/5 px-2 py-1">
                no re-encode
              </span>
            </>
          ) : (
            <>
              <span className="inline-flex items-center gap-1 rounded-md bg-white/5 px-2 py-1">
                <Clapperboard className="h-3 w-3" /> libx264
              </span>
              <span className="inline-flex items-center gap-1 rounded-md bg-white/5 px-2 py-1">
                yuv420p
              </span>
              <span className="inline-flex items-center gap-1 rounded-md bg-white/5 px-2 py-1">
                bt709
              </span>
              <span className="inline-flex items-center gap-1 rounded-md bg-white/5 px-2 py-1">
                {isHaze || isQuick ? "no faststart" : "+faststart"}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
