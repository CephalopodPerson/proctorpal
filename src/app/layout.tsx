import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ProctorPal",
  description: "In-classroom online testing with proctoring.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
