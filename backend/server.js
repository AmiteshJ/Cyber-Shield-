import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import apiRoutes from './routes/api.js';
import cveRoutes from './routes/cve.js'
import policyRoutes from './routes/policy.js';

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const app = express();
const httpServer = createServer(app);

// Setup Socket.IO for real-time dashboard updates
const io = new Server(httpServer, {
  cors: {
    origin: '*', // Allow all origins for the hackathon
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());
app.use('/api', cveRoutes);
app.use('/api', policyRoutes);

// Pass io instance to routes via middleware
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Use API routes
app.use('/api', apiRoutes);

// Socket.io connection logic
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () => {
  console.log(`[+] Server running on port ${PORT}`);
});
