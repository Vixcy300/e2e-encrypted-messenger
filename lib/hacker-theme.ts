/**
 * Hacker/Cyberpunk Theme Configuration
 * Matrix-inspired color palette
 */

export const hackerTheme = {
  // Primary colors - Matrix green & cyberpunk neon
  matrix: {
    green: '#00ff41',      // Bright matrix green
    darkGreen: '#008f11',  // Dark matrix green
    neonGreen: '#39ff14',  // Neon green
    lime: '#ccff00',       // Lime accent
  },
  
  // Cyberpunk neons
  neon: {
    cyan: '#00ffff',       // Electric cyan
    magenta: '#ff00ff',    // Hot magenta
    pink: '#ff1493',       // Deep pink
    purple: '#9d00ff',     // Electric purple
    blue: '#00d4ff',       // Neon blue
    orange: '#ff6600',     // Cyber orange
  },
  
  // Dark backgrounds
  dark: {
    black: '#000000',      // Pure black
    charcoal: '#0a0a0a',   // Charcoal
    darkGray: '#1a1a1a',   // Dark gray
    terminal: '#0c0c0c',   // Terminal black
    void: '#050505',       // Void black
  },
  
  // Status colors
  status: {
    success: '#00ff41',    // Matrix green
    error: '#ff0044',      // Neon red
    warning: '#ffaa00',    // Warning orange
    info: '#00d4ff',       // Info cyan
  },
  
  // Glitch effects
  glitch: {
    red: '#ff0000',
    cyan: '#00ffff',
    offset: 2,             // px offset for glitch
  },
  
  // Terminal/console colors
  terminal: {
    text: '#00ff41',       // Green text
    cursor: '#39ff14',     // Blinking cursor
    background: '#0c0c0c', // Terminal bg
    selection: '#003300',  // Selection highlight
  },
  
  // Shadows and glows
  glow: {
    green: '0 0 10px #00ff41, 0 0 20px #00ff41, 0 0 30px #00ff41',
    cyan: '0 0 10px #00ffff, 0 0 20px #00ffff, 0 0 30px #00ffff',
    magenta: '0 0 10px #ff00ff, 0 0 20px #ff00ff, 0 0 30px #ff00ff',
    red: '0 0 10px #ff0044, 0 0 20px #ff0044, 0 0 30px #ff0044',
  },
  
  // Gradients
  gradients: {
    matrix: 'linear-gradient(135deg, #000000 0%, #0a0a0a 25%, #001a00 50%, #000000 100%)',
    cyber: 'linear-gradient(135deg, #000000 0%, #1a001a 33%, #001a33 66%, #000000 100%)',
    neon: 'linear-gradient(90deg, #00ff41 0%, #00ffff 50%, #ff00ff 100%)',
    terminal: 'linear-gradient(180deg, #0c0c0c 0%, #000000 100%)',
  },
  
  // Scan lines
  scanline: {
    opacity: 0.1,
    color: '#00ff41',
  },
};

export const animations = {
  glitch: {
    duration: '0.3s',
    timing: 'steps(2, end)',
  },
  flicker: {
    duration: '0.15s',
    timing: 'ease-in-out',
  },
  typing: {
    duration: '3s',
    timing: 'steps(40, end)',
  },
  blink: {
    duration: '1s',
    timing: 'step-end',
  },
  scanline: {
    duration: '8s',
    timing: 'linear',
  },
  pulse: {
    duration: '2s',
    timing: 'ease-in-out',
  },
};
