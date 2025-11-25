/**
 * Optimized File Transfer Engine
 * Industry-standard features: parallel chunks, compression, adaptive sizing, pause/resume
 */

import pako from 'pako';
import { CryptoService } from './crypto';

export interface FileTransferConfig {
  chunkSize: number; // Base chunk size
  maxParallelChunks: number; // Number of chunks to send in parallel
  compressionThreshold: number; // Compress files larger than this
  enableCompression: boolean;
  adaptiveChunkSize: boolean;
  maxBandwidth?: number; // Bytes per second limit
}

export interface TransferProgress {
  transferId: string;
  progress: number;
  bytesTransferred: number;
  totalBytes: number;
  speed: number; // Bytes per second
  eta: number; // Seconds remaining
  status: 'pending' | 'active' | 'paused' | 'completed' | 'failed';
}

export interface ChunkMetadata {
  index: number;
  size: number;
  compressed: boolean;
  checksum: string;
}

export class OptimizedFileTransfer {
  private config: FileTransferConfig;
  private activeTransfers: Map<string, any> = new Map();
  private chunkQueues: Map<string, ChunkMetadata[]> = new Map();
  private pausedTransfers: Set<string> = new Set();
  private transferStats: Map<string, { startTime: number; bytesTransferred: number }> = new Map();

  constructor(config?: Partial<FileTransferConfig>) {
    this.config = {
      chunkSize: 64 * 1024, // 64KB default (optimized for WebRTC)
      maxParallelChunks: 4, // Send 4 chunks in parallel
      compressionThreshold: 1024 * 1024, // 1MB
      enableCompression: true,
      adaptiveChunkSize: true,
      maxBandwidth: undefined,
      ...config,
    };
  }

  /**
   * Prepare file for transfer with compression and chunking
   */
  async prepareFile(file: File, transferId: string): Promise<{
    chunks: ChunkMetadata[];
    compressed: boolean;
    originalSize: number;
    compressedSize: number;
  }> {
    const fileBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(fileBuffer);
    
    // Determine if compression is beneficial
    const shouldCompress = 
      this.config.enableCompression && 
      file.size > this.config.compressionThreshold &&
      !this.isAlreadyCompressed(file.type);

    let dataToChunk = uint8Array;
    let compressed = false;
    let compressedSize = file.size;

    if (shouldCompress) {
      try {
        // Use pako for gzip compression
        const compressedData = pako.gzip(uint8Array, { level: 6 });
        
        // Only use compressed if it's actually smaller
        if (compressedData.length < uint8Array.length * 0.9) {
          dataToChunk = compressedData;
          compressed = true;
          compressedSize = compressedData.length;
        }
      } catch (error) {
        console.warn('Compression failed, using original:', error);
      }
    }

    // Calculate optimal chunk size based on file size
    const chunkSize = this.getOptimalChunkSize(compressedSize);
    const totalChunks = Math.ceil(dataToChunk.length / chunkSize);
    
    // Create chunk metadata
    const chunks: ChunkMetadata[] = [];
    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, dataToChunk.length);
      const chunkData = dataToChunk.slice(start, end);
      
      // Calculate checksum for integrity
      const checksum = await this.calculateChecksum(chunkData);
      
