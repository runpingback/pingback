import Link from "next/link";
import { GridSection, GridDot } from "./grid-section";

const links = {
  Product: [
    { label: "Features", href: "#features" },
    { label: "Pricing", href: "#pricing" },
  ],
  Developers: [
    { label: "Documentation", href: "https://docs.pingback.dev" },
    { label: "GitHub", href: "https://github.com/pingback" },
  ],
  Company: [
    { label: "Twitter / X", href: "https://x.com/pingback" },
  ],
};

export function Footer() {
  return (
    <footer>
      <GridSection>
        <div className="grid grid-cols-2 md:grid-cols-4 border-t relative">
          <GridDot className="-top-[5px] -left-[5px]" />
          <GridDot className="-top-[5px] left-1/4 -translate-x-1/2" />
          <GridDot className="-top-[5px] left-1/2 -translate-x-1/2" />
          <GridDot className="-top-[5px] left-3/4 -translate-x-1/2" />
          <GridDot className="-top-[5px] -right-[5px]" />
          <div className="p-8 col-span-2 md:col-span-1 md:border-r border-b md:border-b-0">
            <p className="text-xl font-light mb-2">pingback</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Reliable cron jobs and background tasks for modern web apps.
            </p>
          </div>
          {Object.entries(links).map(([category, items], i) => (
            <div
              key={category}
              className={`p-8 ${i < 2 ? "md:border-r" : ""} border-b md:border-b-0`}
            >
              <p className="text-sm font-semibold mb-3">{category}</p>
              <ul className="space-y-2">
                {items.map((item) => (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t px-8 py-4 relative">
          <GridDot className="-top-[5px] -left-[5px]" />
          <GridDot className="-top-[5px] -right-[5px]" />
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Pingback. All rights reserved.
          </p>
        </div>
      </GridSection>
    </footer>
  );
}
