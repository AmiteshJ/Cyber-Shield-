/**
 * src/pages/HoneypotLogs.jsx  (COMPLETE REWRITE — Real-Time)
 *
 * Connects to backend via Socket.IO for live attack events.
 * Fetches initial history + stats via REST on mount.
 * All data is real — sourced from the honeypot simulation engine.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { io as socketIO } from 'socket.io-client';
import axios from 'axios';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell,
} from 'recharts';

const BACKEND_URL = 'http://127.0.0.1:5000';

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS / HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const SEVERITY_CFG = {
  Critical: { color: '#ff003c', rgb: '255,0,60', dim: 'rgba(255,0,60,0.08)', border: 'rgba(255,0,60,0.25)', label: 'CRIT' },
  High: { color: '#f97316', rgb: '249,115,22', dim: 'rgba(249,115,22,0.08)', border: 'rgba(249,115,22,0.25)', label: 'HIGH' },
  Medium: { color: '#eab308', rgb: '234,179,8', dim: 'rgba(234,179,8,0.08)', border: 'rgba(234,179,8,0.25)', label: 'MED' },
  Low: { color: '#00f3ff', rgb: '0,243,255', dim: 'rgba(0,243,255,0.06)', border: 'rgba(0,243,255,0.2)', label: 'LOW' },
};

const FLAG = { US: '🇺🇸', DE: '🇩🇪', NL: '🇳🇱', SE: '🇸🇪', HK: '🇭🇰', RU: '🇷🇺', SG: '🇸🇬', IN: '🇮🇳', CA: '🇨🇦', GB: '🇬🇧', FR: '🇫🇷', CN: '🇨🇳', UA: '🇺🇦', XX: '🌐' };

const relativeTime = (isoString) => {
  const diff = (Date.now() - new Date(isoString).getTime()) / 1000;
  if (diff < 5) return 'just now';
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
};

// ─────────────────────────────────────────────────────────────────────────────
// ANIMATED CANVAS BACKGROUND
// ─────────────────────────────────────────────────────────────────────────────

const HoneypotBackground = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId, t = 0;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const origins = [
      { x: 0.10, y: 0.35 }, { x: 0.15, y: 0.20 }, { x: 0.20, y: 0.60 },
      { x: 0.55, y: 0.18 }, { x: 0.62, y: 0.38 }, { x: 0.68, y: 0.55 },
      { x: 0.78, y: 0.25 }, { x: 0.85, y: 0.45 }, { x: 0.88, y: 0.20 },
      { x: 0.32, y: 0.70 }, { x: 0.42, y: 0.78 }, { x: 0.92, y: 0.62 },
      { x: 0.07, y: 0.72 }, { x: 0.48, y: 0.10 }, { x: 0.72, y: 0.80 },
    ];
    const TARGET = { x: 0.5, y: 0.46 };

    class Packet {
      constructor() { this.reset(); }
      reset() {
        const o = origins[Math.floor(Math.random() * origins.length)];
        this.ox = o.x; this.oy = o.y;
        this.tx = TARGET.x; this.ty = TARGET.y;
        this.progress = Math.random();
        this.speed = 0.003 + Math.random() * 0.005;
        const colors = ['#ff003c', '#f97316', '#eab308', '#00f3ff'];
        this.color = colors[Math.floor(Math.random() * colors.length)];
        this.size = Math.random() * 2.2 + 1;
        this.cx = (o.x + TARGET.x) / 2 + (Math.random() - 0.5) * 0.25;
        this.cy = (o.y + TARGET.y) / 2 - 0.1 - Math.random() * 0.15;
      }
      bezier(t) {
        const mt = 1 - t;
        return {
          x: mt * mt * this.ox + 2 * mt * t * this.cx + t * t * this.tx,
          y: mt * mt * this.oy + 2 * mt * t * this.cy + t * t * this.ty,
        };
      }
      update() { this.progress += this.speed; if (this.progress >= 1) this.reset(); }
      draw(ctx, W, H) {
        const pos = this.bezier(this.progress);
        const prev = this.bezier(Math.max(0, this.progress - 0.07));
        ctx.beginPath();
        ctx.moveTo(prev.x * W, prev.y * H);
        ctx.lineTo(pos.x * W, pos.y * H);
        ctx.strokeStyle = this.color + '44';
        ctx.lineWidth = this.size * 0.55;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(pos.x * W, pos.y * H, this.size, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }

    const packets = Array.from({ length: 28 }, () => new Packet());
    const routes = origins.map(o => ({
      ox: o.x, oy: o.y,
      cx: (o.x + TARGET.x) / 2 + (Math.random() - 0.5) * 0.2,
      cy: (o.y + TARGET.y) / 2 - 0.1 - Math.random() * 0.1,
    }));
    const orbs = [
      { x: 0.05, y: 0.1, hue: 0, size: 0.28 },
      { x: 0.92, y: 0.15, hue: 20, size: 0.22 },
      { x: 0.08, y: 0.85, hue: 180, size: 0.18 },
      { x: 0.88, y: 0.82, hue: 200, size: 0.16 },
    ];
    const nodes = Array.from({ length: 18 }, () => ({
      x: Math.random(), y: Math.random(),
      vx: (Math.random() - 0.5) * 0.00025,
      vy: (Math.random() - 0.5) * 0.00025,
    }));

    const draw = () => {
      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#03060f';
      ctx.fillRect(0, 0, W, H);

      orbs.forEach((o, i) => {
        const pulse = Math.sin(t * 0.006 + i * 1.6) * 0.3 + 0.7;
        const r = o.size * Math.min(W, H) * pulse;
        const gx = o.x * W, gy = o.y * H;
        const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, r);
        g.addColorStop(0, `hsla(${o.hue},100%,55%,0.07)`);
        g.addColorStop(0.5, `hsla(${o.hue},100%,50%,0.025)`);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(gx, gy, r, 0, Math.PI * 2); ctx.fill();
      });

      for (let x = 0; x < W; x += 40) {
        for (let y = 0; y < H; y += 40) {
          const a = 0.02 + Math.sin(t * 0.012 + x * 0.008 + y * 0.008) * 0.01;
          ctx.beginPath(); ctx.arc(x, y, 0.7, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,60,0,${a})`; ctx.fill();
        }
      }

      routes.forEach(r => {
        ctx.beginPath();
        ctx.moveTo(r.ox * W, r.oy * H);
        ctx.quadraticCurveTo(r.cx * W, r.cy * H, TARGET.x * W, TARGET.y * H);
        ctx.strokeStyle = 'rgba(255,60,0,0.04)';
        ctx.lineWidth = 0.5;
        ctx.stroke();
      });

      origins.forEach(o => {
        const pulse = Math.sin(t * 0.04 + o.x * 10) * 0.4 + 0.6;
        ctx.beginPath();
        ctx.arc(o.x * W, o.y * H, 2.5 * pulse, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,60,0,${0.3 * pulse})`; ctx.fill();
        ctx.beginPath();
        ctx.arc(o.x * W, o.y * H, 6 * pulse, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255,60,0,${0.1 * pulse})`; ctx.lineWidth = 0.8; ctx.stroke();
      });

      const tpulse = Math.sin(t * 0.05) * 0.4 + 0.6;
      const tx = TARGET.x * W, ty = TARGET.y * H;
      for (let ring = 1; ring <= 3; ring++) {
        ctx.beginPath(); ctx.arc(tx, ty, ring * 20 * tpulse, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(0,243,255,${0.07 / ring})`; ctx.lineWidth = 0.8; ctx.stroke();
      }
      const tg = ctx.createRadialGradient(tx, ty, 0, tx, ty, 18);
      tg.addColorStop(0, 'rgba(0,243,255,0.35)'); tg.addColorStop(1, 'rgba(0,243,255,0)');
      ctx.fillStyle = tg; ctx.beginPath(); ctx.arc(tx, ty, 18, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(tx, ty, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = '#00f3ff'; ctx.shadowColor = '#00f3ff'; ctx.shadowBlur = 14; ctx.fill();
      ctx.shadowBlur = 0;

      packets.forEach(p => { p.update(); p.draw(ctx, W, H); });

      nodes.forEach(n => {
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0 || n.x > 1) n.vx *= -1;
        if (n.y < 0 || n.y > 1) n.vy *= -1;
      });
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = (nodes[i].x - nodes[j].x) * W, dy = (nodes[i].y - nodes[j].y) * H;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 130) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(255,60,0,${(1 - dist / 130) * 0.04})`;
            ctx.lineWidth = 0.4;
            ctx.moveTo(nodes[i].x * W, nodes[i].y * H);
            ctx.lineTo(nodes[j].x * W, nodes[j].y * H);
            ctx.stroke();
          }
        }
      }

      t++;
      animId = requestAnimationFrame(draw);
    };

    draw();
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize); };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-0" />;
};

// ─────────────────────────────────────────────────────────────────────────────
// STAT CHIP
// ─────────────────────────────────────────────────────────────────────────────

const StatChip = ({ label, value, color, blink }) => (
  <div className="flex flex-col items-center px-4 py-1.5" style={{ borderRight: '1px solid rgba(255,255,255,0.05)' }}>
    <span className="font-mono font-black" style={{ fontSize: 15, color, textShadow: `0 0 10px ${color}55` }}>
      {value}
      {blink && (
        <motion.span
          animate={{ opacity: [1, 0.2, 1] }}
          transition={{ duration: 0.8, repeat: Infinity }}
          style={{ width: 6, height: 12, background: color, display: 'inline-block', marginLeft: 4, verticalAlign: 'middle' }}
        />
      )}
    </span>
    <span className="font-mono uppercase tracking-widest" style={{ fontSize: 10, color: '#334155', marginTop: 1 }}>
      {label}
    </span>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// LOG ROW — single event
// ─────────────────────────────────────────────────────────────────────────────

const LogRow = ({ event, isNew }) => {
  const s = SEVERITY_CFG[event.severity] || SEVERITY_CFG.Low;
  const flag = FLAG[event.country] || '🌐';

  return (
    <motion.div
      initial={{ opacity: 0, x: -14, backgroundColor: 'rgba(255,255,255,0.05)' }}
      animate={{ opacity: 1, x: 0, backgroundColor: 'rgba(255,255,255,0)' }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="grid items-center font-mono px-3 py-2.5 rounded-lg hover:bg-white/[0.02] transition-colors"
      style={{
        gridTemplateColumns: '90px 130px 55px 160px 100px 1fr',
        gap: '0 10px',
        fontSize: 11,
        borderLeft: isNew ? `2px solid ${s.color}` : '2px solid transparent',
        transition: 'border-color 0.5s',
      }}
    >
      <span style={{ color: '#334155' }}>{new Date(event.created_at).toLocaleTimeString('en-US', { hour12: false })}</span>

      <span style={{ color: '#475569' }}>
        {flag} {event.ip}
      </span>

      <span style={{ color: '#334155' }}>:{event.port}</span>

      <span
        className="truncate font-bold"
        style={{ color: s.color }}
      >
        {event.attack_type}
      </span>

      <span>
        <span
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-bold uppercase"
          style={{
            fontSize: 10,
            color: s.color,
            background: s.dim,
            border: `1px solid ${s.border}`,
            letterSpacing: '0.06em',
          }}
        >
          <span style={{ width: 3.5, height: 3.5, borderRadius: '50%', background: s.color, display: 'inline-block' }} />
          {event.severity}
        </span>
      </span>

      <span className="truncate" style={{ color: '#1e3a5f' }}>{event.decoy_response}</span>
    </motion.div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOM TOOLTIP
// ─────────────────────────────────────────────────────────────────────────────

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'rgba(5,10,20,0.97)', border: '1px solid rgba(0,243,255,0.2)', borderRadius: 8, padding: '8px 14px' }}>
      <p style={{ fontFamily: 'monospace', fontSize: 11, color: '#8eb4d4', marginBottom: 4 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ fontFamily: 'monospace', fontSize: 12, color: p.color, fontWeight: 700 }}>
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

const HoneypotLogs = () => {
  const [events, setEvents] = useState([]);
  const [stats, setStats] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [services, setServices] = useState([]);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [newEventId, setNewEventId] = useState(null);
  const [epm, setEpm] = useState(0);

  const socketRef = useRef(null);
  const bottomRef = useRef(null);
  const epmTimer = useRef(null);
  const epmCount = useRef(0);

  // ── Initial REST fetch ──────────────────────────────────────────────────
  const fetchInitialData = useCallback(async () => {
    try {
      const [eventsRes, statsRes, tlRes, svcRes] = await Promise.all([
        axios.get(`${BACKEND_URL}/api/honeypot/events?limit=100`),
        axios.get(`${BACKEND_URL}/api/honeypot/stats`),
        axios.get(`${BACKEND_URL}/api/honeypot/timeline`),
        axios.get(`${BACKEND_URL}/api/honeypot/services`),
      ]);
      if (eventsRes.data.success) setEvents(eventsRes.data.data);
      if (statsRes.data.success) setStats(statsRes.data.data);
      if (tlRes.data.success) setTimeline(tlRes.data.data);
      if (svcRes.data.success) setServices(svcRes.data.data);
    } catch (err) {
      console.error('[Honeypot] Initial fetch error:', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Socket.IO connection ────────────────────────────────────────────────
  useEffect(() => {
    fetchInitialData();

    const socket = socketIO(BACKEND_URL, { transports: ['websocket'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('honeypot:subscribe');
      console.log('[Honeypot] Socket connected, subscribed to events');
    });

    socket.on('disconnect', () => {
      setConnected(false);
      console.log('[Honeypot] Socket disconnected');
    });

    // Receive history on initial subscribe
    socket.on('honeypot:history', (history) => {
      if (history && history.length > 0) {
        setEvents(history);
      }
      setLoading(false);
    });

    // Live event stream
    socket.on('honeypot:event', (event) => {
      setEvents(prev => {
        const updated = [event, ...prev].slice(0, 200);
        return updated;
      });
      setNewEventId(event.id);
      setTimeout(() => setNewEventId(null), 2000);

      // Track events per minute
      epmCount.current++;
    });

    // Live stats update
    socket.on('honeypot:stats', (newStats) => {
      setStats(newStats);
      setEpm(newStats.eventsPerMinute || 0);
    });

    // EPM counter — reset every 60s
    epmTimer.current = setInterval(() => {
      setEpm(epmCount.current);
      epmCount.current = 0;
    }, 60000);

    // Refresh timeline chart every 30s
    const tlInterval = setInterval(async () => {
      try {
        const res = await axios.get(`${BACKEND_URL}/api/honeypot/timeline`);
        if (res.data.success) setTimeline(res.data.data);
      } catch (_) { }
    }, 30000);

    return () => {
      socket.emit('honeypot:unsubscribe');
      socket.disconnect();
      clearInterval(epmTimer.current);
      clearInterval(tlInterval);
    };
  }, [fetchInitialData]);

  // ── Auto-scroll log ─────────────────────────────────────────────────────
  useEffect(() => {
    // Only scroll when new event arrives, and only if near bottom
    const container = bottomRef.current?.parentElement;
    if (!container) return;
    const atBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 120;
    if (atBottom) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [events]);

  // ── Filtered events ─────────────────────────────────────────────────────
  const filteredEvents = filter === 'ALL'
    ? events
    : events.filter(e => e.severity === filter);

  // ── Derived counts ──────────────────────────────────────────────────────
  const counts = {
    total: events.length,
    critical: events.filter(e => e.severity === 'Critical').length,
    high: events.filter(e => e.severity === 'High').length,
    medium: events.filter(e => e.severity === 'Medium').length,
    low: events.filter(e => e.severity === 'Low').length,
  };

  // Attack type breakdown from live events
  const typeMap = {};
  events.slice(0, 100).forEach(e => {
    typeMap[e.attack_type] = (typeMap[e.attack_type] || 0) + 1;
  });
  const typeBreakdown = Object.entries(typeMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([type, count]) => ({ type: type.replace(' ', '\n'), count }));

  // Top IPs
  const ipMap = {};
  events.slice(0, 200).forEach(e => {
    if (!ipMap[e.ip]) ipMap[e.ip] = { ip: e.ip, country: e.country, city: e.city, hits: 0 };
    ipMap[e.ip].hits++;
  });
  const topIPs = Object.values(ipMap).sort((a, b) => b.hits - a.hits).slice(0, 6);

  return (
    <div className="relative w-full" style={{ background: '#03060f', height: '100%', minHeight: 0 }}>
      <HoneypotBackground />

      {/* vignette */}
      <div
        className="absolute inset-0 pointer-events-none z-[1]"
        style={{ background: 'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.65) 100%)' }}
      />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 flex flex-col gap-3"
        style={{ height: '100%', padding: '16px 20px', minHeight: 0 }}
      >

        {/* ══ HEADER ══ */}
        <motion.div
          initial={{ opacity: 0, y: -14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-start justify-between shrink-0"
        >
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div style={{ width: 28, height: 1, background: 'rgba(255,60,0,0.6)' }} />
              <span className="font-mono uppercase tracking-[0.22em]" style={{ fontSize: 10, color: 'rgba(255,60,0,0.6)' }}>
                Module 05 / Deception Network
              </span>
            </div>
            <h1 className="font-display font-black tracking-tight" style={{ fontSize: 26, color: '#f1f5f9', letterSpacing: '-0.01em' }}>
              HONEYPOT
              <span style={{ color: '#ff003c', textShadow: '0 0 28px rgba(255,0,60,0.6)', marginLeft: 10 }}>
                MONITOR
              </span>
            </h1>
            <p className="font-mono mt-0.5" style={{ fontSize: 10, color: '#334155', letterSpacing: '0.1em' }}>
              LIVE DECEPTION TRAFFIC · REAL-TIME SOCKET.IO · {events.length} EVENTS CAPTURED
            </p>
          </div>

          {/* connection badge */}
          <div className="flex items-center gap-4">
            <div
              className="flex items-center gap-2 px-4 py-2 rounded-full"
              style={{
                background: connected ? 'rgba(57,255,20,0.06)' : 'rgba(255,0,60,0.06)',
                border: `1px solid ${connected ? 'rgba(57,255,20,0.25)' : 'rgba(255,0,60,0.25)'}`,
              }}
            >
              <motion.span
                className="rounded-full"
                style={{ width: 6, height: 6, background: connected ? '#39ff14' : '#ff003c', display: 'block', boxShadow: `0 0 8px ${connected ? '#39ff14' : '#ff003c'}` }}
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 0.8, repeat: Infinity }}
              />
              <span className="font-mono font-bold uppercase tracking-widest" style={{ fontSize: 11, color: connected ? '#39ff14' : '#ff003c' }}>
                {connected ? 'Socket Live' : 'Reconnecting…'}
              </span>
            </div>

            {/* EPM counter */}
            <div
              className="flex flex-col items-center px-4 py-2 rounded-xl"
              style={{ background: 'rgba(255,60,0,0.06)', border: '1px solid rgba(255,60,0,0.15)' }}
            >
              <span className="font-mono font-black" style={{ fontSize: 16, color: '#ff003c', textShadow: '0 0 10px rgba(255,0,60,0.5)' }}>
                {loading ? '—' : epm}
              </span>
              <span className="font-mono uppercase tracking-widest" style={{ fontSize: 10, color: '#334155' }}>events/min</span>
            </div>
          </div>
        </motion.div>

        {/* ══ STATS STRIP ══ */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex rounded-2xl overflow-hidden shrink-0"
          style={{ background: 'rgba(5,9,18,0.88)', border: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(16px)' }}
        >
          <StatChip label="Total Events" value={loading ? '…' : counts.total} color="#00f3ff" blink={connected} />
          <StatChip label="Critical" value={loading ? '…' : counts.critical} color="#ff003c" />
          <StatChip label="High" value={loading ? '…' : counts.high} color="#f97316" />
          <StatChip label="Medium" value={loading ? '…' : counts.medium} color="#eab308" />
          <StatChip label="Low" value={loading ? '…' : counts.low} color="#00f3ff" />

          {/* severity filter */}
          <div className="flex-1 flex items-center justify-end px-4 gap-2">
            {['ALL', 'Critical', 'High', 'Medium', 'Low'].map(f => {
              const cfg = SEVERITY_CFG[f] || { color: '#00f3ff' };
              const isActive = filter === f;
              return (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className="font-mono uppercase tracking-widest px-3 py-1 rounded-lg transition-all duration-150"
                  style={{
                    fontSize: 10,
                    color: isActive ? (f === 'ALL' ? '#00f3ff' : cfg.color) : '#334155',
                    background: isActive ? (f === 'ALL' ? 'rgba(0,243,255,0.08)' : SEVERITY_CFG[f]?.dim || 'rgba(0,243,255,0.08)') : 'transparent',
                    border: `1px solid ${isActive ? (f === 'ALL' ? 'rgba(0,243,255,0.2)' : SEVERITY_CFG[f]?.border || 'rgba(0,243,255,0.2)') : 'transparent'}`,
                  }}
                >
                  {f}
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* ══ MAIN GRID ══ */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-3 min-h-0 overflow-hidden">

          {/* ── LEFT: LOG + CHART ── */}
          <div className="flex flex-col gap-3 min-h-0 overflow-hidden">

            {/* Timeline chart */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="shrink-0 rounded-2xl overflow-hidden"
              style={{ background: 'rgba(5,9,18,0.88)', border: '1px solid rgba(255,255,255,0.07)', backdropFilter: 'blur(16px)' }}
            >
              <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold uppercase tracking-widest" style={{ fontSize: 11, color: '#94a3b8' }}>
                    Live Attack Timeline
                  </span>
                  <div className="px-2 py-0.5 rounded" style={{ background: 'rgba(255,60,0,0.08)', border: '1px solid rgba(255,60,0,0.2)' }}>
                    <span className="font-mono font-bold" style={{ fontSize: 10, color: '#ff003c', letterSpacing: '0.15em' }}>● LIVE</span>
                  </div>
                </div>
                <span className="font-mono" style={{ fontSize: 10, color: '#334155' }}>Last 15 minutes</span>
              </div>
              <div style={{ height: 100, padding: '8px 12px 4px' }}>
                {timeline.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={timeline} margin={{ top: 4, right: 4, left: -32, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#ff003c" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="#ff003c" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gradCritical" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#f97316" stopOpacity={0.4} />
                          <stop offset="100%" stopColor="#f97316" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="1 8" stroke="rgba(255,255,255,0.03)" vertical={false} />
                      <XAxis dataKey="time" stroke="transparent" tick={{ fill: '#334155', fontSize: 9, fontFamily: 'monospace' }} />
                      <YAxis stroke="transparent" tick={{ fill: '#334155', fontSize: 9, fontFamily: 'monospace' }} allowDecimals={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="total" name="Total" stroke="#ff003c" strokeWidth={1.5} fill="url(#gradTotal)" dot={false} />
                      <Area type="monotone" dataKey="critical" name="Critical" stroke="#f97316" strokeWidth={1} fill="url(#gradCritical)" dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <span className="font-mono" style={{ fontSize: 11, color: '#334155' }}>
                      {loading ? 'Loading timeline…' : 'Collecting data — events will appear in 1–2 minutes'}
                    </span>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Terminal log */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex-1 flex flex-col rounded-2xl overflow-hidden min-h-0"
              style={{ background: 'rgba(3,5,12,0.94)', border: '1px solid rgba(255,255,255,0.07)', backdropFilter: 'blur(20px)' }}
            >
              {/* chrome */}
              <div
                className="flex items-center justify-between px-5 py-3 shrink-0"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
              >
                <div className="flex items-center gap-3">
                  <div className="flex gap-1.5">
                    {['#ff003c', '#f59e0b', '#39ff14'].map((c, i) => (
                      <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: c, opacity: 0.6 }} />
                    ))}
                  </div>
                  <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.07)' }} />
                  <span className="font-mono uppercase tracking-widest" style={{ fontSize: 11, color: '#475569' }}>
                    honeypot@cybershield:~$
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono" style={{ fontSize: 10, color: '#334155' }}>
                    showing {filteredEvents.length} / {events.length}
                  </span>
                  {connected && (
                    <motion.span
                      style={{ width: 5, height: 5, borderRadius: '50%', background: '#39ff14', display: 'block', boxShadow: '0 0 6px #39ff14' }}
                      animate={{ opacity: [1, 0.3, 1] }}
                      transition={{ duration: 0.8, repeat: Infinity }}
                    />
                  )}
                </div>
              </div>

              {/* column headers */}
              <div
                className="grid px-3 py-2 shrink-0"
                style={{ gridTemplateColumns: '90px 130px 55px 160px 100px 1fr', gap: '0 10px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}
              >
                {['TIME', 'SOURCE IP', 'PORT', 'ATTACK TYPE', 'SEVERITY', 'DECOY RESPONSE'].map(h => (
                  <span key={h} className="font-mono uppercase tracking-widest" style={{ fontSize: 10, color: '#475569' }}>{h}</span>
                ))}
              </div>

              {/* rows */}
              <div className="flex-1 overflow-y-auto px-1 py-1 space-y-0.5 custom-scrollbar">
                {loading ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="flex flex-col items-center gap-3">
                      <motion.div
                        className="w-8 h-8 rounded-full border-2 border-t-transparent"
                        style={{ borderColor: '#ff003c transparent transparent transparent' }}
                        animate={{ rotate: 360 }}
                        transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
                      />
                      <span className="font-mono uppercase tracking-widest" style={{ fontSize: 11, color: '#334155' }}>
                        Connecting to honeypot…
                      </span>
                    </div>
                  </div>
                ) : filteredEvents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 gap-3">
                    <motion.div
                      animate={{ scale: [1, 1.06, 1], opacity: [0.4, 0.8, 0.4] }}
                      transition={{ duration: 2.5, repeat: Infinity }}
                      style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(255,60,0,0.06)', border: '1px solid rgba(255,60,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}
                    >
                      🕸️
                    </motion.div>
                    <span className="font-mono" style={{ fontSize: 11, color: '#334155' }}>
                      No {filter === 'ALL' ? '' : filter} events yet — waiting for attackers…
                    </span>
                  </div>
                ) : (
                  <AnimatePresence initial={false}>
                    {filteredEvents.map(event => (
                      <LogRow
                        key={event.id || `${event.ip}-${event.created_at}`}
                        event={event}
                        isNew={String(event.id) === String(newEventId)}
                      />
                    ))}
                  </AnimatePresence>
                )}
                <div ref={bottomRef} className="h-2" />
              </div>

              {/* terminal footer */}
              <div
                className="flex items-center gap-2 px-4 py-2 shrink-0"
                style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
              >
                <span className="font-mono font-bold" style={{ fontSize: 12, color: '#39ff14' }}>$</span>
                <span className="font-mono" style={{ fontSize: 11, color: '#334155' }}>
                  tail -f /var/log/honeypot/decoy.log --follow --severity={filter}
                </span>
                {connected && (
                  <motion.span
                    className="inline-block"
                    style={{ width: 6, height: 12, background: '#39ff14', marginLeft: 2 }}
                    animate={{ opacity: [1, 0, 1] }}
                    transition={{ duration: 0.8, repeat: Infinity }}
                  />
                )}
              </div>
            </motion.div>
          </div>

          {/* ── RIGHT SIDEBAR ── */}
          <motion.div
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.25 }}
            className="flex flex-col gap-3 overflow-y-auto custom-scrollbar"
          >

            {/* Attack type chart */}
            <div
              className="rounded-2xl p-4"
              style={{ background: 'rgba(5,9,18,0.9)', border: '1px solid rgba(255,255,255,0.07)', backdropFilter: 'blur(16px)', flexShrink: 0 }}
            >
              <p className="font-mono uppercase tracking-widest mb-3" style={{ fontSize: 12, color: '#475569' }}>
                Attack Types
              </p>
              {typeBreakdown.length > 0 ? (
                <div style={{ height: 130 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={typeBreakdown} layout="vertical" margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                      <XAxis type="number" hide />
                      <YAxis type="category" dataKey="type" width={90} tick={{ fill: '#475569', fontSize: 9, fontFamily: 'monospace' }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="count" name="Events" radius={[0, 4, 4, 0]}>
                        {typeBreakdown.map((_, i) => {
                          const colors = ['#ff003c', '#f97316', '#eab308', '#00f3ff', '#a855f7', '#39ff14'];
                          return <Cell key={i} fill={colors[i % colors.length]} fillOpacity={0.7} />;
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-20 flex items-center justify-center">
                  <span className="font-mono" style={{ fontSize: 10, color: '#334155' }}>Accumulating data…</span>
                </div>
              )}
            </div>

            {/* Top attacking IPs */}
            <div
              className="rounded-2xl p-4"
              style={{ background: 'rgba(5,9,18,0.9)', border: '1px solid rgba(255,255,255,0.07)', backdropFilter: 'blur(16px)', flexShrink: 0 }}
            >
              <p className="font-mono uppercase tracking-widest mb-3" style={{ fontSize: 12, color: '#475569' }}>
                Top Attackers
              </p>
              {topIPs.length === 0 ? (
                <span className="font-mono" style={{ fontSize: 11, color: '#334155' }}>No data yet</span>
              ) : (
                topIPs.map((ip, i) => (
                  <motion.div
                    key={ip.ip}
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="flex items-center justify-between py-2 font-mono"
                    style={{ borderBottom: i < topIPs.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none' }}
                  >
                    <div className="flex items-center gap-2">
                      <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#ff003c', display: 'block', opacity: 0.7 }} />
                      <div>
                        <p style={{ fontSize: 11, color: '#475569' }}>{ip.ip}</p>
                        <p style={{ fontSize: 10, color: '#334155' }}>{FLAG[ip.country] || '🌐'} {ip.city}</p>
                      </div>
                    </div>
                    <div
                      className="px-2 py-0.5 rounded font-bold"
                      style={{ fontSize: 11, color: '#ff003c', background: 'rgba(255,0,60,0.07)', border: '1px solid rgba(255,0,60,0.2)' }}
                    >
                      {ip.hits} hits
                    </div>
                  </motion.div>
                ))
              )}
            </div>

            {/* Decoy services */}
            <div
              className="rounded-2xl p-4"
              style={{ background: 'rgba(5,9,18,0.9)', border: '1px solid rgba(255,255,255,0.07)', backdropFilter: 'blur(16px)', flexShrink: 0 }}
            >
              <p className="font-mono uppercase tracking-widest mb-3" style={{ fontSize: 12, color: '#475569' }}>
                Decoy Services
              </p>
              {(services.length > 0 ? services : [
                { name: 'SSH Honeypot', port: 22, protocol: 'TCP', status: 'ACTIVE' },
                { name: 'MySQL Decoy', port: 3306, protocol: 'TCP', status: 'ACTIVE' },
                { name: 'Redis Trap', port: 6379, protocol: 'TCP', status: 'ACTIVE' },
                { name: 'HTTP Tar-pit', port: 8080, protocol: 'TCP', status: 'ACTIVE' },
                { name: 'RDP Honeypot', port: 3389, protocol: 'TCP', status: 'ACTIVE' },
                { name: 'FTP Decoy', port: 21, protocol: 'TCP', status: 'ACTIVE' },
                { name: 'SMTP Trap', port: 25, protocol: 'TCP', status: 'ACTIVE' },
                { name: 'Telnet Decoy', port: 23, protocol: 'TCP', status: 'ACTIVE' },
              ]).map(({ name, port, status }) => (
                <div
                  key={name}
                  className="flex items-center justify-between py-2 px-3 rounded-xl mb-1.5"
                  style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.04)' }}
                >
                  <div>
                    <p className="font-mono font-bold" style={{ fontSize: 11, color: '#475569' }}>{name}</p>
                    <p className="font-mono" style={{ fontSize: 11, color: '#334155' }}>:{port}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <motion.span
                      style={{ width: 5, height: 5, borderRadius: '50%', background: '#39ff14', display: 'block', boxShadow: '0 0 5px #39ff14' }}
                      animate={{ opacity: [1, 0.4, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity, delay: Math.random() * 1.5 }}
                    />
                    <span className="font-mono font-bold" style={{ fontSize: 10, color: '#39ff14', letterSpacing: '0.1em' }}>{status}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Live stats from backend */}
            {stats && (
              <div
                className="rounded-2xl p-4"
                style={{ background: 'rgba(5,9,18,0.9)', border: '1px solid rgba(255,255,255,0.07)', backdropFilter: 'blur(16px)', flexShrink: 0 }}
              >
                <p className="font-mono uppercase tracking-widest mb-3" style={{ fontSize: 12, color: '#475569' }}>
                  Engine Stats
                </p>
                {[
                  { label: 'Total Captured', val: stats.total?.toLocaleString() || '0' },
                  { label: 'Active Sessions', val: connected ? '1' : '0' },
                  { label: 'Decoy Services', val: stats.activeServices || 8 },
                  { label: 'Events / min', val: epm },
                ].map(({ label, val }) => (
                  <div key={label} className="flex justify-between py-1.5 font-mono" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 11 }}>
                    <span style={{ color: '#475569' }}>{label}</span>
                    <span style={{ color: '#94a3b8', fontWeight: 700 }}>{val}</span>
                  </div>
                ))}
              </div>
            )}

          </motion.div>
        </div>

        {/* ══ FOOTER ══ */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex items-center justify-between shrink-0"
          style={{ paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.05)' }}
        >
          <span className="font-mono uppercase tracking-[0.2em]" style={{ fontSize: 10, color: '#334155' }}>
            CyberShield AI · Honeypot Deception Engine v3 · Real-Time
          </span>
          <div className="flex items-center gap-4">
            {[
              { label: 'Socket.IO', active: connected },
              { label: 'DB Persist', active: true },
              { label: 'Tar-pit Active', active: true },
              { label: 'Threat Intel', active: true },
            ].map(({ label, active }) => (
              <div key={label} className="flex items-center gap-1.5">
                <span style={{ width: 4, height: 4, borderRadius: '50%', background: active ? '#39ff14' : '#ff003c', display: 'block' }} />
                <span className="font-mono" style={{ fontSize: 10, color: '#334155', letterSpacing: '0.12em' }}>{label}</span>
              </div>
            ))}
          </div>
        </motion.div>

      </motion.div>
    </div>
  );
};

export default HoneypotLogs;