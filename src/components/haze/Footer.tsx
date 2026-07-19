"use client";

import { Sparkles, Heart } from "lucide-react";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-border/40 bg-background/60 backdrop-blur-sm">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="relative h-8 w-8 rounded-lg overflow-hidden grid place-items-center">
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      "linear-gradient(135deg, oklch(0.72 0.22 310), oklch(0.6 0.24 200))",
                  }}
                />
                <Sparkles className="relative h-4 w-4 text-white" />
              </div>
              <span className="text-sm font-semibold">Haze Bypass</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-xs">
              A client-side TikTok compression optimizer. No accounts, no
              uploads, no watermark. Runs entirely in your browser.
            </p>
          </div>

          <FooterColumn
            title="Product"
            links={[
              { label: "Optimizer", href: "#optimizer" },
              { label: "How it works", href: "#how" },
              { label: "Spec sheet", href: "#specs" },
              { label: "FAQ", href: "#faq" },
            ]}
          />
          <FooterColumn
            title="Resources"
            links={[
              { label: "FFmpeg", href: "https://ffmpeg.org" },
              { label: "TikTok specs", href: "https://support.tiktok.com" },
              { label: "H.264 / AVC", href: "https://en.wikipedia.org/wiki/Advanced_Video_Coding" },
              { label: "BT.709", href: "https://en.wikipedia.org/wiki/Rec._709" },
            ]}
          />
          <FooterColumn
            title="Legal"
            links={[
              { label: "Privacy", href: "#" },
              { label: "Terms", href: "#" },
              { label: "Disclaimer", href: "#" },
            ]}
          />
        </div>

        <div className="mt-8 pt-6 border-t border-border/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <p>
            © {new Date().getFullYear()} Haze Bypass. Not affiliated with
            TikTok Ltd.
          </p>
          <p className="inline-flex items-center gap-1.5">
            Built with <Heart className="h-3 w-3 text-primary" /> using
            FFmpeg.wasm
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string }[];
}) {
  return (
    <div>
      <h4 className="text-xs uppercase tracking-wider text-foreground/80 font-semibold mb-3">
        {title}
      </h4>
      <ul className="space-y-2">
        {links.map((link) => (
          <li key={link.label}>
            <a
              href={link.href}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
