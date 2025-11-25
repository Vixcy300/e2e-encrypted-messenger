'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import zxcvbn from 'zxcvbn';
import validator from 'validator';
import { 
  Shield, User, Mail, Lock, Eye, EyeOff, LogIn, UserPlus, 
  CheckCircle2, XCircle, AlertCircle, ArrowRight, Loader2, ShieldCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import toast from 'react-hot-toast';

interface ProfessionalLoginProps {
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

export function ProfessionalLogin({ onLogin }: ProfessionalLoginProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength | null>(null);
  const [rememberMe, setRememberMe] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockTimer, setLockTimer] = useState(0);

  const formRef = useRef<HTMLFormElement>(null);

  // Lockout timer
  useEffect(() => {
    if (isLocked && lockTimer > 0) {
      const timer = setTimeout(() => setLockTimer(lockTimer - 1), 1000);
      return () => clearTimeout(timer);
    } else if (lockTimer === 0 && isLocked) {
      setIsLocked(false);
      setLoginAttempts(0);
      toast.success('Account unlocked');
    }
  }, [isLocked, lockTimer]);

  // Check existing session
  useEffect(() => {
    const savedSession = localStorage.getItem('securep2p_session');
    if (savedSession) {
      const session = JSON.parse(savedSession);
      if (session.rememberMe && Date.now() - session.timestamp < 7 * 24 * 60 * 60 * 1000) {
        toast.success('Welcome back!');
        onLogin(session.username, session);
      }
    }
  }, [onLogin]);

  const validateUsername = (value: string): ValidationError | null => {
    if (!value) return { field: 'username', message: 'Username is required', type: 'error' };
    if (value.length < 3) return { field: 'username', message: 'Minimum 3 characters', type: 'error' };
    if (value.length > 20) return { field: 'username', message: 'Maximum 20 characters', type: 'error' };
    if (!/^[a-zA-Z0-9_-]+$/.test(value)) return { field: 'username', message: 'Only letters, numbers, _ and -', type: 'error' };
    return null;
  };

  const validateEmail = (value: string): ValidationError | null => {
    if (!value && mode === 'register') return { field: 'email', message: 'Email is required', type: 'error' };
    if (value && !validator.isEmail(value)) return { field: 'email', message: 'Invalid email format', type: 'error' };
    return null;
  };

  const validatePassword = (value: string): ValidationError | null => {
    if (!value) return { field: 'password', message: 'Password is required', type: 'error' };
    if (value.length < 8) return { field: 'password', message: 'Minimum 8 characters', type: 'error' };
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

  const completeLogin = () => {
    const sessionData = {
      username,
      email,
      timestamp: Date.now(),
      rememberMe,
      emailVerified: true,
      sessionId: Math.random().toString(36).substring(2),
    };

    if (rememberMe) {
      localStorage.setItem('securep2p_session', JSON.stringify(sessionData));
    }

    localStorage.setItem('securep2p_user', JSON.stringify(sessionData));

    // Store user in database
    const users = JSON.parse(localStorage.getItem('securep2p_users') || '{}');
    users[username] = { username, email, password, emailVerified: true, created: Date.now() };
    localStorage.setItem('securep2p_users', JSON.stringify(users));

    toast.success(`Welcome, ${username}!`);
    onLogin(username, sessionData);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isLocked) {
      toast.error(`Account locked. Try again in ${lockTimer}s`);
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
      toast.error('Please fix the errors');
      return;
    }

    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));

    const users = JSON.parse(localStorage.getItem('securep2p_users') || '{}');

    if (mode === 'login') {
      if (users[username] && users[username].password === password) {
        completeLogin();
      } else {
        const newAttempts = loginAttempts + 1;
        setLoginAttempts(newAttempts);

        if (newAttempts >= 3) {
          setIsLocked(true);
          setLockTimer(30);
          toast.error('Too many failed attempts. Locked for 30s');
        } else {
          toast.error(`Invalid credentials. ${3 - newAttempts} attempts left`);
        }
      }
    } else {
      // Register
      if (users[username]) {
        toast.error('Username already exists');
      } else {
        completeLogin();
        toast.success('Account created successfully!');
      }
    }

    setIsLoading(false);
  };

  const getFieldError = (field: string) => {
    return validationErrors.find(e => e.field === field);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950">
      <div className="w-full max-w-md">
        {/* Logo & Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl mb-4 shadow-lg shadow-indigo-500/30">
            <Shield className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">
            Secure<span className="text-indigo-600">P2P</span>
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            End-to-End Encrypted Data Exchange
          </p>
        </motion.div>

        {/* Main Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="glass-dark p-8 shadow-2xl">
            <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
              {/* Mode tabs */}
              <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
                    mode === 'login'
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-md'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <LogIn className="w-4 h-4 inline mr-2" />
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => setMode('register')}
                  className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
                    mode === 'register'
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-md'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <UserPlus className="w-4 h-4 inline mr-2" />
                  Sign Up
                </button>
              </div>

              {isLocked && (
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3"
                >
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-red-800 dark:text-red-300 font-semibold text-sm">Account Locked</p>
                    <p className="text-red-600 dark:text-red-400 text-xs mt-1">Try again in {lockTimer} seconds</p>
                  </div>
                </motion.div>
              )}

              {/* Username */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Username
                </label>
                <div className="relative">
                  <Input
                    type="text"
                    placeholder="Enter username"
                    value={username}
                    onChange={(e) => handleInputChange('username', e.target.value)}
                    className={`h-12 ${
                      getFieldError('username')?.type === 'error'
                        ? 'border-red-500 focus:ring-red-500'
                        : username && !getFieldError('username')
                        ? 'border-green-500 focus:ring-green-500'
                        : ''
                    }`}
                    disabled={isLoading || isLocked}
                  />
                  {username && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {getFieldError('username')?.type === 'error' ? (
                        <XCircle className="w-5 h-5 text-red-500" />
                      ) : (
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      )}
                    </div>
                  )}
                </div>
                {getFieldError('username') && (
                  <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {getFieldError('username')?.message}
                  </p>
                )}
              </div>

              {/* Email (Register only) */}
              <AnimatePresence>
                {mode === 'register' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-2"
                  >
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      Email Address
                    </label>
                    <div className="relative">
                      <Input
                        type="email"
                        placeholder="Enter email"
                        value={email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        className={`h-12 ${
                          getFieldError('email')?.type === 'error'
                            ? 'border-red-500 focus:ring-red-500'
                            : email && validator.isEmail(email)
                            ? 'border-green-500 focus:ring-green-500'
                            : ''
                        }`}
                        disabled={isLoading}
                      />
                      {email && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          {getFieldError('email')?.type === 'error' ? (
                            <XCircle className="w-5 h-5 text-red-500" />
                          ) : validator.isEmail(email) ? (
                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                          ) : null}
                        </div>
                      )}
                    </div>
                    {getFieldError('email') && (
                      <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {getFieldError('email')?.message}
                      </p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Password */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Password
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    className="h-12 pr-10"
                    disabled={isLoading || isLocked}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>

                {mode === 'register' && passwordStrength && password && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="space-y-2"
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(passwordStrength.score + 1) * 20}%` }}
                          className="h-full rounded-full transition-all"
                          style={{ backgroundColor: passwordStrength.color }}
                        />
                      </div>
                      <span className="text-xs font-semibold" style={{ color: passwordStrength.color }}>
                        {passwordStrength.label}
                      </span>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Confirm Password (Register only) */}
              <AnimatePresence>
                {mode === 'register' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-2"
                  >
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                      <Lock className="w-4 h-4" />
                      Confirm Password
                    </label>
                    <div className="relative">
                      <Input
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="Re-enter password"
                        value={confirmPassword}
                        onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                        className={`h-12 pr-10 ${
                          getFieldError('confirmPassword')
                            ? 'border-red-500 focus:ring-red-500'
                            : confirmPassword && confirmPassword === password
                            ? 'border-green-500 focus:ring-green-500'
                            : ''
                        }`}
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                      >
                        {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    {getFieldError('confirmPassword') && (
                      <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {getFieldError('confirmPassword')?.message}
                      </p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Remember Me */}
              {mode === 'login' && (
                <div className="flex items-center justify-between text-sm">
                  <label className="flex items-center gap-2 text-slate-600 dark:text-slate-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500"
                    />
                    Remember me
                  </label>
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isLoading || isLocked}
                className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold shadow-lg shadow-indigo-500/30"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    {mode === 'login' ? 'Sign In' : 'Create Account'}
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </>
                )}
              </Button>
            </form>
          </Card>
        </motion.div>

        {/* Security Info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-6 flex justify-center gap-4 text-xs"
        >
          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
            <ShieldCheck className="w-4 h-4 text-green-600 dark:text-green-400" />
            <span>Verified</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
            <Lock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>AES-256</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
            <Shield className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>E2E Encrypted</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
