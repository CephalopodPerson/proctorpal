import type { Metadata } from "next";
import "./globals.css";
import { LocaleProvider } from "@/lib/i18n";
import { LanguageToggle } from "@/components/LanguageToggle";

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
      <body className="min-h-screen">
        <LocaleProvider>
          <div className="fixed top-3 right-3 z-40">
            <LanguageToggle />
          </div>
          {children}
        </LocaleProvider>
      </body>
    </html>
  );
}
