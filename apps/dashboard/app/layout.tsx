import type { Metadata } from "next";
import "./globals.css";
import { Roboto_Mono } from "next/font/google";
import { cn } from "@/lib/utils";
import { Providers } from "@/lib/providers";

const robotoMono = Roboto_Mono({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-sans" });

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
    <html lang="en" className={cn("dark", "font-sans", robotoMono.variable)}>
      <body className="antialiased font-medium">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
