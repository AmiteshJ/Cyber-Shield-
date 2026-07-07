/**
 * FINAL MERGED SERVER.JS
 *
 * Features:
 * ✅ Auth + API + CVE + Policy routes
 * ✅ Honeypot routes + real-time simulation
 * ✅ Socket.IO integration
 * ✅ Dual .env loading (root + backend)
 * ✅ AI Email Security Agent
 */

import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';

import path from 'path';
import { fileURLToPath } from 'url';

// Routes
import apiRoutes from './routes/api.js';
import cveRoutes from './routes/cve.js';
import policyRoutes from './routes/policy.js';
import authRoutes from './routes/auth.js';

// 🔥 NEW: Honeypot
import honeypotRoutes, { startHoneypotSimulation } from './routes/honeypot.js';

// 🔥 Services
import { startEmailAgent } from './services/aiEmailAgent.js';

// ✅ Fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Load BOTH env files (prioritize root .env variables for 1bycosone@gmail.com)
dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const httpServer = createServer(app);

// ── Socket.IO ─────────────────────────────────────────────
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// ── Middleware ─────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ✅ Pass io globally
app.use((req, res, next) => {
  req.io = io;
  next();
});

// ── Routes ────────────────────────────────────────────────
app.use('/api', cveRoutes);
app.use('/api', policyRoutes);
app.use('/api/auth', authRoutes);

// 🔥 Honeypot endpoints
app.use('/api', honeypotRoutes);

app.use('/api', apiRoutes);

// ── Socket Connection ─────────────────────────────────────
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// 🔥 Start Honeypot Engine (real-time attacks simulation)
startHoneypotSimulation(io);

// ── Server Start ──────────────────────────────────────────
const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () => {
  console.log(`[+] Server running on port ${PORT}`);

  // 🔥 Start AI Email Agent
  startEmailAgent(io);

  console.log(`[+] Honeypot simulation engine armed`);
});