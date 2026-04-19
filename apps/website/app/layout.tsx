import type { Metadata } from "next";
import { Poppins, Unbounded } from "next/font/google";
import "./globals.css";

const poppins = Poppins({ subsets: ["latin"], weight: ["300", "400", "500", "600", "700"], variable: "--font-sans" });
const unbounded = Unbounded({ subsets: ["latin"], weight: ["300", "400", "700", "800"], variable: "--font-display" });

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
    <html lang="en" className={`${poppins.variable} ${unbounded.variable}`}>
      <body className="antialiased font-sans">{children}</body>
    </html>
  );
}
