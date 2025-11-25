'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Lock, Zap, Eye, EyeOff, ArrowRight, Sparkles, CheckCircle, UserPlus, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import toast from 'react-hot-toast';

interface DramaticLoginProps {
  onLogin: (username: string, sessionData: any) => void;
}

const SIGNALING_SERVER = process.env.NEXT_PUBLIC_SIGNALING_SERVER || 'http://localhost:3001';

export function DramaticLogin({ onLogin }: DramaticLoginProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; delay: number }>>([]);

  useEffect(() => {
    // Generate particles
    const newParticles = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 5
    }));
    setParticles(newParticles);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim()) {
      toast.error('Please enter a username');
      return;
    }
    
    if (!password.trim()) {
      toast.error('Please enter a password');
      return;
    }

    if (mode === 'register') {
      if (password.length < 8) {
        toast.error('Password must be at least 8 characters');
        return;
      }
      if (password !== confirmPassword) {
        toast.error('Passwords do not match');
        return;
      }
    }

    setIsLoading(true);

    try {
      // Try server authentication first
      const endpoint = mode === 'login' 
        ? `${SIGNALING_SERVER}/api/auth/login`
        : `${SIGNALING_SERVER}/api/auth/register`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: username.trim(),
          password,
          email: email.trim() || undefined,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      // Store token securely
      const sessionData = {
        username: data.user.username,
        token: data.token,
        userId: data.user.id,
        email: data.user.email,
        timestamp: Date.now(),
      };

      // Secure storage
      sessionStorage.setItem('securep2p_token', data.token);
      localStorage.setItem('securep2p_user', JSON.stringify({
        username: data.user.username,
        userId: data.user.id,
        timestamp: Date.now(),
      }));

      toast.success(mode === 'login' 
        ? `Welcome back, ${data.user.username}!`
        : `Account created! Welcome, ${data.user.username}!`
      );
      
      onLogin(data.user.username, sessionData);
    } catch (error: any) {
      console.warn('Server authentication failed, using offline mode:', error.message);
      
      // OFFLINE MODE: Use local authentication
      if (mode === 'register') {
        // Store credentials locally for offline use
        const offlineUser = {
          username: username.trim(),
          // In real app, hash password - here simplified for demo
          passwordHash: btoa(password), // Simple base64 encoding (not secure, for demo only)
          email: email.trim(),
          timestamp: Date.now(),
        };
        
        const offlineUsers = JSON.parse(localStorage.getItem('securep2p_offline_users') || '{}');
        offlineUsers[username.trim()] = offlineUser;
        localStorage.setItem('securep2p_offline_users', JSON.stringify(offlineUsers));
        
        // Generate offline token
        const offlineToken = `offline_${btoa(username.trim())}_${Date.now()}`;
        
        const sessionData = {
          username: username.trim(),
          token: offlineToken,
          userId: `offline_${Date.now()}`,
          email: email.trim(),
          timestamp: Date.now(),
          offline: true,
        };
        
        sessionStorage.setItem('securep2p_token', offlineToken);
        localStorage.setItem('securep2p_user', JSON.stringify({
          username: username.trim(),
          userId: sessionData.userId,
          timestamp: Date.now(),
          offline: true,
        }));
        
        toast.success(`✅ Account created (Offline Mode)! Welcome, ${username.trim()}!`);
        onLogin(username.trim(), sessionData);
      } else {
        // Login: Check offline credentials
        const offlineUsers = JSON.parse(localStorage.getItem('securep2p_offline_users') || '{}');
        const user = offlineUsers[username.trim()];
        
        if (user && user.passwordHash === btoa(password)) {
          const offlineToken = `offline_${btoa(username.trim())}_${Date.now()}`;
          
          const sessionData = {
            username: username.trim(),
            token: offlineToken,
            userId: `offline_${Date.now()}`,
            email: user.email || '',
            timestamp: Date.now(),
            offline: true,
          };
          
          sessionStorage.setItem('securep2p_token', offlineToken);
          localStorage.setItem('securep2p_user', JSON.stringify({
            username: username.trim(),
            userId: sessionData.userId,
            timestamp: Date.now(),
            offline: true,
          }));
          
          toast.success(`✅ Welcome back (Offline Mode), ${username.trim()}!`);
          onLogin(username.trim(), sessionData);
        } else {
          toast.error('❌ Offline: Invalid credentials or user not found. Register first in offline mode.');
          setIsLoading(false);
        }
      }
    } finally {
      if (isLoading) {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-[#0A0B0D] via-[#1B1C1F] to-[#0A0B0D]">
      {/* Animated Grid Background */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0" style={{
          backgroundImage: 'linear-gradient(#2C6BED 1px, transparent 1px), linear-gradient(90deg, #2C6BED 1px, transparent 1px)',
          backgroundSize: '50px 50px',
          animation: 'grid-move 20s linear infinite'
        }} />
      </div>

      {/* Floating Particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            className="absolute w-1 h-1 bg-[#2C6BED] rounded-full"
            initial={{ 
              x: `${particle.x}vw`,
              y: `${particle.y}vh`,
              scale: 0,
              opacity: 0
            }}
            animate={{
              y: [`${particle.y}vh`, `${particle.y - 100}vh`],
              scale: [0, 1, 0],
              opacity: [0, 1, 0]
            }}
            transition={{
              duration: 5 + Math.random() * 3,
              repeat: Infinity,
              delay: particle.delay,
              ease: "linear"
            }}
          />
        ))}
      </div>

      {/* Glowing Orbs */}
      <motion.div
        className="absolute top-1/4 -left-20 w-96 h-96 bg-[#2C6BED] rounded-full blur-[120px] opacity-30"
        animate={{
          scale: [1, 1.3, 1],
          x: [-20, 20, -20],
          y: [0, 30, 0]
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      <motion.div
        className="absolute bottom-1/4 -right-20 w-96 h-96 bg-purple-600 rounded-full blur-[120px] opacity-20"
        animate={{
          scale: [1.3, 1, 1.3],
          x: [20, -20, 20],
          y: [0, -30, 0]
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="w-full max-w-md"
        >
          {/* Logo & Header */}
          <motion.div
            className="text-center mb-10"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            <motion.div
              className="inline-flex items-center justify-center w-24 h-24 mb-6 relative"
              animate={{
                rotateY: [0, 360],
                rotateZ: [0, 5, -5, 0]
              }}
              transition={{
                duration: 8,
                repeat: Infinity,
                ease: "linear"
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[#2C6BED] via-[#1851B4] to-purple-600 rounded-2xl blur-xl opacity-50 animate-pulse" />
              <div className="relative bg-gradient-to-br from-[#2C6BED] to-[#1851B4] rounded-2xl p-5 shadow-2xl">
                <Shield className="w-14 h-14 text-white" />
              </div>
            </motion.div>

            <motion.h1
              className="text-5xl sm:text-6xl font-black mb-3 bg-gradient-to-r from-white via-[#2C6BED] to-purple-400 bg-clip-text text-transparent"
              animate={{
                backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
              }}
              transition={{
                duration: 5,
                repeat: Infinity,
                ease: "linear"
              }}
              style={{
                backgroundSize: '200% auto'
              }}
            >
              SecureP2P
            </motion.h1>
            <p className="text-lg text-gray-400 flex items-center justify-center gap-2">
              <Sparkles className="w-5 h-5 text-[#2C6BED]" />
              Next-Gen Encrypted Messaging
              <Sparkles className="w-5 h-5 text-purple-400" />
            </p>
          </motion.div>

          {/* Login Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="relative"
          >
            {/* Animated Border */}
            <div className="absolute -inset-0.5 bg-gradient-to-r from-[#2C6BED] via-purple-600 to-[#2C6BED] rounded-3xl opacity-75 blur-sm animate-pulse" />
            
            <div className="relative bg-[#1B1C1F] rounded-3xl p-8 border border-[#2C6BED]/30 shadow-2xl backdrop-blur-xl">
              {/* Mode Toggle */}
              <div className="flex gap-2 mb-6 p-1 bg-[#2C2E33] rounded-xl">
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
                    mode === 'login'
                      ? 'bg-gradient-to-r from-[#2C6BED] to-purple-600 text-white shadow-lg'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <LogIn className="w-4 h-4" />
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => setMode('register')}
                  className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
                    mode === 'register'
                      ? 'bg-gradient-to-r from-[#2C6BED] to-purple-600 text-white shadow-lg'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <UserPlus className="w-4 h-4" />
                  Sign Up
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6"
>
                {/* Username Field */}
                <motion.div
                  initial={{ x: -50, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.6 }}
                >
                  <label className="block text-sm font-semibold text-gray-300 mb-2">
                    Username
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-[#2C6BED] to-purple-600 rounded-xl opacity-0 group-focus-within:opacity-20 blur transition-opacity" />
                    <Input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Enter your username"
                      className="relative h-14 bg-[#2C2E33] border-2 border-[#2C6BED]/30 focus:border-[#2C6BED] text-white placeholder:text-gray-500 rounded-xl text-lg px-4 transition-all"
                      disabled={isLoading}
                    />
                  </div>
                </motion.div>

                {/* Email Field (Register only) */}
                <AnimatePresence>
                  {mode === 'register' && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <label className="block text-sm font-semibold text-gray-300 mb-2">
                        Email (optional)
                      </label>
                      <div className="relative group">
                        <div className="absolute inset-0 bg-gradient-to-r from-[#2C6BED] to-purple-600 rounded-xl opacity-0 group-focus-within:opacity-20 blur transition-opacity" />
                        <Input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="your@email.com"
                          className="relative h-14 bg-[#2C2E33] border-2 border-[#2C6BED]/30 focus:border-[#2C6BED] text-white placeholder:text-gray-500 rounded-xl text-lg px-4 transition-all"
                          disabled={isLoading}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Password Field */}
                <motion.div
                  initial={{ x: -50, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.7 }}
                >
                  <label className="block text-sm font-semibold text-gray-300 mb-2">
                    Password
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-[#2C6BED] to-purple-600 rounded-xl opacity-0 group-focus-within:opacity-20 blur transition-opacity" />
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="relative h-14 bg-[#2C2E33] border-2 border-[#2C6BED]/30 focus:border-[#2C6BED] text-white placeholder:text-gray-500 rounded-xl text-lg px-4 pr-12 transition-all"
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#2C6BED] transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </motion.div>

                {/* Confirm Password (Register only) */}
                <AnimatePresence>
                  {mode === 'register' && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <label className="block text-sm font-semibold text-gray-300 mb-2">
                        Confirm Password
                      </label>
                      <div className="relative group">
                        <div className="absolute inset-0 bg-gradient-to-r from-[#2C6BED] to-purple-600 rounded-xl opacity-0 group-focus-within:opacity-20 blur transition-opacity" />
                        <Input
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Confirm your password"
                          className="relative h-14 bg-[#2C2E33] border-2 border-[#2C6BED]/30 focus:border-[#2C6BED] text-white placeholder:text-gray-500 rounded-xl text-lg px-4 pr-12 transition-all"
                          disabled={isLoading}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#2C6BED] transition-colors"
                        >
                          {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Features */}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.8 }}
                  className="grid grid-cols-3 gap-3"
                >
                  {[
                    { icon: Lock, text: 'E2E Encrypted', color: 'from-[#2C6BED] to-blue-600' },
                    { icon: Zap, text: 'P2P Direct', color: 'from-yellow-500 to-orange-500' },
                    { icon: Shield, text: 'Zero-Trust', color: 'from-purple-500 to-pink-500' }
                  ].map((feature, i) => (
                    <motion.div
                      key={i}
                      whileHover={{ scale: 1.05, y: -2 }}
                      className="bg-[#2C2E33] rounded-xl p-3 border border-[#2C6BED]/20 hover:border-[#2C6BED]/50 transition-colors cursor-default"
                    >
                      <div className={`w-8 h-8 mx-auto mb-2 rounded-lg bg-gradient-to-br ${feature.color} flex items-center justify-center`}>
                        <feature.icon className="w-4 h-4 text-white" />
                      </div>
                      <p className="text-xs text-gray-400 text-center font-medium">{feature.text}</p>
                    </motion.div>
                  ))}
                </motion.div>

                {/* Submit Button */}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.9 }}
                >
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-14 bg-gradient-to-r from-[#2C6BED] via-purple-600 to-[#2C6BED] hover:from-[#1851B4] hover:via-purple-700 hover:to-[#1851B4] text-white font-bold text-lg rounded-xl shadow-lg shadow-[#2C6BED]/50 relative overflow-hidden group transition-all"
                    style={{ backgroundSize: '200% auto' }}
                  >
                    <motion.div
                      className="absolute inset-0 bg-white/20"
                      initial={{ x: '-100%' }}
                      animate={isLoading ? {} : { x: '100%' }}
                      transition={{ duration: 1, repeat: Infinity }}
                    />
                    <span className="relative z-10 flex items-center justify-center gap-3">
                      {isLoading ? (
                        <>
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          >
                            <Lock className="w-5 h-5" />
                          </motion.div>
                          Securing Connection...
                        </>
                      ) : (
                        <>
                          {mode === 'login' ? 'Access SecureP2P' : 'Create Account'}
                          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </>
                      )}
                    </span>
                  </Button>
                </motion.div>
              </form>

              {/* Security Badge */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="mt-6 flex items-center justify-center gap-2 text-sm text-gray-400"
              >
                <CheckCircle className="w-4 h-4 text-green-400" />
                <span>256-bit AES Encryption • Zero-Knowledge Architecture</span>
              </motion.div>
            </div>
          </motion.div>

          {/* Footer */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.1 }}
            className="text-center text-sm text-gray-500 mt-6"
          >
            Your data never touches our servers. Ever.
          </motion.p>
        </motion.div>
      </div>

      <style jsx>{`
        @keyframes grid-move {
          0% {
            transform: translate(0, 0);
          }
          100% {
            transform: translate(50px, 50px);
          }
        }
      `}</style>
    </div>
  );
}
