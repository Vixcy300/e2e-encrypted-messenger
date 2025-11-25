'use client';

import { useState, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { generateRoomCode, validateRoomCode } from '@/lib/utils';
import { CryptoService } from '@/lib/crypto';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { QRCodeGenerator } from '@/components/qr-code';
import { InteractiveFeatures } from '@/components/interactive-features';
import { Shield, Lock, Zap, Globe, ArrowRight, QrCode, Copy, Check, RefreshCw, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

export function WelcomeScreen() {
  const [roomCode, setRoomCode] = useState('');
  const [roomName, setRoomName] = useState('');
  const [generatedRoom, setGeneratedRoom] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [copiedPeerId, setCopiedPeerId] = useState(false);
  const [copiedRoom, setCopiedRoom] = useState(false);
  const { p2pConnection, peerId, socket, setRoomCode: setStoreRoomCode, setRoomName: setStoreRoomName, setRemotePeerId, setSocket, setConnectionState, setRelayEncryptionKey, setIsEncrypted } = useStore();

  const handleCreateRoom = () => {
    const code = generateRoomCode();
    const sessionName = roomName.trim() || `Session-${code}`;
    setGeneratedRoom(code);
    // DON'T set store roomCode yet - wait for peer to join
    setStoreRoomName(sessionName);
    
    // Use existing authenticated socket from store
    if (!socket) {
      toast.error('Not connected to server. Please refresh.');
      return;
    }
    
    console.log('[WelcomeScreen] Creating room with existing socket');
    console.log('[WelcomeScreen] Emitting create-room event:', { roomCode: code, peerId });
    socket.emit('create-room', { roomCode: code, peerId });
    
    socket.on('room-created', ({ roomCode }) => {
      console.log('[WelcomeScreen] Room created successfully:', roomCode);
      toast.success(`Room ${roomCode} created! Waiting for peer...`);
    });
    
    socket.on('peer-joined', async ({ peerId: remotePeerId }) => {
      console.log('[WelcomeScreen] Peer joined! Remote peer ID:', remotePeerId);
      toast.success('Peer joined! Starting chat...');
      setRemotePeerId(remotePeerId);
      
      // Derive E2E encryption key from room code for relay mode
      console.log('[WelcomeScreen] Deriving relay E2E encryption key...');
      const encryptionKey = await CryptoService.deriveKeyFromRoomCode(code, peerId, remotePeerId);
      if (encryptionKey) {
        setRelayEncryptionKey(encryptionKey);
        setIsEncrypted(true);
        console.log('[WelcomeScreen] ✅ Relay E2E encryption enabled');
        toast.success('🔒 End-to-end encryption active');
      } else {
        console.warn('[WelcomeScreen] Failed to derive encryption key');
        toast.error('Warning: Encryption not available');
      }
      
      // Wait a moment to ensure state is updated before navigation
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // NOW set the roomCode to trigger navigation to chat
      setStoreRoomCode(code);
      
      // Try P2P but don't wait for it - relay is primary connection method
      if (p2pConnection) {
        console.log('[WelcomeScreen] Attempting P2P (optional enhancement)...');
        p2pConnection.connect(remotePeerId).catch(() => {
          console.log('[WelcomeScreen] P2P failed, relay mode active');
        });
      }
      // Mark as connected since relay is available
      setConnectionState('connected');
    });
    
    socket.on('room-error', ({ message }) => {
      console.error('[WelcomeScreen] Room error:', message);
      toast.error(message);
    });
  };

  const handleJoinRoom = async () => {
    const code = roomCode.toUpperCase().trim();
    
    if (!validateRoomCode(code)) {
      toast.error('Please enter a valid 6-character room code');
      return;
    }

    setIsConnecting(true);

    try {
      // Use existing authenticated socket from store
      if (!socket) {
        toast.error('Not connected to server. Please refresh.');
        setIsConnecting(false);
        return;
      }
      
      console.log('[WelcomeScreen] Joining room with existing socket');
      console.log('[WelcomeScreen] Emitting join-room event:', { roomCode: code, peerId });
      socket.emit('join-room', { roomCode: code, peerId });
      
      socket.on('room-joined', async ({ roomCode, hostPeerId }) => {
        console.log('[WelcomeScreen] Successfully joined room:', roomCode, 'Host peer:', hostPeerId);
        console.log('[WelcomeScreen] Local peerId:', peerId);
        console.log('[WelcomeScreen] CryptoService available:', typeof CryptoService !== 'undefined');
        const sessionName = roomName.trim() || `Session-${roomCode}`;
        toast.success(`Joined room ${roomCode}! Connected via relay`);
        
        // Derive E2E encryption key from room code for relay mode
        console.log('[WelcomeScreen] About to derive encryption key with:', { roomCode, peerId, hostPeerId });
        console.log('[WelcomeScreen] Deriving relay E2E encryption key...');
        const encryptionKey = await CryptoService.deriveKeyFromRoomCode(roomCode, peerId, hostPeerId);
        console.log('[WelcomeScreen] Encryption key result:', encryptionKey ? 'SUCCESS' : 'NULL');
        
        if (encryptionKey) {
          console.log('[WelcomeScreen] Setting encryption key in store...');
          setRelayEncryptionKey(encryptionKey);
          setIsEncrypted(true);
          console.log('[WelcomeScreen] ✅ Relay E2E encryption enabled');
          toast.success('🔒 End-to-end encryption active');
        } else {
          console.error('[WelcomeScreen] ❌ Failed to derive encryption key - key is null');
          toast.error('Warning: Encryption not available');
        }
        
        // Wait a moment to ensure state is updated before navigation
        await new Promise(resolve => setTimeout(resolve, 100));
        
        setStoreRoomCode(roomCode);
        setStoreRoomName(sessionName);
        setRemotePeerId(hostPeerId);
        console.log('[WelcomeScreen] Set remote peer ID:', hostPeerId);
        
        // Try P2P but don't wait for it (optional enhancement)
        if (p2pConnection) {
          console.log('[WelcomeScreen] Attempting P2P (optional enhancement)...');
          p2pConnection.connect(hostPeerId).catch(() => {
            console.log('[WelcomeScreen] P2P failed, relay mode active');
          });
        }
        
        // Mark as connected since relay is available
        setConnectionState('connected');
        setIsConnecting(false);
      });
      
      socket.on('room-error', ({ message }) => {
        console.error('[WelcomeScreen] Room error:', message);
        toast.error(message);
        setIsConnecting(false);
      });
      
      // Timeout after 10 seconds
      setTimeout(() => {
        if (isConnecting) {
          toast.error('Connection timeout. Please try again.');
          setIsConnecting(false);
        }
      }, 10000);
      
    } catch (error) {
      toast.error('Failed to connect to room');
      setIsConnecting(false);
    }
  };

  const handleCopyPeerId = async () => {
    try {
      await navigator.clipboard.writeText(peerId);
      setCopiedPeerId(true);
      toast.success('Peer ID copied!');
      setTimeout(() => setCopiedPeerId(false), 2000);
    } catch (error) {
      toast.error('Failed to copy');
    }
  };

  const handleCopyRoomCode = async () => {
    try {
      await navigator.clipboard.writeText(generatedRoom);
      setCopiedRoom(true);
      toast.success('Room code copied!');
      setTimeout(() => setCopiedRoom(false), 2000);
    } catch (error) {
      toast.error('Failed to copy');
    }
  };

  const handleResetRoom = () => {
    setGeneratedRoom('');
    setRoomCode('');
    toast('Ready to create a new room');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 pt-24 relative overflow-hidden">
      {/* Animated background particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-[#2C6BED] rounded-full"
            initial={{ 
              x: Math.random() * window.innerWidth, 
              y: Math.random() * window.innerHeight,
              opacity: 0.3
            }}
            animate={{
              x: Math.random() * window.innerWidth,
              y: Math.random() * window.innerHeight,
              opacity: [0.3, 0.6, 0.3]
            }}
            transition={{
              duration: 10 + Math.random() * 10,
              repeat: Infinity,
              ease: "linear"
            }}
          />
        ))}
      </div>

      {/* Gradient orbs */}
      <motion.div
        className="absolute top-20 left-10 w-72 h-72 bg-[#2C6BED]/20 rounded-full blur-3xl"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3]
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      <motion.div
        className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl"
        animate={{
          scale: [1.2, 1, 1.2],
          opacity: [0.2, 0.4, 0.2]
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      
      <div className="w-full max-w-6xl relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <motion.div 
            className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-[#2C6BED] to-[#1851B4] rounded-2xl mb-6 shadow-lg shadow-[#2C6BED]/50"
            animate={{
              boxShadow: [
                "0 10px 30px rgba(44, 107, 237, 0.3)",
                "0 10px 40px rgba(44, 107, 237, 0.6)",
                "0 10px 30px rgba(44, 107, 237, 0.3)"
              ]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <Shield className="w-10 h-10 text-white" />
          </motion.div>
          <motion.h1 
            className="text-5xl md:text-6xl font-bold text-slate-900 dark:text-white mb-4"
            animate={{
              textShadow: [
                "0 0 20px rgba(44, 107, 237, 0)",
                "0 0 20px rgba(44, 107, 237, 0.3)",
                "0 0 20px rgba(44, 107, 237, 0)"
              ]
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            Secure<span className="text-[#2C6BED]">P2P</span>
          </motion.h1>
          <p className="text-xl text-slate-600 dark:text-slate-400 mb-6">
            End-to-End Encrypted Data Exchange
          </p>
          <div className="inline-flex items-center gap-2 glass-dark px-6 py-3 rounded-xl border border-[#2C6BED]/30">
            <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">Your Peer ID:</p>
            <code className="text-[#2C6BED] dark:text-[#2C6BED] font-mono font-semibold">{peerId.substring(0, 12)}...</code>
            <Button
              onClick={handleCopyPeerId}
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 hover:bg-[#2C6BED]/20"
            >
              {copiedPeerId ? (
                <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
              ) : (
                <Copy className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              )}
            </Button>
          </div>
        </motion.div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid md:grid-cols-4 gap-4 mb-12"
        >
          {[
            { icon: Lock, title: 'E2E Encrypted', desc: 'AES-256-GCM', color: 'from-[#2C6BED] to-[#1851B4]' },
            { icon: Zap, title: 'Direct P2P', desc: 'WebRTC', color: 'from-yellow-500 to-orange-500' },
            { icon: Globe, title: 'No Servers', desc: 'Zero-knowledge', color: 'from-green-500 to-emerald-500' },
            { icon: Shield, title: 'Secure', desc: 'ECDH Key Exchange', color: 'from-purple-500 to-pink-500' },
          ].map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 + i * 0.1 }}
              whileHover={{ 
                scale: 1.05,
                boxShadow: "0 20px 40px rgba(44, 107, 237, 0.3)"
              }}
              className="glass-dark rounded-xl p-6 text-center transition-all cursor-pointer border border-[#2C6BED]/20 hover:border-[#2C6BED]/50"
            >
              <motion.div
                className={`w-12 h-12 mx-auto mb-3 rounded-lg bg-gradient-to-br ${feature.color} flex items-center justify-center`}
                animate={{
                  rotate: [0, 5, -5, 0]
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: i * 0.5
                }}
              >
                <feature.icon className="w-6 h-6 text-white" />
              </motion.div>
              <h3 className="font-semibold text-slate-900 dark:text-white mb-1">{feature.title}</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400">{feature.desc}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Main Action Cards */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Create Room */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="glass-dark h-full shadow-xl">
              <CardHeader>
                <CardTitle className="text-slate-900 dark:text-white flex items-center gap-2">
                  <QrCode className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  Create Room
                </CardTitle>
                <CardDescription className="text-slate-600 dark:text-slate-400">
                  Start a new secure session
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!generatedRoom ? (
                  <>
                    <Input
                      placeholder="Session name (optional)"
                      value={roomName}
                      onChange={(e) => setRoomName(e.target.value)}
                      className="h-12"
                    />
                    <Button
                      onClick={handleCreateRoom}
                      className="w-full h-12 bg-gradient-to-r from-[#2C6BED] to-[#1851B4] hover:from-[#1851B4] hover:to-[#2C6BED] text-white font-semibold shadow-lg shadow-[#2C6BED]/30 relative overflow-hidden group"
                      size="lg"
                    >
                      <motion.div
                        className="absolute inset-0 bg-white/20"
                        initial={{ x: '-100%' }}
                        whileHover={{ x: '100%' }}
                        transition={{ duration: 0.5 }}
                      />
                      <span className="relative z-10 flex items-center justify-center">
                        Generate Room Code
                        <ArrowRight className="w-5 h-5 ml-2" />
                      </span>
                    </Button>
                  </>
                ) : (
                  <div className="space-y-4">
                    <div className="glass rounded-xl p-6 text-center border-2 border-[#2C6BED] shadow-xl shadow-[#2C6BED]/30 relative overflow-hidden">
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                        animate={{
                          x: ['-100%', '100%']
                        }}
                        transition={{
                          duration: 3,
                          repeat: Infinity,
                          ease: "linear"
                        }}
                      />
                      <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">Room Code</p>
                      <motion.p 
                        className="text-4xl font-bold text-[#2C6BED] tracking-widest mb-4 font-mono relative z-10"
                        animate={{
                          scale: [1, 1.05, 1]
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                      >
                        {generatedRoom}
                      </motion.p>
                      <Button
                        onClick={handleCopyRoomCode}
                        variant="outline"
                        size="sm"
                        className="border-[#2C6BED]/30 hover:border-[#2C6BED] hover:bg-[#2C6BED]/10 relative z-10"
                      >
                        {copiedRoom ? (
                          <>
                            <Check className="w-4 h-4 mr-2" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4 mr-2" />
                            Copy Code
                          </>
                        )}
                      </Button>
                    </div>
                    
                    <QRCodeGenerator value={generatedRoom} />
                    
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700"></div>
                      <span className="text-xs text-slate-500 dark:text-slate-400">Share with peer</span>
                      <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700"></div>
                    </div>
                    
                    <Button
                      onClick={handleResetRoom}
                      variant="outline"
                      className="w-full"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Create New Room
                    </Button>
                    
                    <div className="glass bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-[#2C6BED]/30">
                      <div className="flex items-center gap-2">
                        <motion.div 
                          className="w-2 h-2 bg-[#2C6BED] rounded-full"
                          animate={{
                            scale: [1, 1.5, 1],
                            opacity: [1, 0.5, 1]
                          }}
                          transition={{
                            duration: 1.5,
                            repeat: Infinity,
                            ease: "easeInOut"
                          }}
                        />
                        <p className="text-sm text-blue-900 dark:text-blue-100 font-medium">
                          Waiting for peer to join...
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Join Room */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="glass-dark h-full shadow-xl">
              <CardHeader>
                <CardTitle className="text-slate-900 dark:text-white flex items-center gap-2">
                  <Users className="w-6 h-6 text-green-600 dark:text-green-400" />
                  Join Room
                </CardTitle>
                <CardDescription className="text-slate-600 dark:text-slate-400">
                  Connect to an existing session
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <Input
                    placeholder="Session name (optional)"
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    className="h-12"
                    disabled={isConnecting}
                  />
                  <Input
                    placeholder="Enter room code"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                    maxLength={6}
                    className="h-14 text-center text-2xl tracking-widest font-mono font-bold"
                    disabled={isConnecting}
                  />
                    <Button
                      onClick={handleJoinRoom}
                      disabled={roomCode.length !== 6 || isConnecting}
                      className="w-full h-12 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold shadow-lg shadow-green-500/30 relative overflow-hidden group"
                      size="lg"
                    >
                      <motion.div
                        className="absolute inset-0 bg-white/20"
                        initial={{ x: '-100%' }}
                        whileHover={{ x: '100%' }}
                        transition={{ duration: 0.5 }}
                      />
                      {isConnecting ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                          Connecting...
                        </>
                      ) : (
                        <>
                          Connect Securely
                          <Lock className="w-5 h-5 ml-2" />
                        </>
                      )}
                    </Button>
                </div>
                <div className="glass bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
                  <p className="text-sm text-green-900 dark:text-green-100 text-center">
                    Enter the 6-digit code from your peer
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Interactive Features */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-12"
        >
          <InteractiveFeatures />
        </motion.div>

        {/* Security Info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="mt-8 text-center text-sm text-slate-600 dark:text-slate-400"
        >
          <p className="flex items-center justify-center gap-2">
            <Shield className="w-4 h-4 text-green-600 dark:text-green-400" />
            <span>Encrypted E2E • No Server Storage • Open Source</span>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
