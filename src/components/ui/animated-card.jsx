import React from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';

// Animated card wrapper with enhanced transitions
export function AnimatedCard({
  children,
  className = '',
  delay = 0,
  duration = 0.3,
  hover = true,
  stagger = false,
  index = 0,
  ...props
}) {
  const staggerDelay = stagger ? index * 0.05 : 0;
  const totalDelay = delay + staggerDelay;

  const cardVariants = {
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
        duration: duration,
        delay: totalDelay,
        type: "spring",
        stiffness: 150,
        damping: 20
      }
    },
    hover: hover ? {
      scale: 1.02,
      y: -4,
      boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
      transition: {
        duration: 0.15,
        type: "spring",
        stiffness: 400,
        damping: 25
      }
    } : {},
    tap: hover ? {
      scale: 0.98,
      transition: {
        duration: 0.1
      }
    } : {}
  };

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      whileHover="hover"
      whileTap="tap"
      className={className}
    >
      <Card className="h-full border-0 shadow-lg bg-white" {...props}>
        {children}
      </Card>
    </motion.div>
  );
}

// Animated grid container for staggered card animations
export function AnimatedGrid({
  children,
  className = '',
  staggerChildren = 0.05,
  delayChildren = 0
}) {
  const containerVariants = {
    hidden: {
      opacity: 0
    },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: staggerChildren,
        delayChildren: delayChildren
      }
    }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Animated content container with slide transitions
export function AnimatedContent({
  children,
  className = '',
  direction = 'up',
  delay = 0,
  duration = 0.3,
  isVisible = true
}) {
  const directions = {
    up: { y: 20 },
    down: { y: -20 },
    left: { x: 20 },
    right: { x: -20 }
  };

  const variants = {
    hidden: {
      opacity: 0,
      ...directions[direction]
    },
    visible: {
      opacity: 1,
      x: 0,
      y: 0,
      transition: {
        duration: duration,
        delay: delay,
        ease: "easeOut"
      }
    },
    exit: {
      opacity: 0,
      ...directions[direction],
      transition: {
        duration: duration * 0.5,
        ease: "easeIn"
      }
    }
  };

  return (
    <motion.div
      variants={variants}
      initial="hidden"
      animate={isVisible ? "visible" : "exit"}
      className={className}
    >
      {children}
    </motion.div>
  );
}