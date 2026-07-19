"use client";

import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import {
  buildFFmpegArgs,
  choosePatchStrategy,
  HAZE_FRAME_MULTIPLIER,
  shouldRunPatcherInHazeMode,
  type Preset,
  type AspectTarget,
  type PatchMode,
  type EngineMode,
} from "./presets";
import { patchMp4, type PatchResult } from "./patcher";

// Self-hosted single-threaded core avoids the SharedArrayBuffer requirement
// entirely AND removes any cross-origin runtime dependency on a CDN.
// Files live in /public/ffmpeg/ and are served from the same origin.
const CORE_BASE = "/ffmpeg";

let ffmpegInstance: FFmpeg | null = null;
let loadPromise: Promise<FFmpeg> | null = null;
let progressCb: ((ratio: number) => void) | null = null;
let stageCb: ((stage: string) => void) | null = null;

export function onFFmpegProgress(cb: ((ratio: number) => void) | null) {
  progressCb = cb;
}

export function onFFmpegStage(cb: ((stage: string) => void) | null) {
  stageCb = cb;
}

function setStage(s: string) {
  if (stageCb) stageCb(s);
}

export async function loadFFmpeg(): Promise<FFmpeg> {
  if (ffmpegInstance) return ffmpegInstance;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    const ffmpeg = new FFmpeg();

    ffmpeg.on("log", () => {
      // Intentionally noop — keep console clean.
    });

    ffmpeg.on("progress", ({ progress }: { progress: number }) => {
      if (progressCb) {
        // FFmpeg sometimes reports progress > 1 on tiny clips; clamp it.
        // Patcher runs after FFmpeg finishes — scale to 0..0.9 so the
        // patcher's 0.9..1.0 has visual headroom.
        const clamped = Math.max(0, Math.min(1, progress));
        progressCb(clamped * 0.9);
      }
    });

    // Core is self-hosted at /public/ffmpeg/, served same-origin.
    const [coreURL, wasmURL] = await Promise.all([
      toBlobURL(`${CORE_BASE}/ffmpeg-core.js`, "text/javascript"),
      toBlobURL(`${CORE_BASE}/ffmpeg-core.wasm`, "application/wasm"),
    ]);

    await ffmpeg.load({ coreURL, wasmURL });
    ffmpegInstance = ffmpeg;
    return ffmpeg;
  })();

  return loadPromise;
}

export interface EncodeInput {
  file: File;
  preset: Preset;
  target: AspectTarget;
  /** Display FPS the user wants the platform to see. */
  fps: number;
  audio: boolean;
  /** Source FPS = the real fps FFmpeg encoded at (capped at 60 in classic mode). */
  sourceFps: number;
  /** Declared output FPS the user wants the platform to see. */
  targetFps: number;
  /** User-selected patch mode (auto/inject/metadata/off). */
  patchMode: PatchMode;
  /** Engine mode: "haze" (19× internal fps, hard CBR, no faststart) or "classic". */
  engineMode: EngineMode;
}

export interface EncodeOutput {
  blob: Blob;
  url: string;
  size: number;
  name: string;
  args: string[];
  patch: PatchResult | null;
  strategy: {
    mode: "inject" | "metadata" | "haze" | "off";
    multiplier: number;
    explanation: string;
  } | null;
}

