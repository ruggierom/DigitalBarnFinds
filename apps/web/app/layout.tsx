import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "DigitalBarnFinds",
  description: "Classic car registry and darkness scoring dashboard."
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
