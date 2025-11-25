/**
 * WebRTC Peer-to-Peer Connection Manager
 * Handles secure P2P connections with automatic reconnection
 */

import Peer, { DataConnection } from 'peerjs';
import { CryptoService } from './crypto';
import { OptimizedFileTransfer, TransferProgress } from './file-transfer-optimized';

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface PeerMessage {
  type: 'text' | 'file' | 'file-chunk' | 'file-request' | 'file-accept' | 'key-exchange' | 'handshake' | 'typing' | 'read-receipt' | 'screen-share' | 'screen-chunk' | 'audio' | 'video';
  data: any;
  timestamp: number;
  signature?: string;
  id?: string;
}

export interface FileTransfer {
  id: string;
  name: string;
  size: number;
  type: string;
  chunks: number;
  receivedChunks: number;
  data: ArrayBuffer[];
  hash: string;
  encrypted: boolean;
}

interface PeerConnectionCallbacks {
  onStateChange?: (state: ConnectionState) => void;
  onMessage?: (message: PeerMessage) => void;
  onFileProgress?: (progress: number, transferId: string) => void;
  onFileComplete?: (file: Blob, metadata: any) => void;
  onError?: (error: Error) => void;
}

export class P2PConnection {
  private peer: Peer | null = null;
  private connection: DataConnection | null = null;
  private peerId: string = '';
  private state: ConnectionState = 'disconnected';
  private callbacks: PeerConnectionCallbacks = {};
  private encryptionKey: CryptoKey | null = null;
  private keyPair: CryptoKeyPair | null = null;
  private activeTransfers: Map<string, FileTransfer> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private fileTransferEngine: OptimizedFileTransfer;

  constructor(callbacks: PeerConnectionCallbacks = {}) {
    this.callbacks = callbacks;
    this.fileTransferEngine = new OptimizedFileTransfer({
      chunkSize: 64 * 1024,
      maxParallelChunks: 6,
      compressionThreshold: 512 * 1024,
      enableCompression: true,
      adaptiveChunkSize: true,
    });
  }

  /**
   * Initialize peer connection
   */
  async initialize(customPeerId?: string): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        // Get host from environment or detect automatically
        // IMPORTANT: All devices must connect to the SAME PeerJS server
        const peerHost = process.env.NEXT_PUBLIC_PEERJS_HOST || 
          (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
            ? 'localhost' 
            : window.location.hostname);
        const peerPort = parseInt(process.env.NEXT_PUBLIC_PEERJS_PORT || '9000');
        
