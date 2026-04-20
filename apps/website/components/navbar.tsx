import Link from "next/link";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b">
      <div className="max-w-5xl mx-auto border-x relative">
        <div className="absolute -bottom-[5px] -left-[5px] w-2.5 h-2.5 rotate-45 border border-border bg-background z-10 hidden md:block" />
        <div className="absolute -bottom-[5px] -right-[5px] w-2.5 h-2.5 rotate-45 border border-border bg-background z-10 hidden md:block" />
        <div className="flex items-center justify-between h-14 px-6">
        <Link href="/" className="text-xl tracking-tight font-display font-light">
          pingback
        </Link>

        <div className="flex items-center gap-6">
          <a href="#pricing" className="text-sm text-foreground hover:text-foreground/70 transition-colors">
            Pricing
          </a>
          <Link href="/docs" className="text-sm text-foreground hover:text-foreground/70 transition-colors">
            Docs
          </Link>
          <Link
            href="https://app.pingback.dev/login"
            className="text-sm text-foreground hover:text-foreground/70 transition-colors"
          >
            Login
          </Link>
          <Link
            href="https://app.pingback.dev/register"
            className="text-sm bg-accent text-accent-foreground px-4 py-1.5 rounded-full hover:opacity-90 transition-opacity"
          >
            Get Started
          </Link>
        </div>
        </div>
      </div>
    </header>
  );
}
