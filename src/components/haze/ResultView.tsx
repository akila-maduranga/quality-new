"use client";

import { Download, RefreshCw, CheckCircle2, ArrowRight, Cpu, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatBytes, diffBytes, formatDuration } from "@/lib/haze/format";
import {
  type Preset,
  type AspectTarget,
  type EngineMode,
  HAZE_FRAME_MULTIPLIER,
} from "@/lib/haze/presets";
import type { PatchResult } from "@/lib/haze/patcher";

interface ResultViewProps {
  resultUrl: string;
  resultSize: number;
  resultName: string;
  inputSize: number;
  inputDuration: number;
  preset: Preset;
  target: AspectTarget;
  fps: number;
  audio: boolean;
  engineMode: EngineMode;
  patch: PatchResult | null;
  strategy: {
    mode: "inject" | "metadata" | "haze" | "off";
    multiplier: number;
    explanation: string;
  } | null;
  onReset: () => void;
}

export function ResultView({
  resultUrl,
  resultSize,
  resultName,
  inputSize,
  inputDuration,
  preset,
  target,
  fps,
  audio,
  engineMode,
  patch,
  strategy,
  onReset,
}: ResultViewProps) {
  const diff = diffBytes(inputSize, resultSize);
  const bitrateKbps =
    inputDuration > 0 ? Math.round((resultSize * 8) / inputDuration / 1000) : 0;

  const patchMode = strategy?.mode ?? "off";
  const isHaze = engineMode === "haze";
  const injectedSamples = patch
    ? Math.max(0, patch.stats.patchedSampleCount - patch.stats.originalSampleCount)
    : 0;

  // Effective internal fps for display in Haze mode
  const internalFps = isHaze ? fps * HAZE_FRAME_MULTIPLIER : fps;

  // H.264 level — must match the encoder's choice (see presets.ts).
  const pixels = target.width * target.height;
  const is4k = pixels >= 3840 * 2160;
  const h264Level = is4k
    ? internalFps >= 60
      ? "5.2"
      : "5.1"
    : internalFps >= 60
      ? "4.2"
      : "4.0";

  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm">
      <div className="grid lg:grid-cols-2 gap-0">
        {/* Preview */}
        <div className="relative bg-black/40 p-4 sm:p-6 flex items-center justify-center min-h-[16rem]">
          <video
            src={resultUrl}
            controls
            playsInline
            className="max-h-[28rem] w-full rounded-lg shadow-2xl"
            style={{
              maxHeight: "28rem",
              aspectRatio: `${target.width} / ${target.height}`,
              objectFit: "contain",
            }}
          />
        </div>

        {/* Stats + actions */}
        <div className="flex flex-col gap-4 p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            <h3 className="text-lg font-semibold text-foreground">
              {isHaze ? "Haze Method encoded" : "Optimized & ready"}
            </h3>
            {isHaze ? (
              <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-gradient-to-br from-primary to-accent text-white px-2 py-0.5 rounded-full">
                <Flame className="h-3 w-3" />
                Haze {HAZE_FRAME_MULTIPLIER}×
              </span>
            ) : patchMode !== "off" ? (
              <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-gradient-to-br from-primary to-accent text-white px-2 py-0.5 rounded-full">
                <Cpu className="h-3 w-3" />
                {patchMode === "inject" ? "Injected" : "Patched"}
              </span>
            ) : null}
          </div>

          <p className="text-sm text-muted-foreground -mt-2">
            {isHaze ? (
              <>
                Encoded with the{" "}
                <span className="text-foreground font-medium">Haze Method</span>{" "}
                — {HAZE_FRAME_MULTIPLIER}× internal frame multiplier
                (frame-hold duplication), hard CBR at{" "}
                <span className="text-foreground font-medium">{preset.videoBitrate}</span>,
                no +faststart, encoder tag embedded. Matches the working
                hazemethod.xyz sample spec.
              </>
            ) : (
              <>
                Re-encoded with{" "}
                <span className="text-foreground font-medium">{preset.name}</span>
                {patchMode !== "off" && (
                  <>
                    {" "}then run through{" "}
                    <span className="text-foreground font-medium">
                      Haze Engine 2.0
                    </span>{" "}
                    ({patchMode === "inject" ? "fake sample injection" : "metadata patch"}
                    {strategy && strategy.multiplier > 1 ? `, ${strategy.multiplier}×` : ""})
                  </>
                )}
                . Upload to TikTok and you should see noticeably less
                macroblocking, banding and color shift in the final post.
              </>
            )}
          </p>

          {/* Stat grid */}
          <div className="grid grid-cols-2 gap-2">
            <Stat label="Original" value={formatBytes(inputSize)} tone="muted" />
            <Stat label="Optimized" value={formatBytes(resultSize)} tone="foreground" />
            <Stat
              label="Change"
              value={
                diff.direction === "same"
                  ? "≈ same"
                  : `${diff.direction === "larger" ? "+" : "−"}${formatBytes(diff.delta)} (${diff.percent.toFixed(1)}%)`
              }
              tone={diff.direction === "larger" ? "primary" : "accent"}
            />
            <Stat
              label="Avg bitrate"
              value={bitrateKbps > 0 ? `${bitrateKbps.toLocaleString()} kbps` : "—"}
              tone="muted"
            />
          </div>

          {/* Haze Method stats (when in Haze mode) */}
          {isHaze && (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <Flame className="h-3.5 w-3.5 text-primary" />
                <p className="text-[10px] uppercase tracking-wider text-primary font-semibold">
                  Haze Method traits
                </p>
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                <PatchStat
                  label="Frame multiplier"
                  value={`${HAZE_FRAME_MULTIPLIER}×`}
                />
                <PatchStat
                  label="Display FPS"
                  value={`${fps} fps`}
                />
                <PatchStat
                  label="Internal FPS"
                  value={`${internalFps} fps`}
                />
                <PatchStat
                  label="Bitrate mode"
                  value="Hard CBR"
                />
                <PatchStat
                  label="Maxrate"
                  value={preset.videoBitrate}
                />
                <PatchStat
                  label="Bufsize"
                  value="none"
                />
                <PatchStat
                  label="moov atom"
                  value="END of file"
                />
                <PatchStat
                  label="Encoder tag"
                  value="Haze Method"
                />
              </div>
            </div>
          )}

          {/* Patch stats (when in classic mode + patcher ran) */}
          {!isHaze && patch && patchMode !== "off" && (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <Cpu className="h-3.5 w-3.5 text-primary" />
                <p className="text-[10px] uppercase tracking-wider text-primary font-semibold">
                  Binary AST patch
                </p>
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                <PatchStat
                  label="Strategy"
                  value={patchMode === "inject" ? "Fake samples" : "Header-only"}
                />
                <PatchStat
                  label="Multiplier"
                  value={`${patch.multiplier}×`}
                />
                <PatchStat
                  label="Real samples"
                  value={patch.stats.originalSampleCount.toLocaleString()}
                />
                <PatchStat
                  label="Declared samples"
                  value={patch.stats.patchedSampleCount.toLocaleString()}
                />
                {injectedSamples > 0 && (
                  <PatchStat
                    label="Phantom samples"
                    value={`+${injectedSamples.toLocaleString()}`}
                  />
                )}
                <PatchStat
                  label="Declared FPS"
                  value={`${patch.stats.declaredFps} fps`}
                />
                {patch.stats.timescale > 0 && (
                  <PatchStat
                    label="Timescale"
                    value={`${patch.stats.timescale} Hz`}
                  />
                )}
              </div>
            </div>
          )}

          {/* Spec sheet */}
          <div className="rounded-lg border border-border/60 bg-white/[0.02] p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
              {isHaze ? "Haze Method spec" : "Encoding spec"}
            </p>
            <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
              <SpecRow k="Codec" v="H.264 (libx264)" />
              <SpecRow k="Profile" v={`${preset.profile} @ L${h264Level}`} />
              <SpecRow k="Resolution" v={`${target.width}×${target.height}`} />
              <SpecRow
                k="FPS"
                v={
                  isHaze
                    ? `${fps} display / ${internalFps} internal`
                    : `${patch && patch.mode !== "off" ? patch.stats.declaredFps : fps} fps`
                }
              />
              <SpecRow k="Pixel format" v="yuv420p" />
              <SpecRow k="Color" v="bt709 / bt709 / bt709" />
              <SpecRow k="Bitrate" v={preset.videoBitrate} />
              <SpecRow
                k="Maxrate"
                v={isHaze ? `${preset.videoBitrate} (== b:v)` : preset.maxBitrate}
              />
              <SpecRow k="Audio" v={audio ? `AAC ${preset.audioBitrate}` : "None"} />
              <SpecRow
                k="Container"
                v={
                  isHaze
                    ? "MP4 (no faststart)"
                    : `MP4 ${patchMode !== "off" ? "+ AST" : "+faststart"}`
                }
              />
              <SpecRow
                k="GOP"
                v={
                  isHaze
                    ? `${internalFps * 2} frames (2s @ internal)`
                    : `${Math.min(fps, 60) * 2} frames`
                }
              />
              <SpecRow
                k="moov position"
                v={isHaze ? "END (mdat first)" : "START (+faststart)"}
              />
            </dl>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 mt-auto">
            <a href={resultUrl} download={resultName} className="flex-1">
              <Button className="w-full h-11 text-sm font-semibold" size="lg">
                <Download className="h-4 w-4 mr-2" />
                Download MP4
              </Button>
            </a>
            <Button
              variant="outline"
              size="lg"
              onClick={onReset}
              className="h-11 text-sm font-semibold"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Optimize another
            </Button>
          </div>

          <p className="text-[11px] text-muted-foreground text-center">
            Tip: post within 24h for the cleanest re-encode on TikTok&apos;s
            side.{" "}
            <span className="inline-flex items-center gap-1 text-foreground/80">
              See spec sheet <ArrowRight className="h-3 w-3" />
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "muted" | "foreground" | "primary" | "accent";
}) {
  const toneCls = {
    muted: "text-muted-foreground",
    foreground: "text-foreground",
    primary: "text-primary",
    accent: "text-accent",
  }[tone];

  return (
    <div className="rounded-lg border border-border/60 bg-white/[0.02] px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className={`text-sm font-semibold tabular-nums ${toneCls}`}>{value}</p>
    </div>
  );
}

function PatchStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 min-w-0">
      <dt className="text-muted-foreground shrink-0">{label}</dt>
      <dd className="font-mono text-foreground truncate text-right">{value}</dd>
    </div>
  );
}

function SpecRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between gap-2 min-w-0">
      <dt className="text-muted-foreground shrink-0">{k}</dt>
      <dd className="font-mono text-foreground truncate text-right">{v}</dd>
    </div>
  );
}
