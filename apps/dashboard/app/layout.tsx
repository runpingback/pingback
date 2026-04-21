import type { Metadata } from "next";
import "./globals.css";
import { Poppins, Unbounded } from "next/font/google";
import { cn } from "@/lib/utils";
import { Providers } from "@/lib/providers";

const poppins = Poppins({ subsets: ["latin"], weight: ["300", "400", "500", "600", "700"], variable: "--font-sans" });
const unbounded = Unbounded({ subsets: ["latin"], weight: ["300", "400", "700", "800"], variable: "--font-display" });

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
    <html lang="en" className={cn("dark", "font-sans", poppins.variable, unbounded.variable)}>
      <body className="antialiased font-medium">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
