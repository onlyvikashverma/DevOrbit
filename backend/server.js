import express from 'express';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
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

// Enable CORS for frontend (Multiple origins support)
const allowedOrigins = process.env.FRONTEND_URL 
  ? process.env.FRONTEND_URL.split(',').map(url => url.trim()) 
  : ['http://localhost:5173'];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Check if origin matches allowed list or is a Vercel subdomain for this project
    const isVercelSubdomain = origin.includes('onlyvikashvermas-projects.vercel.app');
    
    if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes('*') || isVercelSubdomain) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

app.use(express.json());

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  socket.on('code_change', (data) => {
    socket.broadcast.emit('code_update', { newCode: data.newCode });
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
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

