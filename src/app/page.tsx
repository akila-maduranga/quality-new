"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Wand2, AlertTriangle, Lock } from "lucide-react";

import { Background } from "@/components/haze/Background";
import { Header } from "@/components/haze/Header";
import { Hero } from "@/components/haze/Hero";
import { UploadArea, type UploadedVideo } from "@/components/haze/UploadArea";
import { SettingsPanel } from "@/components/haze/SettingsPanel";
import { ProcessingView } from "@/components/haze/ProcessingView";
import { ResultView } from "@/components/haze/ResultView";
import { HowItWorks } from "@/components/haze/HowItWorks";
import { SpecSheet } from "@/components/haze/SpecSheet";
import { FAQ } from "@/components/haze/FAQ";
import { Footer } from "@/components/haze/Footer";

import { Button } from "@/components/ui/button";
import {
  PRESETS,
  ASPECT_TARGETS,
  choosePatchStrategy,
  HAZE_FRAME_MULTIPLIER,
  type PresetId,
  type AspectMode,
  type PatchMode,
  type EngineMode,
} from "@/lib/haze/presets";
import {
  encodeVideo,
  isFFmpegSupported,
  loadFFmpeg,
  onFFmpegProgress,
  onFFmpegStage,
} from "@/lib/haze/ffmpeg";
import type { PatchResult } from "@/lib/haze/patcher";

type Phase = "idle" | "loading-engine" | "encoding" | "done" | "error";

interface ResultState {
  url: string;
  size: number;
  name: string;
  patch: PatchResult | null;
  strategy: {
    mode: "inject" | "metadata" | "haze" | "off";
    multiplier: number;
    explanation: string;
  } | null;
}

