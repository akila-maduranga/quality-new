// Quick test of the patcher on a real MP4 file
import * as fs from "fs";
import { patchMp4 } from "../src/lib/haze/patcher";

const input = fs.readFileSync("/home/z/my-project/scripts/test-clip.mp4");
console.log("Input size:", input.byteLength);

// Simulate 120 fps target with 30 fps source → 4× multiplier
console.log("\n=== INJECT MODE ===");
const result = patchMp4({
  bytes: new Uint8Array(input),
  sourceFps: 30,
  targetFps: 120,
  mode: "inject",
});

console.log("\n=== METADATA MODE ===");
const result2 = patchMp4({
  bytes: new Uint8Array(input),
  sourceFps: 30,
  targetFps: 120,
  mode: "metadata",
});
console.log("Output size:", result2.bytes.byteLength);
console.log("Stats:", JSON.stringify(result2.stats, null, 2));
fs.writeFileSync("/home/z/my-project/scripts/patched-output-meta.mp4", result2.bytes);

console.log("Output size:", result.bytes.byteLength);
console.log("Multiplier:", result.multiplier);
console.log("Mode:", result.mode);
console.log("Stats:", JSON.stringify(result.stats, null, 2));

// Verify the output is parseable.
const out = result.bytes;
const view = new DataView(out.buffer, out.byteOffset, out.byteLength);
let off = 0;
console.log("\nTop-level boxes in OUTPUT:");
while (off + 8 <= out.byteLength) {
  const size = view.getUint32(off, false);
  const type = String.fromCharCode(
    out[off + 4],
    out[off + 5],
    out[off + 6],
    out[off + 7],
  );
  if (size < 8 || off + size > out.byteLength) {
    console.log(`  @${off} ${type} size=${size} ← INVALID, stopping`);
    break;
  }
  console.log(`  @${off} ${type} size=${size}`);
  off += size;
}
console.log("Total walked:", off, "Expected:", out.byteLength);

fs.writeFileSync("/home/z/my-project/scripts/patched-output.mp4", out);
console.log("\nWrote patched-output.mp4");
