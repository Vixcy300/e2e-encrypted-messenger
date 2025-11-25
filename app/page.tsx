'use client';

import { useEffect, useState } from 'react';
import { useStore, _validateSystem } from '@/lib/store';
import { P2PConnection } from '@/lib/p2p';
import { CryptoService, _verifyCryptoConfig } from '@/lib/crypto';
import { ProfessionalLogin } from '@/components/professional-login';
import { DramaticLogin } from '@/components/dramatic-login';
import { WelcomeScreen } from '@/components/welcome-screen';
import { ChatInterface } from '@/components/chat-interface';
import { ConnectionStatus } from '@/components/connection-status';
import { Dashboard } from '@/components/dashboard';
import { Disclaimer, DisclaimerBadge, _systemCheck, getIntegrityStatus } from '@/components/disclaimer';
import toast from 'react-hot-toast';

// System integrity verification - runs silently
const _0xV = () => _validateSystem() && _verifyCryptoConfig() && _systemCheck();

export default function Home() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showDashboard, setShowDashboard] = useState(true);
  const [username, setUsername] = useState('');
  const [initProgress, setInitProgress] = useState('Connecting to server...');
  const [screenFrameChunks, setScreenFrameChunks] = useState<Map<number, Map<number, string>>>(new Map());
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const [showLoginDisclaimer, setShowLoginDisclaimer] = useState(false);
  const [systemValid, setSystemValid] = useState(true);
  const {
    connectionState,
    setConnectionState,
    setPeerId,
    setP2PConnection,
    setIsEncrypted,
    addMessage,
    addFile,
    updateFileProgress,
    updateFileStatus,
    setFileBlob,
    setRemoteTyping,
    setScreenFrameData,
  } = useStore();

  // Silent system verification on mount
  useEffect(() => {
    const _v = _0xV();
    setSystemValid(_v);
    if (!_v) {
      console.error('[System] Configuration error detected');
    }
  }, []);

  useEffect(() => {
    // Check if user is already logged in with valid token
    const token = sessionStorage.getItem('securep2p_token');
    const userData = localStorage.getItem('securep2p_user');
    
    if (token && userData) {
      // Offline mode: trust local storage without server verification
      try {
        const user = JSON.parse(userData);
        setUsername(user.username);
        setIsLoggedIn(true);
        initializeP2P(token);
      } catch (error) {
        console.error('Failed to parse user data:', error);
        sessionStorage.removeItem('securep2p_token');
        localStorage.removeItem('securep2p_user');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const verifyToken = async (token: string, userData: string) => {
    try {
      const SIGNALING_SERVER = process.env.NEXT_PUBLIC_SIGNALING_SERVER || 'http://localhost:3001';
      const response = await fetch(`${SIGNALING_SERVER}/api/auth/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      if (response.ok) {
        const data = await response.json();
        const user = JSON.parse(userData);
        setUsername(user.username);
        setIsLoggedIn(true);
        initializeP2P(token);
      } else {
        // Token invalid, clear storage
        sessionStorage.removeItem('securep2p_token');
        localStorage.removeItem('securep2p_user');
      }
    } catch (error) {
      console.error('Token verification failed:', error);
    }
  };

  // Pending login data (stored while showing disclaimer)
  const [pendingLogin, setPendingLogin] = useState<{ username: string; sessionData: any } | null>(null);

  const handleLogin = (username: string, sessionData: any) => {
    // Verify system before allowing login
    if (!_0xV()) {
      setSystemValid(false);
      return;
    }
    // Store login data and show disclaimer first
    setPendingLogin({ username, sessionData });
    setShowLoginDisclaimer(true);
  };

  const handleDisclaimerAccept = () => {
    // Multi-point verification before allowing access
    const integrityStatus = getIntegrityStatus();
    if (!_0xV() || !integrityStatus.valid) {
      setSystemValid(false);
      toast.error('System configuration error');
      return;
    }
    
    // After accepting disclaimer, complete the login
    if (pendingLogin) {
      setUsername(pendingLogin.username);
      setIsLoggedIn(true);
      initializeP2P(pendingLogin.sessionData.token);
      setPendingLogin(null);
    }
    setShowLoginDisclaimer(false);
    setDisclaimerAccepted(true);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('securep2p_token');
    localStorage.removeItem('securep2p_user');
    setIsLoggedIn(false);
    setIsInitialized(false);
    setShowDashboard(true);
    if (useStore.getState().p2pConnection) {
      useStore.getState().p2pConnection?.disconnect();
    }
    if (useStore.getState().socket) {
      useStore.getState().socket?.disconnect();
    }
    useStore.getState().reset();
    toast.success('Logged out successfully');
  };

  const handleStartChat = () => {
    setShowDashboard(false);
  };

  const handleBackToDashboard = () => {
    setShowDashboard(true);
    // Optionally disconnect
    if (useStore.getState().p2pConnection) {
      useStore.getState().p2pConnection?.disconnect();
    }
    useStore.getState().reset();
  };

  const initializeP2P = async (token: string) => {
    try {
      setInitProgress('Initializing secure connection...');
      toast.loading('Setting up connection...', { id: 'init' });
      
      // Offline mode: no internet check needed for local network
      
      // Skip P2P initialization - use relay mode only for faster startup
      setInitProgress('Connecting to relay server...');
      
      // Import socket.io-client dynamically
      const { io } = await import('socket.io-client');
      const SIGNALING_SERVER = process.env.NEXT_PUBLIC_SIGNALING_SERVER || 'http://localhost:3001';
      
      // Connect to socket with authentication
      const socket = io(SIGNALING_SERVER, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
      });

      // Connection event handlers
      socket.on('connect', () => {
        console.log('[Socket] Connected:', socket.id);
        setConnectionState('connected');
        toast.success('🔐 Connected securely', { id: 'init' });
      });

      socket.on('connect_error', (error) => {
        console.error('[Socket] Connection error:', error.message);
        if (error.message === 'Authentication required' || error.message === 'Invalid token') {
          toast.error('Session expired. Please login again.', { id: 'init' });
          handleLogout();
        } else {
          toast.error('Connection failed. Retrying...', { id: 'init' });
        }
      });

      socket.on('disconnect', (reason) => {
        console.log('[Socket] Disconnected:', reason);
        if (reason === 'io server disconnect') {
          // Server disconnected us, try to reconnect
          socket.connect();
        }
      });

      socket.on('reconnect', (attemptNumber) => {
        console.log('[Socket] Reconnected after', attemptNumber, 'attempts');
        toast.success('Reconnected!', { duration: 2000 });
      });

      socket.on('reconnect_failed', () => {
        toast.error('Failed to reconnect. Please refresh.', { id: 'init' });
      });

      // Heartbeat mechanism
      const heartbeatInterval = setInterval(() => {
        if (socket.connected) {
          socket.emit('heartbeat', { peerId: useStore.getState().peerId });
        }
      }, 30000); // Every 30 seconds

      socket.on('heartbeat-ack', (data) => {
        console.log('[Heartbeat] Acknowledged:', data);
      });

      // Store socket in zustand
      useStore.getState().setSocket(socket);
      
      // Generate a peer ID without PeerJS
      const peerId = CryptoService.generateId(16);
      setPeerId(peerId);
      setIsInitialized(true);
      
      // Cleanup on unmount
      return () => {
        clearInterval(heartbeatInterval);
        socket.disconnect();
      };
      
    } catch (error: any) {
      console.error('Init error:', error);
      toast.error('Initialization failed. Please refresh.', { id: 'init' });
    }
  };

  // Show login screen if not logged in
  if (!isLoggedIn) {
    // Block access if system tampering detected
    if (!systemValid) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-950 via-slate-950 to-red-950">
          <div className="text-center max-w-md px-6">
            <div className="w-20 h-20 mx-auto mb-6 bg-red-500/20 rounded-full flex items-center justify-center border-2 border-red-500">
              <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-red-400 mb-3">
              Application Integrity Error
            </h1>
            <p className="text-slate-400 mb-6">
              Critical system files have been modified. This application cannot run with tampered components.
            </p>
            <div className="bg-red-900/30 border border-red-800 rounded-xl p-4 text-left">
              <p className="text-red-300 text-sm font-semibold mb-2">Possible causes:</p>
              <ul className="text-red-400/80 text-xs space-y-1">
                <li>• Attribution files have been modified</li>
                <li>• Required components are missing</li>
                <li>• Integrity verification failed</li>
              </ul>
            </div>
            <p className="text-xs text-slate-500 mt-6">
              Please restore the original files or download a fresh copy from the official repository.
            </p>
          </div>
        </div>
      );
    }
    
    return (
      <>
        {/* Show disclaimer after login attempt */}
        {showLoginDisclaimer && (
          <Disclaimer onAccept={handleDisclaimerAccept} />
        )}
        <DramaticLogin onLogin={handleLogin} />
      </>
    );
  }

  // Show loading while initializing
  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950">
        <div className="text-center max-w-md px-6">
          <div className="relative w-24 h-24 mx-auto mb-8">
            <div className="absolute inset-0 border-4 border-blue-200 dark:border-blue-900 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <div className="absolute inset-4 border-4 border-purple-600 border-b-transparent rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
          </div>
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
            Initializing Secure Connection
          </h3>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            {initProgress}
          </p>
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
            <p className="text-sm text-blue-900 dark:text-blue-100 mb-2">Setting up for: <strong>{username}</strong></p>
            <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 h-full rounded-full animate-pulse" style={{ width: '60%' }}></div>
            </div>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-4">
            This may take a few moments on mobile networks
          </p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#1B1C1F]">
      {/* Attribution Badge - Always visible */}
      <DisclaimerBadge />
      
      {!showDashboard && useStore.getState().roomCode && (
        <ConnectionStatus username={username} onLogout={handleLogout} />
      )}
      
      {showDashboard ? (
        <Dashboard onStartChat={handleStartChat} onLogout={handleLogout} />
      ) : useStore.getState().roomCode ? (
        <ChatInterface onBackToDashboard={handleBackToDashboard} onLogout={handleLogout} />
      ) : (
        <WelcomeScreen />
      )}
    </main>
  );
}
