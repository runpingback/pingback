import Link from "next/link";
import { GridSection, GridDot } from "./grid-section";

const tiers = [
  {
    name: "Free",
    price: "$0",
    description: "For side projects and experimentation.",
    features: [
      "5 jobs",
      "1,000 executions / month",
      "1-minute minimum interval",
      "24-hour log retention",
      "1 project",
      "Email alerts",
    ],
    highlight: false,
  },
  {
    name: "Pro",
    price: "$12",
    description: "For production apps that need reliability.",
    features: [
      "50 jobs",
      "50,000 executions / month",
      "10-second minimum interval",
      "30-day log retention",
      "5 projects",
      "Email + webhook alerts",
    ],
    highlight: true,
  },
  {
    name: "Team",
    price: "$39",
    description: "For teams managing multiple projects.",
    features: [
      "Unlimited jobs",
      "500,000 executions / month",
      "10-second minimum interval",
      "90-day log retention",
      "Unlimited projects",
      "Email + webhook alerts",
      "10 team members",
      "Priority support",
    ],
    highlight: false,
  },
];

export function Pricing() {
  return (
    <GridSection>
        <div className="py-20 px-6 text-center">
          <h2 className="text-3xl font-bold tracking-tight mb-3">
            Simple, predictable pricing
          </h2>
          <p className="text-muted-foreground">
            Start free. Upgrade when you need more.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 border-t relative">
          <GridDot className="-top-[5px] -left-[5px]" />
          <GridDot className="-top-[5px] left-1/3 -translate-x-1/2" />
          <GridDot className="-top-[5px] left-2/3 -translate-x-1/2" />
          <GridDot className="-top-[5px] -right-[5px]" />
          {tiers.map((tier, i) => (
            <div
              key={tier.name}
              className={`p-8 flex flex-col ${i < 2 ? "md:border-r" : ""} border-b md:border-b-0 ${
                tier.highlight ? "bg-muted/30" : ""
              }`}
            >
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-lg font-semibold">{tier.name}</h3>
                  {tier.highlight && (
                    <span className="text-[10px] font-medium bg-accent text-accent-foreground px-2 py-0.5 rounded-full">
                      Popular
                    </span>
                  )}
                </div>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-3xl font-bold">{tier.price}</span>
                  <span className="text-sm text-muted-foreground">/mo</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {tier.description}
                </p>
              </div>
              <ul className="space-y-2.5 mb-8 flex-1">
                {tier.features.map((feature) => (
                  <li
                    key={feature}
                    className="text-sm text-muted-foreground flex items-start gap-2"
                  >
                    <svg
                      className={`h-4 w-4 shrink-0 mt-0.5 ${tier.highlight ? "text-accent" : "text-foreground"}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
              <Link
                href="https://app.pingback.lol/register"
                className={`text-sm font-medium text-center py-2.5 rounded-full transition-opacity ${
                  tier.highlight
                    ? "bg-accent text-accent-foreground hover:opacity-90"
                    : "border hover:bg-muted"
                }`}
              >
                Get Started
              </Link>
            </div>
          ))}
        </div>
    </GridSection>
  );
}
