"use client";

import {
  PRESETS,
  ASPECT_TARGETS,
  FPS_OPTIONS,
  MAX_INJECTION_FPS,
  HAZE_FRAME_MULTIPLIER,
  choosePatchStrategy,
  type PresetId,
  type AspectMode,
  type PatchMode,
  type EngineMode,
  type Preset,
  type AspectTarget,
} from "@/lib/haze/presets";
import {
  Sparkles,
  Gauge,
  Layers,
  Film,
  Music2,
  Music,
  Cpu,
  Zap,
  ShieldOff,
  Wrench,
  Flame,
  Settings2,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface SettingsPanelProps {
  presetId: PresetId;
  aspectMode: AspectMode;
  fps: number;
  audio: boolean;
  patchMode: PatchMode;
  engineMode: EngineMode;
  sourceFps: number;
  onPresetChange: (id: PresetId) => void;
  onAspectChange: (mode: AspectMode) => void;
  onFpsChange: (fps: number) => void;
  onAudioChange: (audio: boolean) => void;
  onPatchModeChange: (mode: PatchMode) => void;
  onEngineModeChange: (mode: EngineMode) => void;
  disabled?: boolean;
}

export function SettingsPanel({
  presetId,
  aspectMode,
  fps,
  audio,
  patchMode,
  engineMode,
  sourceFps,
  onPresetChange,
  onAspectChange,
  onFpsChange,
  onAudioChange,
  onPatchModeChange,
  onEngineModeChange,
  disabled,
}: SettingsPanelProps) {
  const preset: Preset = PRESETS[presetId];
  const target: AspectTarget =
    ASPECT_TARGETS.find((t) => t.mode === aspectMode) ?? ASPECT_TARGETS[0];

  const strategy =
    engineMode === "haze"
      ? { mode: "off" as const, multiplier: HAZE_FRAME_MULTIPLIER, explanation: "" }
      : choosePatchStrategy(sourceFps || fps, fps);
  const showHaze20Badge = fps >= 120;
  const isHaze = engineMode === "haze";

  return (
    <div className="flex flex-col gap-6">
      {/* Engine mode toggle — Haze Method vs Classic */}
      <Section
        icon={<Flame className="h-4 w-4" />}
        title="Engine mode"
        hint={isHaze ? "19× internal · hard CBR" : "Standard VBR"}
      >
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={disabled}
            onClick={() => onEngineModeChange("haze")}
            className={[
              "relative text-left rounded-xl border p-3.5 transition-all overflow-hidden",
              isHaze
                ? "border-primary/80 bg-primary/10 shadow-[0_0_0_1px_oklch(0.72_0.22_310/0.35)]"
                : "border-border/60 bg-white/[0.02] hover:border-border hover:bg-white/[0.04]",
              disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer",
            ].join(" ")}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Flame className={`h-4 w-4 ${isHaze ? "text-primary" : "text-muted-foreground"}`} />
                <span className="text-sm font-semibold text-foreground">
                  Haze Method
                </span>
              </div>
              {isHaze && (
                <span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_8px_oklch(0.72_0.22_310/0.8)]" />
              )}
            </div>
            <p className="text-[11px] text-primary/90 font-medium mt-1">
              {HAZE_FRAME_MULTIPLIER}× internal fps · hard CBR · no faststart
            </p>
            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
              Matches the working hazemethod.xyz sample: 19× frame-hold
              duplication, maxrate == bitrate, moov at end, custom encoder tag.
            </p>
            <div className="mt-2.5 flex flex-wrap gap-1">
              <Pill>{HAZE_FRAME_MULTIPLIER}× mult</Pill>
              <Pill>CBR</Pill>
              <Pill>no faststart</Pill>
              <Pill>tag</Pill>
            </div>
          </button>

          <button
            type="button"
            disabled={disabled}
            onClick={() => onEngineModeChange("classic")}
            className={[
              "relative text-left rounded-xl border p-3.5 transition-all",
              !isHaze
                ? "border-primary/80 bg-primary/10 shadow-[0_0_0_1px_oklch(0.72_0.22_310/0.35)]"
                : "border-border/60 bg-white/[0.02] hover:border-border hover:bg-white/[0.04]",
              disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer",
            ].join(" ")}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Settings2 className={`h-4 w-4 ${!isHaze ? "text-primary" : "text-muted-foreground"}`} />
                <span className="text-sm font-semibold text-foreground">
                  Classic
                </span>
              </div>
              {!isHaze && (
                <span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_8px_oklch(0.72_0.22_310/0.8)]" />
              )}
            </div>
            <p className="text-[11px] text-primary/90 font-medium mt-1">
              Standard VBR · +faststart · +patcher
            </p>
            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
              libx264 encode at display fps, +faststart, stage-2 binary AST
              patcher to inflate declared fps up to 400 fps.
            </p>
            <div className="mt-2.5 flex flex-wrap gap-1">
              <Pill>VBR</Pill>
              <Pill>+faststart</Pill>
              <Pill>patcher</Pill>
            </div>
          </button>
        </div>
      </Section>
      {/* Presets */}
      <Section
        icon={<Sparkles className="h-4 w-4" />}
        title="Optimization preset"
        hint="Tunes bitrate, CRF and x264 preset."
      >
        <div className="grid sm:grid-cols-2 gap-2.5">
          {Object.values(PRESETS).map((p) => {
            const active = p.id === presetId;
            return (
              <button
                key={p.id}
                type="button"
                disabled={disabled}
                onClick={() => onPresetChange(p.id)}
                className={[
                  "group relative text-left rounded-xl border p-3.5 transition-all",
                  active
                    ? "border-primary/80 bg-primary/10 shadow-[0_0_0_1px_oklch(0.72_0.22_310/0.35)]"
                    : "border-border/60 bg-white/[0.02] hover:border-border hover:bg-white/[0.04]",
                  disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer",
                ].join(" ")}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-foreground">
                    {p.name}
                  </span>
                  {active && (
                    <span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_8px_oklch(0.72_0.22_310/0.8)]" />
                  )}
                </div>
                <p className="text-[11px] text-primary/90 font-medium mt-0.5">
                  {p.tagline}
                </p>
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed line-clamp-2">
                  {p.description}
                </p>
                <div className="mt-2.5 flex flex-wrap gap-1">
                  <Pill>{p.videoBitrate}</Pill>
                  <Pill>CRF {p.crf}</Pill>
                  <Pill>{p.profile}</Pill>
                  <Pill>{p.x264Preset}</Pill>
                </div>
              </button>
            );
          })}
        </div>
        <p className="text-[11px] text-muted-foreground mt-2">
          Best for <span className="text-foreground">{preset.recommendedFor}</span>.
        </p>
      </Section>

      {/* Aspect ratio */}
      <Section
        icon={<Layers className="h-4 w-4" />}
        title="Aspect ratio"
        hint="1080p · 4K · letterboxed"
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {ASPECT_TARGETS.map((t) => {
            const active = t.mode === aspectMode;
            const is4k = t.mode.endsWith("4k");
            return (
              <button
                key={t.mode}
                type="button"
                disabled={disabled}
                onClick={() => onAspectChange(t.mode)}
                className={[
                  "relative flex flex-col items-center gap-1.5 rounded-lg border p-3 transition-all",
                  active
                    ? "border-primary/80 bg-primary/10"
                    : "border-border/60 bg-white/[0.02] hover:border-border hover:bg-white/[0.04]",
                  disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer",
                ].join(" ")}
              >
                <AspectIcon mode={t.mode} active={active} />
                <span className="text-xs font-medium text-foreground">
                  {t.label.split(" · ")[0]}
                </span>
                <span className="text-[9px] uppercase tracking-wider text-muted-foreground">
                  {t.label.split(" · ")[1] ?? "1080p"}
                </span>
                {is4k && (
                  <span className="absolute -top-1.5 -right-1.5 text-[8px] font-bold uppercase tracking-wider bg-gradient-to-br from-accent to-primary text-white px-1.5 py-0.5 rounded-full shadow">
                    4K
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <p className="text-[11px] text-muted-foreground mt-2">
          Target:{" "}
          <span className="text-foreground tabular-nums">
            {target.width} × {target.height}
          </span>
        </p>
      </Section>

      {/* Frame rate */}
      <Section
        icon={<Film className="h-4 w-4" />}
        title="Frame rate"
        hint={
          showHaze20Badge
            ? "120 fps uses Haze Engine 2.0 patcher"
            : "Match source when possible"
        }
      >
        <div className="grid grid-cols-4 gap-2">
          {FPS_OPTIONS.map((opt) => {
            const active = opt.value === fps;
            return (
              <button
                key={opt.value}
                type="button"
                disabled={disabled}
                onClick={() => onFpsChange(opt.value)}
                className={[
                  "relative rounded-lg border px-3 py-2 text-sm font-medium transition-all",
                  active
                    ? "border-primary/80 bg-primary/10 text-foreground"
                    : "border-border/60 bg-white/[0.02] text-muted-foreground hover:text-foreground hover:bg-white/[0.04]",
                  disabled ? "opacity-60 cursor-not-allowed" : "",
                ].join(" ")}
              >
                {opt.value}
                <span className="text-[10px] ml-1 opacity-70">fps</span>
                {opt.badge && (
                  <span className="absolute -top-1.5 -right-1.5 text-[8px] font-bold uppercase tracking-wider bg-gradient-to-br from-primary to-accent text-white px-1.5 py-0.5 rounded-full shadow">
                    2.0
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </Section>

      {/* Haze Engine 2.0 — Binary AST patcher (only relevant in classic mode) */}
      <Section
        icon={<Cpu className="h-4 w-4" />}
        title="Haze Engine 2.0 patcher"
        hint={isHaze ? "Disabled in Haze mode" : "Smart FPS targeting"}
      >
        {isHaze ? (
          <div className="rounded-lg border border-border/60 bg-white/[0.02] p-3">
            <div className="flex items-start gap-2">
              <div className="mt-0.5 shrink-0 h-5 w-5 rounded grid place-items-center bg-primary/15 border border-primary/30">
                <Flame className="h-3 w-3 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-foreground">
                  Haze Method handles FPS multiplication internally
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                  FFmpeg&apos;s <code className="font-mono">fps={`{fps * HAZE_FRAME_MULTIPLIER}`}</code> filter
                  produces {HAZE_FRAME_MULTIPLIER}× frame-hold duplicates. The
                  stage-2 patcher is not needed (and is disabled).
                </p>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-4 gap-2">
              <PatchButton
                label="Auto"
                sub="smart"
                icon={<Zap className="h-3.5 w-3.5" />}
                active={patchMode === "auto"}
                disabled={disabled}
                onClick={() => onPatchModeChange("auto")}
              />
              <PatchButton
                label="Inject"
                sub={`≤${MAX_INJECTION_FPS}fps`}
                icon={<Wrench className="h-3.5 w-3.5" />}
                active={patchMode === "inject"}
                disabled={disabled}
                onClick={() => onPatchModeChange("inject")}
              />
              <PatchButton
                label="Metadata"
                sub="header only"
                icon={<Gauge className="h-3.5 w-3.5" />}
                active={patchMode === "metadata"}
                disabled={disabled}
                onClick={() => onPatchModeChange("metadata")}
              />
              <PatchButton
                label="Off"
                sub="passthrough"
                icon={<ShieldOff className="h-3.5 w-3.5" />}
                active={patchMode === "off"}
                disabled={disabled}
                onClick={() => onPatchModeChange("off")}
              />
            </div>

            {/* Strategy explainer */}
            <div className="mt-3 rounded-lg border border-border/60 bg-white/[0.02] p-3">
              <div className="flex items-start gap-2">
                <div className="mt-0.5 shrink-0 h-5 w-5 rounded grid place-items-center bg-primary/15 border border-primary/30">
                  {strategy.mode === "inject" ? (
                    <Wrench className="h-3 w-3 text-primary" />
                  ) : strategy.mode === "metadata" ? (
                    <Gauge className="h-3 w-3 text-primary" />
                  ) : (
                    <ShieldOff className="h-3 w-3 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-foreground">
                    {strategy.mode === "inject"
                      ? "Fake sample injection"
                      : strategy.mode === "metadata"
                        ? "Metadata-only patch"
                        : "No patch"}
                    {strategy.multiplier > 1 && (
                      <span className="ml-1.5 text-primary">
                        {strategy.multiplier}× multiplier
                      </span>
                    )}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                    {strategy.explanation}
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </Section>

      {/* Audio */}
      <Section
        icon={<Gauge className="h-4 w-4" />}
        title="Audio track"
        hint="AAC-LC 48 kHz stereo."
      >
        <div className="flex items-center justify-between rounded-lg border border-border/60 bg-white/[0.02] px-3 py-2.5">
          <div className="flex items-center gap-2.5">
            {audio ? (
              <Music2 className="h-4 w-4 text-primary" />
            ) : (
              <Music className="h-4 w-4 text-muted-foreground" />
            )}
            <div>
              <Label htmlFor="audio-switch" className="text-sm font-medium cursor-pointer">
                {audio ? "Keep audio" : "Strip audio"}
              </Label>
              <p className="text-[10px] text-muted-foreground">
                {audio ? preset.audioBitrate + " AAC" : "Silent video"}
              </p>
            </div>
          </div>
          <Switch
            id="audio-switch"
            checked={audio}
            onCheckedChange={onAudioChange}
            disabled={disabled}
          />
        </div>
      </Section>
    </div>
  );
}

function Section({
  icon,
  title,
  hint,
  children,
}: {
  icon: React.ReactNode;
  title: React.ReactNode;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-primary">{icon}</span>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        </div>
        {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function PatchButton({
  label,
  sub,
  icon,
  active,
  disabled,
  onClick,
}: {
  label: string;
  sub: string;
  icon: React.ReactNode;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={[
        "flex flex-col items-center gap-1 rounded-lg border px-2 py-2.5 transition-all",
        active
          ? "border-primary/80 bg-primary/10 text-foreground"
          : "border-border/60 bg-white/[0.02] text-muted-foreground hover:text-foreground hover:bg-white/[0.04]",
        disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer",
      ].join(" ")}
    >
      <span className={active ? "text-primary" : ""}>{icon}</span>
      <span className="text-xs font-medium">{label}</span>
      <span className="text-[9px] uppercase tracking-wider opacity-70">{sub}</span>
    </button>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded bg-white/5 border border-border/40 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground tabular-nums">
      {children}
    </span>
  );
}

function AspectIcon({ mode, active }: { mode: AspectMode; active: boolean }) {
  const color = active ? "oklch(0.72 0.22 310)" : "currentColor";
  const cls = "transition-colors";
  if (mode === "vertical" || mode === "vertical4k") {
    return (
      <div
        className={cls}
        style={{
          width: 18,
          height: 32,
          border: `2px solid ${color}`,
          borderRadius: 3,
        }}
      />
    );
  }
  if (mode === "horizontal" || mode === "horizontal4k") {
    return (
      <div
        className={cls}
        style={{
          width: 32,
          height: 18,
          border: `2px solid ${color}`,
          borderRadius: 3,
        }}
      />
    );
  }
  return (
    <div
      className={cls}
      style={{
        width: 24,
        height: 24,
        border: `2px solid ${color}`,
        borderRadius: 3,
      }}
    />
  );
}
