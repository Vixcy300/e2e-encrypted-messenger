'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';
import zxcvbn from 'zxcvbn';
import validator from 'validator';
import { 
  Shield, User, Mail, Lock, Eye, EyeOff, LogIn, UserPlus, 
  CheckCircle2, XCircle, AlertCircle, Fingerprint, 
  ShieldCheck, Zap, Sparkles, Key, ArrowRight, Loader2,
  Github, Chrome, Apple, Smartphone, Scan, Waves
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { toast } from '@/components/ui/toast';

interface AdvancedLoginProps {
  onLogin: (username: string, sessionData: any) => void;
}

interface ValidationError {
  field: string;
  message: string;
  type: 'error' | 'warning' | 'success';
}

interface PasswordStrength {
  score: number;
  feedback: string[];
  color: string;
  label: string;
}

export function AdvancedLogin({ onLogin }: AdvancedLoginProps) {
  const [mode, setMode] = useState<'login' | 'register' | '2fa'>('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState(['', '', '', '', '', '']);
  const [rememberMe, setRememberMe] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockTimer, setLockTimer] = useState(0);

  // Refs for GSAP animations
  const containerRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const twoFactorRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Initialize GSAP animations
  useEffect(() => {
    if (!containerRef.current) return;

    const ctx = gsap.context(() => {
      // Logo entrance animation
      gsap.from(logoRef.current, {
        scale: 0,
        rotation: -180,
        duration: 1.2,
        ease: 'elastic.out(1, 0.5)',
      });

      // Floating animation for logo
      gsap.to(logoRef.current, {
        y: -10,
        duration: 2,
        repeat: -1,
        yoyo: true,
        ease: 'power1.inOut',
      });

      // Particles animation
      if (particlesRef.current) {
        const particles = particlesRef.current.children;
        gsap.to(particles, {
          y: 'random(-20, 20)',
          x: 'random(-20, 20)',
          duration: 'random(2, 4)',
          repeat: -1,
          yoyo: true,
          ease: 'none',
          stagger: {
            amount: 2,
            from: 'random',
          },
        });
      }

      // Form entrance
      gsap.from(formRef.current, {
        y: 50,
        opacity: 0,
        duration: 0.8,
        delay: 0.3,
        ease: 'power3.out',
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  // Mode switch animation
  useEffect(() => {
    if (formRef.current) {
      gsap.from(formRef.current, {
        x: mode === 'register' ? 100 : -100,
        opacity: 0,
        duration: 0.5,
        ease: 'power2.out',
      });
    }
  }, [mode]);

  // Check for biometric support
  useEffect(() => {
    checkBiometricSupport();
    checkExistingSession();
  }, []);

  // Account lockout timer
  useEffect(() => {
    if (isLocked && lockTimer > 0) {
      const timer = setTimeout(() => {
        setLockTimer(lockTimer - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (lockTimer === 0 && isLocked) {
      setIsLocked(false);
      setLoginAttempts(0);
      toast.success('Account unlocked. You may try again.');
    }
  }, [isLocked, lockTimer]);

  const checkBiometricSupport = async () => {
    if (typeof window !== 'undefined' && 'PublicKeyCredential' in window) {
      try {
        const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        setBiometricAvailable(available);
      } catch (error) {
        setBiometricAvailable(false);
      }
    }
  };

  const checkExistingSession = () => {
    const savedSession = localStorage.getItem('securep2p_session');
    if (savedSession) {
      const session = JSON.parse(savedSession);
      if (session.rememberMe && Date.now() - session.timestamp < 7 * 24 * 60 * 60 * 1000) {
        // Auto-login if session is less than 7 days old
        toast.success('Welcome back!');
        onLogin(session.username, session);
      }
    }
  };

  const validateUsername = (value: string): ValidationError | null => {
    if (!value) return { field: 'username', message: 'Username is required', type: 'error' };
    if (value.length < 3) return { field: 'username', message: 'Username must be at least 3 characters', type: 'error' };
    if (value.length > 20) return { field: 'username', message: 'Username must be less than 20 characters', type: 'error' };
    if (!/^[a-zA-Z0-9_-]+$/.test(value)) return { field: 'username', message: 'Username can only contain letters, numbers, _ and -', type: 'error' };
    return null;
  };

  const validateEmail = (value: string): ValidationError | null => {
    if (!value && mode === 'register') return { field: 'email', message: 'Email is required', type: 'error' };
    if (value && !validator.isEmail(value)) return { field: 'email', message: 'Invalid email format', type: 'error' };
    if (value && validator.isEmail(value, { require_tld: false })) {
      return { field: 'email', message: 'Please use a valid domain', type: 'warning' };
    }
    return null;
  };

  const validatePassword = (value: string): ValidationError | null => {
    if (!value) return { field: 'password', message: 'Password is required', type: 'error' };
    if (value.length < 8) return { field: 'password', message: 'Password must be at least 8 characters', type: 'error' };
    if (!/[A-Z]/.test(value)) return { field: 'password', message: 'Password must contain an uppercase letter', type: 'warning' };
    if (!/[a-z]/.test(value)) return { field: 'password', message: 'Password must contain a lowercase letter', type: 'warning' };
    if (!/[0-9]/.test(value)) return { field: 'password', message: 'Password must contain a number', type: 'warning' };
    if (!/[^A-Za-z0-9]/.test(value)) return { field: 'password', message: 'Password should contain a special character', type: 'warning' };
    return null;
  };

  const checkPasswordStrength = (value: string) => {
    if (!value) {
      setPasswordStrength(null);
      return;
    }

    const result = zxcvbn(value);
    const strengthData: PasswordStrength = {
      score: result.score,
      feedback: result.feedback.suggestions,
      color: ['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e'][result.score],
      label: ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'][result.score],
    };
    setPasswordStrength(strengthData);
  };

  const handleInputChange = (field: string, value: string) => {
    const errors: ValidationError[] = [];

    switch (field) {
      case 'username':
        setUsername(value);
        const usernameError = validateUsername(value);
        if (usernameError) errors.push(usernameError);
        break;
      case 'email':
        setEmail(value);
        const emailError = validateEmail(value);
        if (emailError) errors.push(emailError);
        break;
      case 'password':
        setPassword(value);
        checkPasswordStrength(value);
        const passwordError = validatePassword(value);
        if (passwordError) errors.push(passwordError);
        break;
      case 'confirmPassword':
        setConfirmPassword(value);
        if (value && value !== password) {
          errors.push({ field: 'confirmPassword', message: 'Passwords do not match', type: 'error' });
        }
        break;
    }

    setValidationErrors(errors);
  };

  const handle2FAInput = (index: number, value: string) => {
    if (value.length <= 1 && /^\d*$/.test(value)) {
      const newCode = [...twoFactorCode];
      newCode[index] = value;
      setTwoFactorCode(newCode);

      // Auto-focus next input
      if (value && index < 5) {
        twoFactorRefs.current[index + 1]?.focus();
      }

      // Auto-verify when all filled
      if (newCode.every(digit => digit !== '') && newCode.join('').length === 6) {
        verify2FA(newCode.join(''));
      }
    }
  };

  const handle2FAKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !twoFactorCode[index] && index > 0) {
      twoFactorRefs.current[index - 1]?.focus();
    }
  };

  const verify2FA = async (code: string) => {
    setIsLoading(true);
    
    // Simulate 2FA verification
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    if (code === '123456' || code.length === 6) {
      completeLogin();
    } else {
      toast.error('Invalid 2FA code. Please try again.');
      setTwoFactorCode(['', '', '', '', '', '']);
      twoFactorRefs.current[0]?.focus();
    }
    
    setIsLoading(false);
  };

  const handleBiometricLogin = async () => {
    setIsLoading(true);
    toast('Authenticating with biometrics...');

    try {
      // Simulate biometric authentication
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const savedUser = localStorage.getItem('securep2p_biometric_user');
      if (savedUser) {
        const userData = JSON.parse(savedUser);
        toast.success('✓ Biometric authentication successful!');
        onLogin(userData.username, userData);
      } else {
        toast.error('No biometric data found. Please login normally first.');
      }
    } catch (error) {
      toast.error('Biometric authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = async (provider: string) => {
    setIsLoading(true);
    toast(`Authenticating with ${provider}...`);

    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const username = `${provider.toLowerCase()}_user_${Math.random().toString(36).substr(2, 6)}`;
    const sessionData = {
      username,
      provider,
      timestamp: Date.now(),
      authMethod: 'social',
    };

    localStorage.setItem('securep2p_user', JSON.stringify(sessionData));
    toast.success(`✓ Signed in with ${provider}!`);
    onLogin(username, sessionData);
    setIsLoading(false);
  };

  const completeLogin = () => {
    const sessionData = {
      username,
      email,
      timestamp: Date.now(),
      rememberMe,
      authMethod: '2fa',
      sessionId: Math.random().toString(36).substring(2),
    };

    if (rememberMe) {
      localStorage.setItem('securep2p_session', JSON.stringify(sessionData));
    }
    
    localStorage.setItem('securep2p_user', JSON.stringify(sessionData));
    
    if (biometricAvailable) {
      localStorage.setItem('securep2p_biometric_user', JSON.stringify(sessionData));
    }

    toast.success(`✓ Welcome, ${username}!`);
    onLogin(username, sessionData);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isLocked) {
      toast.error(`Account locked. Try again in ${lockTimer} seconds.`);
      return;
    }

    // Validate all fields
    const errors: ValidationError[] = [];
    const usernameError = validateUsername(username);
    if (usernameError) errors.push(usernameError);

    if (mode === 'register') {
      const emailError = validateEmail(email);
      if (emailError) errors.push(emailError);
      
      if (password !== confirmPassword) {
        errors.push({ field: 'confirmPassword', message: 'Passwords do not match', type: 'error' });
      }
    }

    const passwordError = validatePassword(password);
    if (passwordError) errors.push(passwordError);

    setValidationErrors(errors);

    if (errors.some(e => e.type === 'error')) {
      toast.error('Please fix the errors before continuing');
      
      // Shake animation for errors
      if (formRef.current) {
        gsap.to(formRef.current, {
          x: [-10, 10, -10, 10, 0],
          duration: 0.5,
          ease: 'power2.inOut',
        });
      }
      return;
    }

    setIsLoading(true);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Check for existing user (mock)
    const existingUsers = JSON.parse(localStorage.getItem('securep2p_users') || '{}');
    
    if (mode === 'login') {
      if (existingUsers[username] && existingUsers[username].password === password) {
        // Success - move to 2FA
        setMode('2fa');
        toast.success('Credentials verified! Enter 2FA code.');
      } else {
        // Failed login
        const newAttempts = loginAttempts + 1;
        setLoginAttempts(newAttempts);
        
        if (newAttempts >= 3) {
          setIsLocked(true);
          setLockTimer(30);
          toast.error('Too many failed attempts. Account locked for 30 seconds.');
        } else {
          toast.error(`Invalid credentials. ${3 - newAttempts} attempts remaining.`);
        }
      }
    } else {
      // Register new user
      if (existingUsers[username]) {
        toast.error('Username already exists');
      } else {
        existingUsers[username] = {
          username,
          email,
          password, // In production, use bcrypt!
          created: Date.now(),
        };
        localStorage.setItem('securep2p_users', JSON.stringify(existingUsers));
        setMode('2fa');
        toast.success('Account created! Set up 2FA.');
      }
    }

    setIsLoading(false);
  };

  const getFieldError = (field: string) => {
    return validationErrors.find(e => e.field === field);
  };

  return (
    <div 
      ref={containerRef}
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 25%, #312e81 50%, #4c1d95 75%, #581c87 100%)',
      }}
    >
      {/* Animated background particles */}
      <div ref={particlesRef} className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(30)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: Math.random() * 4 + 2 + 'px',
              height: Math.random() * 4 + 2 + 'px',
              background: ['#818cf8', '#a78bfa', '#c084fc', '#e879f9', '#f472b6'][Math.floor(Math.random() * 5)],
              left: Math.random() * 100 + '%',
              top: Math.random() * 100 + '%',
              opacity: Math.random() * 0.5 + 0.2,
              boxShadow: `0 0 ${Math.random() * 20 + 10}px currentColor`,
            }}
          />
        ))}
      </div>

      {/* Animated waves */}
      <div className="absolute bottom-0 left-0 right-0 opacity-10">
        <Waves className="w-full h-32 text-purple-400" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo and Header */}
        <motion.div
          ref={logoRef}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center mb-8"
        >
          <div className="relative inline-block mb-6">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full blur-2xl opacity-50 animate-pulse" />
            <div className="relative bg-gradient-to-br from-purple-600 via-violet-600 to-pink-600 p-6 rounded-3xl shadow-2xl">
              <Shield className="w-16 h-16 text-white" />
            </div>
          </div>
          
          <h1 className="text-5xl font-black text-white mb-3 tracking-tight">
            Secure<span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">P2P</span>
          </h1>
          <p className="text-purple-200 text-lg font-medium">Military-Grade Encrypted Messaging</p>
          <div className="flex items-center justify-center gap-2 mt-3">
            <ShieldCheck className="w-4 h-4 text-green-400" />
            <span className="text-xs text-purple-300">256-bit AES • Zero-Knowledge • E2E Encryption</span>
          </div>
        </motion.div>

        {/* Main Card */}
        <Card className="bg-slate-900/50 backdrop-blur-xl border-2 border-purple-500/30 shadow-2xl shadow-purple-500/20">
          <div className="p-8">
            <AnimatePresence mode="wait">
              {mode === '2fa' ? (
                /* 2FA Screen */
                <motion.div
                  key="2fa"
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  className="space-y-6"
                >
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 mb-4">
                      <Key className="w-8 h-8 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Two-Factor Authentication</h2>
                    <p className="text-purple-300 text-sm">Enter the 6-digit code from your authenticator app</p>
                  </div>

                  <div className="flex justify-center gap-2">
                    {twoFactorCode.map((digit, index) => (
                      <input
                        key={index}
                        ref={el => twoFactorRefs.current[index] = el}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handle2FAInput(index, e.target.value)}
                        onKeyDown={(e) => handle2FAKeyDown(index, e)}
                        className="w-12 h-14 text-center text-2xl font-bold bg-slate-800/50 border-2 border-purple-500/30 rounded-lg text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 transition-all"
                        disabled={isLoading}
                      />
                    ))}
                  </div>

                  <div className="text-center space-y-3">
                    <button
                      type="button"
                      onClick={() => setMode('login')}
                      className="text-purple-400 hover:text-purple-300 text-sm"
                      disabled={isLoading}
                    >
                      ← Back to login
                    </button>
                    <p className="text-xs text-purple-400">
                      Hint: Use code <code className="bg-purple-900/30 px-2 py-1 rounded">123456</code> for demo
                    </p>
                  </div>

                  {isLoading && (
                    <div className="flex items-center justify-center gap-2 text-purple-400">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Verifying...</span>
                    </div>
                  )}
                </motion.div>
              ) : (
                /* Login/Register Form */
                <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">
                  {/* Mode tabs */}
                  <div className="flex gap-2 p-1 bg-slate-800/50 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setMode('login')}
                      className={`flex-1 py-2.5 px-4 rounded-md font-semibold transition-all ${
                        mode === 'login'
                          ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                          : 'text-purple-300 hover:text-white'
                      }`}
                    >
                      <LogIn className="w-4 h-4 inline mr-2" />
                      Sign In
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode('register')}
                      className={`flex-1 py-2.5 px-4 rounded-md font-semibold transition-all ${
                        mode === 'register'
                          ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                          : 'text-purple-300 hover:text-white'
                      }`}
                    >
                      <UserPlus className="w-4 h-4 inline mr-2" />
                      Sign Up
                    </button>
                  </div>

                  {/* Account locked warning */}
                  {isLocked && (
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="bg-red-500/10 border-2 border-red-500/50 rounded-lg p-4 flex items-start gap-3"
                    >
                      <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-red-400 font-semibold">Account Temporarily Locked</p>
                        <p className="text-red-300 text-sm">Too many failed attempts. Try again in {lockTimer} seconds.</p>
                      </div>
                    </motion.div>
                  )}

                  {/* Username */}
                  <div className="space-y-2">
                    <label className="text-sm text-purple-200 font-semibold flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Username
                    </label>
                    <div className="relative">
                      <Input
                        type="text"
                        placeholder="Enter your username"
                        value={username}
                        onChange={(e) => handleInputChange('username', e.target.value)}
                        className={`bg-slate-800/50 border-2 ${
                          getFieldError('username')?.type === 'error'
                            ? 'border-red-500/50'
                            : username && !getFieldError('username')
                            ? 'border-green-500/50'
                            : 'border-purple-500/30'
                        } text-white placeholder:text-purple-400/50 pr-10 focus:border-purple-500`}
                        disabled={isLoading || isLocked}
                      />
                      {username && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          {getFieldError('username')?.type === 'error' ? (
                            <XCircle className="w-5 h-5 text-red-400" />
                          ) : (
                            <CheckCircle2 className="w-5 h-5 text-green-400" />
                          )}
                        </div>
                      )}
                    </div>
                    {getFieldError('username') && (
                      <motion.p
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`text-xs flex items-center gap-1 ${
                          getFieldError('username')?.type === 'error' ? 'text-red-400' : 'text-yellow-400'
                        }`}
                      >
                        <AlertCircle className="w-3 h-3" />
                        {getFieldError('username')?.message}
                      </motion.p>
                    )}
                  </div>

                  {/* Email (Register only) */}
                  {mode === 'register' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-2"
                    >
                      <label className="text-sm text-purple-200 font-semibold flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        Email Address
                      </label>
                      <div className="relative">
                        <Input
                          type="email"
                          placeholder="your.email@example.com"
                          value={email}
                          onChange={(e) => handleInputChange('email', e.target.value)}
                          className={`bg-slate-800/50 border-2 ${
                            getFieldError('email')?.type === 'error'
                              ? 'border-red-500/50'
                              : email && validator.isEmail(email)
                              ? 'border-green-500/50'
                              : 'border-purple-500/30'
                          } text-white placeholder:text-purple-400/50 pr-10 focus:border-purple-500`}
                          disabled={isLoading}
                        />
                        {email && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            {getFieldError('email')?.type === 'error' ? (
                              <XCircle className="w-5 h-5 text-red-400" />
                            ) : validator.isEmail(email) ? (
                              <CheckCircle2 className="w-5 h-5 text-green-400" />
                            ) : null}
                          </div>
                        )}
                      </div>
                      {getFieldError('email') && (
                        <motion.p
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-xs text-red-400 flex items-center gap-1"
                        >
                          <AlertCircle className="w-3 h-3" />
                          {getFieldError('email')?.message}
                        </motion.p>
                      )}
                    </motion.div>
                  )}

                  {/* Password */}
                  <div className="space-y-2">
                    <label className="text-sm text-purple-200 font-semibold flex items-center gap-2">
                      <Lock className="w-4 h-4" />
                      Password
                    </label>
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => handleInputChange('password', e.target.value)}
                        className="bg-slate-800/50 border-2 border-purple-500/30 text-white placeholder:text-purple-400/50 pr-10 focus:border-purple-500"
                        disabled={isLoading || isLocked}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-400 hover:text-purple-300"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    
                    {/* Password strength indicator */}
                    {mode === 'register' && passwordStrength && password && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="space-y-2"
                      >
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${(passwordStrength.score + 1) * 20}%` }}
                              className="h-full rounded-full transition-all duration-500"
                              style={{ backgroundColor: passwordStrength.color }}
                            />
                          </div>
                          <span className="text-xs font-semibold" style={{ color: passwordStrength.color }}>
                            {passwordStrength.label}
                          </span>
                        </div>
                        {passwordStrength.feedback.length > 0 && (
                          <div className="bg-slate-800/50 rounded-lg p-3 space-y-1">
                            {passwordStrength.feedback.map((tip, i) => (
                              <p key={i} className="text-xs text-purple-300 flex items-start gap-2">
                                <Sparkles className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                {tip}
                              </p>
                            ))}
                          </div>
                        )}
                      </motion.div>
                    )}
                  </div>

                  {/* Confirm Password (Register only) */}
                  {mode === 'register' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-2"
                    >
                      <label className="text-sm text-purple-200 font-semibold flex items-center gap-2">
                        <Lock className="w-4 h-4" />
                        Confirm Password
                      </label>
                      <div className="relative">
                        <Input
                          type={showConfirmPassword ? 'text' : 'password'}
                          placeholder="Re-enter your password"
                          value={confirmPassword}
                          onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                          className={`bg-slate-800/50 border-2 ${
                            getFieldError('confirmPassword')
                              ? 'border-red-500/50'
                              : confirmPassword && confirmPassword === password
                              ? 'border-green-500/50'
                              : 'border-purple-500/30'
                          } text-white placeholder:text-purple-400/50 pr-10 focus:border-purple-500`}
                          disabled={isLoading}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-400 hover:text-purple-300"
                        >
                          {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                      {getFieldError('confirmPassword') && (
                        <motion.p
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-xs text-red-400 flex items-center gap-1"
                        >
                          <AlertCircle className="w-3 h-3" />
                          {getFieldError('confirmPassword')?.message}
                        </motion.p>
                      )}
                    </motion.div>
                  )}

                  {/* Remember Me & Forgot Password */}
                  {mode === 'login' && (
                    <div className="flex items-center justify-between text-sm">
                      <label className="flex items-center gap-2 text-purple-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={rememberMe}
                          onChange={(e) => setRememberMe(e.target.checked)}
                          className="w-4 h-4 rounded border-purple-500/30 bg-slate-800/50 text-purple-600 focus:ring-2 focus:ring-purple-500"
                        />
                        Remember me
                      </label>
                      <button
                        type="button"
                        className="text-purple-400 hover:text-purple-300 font-medium"
                      >
                        Forgot password?
                      </button>
                    </div>
                  )}

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    disabled={isLoading || isLocked}
                    className="w-full h-12 bg-gradient-to-r from-purple-600 via-violet-600 to-pink-600 hover:from-purple-500 hover:via-violet-500 hover:to-pink-500 text-white font-bold text-lg shadow-lg shadow-purple-500/50 transition-all duration-300 hover:scale-[1.02]"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        {mode === 'login' ? 'Sign In Securely' : 'Create Account'}
                        <ArrowRight className="w-5 h-5 ml-2" />
                      </>
                    )}
                  </Button>

                  {/* Divider */}
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-purple-500/30"></div>
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-slate-900/50 px-2 text-purple-400 font-semibold">Or continue with</span>
                    </div>
                  </div>

                  {/* Social & Alternative Login */}
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleSocialLogin('Google')}
                      disabled={isLoading}
                      className="border-purple-500/30 text-purple-300 hover:bg-purple-500/10 hover:text-white hover:border-purple-500/50"
                    >
                      <Chrome className="w-4 h-4 mr-2" />
                      Google
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleSocialLogin('GitHub')}
                      disabled={isLoading}
                      className="border-purple-500/30 text-purple-300 hover:bg-purple-500/10 hover:text-white hover:border-purple-500/50"
                    >
                      <Github className="w-4 h-4 mr-2" />
                      GitHub
                    </Button>
                  </div>

                  {biometricAvailable && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleBiometricLogin}
                      disabled={isLoading}
                      className="w-full border-purple-500/30 text-purple-300 hover:bg-purple-500/10 hover:text-white hover:border-purple-500/50"
                    >
                      <Fingerprint className="w-5 h-5 mr-2" />
                      Sign in with Biometrics
                    </Button>
                  )}
                </form>
              )}
            </AnimatePresence>
          </div>
        </Card>

        {/* Security badges */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-6 flex flex-wrap justify-center gap-4 text-xs text-purple-300"
        >
          <div className="flex items-center gap-1">
            <ShieldCheck className="w-4 h-4 text-green-400" />
            <span>2FA Protected</span>
          </div>
          <div className="flex items-center gap-1">
            <Lock className="w-4 h-4 text-blue-400" />
            <span>256-bit Encryption</span>
          </div>
          <div className="flex items-center gap-1">
            <Zap className="w-4 h-4 text-yellow-400" />
            <span>Zero-Knowledge</span>
          </div>
        </motion.div>

        {/* Footer */}
        <p className="text-center text-purple-400 text-xs mt-6">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}
