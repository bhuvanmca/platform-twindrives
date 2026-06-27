import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TwinDrives Platform",
  description: "Platform management for TwinDrives colleges",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