export default function Home() {
  const [video, setVideo] = useState<UploadedVideo | null>(null);
  const [presetId, setPresetId] = useState<PresetId>("balanced");
  const [aspectMode, setAspectMode] = useState<AspectMode>("vertical");
  const [fps, setFps] = useState<number>(30);
  const [audio, setAudio] = useState<boolean>(true);
  const [patchMode, setPatchMode] = useState<PatchMode>("auto");
  const [engineMode, setEngineMode] = useState<EngineMode>("haze");

  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState<number>(0);
  const [stage, setStage] = useState<string>("Idle");
  const [result, setResult] = useState<ResultState | null>(null);

  const supported = useClientValue(isFFmpegSupported, false);

  const lastResultUrl = useRef<string | null>(null);
  useEffect(() => {
    return () => {
      if (lastResultUrl.current) {
        URL.revokeObjectURL(lastResultUrl.current);
        lastResultUrl.current = null;
      }
    };
  }, []);

  const onSelect = useCallback((v: UploadedVideo) => {
    setVideo(v);
    setResult(null);
    // Auto-pick aspect based on source orientation
    if (v.width > 0 && v.height > 0) {
      if (v.width > v.height * 1.2) setAspectMode("horizontal");
      else if (v.height > v.width * 1.2) setAspectMode("vertical");
      else setAspectMode("square");
    }
  }, []);

  const onClear = useCallback(() => {
    setVideo(null);
    setResult(null);
    setPhase("idle");
    setProgress(0);
  }, []);

  const handleOptimize = useCallback(async () => {
    if (!video) {
      toast.error("Drop a video first");
      return;
    }

    // Revoke any previous result url so we don't leak blobs
    if (lastResultUrl.current) {
      URL.revokeObjectURL(lastResultUrl.current);
      lastResultUrl.current = null;
    }

    setPhase("loading-engine");
    setStage("Booting FFmpeg.wasm engine...");
    setProgress(0);

    try {
      onFFmpegProgress((r) => {
        setProgress(r);
      });
      onFFmpegStage((s) => {
        setStage(s);
      });

      setPhase("encoding");
      setStage("Reading source frames...");

      await loadFFmpeg();

      // Engine mode dispatches:
      //   - "haze"    : FFmpeg encodes at 19× internal fps with hard CBR,
      //                 no +faststart, encoder tag. No stage-2 patch.
      //   - "classic" : FFmpeg encodes at min(fps, 60), patcher declares
      //                 user's target fps via fake-sample injection or
      //                 metadata-only patch.
      const encodeFps = engineMode === "haze" ? fps : Math.min(fps, 60);
      const sourceFps = encodeFps;

      const out = await encodeVideo({
        file: video.file,
        preset: PRESETS[presetId],
        target:
          ASPECT_TARGETS.find((t) => t.mode === aspectMode) ??
          ASPECT_TARGETS[0],
        fps: encodeFps,
        audio,
        sourceFps,
        targetFps: fps,
        patchMode,
        engineMode,
      });

      lastResultUrl.current = out.url;
      setResult({
        url: out.url,
        size: out.size,
        name: out.name,
        patch: out.patch,
        strategy: out.strategy,
      });
      setPhase("done");
      setStage("Done");
      setProgress(1);

      toast.success("Optimized!", {
        description:
          out.strategy && out.strategy.mode !== "off"
            ? `${out.name} · Haze 2.0 ${out.strategy.mode} patch applied`
            : `${out.name} is ready to download.`,
      });

      // Scroll to result
      setTimeout(() => {
        document
          .getElementById("optimizer-result")
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
    } catch (err) {
      console.error(err);
      setPhase("error");
      const msg = err instanceof Error ? err.message : "Unknown error";
      toast.error("Optimization failed", {
        description: msg,
      });
    } finally {
      onFFmpegProgress(null);
      onFFmpegStage(null);
    }
  }, [video, presetId, aspectMode, fps, audio, patchMode, engineMode]);

  // Preview the strategy that will be applied.
  // In Haze mode, the patcher is always OFF (FFmpeg handles everything).
  // In classic mode, FFmpeg encodes at min(fps, 60); the patcher declares
  // the user's selected fps as the target.
  const strategyPreview =
    engineMode === "haze"
      ? { mode: "off" as const, multiplier: HAZE_FRAME_MULTIPLIER, explanation: "" }
      : choosePatchStrategy(Math.min(fps, 60), fps);
  const effectivePatchMode =
    engineMode === "haze"
      ? "off"
      : patchMode === "auto"
        ? strategyPreview.mode
        : patchMode;

  return (
    <>
      <Background />
      <Header />
      <main className="flex-1 flex flex-col">
        <Hero />

        {/* Optimizer */}
        <section
          id="optimizer"
          className="px-4 sm:px-6 pb-16 sm:pb-20"
        >
          <div className="mx-auto max-w-5xl">
            {!supported && (
              <div className="mb-5 flex items-start gap-3 rounded-xl border border-yellow-500/40 bg-yellow-500/10 p-4">
                <AlertTriangle className="h-5 w-5 text-yellow-400 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-yellow-100">
                    Browser not supported
                  </p>
                  <p className="text-yellow-200/80 mt-0.5">
                    This tool needs WebAssembly + Web Workers. Try the latest
                    Chrome, Edge, Firefox or Safari 14+.
                  </p>
                </div>
              </div>
            )}

            <div className="grid lg:grid-cols-[1fr_1.1fr] gap-5">
              {/* Left: Upload */}
              <div className="flex flex-col gap-4">
                <SectionLabel step={1} title="Your video" />
                <UploadArea
                  video={video}
                  onSelect={onSelect}
                  onClear={onClear}
                  disabled={phase === "encoding" || phase === "loading-engine"}
                />

                {video && (
                  <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                    <Lock className="h-3 w-3" />
                    File stays on this device. Processing happens in
                    WebAssembly — no network upload.
                  </div>
                )}
              </div>

              {/* Right: Settings */}
              <div className="flex flex-col gap-4">
                <SectionLabel step={2} title="Optimization settings" />
                <SettingsPanel
                  presetId={presetId}
                  aspectMode={aspectMode}
                  fps={fps}
                  audio={audio}
                  patchMode={patchMode}
                  engineMode={engineMode}
                  sourceFps={engineMode === "haze" ? fps : Math.min(fps, 60)}
                  onPresetChange={setPresetId}
                  onAspectChange={setAspectMode}
                  onFpsChange={setFps}
                  onAudioChange={setAudio}
                  onPatchModeChange={setPatchMode}
                  onEngineModeChange={setEngineMode}
                  disabled={phase === "encoding" || phase === "loading-engine"}
                />
              </div>
            </div>

            {/* CTA */}
            <div className="mt-6 flex flex-col items-center gap-3">
              <Button
                size="lg"
                onClick={handleOptimize}
                disabled={
                  !video ||
                  !supported ||
                  phase === "encoding" ||
                  phase === "loading-engine"
                }
                className="h-12 px-8 text-sm font-semibold rounded-xl shadow-[0_8px_30px_oklch(0.72_0.22_310/0.35)]"
              >
                {phase === "encoding" || phase === "loading-engine" ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin mr-2" />
                    {phase === "loading-engine"
                      ? "Loading engine..."
                      : `${stage.includes("Stage 2") ? "Patching" : "Encoding"}... ${Math.round(progress * 100)}%`}
                  </>
                ) : (
                  <>
                    <Wand2 className="h-4 w-4 mr-2" />
                    {engineMode === "haze"
                      ? "Encode with Haze Method"
                      : effectivePatchMode !== "off" && fps >= 60
                        ? "Optimize + patch"
                        : "Optimize for TikTok"}
                  </>
                )}
              </Button>

              <p className="text-[11px] text-muted-foreground text-center">
                {video
                  ? engineMode === "haze"
                    ? `${PRESETS[presetId].videoBitrate} hard CBR · AAC ${audio ? PRESETS[presetId].audioBitrate : "none"} · ${fps} fps × ${HAZE_FRAME_MULTIPLIER} internal · no faststart`
                    : `${PRESETS[presetId].videoBitrate} video · AAC ${audio ? PRESETS[presetId].audioBitrate : "none"} · ${fps} fps declared${effectivePatchMode !== "off" ? ` · ${effectivePatchMode === "inject" ? "fake samples" : "metadata patch"}` : ""}`
                  : "Drop a clip to begin"}
              </p>
            </div>

            {/* Processing view */}
            {(phase === "encoding" || phase === "loading-engine") && (
              <div className="mt-6">
                <ProcessingView progress={progress} stage={stage} />
              </div>
            )}

            {/* Result view */}
            {phase === "done" && result && video && (
              <div id="optimizer-result" className="mt-6 scroll-mt-24">
                <ResultView
                  resultUrl={result.url}
                  resultSize={result.size}
                  resultName={result.name}
                  inputSize={video.file.size}
                  inputDuration={video.duration}
                  preset={PRESETS[presetId]}
                  target={
                    ASPECT_TARGETS.find((t) => t.mode === aspectMode) ??
                    ASPECT_TARGETS[0]
                  }
                  fps={fps}
                  audio={audio}
                  engineMode={engineMode}
                  patch={result.patch}
                  strategy={result.strategy}
                  onReset={onClear}
                />
              </div>
            )}

            {phase === "error" && (
              <div className="mt-6 flex items-start gap-3 rounded-xl border border-red-500/40 bg-red-500/10 p-4">
                <AlertTriangle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-red-100">
                    Something went wrong
                  </p>
                  <p className="text-red-200/80 mt-0.5">
                    Try a shorter clip or a smaller preset. Very long videos
                    may exceed the browser&apos;s WASM memory limit.
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>

        <HowItWorks />
        <SpecSheet />
        <FAQ />
      </main>
      <Footer />
    </>
  );
}

function SectionLabel({ step, title }: { step: number; title: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid place-items-center h-6 w-6 rounded-md bg-primary/15 border border-primary/30 text-primary text-xs font-semibold">
        {step}
      </span>
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
    </div>
  );
}

/** Safely read a client-only value during hydration. */
function useClientValue<T>(
  getter: () => T,
  fallback: T,
): T {
  const [value, setValue] = useState<T>(fallback);
  useEffect(() => {
    setValue(getter());
  }, [getter]);
  return value;
}
