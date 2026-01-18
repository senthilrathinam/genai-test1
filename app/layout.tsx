import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { ThemeProvider } from "./ThemeProvider";
import ThemeSelector from "./ThemeSelector";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "GrantFiller",
  description: "AI-powered grant application assistant",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-zinc-950 text-white antialiased">
        <ThemeProvider>
          <div className="min-h-screen flex flex-col bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950">
            <Navbar />
            <main className="flex-1">
              {children}
            </main>
            <footer className="border-t border-zinc-800 py-6">
              <div className="max-w-7xl mx-auto px-6 text-center text-sm text-zinc-500">
                <p>GrantFiller © 2025 · AI-powered grant application assistant</p>
              </div>
            </footer>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
