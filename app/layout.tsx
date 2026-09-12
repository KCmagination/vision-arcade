import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./mobile.css";

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#070d12" };

export const metadata: Metadata = {
  title: "Vi$ion — Build Your Avatar",
  description:
    "Turn your financial picture into a Mech or Tree avatar. Explore four forces, try a what-if, and take your loadout into the arcade.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased">{children}</body>
    </html>
  );
}
