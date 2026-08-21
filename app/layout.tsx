import type { Metadata } from "next";
import "./globals.css";
import PwaRegister from "./pwa-register";

export const metadata: Metadata = {
  title: "Chaoso vakarėlis Plateliuose",
  description: "Game Master programėlė slaptoms misijoms ir Chaoso Agentams.",
  manifest: "/manifest.webmanifest",
  themeColor: "#0a0f16",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Chaosas",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" }
    ],
    apple: "/icon-192.png",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="lt">
      <body><PwaRegister />{children}</body>
    </html>
  );
}
