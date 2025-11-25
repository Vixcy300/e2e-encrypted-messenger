'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, User, Lock, Mail, Eye, EyeOff, LogIn, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/toast';

interface LoginScreenProps {
  onLogin: (username: string) => void;
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim()) {
      toast.error('Please enter a username');
      return;
    }
    
    if (!isLogin && !email.trim()) {
      toast.error('Please enter an email');
      return;
    }
    
    if (!password || password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);
    
    // Simulate authentication delay
    setTimeout(() => {
      // Store user info in localStorage
      const userData = {
        username: username.trim(),
        email: email.trim(),
        timestamp: Date.now(),
      };
      
      localStorage.setItem('securep2p_user', JSON.stringify(userData));
      
      toast.success(`Welcome, ${username}!`);
      onLogin(username);
      setIsLoading(false);
    }, 1000);
  };

  const handleGuestLogin = () => {
    const guestName = `Guest_${Math.random().toString(36).substr(2, 6)}`;
    const userData = {
      username: guestName,
      email: '',
      timestamp: Date.now(),
      isGuest: true,
    };
    
    localStorage.setItem('securep2p_user', JSON.stringify(userData));
    toast.success(`Welcome, ${guestName}!`);
    onLogin(guestName);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900">
      <div className="w-full max-w-md">
        {/* Logo and Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-center mb-4">
            <Shield className="w-16 h-16 text-blue-400" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">
            Secure<span className="text-gradient">P2P</span>
          </h1>
          <p className="text-blue-200">End-to-End Encrypted Messaging</p>
        </motion.div>

        {/* Login/Register Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="glass-dark border-white/20">
            <CardHeader>
              <CardTitle className="text-white text-2xl">
                {isLogin ? 'Welcome Back' : 'Create Account'}
              </CardTitle>
              <CardDescription className="text-blue-300">
                {isLogin 
                  ? 'Sign in to start secure conversations' 
                  : 'Join SecureP2P for encrypted messaging'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Username */}
                <div className="space-y-2">
                  <label className="text-sm text-blue-200 font-medium">Username</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-400" />
                    <Input
                      type="text"
                      placeholder="Enter your username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-blue-300"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                {/* Email (Register only) */}
                {!isLogin && (
                  <div className="space-y-2">
                    <label className="text-sm text-blue-200 font-medium">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-400" />
                      <Input
                        type="email"
                        placeholder="Enter your email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-blue-300"
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                )}

                {/* Password */}
                <div className="space-y-2">
                  <label className="text-sm text-blue-200 font-medium">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-400" />
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10 bg-white/10 border-white/20 text-white placeholder:text-blue-300"
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-400 hover:text-blue-300"
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  className="w-full gradient-primary text-white font-semibold"
                  size="lg"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Please wait...</span>
                    </div>
                  ) : (
                    <>
                      {isLogin ? <LogIn className="w-5 h-5 mr-2" /> : <UserPlus className="w-5 h-5 mr-2" />}
                      {isLogin ? 'Sign In' : 'Create Account'}
                    </>
                  )}
                </Button>

                {/* Toggle Login/Register */}
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setIsLogin(!isLogin)}
                    className="text-blue-300 hover:text-blue-200 text-sm"
                    disabled={isLoading}
                  >
                    {isLogin 
                      ? "Don't have an account? Sign up" 
                      : 'Already have an account? Sign in'}
                  </button>
                </div>

                {/* Divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/20"></div>
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-transparent px-2 text-blue-300">Or</span>
                  </div>
                </div>

                {/* Guest Login */}
                <Button
                  type="button"
                  onClick={handleGuestLogin}
                  variant="outline"
                  className="w-full border-white/20 text-white hover:bg-white/10"
                  disabled={isLoading}
                >
                  Continue as Guest
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>

        {/* Security Info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-6 text-center"
        >
          <p className="text-sm text-blue-200">
            🔒 Your data is encrypted end-to-end
          </p>
          <p className="text-xs text-blue-300 mt-1">
            No data is stored on our servers
          </p>
        </motion.div>
      </div>
    </div>
  );
}
