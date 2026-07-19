/** Format bytes as a human readable string. */
export function formatBytes(bytes: number, decimals = 2): string {
  if (!bytes || bytes < 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
}

/** Format seconds as mm:ss or hh:mm:ss. */
export function formatDuration(seconds: number): string {
  if (!seconds || seconds < 0) return "0:00";
  const s = Math.floor(seconds % 60);
  const m = Math.floor((seconds / 60) % 60);
  const h = Math.floor(seconds / 3600);
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Format a 0..1 ratio as a percentage string. */
export function formatPercent(ratio: number, decimals = 0): string {
  return `${(ratio * 100).toFixed(decimals)}%`;
}

/** Compute the absolute delta and percentage change between two byte sizes. */
export function diffBytes(before: number, after: number): {
  delta: number;
  percent: number;
  direction: "larger" | "smaller" | "same";
} {
  const delta = after - before;
  const percent = before > 0 ? (delta / before) * 100 : 0;
  let direction: "larger" | "smaller" | "same" = "same";
  if (delta > 0) direction = "larger";
  else if (delta < 0) direction = "smaller";
  return { delta: Math.abs(delta), percent: Math.abs(percent), direction };
}

/** Estimate duration in seconds of a video File using the browser. */
export function probeVideo(file: File): Promise<{
  duration: number;
  width: number;
  height: number;
  thumbnail: string | null;
}> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    const url = URL.createObjectURL(file);
    video.src = url;

    const cleanup = () => {
      URL.revokeObjectURL(url);
      video.remove();
    };

    video.onloadedmetadata = () => {
      // Try to capture a thumbnail at 10% in.
      const seekTo = Math.min(
        video.duration * 0.1 || 0,
        Math.max(0, (video.duration || 0) - 0.1),
      );
      let settled = false;

      const finalize = (thumbnail: string | null) => {
        if (settled) return;
        settled = true;
        resolve({
          duration: video.duration || 0,
          width: video.videoWidth || 0,
          height: video.videoHeight || 0,
          thumbnail,
        });
        cleanup();
      };

      video.onseeked = () => {
        try {
          const canvas = document.createElement("canvas");
          const w = video.videoWidth || 320;
          const h = video.videoHeight || 180;
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          if (!ctx) return finalize(null);
          ctx.drawImage(video, 0, 0, w, h);
          const data = canvas.toDataURL("image/jpeg", 0.6);
          finalize(data);
        } catch {
          finalize(null);
        }
      };

      try {
        video.currentTime = seekTo;
      } catch {
        finalize(null);
      }

      // Safety: don't wait forever for a thumbnail.
      setTimeout(() => finalize(null), 1500);
    };

    video.onerror = () => {
      cleanup();
      resolve({ duration: 0, width: 0, height: 0, thumbnail: null });
    };
  });
}
