export function GridDot({ className = "" }: { className?: string }) {
  return (
    <div
      className={`absolute w-2.5 h-2.5 rotate-45 border border-border bg-background z-10 hidden md:block ${className}`}
    />
  );
}

export function GridSection({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className="border-b relative">
      <div className={`max-w-5xl mx-auto border-x relative ${className}`}>
        <GridDot className="-top-[5px] -left-[5px]" />
        <GridDot className="-top-[5px] -right-[5px]" />
        <GridDot className="-bottom-[5px] -left-[5px]" />
        <GridDot className="-bottom-[5px] -right-[5px]" />
        {children}
      </div>
    </section>
  );
}
