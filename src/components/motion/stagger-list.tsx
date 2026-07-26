import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface StaggerListProps {
  children: ReactNode;
  className?: string;
  staggerDelay?: number;
  once?: boolean;
}

const containerVariants = (staggerMs: number) => ({
  hidden: {},
  show: {
    transition: {
      staggerChildren: staggerMs / 1000,
    },
  },
});

const itemVariants = {
  hidden: { y: 24, opacity: 0 },
  show: { y: 0, opacity: 1, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as const } },
};

export function StaggerList({
  children,
  className = "",
  staggerDelay = 60,
  once = true,
}: StaggerListProps) {
  return (
    <motion.div
      variants={containerVariants(staggerDelay)}
      initial="hidden"
      whileInView="show"
      viewport={{ once, margin: "-80px" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div variants={itemVariants} className={className}>
      {children}
    </motion.div>
  );
}
