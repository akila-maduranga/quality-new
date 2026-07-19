import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Haze Bypass — TikTok Compression Optimizer",
  description:
    "Bypass TikTok's aggressive compression. Re-encode your videos with the Haze Method to keep maximum quality after upload.",
  keywords: [
    "TikTok compression",
    "TikTok optimizer",
    "Haze Method",
    "video encoder",
    "FFmpeg",
    "TikTok quality",
    "bypass compression",
  ],
  authors: [{ name: "Haze Bypass" }],
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "Haze Bypass — TikTok Compression Optimizer",
    description:
      "Re-encode videos with the Haze Method to keep maximum quality on TikTok.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Haze Bypass — TikTok Compression Optimizer",
    description:
      "Re-encode videos with the Haze Method to keep maximum quality on TikTok.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground min-h-screen flex flex-col`}
      >
        {children}
        <SonnerToaster
          position="bottom-center"
          theme="dark"
          richColors
          closeButton
        />
      </body>
    </html>
  );
}
