// Motion configuration utilities for accessibility and performance

// Check if user prefers reduced motion
export const prefersReducedMotion = () => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

// Default animation configurations
export const motionConfig = {
  // Stagger children animations
  stagger: {
    staggerChildren: 0.1,
    delayChildren: 0.1
  },

  // Card entrance animations
  cardVariants: {
    hidden: {
      opacity: 0,
      y: 20,
      scale: 0.95
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 20,
        duration: 0.5
      }
    },
    hover: {
      scale: 1.02,
      y: -4,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 25,
        duration: 0.2
      }
    }
  },

  // Table row animations
  tableRowVariants: {
    hidden: {
      opacity: 0,
      y: 20,
      scale: 0.95
    },
    visible: (index) => ({
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        delay: index * 0.05,
        type: "spring",
        stiffness: 200,
        damping: 20,
        duration: 0.4
      }
    }),
    hover: {
      backgroundColor: "rgba(248, 250, 252, 0.8)",
      scale: 1.01,
      transition: { duration: 0.2 }
    },
    exit: {
      opacity: 0,
      y: -20,
      scale: 0.95,
      transition: { duration: 0.3 }
    }
  },

  // Number animation configurations
  numberAnimation: {
    duration: 1.2,
    type: "spring",
    stiffness: 100,
    damping: 30
  },

  // Icon animations
  iconVariants: {
    initial: { scale: 0, rotate: -180 },
    animate: {
      scale: 1,
      rotate: 0,
      transition: {
        type: "spring",
        stiffness: 200,
        damping: 15
      }
    },
    hover: {
      scale: 1.1,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 20
      }
    }
  },

  // Toggle switch animations
  toggleVariants: {
    x: 0,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 30
    }
  }
};

// Reduced motion configurations
export const reducedMotionConfig = {
  stagger: {
    staggerChildren: 0,
    delayChildren: 0
  },

  cardVariants: {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { duration: 0.2 }
    },
    hover: {}
  },

  tableRowVariants: {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { duration: 0.2 }
    },
    hover: {},
    exit: { opacity: 0, transition: { duration: 0.1 } }
  },

  numberAnimation: {
    duration: 0.3,
    ease: "easeOut"
  },

  iconVariants: {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { duration: 0.2 } },
    hover: {}
  },

  toggleVariants: {
    x: 0,
    transition: { duration: 0.2 }
  }
};

// Get appropriate config based on user preference
export const getMotionConfig = () => {
  return prefersReducedMotion() ? reducedMotionConfig : motionConfig;
};

// Utility function to get safe animation props
export const getSafeAnimationProps = (normalProps, reducedProps = {}) => {
  return prefersReducedMotion() ? reducedProps : normalProps;
};

// Spring configurations for different animation types
export const springConfigs = {
  gentle: { stiffness: 120, damping: 20 },
  wobbly: { stiffness: 180, damping: 12 },
  stiff: { stiffness: 400, damping: 30 },
  slow: { stiffness: 60, damping: 15 },
  bouncy: { stiffness: 250, damping: 8 }
};

// Common easing functions
export const easings = {
  easeInOut: [0.4, 0.0, 0.2, 1],
  easeOut: [0.0, 0.0, 0.2, 1],
  easeIn: [0.4, 0.0, 1, 1],
  sharp: [0.4, 0.0, 0.6, 1]
};