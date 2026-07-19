/**
 * Haze Engine 2.0 — encoding presets + binary AST patcher config.
 *
 * Three independent knobs:
 *
 *   1. Engine mode (`EngineMode`)
 *      - "haze"    : The Haze Method as observed in the working sample.
 *                    19× internal frame multiplier, hard CBR, no faststart,
 *                    custom encoder tag. This is the "real" Haze recipe.
 *      - "classic" : Standard libx264 encode with +faststart, VBR, the
 *                    spec TikTok already accepts. Used as a baseline.
 *
 *   2. Quality preset (`PresetId`)
 *      Picks bitrate / CRF / x264 preset. Applies in both engine modes.
 *
 *   3. Patch mode (`PatchMode`)
 *      Stage-2 binary AST patcher on the produced MP4. Can be combined
 *      with either engine mode (but the "haze" engine already does
 *      frame multiplication via FFmpeg, so the patcher is usually off
 *      when haze mode is on).
 *
 * ─── The Haze Method (working sample traits) ──────────────────────
 *
 * Based on hazemethod.xyz's working sample vs. the recompressed one:
 *
 *   Trait                  Working sample          Recompressed
 *   ─────────────────────  ──────────────────────  ──────────────────────
 *   mdat offset            48 (mdat FIRST)         36599 (mdat LAST)
 *   moov position          END of file             START of file
 *   +faststart             NO                      YES (TikTok added it)
 *   Max bitrate            15,914,777              20,000,000
 *   Avg bitrate            15,914,777              15,914,777
 *   → CBR pattern          HARD CBR (max == avg)   Not CBR (max > avg)
 *   Encoder tag            "Haze Method - hazemethod.xyz"  (none)
 *   Display FPS            60                      60
 *   Internal frame count   19× display frames      1× display frames
 *
 * Translation to FFmpeg args:
 *   -vf ...,fps=${INTERNAL_FPS}:round=up    # 19× multiplier via frame-hold
 *   -b:v 16M -maxrate 16M                   # hard CBR, no bufsize headroom
 *   -g $((INTERNAL_FPS * 2))                 # 2-second GOP at internal fps
 *   -metadata:s:v:0 encoder="Haze Method - https://hazemethod.xyz"
 *   (NO -movflags +faststart)               # leave moov at END
 *
 * The 19× multiplier means: for a 60 fps / 23.83s clip, FFmpeg produces
 * 60 * 19 * 23.83 ≈ 27,166 actual frames at 1140 fps internal. The
 * container still declares 60 fps display (via the stts table) so
 * players play it back at normal speed — but TikTok's transcoder sees
 * a 27K-frame stream at hard-CBR 16M and decides it isn't worth
 * recompressing.
 */

export type PresetId =
  | "quality"
  | "balanced"
  | "filesize"
  | "motion"
  | "ultra4k"
  | "cinema4k";

export type AspectMode =
  | "vertical"
  | "horizontal"
  | "square"
  | "vertical4k"
  | "horizontal4k"
  | "square4k"
  | "original";

export type PatchMode = "auto" | "inject" | "metadata" | "off";

export type EngineMode = "haze" | "classic";

/** Internal frame multiplier for Haze Method mode. 19 matches the working sample. */
export const HAZE_FRAME_MULTIPLIER = 19;

/** Hard CBR bitrate for Haze Method. */
export const HAZE_ENCODER_TAG = "Haze Method - https://hazemethod.xyz";

export interface Preset {
  id: PresetId;
  name: string;
  tagline: string;
  description: string;
  /** Target video bitrate (FFmpeg -b:v). */
  videoBitrate: string;
  /** Max video bitrate (FFmpeg -maxrate). In haze mode this == videoBitrate (hard CBR). */
  maxBitrate: string;
  /** Video buffer (FFmpeg -bufsize). In haze mode this == 2 * videoBitrate. */
  bufSize: string;
  /** Constant rate factor (lower = higher quality). */
  crf: number;
  /** H.264 preset. */
  x264Preset: "slow" | "medium" | "fast" | "veryfast";
  /** H.264 profile. */
  profile: "high" | "main" | "baseline";
  /** Audio bitrate. */
  audioBitrate: string;
  /** Recommended use. */
  recommendedFor: string;
}

