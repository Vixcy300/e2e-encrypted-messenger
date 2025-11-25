'use client';

import { useEffect, useRef } from 'react';
import { useStore } from '@/lib/store';
import { motion } from 'framer-motion';
import { Check, CheckCheck, Lock, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';

export function MessageList() {
  const { messages, isRemoteTyping } = useStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isRemoteTyping]);

  if (messages.length === 0) {
    return (
      <div className="h-full flex items-center justify-center p-4 sm:p-8">
        <div className="text-center max-w-md">
          <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-[#2C6BED] rounded-2xl mb-4 shadow-lg">
            <MessageSquare className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
          </div>
          <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">
            Secure Connection Established
          </h3>
          <p className="text-[#B0B3B8] text-sm sm:text-base mb-4">
            All messages are end-to-end encrypted
          </p>
          <div className="inline-flex items-center gap-2 bg-[#2C2E33] border border-[#2C6BED]/30 px-3 sm:px-4 py-2 rounded-lg">
            <Lock className="w-4 h-4 text-[#2C6BED]" />
            <span className="text-xs sm:text-sm font-medium text-[#2C6BED]">
              Protected by AES-256 encryption
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-3 sm:p-4 md:p-6 space-y-2 sm:space-y-3">
      {messages.map((msg, index) => (
        <motion.div
          key={msg.id}
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ 
            delay: index * 0.02,
            type: "spring",
            stiffness: 500,
            damping: 30
          }}
          className={`flex ${msg.sender === 'local' ? 'justify-end' : 'justify-start'}`}
        >
          <div
            className={`max-w-[85%] sm:max-w-[75%] md:max-w-[60%] rounded-2xl px-3 sm:px-4 py-2 sm:py-3 shadow-md ${
              msg.sender === 'local'
                ? 'bg-[#2C6BED] text-white'
                : 'bg-[#2C2E33] text-white border border-[#2C6BED]/20'
            }`}
          >
            <p className="break-words whitespace-pre-wrap text-sm sm:text-base leading-relaxed">{msg.content}</p>
            <div className="flex items-center gap-2 mt-1.5 sm:mt-2 justify-end">
              {msg.encrypted && (
                <Lock className={`w-3 h-3 ${msg.sender === 'local' ? 'text-white/70' : 'text-[#2C6BED]'}`} />
              )}
              <span className={`text-xs ${msg.sender === 'local' ? 'text-white/70' : 'text-[#B0B3B8]'}`}>
                {format(msg.timestamp, 'HH:mm')}
              </span>
              {msg.sender === 'local' && (
                <>
                  {msg.status === 'sent' && <Check className="w-3.5 h-3.5 text-white/70" />}
                  {msg.status === 'delivered' && <CheckCheck className="w-3.5 h-3.5 text-white/70" />}
                  {msg.status === 'read' && <CheckCheck className="w-3.5 h-3.5 text-white" />}
                </>
              )}
            </div>
          </div>
        </motion.div>
      ))}
      
      {/* Typing Indicator */}
      {isRemoteTyping && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="flex justify-start"
        >
          <div className="bg-[#2C2E33] border border-[#2C6BED]/20 rounded-2xl px-4 py-3 shadow-md">
            <div className="flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-2 h-2 bg-[#2C6BED] rounded-full"
                  animate={{
                    y: [0, -8, 0],
                    opacity: [0.5, 1, 0.5]
                  }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    delay: i * 0.15,
                    ease: "easeInOut"
                  }}
                />
              ))}
            </div>
          </div>
        </motion.div>
      )}
      
      <div ref={messagesEndRef} />
    </div>
  );
}
