"use client";

import { useCallback, useRef, useState } from "react";
import { UploadCloud, FileVideo, X, Film } from "lucide-react";
import { toast } from "sonner";
import { formatBytes, formatDuration, probeVideo } from "@/lib/haze/format";

export interface UploadedVideo {
  file: File;
  duration: number;
  width: number;
  height: number;
  thumbnail: string | null;
}

interface UploadAreaProps {
  video: UploadedVideo | null;
  onSelect: (video: UploadedVideo) => void;
  onClear: () => void;
  disabled?: boolean;
}

const ACCEPTED_TYPES = [
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "video/x-matroska",
  "video/mov",
];
const ACCEPTED_EXT = [".mp4", ".mov", ".webm", ".mkv", ".m4v"];
const MAX_SIZE = 2 * 1024 * 1024 * 1024; // 2 GB cap for in-browser FFmpeg

export function UploadArea({
  video,
  onSelect,
  onClear,
  disabled,
}: UploadAreaProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleFile = useCallback(
    async (file: File) => {
      if (disabled) return;

      const ext = "." + (file.name.split(".").pop() || "").toLowerCase();
      const okType =
        ACCEPTED_TYPES.includes(file.type) || ACCEPTED_EXT.includes(ext);
      if (!okType) {
        toast.error("Unsupported file", {
          description: "Please use MP4, MOV, WebM or MKV.",
        });
        return;
      }
      if (file.size > MAX_SIZE) {
        toast.error("File too large", {
          description: `Max ${formatBytes(MAX_SIZE)} for in-browser processing.`,
        });
        return;
      }

      setLoading(true);
      try {
        const probe = await probeVideo(file);
        onSelect({ file, ...probe });
      } catch (err) {
        console.error(err);
        toast.error("Could not read video metadata");
      } finally {
        setLoading(false);
      }
    },
    [disabled, onSelect],
  );

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) void handleFile(file);
    },
    [handleFile],
  );

  if (video) {
    return (
      <SelectedVideo
        video={video}
        onClear={() => {
          if (disabled) return;
          onClear();
        }}
        disabled={disabled}
      />
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => !disabled && inputRef.current?.click()}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && !disabled) {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        setDragging(false);
      }}
      onDrop={onDrop}
      className={[
        "group relative w-full overflow-hidden rounded-2xl border-2 border-dashed transition-all duration-300",
        "min-h-[16rem] sm:min-h-[20rem] grid place-items-center p-8 text-center",
        dragging
          ? "border-primary bg-primary/10 scale-[1.01]"
          : "border-border/70 bg-white/[0.02] hover:border-primary/60 hover:bg-white/[0.04]",
        disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer",
      ].join(" ")}
    >
      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
          e.target.value = "";
        }}
      />

      {/* Decorative film strip pattern */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.06] pointer-events-none"
        style={{
          backgroundImage:
            "repeating-linear-gradient(90deg, transparent 0 14px, oklch(1 0 0 / 0.4) 14px 16px), repeating-linear-gradient(0deg, transparent 0 14px, oklch(1 0 0 / 0.4) 14px 16px)",
        }}
      />

      <div className="relative flex flex-col items-center gap-4">
        <div className="relative">
          <div
            className="absolute inset-0 rounded-full blur-xl opacity-60"
            style={{
              background:
                "radial-gradient(circle, oklch(0.72 0.22 310 / 0.5), transparent 70%)",
            }}
          />
          <div className="relative h-16 w-16 rounded-full grid place-items-center bg-gradient-to-br from-primary to-accent text-white shadow-lg group-hover:scale-110 transition-transform">
            {loading ? (
              <div className="h-6 w-6 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <UploadCloud className="h-7 w-7" />
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <p className="text-lg font-semibold text-foreground">
            {loading
              ? "Reading your video..."
              : dragging
                ? "Drop to upload"
                : "Drop your video here"}
          </p>
          <p className="text-sm text-muted-foreground">
            or{" "}
            <span className="text-primary font-medium underline-offset-4 group-hover:underline">
              browse files
            </span>{" "}
            — MP4, MOV, WebM, MKV up to 2&nbsp;GB
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1 rounded-md bg-white/5 px-2 py-1">
            <Film className="h-3 w-3" /> Up to 4K · 120 fps
          </span>
          <span className="inline-flex items-center gap-1 rounded-md bg-white/5 px-2 py-1">
            H.264 + AAC
          </span>
          <span className="inline-flex items-center gap-1 rounded-md bg-white/5 px-2 py-1">
            Processed locally
          </span>
        </div>
      </div>
    </div>
  );
}

function SelectedVideo({
  video,
  onClear,
  disabled,
}: {
  video: UploadedVideo;
  onClear: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm">
      <div className="grid sm:grid-cols-[auto_1fr] gap-0">
        {/* Thumbnail */}
        <div className="relative aspect-video sm:w-64 sm:h-36 bg-black/40 overflow-hidden">
          {video.thumbnail ? (
            <img
              src={video.thumbnail}
              alt={video.file.name}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 grid place-items-center text-muted-foreground">
              <FileVideo className="h-8 w-8" />
            </div>
          )}
          <div className="absolute bottom-1.5 right-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-mono text-white tabular-nums">
            {formatDuration(video.duration)}
          </div>
        </div>

        {/* Info */}
        <div className="flex flex-col gap-2 p-4 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p
                className="text-sm font-semibold text-foreground truncate"
                title={video.file.name}
              >
                {video.file.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {video.width > 0 && video.height > 0
                  ? `${video.width} × ${video.height} • `
                  : ""}
                {formatBytes(video.file.size)}
              </p>
            </div>
            <button
              type="button"
              disabled={disabled}
              onClick={onClear}
              className="shrink-0 inline-flex h-8 w-8 items-center justify-center rounded-md border border-border/60 text-muted-foreground hover:text-foreground hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Remove video"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-auto flex flex-wrap gap-1.5">
            {video.width > 0 && video.height > 0 && (
              <Chip>{video.width > video.height ? "Horizontal" : video.width === video.height ? "Square" : "Vertical"}</Chip>
            )}
            <Chip>{video.file.type || "video"}</Chip>
            <Chip>{formatBytes(video.file.size)}</Chip>
          </div>
        </div>
      </div>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-md bg-white/5 border border-border/40 px-2 py-0.5 text-[10px] text-muted-foreground">
      {children}
    </span>
  );
}
