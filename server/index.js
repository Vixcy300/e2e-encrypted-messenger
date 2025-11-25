const { createServer } = require('http');
const express = require('express');
const { Server } = require('socket.io');
const { PeerServer } = require('peer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3001;
const PEER_PORT = process.env.PEER_PORT || 9000;
const JWT_SECRET = process.env.JWT_SECRET || 'secure-p2p-secret-change-in-production-' + Math.random().toString(36);
const USERS_DB_PATH = path.join(__dirname, 'users.json');

const app = express();

app.use(helmet({
  contentSecurityPolicy: false, 
  crossOriginEmbedderPolicy: false,
}));

// Dynamic CORS for local network - accepts any local IP
const isLocalNetwork = (origin) => {
  if (!origin) return false;
  const url = new URL(origin);
  const hostname = url.hostname;
  // Allow localhost, 127.x.x.x, 10.x.x.x, 172.16-31.x.x, 192.168.x.x
  return hostname === 'localhost' ||
         hostname === '127.0.0.1' ||
         hostname.startsWith('10.') ||
         hostname.startsWith('192.168.') ||
         /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname);
};

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc) or local network IPs
    if (!origin || isLocalNetwork(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));

// Rate limiters
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requests per window
  message: { error: 'Too many authentication attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
  message: { error: 'Too many requests, please slow down' },
});

// Create HTTP server
const httpServer = createServer(app);

// Create Socket.IO server with CORS
const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      // Allow all local network origins for offline/hotspot use
      if (!origin || isLocalNetwork(origin)) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Create PeerJS server
const peerServer = PeerServer({
  port: PEER_PORT,
  path: '/peerjs',
  host: '0.0.0.0',
  allow_discovery: true,
  proxied: false,
});

