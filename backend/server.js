import express from 'express';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import { spawn } from 'child_process';
import fileRoutes from './src/routes/fileRoutes.js';
import executeRoutes from './src/routes/executeRoutes.js';
import authRoutes from './src/routes/authRoutes.js';

dotenv.config();

console.log('--- DevOrbit Backend Initialization ---');
console.log('Loaded Environment Variables:', {
  PORT: process.env.PORT,
  MONGODB_URI: process.env.MONGODB_URI ? 'SET' : 'MISSING',
});


const app = express();
const server = http.createServer(app);

// Global presence state
const onlineUsers = new Map();
const USER_COLORS = ['#38bdf8', '#c084fc', '#4ade80', '#fb923c', '#f472b6', '#fbbf24'];

// Enable CORS for frontend (Multiple origins support)
const allowedOrigins = process.env.FRONTEND_URL 
  ? process.env.FRONTEND_URL.split(',').map(url => url.trim()) 
  : ['http://localhost:5173'];

// Reusable CORS check function
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Check if origin matches allowed list or is a Vercel subdomain for this project
    const isVercelSubdomain = 
      origin.includes('onlyvikashvermas-projects.vercel.app') || 
      origin.includes('devorbit-one.vercel.app') ||
      origin.includes('devorbit.vercel.app');
    
    if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes('*') || isVercelSubdomain) {
      callback(null, true);
    } else {
      console.warn(`Blocked by CORS: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());

// Initialize Socket.io with the same CORS options
const io = new Server(server, {
  cors: corsOptions
});

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);
  
  // Assign a random identity for presence if not logged in
  const userId = socket.handshake.query.userId || `guest-${socket.id.slice(0,4)}`;
  const userName = socket.handshake.query.userName || `Anonymous ${socket.id.slice(0,3)}`;
  const userColor = USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)];

  onlineUsers.set(socket.id, {
    id: socket.id,
    userId,
    userName,
    userColor,
    fileId: null,
    cursor: { line: 1, col: 1 }
  });

  // Broadcast the updated user list to everyone
  io.emit('presence-update', Array.from(onlineUsers.values()));

  // Persistent shell for terminal (Platform independent)
  const isWindows = process.platform === 'win32';
  const shellCommand = isWindows ? 'powershell.exe' : 'bash';
  const shellArgs = isWindows ? ['-NoExit', '-Command', '-'] : [];

  let shell;
  try {
    shell = spawn(shellCommand, shellArgs, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: process.env,
      shell: isWindows // Fix ENOENT on Windows by wrapping in cmd.exe
    });

    shell.stdout.on('data', (data) => socket.emit('terminal-output', data.toString()));
    shell.stderr.on('data', (data) => socket.emit('terminal-output', `[ERR] ${data.toString()}`));

    shell.on('error', (err) => {
      console.error('Failed to spawn shell:', err);
      socket.emit('terminal-output', `\r\n[SYSTEM] Failed to start terminal: ${err.message}\r\n`);
    });

  } catch (err) {
    console.error('Synchronous error spawning shell:', err);
    socket.emit('terminal-output', `\r\n[SYSTEM] Failed to start terminal: ${err.message}\r\n`);
  }

  socket.on('terminal-input', (data) => {
    if (shell && shell.stdin && shell.stdin.writable) shell.stdin.write(data);
  });

  // --- Collaboration Events ---
  socket.on('cursor-move', (data) => {
    const user = onlineUsers.get(socket.id);
    if (user) {
      user.fileId = data.fileId;
      user.cursor = data.cursor;
      // Broadcast to everyone else
      socket.broadcast.emit('remote-cursor-move', {
        id: socket.id,
        userName: user.userName,
        userColor: user.userColor,
        fileId: data.fileId,
        cursor: data.cursor
      });
    }
  });

  socket.on('code_change', (data) => {
    socket.broadcast.emit('code_update', { fileId: data.fileId, newCode: data.newCode });
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    onlineUsers.delete(socket.id);
    io.emit('presence-update', Array.from(onlineUsers.values()));
    
    if (shell) {
      try {
        shell.kill();
      } catch (err) {
        console.error('Error killing shell on disconnect:', err.message);
      }
    }
  });
});

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/devorbit')
  .then(() => console.log('📦 Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/execute', executeRoutes);

// Basic Health Route
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'DevOrbit Backend Operational 🚀' });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`\n🚀 DevOrbit Backend Ready!`);
  console.log(`📡 Listening on: http://localhost:${PORT}`);
  console.log(`🔧 Execution Engine: Piston API (Multi-language)`);
  console.log(`----------------------------------------\n`);
});

