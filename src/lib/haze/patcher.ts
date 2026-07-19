/**
 * Haze Engine 2.0 — Binary AST Patcher
 *
 * Parses the MP4 ISO Base Media File Format box tree and rewrites the
 * sample tables inside the video track so downstream platforms mis-read
 * the frame cadence.
 *
 * ─── Box tree we touch ──────────────────────────────────────────────
 *
 *   ftyp
 *   moov
 *   ├─ mvhd              (movie header — timescale + duration)
 *   ├─ trak              (track 1 = video, typically)
 *   │  ├─ tkhd           (track header — duration)
 *   │  ├─ mdia
 *   │  │  ├─ mdhd        (media header — timescale + duration)
 *   │  │  └─ minf
 *   │  │     └─ stbl
 *   │  │        ├─ stsd  (sample description — codec config, untouched)
 *   │  │        ├─ stts  (decoding time → sample #, THE TARGET)
 *   │  │        ├─ stsz  (sample sizes, must mirror stts)
 *   │  │        ├─ stsc  (sample → chunk mapping, must mirror stts)
 *   │  │        ├─ stco  (32-bit chunk offsets)
 *   │  │        └─ co64  (64-bit chunk offsets)
 *   │  └─ ...
 *   └─ mdat              (actual H.264 NAL units — NEVER TOUCHED)
 *
 * ─── Two patch strategies ───────────────────────────────────────────
 *
 *   1. Fake sample injection (multiplier N, e.g. 4× for 120 fps target)
 *
 *      Walks the stts table. For every real entry with sample_count C
 *      and sample_delta D, rewrites it as N entries of sample_count C
 *      and sample_delta round(D / N). This makes the player / transcoder
 *      believe there are N× as many frames at N× the cadence.
 *
 *      stsz must be padded with extra size entries (= 0, telling the
 *      player "this is a duplicate, no new bytes").
 *      stsc gets its samples_per_chunk multiplied by N.
 *
 *   2. Metadata-only patch
 *
 *      Leaves stts / stsz / stsc row counts alone, but rewrites:
 *        - mdhd.duration = round(original * multiplier)
 *        - mvhd.duration = round(original * multiplier)
 *        - tkhd.duration = round(original * multiplier)
 *        - stts[0].sample_delta = round(original / multiplier)
 *
 * ─── Output ─────────────────────────────────────────────────────────
 *
 *   The patcher produces a NEW Uint8Array. The input is never mutated.
 *   +faststart files put moov BEFORE mdat, so we can expand moov without
 *   moving mdat — no offset table rewrites needed for stco/co64.
 */

export interface PatchInput {
  /** Source MP4 bytes (post-FFmpeg encode). */
  bytes: Uint8Array;
  /** Original video FPS used by FFmpeg. */
  sourceFps: number;
  /** Declared target FPS the user wants. */
  targetFps: number;
  /** Patch mode. */
  mode: "inject" | "metadata" | "haze" | "off";
}

export interface PatchResult {
  bytes: Uint8Array;
  multiplier: number;
  mode: "inject" | "metadata" | "haze" | "off";
  stats: {
    originalSampleCount: number;
    patchedSampleCount: number;
    originalSttsEntries: number;
    patchedSttsEntries: number;
    originalSizeBytes: number;
    patchedSizeBytes: number;
    timescale: number;
    declaredFps: number;
  };
}

// ─── Box (atom) helpers ──────────────────────────────────────────────

interface Box {
  type: string;
  /** Offset of this box's header within the ORIGINAL file. */
  offset: number;
  /** Total size of this box including header. */
  size: number;
  /** Offset of this box's payload (after header). */
  dataOffset: number;
  /** End offset (offset + size). */
  end: number;
}

function readU32(view: DataView, offset: number): number {
  return view.getUint32(offset, false);
}

function writeU32(view: DataView, offset: number, value: number): void {
  view.setUint32(offset, value >>> 0, false);
}

function readU64(view: DataView, offset: number): number {
  const hi = view.getUint32(offset, false);
  const lo = view.getUint32(offset + 4, false);
  if (hi === 0) return lo;
  return hi * 0x100000000 + lo;
}

function writeU64(view: DataView, offset: number, value: number): void {
  const hi = Math.floor(value / 0x100000000) >>> 0;
  const lo = value >>> 0;
  view.setUint32(offset, hi, false);
  view.setUint32(offset + 4, lo, false);
}