// User database functions
function loadUsers() {
  try {
    if (fs.existsSync(USERS_DB_PATH)) {
      const data = fs.readFileSync(USERS_DB_PATH, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading users:', error);
  }
  return {};
}

function saveUsers(users) {
  try {
    fs.writeFileSync(USERS_DB_PATH, JSON.stringify(users, null, 2));
  } catch (error) {
    console.error('Error saving users:', error);
  }
}

function sanitizeInput(input) {
  if (typeof input !== 'string') return '';
  return input.trim().replace(/[<>"'/\\]/g, '');
}

function generateToken(user) {
  return jwt.sign(
    { 
      username: user.username,
      userId: user.id,
      timestamp: Date.now()
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

// Initialize users database
const users = loadUsers();

// Room management
const rooms = new Map();
const peerToRoom = new Map();
const activeSessions = new Map(); // Track active user sessions

// Connection statistics
let totalConnections = 0;
let activeRooms = 0;

// Failed login tracking for rate limiting
const failedLogins = new Map();

// REST API Endpoints

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// Register endpoint
app.post('/api/auth/register', authLimiter, async (req, res) => {
  try {
    const { username, password, email } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const cleanUsername = sanitizeInput(username);
    const cleanEmail = email ? sanitizeInput(email) : '';

    // Validate username format
    if (cleanUsername.length < 3 || cleanUsername.length > 20) {
      return res.status(400).json({ error: 'Username must be between 3 and 20 characters' });
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(cleanUsername)) {
      return res.status(400).json({ error: 'Username can only contain letters, numbers, underscore and dash' });
    }

    // Validate password strength
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    // Check if user exists
    if (users[cleanUsername]) {
      return res.status(409).json({ error: 'Username already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = {
      id: Math.random().toString(36).substring(2, 15),
      username: cleanUsername,
      email: cleanEmail,
      password: hashedPassword,
      created: Date.now(),
      lastLogin: Date.now(),
    };

    users[cleanUsername] = user;
    saveUsers(users);

    // Generate token
    const token = generateToken(user);

    console.log(`New user registered: ${cleanUsername}`);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        created: user.created,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login endpoint
app.post('/api/auth/login', authLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const cleanUsername = sanitizeInput(username);
    const clientIp = req.ip || req.connection.remoteAddress;

    // Check for too many failed attempts from this IP
    const failedAttempts = failedLogins.get(clientIp) || { count: 0, timestamp: Date.now() };
    if (failedAttempts.count >= 5 && Date.now() - failedAttempts.timestamp < 15 * 60 * 1000) {
      return res.status(429).json({ error: 'Too many failed login attempts. Try again in 15 minutes.' });
    }

    // Find user
    const user = users[cleanUsername];
    if (!user) {
      // Record failed attempt
      failedLogins.set(clientIp, { count: failedAttempts.count + 1, timestamp: Date.now() });
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      failedLogins.set(clientIp, { count: failedAttempts.count + 1, timestamp: Date.now() });
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Clear failed attempts on successful login
    failedLogins.delete(clientIp);

    // Update last login
    user.lastLogin = Date.now();
    saveUsers(users);

    // Generate token
    const token = generateToken(user);

    console.log(`User logged in: ${cleanUsername}`);

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        lastLogin: user.lastLogin,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Verify token endpoint
app.post('/api/auth/verify', apiLimiter, (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const user = users[decoded.username];
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    res.json({
      valid: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
    });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
});

// Socket.IO authentication middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  
  if (!token) {
    return next(new Error('Authentication required'));
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return next(new Error('Invalid token'));
  }

  socket.user = decoded;
  activeSessions.set(socket.id, decoded);
  next();
});

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id} (User: ${socket.user.username})`);
  totalConnections++;

  // Create or join room
  socket.on('create-room', ({ roomCode, peerId }) => {
    console.log(`Creating room: ${roomCode} for peer: ${peerId}`);
    
    if (rooms.has(roomCode)) {
      socket.emit('room-error', { message: 'Room already exists' });
      return;
    }

    rooms.set(roomCode, {
      host: peerId,
      hostSocket: socket.id,
      guest: null,
      guestSocket: null,
      created: Date.now(),
    });

    peerToRoom.set(peerId, roomCode);
    socket.join(roomCode);
    activeRooms++;

    socket.emit('room-created', { roomCode, peerId });
    console.log(`Room created: ${roomCode}`);
  });

  socket.on('join-room', ({ roomCode, peerId }) => {
    console.log(`Peer ${peerId} attempting to join room: ${roomCode}`);
    
    const room = rooms.get(roomCode);
    
    if (!room) {
      socket.emit('room-error', { message: 'Room not found' });
      return;
    }

    if (room.guest) {
      socket.emit('room-error', { message: 'Room is full' });
      return;
    }

    room.guest = peerId;
    room.guestSocket = socket.id;
    peerToRoom.set(peerId, roomCode);
    socket.join(roomCode);

    // Notify both peers
    socket.emit('room-joined', { roomCode, peerId, hostPeerId: room.host });
    io.to(room.hostSocket).emit('peer-joined', { peerId });

    console.log(`Peer ${peerId} joined room: ${roomCode}`);
  });

  // Signal relay
  socket.on('signal', ({ to, signal, from }) => {
    io.to(to).emit('signal', { signal, from });
  });

  // Offer/Answer exchange
  socket.on('offer', ({ to, offer, from }) => {
    io.to(to).emit('offer', { offer, from });
  });

  socket.on('answer', ({ to, answer, from }) => {
    io.to(to).emit('answer', { answer, from });
  });

  // ICE candidate exchange
  socket.on('ice-candidate', ({ to, candidate, from }) => {
    io.to(to).emit('ice-candidate', { candidate, from });
  });

  // Typing indicator
  socket.on('typing', ({ roomCode, isTyping }) => {
    socket.to(roomCode).emit('typing', { isTyping });
  });

  // Relay messages when P2P fails (fallback) - E2E encrypted
  socket.on('relay-message', ({ roomCode, message, encrypted, iv }) => {
    console.log(`Relaying ${encrypted ? 'encrypted' : 'plain text'} message in room ${roomCode}`);
    socket.to(roomCode).emit('relay-message', { message, encrypted, iv });
  });

  // Chunked file transfer relay
  socket.on('relay-file-start', ({ roomCode, fileId, name, size, type, totalChunks }) => {
    console.log(`Starting file relay "${name}" (${size} bytes, ${totalChunks} chunks) in room ${roomCode}`);
    socket.to(roomCode).emit('relay-file-start', { fileId, name, size, type, totalChunks });
  });

  socket.on('relay-file-chunk', ({ roomCode, fileId, chunkIndex, totalChunks, data }) => {
    console.log(`Relaying file chunk ${chunkIndex + 1}/${totalChunks} for ${fileId} in room ${roomCode} (${data.length} bytes)`);
    socket.to(roomCode).emit('relay-file-chunk', { fileId, chunkIndex, totalChunks, data });
  });

  socket.on('relay-file-complete', ({ roomCode, fileId }) => {
    console.log(`File transfer complete for ${fileId} in room ${roomCode}`);
    socket.to(roomCode).emit('relay-file-complete', { fileId });
  });

  // Screen share relay
  socket.on('screen-frame', ({ roomCode, frame }) => {
    // Forward screen frame to other peer in room
    socket.to(roomCode).emit('screen-frame', { frame });
  });

  socket.on('screen-share-start', ({ roomCode }) => {
    console.log(`Screen share started in room ${roomCode}`);
    socket.to(roomCode).emit('screen-share-start');
  });

  socket.on('screen-share-stop', ({ roomCode }) => {
    console.log(`Screen share stopped in room ${roomCode}`);
    socket.to(roomCode).emit('screen-share-stop');
  });

  // Presence and heartbeat
  socket.on('heartbeat', ({ peerId }) => {
    socket.emit('heartbeat-ack', { 
      timestamp: Date.now(),
      user: socket.user.username,
      connected: true
    });
  });

  // Reconnection support
  socket.on('reconnect-session', ({ sessionId, peerId }) => {
    console.log(`Session reconnection attempt: ${sessionId} (User: ${socket.user.username})`);
    socket.emit('session-restored', { 
      success: true,
      timestamp: Date.now()
    });
  });

  // Leave room
  socket.on('leave-room', ({ roomCode, peerId }) => {
    handleLeaveRoom(socket, roomCode, peerId);
  });

  // Disconnection
  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id} (User: ${socket.user?.username || 'unknown'})`);
    totalConnections--;
    activeSessions.delete(socket.id);

    // Find and clean up room
    for (const [peerId, roomCode] of peerToRoom.entries()) {
      const room = rooms.get(roomCode);
      if (room && (room.hostSocket === socket.id || room.guestSocket === socket.id)) {
        handleLeaveRoom(socket, roomCode, peerId);
      }
    }
  });

  // Get room info
  socket.on('get-room-info', ({ roomCode }) => {
    const room = rooms.get(roomCode);
    if (room) {
      socket.emit('room-info', {
        exists: true,
        hasGuest: !!room.guest,
        created: room.created,
      });
    } else {
      socket.emit('room-info', { exists: false });
    }
  });

  // Statistics
  socket.on('get-stats', () => {
    socket.emit('stats', {
      totalConnections,
      activeRooms,
      timestamp: Date.now(),
    });
  });
});

// Handle room cleanup
function handleLeaveRoom(socket, roomCode, peerId) {
  const room = rooms.get(roomCode);
  if (!room) return;

  console.log(`Peer ${peerId} leaving room: ${roomCode}`);

  // Notify other peer
  if (room.host === peerId && room.guestSocket) {
    io.to(room.guestSocket).emit('peer-left', { peerId });
  } else if (room.guest === peerId && room.hostSocket) {
    io.to(room.hostSocket).emit('peer-left', { peerId });
  }

  // Clean up
  peerToRoom.delete(peerId);
  socket.leave(roomCode);

  // Remove room if empty or host left
  if (room.host === peerId || !room.guest) {
    rooms.delete(roomCode);
    activeRooms--;
    console.log(`Room ${roomCode} deleted`);
  } else {
    // Guest left, keep room for host
    room.guest = null;
    room.guestSocket = null;
  }
}

// Periodic cleanup of stale rooms and failed login attempts
setInterval(() => {
  const now = Date.now();
  const maxAge = 24 * 60 * 60 * 1000; // 24 hours

  // Clean up stale rooms
  for (const [roomCode, room] of rooms.entries()) {
    if (now - room.created > maxAge) {
      console.log(`Cleaning up stale room: ${roomCode}`);
      rooms.delete(roomCode);
      activeRooms--;
    }
  }

  // Clean up old failed login attempts
  for (const [ip, data] of failedLogins.entries()) {
    if (now - data.timestamp > 15 * 60 * 1000) {
      failedLogins.delete(ip);
    }
  }
}, 60 * 60 * 1000); // Check every hour

// Start servers
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🔒 Secure P2P Server Started`);
  console.log(`✓ API Server: http://0.0.0.0:${PORT}`);
  console.log(`✓ Socket.IO: ws://0.0.0.0:${PORT}`);
  console.log(`✓ PeerJS Server: http://0.0.0.0:${PEER_PORT}`);
  console.log(`✓ Authentication: JWT with bcrypt`);
  console.log(`✓ Rate Limiting: Enabled`);
  console.log(`✓ Security Headers: Enabled`);
  console.log(`\n📡 Ready for secure connections\n`);
});

peerServer.on('connection', (client) => {
  console.log(`PeerJS client connected: ${client.getId()}`);
});

peerServer.on('disconnect', (client) => {
  console.log(`PeerJS client disconnected: ${client.getId()}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
