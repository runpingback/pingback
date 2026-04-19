import Link from "next/link";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b">
      <div className="max-w-5xl mx-auto border-x relative">
        <div className="absolute -bottom-[5px] -left-[5px] w-2.5 h-2.5 rotate-45 border border-border bg-background z-10 hidden md:block" />
        <div className="absolute -bottom-[5px] -right-[5px] w-2.5 h-2.5 rotate-45 border border-border bg-background z-10 hidden md:block" />
        <div className="flex items-center justify-between h-14 px-6">
        <Link href="/" className="text-xl font-light tracking-tight">
          pingback
        </Link>

        <nav className="flex items-center gap-6">
          <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Pricing
          </a>
          <Link href="https://docs.pingback.dev" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Docs
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="https://app.pingback.dev/login"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
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
