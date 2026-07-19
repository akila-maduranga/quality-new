"use client";

export function Background() {
  return (
    <div
      aria-hidden
      className="fixed inset-0 -z-10 overflow-hidden pointer-events-none"
    >
      {/* Deep base */}
      <div className="absolute inset-0 bg-background" />

      {/* Aurora blobs */}
      <div
        className="absolute -top-[20%] left-[10%] h-[40rem] w-[40rem] rounded-full blur-[120px] pulse-glow"
        style={{
          background:
            "radial-gradient(circle, oklch(0.5 0.25 310 / 0.4), transparent 70%)",
        }}
      />
      <div
        className="absolute top-[15%] right-[5%] h-[35rem] w-[35rem] rounded-full blur-[120px] pulse-glow"
        style={{
          animationDelay: "1s",
          background:
            "radial-gradient(circle, oklch(0.55 0.22 200 / 0.35), transparent 70%)",
        }}
      />
      <div
        className="absolute bottom-[5%] left-[30%] h-[30rem] w-[30rem] rounded-full blur-[120px] pulse-glow"
        style={{
          animationDelay: "2s",
          background:
            "radial-gradient(circle, oklch(0.5 0.2 160 / 0.25), transparent 70%)",
        }}
      />

      {/* Grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "linear-gradient(to right, oklch(1 0 0 / 0.05) 1px, transparent 1px), linear-gradient(to bottom, oklch(1 0 0 / 0.05) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage:
            "radial-gradient(circle at 50% 30%, black, transparent 80%)",
          WebkitMaskImage:
            "radial-gradient(circle at 50% 30%, black, transparent 80%)",
        }}
      />

      {/* Vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, transparent 30%, oklch(0.13 0.02 280 / 0.7) 100%)",
        }}
      />
    </div>
  );
}
