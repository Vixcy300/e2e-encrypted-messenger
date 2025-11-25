'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function MatrixBackground() {
  const [mounted, setMounted] = useState(false);
  const [randoms, setRandoms] = useState<any[]>([]);

  useEffect(() => {
    setMounted(true);
    // Precompute all random values for deterministic rendering
    const arr = Array.from({ length: 50 }, () => ({
      left: Math.random() * 100 + '%',
      duration: 5 + Math.random() * 5,
      delay: Math.random() * 5,
      text: Math.random().toString(36).substring(2, 5),
    }));
    setRandoms(arr);
  }, []);

  if (!mounted || randoms.length === 0) return null;

  return (
    <div className="fixed inset-0 opacity-20 pointer-events-none z-0">
      {randoms.map((rand, i) => (
        <motion.div
          key={i}
          className="absolute font-mono text-xs font-bold"
          style={{
            color: i % 3 === 0 ? '#00ff41' : i % 3 === 1 ? '#00d9ff' : '#ff006e',
            left: rand.left,
            top: -20,
          }}
          animate={{
            y: ['0vh', '110vh'],
            opacity: [0, 1, 0],
          }}
          transition={{
            duration: rand.duration,
            repeat: Infinity,
            delay: rand.delay,
            ease: 'linear',
          }}
        >
          {rand.text}
        </motion.div>
      ))}
    </div>
  );
}

export function GlitchLines() {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 opacity-10 pointer-events-none z-0">
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-full h-px bg-gradient-to-r from-transparent via-cyan-500 to-transparent"
          style={{ top: `${i * 20}%` }}
          animate={{
            x: ['-100%', '100%'],
            opacity: [0, 0.5, 0],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            delay: i * 0.7,
            ease: 'linear',
          }}
        />
      ))}
    </div>
  );
}

export function ScanLine() {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <motion.div
      className="fixed inset-0 bg-gradient-to-b from-transparent via-green-500/5 to-transparent pointer-events-none z-0"
      animate={{ y: ['-100%', '200%'] }}
      transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
    />
  );
}
