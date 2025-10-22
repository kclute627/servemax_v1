import React, { useEffect, useState } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';

// Animated number component with smooth counting transitions
export function AnimatedNumber({
  value,
  duration = 0.6,
  format = 'number',
  prefix = '',
  suffix = '',
  className = '',
  decimals = 0,
  delay = 0
}) {
  const [prevValue, setPrevValue] = useState(value);
  const spring = useSpring(prevValue, {
    stiffness: 200,
    damping: 25,
    mass: 1
  });
  const display = useTransform(spring, (current) => {
    if (format === 'currency') {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      }).format(current);
    } else if (format === 'percentage') {
      return `${current.toFixed(decimals)}%`;
    } else if (format === 'compact') {
      return new Intl.NumberFormat('en-US', {
        notation: 'compact',
        compactDisplay: 'short',
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      }).format(current);
    } else {
      return current.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      });
    }
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setPrevValue(value);
      spring.set(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, spring, delay]);

  return (
    <motion.span
      className={className}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: delay / 1000 }}
    >
      {prefix}
      <motion.span>{display}</motion.span>
      {suffix}
    </motion.span>
  );
}

// Animated percentage indicator with trend icons
export function AnimatedPercentage({
  value,
  showIcon = true,
  className = '',
  delay = 0
}) {
  const isPositive = value > 0;
  const isNeutral = value === 0;

  return (
    <motion.div
      className={`flex items-center gap-1 ${
        isNeutral ? 'text-slate-500' : isPositive ? 'text-green-600' : 'text-red-600'
      } ${className}`}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        duration: 0.25,
        delay: delay / 1000,
        type: "spring",
        stiffness: 300,
        damping: 20
      }}
    >
      {showIcon && !isNeutral && (
        <motion.div
          initial={{ opacity: 0, rotate: isPositive ? -45 : 45 }}
          animate={{ opacity: 1, rotate: 0 }}
          transition={{ duration: 0.2, delay: (delay + 100) / 1000 }}
        >
          {isPositive ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17l9.2-9.2M17 8v9h-9" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 7l-9.2 9.2M8 16V7h9" />
            </svg>
          )}
        </motion.div>
      )}
      <AnimatedNumber
        value={Math.abs(value)}
        format="percentage"
        decimals={1}
        prefix={value > 0 ? '+' : value < 0 ? '-' : ''}
        className="text-sm font-medium"
        delay={delay + 50}
      />
    </motion.div>
  );
}

// Simple animated counter for basic numbers
export function AnimatedCounter({
  value,
  className = '',
  duration = 500,
  delay = 0
}) {
  return (
    <AnimatedNumber
      value={value}
      duration={duration}
      className={className}
      delay={delay}
    />
  );
}