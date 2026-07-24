import { motion } from "framer-motion";
import { FallbackImage } from "@/components/fallback-image";
import type { Tenant } from "@/lib/types";

interface StorefrontHeaderProps {
  tenant: Pick<Tenant, "name" | "tagline" | "avatar" | "links">;
}

export function StorefrontHeader({ tenant }: StorefrontHeaderProps) {
  return (
    <>
      <header className="px-6 pt-12">
        <div className="mx-auto max-w-md text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
            className="mx-auto h-20 w-20 rounded-full border-4 border-card overflow-hidden shadow-sm"
          >
            <FallbackImage
              src={tenant.avatar}
              alt={tenant.name}
              fallbackText={tenant.name}
              className="h-full w-full object-cover"
            />
          </motion.div>
          <motion.h1
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.05, ease: [0.23, 1, 0.32, 1] }}
            className="font-display mt-5 text-3xl font-medium tracking-tight"
          >
            {tenant.name}
          </motion.h1>
          <motion.p
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.1, ease: [0.23, 1, 0.32, 1] }}
            className="mt-2 text-sm text-muted-foreground text-pretty"
          >
            {tenant.tagline}
          </motion.p>
        </div>
      </header>
      <section className="mx-auto mt-8 max-w-md px-6">
        <div className="flex flex-wrap justify-center gap-2">
          {tenant.links.map((l, i) => (
            <motion.a
              key={l.id}
              initial={{ y: 8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.15 + i * 0.04, ease: [0.23, 1, 0.32, 1] }}
              href={l.url}
              className="rounded-full border border-border bg-card px-4 py-2 text-sm transition hover:bg-foreground hover:text-background active:scale-[0.97]"
            >
              {l.label} ↗
            </motion.a>
          ))}
        </div>
      </section>
    </>
  );
}