export async function encodeVideo(input: EncodeInput): Promise<EncodeOutput> {
  const ffmpeg = await loadFFmpeg();

  const inputName = `input.${getExt(input.file.name) || "mp4"}`;
  const outputName = "haze_output.mp4";

  setStage("Loading source into FFmpeg...");
  await ffmpeg.writeFile(inputName, await fetchFile(input.file));

  const args = buildFFmpegArgs({
    inputName,
    outputName,
    preset: input.preset,
    target: input.target,
    fps: input.fps,
    audio: input.audio,
    engineMode: input.engineMode,
  });

  if (progressCb) progressCb(0);
  setStage(
    input.engineMode === "haze"
      ? `Stage 1: Haze Method encode (${HAZE_FRAME_MULTIPLIER}× internal fps, hard CBR)...`
      : "Stage 1: libx264 encode (classic mode)...",
  );

  await ffmpeg.exec(args);

  if (progressCb) progressCb(0.92);
  setStage("Stage 1: reading encoded MP4 bytes...");

  const data = await ffmpeg.readFile(outputName);
  let bytes: Uint8Array = new Uint8Array(data as Uint8Array);

  // Cleanup virtual FS
  try {
    await ffmpeg.deleteFile(inputName);
    await ffmpeg.deleteFile(outputName);
  } catch {
    /* ignore */
  }

  // ─── Stage 2: Binary AST patch ──────────────────────────────────
  let patch: PatchResult | null = null;
  let strategy: EncodeOutput["strategy"] = null;

  // In Haze mode, run the haze-mode patcher to slow declared fps back down
  // to the user's display fps (e.g. 1140 internal → 60 declared) while
  // keeping all 19× samples. This matches the working hazemethod.xyz sample.
  if (input.engineMode === "haze" && shouldRunPatcherInHazeMode()) {
    setStage("Stage 2: Haze patch — slowing declared fps to display fps...");
    if (progressCb) progressCb(0.94);

    try {
      const internalFps = input.fps * HAZE_FRAME_MULTIPLIER;
      strategy = {
        mode: "haze",
        multiplier: HAZE_FRAME_MULTIPLIER,
        explanation: `Haze Method: FFmpeg encoded at ${internalFps} fps internal (19× frame-hold duplication), hard CBR at ${input.preset.videoBitrate}, no +faststart, encoder tag embedded. Stage-2 patcher multiplies stts.sample_delta by ${HAZE_FRAME_MULTIPLIER} to declare ${input.fps} fps display while keeping all 19× samples.`,
      };

      setStage(
        `Stage 2: Haze patch — multiplying stts delta by ${HAZE_FRAME_MULTIPLIER}×...`,
      );
      if (progressCb) progressCb(0.96);

      patch = patchMp4({
        bytes,
        sourceFps: internalFps,
        targetFps: input.fps,
        mode: "haze",
      });
      bytes = patch.bytes;
    } catch (err) {
      console.warn("Haze-mode patcher failed, returning unpatched file:", err);
      strategy = {
        mode: "off",
        multiplier: HAZE_FRAME_MULTIPLIER,
        explanation: `Haze Method encode complete but stage-2 patcher failed: ${err instanceof Error ? err.message : "unknown error"}. File declares the internal fps (${input.fps * HAZE_FRAME_MULTIPLIER}) instead of display fps (${input.fps}).`,
      };
    }
  } else if (input.engineMode === "haze") {
    // Haze mode with patcher disabled (matches the haze_encode.sh script literally).
    strategy = {
      mode: "off",
      multiplier: HAZE_FRAME_MULTIPLIER,
      explanation: `Haze Method: FFmpeg encoded at ${input.fps * HAZE_FRAME_MULTIPLIER} fps internal (19× frame-hold duplication), hard CBR at ${input.preset.videoBitrate}, no +faststart, encoder tag embedded. No stage-2 patch (matches haze_encode.sh script literally).`,
    };
  } else {
    const autoStrategy = choosePatchStrategy(input.sourceFps, input.targetFps);
    const resolvedMode =
      input.patchMode === "auto" ? autoStrategy.mode : input.patchMode;

    if (resolvedMode !== "off") {
      setStage("Stage 2: parsing MP4 box tree (Haze Engine 2.0)...");
      if (progressCb) progressCb(0.94);

      try {
        strategy = {
          mode: resolvedMode,
          multiplier: autoStrategy.multiplier,
          explanation:
            resolvedMode === "inject"
              ? `Injecting ${autoStrategy.multiplier}× fake samples per real frame to reach ${input.targetFps} fps declared cadence.`
              : resolvedMode === "metadata"
                ? `Metadata-only patch: declaring ${input.targetFps} fps by rewriting mdhd / mvhd / tkhd / stts header fields.`
                : "No patch applied.",
        };

        setStage(
          resolvedMode === "inject"
            ? `Stage 2: injecting ${autoStrategy.multiplier}× fake samples...`
            : "Stage 2: applying metadata-only patch...",
        );
        if (progressCb) progressCb(0.96);

        patch = patchMp4({
          bytes,
          sourceFps: input.sourceFps,
          targetFps: input.targetFps,
          mode: resolvedMode,
        });
        bytes = patch.bytes;
      } catch (err) {
        console.warn("MP4 patcher failed, returning unpatched file:", err);
      }
    } else {
      strategy = {
        mode: "off",
        multiplier: 1,
        explanation: "Patch disabled by user.",
      };
    }
  }

  if (progressCb) progressCb(0.99);
  setStage(
    input.engineMode === "haze"
      ? "Finalizing (moov at end, no faststart)..."
      : "Finalizing +faststart MOOV atom...",
  );

  // Copy into a fresh ArrayBuffer-backed Uint8Array so Blob accepts it
  // (TS lib's BlobPart type rejects SharedArrayBuffer-typed buffers).
  const outBytes = new Uint8Array(bytes.byteLength);
  outBytes.set(bytes);
  const blob = new Blob([outBytes], { type: "video/mp4" });
  const url = URL.createObjectURL(blob);

  if (progressCb) progressCb(1);
  setStage("Done");

  return {
    blob,
    url,
    size: blob.size,
    name: buildName(input, input.engineMode, strategy?.mode ?? "off"),
    args,
    patch,
    strategy,
  };
}

function buildName(
  input: EncodeInput,
  engineMode: EngineMode,
  patchMode: "inject" | "metadata" | "haze" | "off",
): string {
  const parts = [
    "haze",
    engineMode === "haze" ? "method" : input.preset.id,
    `${input.target.width}x${input.target.height}`,
    `${input.targetFps}fps`,
  ];
  if (engineMode === "haze") {
    parts.push(`${HAZE_FRAME_MULTIPLIER}x`);
  } else if (patchMode !== "off") {
    parts.push(patchMode === "inject" ? "inj" : "meta");
  }
  return parts.join("_") + ".mp4";
}

function getExt(name: string): string {
  const idx = name.lastIndexOf(".");
  if (idx < 0) return "";
  return name.slice(idx + 1).toLowerCase();
}

export function isFFmpegSupported(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const hasWasm =
    typeof WebAssembly !== "undefined" && typeof Worker !== "undefined";
  if (!hasWasm) return false;
  const iosMatch = ua.match(/iPhone OS (\d+)/);
  if (iosMatch && parseInt(iosMatch[1], 10) < 14) return false;
  return true;
}