function fourCc(bytes: Uint8Array, offset: number): string {
  return String.fromCharCode(
    bytes[offset],
    bytes[offset + 1],
    bytes[offset + 2],
    bytes[offset + 3],
  );
}

function* iterBoxes(
  bytes: Uint8Array,
  start: number,
  end: number,
): Iterable<Box> {
  let off = start;
  const view = new DataView(
    bytes.buffer,
    bytes.byteOffset,
    bytes.byteLength,
  );
  while (off + 8 <= end) {
    let size = readU32(view, off);
    const type = fourCc(bytes, off + 4);
    let dataOffset = off + 8;
    if (size === 1) {
      if (off + 16 > end) break;
      size = Number(readU64(view, off + 8));
      dataOffset = off + 16;
    } else if (size === 0) {
      size = end - off;
    }
    if (size < 8 || off + size > end) break;
    yield { type, offset: off, size, dataOffset, end: off + size };
    off += size;
  }
}

function findBox(
  bytes: Uint8Array,
  start: number,
  end: number,
  type: string,
): Box | null {
  for (const b of iterBoxes(bytes, start, end)) {
    if (b.type === type) return b;
  }
  return null;
}

interface FullBoxHeader {
  version: number;
  flags: number;
  payloadOffset: number;
}

function readFullBoxHeader(bytes: Uint8Array, box: Box): FullBoxHeader {
  const view = new DataView(
    bytes.buffer,
    bytes.byteOffset,
    bytes.byteLength,
  );
  const version = view.getUint8(box.dataOffset);
  const flags =
    (view.getUint8(box.dataOffset + 1) << 16) |
    (view.getUint8(box.dataOffset + 2) << 8) |
    view.getUint8(box.dataOffset + 3);
  return { version, flags, payloadOffset: box.dataOffset + 4 };
}

// ─── Box builders ────────────────────────────────────────────────────

/** Build a complete box: header + payload. */
function buildBox(type: string, payload: Uint8Array): Uint8Array {
  const out = new Uint8Array(8 + payload.byteLength);
  const view = new DataView(out.buffer);
  writeU32(view, 0, 8 + payload.byteLength);
  for (let i = 0; i < 4; i++) {
    out[4 + i] = type.charCodeAt(i);
  }
  out.set(payload, 8);
  return out;
}

/** Build a FullBox payload (version + flags + body). */
function buildFullBoxPayload(
  version: number,
  flags: number,
  body: Uint8Array,
): Uint8Array {
  const out = new Uint8Array(4 + body.byteLength);
  out[0] = version;
  out[1] = (flags >> 16) & 0xff;
  out[2] = (flags >> 8) & 0xff;
  out[3] = flags & 0xff;
  out.set(body, 4);
  return out;
}

// ─── Patchers ────────────────────────────────────────────────────────

interface SttsPatchResult {
  newBytes: Uint8Array;
  newSampleCount: number;
  originalSampleCount: number;
  originalEntries: number;
  newEntries: number;
}

