'use client';

import React from 'react';
import { useAppStore } from '@/lib/store';
import { Sun, Moon } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useAppStore();

  const handleToggle = (e: React.MouseEvent<HTMLButtonElement>) => {
    // If browser supports Document StartViewTransition, trigger circular reveal
    if (typeof document !== 'undefined' && 'startViewTransition' in document) {
      const x = e.clientX;
      const y = e.clientY;
      const endRadius = Math.hypot(
        Math.max(x, window.innerWidth - x),
        Math.max(y, window.innerHeight - y)
      );

      const transition = (document as any).startViewTransition(() => {
        toggleTheme();
      });

      transition.ready.then(() => {
        document.documentElement.animate(
          {
            clipPath: [
              `circle(0px at ${x}px ${y}px)`,
              `circle(${endRadius}px at ${x}px ${y}px)`,
            ],
          },
          {
            duration: 450,
            easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
            pseudoElement: '::view-transition-new(root)',
          }
        );
      });
    } else {
      toggleTheme();
    }
  };

  return (
    <button
      onClick={handleToggle}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      className="relative p-2 rounded-xl text-foreground-muted hover:text-foreground hover:bg-[var(--surface-2)] transition-colors hairline-border flex items-center justify-center cursor-pointer"
      aria-label="Toggle Theme"
    >
      <motion.div
        key={theme}
        initial={{ rotate: -90, opacity: 0, scale: 0.8 }}
        animate={{ rotate: 0, opacity: 1, scale: 1 }}
        exit={{ rotate: 90, opacity: 0, scale: 0.8 }}
        transition={{ duration: 0.2 }}
      >
        {theme === 'dark' ? (
          <Sun className="w-4 h-4 text-[#C6FF3D]" />
        ) : (
          <Moon className="w-4 h-4 text-[#FF5B2E]" />
        )}
      </motion.div>
    </button>
  );
}
