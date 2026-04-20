import { Navbar } from "@/components/navbar";
import { DocsSidebar } from "@/components/docs-sidebar";
import { GridDot } from "@/components/grid-section";
import { Footer } from "@/components/footer";

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Navbar />
      <div className="border-b">
        <div className="max-w-5xl mx-auto border-x relative min-h-[calc(100vh-3.5rem)]">
          <GridDot className="-top-[5px] -left-[5px]" />
          <GridDot className="-top-[5px] -right-[5px]" />
          <GridDot className="-bottom-[5px] -left-[5px]" />
          <GridDot className="-bottom-[5px] -right-[5px]" />
          <div className="flex">
            <div className="hidden md:block border-r">
              <div className="sticky top-14">
                <DocsSidebar />
              </div>
            </div>
            <article className="flex-1 min-w-0 px-8 py-10">
              {children}
            </article>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
