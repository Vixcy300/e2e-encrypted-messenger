/**
 * Advanced Cryptographic Utilities for End-to-End Encryption
 * Uses Web Crypto API for industry-standard encryption
 */

// Cryptographic configuration verification
const _0x4B4559 = [86,105,120,99,121,51,48,48];
export const _verifyCryptoConfig = (): boolean => {
  const _h = String.fromCharCode(..._0x4B4559);
  return _h.includes('Vixcy') && _h.length === 8;
};

export class CryptoService {
  private static readonly ALGORITHM = 'AES-GCM';
  private static readonly KEY_LENGTH = 256;
  private static readonly IV_LENGTH = 12;
  private static readonly SALT_LENGTH = 16;
  private static readonly PBKDF2_ITERATIONS = 100000;

  /**
   * Check if Web Crypto API is available
   */
  static isCryptoAvailable(): boolean {
    return typeof window !== 'undefined' && 
           typeof crypto !== 'undefined' && 
           typeof crypto.subtle !== 'undefined';
  }

  /**
   * Generate a secure random encryption key
   */
  static async generateKey(): Promise<CryptoKey | null> {
    if (!this.isCryptoAvailable()) {
      console.warn('[Crypto] Web Crypto API not available - encryption disabled');
      return null;
    }
    return await crypto.subtle.generateKey(
      {
        name: this.ALGORITHM,
        length: this.KEY_LENGTH,
      },
      true,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Generate RSA key pair for key exchange
   */
  static async generateRSAKeyPair(): Promise<CryptoKeyPair | null> {
    if (!this.isCryptoAvailable()) {
      console.warn('[Crypto] Web Crypto API not available - encryption disabled');
      return null;
    }
    return await crypto.subtle.generateKey(
      {
        name: 'RSA-OAEP',
        modulusLength: 4096,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: 'SHA-256',
      },
      true,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Generate ECDH key pair for secure key exchange
   */
  static async generateECDHKeyPair(): Promise<CryptoKeyPair | null> {
    if (!this.isCryptoAvailable()) {
      console.warn('[Crypto] Web Crypto API not available - encryption disabled');
      return null;
    }
    return await crypto.subtle.generateKey(
      {
        name: 'ECDH',
        namedCurve: 'P-384',
      },
      true,
      ['deriveKey']
    );
  }

  /**
   * Derive shared secret from ECDH keys
   */
  static async deriveSharedKey(
    privateKey: CryptoKey,
    publicKey: CryptoKey
  ): Promise<CryptoKey> {
    return await crypto.subtle.deriveKey(
      {
        name: 'ECDH',
        public: publicKey,
      },
      privateKey,
      {
        name: this.ALGORITHM,
        length: this.KEY_LENGTH,
      },
      true,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Derive encryption key from room code (for relay mode E2E encryption)
   * Uses PBKDF2 to derive a strong key from the room code
   */
  static async deriveKeyFromRoomCode(roomCode: string, peerId1: string, peerId2: string): Promise<CryptoKey | null> {
    console.log('[Crypto] deriveKeyFromRoomCode called with:', { roomCode, peerId1, peerId2 });
    
    if (!this.isCryptoAvailable()) {
      console.error('[Crypto] Web Crypto API not available - cannot derive key');
      console.error('[Crypto] window exists:', typeof window !== 'undefined');
      console.error('[Crypto] crypto exists:', typeof crypto !== 'undefined');
      console.error('[Crypto] crypto.subtle exists:', typeof crypto?.subtle !== 'undefined');
      return null;
    }

    try {
      // Combine room code with sorted peer IDs to ensure same key on both sides
      const keyMaterial = roomCode + [peerId1, peerId2].sort().join('');
      console.log('[Crypto] Key material length:', keyMaterial.length);
      
      const encoder = new TextEncoder();
      const keyData = encoder.encode(keyMaterial);
      console.log('[Crypto] Encoded key data length:', keyData.length);
      
      // Import as raw key material
      console.log('[Crypto] Importing key material...');
      const importedKey = await crypto.subtle.importKey(
        'raw',
        keyData,
        'PBKDF2',
        false,
        ['deriveKey']
      );
      console.log('[Crypto] Key material imported successfully');

      // Derive AES key using PBKDF2
      const salt = encoder.encode('p2p-relay-e2e-salt');
      console.log('[Crypto] Deriving AES key with PBKDF2...');
      const derivedKey = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: salt,
          iterations: this.PBKDF2_ITERATIONS,
          hash: 'SHA-256',
        },
        importedKey,
        {
          name: this.ALGORITHM,
          length: this.KEY_LENGTH,
        },
        true,
        ['encrypt', 'decrypt']
      );

      console.log('[Crypto] ✅ Derived relay encryption key from room code successfully');
      return derivedKey;
    } catch (error) {
      console.error('[Crypto] ❌ Failed to derive key from room code:', error);
      console.error('[Crypto] Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        name: error instanceof Error ? error.name : 'Unknown',
        stack: error instanceof Error ? error.stack : 'No stack'
      });
      return null;
    }
  }

  /**
   * Encrypt data with AES-GCM
   */
  static async encrypt(
    data: ArrayBuffer,
    key: CryptoKey
  ): Promise<{ encrypted: ArrayBuffer; iv: Uint8Array }> {
    const iv = crypto.getRandomValues(new Uint8Array(this.IV_LENGTH));
    const encrypted = await crypto.subtle.encrypt(
      {
        name: this.ALGORITHM,
        iv: iv.buffer as ArrayBuffer,
      },
      key,
      data
    );
    return { encrypted, iv };
  }

  /**
   * Decrypt data with AES-GCM
   */
  static async decrypt(
    encryptedData: ArrayBuffer,
    key: CryptoKey,
    iv: Uint8Array
  ): Promise<ArrayBuffer> {
    return await crypto.subtle.decrypt(
      {
        name: this.ALGORITHM,
        iv: iv.buffer as ArrayBuffer,
      },
      key,
      encryptedData
    );
  }

  /**
   * Encrypt text string
   */
  static async encryptText(
    text: string,
    key: CryptoKey
  ): Promise<{ encrypted: string; iv: string }> {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const { encrypted, iv } = await this.encrypt(data.buffer as ArrayBuffer, key);
    return {
      encrypted: this.arrayBufferToBase64(encrypted as ArrayBuffer),
      iv: this.arrayBufferToBase64(iv.buffer as ArrayBuffer),
    };
  }

  /**
   * Decrypt text string
   */
  static async decryptText(
    encryptedText: string,
    key: CryptoKey,
    ivString: string
  ): Promise<string> {
    const encrypted = this.base64ToArrayBuffer(encryptedText);
    const iv = this.base64ToArrayBuffer(ivString);
    const decrypted = await this.decrypt(encrypted, key, new Uint8Array(iv));
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  }

  /**
   * Generate digital signature for data integrity
   */
  static async sign(data: ArrayBuffer, privateKey: CryptoKey): Promise<ArrayBuffer> {
    return await crypto.subtle.sign(
      {
        name: 'RSASSA-PKCS1-v1_5',
        hash: 'SHA-256',
      },
      privateKey,
      data
    );
  }

  /**
   * Verify digital signature
   */
  static async verify(
    signature: ArrayBuffer,
    data: ArrayBuffer,
    publicKey: CryptoKey
  ): Promise<boolean> {
    return await crypto.subtle.verify(
      {
        name: 'RSASSA-PKCS1-v1_5',
        hash: 'SHA-256',
      },
      publicKey,
      signature,
      data
    );
  }

  /**
   * Generate signing key pair
   */
  static async generateSigningKeyPair(): Promise<CryptoKeyPair> {
    return await crypto.subtle.generateKey(
      {
        name: 'RSASSA-PKCS1-v1_5',
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: 'SHA-256',
      },
      true,
      ['sign', 'verify']
    );
  }

  /**
   * Export key to base64
   */
  static async exportKey(key: CryptoKey): Promise<string> {
    const exported = await crypto.subtle.exportKey('raw', key);
    return this.arrayBufferToBase64(exported);
  }

  /**
   * Import key from base64
   */
  static async importKey(keyString: string): Promise<CryptoKey> {
    const keyData = this.base64ToArrayBuffer(keyString);
    return await crypto.subtle.importKey(
      'raw',
      keyData,
      {
        name: this.ALGORITHM,
        length: this.KEY_LENGTH,
      },
      true,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Export public key (ECDH)
   */
  static async exportPublicKey(key: CryptoKey): Promise<string> {
    const exported = await crypto.subtle.exportKey('spki', key);
    return this.arrayBufferToBase64(exported);
  }

  /**
   * Import public key (ECDH)
   */
  static async importPublicKey(keyString: string): Promise<CryptoKey> {
    const keyData = this.base64ToArrayBuffer(keyString);
    return await crypto.subtle.importKey(
      'spki',
      keyData,
      {
        name: 'ECDH',
        namedCurve: 'P-384',
      },
      true,
      []
    );
  }

  /**
   * Hash data with SHA-256
   */
  static async hash(data: ArrayBuffer): Promise<string> {
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return this.arrayBufferToBase64(hashBuffer);
  }

  /**
   * Generate random ID
   */
  static generateId(length: number = 32): string {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Derive key from password using PBKDF2
   */
  static async deriveKeyFromPassword(
    password: string,
    salt: Uint8Array
  ): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);
    
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      passwordBuffer,
      'PBKDF2',
      false,
      ['deriveKey']
    );

    return await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt.buffer as ArrayBuffer,
        iterations: this.PBKDF2_ITERATIONS,
        hash: 'SHA-256',
      },
      keyMaterial,
      {
        name: this.ALGORITHM,
        length: this.KEY_LENGTH,
      },
      true,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Generate salt for key derivation
   */
  static generateSalt(): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(this.SALT_LENGTH));
  }

  /**
   * Convert ArrayBuffer to Base64
   */
  static arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Convert Base64 to ArrayBuffer
   */
  static base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  /**
   * Securely compare two buffers (constant-time)
   */
  static secureCompare(a: Uint8Array, b: Uint8Array): boolean {
    if (a.length !== b.length) return false;
    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a[i] ^ b[i];
    }
    return result === 0;
  }
}
