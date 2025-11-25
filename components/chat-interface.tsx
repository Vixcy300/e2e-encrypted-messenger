'use client';

import { useState, useRef, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { CryptoService } from '@/lib/crypto';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessageList } from '@/components/message-list';
import { FileTransfer } from '@/components/file-transfer';
import { 
  Send, Paperclip, MessageSquare, FolderOpen, Settings, X, 
  Monitor, Mic, MicOff, Video, VideoOff, Phone, PhoneOff,
  Smile, MoreVertical, Search, Volume2, ArrowLeft, LogOut, User
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { formatFileSize, debounce } from '@/lib/utils';

export function ChatInterface({ onBackToDashboard, onLogout }: { onBackToDashboard?: () => void, onLogout?: () => void }) {
  const [message, setMessage] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const screenCanvasRef = useRef<HTMLCanvasElement>(null);
  const {
    activeTab,
    setActiveTab,
    p2pConnection,
    addMessage,
    addFile,
    updateFileStatus,
    updateFileProgress,
    setFileBlob,
    messages,
    files,
    isRemoteTyping,
    screenFrameData,
    setScreenFrameData,
    socket,
    roomCode,
    peerId,
    remotePeerId,
    updateMessageEncryption,
    relayEncryptionKey, // Add relay encryption key from store
  } = useStore();

  const sendTypingIndicator = useRef(
    debounce((isTyping: boolean) => {
      p2pConnection?.sendTyping(isTyping);
    }, 300)
  ).current;

  useEffect(() => {
    if (message.length > 0) {
      sendTypingIndicator(true);
    } else {
      sendTypingIndicator(false);
    }
  }, [message, sendTypingIndicator]);

  // Listen for relayed messages from signaling server (fallback when P2P fails)
  useEffect(() => {
    if (!socket || !roomCode) return;

    const handleRelayedMessage = async ({ message: relayedMsg, encrypted, iv }: any) => {
      console.log('[ChatInterface] Received relayed message:', relayedMsg);
      console.log('[ChatInterface] Encrypted:', encrypted, 'IV:', iv ? 'present' : 'missing');
      console.log('[ChatInterface] Relay key available:', !!relayEncryptionKey, 'P2P key available:', !!p2pConnection?.encryptionKey);
      
      let decryptedContent = relayedMsg.content;
      let isEncrypted = false;
      
      // ALWAYS try to decrypt with relay encryption key or P2P key
      const encryptionKey = relayEncryptionKey || p2pConnection?.encryptionKey;
      
      if (encrypted && iv && encryptionKey) {
        try {
          const ivBuffer = CryptoService.base64ToArrayBuffer(iv);
          const encryptedBuffer = CryptoService.base64ToArrayBuffer(relayedMsg.content);
          const decryptedBuffer = await CryptoService.decrypt(
            encryptedBuffer,
            encryptionKey,
            new Uint8Array(ivBuffer)
          );
          decryptedContent = new TextDecoder().decode(decryptedBuffer);
          isEncrypted = true;
          console.log('[ChatInterface] ✅ Message decrypted successfully');
        } catch (error) {
          console.error('[ChatInterface] Decryption failed:', error);
          decryptedContent = '[Encrypted message - decryption failed]';
        }
      } else if (encrypted) {
        console.warn('[ChatInterface] ⚠️ Message is encrypted but no decryption key available!');
        console.warn('[ChatInterface] Debug - encrypted:', encrypted, 'iv:', !!iv, 'key:', !!encryptionKey);
        decryptedContent = '[Encrypted message - no key available]';
      }
      
      addMessage({
        id: relayedMsg.id || CryptoService.generateId(16),
        content: decryptedContent,
        sender: 'remote',
        timestamp: relayedMsg.timestamp,
        status: 'delivered',
        encrypted: isEncrypted || encrypted, // Show lock if encrypted or encryption attempted
      });
    };

    socket.on('relay-message', handleRelayedMessage);

    return () => {
      socket.off('relay-message', handleRelayedMessage);
    };
  }, [socket, roomCode, addMessage, peerId, remotePeerId, p2pConnection, relayEncryptionKey]);

  // Listen for screen share events and file transfers via relay
  useEffect(() => {
    if (!socket) return;

    // File transfer state
    const fileChunks = new Map<string, { chunks: string[], metadata: any, receivedChunks: number }>();

    socket.on('screen-frame', ({ frame }: any) => {
      setScreenFrameData(frame.split(',')[1]);
    });

    socket.on('screen-share-start', () => {
      toast('Remote user started screen sharing');
      setActiveTab('screen');
    });

    socket.on('screen-share-stop', () => {
      toast('Remote user stopped screen sharing');
      setScreenFrameData(null);
    });

    // Listen for file transfer start
    socket.on('relay-file-start', ({ fileId, name, size, type, totalChunks }: any) => {
      console.log('[File-Receive] Starting file receive:', name, size, 'bytes');
      
      fileChunks.set(fileId, {
        chunks: new Array(totalChunks),
        metadata: { name, size, type, totalChunks },
        receivedChunks: 0,
      });
      
      addFile({
        id: fileId,
        name,
        size,
        type,
        status: 'transferring',
        progress: 0,
        direction: 'receiving',
        timestamp: Date.now(),
      });
      
      toast(`Receiving ${name}...`);
    });

    // Listen for file chunks
    socket.on('relay-file-chunk', ({ fileId, chunkIndex, data }: any) => {
      console.log(`[File-Receive] Chunk ${chunkIndex} received for file ${fileId}`);
      const transfer = fileChunks.get(fileId);
      if (!transfer) {
        console.warn(`[File-Receive] No transfer found for ${fileId}`);
        return;
      }
      
      transfer.chunks[chunkIndex] = data;
      transfer.receivedChunks++;
      
      const progress = (transfer.receivedChunks / transfer.metadata.totalChunks) * 100;
      updateFileProgress(fileId, Math.min(progress, 99));
      
      console.log(`[File-Receive] Chunk ${chunkIndex + 1}/${transfer.metadata.totalChunks} (${transfer.receivedChunks} received)`);
    });

    // Listen for file completion
    socket.on('relay-file-complete', ({ fileId }: any) => {
      const transfer = fileChunks.get(fileId);
      if (!transfer) return;
      
      console.log('[File-Receive] Assembling file...');
      
      // Decode each chunk separately, then combine binary data
      try {
        // Calculate total size
        let totalSize = 0;
        const decodedChunks: Uint8Array[] = [];
        
        for (const chunkBase64 of transfer.chunks) {
          const binaryString = atob(chunkBase64);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          decodedChunks.push(bytes);
          totalSize += bytes.length;
        }
        
        // Combine all decoded chunks into one array
        const combined = new Uint8Array(totalSize);
        let offset = 0;
        for (const chunk of decodedChunks) {
          combined.set(chunk, offset);
          offset += chunk.length;
        }
        
        const blob = new Blob([combined], { type: transfer.metadata.type });
        
        // Update existing file with blob - don't create duplicate
        setFileBlob(fileId, blob);
        updateFileProgress(fileId, 100);
        updateFileStatus(fileId, 'completed');
        
        toast.success(`Received ${transfer.metadata.name}`);
        console.log('[File-Receive] File received successfully');
        
        fileChunks.delete(fileId);
      } catch (error) {
        console.error('[File-Receive] Failed to assemble file:', error);
        updateFileStatus(fileId, 'failed');
        toast.error('Failed to receive file');
      }
    });

    return () => {
      socket.off('screen-frame');
      socket.off('screen-share-start');
      socket.off('screen-share-stop');
      socket.off('relay-file-start');
      socket.off('relay-file-chunk');
      socket.off('relay-file-complete');
    };
  }, [socket, setScreenFrameData, setActiveTab, addFile, updateFileProgress, updateFileStatus, setFileBlob]);

  // Draw screen frame on canvas
  useEffect(() => {
    if (screenFrameData && screenCanvasRef.current) {
      const canvas = screenCanvasRef.current;
      const ctx = canvas.getContext('2d');
      
      const img = new Image();
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx?.drawImage(img, 0, 0);
      };
      img.src = 'data:image/jpeg;base64,' + screenFrameData;
    }
  }, [screenFrameData]);

  const handleSendMessage = async () => {
    if (!message.trim()) return;

    let encrypted = false;

    const msg = {
      id: CryptoService.generateId(16),
      content: message.trim(),
      sender: 'local' as const,
      timestamp: Date.now(),
      status: 'sending' as const,
      encrypted: false,
    };

    addMessage(msg);
    
    // Try P2P first, fallback to relay
    const canUseP2P = p2pConnection && p2pConnection.isConnected();
    
    if (canUseP2P) {
      try {
        console.log('[ChatInterface] Sending message via P2P...');
        await p2pConnection.sendMessage(message.trim());
        console.log('[ChatInterface] Message sent via P2P');
        setMessage('');
        sendTypingIndicator(false);
        return;
      } catch (error: any) {
        console.warn('[ChatInterface] P2P send failed, trying relay:', error);
      }
    }

    // Fallback: Use signaling server relay with E2E encryption
    if (socket && roomCode) {
      try {
        console.log('[ChatInterface] Sending message via relay with E2E encryption...');
        
        let encryptedContent = message.trim();
        let iv = null;
        let isEncrypted = false;
        
        // ALWAYS encrypt if we have relay encryption key (derived from room code)
        const encryptionKey = relayEncryptionKey || p2pConnection?.encryptionKey;
        
        if (encryptionKey) {
          try {
            const encoder = new TextEncoder();
            const messageBuffer = encoder.encode(message.trim());
            const encrypted = await CryptoService.encrypt(messageBuffer.buffer, encryptionKey);
            encryptedContent = CryptoService.arrayBufferToBase64(encrypted.encrypted);
            iv = CryptoService.arrayBufferToBase64(encrypted.iv.buffer);
            isEncrypted = true;
            console.log('[ChatInterface] ✅ Message encrypted with AES-256-GCM');
          } catch (error) {
            console.warn('[ChatInterface] Encryption failed, sending plain text:', error);
          }
        } else {
          console.warn('[ChatInterface] ⚠️ NO ENCRYPTION KEY - Sending plain text!');
        }
        
        socket.emit('relay-message', {
          roomCode,
          message: {
            id: msg.id,
            content: encryptedContent,
            timestamp: msg.timestamp,
          },
          encrypted: isEncrypted,
          iv: iv,
        });
        
        // Mark message as encrypted
        updateMessageEncryption(msg.id, isEncrypted);
        
        console.log('[ChatInterface] Message sent via relay', isEncrypted ? '(encrypted)' : '(plain text)');
        toast.success(isEncrypted ? 'Message sent 🔒 Encrypted' : 'Message sent');
        setMessage('');
        sendTypingIndicator(false);
      } catch (error: any) {
        console.error('[ChatInterface] Relay send failed:', error);
        toast.error('Failed to send message');
      }
    } else {
      console.error('[ChatInterface] No connection method available');
      toast.error('Not connected - no relay available');
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type - only images and PDFs
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Only images (JPG, PNG, GIF) and PDFs are supported');
      return;
    }

    if (file.size > 50 * 1024 * 1024) { // 50MB limit
      toast.error('File size must be less than 50MB');
      return;
    }

    if (!socket || !roomCode) {
      toast.error('Not connected to room');
      return;
    }

    try {
      const transferId = CryptoService.generateId(16);
      
      // Add file to UI
      addFile({
        id: transferId,
        name: file.name,
        size: file.size,
        type: file.type,
        status: 'transferring',
        progress: 0,
        direction: 'sending',
        timestamp: Date.now(),
      });

      toast.success(`Uploading ${file.name}...`);
      
      // Read file as array buffer for chunked transfer
      const reader = new FileReader();
      reader.onload = async () => {
        const arrayBuffer = reader.result as ArrayBuffer;
        const uint8Array = new Uint8Array(arrayBuffer);
        
        console.log('[File] Starting chunked upload:', file.name, file.size, 'bytes');
        
        // Send file metadata first
        socket.emit('relay-file-start', {
          roomCode,
          fileId: transferId,
          name: file.name,
          size: file.size,
          type: file.type,
          totalChunks: Math.ceil(file.size / (256 * 1024)), // 256KB chunks
        });
        
        // Send file in chunks
        const chunkSize = 256 * 1024; // 256KB per chunk
        const totalChunks = Math.ceil(file.size / chunkSize);
        
        for (let i = 0; i < totalChunks; i++) {
          const start = i * chunkSize;
          const end = Math.min(start + chunkSize, file.size);
          const chunk = uint8Array.slice(start, end);
          
          // Convert chunk to base64 properly without stack overflow
          let binary = '';
          const len = chunk.byteLength;
          for (let j = 0; j < len; j++) {
            binary += String.fromCharCode(chunk[j]);
          }
          const chunkBase64 = btoa(binary);
          
          // Send chunk
          socket.emit('relay-file-chunk', {
            roomCode,
            fileId: transferId,
            chunkIndex: i,
            totalChunks,
            data: chunkBase64,
          });
          
          // Update progress
          const progress = ((i + 1) / totalChunks) * 100;
          updateFileProgress(transferId, Math.min(progress, 99));
          
          // Small delay to prevent overwhelming the server
          await new Promise(resolve => setTimeout(resolve, 10));
        }
        
        // Send completion
        console.log('[File] Sending completion signal for:', file.name);
        socket.emit('relay-file-complete', {
          roomCode,
          fileId: transferId,
        });
        
        console.log('[File] Upload complete:', file.name, 'Total chunks sent:', totalChunks);
        updateFileProgress(transferId, 100);
        updateFileStatus(transferId, 'completed');
        toast.success(`${file.name} sent successfully!`);
      };
      
      reader.onerror = () => {
        console.error('[File] Failed to read file');
        toast.error('Failed to read file');
        updateFileStatus(transferId, 'failed');
      };
      
      reader.readAsArrayBuffer(file);
    } catch (error) {
      toast.error('Failed to send file');
      console.error('File send error:', error);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (!file) return;

    // Validate file type - only images and PDFs
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Only images (JPG, PNG, GIF) and PDFs are supported');
      return;
    }

    if (file.size > 50 * 1024 * 1024) { // 50MB limit
      toast.error('File size must be less than 50MB');
      return;
    }

    if (!socket || !roomCode) {
      toast.error('Not connected to room');
      return;
    }

    try {
      const transferId = CryptoService.generateId(16);
      
      // Add file to UI
      addFile({
        id: transferId,
        name: file.name,
        size: file.size,
        type: file.type,
        status: 'transferring',
        progress: 0,
        direction: 'sending',
        timestamp: Date.now(),
      });

      toast.success(`Uploading ${file.name}...`);
      
      // Read file as array buffer for chunked transfer
      const reader = new FileReader();
      reader.onload = async () => {
        const arrayBuffer = reader.result as ArrayBuffer;
        const uint8Array = new Uint8Array(arrayBuffer);
        
        console.log('[File-Drop] Starting chunked upload:', file.name, file.size, 'bytes');
        
        // Send file metadata first
        socket.emit('relay-file-start', {
          roomCode,
          fileId: transferId,
          name: file.name,
          size: file.size,
          type: file.type,
          totalChunks: Math.ceil(file.size / (256 * 1024)),
        });
        
        // Send file in chunks
        const chunkSize = 256 * 1024; // 256KB per chunk
        const totalChunks = Math.ceil(file.size / chunkSize);
        
        for (let i = 0; i < totalChunks; i++) {
          const start = i * chunkSize;
          const end = Math.min(start + chunkSize, file.size);
          const chunk = uint8Array.slice(start, end);
          
          // Convert chunk to base64 properly without stack overflow
          let binary = '';
          const len = chunk.byteLength;
          for (let j = 0; j < len; j++) {
            binary += String.fromCharCode(chunk[j]);
          }
          const chunkBase64 = btoa(binary);
          
          // Send chunk
          socket.emit('relay-file-chunk', {
            roomCode,
            fileId: transferId,
            chunkIndex: i,
            totalChunks,
            data: chunkBase64,
          });
          
          // Update progress
          const progress = ((i + 1) / totalChunks) * 100;
          updateFileProgress(transferId, Math.min(progress, 99));
          
          await new Promise(resolve => setTimeout(resolve, 10));
        }
        
        // Send completion
        socket.emit('relay-file-complete', {
          roomCode,
          fileId: transferId,
        });
        
        console.log('[File-Drop] Upload complete:', file.name);
        updateFileProgress(transferId, 100);
        updateFileStatus(transferId, 'completed');
        toast.success(`${file.name} sent!`);
      };
      
      reader.onerror = () => {
        console.error('[File-Drop] Failed to read file');
        toast.error('Failed to read file');
        updateFileStatus(transferId, 'failed');
      };
      
      reader.readAsArrayBuffer(file);
    } catch (error) {
      toast.error('Failed to send file');
      console.error('File send error:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const toggleScreenShare = async () => {
    // Screen sharing via relay - no P2P connection needed
    if (isScreenSharing) {
      // Stop screen share
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      if (socket && roomCode) {
        socket.emit('screen-share-stop', { roomCode });
      }
      setIsScreenSharing(false);
      setScreenFrameData(null);
      toast.success('Screen sharing stopped');
    } else {
      // Start screen share via relay
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: { 
            width: { ideal: 1920 }, 
            height: { ideal: 1080 }, 
            frameRate: { ideal: 60, max: 60 }
          }
        });
        streamRef.current = stream;
        
        if (socket && roomCode) {
          socket.emit('screen-share-start', { roomCode });
          
          // Capture and send frames
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d', { alpha: false });
          const video = document.createElement('video');
          video.srcObject = stream;
          video.play();
          
          let frameInterval: any;
          let isCapturing = true;
          let frameCount = 0;
          
          const captureFrame = () => {
            if (isCapturing && streamRef.current && ctx) {
              canvas.width = video.videoWidth || 1920;
              canvas.height = video.videoHeight || 1080;
              ctx.drawImage(video, 0, 0);
              // Higher quality JPEG for better clarity
              const frame = canvas.toDataURL('image/jpeg', 0.85);
              socket.emit('screen-frame', { roomCode, frame });
              frameCount++;
            }
          };
          
          video.onloadedmetadata = () => {
            console.log('[ScreenShare] Started at resolution:', video.videoWidth, 'x', video.videoHeight);
            frameInterval = setInterval(captureFrame, 16); // 60 FPS (1000ms/60 = ~16ms)
          };
          
          stream.getVideoTracks()[0].onended = () => {
            isCapturing = false;
            clearInterval(frameInterval);
            setIsScreenSharing(false);
            setScreenFrameData(null);
            if (socket && roomCode) {
              socket.emit('screen-share-stop', { roomCode });
            }
          };
        }
        
        setIsScreenSharing(true);
        toast.success('Screen sharing started');
      } catch (error) {
        toast.error('Failed to start screen share');
        console.error('Screen share error:', error);
      }
    }
  };

  return (
    <div className="h-screen flex flex-col bg-[#1B1C1F] overflow-hidden">
      {/* Top Navigation Bar */}
      <div className="bg-[#2C2E33] border-b border-[#2C6BED]/20 px-3 sm:px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            {onBackToDashboard && (
              <button
                onClick={onBackToDashboard}
                className="p-2 hover:bg-[#2C6BED]/20 rounded-lg transition-colors shrink-0"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-[#2C6BED] to-[#1851B4] rounded-xl flex items-center justify-center shrink-0">
              <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-bold truncate">SecureChat</h1>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                <p className="text-xs text-[#B0B3B8]">
                  {p2pConnection?.isConnected() ? 'Connected' : 'Connecting...'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <button className="p-2 hover:bg-[#2C6BED]/20 rounded-lg transition-colors hidden sm:block">
              <Search className="w-5 h-5" />
            </button>
            {onLogout && (
              <button
                onClick={onLogout}
                className="p-2 hover:bg-red-500/20 rounded-lg transition-colors text-red-400"
                title="Logout"
              >
                <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden relative">
        <div className="container mx-auto h-full max-w-4xl px-2 sm:px-4 md:px-6">
          {/* Screen Share Display - Mobile Optimized */}
          {screenFrameData && (
            <div className="fixed top-2 right-2 left-2 sm:left-auto sm:right-4 sm:top-4 z-50 bg-black/95 border-2 border-[#2C6BED] rounded-lg p-2 shadow-lg max-h-[40vh] sm:max-h-[60vh] md:max-h-[80vh] overflow-auto">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-[#2C6BED] font-medium">Screen Share</span>
                <button
                  onClick={() => setScreenFrameData(null)}
                  className="text-red-400 hover:text-red-300 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <canvas ref={screenCanvasRef} className="w-full sm:max-w-md md:max-w-2xl rounded" />
            </div>
          )}
          
          {/* Tab Navigation - Mobile Optimized */}
          <div className="flex gap-1 sm:gap-2 py-2 sm:py-3 border-b border-[#2C2E33] overflow-x-auto scrollbar-hide">
            {[
              { id: 'chat', icon: MessageSquare, label: 'Chat', count: messages.length },
              { id: 'files', icon: FolderOpen, label: 'Files', count: files.length },
              { id: 'settings', icon: Settings, label: 'Settings' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg transition-all font-medium text-sm whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-[#2C6BED] text-white shadow-lg'
                    : 'text-[#B0B3B8] hover:bg-[#2C2E33] hover:text-white'
                }`}
              >
                <tab.icon className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden xs:inline">{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="bg-white text-[#2C6BED] text-xs px-1.5 sm:px-2 py-0.5 rounded-full font-bold min-w-[20px] text-center">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Content Area */}
          <div
            className="flex-1 overflow-hidden relative"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <AnimatePresence mode="wait">
              {activeTab === 'chat' && (
                <motion.div
                  key="chat"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="h-[calc(100vh-180px)] sm:h-[calc(100vh-200px)]"
                >
                  <MessageList />
                </motion.div>
              )}

              {activeTab === 'files' && (
                <motion.div
                  key="files"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="h-[calc(100vh-180px)] sm:h-[calc(100vh-200px)]"
                >
                  <FileTransfer />
                </motion.div>
              )}

              {activeTab === 'settings' && (
                <motion.div
                  key="settings"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="h-[calc(100vh-180px)] sm:h-[calc(100vh-200px)] overflow-y-auto p-3 sm:p-4"
                >
                  <div className="bg-[#2C2E33] border border-[#2C6BED]/30 rounded-xl p-4 sm:p-6 text-white">
                    <h3 className="text-lg sm:text-xl font-semibold mb-4 text-[#2C6BED]">Settings</h3>
                    <div className="space-y-3 sm:space-y-4">
                      <div>
                        <p className="text-sm text-[#B0B3B8] mb-1">Connection Status</p>
                        <p className="font-medium text-white">{p2pConnection?.getState()}</p>
                      </div>
                      <div>
                        <p className="text-sm text-[#B0B3B8] mb-1">Encryption</p>
                        <p className="font-medium text-white">AES-256-GCM with ECDH Key Exchange</p>
                      </div>
                      <div>
                        <p className="text-sm text-[#B0B3B8] mb-1">Protocol</p>
                        <p className="font-medium text-white">WebRTC with P2P Data Channels</p>
                      </div>
                      <div>
                        <p className="text-sm text-[#B0B3B8] mb-1">File Transfer</p>
                        <p className="font-medium text-white">Optimized • Relay Server</p>
                      </div>
                      <div className="pt-4 border-t border-[#2C6BED]/30">
                        <Button
                          onClick={toggleScreenShare}
                          className={`w-full text-sm sm:text-base py-3 ${
                            isScreenSharing
                              ? 'bg-red-500/20 border border-red-500 text-red-400 hover:bg-red-500/30'
                              : 'bg-[#2C6BED] border-0 text-white hover:bg-[#1851B4]'
                          } transition-all rounded-lg font-medium`}
                        >
                          <Monitor className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                          {isScreenSharing ? 'Stop Screen Share' : 'Start Screen Share'}
                        </Button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Drag & Drop Overlay */}
            <AnimatePresence>
              {isDragging && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-[#2C6BED]/20 backdrop-blur-sm border-2 border-dashed border-[#2C6BED] rounded-lg flex items-center justify-center z-50"
                >
                  <div className="text-center px-4">
                    <FolderOpen className="w-12 h-12 sm:w-16 sm:h-16 text-[#2C6BED] mx-auto mb-4" />
                    <p className="text-[#2C6BED] text-lg sm:text-xl font-semibold">Drop file to send</p>
                    <p className="text-[#B0B3B8] text-xs sm:text-sm mt-2">Max 50MB • JPG, PNG, GIF, PDF</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Input Area - Mobile Optimized */}
          {activeTab === 'chat' && (
            <div className="py-2 sm:py-3 px-2 sm:px-0 bg-[#1B1C1F] border-t border-[#2C2E33]">
              {isRemoteTyping && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-xs sm:text-sm text-[#B0B3B8] mb-2 flex items-center gap-2"
                >
                  <span>Typing...</span>
                  <span className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-[#2C6BED] rounded-full animate-pulse" />
                    <span className="w-1.5 h-1.5 bg-[#2C6BED] rounded-full animate-pulse delay-75" />
                    <span className="w-1.5 h-1.5 bg-[#2C6BED] rounded-full animate-pulse delay-150" />
                  </span>
                </motion.div>
              )}
              
              <div className="flex gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept="image/jpeg,image/jpg,image/png,image/gif,application/pdf"
                  className="hidden"
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  size="icon"
                  className="border-[#2C2E33] bg-[#2C2E33] text-[#2C6BED] hover:bg-[#2C6BED] hover:text-white shrink-0 h-10 w-10 sm:h-11 sm:w-11 rounded-xl"
                >
                  <Paperclip className="w-4 h-4 sm:w-5 sm:h-5" />
                </Button>
                <Button
                  onClick={toggleScreenShare}
                  variant="outline"
                  size="icon"
                  className={`shrink-0 h-10 w-10 sm:h-11 sm:w-11 rounded-xl ${
                    isScreenSharing
                      ? 'border-red-500 bg-red-500/20 text-red-400 hover:bg-red-500/30'
                      : 'border-[#2C2E33] bg-[#2C2E33] text-[#2C6BED] hover:bg-[#2C6BED] hover:text-white'
                  }`}
                  title={isScreenSharing ? 'Stop Screen Share' : 'Start Screen Share'}
                >
                  <Monitor className="w-4 h-4 sm:w-5 sm:h-5" />
                </Button>
                <Input
                  placeholder="Message..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="bg-[#2C2E33] border-[#2C2E33] text-white placeholder:text-[#B0B3B8] focus:border-[#2C6BED] focus:ring-1 focus:ring-[#2C6BED] rounded-xl h-10 sm:h-11 text-sm sm:text-base"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!message.trim()}
                  className="bg-[#2C6BED] hover:bg-[#1851B4] text-white border-0 shrink-0 h-10 w-10 sm:h-11 sm:w-11 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  size="icon"
                >
                  <Send className="w-4 h-4 sm:w-5 sm:h-5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
