import { CoffeeIcon, ShirtIcon, PackageIcon, JasaIcon } from "@/components/animated-usecase-icons";
import { FadeUp } from "@/components/motion/fade-up";

export function UsecasesSection() {
  return (
    <section
      id="usecases"
      className="border-t border-border bg-surface px-6 py-32 relative overflow-hidden"
    >
      <div className="mx-auto max-w-6xl">
        <FadeUp className="flex items-end justify-between">
          <div>
            <span className="text-xs uppercase tracking-widest text-muted-foreground">
              02 — Use cases
            </span>
            <h2 className="font-display mt-3 text-5xl font-medium tracking-tight sm:text-6xl">
              Cocok untuk siapa saja.
            </h2>
          </div>
        </FadeUp>

        <div className="mt-16 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border lg:grid-cols-4">
          {[
            { tag: "F&B", desc: "Coffee shop, katering, bakery", icon: <CoffeeIcon /> },
            { tag: "Fashion", desc: "Thrift, batik, custom merch", icon: <ShirtIcon /> },
            { tag: "Reseller", desc: "Dropship, agen, pre-order", icon: <PackageIcon /> },
            { tag: "Jasa", desc: "Desain, fotografi, edit video", icon: <JasaIcon /> },
          ].map((u, i) => (
            <FadeUp
              key={u.tag}
              delay={i * 0.05}
              whileHover="hover"
              className="group flex flex-col aspect-square bg-background p-6 transition duration-200 hover:bg-accent cursor-pointer"
            >
              <div className="h-12 w-12 flex items-center justify-center bg-muted/40 rounded-2xl group-hover:bg-background/25 transition-colors duration-200">
                {u.icon}
              </div>
              <div className="font-display mt-auto pt-12 text-2xl font-medium">{u.tag}</div>
              <div className="mt-1 text-xs text-muted-foreground group-hover:text-foreground/70">
                {u.desc}
              </div>
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  );
}
