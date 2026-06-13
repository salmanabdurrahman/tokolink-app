import { motion, Variants } from "framer-motion";

// 1. CoffeeIcon (F&B) - Animates rising steam and a slight cup scale
export function CoffeeIcon() {
  const steamVariants: Variants = {
    rest: { y: 0, opacity: 0.3, pathLength: 0.8 },
    hover: {
      y: [-2, -8, -12],
      opacity: [0, 1, 0],
      pathLength: [0.8, 1, 0.8],
      transition: {
        duration: 1.5,
        repeat: Infinity,
        ease: "easeInOut",
      },
    },
  };

  const cupVariants: Variants = {
    rest: { scale: 1 },
    hover: {
      scale: 1.05,
      transition: { type: "spring", stiffness: 300, damping: 15 },
    },
  };

  return (
    <motion.svg
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-foreground"
      variants={cupVariants}
    >
      {/* Steam lines */}
      <motion.path d="M6 6c.5-1.5 1-2.5 1-4" variants={steamVariants} />
      <motion.path
        d="M10 6c.5-2.5 1-3.5 1-5"
        variants={steamVariants}
        transition={{ delay: 0.2 }}
      />
      <motion.path
        d="M14 6c.5-1.5 1-2.5 1-4"
        variants={steamVariants}
        transition={{ delay: 0.4 }}
      />
      {/* Cup Body */}
      <path d="M17 8H6a4 4 0 0 0-4 4v5a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3V8z" />
      {/* Cup Handle */}
      <path d="M17 11h1a3 3 0 0 1 3 3v0a3 3 0 0 1-3 3h-1" />
    </motion.svg>
  );
}

// 2. ShirtIcon (Fashion) - Hanger sways and sparkle effects
export function ShirtIcon() {
  const hangerVariants: Variants = {
    rest: { rotate: 0 },
    hover: {
      rotate: [-6, 6, -6, 4, -4, 0],
      transition: {
        duration: 1.8,
        ease: "easeInOut",
      },
    },
  };

  const sparkleVariants: Variants = {
    rest: { scale: 0, opacity: 0 },
    hover: {
      scale: [0, 1.2, 0],
      opacity: [0, 1, 0],
      transition: {
        duration: 1.2,
        repeat: Infinity,
        repeatDelay: 0.4,
      },
    },
  };

  return (
    <div className="relative inline-block">
      <motion.svg
        width="32"
        height="32"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-foreground origin-top"
        variants={hangerVariants}
      >
        {/* Hanger Hook */}
        <path d="M12 2a2 2 0 0 1 2 2c0 .7-.3 1.2-.8 1.6l-.4.3M12 5.5v.5" />
        {/* Shirt Outline */}
        <path d="M15 6.5 20 8l1 4-3 1-1-3.5V20a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V9.5L6 13l-3-1 1-4 5-1.5h6Z" />
      </motion.svg>
      {/* Sparkles */}
      <motion.svg
        width="10"
        height="10"
        viewBox="0 0 24 24"
        className="absolute -top-1 -right-2 text-accent fill-accent"
        variants={sparkleVariants}
      >
        <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5Z" />
      </motion.svg>
    </div>
  );
}

// 3. PackageIcon (Reseller) - Lid opens up using a snappy spring
export function PackageIcon() {
  const lidVariants: Variants = {
    rest: { y: 0, rotate: 0 },
    hover: {
      y: -4,
      rotate: -4,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 12,
      },
    },
  };

  const boxVariants: Variants = {
    rest: { scale: 1 },
    hover: {
      scale: [1, 0.96, 1.02, 1],
      transition: { duration: 0.4 },
    },
  };

  return (
    <motion.svg
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-foreground"
      variants={boxVariants}
    >
      {/* Box Lid */}
      <motion.path d="M21 8H3L4 4h16l1 4Z" variants={lidVariants} className="origin-left" />
      {/* Box Body */}
      <path d="M10 12h4" />
      <path d="M19 8v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V8" />
    </motion.svg>
  );
}

// 4. JasaIcon (Jasa) - Brush tilts and draws a path
export function JasaIcon() {
  const brushVariants: Variants = {
    rest: { rotate: 0, x: 0, y: 0 },
    hover: {
      rotate: [0, -10, 15, -5, 0],
      x: [0, -2, 3, -1, 0],
      y: [0, -1, 1, 0, 0],
      transition: {
        duration: 1.2,
        ease: "easeInOut",
      },
    },
  };

  const lineVariants: Variants = {
    rest: { pathLength: 0, opacity: 0 },
    hover: {
      pathLength: 1,
      opacity: 1,
      transition: {
        duration: 0.8,
        ease: "easeOut",
      },
    },
  };

  return (
    <div className="relative inline-block">
      <motion.svg
        width="32"
        height="32"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-foreground"
      >
        {/* Palette Base */}
        <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 14.7255 3.09032 17.1962 4.85857 19H4.85857C5.48516 19 6.00223 19.4996 6.03154 20.1254C6.07594 21.0706 6.84439 21.8211 7.79155 21.8211C8.28312 21.8211 8.76101 21.611 9.09673 21.2505L9.93282 20.3524C10.4578 19.7885 11.2057 19.4678 11.9902 19.4678C12.0396 19.4678 12.089 19.4709 12.1384 19.4771C12.8719 19.5694 13.5678 20.0075 13.9877 20.6416L14.5098 21.4298C14.887 21.999 15.5898 22.2891 16.2736 22.1578" />
        {/* Paint Swatches */}
        <circle cx="7.5" cy="10.5" r="1" fill="currentColor" />
        <circle cx="11.5" cy="7.5" r="1" fill="currentColor" />
        <circle cx="16.5" cy="9.5" r="1" fill="currentColor" />

        {/* Brush (Separate group for rotation) */}
        <motion.g variants={brushVariants} className="origin-center">
          <path d="m14 12 6.5-6.5a1.5 1.5 0 0 1 2 2L16 14" />
          <path d="M14 12v3a1 1 0 0 1-1 1h-3a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1Z" />
        </motion.g>

        {/* Paint Stroke Line representing brush drawing */}
        <motion.path
          d="M6 16c2 1 4-1 6 0"
          stroke="currentColor"
          strokeWidth="1.5"
          variants={lineVariants}
        />
      </motion.svg>
    </div>
  );
}
