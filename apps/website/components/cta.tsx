import Link from "next/link";

export function CTA() {
  return (
    <section className="border-b">
      <div className="max-w-5xl mx-auto border-x py-24 px-6 text-center">
        <h2 className="text-3xl font-bold tracking-tight mb-3">
          Start running crons in under 10 minutes.
        </h2>
        <p className="text-muted-foreground mb-8">No credit card required.</p>
        <Link
          href="https://app.pingback.dev/register"
          className="bg-foreground text-background px-8 py-2.5 rounded-full text-sm font-medium hover:opacity-90 transition-opacity inline-block"
        >
          Get Started
        </Link>
      </div>
    </section>
  );
}
