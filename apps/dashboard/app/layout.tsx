import type { Metadata } from "next";
import "./globals.css";
import { Nunito } from "next/font/google";
import { cn } from "@/lib/utils";
import { Providers } from "@/lib/providers";

const nunito = Nunito({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Pingback",
  description: "Cron jobs and background tasks for modern web apps",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={cn("dark", "font-sans", nunito.variable)}>
      <body className="antialiased font-medium">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