export const PRESETS: Record<PresetId, Preset> = {
  quality: {
    id: "quality",
    name: "Maximum Quality",
    tagline: "Lowest CRF, highest bitrate",
    description:
      "Best for talking-head, beauty, and detail-heavy clips. Visually lossless encode that TikTok will barely touch.",
    videoBitrate: "16M",
    maxBitrate: "20M",
    bufSize: "32M",
    crf: 18,
    x264Preset: "slow",
    profile: "high",
    audioBitrate: "256k",
    recommendedFor: "Faces, makeup, product shots, VFX",
  },
  balanced: {
    id: "balanced",
    name: "Balanced",
    tagline: "Sweet spot for most creators",
    description:
      "Recommended default. Keeps crisp 1080p with a bitrate TikTok won't aggressively downscale. Slightly faster encode.",
    videoBitrate: "12M",
    maxBitrate: "15M",
    bufSize: "24M",
    crf: 20,
    x264Preset: "medium",
    profile: "high",
    audioBitrate: "192k",
    recommendedFor: "Vlogs, dance, lifestyle, gameplay",
  },
  filesize: {
    id: "filesize",
    name: "Compact",
    tagline: "Smaller file, still crisp",
    description:
      "When you need to stay under upload limits (e.g. 287MB on mobile). Slightly higher CRF but still well above TikTok's re-encode target.",
    videoBitrate: "8M",
    maxBitrate: "10M",
    bufSize: "16M",
    crf: 23,
    x264Preset: "medium",
    profile: "high",
    audioBitrate: "160k",
    recommendedFor: "Longer uploads (3m+), slow connections",
  },
  motion: {
    id: "motion",
    name: "High Motion",
    tagline: "Tuned for fast movement",
    description:
      "Higher bitrate ceiling and tighter keyframe interval so motion-heavy clips (sports, transitions, confetti) survive re-encoding intact.",
    videoBitrate: "14M",
    maxBitrate: "22M",
    bufSize: "40M",
    crf: 19,
    x264Preset: "fast",
    profile: "high",
    audioBitrate: "192k",
    recommendedFor: "Sports, dance, transitions, gameplay",
  },
  ultra4k: {
    id: "ultra4k",
    name: "4K Ultra",
    tagline: "Maximum 4K bitrate",
    description:
      "Highest-quality 4K preset. 80 Mbps ceiling preserves fine detail, textures and grain. Use only for short clips — files are large.",
    videoBitrate: "60M",
    maxBitrate: "80M",
    bufSize: "120M",
    crf: 16,
    x264Preset: "slow",
    profile: "high",
    audioBitrate: "320k",
    recommendedFor: "4K cinematic, nature, product showcases",
  },
  cinema4k: {
    id: "cinema4k",
    name: "4K Cinema",
    tagline: "Balanced 4K · filmic",
    description:
      "Balanced 4K preset at 40 Mbps — crisp without ballooning file size. Recommended for most 4K uploads.",
    videoBitrate: "40M",
    maxBitrate: "50M",
    bufSize: "80M",
    crf: 18,
    x264Preset: "medium",
    profile: "high",
    audioBitrate: "256k",
    recommendedFor: "4K vlogs, travel, lifestyle, talking-head",
  },
};

export interface AspectTarget {
  mode: AspectMode;
  label: string;
  width: number;
  height: number;
  fit: "crop" | "pad";
}

export const ASPECT_TARGETS: AspectTarget[] = [
  {
    mode: "vertical",
    label: "9:16 Vertical · 1080p",
    width: 1080,
    height: 1920,
    fit: "pad",
  },
  {
    mode: "horizontal",
    label: "16:9 Horizontal · 1080p",
    width: 1920,
    height: 1080,
    fit: "pad",
  },
  {
    mode: "square",
    label: "1:1 Square · 1080p",
    width: 1080,
    height: 1080,
    fit: "pad",
  },
  {
    mode: "vertical4k",
    label: "9:16 Vertical · 4K",
    width: 2160,
    height: 3840,
    fit: "pad",
  },
  {
    mode: "horizontal4k",
    label: "16:9 Horizontal · 4K",
    width: 3840,
    height: 2160,
    fit: "pad",
  },
  {
    mode: "square4k",
    label: "1:1 Square · 4K",
    width: 2160,
    height: 2160,
    fit: "pad",
  },
];