        const config = {
          host: peerHost,
          port: peerPort,
          path: '/peerjs',
          debug: 3, // Increased debug level to see connection issues
          secure: false,
          config: {
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:stun1.l.google.com:19302' },
              { urls: 'stun:stun2.l.google.com:19302' },
              // Add TURN servers for relay when direct connection fails
              { 
                urls: 'turn:openrelay.metered.ca:80',
                username: 'openrelayproject',
                credential: 'openrelayproject'
              },
              { 
                urls: 'turn:openrelay.metered.ca:443',
                username: 'openrelayproject',
                credential: 'openrelayproject'
              },
              { 
                urls: 'turn:openrelay.metered.ca:443?transport=tcp',
                username: 'openrelayproject',
                credential: 'openrelayproject'
              },
            ],
            iceTransportPolicy: 'all',
            bundlePolicy: 'max-bundle',
            rtcpMuxPolicy: 'require',
            iceCandidatePoolSize: 10,
          },
        };
        
        console.log('[P2P] Initializing with config:', { host: peerHost, port: peerPort });
        console.log('[P2P] Will connect to PeerJS server at:', `http://${peerHost}:${peerPort}/peerjs`);
        console.log('[P2P] Current page hostname:', window.location.hostname);

        this.peer = new Peer(customPeerId || CryptoService.generateId(16), config);
        
        // Set timeout for initialization
        const initTimeout = setTimeout(() => {
          if (!this.peerId) {
            const error = new Error('Peer initialization timeout. Please check your network connection.');
            console.error('[P2P] Initialization timeout');
            this.updateState('error');
            this.callbacks.onError?.(error);
            reject(error);
          }
        }, 15000); // 15 seconds timeout

        this.peer.on('open', (id) => {
          clearTimeout(initTimeout);
          this.peerId = id;
          console.log('[P2P] Peer ID assigned:', id);
          this.updateState('disconnected');
          resolve(id);
        });

        this.peer.on('connection', (conn) => {
          console.log('[P2P] Incoming connection from:', conn.peer);
          this.handleIncomingConnection(conn);
        });

        this.peer.on('error', (err) => {
          clearTimeout(initTimeout);
          console.error('[P2P] Peer error:', err);
          this.updateState('error');
          this.callbacks.onError?.(err);
          reject(err);
        });

        this.peer.on('disconnected', () => {
          this.handleDisconnection();
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Connect to a remote peer
   */
  async connect(remotePeerId: string): Promise<void> {
    if (!this.peer) {
      console.error('[P2P] Cannot connect - peer not initialized');
      throw new Error('Peer not initialized');
    }
    
    console.log('[P2P] Attempting to connect to peer:', remotePeerId);
    this.updateState('connecting');
    
    try {
      // Generate ECDH key pair for secure key exchange (if crypto available)
      console.log('[P2P] Generating encryption key pair...');
      this.keyPair = await CryptoService.generateECDHKeyPair();
      if (this.keyPair) {
        console.log('[P2P] Key pair generated - encryption enabled');
      } else {
        console.warn('[P2P] Key pair generation failed - encryption disabled');
      }
      
      console.log('[P2P] Creating WebRTC connection...');
      this.connection = this.peer.connect(remotePeerId, {
        reliable: true,
        serialization: 'json',
      });

      console.log('[P2P] Setting up connection handlers...');
      this.setupConnectionHandlers(this.connection);
      
      // Add timeout for connection
      setTimeout(() => {
        if (this.connection && !this.connection.open && this.state === 'connecting') {
          console.log('[P2P] WebRTC direct connection not established - relay mode will be used');
          // Don't update to error state - relay is handling communication
          this.updateState('disconnected');
        }
      }, 15000);
    } catch (error) {
      console.error('[P2P] Connection failed:', error);
      this.updateState('error');
      throw error;
    }
  }

  /**
   * Handle incoming connection
   */
  private async handleIncomingConnection(conn: DataConnection) {
    console.log('[P2P] Incoming connection from:', conn.peer);
    this.connection = conn;
    this.updateState('connecting');
    
    // Generate key pair for incoming connection (if crypto available)
    console.log('[P2P] Generating encryption key pair for incoming connection...');
    this.keyPair = await CryptoService.generateECDHKeyPair();
    if (this.keyPair) {
      console.log('[P2P] Key pair generated - encryption enabled');
    } else {
      console.warn('[P2P] Key pair generation failed - encryption disabled');
    }
    
    this.setupConnectionHandlers(conn);
  }

  /**
   * Setup connection event handlers
   */
  private setupConnectionHandlers(conn: DataConnection) {
    // Log ICE connection state changes
    if (conn.peerConnection) {
      conn.peerConnection.oniceconnectionstatechange = () => {
        console.log('[P2P] ICE Connection State:', conn.peerConnection?.iceConnectionState);
      };
      conn.peerConnection.onconnectionstatechange = () => {
        console.log('[P2P] Connection State:', conn.peerConnection?.connectionState);
      };
    }
    
    conn.on('open', async () => {
      console.log('[P2P] ✅ Connection opened with peer:', conn.peer);
      
      // If encryption not available, mark as connected immediately
      if (!this.keyPair) {
        console.log('[P2P] ✓ Connection established WITHOUT encryption');
        this.updateState('connected');
        return;
      }
      
      console.log('[P2P] State remains "connecting" until encryption handshake completes');
      this.reconnectAttempts = 0;
      
      // Initiate key exchange
      console.log('[P2P] Initiating key exchange...');
      await this.initiateKeyExchange();
    });

    conn.on('data', async (data: any) => {
      console.log('[P2P] Received data:', data.type);
      await this.handleMessage(data);
    });

    conn.on('close', () => {
      console.log('[P2P] Connection closed');
      this.handleDisconnection();
    });

    conn.on('error', (err) => {
      console.error('[P2P] Connection error:', err);
      this.callbacks.onError?.(err);
      this.handleDisconnection();
    });
  }

  /**
   * Initiate secure key exchange using ECDH
   */
  private async initiateKeyExchange() {
    if (!this.keyPair) {
      console.error('[P2P] No key pair available for exchange');
      return;
    }

    const publicKey = await CryptoService.exportPublicKey(this.keyPair.publicKey);
    console.log('[P2P] Sending public key for exchange');
    
    this.sendRaw({
      type: 'key-exchange',
      data: { publicKey },
      timestamp: Date.now(),
    });
  }

  /**
   * Handle key exchange
   */
  private async handleKeyExchange(remotePublicKeyString: string) {
    if (!this.keyPair) {
      console.error('[P2P] No key pair available to handle exchange');
      return;
    }

    try {
      console.log('[P2P] Deriving shared encryption key...');
      const remotePublicKey = await CryptoService.importPublicKey(remotePublicKeyString);
      this.encryptionKey = await CryptoService.deriveSharedKey(
        this.keyPair.privateKey,
        remotePublicKey
      );
      console.log('[P2P] Encryption key established');

      // Send handshake confirmation
      this.sendRaw({
        type: 'handshake',
        data: { status: 'ready' },
        timestamp: Date.now(),
      });
      console.log('[P2P] Handshake sent - checking if both sides are ready');
      
      // If we received handshake, we're fully connected
      this.checkHandshakeComplete();
    } catch (error) {
      console.error('[P2P] Key exchange failed:', error);
      this.callbacks.onError?.(error as Error);
    }
  }

  /**
   * Check if handshake is complete (both sides have encryption key)
   */
  private checkHandshakeComplete() {
    if (this.encryptionKey && this.state === 'connecting') {
      console.log('[P2P] ✓ Encryption handshake complete - NOW CONNECTED');
      this.updateState('connected');
    }
  }

  /**
   * Handle incoming message
   */
  private async handleMessage(message: PeerMessage) {
    try {
      switch (message.type) {
        case 'key-exchange':
          await this.handleKeyExchange(message.data.publicKey);
          break;
        
        case 'handshake':
          console.log('[P2P] Received handshake confirmation from peer');
          this.checkHandshakeComplete();
          break;
        
        case 'text':
          if (this.encryptionKey && message.data.encrypted) {
            try {
              const decrypted = await CryptoService.decryptText(
                message.data.content,
                this.encryptionKey,
                message.data.iv
              );
              message.data.content = decrypted;
            } catch (error) {
              console.error('[P2P] Decryption failed:', error);
              // Use encrypted content as fallback
            }
          }
          this.callbacks.onMessage?.(message);
          break;
        
        case 'file-request':
          this.callbacks.onMessage?.(message);
          break;
        
        case 'file-accept':
          this.callbacks.onMessage?.(message);
          break;
        
        case 'file-chunk':
          await this.handleFileChunk(message);
          break;
        
        case 'typing':
        case 'read-receipt':
          this.callbacks.onMessage?.(message);
          break;
        
        default:
          this.callbacks.onMessage?.(message);
      }
    } catch (error) {
      console.error('Error handling message:', error);
      this.callbacks.onError?.(error as Error);
    }
  }

  /**
   * Send encrypted message
   */
  async sendMessage(content: string): Promise<void> {
    if (!this.connection || this.state !== 'connected') {
      console.error('[P2P] Cannot send message - state:', this.state, 'connection:', !!this.connection, 'connection.open:', this.connection?.open);
      throw new Error('Not connected to peer');
    }

    if (!this.connection.open) {
      console.error('[P2P] Connection exists but not open');
      throw new Error('Connection not established');
    }

    let messageData: any = { content, encrypted: false };

    // Only encrypt if key is available
    if (this.encryptionKey) {
      try {
        const encrypted = await CryptoService.encryptText(content, this.encryptionKey);
        messageData = {
          content: encrypted.encrypted,
          iv: encrypted.iv,
          encrypted: true,
        };
      } catch (error) {
        console.warn('[P2P] Encryption failed, sending unencrypted:', error);
      }
    } else {
      console.warn('[P2P] Sending message without encryption');
    }

    const message: PeerMessage = {
      type: 'text',
      data: messageData,
      timestamp: Date.now(),
      id: CryptoService.generateId(16),
    };

    try {
      this.connection.send(message);
      console.log('[P2P] Message sent successfully');
    } catch (error) {
      console.error('[P2P] Failed to send message:', error);
      throw new Error('Failed to send message');
    }
  }

  /**
   * Send file with optimized transfer engine
   */
  async sendFile(file: File): Promise<string> {
    if (!this.connection || this.state !== 'connected') {
      throw new Error('Not connected');
    }

    const transferId = CryptoService.generateId(16);

    // Prepare file with compression
    const { chunks, compressed, originalSize, compressedSize } = 
      await this.fileTransferEngine.prepareFile(file, transferId);

    // Calculate file hash
    const fileBuffer = await file.arrayBuffer();
    const fileHash = await CryptoService.hash(fileBuffer);

    // Send file request with optimization metadata
    this.connection.send({
      type: 'file-request',
      data: {
        id: transferId,
        name: file.name,
        size: file.size,
        type: file.type,
        chunks: chunks.length,
        hash: fileHash,
        compressed,
        originalSize,
        compressedSize,
      },
      timestamp: Date.now(),
    });

    return transferId;
  }

  /**
   * Accept file transfer and start receiving
   */
  acceptFileTransfer(transferId: string) {
    if (!this.connection) return;

    this.connection.send({
      type: 'file-accept',
      data: { id: transferId },
      timestamp: Date.now(),
    });
  }

  /**
   * Send file chunks with optimized engine
   */
  async sendFileChunks(transferId: string, file: File) {
    if (!this.connection || this.state !== 'connected') return;

    try {
      await this.fileTransferEngine.sendFileChunks(
        transferId,
        file,
        this.connection,
        this.encryptionKey || undefined,
        (progress: TransferProgress) => {
          this.callbacks.onFileProgress?.(progress.progress, transferId);
        }
      );
    } catch (error) {
      console.error('File transfer error:', error);
      throw error;
    }
  }

  /**
   * Handle incoming file chunk
   */
  private async handleFileChunk(message: PeerMessage) {
    const { id, chunk, total, data, iv } = message.data;

    let transfer = this.activeTransfers.get(id);
    if (!transfer) {
      transfer = {
        id,
        name: '',
        size: 0,
        type: '',
        chunks: total,
        receivedChunks: 0,
        data: new Array(total),
        hash: '',
        encrypted: !!iv,
      };
      this.activeTransfers.set(id, transfer);
    }

    // Decrypt chunk if encrypted
    let chunkData = CryptoService.base64ToArrayBuffer(data);
    if (iv && this.encryptionKey) {
      const ivBuffer = CryptoService.base64ToArrayBuffer(iv);
      chunkData = await CryptoService.decrypt(
        chunkData,
        this.encryptionKey,
        new Uint8Array(ivBuffer)
      );
    }

    transfer.data[chunk] = chunkData;
    transfer.receivedChunks++;

    const progress = (transfer.receivedChunks / transfer.chunks) * 100;
    this.callbacks.onFileProgress?.(progress, id);

    // Check if all chunks received
    if (transfer.receivedChunks === transfer.chunks) {
      await this.completeFileTransfer(id, transfer);
    }
  }

  /**
   * Complete file transfer
   */
  private async completeFileTransfer(id: string, transfer: FileTransfer) {
    // Combine all chunks
    const totalSize = transfer.data.reduce((acc, chunk) => acc + chunk.byteLength, 0);
    const combined = new Uint8Array(totalSize);
    let offset = 0;

    for (const chunk of transfer.data) {
      combined.set(new Uint8Array(chunk), offset);
      offset += chunk.byteLength;
    }

    // Verify hash if available
    if (transfer.hash) {
      const computedHash = await CryptoService.hash(combined.buffer);
      if (computedHash !== transfer.hash) {
        console.error('File hash mismatch!');
        this.callbacks.onError?.(new Error('File integrity check failed'));
        return;
      }
    }

    const blob = new Blob([combined], { type: transfer.type });
    this.callbacks.onFileComplete?.(blob, {
      id: transfer.id,
      name: transfer.name,
      size: transfer.size,
      type: transfer.type,
    });

    this.activeTransfers.delete(id);
  }

  /**
   * Send typing indicator
   */
  sendTyping(isTyping: boolean) {
    this.sendRaw({
      type: 'typing',
      data: { isTyping },
      timestamp: Date.now(),
    });
  }

  /**
   * Start screen sharing
   */
  async startScreenShare(): Promise<MediaStream> {
    if (!this.connection || this.state !== 'connected') {
      throw new Error('Not connected to peer');
    }

    if (!this.connection.open) {
      throw new Error('Connection not established');
    }

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always' } as any,
        audio: false,
      });

      this.sendRaw({
        type: 'screen-share',
        data: { started: true },
        timestamp: Date.now(),
      });

      const videoTrack = stream.getVideoTracks()[0];
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const video = document.createElement('video');
      video.srcObject = stream;
      video.play();

      const sendFrame = () => {
        if (!stream.active || this.state !== 'connected' || !this.connection?.open) return;
        
        // Scale down to max 640px width to reduce size
        const maxWidth = 640;
        const scale = Math.min(1, maxWidth / video.videoWidth);
        canvas.width = video.videoWidth * scale;
        canvas.height = video.videoHeight * scale;
        ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        canvas.toBlob(async (blob) => {
          if (blob && this.connection?.open) {
            // Check size limit (PeerJS has ~16MB limit, stay under 1MB for safety)
            if (blob.size > 1024 * 1024) {
              console.warn('Frame too large, skipping');
              return;
            }
            
            const arrayBuffer = await blob.arrayBuffer();
            const base64 = CryptoService.arrayBufferToBase64(arrayBuffer);
            
            // Split into smaller chunks if needed
            const chunkSize = 256 * 1024; // 256KB chunks
            const chunks = Math.ceil(base64.length / chunkSize);
            
            if (chunks > 1) {
              for (let i = 0; i < chunks; i++) {
                const start = i * chunkSize;
                const end = Math.min(start + chunkSize, base64.length);
                const chunk = base64.substring(start, end);
                
                this.sendRaw({
                  type: 'screen-chunk',
                  data: { 
                    frame: chunk, 
                    width: canvas.width, 
                    height: canvas.height,
                    chunkIndex: i,
                    totalChunks: chunks,
                    frameId: Date.now()
                  },
                  timestamp: Date.now(),
                });
              }
            } else {
              this.sendRaw({
                type: 'screen-chunk',
                data: { 
                  frame: base64, 
                  width: canvas.width, 
                  height: canvas.height,
                  chunkIndex: 0,
                  totalChunks: 1,
                  frameId: Date.now()
                },
                timestamp: Date.now(),
              });
            }
          }
        }, 'image/jpeg', 0.3); // Reduced quality to 30%

        setTimeout(sendFrame, 500); // Reduced to 2 FPS
      };

      video.onloadedmetadata = () => sendFrame();
      videoTrack.onended = () => this.stopScreenShare();

      return stream;
    } catch (error) {
      console.error('Screen share error:', error);
      throw error;
    }
  }

  stopScreenShare() {
    if (this.connection?.open) {
      this.sendRaw({
        type: 'screen-share',
        data: { stopped: true },
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Send raw message without encryption
   */
  private sendRaw(message: PeerMessage) {
    if (this.connection && this.connection.open) {
      this.connection.send(message);
    }
  }

  /**
   * Handle disconnection with reconnection logic
   */
  private handleDisconnection() {
    this.updateState('disconnected');
    this.connection = null;

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
      
      this.reconnectTimeout = setTimeout(() => {
        if (this.peer && !this.peer.destroyed && this.peer.disconnected) {
          try {
            this.peer.reconnect();
          } catch (error) {
            console.error('Reconnection error:', error);
            // Reset peer if reconnection fails
            this.peer.destroy();
            this.initialize();
          }
        }
      }, delay);
    }
  }

  /**
   * Update connection state
   */
  private updateState(newState: ConnectionState) {
    this.state = newState;
    this.callbacks.onStateChange?.(newState);
  }

  /**
   * Get current state
   */
  getState(): ConnectionState {
    return this.state;
  }

  /**
   * Get peer ID
   */
  getPeerId(): string {
    return this.peerId;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.state === 'connected' && this.connection?.open === true;
  }

  /**
   * Disconnect and cleanup
   */
  disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    
    if (this.connection) {
      this.connection.close();
      this.connection = null;
    }
    
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
    
    this.updateState('disconnected');
    this.encryptionKey = null;
    this.keyPair = null;
    this.activeTransfers.clear();
  }

  /**
   * Get connection statistics
   */
  getStats(): any {
    return {
      state: this.state,
      peerId: this.peerId,
      connected: this.isConnected(),
      encrypted: !!this.encryptionKey,
      activeTransfers: this.activeTransfers.size,
    };
  }
}
