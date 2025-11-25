'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  MessageSquare, Send, File, Users, Bell, Settings, 
  Clock, CheckCircle, Circle, TrendingUp, Activity,
  Plus, Search, Filter, MoreVertical
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useStore } from '@/lib/store';
import toast from 'react-hot-toast';

interface Conversation {
  id: string;
  name: string;
  lastMessage: string;
  timestamp: number;
  unread: number;
  online: boolean;
  lastSeen?: number;
  avatar: string;
}

interface Notification {
  id: string;
  type: 'message' | 'file' | 'system';
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
}

export function Dashboard({ onStartChat, onLogout }: { onStartChat: () => void, onLogout: () => void }) {
  const { peerId, roomCode, messages, files, remotePeerId, connectionState } = useStore();
  
  // Generate conversations from actual message data
  const conversations = messages.length > 0 ? [{
    id: remotePeerId || '1',
    name: roomCode ? `Room ${roomCode}` : 'Active Chat',
    lastMessage: messages[messages.length - 1]?.content || 'No messages yet',
    timestamp: messages[messages.length - 1]?.timestamp || Date.now(),
    unread: messages.filter(m => m.sender === 'remote' && m.status !== 'read').length,
    online: connectionState === 'connected',
    lastSeen: connectionState === 'connected' ? undefined : Date.now() - 1800000,
    avatar: '💬'
  }] : [];

  // Generate notifications from files and messages
  const notifications = [
    ...files.slice(-3).map(file => ({
      id: file.id,
      type: 'file' as const,
      title: file.direction === 'receiving' ? 'File Received' : 'File Sent',
      message: `${file.name} (${(file.size / 1024).toFixed(1)}KB)`,
      timestamp: file.timestamp,
      read: false
    })),
    ...messages.filter(m => m.sender === 'remote').slice(-2).map(msg => ({
      id: msg.id,
      type: 'message' as const,
      title: 'New Message',
      message: msg.content.substring(0, 50) + (msg.content.length > 50 ? '...' : ''),
      timestamp: msg.timestamp,
      read: msg.status === 'read'
    }))
  ].sort((a, b) => b.timestamp - a.timestamp).slice(0, 5);

  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);

  // Scroll animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        type: "spring",
        stiffness: 100
      }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { 
      opacity: 1, 
      scale: 1,
      transition: {
        duration: 0.3
      }
    }
  };

  const formatTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <div className="min-h-screen bg-[#1B1C1F] text-white">
      {/* Top Navigation */}
      <motion.nav 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className="bg-[#2C2E33] border-b border-[#2C6BED]/20 sticky top-0 z-50"
      >
        <div className="container mx-auto px-3 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-[#2C6BED] to-[#1851B4] rounded-xl flex items-center justify-center">
                <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold">SecureChat</h1>
                <p className="text-xs text-[#B0B3B8] hidden sm:block">End-to-end encrypted messenger</p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 hover:bg-[#2C6BED]/20 rounded-lg transition-colors"
              >
                <Bell className="w-5 h-5" />
                {notifications.filter(n => !n.read).length > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                )}
              </button>
              <Button
                onClick={onLogout}
                variant="outline"
                size="sm"
                className="border-[#2C2E33] bg-[#2C2E33] hover:bg-[#2C6BED] text-white text-xs sm:text-sm px-2 sm:px-4"
              >
                <Settings className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Settings</span>
              </Button>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Main Content */}
      <div className="container mx-auto px-3 sm:px-6 py-4 sm:py-8">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6"
        >
          {/* Left Column - Quick Stats */}
          <motion.div variants={itemVariants} className="lg:col-span-3 space-y-4">
            <motion.div
              variants={cardVariants}
              whileHover={{ scale: 1.02 }}
              className="bg-[#2C2E33] rounded-xl p-4 border border-[#2C6BED]/20"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-[#2C6BED]/20 rounded-lg flex items-center justify-center">
                  <Activity className="w-5 h-5 text-[#2C6BED]" />
                </div>
                <div>
                  <p className="text-sm text-[#B0B3B8]">Active Users</p>
                  <p className="text-xl font-bold">{connectionState === 'connected' ? '2' : '1'}</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              variants={cardVariants}
              whileHover={{ scale: 1.02 }}
              className="bg-[#2C2E33] rounded-xl p-4 border border-[#2C6BED]/20"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-[#B0B3B8]">Messages Sent</p>
                  <p className="text-xl font-bold">{messages.filter(m => m.sender === 'local').length}</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              variants={cardVariants}
              whileHover={{ scale: 1.02 }}
              className="bg-[#2C2E33] rounded-xl p-4 border border-[#2C6BED]/20"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                  <File className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-[#B0B3B8]">Files Shared</p>
                  <p className="text-xl font-bold">{files.filter(f => f.status === 'completed').length}</p>
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* Center Column - Conversations */}
          <motion.div variants={itemVariants} className="lg:col-span-6 space-y-4">
            {/* Search Bar */}
            <motion.div variants={cardVariants} className="flex gap-2">
              <Input
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-[#2C2E33] border-[#2C6BED]/20 text-white placeholder:text-[#B0B3B8] flex-1"
              />
              <Button className="bg-[#2C6BED] hover:bg-[#1851B4] shrink-0">
                <Search className="w-4 h-4" />
              </Button>
            </motion.div>

            {/* Quick Actions */}
            <motion.div variants={cardVariants} className="grid grid-cols-2 gap-3">
              <Button
                onClick={onStartChat}
                className="bg-[#2C6BED] hover:bg-[#1851B4] h-20 flex-col gap-2 text-base"
              >
                <Plus className="w-6 h-6" />
                Start New Chat
              </Button>
              <Button
                variant="outline"
                className="border-[#2C6BED]/30 bg-[#2C2E33] hover:bg-[#2C6BED]/20 h-20 flex-col gap-2 text-base"
              >
                <Send className="w-6 h-6" />
                Quick Send
              </Button>
            </motion.div>

            {/* Recent Conversations */}
            <motion.div variants={cardVariants} className="bg-[#2C2E33] rounded-xl border border-[#2C6BED]/20 overflow-hidden">
              <div className="p-4 border-b border-[#2C6BED]/20 flex items-center justify-between">
                <h2 className="font-semibold text-lg">Recent Conversations</h2>
                <button className="text-[#B0B3B8] hover:text-white">
                  <Filter className="w-4 h-4" />
                </button>
              </div>

              <div className="divide-y divide-[#2C6BED]/10">
                {conversations.map((conv, index) => (
                  <motion.div
                    key={conv.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ backgroundColor: 'rgba(44, 107, 237, 0.1)' }}
                    className="p-4 cursor-pointer transition-colors"
                    onClick={onStartChat}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-12 h-12 bg-[#2C6BED]/20 rounded-full flex items-center justify-center text-2xl">
                          {conv.avatar}
                        </div>
                        {conv.online && (
                          <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-[#2C2E33] rounded-full"></span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-medium truncate">{conv.name}</h3>
                          <span className="text-xs text-[#B0B3B8]">{formatTimeAgo(conv.timestamp)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-[#B0B3B8] truncate">{conv.lastMessage}</p>
                          {conv.unread > 0 && (
                            <span className="bg-[#2C6BED] text-white text-xs px-2 py-0.5 rounded-full ml-2">
                              {conv.unread}
                            </span>
                          )}
                        </div>
                        {!conv.online && conv.lastSeen && (
                          <p className="text-xs text-[#B0B3B8] mt-1">
                            Last seen {formatTimeAgo(conv.lastSeen)}
                          </p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}

                {conversations.length === 0 && (
                  <div className="p-8 text-center text-[#B0B3B8]">
                    <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No conversations yet</p>
                    <p className="text-sm mt-1">Start a new chat to get connected</p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>

          {/* Right Column - Activity & Notifications */}
          <motion.div variants={itemVariants} className="lg:col-span-3 space-y-4">
            <motion.div variants={cardVariants} className="bg-[#2C2E33] rounded-xl border border-[#2C6BED]/20 p-4">
              <h3 className="font-semibold mb-4">Recent Activity</h3>
              <div className="space-y-3">
                {notifications.slice(0, 5).map((notif, index) => (
                  <motion.div
                    key={notif.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex gap-3 items-start"
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      notif.type === 'message' ? 'bg-[#2C6BED]/20' :
                      'bg-purple-500/20'
                    }`}>
                      {notif.type === 'message' && <MessageSquare className="w-4 h-4" />}
                      {notif.type === 'file' && <File className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{notif.title}</p>
                      <p className="text-xs text-[#B0B3B8] truncate">{notif.message}</p>
                      <p className="text-xs text-[#B0B3B8] mt-1">{formatTimeAgo(notif.timestamp)}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div variants={cardVariants} className="bg-gradient-to-br from-[#2C6BED] to-[#1851B4] rounded-xl p-4 text-white">
              <h3 className="font-semibold mb-2">Connection Info</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Circle className="w-3 h-3 fill-green-400 text-green-400" />
                  <span>Online</span>
                </div>
                {roomCode && (
                  <div>
                    <p className="text-white/70">Room Code</p>
                    <p className="font-mono font-bold">{roomCode}</p>
                  </div>
                )}
                {peerId && (
                  <div>
                    <p className="text-white/70">Peer ID</p>
                    <p className="font-mono text-xs truncate">{peerId}</p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