export interface FpsOption {
  value: number;
  label: string;
  /** Whether this target needs fake-sample injection to reach the requested cadence. */
  injection: boolean;
  /** Haze Engine 2.0 badge. */
  badge?: string;
}

export const FPS_OPTIONS: FpsOption[] = [
  { value: 24, label: "24 fps", injection: false },
  { value: 30, label: "30 fps", injection: false },
  { value: 60, label: "60 fps", injection: false },
  { value: 120, label: "120 fps", injection: true, badge: "Haze 2.0" },
];

/** Hard ceiling for fake-sample injection. */
export const MAX_INJECTION_FPS = 400;

/**
 * Smart FPS targeting for the stage-2 patcher.
 *
 * NOTE: When engine mode is "haze", the patcher is usually NOT needed
 * because FFmpeg already produces 19× the frames internally. The
 * patcher is mainly useful in "classic" mode where FFmpeg produces a
 * normal-cadence file and we want to inflate the declared FPS.
 */
export function choosePatchStrategy(
  sourceFps: number,
  targetFps: number,
): {
  mode: "inject" | "metadata" | "off";
  multiplier: number;
  explanation: string;
} {
  if (!sourceFps || !targetFps) {
    return { mode: "off", multiplier: 1, explanation: "No FPS info — skipping patch." };
  }
  if (targetFps <= sourceFps) {
    return {
      mode: "off",
      multiplier: 1,
      explanation: `Target ${targetFps} fps ≤ source ${sourceFps} fps — no patch needed.`,
    };
  }
  if (targetFps >= 120 && targetFps <= MAX_INJECTION_FPS) {
    const mult = Math.round(targetFps / sourceFps);
    return {
      mode: "inject",
      multiplier: mult,
      explanation: `Injecting ${mult}× fake samples per real frame to reach ${targetFps} fps declared cadence.`,
    };
  }
  if (targetFps > MAX_INJECTION_FPS) {
    const mult = Math.round(targetFps / sourceFps);
    return {
      mode: "metadata",
      multiplier: mult,
      explanation: `Above ${MAX_INJECTION_FPS} fps ceiling — metadata-only patch declaring ${targetFps} fps without adding samples.`,
    };
  }
  const mult = Math.max(1, Math.round(targetFps / sourceFps));
  return {
    mode: "metadata",
    multiplier: mult,
    explanation: `Metadata-only patch: declaring ${targetFps} fps on a ${sourceFps} fps source.`,
  };
}

/**
 * Builds the FFmpeg argument list.
 *
 * Haze mode:
 *   - Internal fps = display fps × 19 (frame-hold duplication via fps filter)
 *   - Hard CBR: -b:v X -maxrate X (no -bufsize headroom)
 *   - GOP at internal fps × 2
 *   - NO +faststart (moov stays at end of file)
 *   - Encoder tag embedded in track metadata
 *
 * Classic mode:
 *   - Standard VBR with bufsize, +faststart, normal fps
 */
