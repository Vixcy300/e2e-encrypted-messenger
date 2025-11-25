'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Zap, Shield, Activity, TrendingUp, Wifi, Server, Smartphone, Monitor, Lock } from 'lucide-react';

interface AnimatedStatsProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
}

function AnimatedStat({ label, value, icon: Icon, color }: AnimatedStatsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-dark rounded-lg p-4 border border-white/10"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-blue-300 mb-1">{label}</p>
          <p className={`text-2xl font-bold ${color}`}>{value}</p>
        </div>
        <div className={`p-3 rounded-full bg-gradient-to-br ${color.replace('text-', 'from-')} to-purple-500 opacity-20`}>
          <Icon className={`w-6 h-6 ${color}`} />
        </div>
      </div>
    </motion.div>
  );
}

// Network node component
function NetworkNode({ 
  x, y, type, label, isActive, delay 
}: { 
  x: number; y: number; type: 'server' | 'device' | 'mobile'; label: string; isActive: boolean; delay: number;
}) {
  const icons = {
    server: Server,
    device: Monitor,
    mobile: Smartphone,
  };
  const Icon = icons[type];
  
  return (
    <motion.div
      className="absolute flex flex-col items-center"
      style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)' }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay, type: 'spring', stiffness: 200 }}
    >
      <motion.div 
        className={`relative p-3 rounded-xl ${
          isActive 
            ? 'bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/50' 
            : 'bg-slate-700/80 border border-slate-600'
        }`}
        animate={isActive ? { 
          boxShadow: ['0 0 20px rgba(6,182,212,0.3)', '0 0 40px rgba(6,182,212,0.6)', '0 0 20px rgba(6,182,212,0.3)']
        } : {}}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
        {isActive && (
          <motion.div 
            className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-slate-900"
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        )}
      </motion.div>
      <span className={`mt-1 text-xs font-medium ${isActive ? 'text-cyan-400' : 'text-slate-500'}`}>
        {label}
      </span>
    </motion.div>
  );
}

// Animated connection line
function ConnectionLine({ 
  x1, y1, x2, y2, isActive, delay, encrypted 
}: { 
  x1: number; y1: number; x2: number; y2: number; isActive: boolean; delay: number; encrypted?: boolean;
}) {
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
      <defs>
        <linearGradient id={`gradient-${x1}-${y1}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={isActive ? '#06b6d4' : '#475569'} />
          <stop offset="50%" stopColor={isActive ? '#3b82f6' : '#475569'} />
          <stop offset="100%" stopColor={isActive ? '#8b5cf6' : '#475569'} />
        </linearGradient>
      </defs>
      
      {/* Base line */}
      <motion.line
        x1={`${x1}%`}
        y1={`${y1}%`}
        x2={`${x2}%`}
        y2={`${y2}%`}
        stroke={isActive ? `url(#gradient-${x1}-${y1})` : '#475569'}
        strokeWidth={isActive ? 2 : 1}
        strokeDasharray={isActive ? '0' : '5,5'}
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: isActive ? 0.8 : 0.3 }}
        transition={{ duration: 1, delay }}
      />
      
      {/* Animated data packet */}
      {isActive && (
        <motion.circle
          r="4"
          fill="#06b6d4"
          filter="url(#glow)"
          initial={{ cx: `${x1}%`, cy: `${y1}%` }}
          animate={{ 
            cx: [`${x1}%`, `${x2}%`, `${x1}%`],
            cy: [`${y1}%`, `${y2}%`, `${y1}%`]
          }}
          transition={{ 
            duration: 2,
            repeat: Infinity,
            ease: 'linear',
            delay: delay + Math.random()
          }}
        />
      )}
      
      {/* Encryption indicator */}
      {encrypted && isActive && (
        <motion.g
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: delay + 0.5 }}
        >
          <circle
            cx={`${(x1 + x2) / 2}%`}
            cy={`${(y1 + y2) / 2}%`}
            r="8"
            fill="#1e293b"
            stroke="#22c55e"
            strokeWidth="1"
          />
        </motion.g>
      )}
      
      <defs>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
    </svg>
  );
}