function patchStts(
  bytes: Uint8Array,
  box: Box,
  mult: number,
  mode: "inject" | "metadata" | "haze",
): SttsPatchResult {
  const view = new DataView(
    bytes.buffer,
    bytes.byteOffset,
    bytes.byteLength,
  );
  const { payloadOffset, version } = readFullBoxHeader(bytes, box);
  const entryCount = readU32(view, payloadOffset);

  const entries: Array<{ count: number; delta: number }> = [];
  let totalSamples = 0;
  for (let i = 0; i < entryCount; i++) {
    const off = payloadOffset + 4 + i * 8;
    const count = readU32(view, off);
    const delta = readU32(view, off + 4);
    entries.push({ count, delta });
    totalSamples += count;
  }

  let newEntries: Array<{ count: number; delta: number }>;
  let newSampleCount: number;

  if (mode === "inject") {
    // Split every entry into `mult` entries, each with delta/mult.
    // Sample count grows by `mult`×.
    newEntries = [];
    for (const e of entries) {
      const newDelta = Math.max(1, Math.round(e.delta / mult));
      for (let k = 0; k < mult; k++) {
        newEntries.push({ count: e.count, delta: newDelta });
      }
    }
    newSampleCount = totalSamples * mult;
  } else if (mode === "haze") {
    // Haze mode: MULTIPLY delta by `mult` to slow declared fps back down
    // to display fps (e.g. 1140 fps internal → 60 fps declared).
    // Sample count stays the same — we keep all 19× frames but declare
    // a slower cadence so playback runs at normal speed.
    newEntries = entries.map((e) => ({
      count: e.count,
      delta: Math.max(1, Math.round(e.delta * mult)),
    }));
    newSampleCount = totalSamples;
  } else {
    // metadata mode: divide delta by mult, keep count.
    newEntries = entries.map((e) => ({
      count: e.count,
      delta: Math.max(1, Math.round(e.delta / mult)),
    }));
    newSampleCount = totalSamples;
  }

  // Build body: entry_count (4) + entries (8 each)
  const body = new Uint8Array(4 + newEntries.length * 8);
  const bView = new DataView(body.buffer);
  writeU32(bView, 0, newEntries.length);
  for (let i = 0; i < newEntries.length; i++) {
    writeU32(bView, 4 + i * 8, newEntries[i].count);
    writeU32(bView, 4 + i * 8 + 4, newEntries[i].delta);
  }

  return {
    newBytes: buildBox("stts", buildFullBoxPayload(version, 0, body)),
    newSampleCount,
    originalSampleCount: totalSamples,
    originalEntries: entryCount,
    newEntries: newEntries.length,
  };
}

function patchStsz(
  bytes: Uint8Array,
  box: Box,
  mult: number,
  mode: "inject" | "metadata" | "haze",
  originalSampleCount: number,
): Uint8Array {
  const view = new DataView(
    bytes.buffer,
    bytes.byteOffset,
    bytes.byteLength,
  );
  const { payloadOffset, version } = readFullBoxHeader(bytes, box);
  const uniformSize = readU32(view, payloadOffset);
  const sampleCount = readU32(view, payloadOffset + 4);

  if (mode === "metadata" || mode === "haze") {
    // Leave stsz alone — sample count is unchanged in both modes.
    // (metadata keeps samples, haze keeps samples — only stts delta changes.)
    return bytes.subarray(box.offset, box.end);
  }

  // inject mode: each real sample → mult entries (real size, then mult-1 zeros)
  const newCount = originalSampleCount * mult;
  const body = new Uint8Array(8 + newCount * 4);
  const bView = new DataView(body.buffer);
  writeU32(bView, 0, 0); // non-uniform
  writeU32(bView, 4, newCount);

  if (uniformSize !== 0) {
    let off = 8;
    for (let i = 0; i < sampleCount; i++) {
      writeU32(bView, off, uniformSize);
      off += 4;
      for (let k = 1; k < mult; k++) {
        writeU32(bView, off, 0);
        off += 4;
      }
    }
  } else {
    let srcOff = payloadOffset + 8;
    let dstOff = 8;
    for (let i = 0; i < sampleCount; i++) {
      const sz = readU32(view, srcOff);
      srcOff += 4;
      writeU32(bView, dstOff, sz);
      dstOff += 4;
      for (let k = 1; k < mult; k++) {
        writeU32(bView, dstOff, 0);
        dstOff += 4;
      }
    }
  }

  return buildBox("stsz", buildFullBoxPayload(version, 0, body));
}

function patchStsc(
  bytes: Uint8Array,
  box: Box,
  mult: number,
  mode: "inject" | "metadata" | "haze",
): Uint8Array {
  if (mode === "metadata" || mode === "haze") {
    return bytes.subarray(box.offset, box.end);
  }

  const view = new DataView(
    bytes.buffer,
    bytes.byteOffset,
    bytes.byteLength,
  );
  const { payloadOffset, version } = readFullBoxHeader(bytes, box);
  const entryCount = readU32(view, payloadOffset);

  const body = new Uint8Array(4 + entryCount * 12);
  const bView = new DataView(body.buffer);
  writeU32(bView, 0, entryCount);

  let srcOff = payloadOffset + 4;
  for (let i = 0; i < entryCount; i++) {
    const firstChunk = readU32(view, srcOff);
    const samplesPerChunk = readU32(view, srcOff + 4);
    const descIdx = readU32(view, srcOff + 8);
    srcOff += 12;
    writeU32(bView, 4 + i * 12, firstChunk);
    writeU32(bView, 4 + i * 12 + 4, samplesPerChunk * mult);
    writeU32(bView, 4 + i * 12 + 8, descIdx);
  }

  return buildBox("stsc", buildFullBoxPayload(version, 0, body));
}

