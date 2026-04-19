import type { Metadata } from "next";
import { Inter, Unbounded } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const unbounded = Unbounded({ subsets: ["latin"], weight: ["200", "300", "400", "500", "600", "700"], variable: "--font-logo" });

export const metadata: Metadata = {
  title: "Pingback — Reliable cron jobs for modern web apps",
  description:
    "Define scheduled functions directly in your codebase. Pingback handles scheduling, retries, and monitoring.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${unbounded.variable}`}>
      <body className="antialiased" style={{ fontFamily: "var(--font-logo)" }}>{children}</body>
    </html>
  );
}
