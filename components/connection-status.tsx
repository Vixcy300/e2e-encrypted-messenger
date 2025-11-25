'use client';

import { useStore } from '@/lib/store';
import { Shield, Wifi, WifiOff, Lock, LogOut, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';

interface ConnectionStatusProps {
  username?: string;
  onLogout?: () => void;
}

export function ConnectionStatus({ username, onLogout }: ConnectionStatusProps) {
  const { connectionState, isEncrypted, remotePeerId, roomName } = useStore();

  const statusConfig = {
    disconnected: {
      icon: WifiOff,
      text: 'Disconnected',
      color: 'text-[#B0B3B8]',
      bg: 'bg-[#2C2E33]',
      ring: 'ring-[#2C6BED]/20',
    },
    connecting: {
      icon: Wifi,
      text: 'Connecting...',
      color: 'text-[#2C6BED]',
      bg: 'bg-[#2C6BED]/20',
      ring: 'ring-[#2C6BED]',
    },
    connected: {
      icon: Wifi,
      text: 'Connected',
      color: 'text-[#2C6BED]',
      bg: 'bg-[#2C6BED]/20',
      ring: 'ring-[#2C6BED]',
    },
    error: {
      icon: WifiOff,
      text: 'Error',
      color: 'text-red-400',
      bg: 'bg-red-500/20',
      ring: 'ring-red-500',
    },
  };

  const config = statusConfig[connectionState];
  const Icon = config.icon;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        exit={{ y: -100 }}
        className="fixed top-0 left-0 right-0 z-50"
      >
        <div className="bg-[#1B1C1F] border-b border-[#2C2E33]">
          <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                <motion.div 
                  className={`${config.bg} ${config.ring} ring-1 p-2 sm:p-2.5 rounded-xl shrink-0 relative`}
                  animate={connectionState === 'connected' ? {
                    boxShadow: [
                      "0 0 0 0 rgba(44, 107, 237, 0.4)",
                      "0 0 0 10px rgba(44, 107, 237, 0)",
                      "0 0 0 0 rgba(44, 107, 237, 0)"
                    ]
                  } : {}}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeOut"
                  }}
                >
                  <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${config.color}`} />
                  {connectionState === 'connected' && (
                    <motion.div
                      className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-[#1B1C1F]"
                      animate={{
                        scale: [1, 1.2, 1],
                        opacity: [1, 0.8, 1]
                      }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    />
                  )}
                </motion.div>
                <div className="min-w-0">
                  <p className={`text-xs sm:text-sm font-semibold ${config.color}`}>
                    {config.text}
                  </p>
                  {roomName && (
                    <p className="text-xs text-[#B0B3B8] truncate">
                      Room: {roomName}
                    </p>
                  )}
                  {remotePeerId && !roomName && (
                    <p className="text-xs text-[#B0B3B8] truncate">
                      Peer: {remotePeerId.substring(0, 8)}...
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                {isEncrypted && connectionState === 'connected' && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="hidden sm:flex items-center gap-1.5 sm:gap-2 bg-[#2C6BED] px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg shadow-lg"
                  >
                    <Shield className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                    <Lock className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                    <span className="text-xs font-semibold text-white hidden md:inline">
                      End-to-End Encrypted
                    </span>
                  </motion.div>
                )}

                {username && (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 sm:gap-2 bg-[#2C2E33] border border-[#2C6BED]/30 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg">
                      <User className="w-3 h-3 sm:w-4 sm:h-4 text-[#2C6BED]" />
                      <span className="text-xs sm:text-sm font-medium text-white hidden xs:inline">
                        {username}
                      </span>
                    </div>
                    {onLogout && (
                      <Button
                        onClick={onLogout}
                        variant="outline"
                        size="sm"
                        className="border-red-500/50 bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs sm:text-sm h-7 sm:h-8 px-2 sm:px-3"
                      >
                        <LogOut className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-1" />
                        <span className="hidden sm:inline">Logout</span>
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