/** Patch mdhd / mvhd / tkhd duration field for metadata / haze modes. */
function patchDurationBox(
  bytes: Uint8Array,
  box: Box,
  mult: number,
  mode: "inject" | "metadata" | "haze",
): Uint8Array {
  if (mode !== "metadata" && mode !== "haze") {
    return bytes.subarray(box.offset, box.end);
  }

  // In haze mode, we want to MULTIPLY duration by mult so the slower-declared
  // fps still produces the original playback duration.
  // In metadata mode, we want to DIVIDE duration by mult (faster declared fps
  // → shorter duration for the same sample count).
  // Wait — actually metadata mode currently MULTIPLIES duration (to keep
  // playback time correct when each sample's delta is divided). And haze
  // mode also needs to MULTIPLY (since each sample's delta is multiplied,
  // total duration grows). So both modes use multiplication. Keep as-is.

  const view = new DataView(
    bytes.buffer,
    bytes.byteOffset,
    bytes.byteLength,
  );
  const { payloadOffset, version } = readFullBoxHeader(bytes, box);

  // Copy entire box bytes, then patch duration field.
  const out = new Uint8Array(box.size);
  out.set(bytes.subarray(box.offset, box.end));
  const oView = new DataView(out.buffer);

  if (version === 0) {
    // u32 ctime, u32 mtime, u32 timescale, u32 duration
    const localPayloadOffset = payloadOffset - box.offset;
    const duration = readU32(view, payloadOffset + 12);
    writeU32(oView, localPayloadOffset + 12, Math.round(duration * mult));
  } else if (version === 1) {
    // u64 ctime, u64 mtime, u32 timescale, u64 duration
    const localPayloadOffset = payloadOffset - box.offset;
    const duration = readU64(view, payloadOffset + 20);
    writeU64(oView, localPayloadOffset + 20, Math.round(duration * mult));
  }
  return out;
}

// ─── Main entry ──────────────────────────────────────────────────────

interface Replacement {
  /** Original box (gives us offset + size in the input). */
  original: Box;
  /** New bytes for this box. */
  newBytes: Uint8Array;
}

interface ContainerSizePatch {
  /** Offset of the box header within the OUTPUT file. */
  outputOffset: number;
  /** New size to write at outputOffset. */
  newSize: number;
  /** Whether the size field is 64-bit (large box). */
  is64bit: boolean;
}

