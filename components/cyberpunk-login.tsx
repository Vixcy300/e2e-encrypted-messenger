'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';
import { 
  Terminal, Lock, Unlock, Eye, EyeOff, Zap, Code, Shield,
  Cpu, Binary, Fingerprint, Wifi, Radio, Activity, TrendingUp,
  Chrome, Github, Key, AlertTriangle, CheckCircle, XCircle,
  Loader2, Sparkles, Layers, Box, Database
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/toast';
import { hackerTheme } from '@/lib/hacker-theme';

interface CyberpunkLoginProps {
  onLogin: (username: string, sessionData: any) => void;
}

export function CyberpunkLogin({ onLogin }: CyberpunkLoginProps) {
  const [mode, setMode] = useState<'terminal' | 'visual'>('terminal');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [terminalText, setTerminalText] = useState('');
  const [glitchActive, setGlitchActive] = useState(false);
  const [accessGranted, setAccessGranted] = useState(false);
  const [systemStats, setSystemStats] = useState({
    cpu: 0,
    memory: 0,
    network: 0,
    encryption: 256,
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const matrixRef = useRef<HTMLCanvasElement>(null);
  const scanlineRef = useRef<HTMLDivElement>(null);
  const terminalInputRef = useRef<HTMLInputElement>(null);

  // Matrix rain effect
  useEffect(() => {
    const canvas = matrixRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const chars = '01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン';
    const fontSize = 14;
    const columns = canvas.width / fontSize;
    const drops: number[] = Array(Math.floor(columns)).fill(1);

    const draw = () => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = hackerTheme.matrix.green;
      ctx.font = `${fontSize}px monospace`;

      for (let i = 0; i < drops.length; i++) {
        const text = chars[Math.floor(Math.random() * chars.length)];
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);

        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }
    };

    const interval = setInterval(draw, 33);
    return () => clearInterval(interval);
  }, []);

  // Terminal typing effect
  useEffect(() => {
    const messages = [
      'INITIALIZING QUANTUM ENCRYPTION...',
      'ESTABLISHING SECURE P2P TUNNEL...',
      'LOADING NEURAL NETWORK PROTOCOLS...',
      'VERIFYING BLOCKCHAIN SIGNATURES...',
      'READY FOR AUTHENTICATION...',
    ];

    let currentMsg = 0;
    let currentChar = 0;

    const typeInterval = setInterval(() => {
      if (currentMsg < messages.length) {
        if (currentChar < messages[currentMsg].length) {
          setTerminalText(prev => prev + messages[currentMsg][currentChar]);
          currentChar++;
        } else {
          setTerminalText(prev => prev + '\n');
          currentMsg++;
          currentChar = 0;
        }
      } else {
        clearInterval(typeInterval);
      }
    }, 50);

    return () => clearInterval(typeInterval);
  }, []);

  // System stats animation
  useEffect(() => {
    const interval = setInterval(() => {
      setSystemStats({
        cpu: Math.floor(Math.random() * 30) + 20,
        memory: Math.floor(Math.random() * 40) + 40,
        network: Math.floor(Math.random() * 50) + 50,
        encryption: 256,
      });
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  // GSAP entrance animations
  useEffect(() => {
    if (!containerRef.current) return;

    const ctx = gsap.context(() => {
      gsap.from('.hacker-logo', {
        scale: 0,
        rotation: 360,
        duration: 1,
        ease: 'back.out(1.7)',
      });

      gsap.from('.stat-box', {
        x: -100,
        opacity: 0,
        stagger: 0.1,
        duration: 0.6,
        ease: 'power3.out',
      });

      gsap.from('.login-form', {
        y: 100,
        opacity: 0,
        duration: 0.8,
        delay: 0.5,
        ease: 'power3.out',
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  // Glitch effect
  const triggerGlitch = () => {
    setGlitchActive(true);
    setTimeout(() => setGlitchActive(false), 300);
  };

  // Scanline animation
  useEffect(() => {
    if (scanlineRef.current) {
      gsap.to(scanlineRef.current, {
        y: '100vh',
        duration: 8,
        repeat: -1,
        ease: 'none',
      });
    }
  }, []);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    triggerGlitch();
    
    // Simulate OAuth flow
    setTerminalText(prev => prev + '\n> INITIATING GOOGLE OAUTH 2.0...\n');
    await new Promise(r => setTimeout(r, 1000));
    
    setTerminalText(prev => prev + '> REDIRECTING TO AUTHENTICATION SERVER...\n');
    await new Promise(r => setTimeout(r, 800));
    
    setTerminalText(prev => prev + '> VERIFYING CREDENTIALS...\n');
    await new Promise(r => setTimeout(r, 1000));
    
    setTerminalText(prev => prev + '> GENERATING QUANTUM SESSION TOKEN...\n');
    await new Promise(r => setTimeout(r, 800));
    
    const googleUser = {
      username: `agent_${Math.random().toString(36).substr(2, 6)}`,
      email: 'user@google.com',
      provider: 'google',
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${Date.now()}`,
      timestamp: Date.now(),
      sessionId: Math.random().toString(36).substring(2),
      securityLevel: 'MAXIMUM',
    };

    setTerminalText(prev => prev + '> ACCESS GRANTED. WELCOME TO THE MATRIX.\n');
    setAccessGranted(true);
    
    await new Promise(r => setTimeout(r, 1000));
    
    localStorage.setItem('securep2p_user', JSON.stringify(googleUser));
    toast.success('🔓 System breach successful! Welcome, Agent.');
    onLogin(googleUser.username, googleUser);
  };

  const handleGithubLogin = async () => {
    setIsLoading(true);
    triggerGlitch();
    
    const githubUser = {
      username: `dev_${Math.random().toString(36).substr(2, 6)}`,
      email: 'dev@github.com',
      provider: 'github',
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${Date.now()}`,
      timestamp: Date.now(),
      sessionId: Math.random().toString(36).substring(2),
      securityLevel: 'HIGH',
    };

    await new Promise(r => setTimeout(r, 2000));
    
    localStorage.setItem('securep2p_user', JSON.stringify(githubUser));
    toast.success('⚡ GitHub authentication successful!');
    onLogin(githubUser.username, githubUser);
  };

  const handleTerminalLogin = async () => {
    if (!username || !password) {
      setTerminalText(prev => prev + '\n> ERROR: CREDENTIALS REQUIRED\n');
      triggerGlitch();
      return;
    }

    setIsLoading(true);
    setTerminalText(prev => prev + `\n> AUTHENTICATING: ${username}\n`);
    await new Promise(r => setTimeout(r, 1000));

    setTerminalText(prev => prev + '> SCANNING BIOMETRIC SIGNATURES...\n');
    await new Promise(r => setTimeout(r, 800));

    setTerminalText(prev => prev + '> DECRYPTING QUANTUM KEYS...\n');
    await new Promise(r => setTimeout(r, 1000));

    setTerminalText(prev => prev + '> ESTABLISHING SECURE TUNNEL...\n');
    await new Promise(r => setTimeout(r, 800));

    const terminalUser = {
      username,
      email: `${username}@secure.net`,
      provider: 'terminal',
      avatar: `https://api.dicebear.com/7.x/pixel-art/svg?seed=${username}`,
      timestamp: Date.now(),
      sessionId: Math.random().toString(36).substring(2),
      securityLevel: 'ULTRA',
    };

    setTerminalText(prev => prev + '> ACCESS GRANTED. WELCOME TO THE NETWORK.\n');
    setAccessGranted(true);

    await new Promise(r => setTimeout(r, 1000));

    localStorage.setItem('securep2p_user', JSON.stringify(terminalUser));
    toast.success('🔐 Neural link established. Welcome to the system.');
    onLogin(terminalUser.username, terminalUser);
  };

  const handleQuickAccess = () => {
    const guestUser = {
      username: `ghost_${Math.random().toString(36).substr(2, 6)}`,
      email: 'anonymous@darknet.onion',
      provider: 'anonymous',
      avatar: `https://api.dicebear.com/7.x/identicon/svg?seed=${Date.now()}`,
      timestamp: Date.now(),
      sessionId: Math.random().toString(36).substring(2),
      securityLevel: 'STEALTH',
    };

    localStorage.setItem('securep2p_user', JSON.stringify(guestUser));
    toast.success('👻 Ghost protocol activated. You are anonymous.');
    onLogin(guestUser.username, guestUser);
  };

  return (
    <div 
      ref={containerRef}
      className="min-h-screen relative overflow-hidden"
      style={{
        background: hackerTheme.gradients.matrix,
      }}
    >
      {/* Matrix rain background */}
      <canvas
        ref={matrixRef}
        className="absolute inset-0 opacity-20"
        style={{ filter: 'blur(1px)' }}
      />

      {/* Scanline effect */}
      <div
        ref={scanlineRef}
        className="absolute inset-x-0 h-px pointer-events-none"
        style={{
          background: hackerTheme.matrix.green,
          opacity: hackerTheme.scanline.opacity,
          boxShadow: hackerTheme.glow.green,
        }}
      />

      {/* Vignette overlay */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(circle, transparent 0%, rgba(0,0,0,0.8) 100%)',
        }}
      />

      {/* Main content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-5xl">
          {/* System stats bar */}
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="mb-8 grid grid-cols-4 gap-4"
          >
            <div className="stat-box bg-black/80 border border-green-500/30 rounded p-3 backdrop-blur-sm"
              style={{ boxShadow: `0 0 15px ${hackerTheme.matrix.darkGreen}` }}
            >
              <div className="flex items-center justify-between">
                <Cpu className="w-5 h-5" style={{ color: hackerTheme.matrix.green }} />
                <span className="text-xs" style={{ color: hackerTheme.matrix.green }}>CPU</span>
              </div>
              <div className="mt-2">
                <div className="h-1 bg-black rounded-full overflow-hidden">
                  <motion.div
                    className="h-full"
                    style={{ background: hackerTheme.matrix.green }}
                    initial={{ width: 0 }}
                    animate={{ width: `${systemStats.cpu}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
                <p className="text-xs mt-1" style={{ color: hackerTheme.matrix.green }}>
                  {systemStats.cpu}%
                </p>
              </div>
            </div>

            <div className="stat-box bg-black/80 border border-cyan-500/30 rounded p-3 backdrop-blur-sm"
              style={{ boxShadow: `0 0 15px ${hackerTheme.neon.cyan}` }}
            >
              <div className="flex items-center justify-between">
                <Database className="w-5 h-5" style={{ color: hackerTheme.neon.cyan }} />
                <span className="text-xs" style={{ color: hackerTheme.neon.cyan }}>MEMORY</span>
              </div>
              <div className="mt-2">
                <div className="h-1 bg-black rounded-full overflow-hidden">
                  <motion.div
                    className="h-full"
                    style={{ background: hackerTheme.neon.cyan }}
                    initial={{ width: 0 }}
                    animate={{ width: `${systemStats.memory}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
                <p className="text-xs mt-1" style={{ color: hackerTheme.neon.cyan }}>
                  {systemStats.memory}%
                </p>
              </div>
            </div>

            <div className="stat-box bg-black/80 border border-magenta-500/30 rounded p-3 backdrop-blur-sm"
              style={{ boxShadow: `0 0 15px ${hackerTheme.neon.magenta}` }}
            >
              <div className="flex items-center justify-between">
                <Radio className="w-5 h-5" style={{ color: hackerTheme.neon.magenta }} />
                <span className="text-xs" style={{ color: hackerTheme.neon.magenta }}>NETWORK</span>
              </div>
              <div className="mt-2">
                <div className="h-1 bg-black rounded-full overflow-hidden">
                  <motion.div
                    className="h-full"
                    style={{ background: hackerTheme.neon.magenta }}
                    initial={{ width: 0 }}
                    animate={{ width: `${systemStats.network}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
                <p className="text-xs mt-1" style={{ color: hackerTheme.neon.magenta }}>
                  {systemStats.network}%
                </p>
              </div>
            </div>

            <div className="stat-box bg-black/80 border border-orange-500/30 rounded p-3 backdrop-blur-sm"
              style={{ boxShadow: `0 0 15px ${hackerTheme.neon.orange}` }}
            >
              <div className="flex items-center justify-between">
                <Shield className="w-5 h-5" style={{ color: hackerTheme.neon.orange }} />
                <span className="text-xs" style={{ color: hackerTheme.neon.orange }}>ENCRYPTION</span>
              </div>
              <div className="mt-2">
                <div className="h-1 bg-black rounded-full overflow-hidden">
                  <div className="h-full w-full" style={{ background: hackerTheme.neon.orange }} />
                </div>
                <p className="text-xs mt-1" style={{ color: hackerTheme.neon.orange }}>
                  {systemStats.encryption}-BIT
                </p>
              </div>
            </div>
          </motion.div>

          {/* Logo and title */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center mb-8"
          >
            <div className="hacker-logo inline-flex items-center justify-center mb-6 relative">
              <div 
                className="absolute inset-0 blur-2xl animate-pulse"
                style={{ background: hackerTheme.matrix.green, opacity: 0.3 }}
              />
              <div className="relative bg-black p-8 rounded-lg border-2"
                style={{
                  borderColor: hackerTheme.matrix.green,
                  boxShadow: hackerTheme.glow.green,
                }}
              >
                <Terminal className="w-20 h-20" style={{ color: hackerTheme.matrix.green }} />
              </div>
            </div>

            <h1 
              className={`text-6xl font-black mb-3 tracking-wider ${glitchActive ? 'glitch' : ''}`}
              style={{
                color: hackerTheme.matrix.green,
                textShadow: hackerTheme.glow.green,
                fontFamily: 'monospace',
              }}
            >
              SECURE<span style={{ color: hackerTheme.neon.cyan }}>P2P</span>
            </h1>
            <p className="text-lg tracking-widest" style={{ color: hackerTheme.matrix.darkGreen }}>
              QUANTUM ENCRYPTED • ZERO KNOWLEDGE • NEURAL NETWORK
            </p>
            <div className="flex items-center justify-center gap-4 mt-4 text-xs">
              <div className="flex items-center gap-1" style={{ color: hackerTheme.matrix.green }}>
                <Activity className="w-4 h-4" />
                <span>ONLINE</span>
              </div>
              <div className="flex items-center gap-1" style={{ color: hackerTheme.neon.cyan }}>
                <Lock className="w-4 h-4" />
                <span>AES-256</span>
              </div>
              <div className="flex items-center gap-1" style={{ color: hackerTheme.neon.magenta }}>
                <Zap className="w-4 h-4" />
                <span>P2P ACTIVE</span>
              </div>
            </div>
          </motion.div>

          {/* Mode switcher */}
          <div className="flex justify-center gap-2 mb-6">
            <Button
              onClick={() => setMode('terminal')}
              className={`${mode === 'terminal' ? 'bg-black/90' : 'bg-black/50'} border`}
              style={{
                borderColor: mode === 'terminal' ? hackerTheme.matrix.green : hackerTheme.dark.darkGray,
                color: mode === 'terminal' ? hackerTheme.matrix.green : hackerTheme.matrix.darkGreen,
              }}
            >
              <Terminal className="w-4 h-4 mr-2" />
              TERMINAL MODE
            </Button>
            <Button
              onClick={() => setMode('visual')}
              className={`${mode === 'visual' ? 'bg-black/90' : 'bg-black/50'} border`}
              style={{
                borderColor: mode === 'visual' ? hackerTheme.neon.cyan : hackerTheme.dark.darkGray,
                color: mode === 'visual' ? hackerTheme.neon.cyan : hackerTheme.matrix.darkGreen,
              }}
            >
              <Layers className="w-4 h-4 mr-2" />
              VISUAL MODE
            </Button>
          </div>

          {/* Login forms */}
          <AnimatePresence mode="wait">
            {mode === 'terminal' ? (
              /* Terminal Mode */
              <motion.div
                key="terminal"
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 50 }}
                className="login-form bg-black/90 border-2 rounded-lg p-6 backdrop-blur-xl"
                style={{
                  borderColor: hackerTheme.matrix.green,
                  boxShadow: `0 0 30px ${hackerTheme.matrix.darkGreen}`,
                }}
              >
                {/* Terminal output */}
                <div 
                  className="bg-black border rounded p-4 mb-4 h-48 overflow-y-auto font-mono text-sm"
                  style={{
                    borderColor: hackerTheme.matrix.darkGreen,
                    color: hackerTheme.matrix.green,
                  }}
                >
                  <pre className="whitespace-pre-wrap">{terminalText}</pre>
                  <span className="inline-block w-2 h-4 ml-1 animate-pulse" style={{ background: hackerTheme.matrix.green }} />
                </div>

                {/* Terminal input */}
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span style={{ color: hackerTheme.matrix.green }}>$</span>
                      <span style={{ color: hackerTheme.matrix.green }}>USERNAME:</span>
                    </div>
                    <Input
                      ref={terminalInputRef}
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="bg-black border font-mono"
                      style={{
                        borderColor: hackerTheme.matrix.darkGreen,
                        color: hackerTheme.matrix.green,
                      }}
                      placeholder="enter_username"
                      disabled={isLoading}
                    />
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span style={{ color: hackerTheme.matrix.green }}>$</span>
                      <span style={{ color: hackerTheme.matrix.green }}>PASSWORD:</span>
                    </div>
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleTerminalLogin()}
                        className="bg-black border font-mono pr-10"
                        style={{
                          borderColor: hackerTheme.matrix.darkGreen,
                          color: hackerTheme.matrix.green,
                        }}
                        placeholder="************"
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2"
                        style={{ color: hackerTheme.matrix.darkGreen }}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <Button
                    onClick={handleTerminalLogin}
                    disabled={isLoading}
                    className="w-full bg-black border-2 hover:bg-green-950/20 transition-all"
                    style={{
                      borderColor: hackerTheme.matrix.green,
                      color: hackerTheme.matrix.green,
                      boxShadow: isLoading ? 'none' : hackerTheme.glow.green,
                    }}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        AUTHENTICATING...
                      </>
                    ) : (
                      <>
                        <Unlock className="w-4 h-4 mr-2" />
                        EXECUTE_LOGIN
                      </>
                    )}
                  </Button>
                </div>
              </motion.div>
            ) : (
              /* Visual Mode */
              <motion.div
                key="visual"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                className="login-form space-y-4"
              >
                {/* Social login buttons */}
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    onClick={handleGoogleLogin}
                    disabled={isLoading}
                    className="h-16 bg-black/90 border-2 hover:bg-cyan-950/30 transition-all"
                    style={{
                      borderColor: hackerTheme.neon.cyan,
                      color: hackerTheme.neon.cyan,
                      boxShadow: `0 0 20px ${hackerTheme.neon.cyan}`,
                    }}
                  >
                    <Chrome className="w-6 h-6 mr-3" />
                    <div className="text-left">
                      <div className="font-bold">GOOGLE</div>
                      <div className="text-xs opacity-70">OAuth 2.0</div>
                    </div>
                  </Button>

                  <Button
                    onClick={handleGithubLogin}
                    disabled={isLoading}
                    className="h-16 bg-black/90 border-2 hover:bg-magenta-950/30 transition-all"
                    style={{
                      borderColor: hackerTheme.neon.magenta,
                      color: hackerTheme.neon.magenta,
                      boxShadow: `0 0 20px ${hackerTheme.neon.magenta}`,
                    }}
                  >
                    <Github className="w-6 h-6 mr-3" />
                    <div className="text-left">
                      <div className="font-bold">GITHUB</div>
                      <div className="text-xs opacity-70">SSH Keys</div>
                    </div>
                  </Button>
                </div>

                {/* Quick access */}
                <Button
                  onClick={handleQuickAccess}
                  disabled={isLoading}
                  className="w-full h-14 bg-black/90 border-2 hover:bg-orange-950/30 transition-all"
                  style={{
                    borderColor: hackerTheme.neon.orange,
                    color: hackerTheme.neon.orange,
                    boxShadow: `0 0 20px ${hackerTheme.neon.orange}`,
                  }}
                >
                  <Fingerprint className="w-6 h-6 mr-3" />
                  <div className="text-left">
                    <div className="font-bold">ANONYMOUS ACCESS</div>
                    <div className="text-xs opacity-70">Ghost Protocol • Tor Network • VPN</div>
                  </div>
                </Button>

                {/* Security notice */}
                <div className="bg-black/70 border rounded-lg p-4"
                  style={{ borderColor: hackerTheme.matrix.darkGreen }}
                >
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 flex-shrink-0" style={{ color: hackerTheme.status.warning }} />
                    <div className="text-xs" style={{ color: hackerTheme.matrix.green }}>
                      <p className="font-bold mb-1">SECURITY NOTICE</p>
                      <p className="opacity-70">All connections are encrypted with AES-256-GCM. No data is stored on central servers. Your privacy is mathematically guaranteed.</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Footer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="mt-8 text-center text-xs space-y-2"
            style={{ color: hackerTheme.matrix.darkGreen }}
          >
            <p className="flex items-center justify-center gap-4">
              <span className="flex items-center gap-1">
                <Shield className="w-3 h-3" />
                QUANTUM RESISTANT
              </span>
              <span className="flex items-center gap-1">
                <Lock className="w-3 h-3" />
                ZERO KNOWLEDGE
              </span>
              <span className="flex items-center gap-1">
                <Zap className="w-3 h-3" />
                NEURAL ENCRYPTED
              </span>
            </p>
            <p className="font-mono">SYSTEM_VERSION: v4.2.0 | BUILD: QUANTUM_CORE | STATUS: OPERATIONAL</p>
          </motion.div>
        </div>
      </div>

      {/* Glitch effect overlay */}
      {glitchActive && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-red-500 opacity-10 animate-pulse" />
          <div className="absolute inset-0 bg-cyan-500 opacity-10 animate-pulse" />
        </div>
      )}

      {/* CSS for additional effects */}
      <style jsx>{`
        @keyframes glitch {
          0%, 100% { transform: translate(0); }
          33% { transform: translate(-2px, 2px); }
          66% { transform: translate(2px, -2px); }
        }
        
        .glitch {
          animation: glitch 0.3s infinite;
        }
      `}</style>
    </div>
  );
}
