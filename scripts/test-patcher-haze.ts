// Test the Haze mode patcher
import * as fs from "fs";
import { patchMp4 } from "../src/lib/haze/patcher";

const input = fs.readFileSync("/tmp/haze-encoded.mp4");
console.log("Input size:", input.byteLength);

console.log("\n=== HAZE MODE (570 fps → 30 fps, mult=19) ===");
const result = patchMp4({
  bytes: new Uint8Array(input),
  sourceFps: 570,
  targetFps: 30,
  mode: "haze",
});
console.log("Output size:", result.bytes.byteLength);
console.log("Multiplier:", result.multiplier);
console.log("Mode:", result.mode);
console.log("Stats:", JSON.stringify(result.stats, null, 2));

// Verify the output is parseable
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

fs.writeFileSync("/tmp/haze-patched.mp4", out);