export function patchMp4(input: PatchInput): PatchResult {
  const { bytes, sourceFps, targetFps, mode } = input;

  // For inject/metadata modes: skip if target ≤ source (no inflation needed).
  // For haze mode: skip if source ≤ target (no downsampling needed).
  const skip =
    mode === "off" ||
    sourceFps <= 0 ||
    targetFps <= 0 ||
    (mode !== "haze" && targetFps <= sourceFps) ||
    (mode === "haze" && sourceFps <= targetFps);

  if (skip) {
    return {
      bytes,
      multiplier: 1,
      mode: "off",
      stats: {
        originalSampleCount: 0,
        patchedSampleCount: 0,
        originalSttsEntries: 0,
        patchedSttsEntries: 0,
        originalSizeBytes: bytes.byteLength,
        patchedSizeBytes: bytes.byteLength,
        timescale: 0,
        declaredFps: sourceFps,
      },
    };
  }

  // Multiplier:
  //   - inject/metadata: targetFps / sourceFps (e.g. 120/30 = 4× inflation)
  //   - haze:             sourceFps / targetFps (e.g. 1140/60 = 19× downsampling)
  const mult =
    mode === "haze"
      ? Math.max(1, Math.round(sourceFps / targetFps))
      : Math.max(1, Math.round(targetFps / sourceFps));
  if (mult === 1) {
    return {
      bytes,
      multiplier: 1,
      mode: "off",
      stats: {
        originalSampleCount: 0,
        patchedSampleCount: 0,
        originalSttsEntries: 0,
        patchedSttsEntries: 0,
        originalSizeBytes: bytes.byteLength,
        patchedSizeBytes: bytes.byteLength,
        timescale: 0,
        declaredFps: sourceFps,
      },
    };
  }

  // Locate boxes in the ORIGINAL file.
  const moov = findBox(bytes, 0, bytes.byteLength, "moov");
  if (!moov) throw new Error("patchMp4: moov box not found");

  const mvhd = findBox(bytes, moov.dataOffset, moov.end, "mvhd");
  const trak = findBox(bytes, moov.dataOffset, moov.end, "trak");
  if (!trak) throw new Error("patchMp4: trak box not found");

  const tkhd = findBox(bytes, trak.dataOffset, trak.end, "tkhd");
  const mdia = findBox(bytes, trak.dataOffset, trak.end, "mdia");
  if (!mdia) throw new Error("patchMp4: mdia box not found");

  const mdhd = findBox(bytes, mdia.dataOffset, mdia.end, "mdhd");
  const minf = findBox(bytes, mdia.dataOffset, mdia.end, "minf");
  if (!minf) throw new Error("patchMp4: minf box not found");

  const stbl = findBox(bytes, minf.dataOffset, minf.end, "stbl");
  if (!stbl) throw new Error("patchMp4: stbl box not found");

  const stts = findBox(bytes, stbl.dataOffset, stbl.end, "stts");
  const stsz = findBox(bytes, stbl.dataOffset, stbl.end, "stsz");
  const stsc = findBox(bytes, stbl.dataOffset, stbl.end, "stsc");

  if (!stts) throw new Error("patchMp4: stts box not found");

  // Read timescale from mdhd for stats.
  let timescale = 0;
  if (mdhd) {
    const { payloadOffset, version } = readFullBoxHeader(bytes, mdhd);
    const view = new DataView(
      bytes.buffer,
      bytes.byteOffset,
      bytes.byteLength,
    );
    if (version === 0) {
      timescale = readU32(view, payloadOffset + 8);
    } else {
      timescale = readU32(view, payloadOffset + 16);
    }
  }

  // Build replacements.
  const replacements: Replacement[] = [];

  const sttsResult = patchStts(bytes, stts, mult, mode);
  replacements.push({ original: stts, newBytes: sttsResult.newBytes });

  if (stsz) {
    replacements.push({
      original: stsz,
      newBytes: patchStsz(bytes, stsz, mult, mode, sttsResult.originalSampleCount),
    });
  }
  if (stsc) {
    replacements.push({
      original: stsc,
      newBytes: patchStsc(bytes, stsc, mult, mode),
    });
  }
  if (mdhd) {
    replacements.push({
      original: mdhd,
      newBytes: patchDurationBox(bytes, mdhd, mult, mode),
    });
  }
  if (tkhd) {
    replacements.push({
      original: tkhd,
      newBytes: patchDurationBox(bytes, tkhd, mult, mode),
    });
  }
  if (mvhd) {
    replacements.push({
      original: mvhd,
      newBytes: patchDurationBox(bytes, mvhd, mult, mode),
    });
  }

  // Compute per-box size delta (leaf boxes only at this stage).
  const deltaMap = new Map<number, number>();
  for (const r of replacements) {
    if (r.newBytes.byteLength !== r.original.size) {
      deltaMap.set(r.original.offset, r.newBytes.byteLength - r.original.size);
    }
  }

  // Build parent-child relationships so we can propagate deltas upward
  // without double-counting. Each container's delta = sum of DIRECT
  // children's deltas only.
  const containers = [moov, trak, mdia, minf, stbl].filter(Boolean) as Box[];
  const directChildrenMap = new Map<number, Box[]>();
  if (moov) {
    directChildrenMap.set(moov.offset, [trak, mvhd].filter(Boolean) as Box[]);
  }
  if (trak) {
    directChildrenMap.set(trak.offset, [tkhd, mdia].filter(Boolean) as Box[]);
  }
  if (mdia) {
    directChildrenMap.set(mdia.offset, [mdhd, minf].filter(Boolean) as Box[]);
  }
  if (minf) {
    directChildrenMap.set(minf.offset, stbl ? [stbl] : []);
  }
  if (stbl) {
    directChildrenMap.set(
      stbl.offset,
      [stts, stsz, stsc].filter(Boolean) as Box[],
    );
  }

  // Walk from innermost outward. Each container's delta is the sum of
  // DIRECT children deltas (which themselves already include their
  // grandchildren deltas via this same loop).
  for (let i = containers.length - 1; i >= 0; i--) {
    const c = containers[i];
    const children = directChildrenMap.get(c.offset) || [];
    let totalDelta = 0;
    for (const child of children) {
      const d = deltaMap.get(child.offset);
      if (d) totalDelta += d;
    }
    if (totalDelta !== 0) {
      deltaMap.set(c.offset, totalDelta);
    }
  }

  // Now splice. We need to compute the OUTPUT offset of every replaced box,
  // which depends on the cumulative delta of all earlier replacements.
  replacements.sort((a, b) => a.original.offset - b.original.offset);

  // For each replacement, compute its output offset.
  // outputOffset = original.offset + (cumulative delta from earlier replacements
  // whose original.offset < this one's original.offset)
  const outputOffsetMap = new Map<number, number>();
  let cumDelta = 0;
  for (const r of replacements) {
    outputOffsetMap.set(r.original.offset, r.original.offset + cumDelta);
    cumDelta += r.newBytes.byteLength - r.original.size;
  }

  // Similarly, output offset of every container whose size we need to patch.
  const containerOutputOffsets = new Map<number, number>();
  let cCumDelta = 0;
  // Walk all modified offsets + container offsets in ascending original order.
  const allOffsets = new Set<number>();
  for (const r of replacements) allOffsets.add(r.original.offset);
  for (const c of containers) allOffsets.add(c.offset);
  const sortedOffsets = Array.from(allOffsets).sort((a, b) => a - b);

  // We need to know the cumulative delta at each offset's original position.
  // Pre-compute the delta for each offset.
  const offsetToDelta = new Map<number, number>();
  for (const r of replacements) {
    offsetToDelta.set(
      r.original.offset,
      r.newBytes.byteLength - r.original.size,
    );
  }
  for (const c of containers) {
    // Container's delta was computed above; retrieve from deltaMap.
    offsetToDelta.set(c.offset, deltaMap.get(c.offset) || 0);
  }

  let cum = 0;
  for (const off of sortedOffsets) {
    if (replacements.some((r) => r.original.offset === off)) {
      outputOffsetMap.set(off, off + cum);
    }
    if (containers.some((c) => c.offset === off)) {
      containerOutputOffsets.set(off, off + cum);
    }
    cum += offsetToDelta.get(off) || 0;
  }

  // Splice bytes.
  const chunks: Uint8Array[] = [];
  let cursor = 0;
  for (const r of replacements) {
    if (r.original.offset > cursor) {
      chunks.push(bytes.subarray(cursor, r.original.offset));
    }
    chunks.push(r.newBytes);
    cursor = r.original.end;
  }
  if (cursor < bytes.byteLength) {
    chunks.push(bytes.subarray(cursor));
  }

  const totalSize = chunks.reduce((acc, c) => acc + c.byteLength, 0);
  const result = new Uint8Array(totalSize);
  let pos = 0;
  for (const chunk of chunks) {
    result.set(chunk, pos);
    pos += chunk.byteLength;
  }

  // Patch container size fields.
  const rView = new DataView(
    result.buffer,
    result.byteOffset,
    result.byteLength,
  );
  for (const c of containers) {
    const outOff = containerOutputOffsets.get(c.offset);
    if (outOff === undefined) continue;
    const delta = deltaMap.get(c.offset) || 0;
    if (delta === 0) continue;
    const newSize = c.size + delta;
    // Check if this box uses 64-bit size.
    const originalSizeField = readU32(
      new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength),
      c.offset,
    );
    if (originalSizeField === 1) {
      writeU64(rView, outOff + 8, newSize);
    } else {
      writeU32(rView, outOff, newSize);
    }
  }

  return {
    bytes: result,
    multiplier: mult,
    mode,
    stats: {
      originalSampleCount: sttsResult.originalSampleCount,
      patchedSampleCount: sttsResult.newSampleCount,
      originalSttsEntries: sttsResult.originalEntries,
      patchedSttsEntries: sttsResult.newEntries,
      originalSizeBytes: bytes.byteLength,
      patchedSizeBytes: result.byteLength,
      timescale,
      declaredFps: targetFps,
    },
  };
}
