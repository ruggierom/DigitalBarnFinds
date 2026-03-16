import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "DigitalBarnFinds",
  description: "Classic car registry and darkness scoring dashboard.",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg"
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
