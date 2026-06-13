import { motion, type MotionProps } from "framer-motion";
import type { ReactNode } from "react";

interface FadeUpProps extends MotionProps {
  children: ReactNode;
  delay?: number;
  className?: string;
  once?: boolean;
}

/**
 * Premium FadeUp: y:16, opacity:0 -> y:0, opacity:1
 * Emil principle: never from y:0 opacity:0 only — combine position + opacity
 * Duration 400ms ease-out, viewport triggered
 */
export function FadeUp({
  children,
  delay = 0,
  className = "",
  once = true,
  ...motionProps
}: FadeUpProps) {
  return (
    <motion.div
      initial={{ y: 16, opacity: 0 }}
      whileInView={{ y: 0, opacity: 1 }}
      viewport={{ once, margin: "-80px" }}
      transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1], delay }}
      className={className}
      {...motionProps}
    >
      {children}
    </motion.div>
  );
}
