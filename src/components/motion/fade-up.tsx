import { motion, type MotionProps } from "framer-motion";
import type { ReactNode } from "react";

interface FadeUpProps extends MotionProps {
  children: ReactNode;
  delay?: number;
  className?: string;
  once?: boolean;
}

export function FadeUp({
  children,
  delay = 0,
  className = "",
  once = true,
  ...motionProps
}: FadeUpProps) {
  return (
    <motion.div
      initial={{ y: 24, opacity: 0 }}
      whileInView={{ y: 0, opacity: 1 }}
      viewport={{ once, margin: "-80px" }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay }}
      className={className}
      {...motionProps}
    >
      {children}
    </motion.div>
  );
}