export function buildFFmpegArgs(opts: {
  inputName: string;
  outputName: string;
  preset: Preset;
  target: AspectTarget;
  fps: number;
  audio: boolean;
  engineMode: EngineMode;
}): string[] {
  const { inputName, outputName, preset, target, fps, audio, engineMode } = opts;

  const scaleFilter =
    target.fit === "pad"
      ? `scale=${target.width}:${target.height}:force_original_aspect_ratio=decrease,pad=${target.width}:${target.height}:(ow-iw)/2:(oh-ih)/2:color=black`
      : `scale=${target.width}:${target.height}:force_original_aspect_ratio=increase,crop=${target.width}:${target.height}`;

  const isHaze = engineMode === "haze";

  // In Haze mode: encode at 19× display fps. The fps filter with round=up
  // performs frame-hold duplication — exactly what haze_encode.sh does.
  const internalFps = isHaze ? fps * HAZE_FRAME_MULTIPLIER : fps;
  const fpsFilter = isHaze
    ? `${scaleFilter},fps=${internalFps}:round=up,format=yuv420p,setsar=1`
    : `${scaleFilter},fps=${fps},format=yuv420p,setsar=1`;

  // GOP at 2 seconds of internal fps.
  const gop = internalFps * 2;
  const keyint = internalFps;

  // Bitrate strategy.
  // Haze: hard CBR (maxrate == bitrate, no bufsize).
  // Classic: VBR with bufsize headroom.
  const bitrate = preset.videoBitrate;
  const maxrate = isHaze ? preset.videoBitrate : preset.maxBitrate;

  // H.264 level — scale with resolution.
  //   1080p30 → 4.0   (TikTok's preferred level)
  //   1080p60 → 4.2
  //   4K30    → 5.1
  //   4K60    → 5.2
  const pixels = target.width * target.height;
  const is4k = pixels >= 3840 * 2160;
  let h264Level: string;
  if (is4k) {
    h264Level = internalFps >= 60 ? "5.2" : "5.1";
  } else if (internalFps >= 60) {
    h264Level = "4.2";
  } else {
    h264Level = "4.0";
  }

  const args: string[] = [
    "-i",
    inputName,
    "-vf",
    fpsFilter,
    "-c:v",
    "libx264",
    "-preset",
    preset.x264Preset,
    "-profile:v",
    preset.profile,
    "-level",
    h264Level,
    "-pix_fmt",
    "yuv420p",
    "-color_primaries",
    "bt709",
    "-color_trc",
    "bt709",
    "-colorspace",
    "bt709",
    "-b:v",
    bitrate,
    "-maxrate",
    maxrate,
  ];

  // Classic mode uses -bufsize; Haze mode skips it (hard CBR, no VBV headroom).
  if (!isHaze) {
    args.push("-bufsize", preset.bufSize);
  }

  args.push(
    "-g",
    String(gop),
    "-keyint_min",
    String(keyint),
    "-sc_threshold",
    "0",
    "-bf",
    "2",
    "-b_strategy",
    "2",
  );

  if (audio) {
    args.push(
      "-c:a",
      "aac",
      "-b:a",
      preset.audioBitrate,
      "-ar",
      "48000",
      "-ac",
      "2",
    );
  } else {
    args.push("-an");
  }

  // Haze mode: embed encoder tag in track + container metadata.
  if (isHaze) {
    args.push(
      "-metadata:s:v:0",
      `encoder=${HAZE_ENCODER_TAG}`,
      "-metadata:s:v:0",
      "handler_name=VideoHandler",
      "-metadata",
      `encoder=${HAZE_ENCODER_TAG}`,
      "-movflags",
      "+use_metadata_tags",
    );
    // NOTE: intentionally NO "+faststart" — moov stays at END of file,
    // matching the working sample (mdat offset = 48).
  } else {
    // Classic mode: +faststart (moov at start).
    args.push("-movflags", "+faststart");
  }

  args.push(
    "-map_metadata",
    "-1",
    "-write_tmcd",
    "0",
    outputName,
  );

  return args;
}

/**
 * In Haze mode, FFmpeg's `fps` filter produces 19× the frames at the
 * internal fps (e.g. 1140 fps for a 60 fps display target with 19× mult).
 * The container will therefore DECLARE 1140 fps by default.
 *
 * The working sample from hazemethod.xyz declares 60 fps (the DISPLAY fps)
 * while keeping all 19× samples. To match that, we run the stage-2 patcher
 * in "haze" mode after FFmpeg finishes — it multiplies stts.sample_delta
 * by 19 to slow the declared cadence back down to 60 fps.
 *
 * Returns true to enable the haze-mode patcher (matches working sample).
 * Returns false to leave the file declaring the internal fps (matches
 * the haze_encode.sh script literally — that script does NOT include
 * the patcher step).
 */
export function shouldRunPatcherInHazeMode(): boolean {
  return true;
}