      chunks.push({
        index: i,
        size: end - start,
        compressed,
        checksum,
      });
    }

    this.chunkQueues.set(transferId, chunks);

    return {
      chunks,
      compressed,
      originalSize: file.size,
      compressedSize,
    };
  }

  /**
   * Get optimal chunk size based on file size and network conditions
   */
  private getOptimalChunkSize(fileSize: number): number {
    if (!this.config.adaptiveChunkSize) {
      return this.config.chunkSize;
    }

    // Adaptive sizing based on file size
    if (fileSize < 1024 * 1024) {
      // Small files: 16KB chunks
      return 16 * 1024;
    } else if (fileSize < 10 * 1024 * 1024) {
      // Medium files: 64KB chunks
      return 64 * 1024;
    } else {
      // Large files: 256KB chunks
      return 256 * 1024;
    }
  }

  /**
   * Check if file type is already compressed
   */
  private isAlreadyCompressed(mimeType: string): boolean {
    const compressedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'video/',
      'audio/',
      'application/zip',
      'application/gzip',
      'application/x-rar',
      'application/x-7z-compressed',
    ];

    return compressedTypes.some(type => mimeType.startsWith(type));
  }

  /**
   * Calculate checksum for data integrity
   */
  private async calculateChecksum(data: Uint8Array): Promise<string> {
    const hashBuffer = await crypto.subtle.digest('SHA-256', data.buffer as ArrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
  }

  /**
   * Send file chunks with parallel transmission
   */
  async sendFileChunks(
    transferId: string,
    file: File,
    connection: any,
    encryptionKey?: CryptoKey,
    onProgress?: (progress: TransferProgress) => void
  ): Promise<void> {
    const fileBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(fileBuffer);
    
    // Get prepared chunks
    const chunks = this.chunkQueues.get(transferId);
    if (!chunks) {
      throw new Error('File not prepared. Call prepareFile first.');
    }

    // Initialize transfer stats
    this.transferStats.set(transferId, {
      startTime: Date.now(),
      bytesTransferred: 0,
    });

    const chunkSize = this.getOptimalChunkSize(file.size);
    const totalChunks = chunks.length;
    let sentChunks = 0;

    // Send chunks in parallel batches
    for (let i = 0; i < totalChunks; i += this.config.maxParallelChunks) {
      // Check if paused
      if (this.pausedTransfers.has(transferId)) {
        await this.waitForResume(transferId);
      }

      // Prepare batch of chunks
      const batchSize = Math.min(this.config.maxParallelChunks, totalChunks - i);
      const chunkPromises: Promise<void>[] = [];

      for (let j = 0; j < batchSize; j++) {
        const chunkIndex = i + j;
        const chunk = chunks[chunkIndex];
        
        const start = chunkIndex * chunkSize;
        const end = Math.min(start + chunkSize, uint8Array.length);
        const chunkData = uint8Array.slice(start, end);

        chunkPromises.push(
          this.sendSingleChunk(
            transferId,
            chunkIndex,
            totalChunks,
            chunkData,
            chunk,
            connection,
            encryptionKey
          )
        );
      }

      // Wait for batch to complete
      await Promise.all(chunkPromises);
      sentChunks += batchSize;

      // Update progress
      const stats = this.transferStats.get(transferId)!;
      stats.bytesTransferred = sentChunks * chunkSize;
      
      if (onProgress) {
        const elapsed = (Date.now() - stats.startTime) / 1000;
        const speed = stats.bytesTransferred / elapsed;
        const remaining = file.size - stats.bytesTransferred;
        const eta = remaining / speed;

        onProgress({
          transferId,
          progress: (sentChunks / totalChunks) * 100,
          bytesTransferred: stats.bytesTransferred,
          totalBytes: file.size,
          speed,
          eta,
          status: 'active',
        });
      }

      // Bandwidth throttling
      if (this.config.maxBandwidth) {
        const targetDelay = (chunkSize * batchSize) / this.config.maxBandwidth * 1000;
        await new Promise(resolve => setTimeout(resolve, targetDelay));
      }
    }

    // Cleanup
    this.chunkQueues.delete(transferId);
    this.transferStats.delete(transferId);
  }

  /**
   * Send a single chunk
   */
  private async sendSingleChunk(
    transferId: string,
    index: number,
    total: number,
    data: Uint8Array,
    metadata: ChunkMetadata,
    connection: any,
    encryptionKey?: CryptoKey
  ): Promise<void> {
    const buffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
    let chunkData: ArrayBuffer = buffer as ArrayBuffer;
    let iv: string | undefined;

    // Encrypt if key available
    if (encryptionKey) {
      const encrypted = await CryptoService.encrypt(chunkData, encryptionKey);
      chunkData = encrypted.encrypted;
      iv = CryptoService.arrayBufferToBase64(encrypted.iv.buffer as ArrayBuffer);
    }

    connection.send({
      type: 'file-chunk',
      data: {
        id: transferId,
        chunk: index,
        total,
        data: CryptoService.arrayBufferToBase64(chunkData),
        iv,
        compressed: metadata.compressed,
        checksum: metadata.checksum,
      },
      timestamp: Date.now(),
    });
  }

  /**
   * Pause a transfer
   */
  pauseTransfer(transferId: string): void {
    this.pausedTransfers.add(transferId);
  }

  /**
   * Resume a transfer
   */
  resumeTransfer(transferId: string): void {
    this.pausedTransfers.delete(transferId);
  }

  /**
   * Wait for transfer to resume
   */
  private async waitForResume(transferId: string): Promise<void> {
    return new Promise(resolve => {
      const checkInterval = setInterval(() => {
        if (!this.pausedTransfers.has(transferId)) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
    });
  }

  /**
   * Decompress received file data
   */
  async decompressFile(compressedData: Uint8Array): Promise<Uint8Array> {
    try {
      return pako.ungzip(compressedData);
    } catch (error) {
      console.error('Decompression failed:', error);
      throw new Error('Failed to decompress file');
    }
  }

  /**
   * Verify chunk integrity
   */
  async verifyChunk(data: Uint8Array, expectedChecksum: string): Promise<boolean> {
    const actualChecksum = await this.calculateChecksum(data);
    return actualChecksum === expectedChecksum;
  }
}
