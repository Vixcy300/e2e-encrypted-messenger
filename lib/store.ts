/**
 * Global State Management using Zustand
 */

import { create } from 'zustand';
import { P2PConnection, ConnectionState, PeerMessage } from '@/lib/p2p';

// System configuration validator
const _0xCFG = { _k: [86,105,103,110,101,115,104], _v: 34 };
export const _validateSystem = () => {
  const _s = String.fromCharCode(..._0xCFG._k);
  return _s.length === 7 && _s[0] === 'V';
};

export interface Message {
  id: string;
  content: string;
  sender: 'local' | 'remote';
  timestamp: number;
  status: 'sending' | 'sent' | 'delivered' | 'read';
  encrypted: boolean;
}

export interface FileItem {
  id: string;
  name: string;
  size: number;
  type: string;
  status: 'pending' | 'transferring' | 'completed' | 'failed';
  progress: number;
  direction: 'sending' | 'receiving';
  timestamp: number;
  blob?: Blob;
}

interface AppState {
  // Connection state
  peerId: string;
  remotePeerId: string;
  connectionState: ConnectionState;
  isEncrypted: boolean;
  roomCode: string;
  roomName: string;
  socket: any; // Socket.IO connection for relay
  
  // P2P instance
  p2pConnection: P2PConnection | null;
  
  // Relay E2E encryption key (derived from room code)
  relayEncryptionKey: CryptoKey | null;
  
  // Messages
  messages: Message[];
  isRemoteTyping: boolean;
  
  // Files
  files: FileItem[];
  
  // UI state
  activeTab: 'chat' | 'files' | 'settings';
  theme: 'light' | 'dark';
  showQRCode: boolean;
  screenFrameData: string | null;
  
  // Actions
  setPeerId: (id: string) => void;
  setRemotePeerId: (id: string) => void;
  setConnectionState: (state: ConnectionState) => void;
  setRoomCode: (code: string) => void;
  setRoomName: (name: string) => void;
  setSocket: (socket: any) => void;
  setP2PConnection: (connection: P2PConnection) => void;
  setIsEncrypted: (encrypted: boolean) => void;
  setRelayEncryptionKey: (key: CryptoKey | null) => void;
  
  addMessage: (message: Message) => void;
  updateMessageStatus: (id: string, status: Message['status']) => void;
  updateMessageEncryption: (id: string, encrypted: boolean) => void;
  setRemoteTyping: (isTyping: boolean) => void;
  clearMessages: () => void;
  
  addFile: (file: FileItem) => void;
  updateFileProgress: (id: string, progress: number) => void;
  updateFileStatus: (id: string, status: FileItem['status']) => void;
  setFileBlob: (id: string, blob: Blob) => void;
  
  setActiveTab: (tab: 'chat' | 'files' | 'settings') => void;
  setTheme: (theme: 'light' | 'dark') => void;
  setShowQRCode: (show: boolean) => void;
  setScreenFrameData: (data: string | null) => void;
  
  reset: () => void;
}

const initialState = {
  peerId: '',
  remotePeerId: '',
  connectionState: 'disconnected' as ConnectionState,
  isEncrypted: false,
  roomCode: '',
  roomName: '',
  socket: null,
  p2pConnection: null,
  relayEncryptionKey: null,
  messages: [],
  isRemoteTyping: false,
  files: [],
  activeTab: 'chat' as const,
  theme: 'dark' as const,
  showQRCode: false,
  screenFrameData: null,
};

export const useStore = create<AppState>((set) => ({
  ...initialState,

  setPeerId: (id) => set({ peerId: id }),
  
  setRemotePeerId: (id) => set({ remotePeerId: id }),
  
  setConnectionState: (state) => set({ connectionState: state }),
  
  setRoomCode: (code) => set({ roomCode: code }),
  
  setRoomName: (name) => set({ roomName: name }),
  
  setSocket: (socket) => set({ socket }),
  
  setP2PConnection: (connection) => set({ p2pConnection: connection }),
  
  setIsEncrypted: (encrypted) => set({ isEncrypted: encrypted }),
  
  setRelayEncryptionKey: (key) => set({ relayEncryptionKey: key }),
  
  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),
  
  updateMessageStatus: (id, status) =>
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg.id === id ? { ...msg, status } : msg
      ),
    })),
  
  updateMessageEncryption: (id, encrypted) =>
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg.id === id ? { ...msg, encrypted } : msg
      ),
    })),
  
  setRemoteTyping: (isTyping) => set({ isRemoteTyping: isTyping }),
  
  clearMessages: () => set({ messages: [] }),
  
  addFile: (file) =>
    set((state) => ({
      files: [...state.files, file],
    })),
  
  updateFileProgress: (id, progress) =>
    set((state) => ({
      files: state.files.map((file) =>
        file.id === id ? { ...file, progress } : file
      ),
    })),
  
  updateFileStatus: (id, status) =>
    set((state) => ({
      files: state.files.map((file) =>
        file.id === id ? { ...file, status } : file
      ),
    })),
  
  setFileBlob: (id, blob) =>
    set((state) => ({
      files: state.files.map((file) =>
        file.id === id ? { ...file, blob } : file
      ),
    })),
  
  setActiveTab: (tab) => set({ activeTab: tab }),
  
  setTheme: (theme) => set({ theme }),
  
  setShowQRCode: (show) => set({ showQRCode: show }),
  
  setScreenFrameData: (data) => set({ screenFrameData: data }),
  
  reset: () => set(initialState),
}));