export function InteractiveFeatures() {
  const [stats, setStats] = useState({
    connections: 0,
    encrypted: 0,
    uptime: 0,
    packets: 0,
  });
  const [activeConnections, setActiveConnections] = useState<number[]>([]);

  useEffect(() => {
    // Animate stats on mount
    const timer = setInterval(() => {
      setStats(prev => ({
        connections: Math.min(prev.connections + 1, 42),
        encrypted: Math.min(prev.encrypted + 3, 256),
        uptime: prev.uptime + 1,
        packets: prev.packets + Math.floor(Math.random() * 10),
      }));
    }, 100);

    setTimeout(() => clearInterval(timer), 3000);

    return () => clearInterval(timer);
  }, []);

  // Simulate random active connections
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveConnections(prev => {
        const newActive = [...prev];
        // Randomly toggle connections
        const idx = Math.floor(Math.random() * 4);
        if (newActive.includes(idx)) {
          return newActive.filter(i => i !== idx);
        } else if (newActive.length < 3) {
          return [...newActive, idx];
        }
        return newActive;
      });
    }, 1500);

    // Start with some active connections
    setTimeout(() => setActiveConnections([0, 2]), 500);

    return () => clearInterval(interval);
  }, []);

  const formatUptime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-white mb-4">
        <Sparkles className="w-5 h-5 text-yellow-400" />
        <h3 className="text-lg font-semibold">Live Statistics</h3>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <AnimatedStat
          label="Connections"
          value={stats.connections}
          icon={Activity}
          color="text-blue-400"
        />
        <AnimatedStat
          label="Encryption"
          value={`${stats.encrypted}-bit`}
          icon={Shield}
          color="text-green-400"
        />
        <AnimatedStat
          label="Speed"
          value="1.2ms"
          icon={Zap}
          color="text-yellow-400"
        />
        <AnimatedStat
          label="Uptime"
          value={formatUptime(stats.uptime)}
          icon={TrendingUp}
          color="text-purple-400"
        />
      </div>

      {/* P2P Network Visualization */}
      <div className="relative h-72 overflow-hidden rounded-xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-cyan-500/20">
        {/* Background grid */}
        <div className="absolute inset-0 opacity-10">
          <div className="w-full h-full" style={{
            backgroundImage: `
              linear-gradient(rgba(6,182,212,0.3) 1px, transparent 1px),
              linear-gradient(90deg, rgba(6,182,212,0.3) 1px, transparent 1px)
            `,
            backgroundSize: '25px 25px'
          }} />
        </div>
        
        {/* Connection lines - Proper flow: Server at top, devices below */}
        <ConnectionLine x1={50} y1={22} x2={25} y2={60} isActive={activeConnections.includes(0)} delay={0.2} encrypted />
        <ConnectionLine x1={50} y1={22} x2={75} y2={60} isActive={activeConnections.includes(1)} delay={0.4} encrypted />
        <ConnectionLine x1={50} y1={22} x2={50} y2={82} isActive={activeConnections.includes(2)} delay={0.6} encrypted />
        <ConnectionLine x1={25} y1={60} x2={75} y2={60} isActive={activeConnections.includes(3)} delay={0.8} />
        
        {/* Network nodes - Centered layout */}
        <NetworkNode x={50} y={18} type="server" label="Relay Server" isActive={true} delay={0.1} />
        <NetworkNode x={25} y={60} type="device" label="Device A" isActive={activeConnections.includes(0)} delay={0.3} />
        <NetworkNode x={75} y={60} type="device" label="Device B" isActive={activeConnections.includes(1)} delay={0.5} />
        <NetworkNode x={50} y={85} type="mobile" label="Mobile" isActive={activeConnections.includes(2)} delay={0.7} />
        
        {/* Status indicators */}
        <div className="absolute top-3 left-3 flex items-center gap-2">
          <motion.div 
            className="flex items-center gap-1.5 px-2 py-1 bg-green-500/20 border border-green-500/30 rounded-full"
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            <span className="text-xs text-green-400 font-medium">E2E Active</span>
          </motion.div>
        </div>
        
        <div className="absolute top-3 right-3 flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-1 bg-cyan-500/20 border border-cyan-500/30 rounded-full">
            <Wifi className="w-3 h-3 text-cyan-400" />
            <span className="text-xs text-cyan-400 font-medium">{activeConnections.length + 1} nodes</span>
          </div>
        </div>
        
        {/* Packets counter */}
        <div className="absolute bottom-3 left-3 text-xs text-slate-500">
          <span className="text-cyan-400">{stats.packets}</span> encrypted packets
        </div>
        
        {/* Legend */}
        <div className="absolute bottom-3 right-3 flex items-center gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-1">
            <div className="w-3 h-0.5 bg-gradient-to-r from-cyan-500 to-purple-500 rounded" />
            <span>Active</span>
          </div>
          <div className="flex items-center gap-1">
            <Lock className="w-3 h-3 text-green-500" />
            <span>Encrypted</span>
          </div>
        </div>

        {/* Floating particles - reduced for performance */}
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-cyan-400/40 rounded-full"
            initial={{
              x: Math.random() * 100 + '%',
              y: Math.random() * 100 + '%',
              scale: 0,
            }}
            animate={{
              x: Math.random() * 100 + '%',
              y: Math.random() * 100 + '%',
              scale: [0, 1, 0],
              opacity: [0, 0.6, 0],
            }}
            transition={{
              duration: 5 + Math.random() * 3,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>
    </div>
  );
}
