import Link from "next/link";
import { GridSection } from "./grid-section";

export function CTA() {
  return (
    <GridSection className="py-24 px-6 text-center">
        <h2 className="text-3xl font-bold tracking-tight mb-3">
          Your background jobs deserve a dashboard.
        </h2>
        <p className="text-muted-foreground mb-8">No credit card required.</p>
        <Link
          href="https://app.pingback.lol/register"
          className="bg-accent text-accent-foreground px-8 py-2.5 rounded-full text-sm font-medium hover:opacity-90 transition-opacity inline-block"
        >
          Get Started
        </Link>
    </GridSection>
  );
}
