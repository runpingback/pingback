"use client";

import { useState } from "react";
import Link from "next/link";

const navLinks = [
  { href: "#pricing", label: "Pricing", external: false },
  { href: "/docs", label: "Docs", external: false },
  { href: "https://app.pingback.lol/login", label: "Login", external: true },
];

export function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b">
      <div className="max-w-5xl mx-auto border-x relative">
        <div className="absolute -bottom-[5px] -left-[5px] w-2.5 h-2.5 rotate-45 border border-border bg-background z-10 hidden md:block" />
        <div className="absolute -bottom-[5px] -right-[5px] w-2.5 h-2.5 rotate-45 border border-border bg-background z-10 hidden md:block" />
        <div className="flex items-center justify-between h-14 px-6">
          <Link href="/" className="text-xl tracking-tight font-display font-light shrink-0">
            pingback
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-sm text-foreground hover:text-foreground/70 transition-colors"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="https://app.pingback.lol/register"
              className="text-sm bg-accent text-accent-foreground px-4 py-1.5 rounded-full hover:opacity-90 transition-opacity"
            >
              Get Started
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setOpen(!open)}
            className="md:hidden p-2 -mr-2"
            aria-label="Toggle menu"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              {open ? (
                <>
                  <line x1="4" y1="4" x2="16" y2="16" />
                  <line x1="16" y1="4" x2="4" y2="16" />
                </>
              ) : (
                <>
                  <line x1="3" y1="5" x2="17" y2="5" />
                  <line x1="3" y1="10" x2="17" y2="10" />
                  <line x1="3" y1="15" x2="17" y2="15" />
                </>
              )}
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {open && (
          <div className="md:hidden border-t px-6 py-4 flex flex-col gap-4 bg-background">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={() => setOpen(false)}
                className="text-sm text-foreground hover:text-foreground/70 transition-colors"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="https://app.pingback.lol/register"
              onClick={() => setOpen(false)}
              className="text-sm bg-accent text-accent-foreground px-4 py-1.5 rounded-full hover:opacity-90 transition-opacity text-center"
            >
              Get Started
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
