import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Activity, ShieldAlert, Cpu, AlertTriangle } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import axios from 'axios';
import { io } from 'socket.io-client';

const BACKEND_URL = 'http://127.0.0.1:5000';

// Initialize socket globally so it doesn't disconnect on unmount
const socket = io(BACKEND_URL);

const getRelativeTime = (dateString) => {
  const date = new Date(dateString + (dateString.includes('Z') ? '' : 'Z'));
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);
  if (diffInSeconds < 0) return 'Just now';
  if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  return `${Math.floor(diffInHours / 24)}d ago`;
};

/* ─────────────────────────────────────────────
   BACKGROUND — radar sweep + hex grid + pulses
───────────────────────────────────────────── */
const CyberBackground = () => {
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

    // Hex grid points
    const hexPoints = [];
    const HEX_SIZE = 48;
    const cols = Math.ceil(canvas.width / (HEX_SIZE * 1.75)) + 2;
    const rows = Math.ceil(canvas.height / (HEX_SIZE * 1.52)) + 2;
    for (let r = -1; r < rows; r++) {
      for (let c = -1; c < cols; c++) {
        const x = c * HEX_SIZE * 1.75;
        const y = r * HEX_SIZE * 1.52 + (c % 2 === 0 ? 0 : HEX_SIZE * 0.76);
        hexPoints.push({ x, y, pulse: Math.random() * Math.PI * 2 });
      }
    }

    // Floating orbs
    const orbs = Array.from({ length: 5 }, (_, i) => ({
      x: (canvas.width / 6) * (i + 1),
      y: canvas.height * (0.2 + Math.random() * 0.6),
      vy: (Math.random() - 0.5) * 0.3,
      vx: (Math.random() - 0.5) * 0.15,
      size: 60 + Math.random() * 100,
      hue: [180, 200, 160, 260, 140][i],
      phase: Math.random() * Math.PI * 2,
    }));

    // Radar origin
    const radarX = canvas.width * 0.78;
    const radarY = canvas.height * 0.38;
    const radarR = Math.min(canvas.width, canvas.height) * 0.22;

    const drawHex = (cx, cy, size, alpha) => {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 6;
        const px = cx + size * Math.cos(angle);
        const py = cy + size * Math.sin(angle);
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.strokeStyle = `rgba(0,243,255,${alpha})`;
      ctx.lineWidth = 0.5;
      ctx.stroke();
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Deep base gradient
      const bg = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      bg.addColorStop(0, '#03060f');
      bg.addColorStop(0.5, '#050a14');
      bg.addColorStop(1, '#030810');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Floating glowing orbs
      orbs.forEach((orb) => {
        orb.x += orb.vx;
        orb.y += orb.vy;
        if (orb.x < -orb.size || orb.x > canvas.width + orb.size) orb.vx *= -1;
        if (orb.y < -orb.size || orb.y > canvas.height + orb.size) orb.vy *= -1;

        const pulse = Math.sin(t * 0.012 + orb.phase) * 0.3 + 0.7;
        const g = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orb.size * pulse);
        g.addColorStop(0, `hsla(${orb.hue},100%,60%,0.09)`);
        g.addColorStop(0.5, `hsla(${orb.hue},100%,50%,0.04)`);
        g.addColorStop(1, `hsla(${orb.hue},100%,40%,0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(orb.x, orb.y, orb.size * pulse, 0, Math.PI * 2);
        ctx.fill();
      });

      // Hex grid
      hexPoints.forEach((h) => {
        const brightness = (Math.sin(t * 0.018 + h.pulse) * 0.5 + 0.5);
        drawHex(h.x, h.y, HEX_SIZE * 0.48, 0.025 + brightness * 0.055);
      });

      // Horizontal scan lines (very subtle)
      for (let y = 0; y < canvas.height; y += 3) {
        const scanAlpha = 0.012 + Math.sin(y * 0.05 + t * 0.04) * 0.006;
        ctx.fillStyle = `rgba(0,243,255,${scanAlpha})`;
        ctx.fillRect(0, y, canvas.width, 0.5);
      }

      // ── RADAR ──
      // Radar rings
      for (let i = 1; i <= 4; i++) {
        ctx.beginPath();
        ctx.arc(radarX, radarY, (radarR / 4) * i, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(0,243,255,${0.06 + (i === 4 ? 0.06 : 0)})`;
        ctx.lineWidth = i === 4 ? 1 : 0.5;
        ctx.stroke();
      }
      // Radar crosshairs
      ctx.strokeStyle = 'rgba(0,243,255,0.06)';
      ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(radarX - radarR, radarY); ctx.lineTo(radarX + radarR, radarY); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(radarX, radarY - radarR); ctx.lineTo(radarX, radarY + radarR); ctx.stroke();

      // Radar sweep
      const sweepAngle = (t * 0.022) % (Math.PI * 2);
      const sweepGrad = ctx.createConicalGradient
        ? null // not standard, fallback below
        : null;

      // Sweep arc (filled wedge)
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(radarX, radarY);
      ctx.arc(radarX, radarY, radarR, sweepAngle - 1.1, sweepAngle);
      ctx.closePath();
      const sweepFill = ctx.createLinearGradient(radarX, radarY, radarX + radarR, radarY);
      sweepFill.addColorStop(0, 'rgba(0,243,255,0)');
      sweepFill.addColorStop(1, 'rgba(0,243,255,0.12)');
      ctx.fillStyle = sweepFill;
      ctx.fill();
      ctx.restore();

      // Sweep leading edge line
      ctx.beginPath();
      ctx.moveTo(radarX, radarY);
      ctx.lineTo(
        radarX + Math.cos(sweepAngle) * radarR,
        radarY + Math.sin(sweepAngle) * radarR
      );
      ctx.strokeStyle = 'rgba(0,243,255,0.55)';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Radar blips
      const blips = [
        { angle: 0.8, dist: 0.55 },
        { angle: 2.1, dist: 0.72 },
        { angle: 3.7, dist: 0.38 },
        { angle: 5.2, dist: 0.62 },
      ];
      blips.forEach((b) => {
        const diff = ((sweepAngle - b.angle) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
        const fade = Math.max(0, 1 - diff / (Math.PI * 0.7));
        if (fade > 0.01) {
          const bx = radarX + Math.cos(b.angle) * radarR * b.dist;
          const by = radarY + Math.sin(b.angle) * radarR * b.dist;
          ctx.beginPath();
          ctx.arc(bx, by, 3, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(0,243,255,${fade * 0.9})`;
          ctx.shadowColor = '#00f3ff';
          ctx.shadowBlur = 8;
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      });

      // Radar clip circle border glow
      ctx.beginPath();
      ctx.arc(radarX, radarY, radarR, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(0,243,255,0.18)';
      ctx.lineWidth = 1;
      ctx.stroke();

      t++;
      animId = requestAnimationFrame(draw);
    };

    draw();
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize); };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-0" />;
};

/* ─────────────────────────────
   CUSTOM TOOLTIP
───────────────────────────── */
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'rgba(5,10,20,0.95)', border: '1px solid rgba(0,243,255,0.25)', borderRadius: 8, padding: '8px 14px' }}>
      <p style={{ fontFamily: 'monospace', fontSize: 13, color: '#a8bdd4', marginBottom: 3 }}>{label}</p>
      <p style={{ fontFamily: 'monospace', fontSize: 15, color: '#00f3ff', fontWeight: 700 }}>{payload[0].value} threats</p>
    </div>
  );
};

/* ─────────────────────────────
   METRIC CARD — asymmetric slash design
───────────────────────────── */
const MetricCard = ({ title, value, subtitle, color, icon: Icon, delay, index }) => {
  const palette = {
    neonCyan: { hex: '#00f3ff', rgb: '0,243,255', dim: 'rgba(0,243,255,0.08)' },
    neonRed: { hex: '#ff003c', rgb: '255,0,60', dim: 'rgba(255,0,60,0.08)' },
    neonGreen: { hex: '#39ff14', rgb: '57,255,20', dim: 'rgba(57,255,20,0.08)' },
    neonPurple: { hex: '#b000ff', rgb: '176,0,255', dim: 'rgba(176,0,255,0.08)' },
  };
  const p = palette[color] || palette.neonCyan;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="relative overflow-hidden group cursor-default"
      style={{
        background: 'rgba(6,10,20,0.85)',
        border: `1px solid rgba(${p.rgb},0.18)`,
        borderRadius: 16,
        padding: '20px 22px 18px',
        boxShadow: `0 0 30px rgba(${p.rgb},0.07), inset 0 1px 0 rgba(255,255,255,0.10)`,
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* diagonal slash accent */}
      <div
        className="absolute top-0 right-0 w-20 h-20 pointer-events-none"
        style={{
          background: `linear-gradient(135deg, transparent 60%, rgba(${p.rgb},0.07) 100%)`,
          borderRadius: '0 16px 0 0',
        }}
      />

      {/* top: label + icon */}
      <div className="flex items-center justify-between mb-3">
        <span
          className="font-mono uppercase tracking-[0.18em]"
          style={{ fontSize: 12, color: `rgba(${p.rgb},0.85)` }}
        >
          {String(index + 1).padStart(2, '0')} / {title}
        </span>
        <div
          className="flex items-center justify-center rounded-lg"
          style={{
            width: 30, height: 30,
            background: `rgba(${p.rgb},0.1)`,
            border: `1px solid rgba(${p.rgb},0.2)`,
            color: p.hex,
          }}
        >
          <Icon size={13} />
        </div>
      </div>

      {/* value */}
      <div
        className="font-display font-black tracking-tight leading-none mb-2"
        style={{ fontSize: 28, color: p.hex, textShadow: `0 0 20px rgba(${p.rgb},0.5)` }}
      >
        {value}
      </div>

      {/* subtitle */}
      <div className="font-mono" style={{ fontSize: 13, color: '#a8bdd4' }}>{subtitle}</div>

      {/* animated bottom line */}
      <div
        className="absolute bottom-0 left-0 h-[2px] transition-all duration-700 group-hover:w-full"
        style={{ width: '30%', background: `linear-gradient(90deg, rgba(${p.rgb},0.8), rgba(${p.rgb},0.2))` }}
      />

      {/* corner pip */}
      <div
        className="absolute bottom-3 right-3 rounded-full"
        style={{ width: 5, height: 5, background: p.hex, boxShadow: `0 0 8px ${p.hex}`, opacity: 0.7 }}
      />
    </motion.div>
  );
};

/* ─────────────────────────────
   FEED ITEM
───────────────────────────── */
const FeedItem = ({ type, text, time, index }) => {
  const cfg = {
    CRITICAL: { color: '#ff003c', bg: 'rgba(255,0,60,0.06)', label: 'CRIT' },
    WARNING: { color: '#f59e0b', bg: 'rgba(245,158,11,0.06)', label: 'WARN' },
    INFO: { color: '#00f3ff', bg: 'rgba(0,243,255,0.04)', label: 'INFO' },
  };
  const c = cfg[type] || cfg.INFO;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
      className="flex gap-3 py-2 px-3 rounded-lg mb-1 group/item transition-all duration-200"
      style={{ background: 'transparent' }}
      onMouseEnter={e => e.currentTarget.style.background = c.bg}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      {/* type tag */}
      <div className="shrink-0 mt-0.5">
        <span
          className="font-mono font-black tracking-widest"
          style={{ fontSize: 11, color: c.color, letterSpacing: '0.15em' }}
        >
          [{c.label}]
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-mono truncate" style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.5 }}>{text}</p>
        <p className="font-mono" style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{time}</p>
      </div>
    </motion.div>
  );
};

/* ══════════════════════════════════════════════════
   DASHBOARD
══════════════════════════════════════════════════ */
const Dashboard = () => {
  /* ── ALL ORIGINAL STATE (unchanged) ── */
  const [stats, setStats] = useState({
    malwareBlocked: 0,
    totalScans: 0,
    phishingAttempts: 0,
    pendingCVEs: 0,
    riskScore: 0
  });
  const [threatsData, setThreatsData] = useState([]);
  const [activityFeed, setActivityFeed] = useState([]);
  const [currentTime, setCurrentTime] = useState(Date.now());

  /* ── ALL ORIGINAL EFFECTS / DATA FETCHING (unchanged) ── */
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, threatsRes, activityRes] = await Promise.all([
          axios.get(`${BACKEND_URL}/api/stats`),
          axios.get(`${BACKEND_URL}/api/threats`),
          axios.get(`${BACKEND_URL}/api/activity`)
        ]);
        if (statsRes.data.success) setStats(statsRes.data.data);
        if (threatsRes.data.success) setThreatsData(threatsRes.data.data);
        if (activityRes.data.success) setActivityFeed(activityRes.data.data);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 10000);
    const timeInterval = setInterval(() => setCurrentTime(Date.now()), 1000);

    socket.on('new_activity', (newActivity) => {
      setActivityFeed(prev => [newActivity, ...prev].slice(0, 15));
    });

    return () => {
      clearInterval(interval);
      clearInterval(timeInterval);
      socket.off('new_activity');
    };
  }, []);

  /* ── ALL ORIGINAL DERIVED VALUES (unchanged) ── */
  const riskLevel = stats.riskScore > 50 ? 'HIGH 🔴' : stats.riskScore > 20 ? 'MEDIUM 🟠' : 'LOW 🟢';
  const riskColor = stats.riskScore > 50 ? 'neonRed' : stats.riskScore > 20 ? 'neonPurple' : 'neonGreen';

  return (
    <div className="relative w-full h-full min-h-screen overflow-hidden" style={{ background: '#03060f' }}>
      <CyberBackground />

      {/* vignette overlay */}
      <div
        className="absolute inset-0 pointer-events-none z-[1]"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.55) 100%)',
        }}
      />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.7 }}
        className="relative z-10 h-full flex flex-col overflow-y-auto custom-scrollbar"
        style={{ padding: '24px 28px', gap: 20 }}
      >

        {/* ══ HEADER ══ */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="flex items-start justify-between"
        >
          <div>
            {/* overline */}
            <div className="flex items-center gap-3 mb-2">
              <div style={{ width: 32, height: 1, background: 'rgba(0,243,255,0.5)' }} />
              <span className="font-mono uppercase tracking-[0.25em]" style={{ fontSize: 12, color: 'rgba(0,243,255,0.7)' }}>
                Security Operations / Dashboard
              </span>
            </div>
            <h1
              className="font-display font-black tracking-tight leading-none"
              style={{ fontSize: 32, color: '#f1f5f9', letterSpacing: '-0.01em' }}
            >
              THREAT
              <span style={{ color: '#00f3ff', textShadow: '0 0 30px rgba(0,243,255,0.6)', marginLeft: 10 }}>
                MATRIX
              </span>
            </h1>
            <p className="font-mono mt-2" style={{ fontSize: 13, color: '#94a3b8', letterSpacing: '0.12em' }}>
              UPLINK ESTABLISHED · NODE ALPHA-7 · LATENCY 12ms
            </p>
          </div>

          {/* live badge */}
          <div
            className="flex items-center gap-2 px-4 py-2 rounded-full"
            style={{
              background: 'rgba(57,255,20,0.06)',
              border: '1px solid rgba(57,255,20,0.2)',
            }}
          >
            <span
              className="rounded-full animate-pulse"
              style={{ width: 6, height: 6, background: '#39ff14', boxShadow: '0 0 8px #39ff14', display: 'block' }}
            />
            <span className="font-mono font-bold uppercase tracking-widest" style={{ fontSize: 12, color: '#39ff14' }}>
              All Systems Online
            </span>
          </div>
        </motion.div>

        {/* ══ METRIC CARDS ══ */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          <MetricCard title="System Risk" value={riskLevel} subtitle={`Risk Score: ${stats.riskScore}%`} color={riskColor} icon={AlertTriangle} delay={0.08} index={0} />
          <MetricCard title="Malware Blocked" value={stats.malwareBlocked.toLocaleString()} subtitle={`of ${stats.totalScans} scans`} color="neonCyan" icon={ShieldAlert} delay={0.13} index={1} />
          <MetricCard title="Phishing Alerts" value={stats.phishingAttempts.toLocaleString()} subtitle="Active mitigation" color="neonGreen" icon={Activity} delay={0.18} index={2} />
          <MetricCard title="Pending CVEs" value={stats.pendingCVEs.toLocaleString()} subtitle="Patch management active" color="neonPurple" icon={Cpu} delay={0.23} index={3} />
        </div>

        {/* ══ MAIN CONTENT ══ */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4 min-h-0">

          {/* ── Chart panel ── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.28, duration: 0.55 }}
            className="flex flex-col rounded-2xl overflow-hidden"
            style={{
              background: 'rgba(5,9,18,0.85)',
              border: '1px solid rgba(0,243,255,0.1)',
              backdropFilter: 'blur(16px)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.10), 0 0 40px rgba(0,0,0,0.4)',
            }}
          >
            {/* panel header bar */}
            <div
              className="flex items-center justify-between px-6 py-4"
              style={{ borderBottom: '1px solid rgba(0,243,255,0.07)' }}
            >
              <div className="flex items-center gap-4">
                {/* 3-dot window chrome */}
                <div className="flex gap-1.5">
                  {['#ff003c', '#f59e0b', '#39ff14'].map((c, i) => (
                    <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: c, opacity: 0.7 }} />
                  ))}
                </div>
                <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.13)' }} />
                <div className="flex items-center gap-2">
                  <Activity size={13} style={{ color: '#00f3ff' }} />
                  <span className="font-mono font-bold" style={{ fontSize: 14, color: '#cbd5e1', letterSpacing: '0.08em' }}>
                    THREAT ORIGIN VECTORS
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono" style={{ fontSize: 12, color: '#94a3b8', letterSpacing: '0.1em' }}>LAST 7H</span>
                <div
                  className="px-2 py-0.5 rounded"
                  style={{ background: 'rgba(0,243,255,0.06)', border: '1px solid rgba(0,243,255,0.15)' }}
                >
                  <span className="font-mono font-bold" style={{ fontSize: 11, color: '#00f3ff', letterSpacing: '0.15em' }}>● LIVE</span>
                </div>
              </div>
            </div>

            {/* chart */}
            <div className="flex-1 px-4 py-4 min-h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={threatsData} margin={{ top: 8, right: 4, left: -28, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorThreats" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#00f3ff" stopOpacity={0.3} />
                      <stop offset="60%" stopColor="#00f3ff" stopOpacity={0.07} />
                      <stop offset="100%" stopColor="#00f3ff" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="1 8" stroke="rgba(255,255,255,0.035)" vertical={false} />
                  <XAxis
                    dataKey="time"
                    stroke="transparent"
                    tick={{ fill: '#94a3b8', fontSize: 12, fontFamily: 'monospace' }}
                  />
                  <YAxis
                    stroke="transparent"
                    tick={{ fill: '#94a3b8', fontSize: 12, fontFamily: 'monospace' }}
                    allowDecimals={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="threats"
                    stroke="#00f3ff"
                    strokeWidth={1.5}
                    fillOpacity={1}
                    fill="url(#colorThreats)"
                    dot={false}
                    activeDot={{ r: 4, fill: '#00f3ff', stroke: 'none', filter: 'drop-shadow(0 0 6px #00f3ff)' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* bottom stat strip */}
            <div
              className="grid grid-cols-3 divide-x px-0"
              style={{ borderTop: '1px solid rgba(0,243,255,0.07)', divideColor: 'rgba(0,243,255,0.07)' }}
            >
              {[
                { label: 'Peak Threats', val: Math.max(...(threatsData.map(d => d.threats || 0)), 0) },
                { label: 'Total Events', val: threatsData.reduce((s, d) => s + (d.threats || 0), 0) },
                { label: 'Avg / Hour', val: threatsData.length ? (threatsData.reduce((s, d) => s + (d.threats || 0), 0) / threatsData.length).toFixed(1) : 0 },
              ].map(({ label, val }) => (
                <div key={label} className="flex flex-col items-center py-3 px-4" style={{ borderColor: 'rgba(0,243,255,0.07)' }}>
                  <span className="font-mono font-bold" style={{ fontSize: 16, color: '#00f3ff' }}>{val}</span>
                  <span className="font-mono uppercase tracking-widest" style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{label}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* ── Activity feed ── */}
          <motion.div
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.32, duration: 0.55 }}
            className="flex flex-col rounded-2xl overflow-hidden"
            style={{
              background: 'rgba(5,9,18,0.85)',
              border: '1px solid rgba(255,255,255,0.13)',
              backdropFilter: 'blur(16px)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.10)',
            }}
          >
            {/* feed header */}
            <div
              className="flex items-center justify-between px-5 py-4 shrink-0"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.10)' }}
            >
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <ShieldAlert size={12} style={{ color: '#ff003c' }} />
                  <span className="font-mono font-bold uppercase tracking-widest" style={{ fontSize: 13, color: '#e2e8f0' }}>
                    Live Activity
                  </span>
                </div>
                <span className="font-mono" style={{ fontSize: 11, color: '#94a3b8', letterSpacing: '0.1em' }}>
                  EVENT STREAM
                </span>
              </div>
              <div
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                style={{ background: 'rgba(255,0,60,0.08)', border: '1px solid rgba(255,0,60,0.2)' }}
              >
                <span className="animate-pulse rounded-full" style={{ width: 5, height: 5, background: '#ff003c', display: 'block', boxShadow: '0 0 5px #ff003c' }} />
                <span className="font-mono font-bold" style={{ fontSize: 11, color: '#ff003c', letterSpacing: '0.15em' }}>REC</span>
              </div>
            </div>

            {/* events */}
            <div className="flex-1 overflow-y-auto py-2 custom-scrollbar">
              {activityFeed.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 gap-2">
                  <div style={{ width: 24, height: 24, border: '1px solid rgba(0,243,255,0.15)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Cpu size={12} style={{ color: 'rgba(0,243,255,0.3)' }} />
                  </div>
                  <span className="font-mono" style={{ fontSize: 12, color: '#8eb4d4', letterSpacing: '0.1em' }}>AWAITING EVENTS</span>
                </div>
              ) : (
                activityFeed.map((item, idx) => (
                  <FeedItem
                    key={item.id || idx}
                    type={item.type}
                    text={item.text}
                    time={getRelativeTime(item.created_at)}
                    index={idx}
                  />
                ))
              )}
            </div>

            {/* feed footer */}
            <div
              className="px-5 py-3 shrink-0 flex items-center justify-between"
              style={{ borderTop: '1px solid rgba(255,255,255,0.10)' }}
            >
              <span className="font-mono" style={{ fontSize: 11, color: '#8eb4d4', letterSpacing: '0.1em' }}>
                {activityFeed.length} EVENTS
              </span>
              <span className="font-mono" style={{ fontSize: 11, color: '#8eb4d4', letterSpacing: '0.1em' }}>
                REFRESH 10s
              </span>
            </div>
          </motion.div>
        </div>

        {/* ══ FOOTER ══ */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55 }}
          className="flex items-center justify-between"
          style={{ paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.10)' }}
        >
          <span className="font-mono uppercase tracking-[0.2em]" style={{ fontSize: 11, color: '#8eb4d4' }}>
            CyberShield AI · Built for the Digital Battlefield
          </span>
          <div className="flex items-center gap-4">
            {[
              { label: 'NVD SYNC', active: true },
              { label: 'DB CONN', active: true },
              { label: 'SOCKET', active: true },
            ].map(({ label, active }) => (
              <div key={label} className="flex items-center gap-1.5">
                <span style={{ width: 4, height: 4, borderRadius: '50%', background: active ? '#39ff14' : '#ff003c', display: 'block' }} />
                <span className="font-mono" style={{ fontSize: 11, color: '#8eb4d4', letterSpacing: '0.12em' }}>{label}</span>
              </div>
            ))}
          </div>
        </motion.div>

      </motion.div>
    </div>
  );
};

export default Dashboard;
