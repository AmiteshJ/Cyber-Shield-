import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/* ── ALL ORIGINAL DATA (unchanged) ── */
const mockIPs = ['192.168.1.14', '45.33.22.1', '104.22.5.3', '8.8.8.8', '110.43.2.1'];
const mockActions = [
  { text: 'Incoming request blocked at edge firewall', color: 'text-yellow-400', raw: '#facc15' },
  { text: 'Decoy response sent mapping fake internal directory', color: 'text-cyber-neonCyan', raw: '#00f3ff' },
  { text: 'SQL Injection payload dropped', color: 'text-cyber-neonRed', raw: '#ff003c' },
  { text: 'Port scan detected and tar-pitted', color: 'text-orange-500', raw: '#f97316' },
  { text: 'Brute force credential harvested into false DB', color: 'text-cyber-neonGreen', raw: '#39ff14' },
];

const generateRandomLog = () => ({
  ip: mockIPs[Math.floor(Math.random() * mockIPs.length)],
  ...mockActions[Math.floor(Math.random() * mockActions.length)],
  time: new Date().toISOString().split('T')[1].slice(0, 11),
  id: Math.random().toString(36).slice(2),
  port: [22, 80, 443, 3306, 8080, 6379][Math.floor(Math.random() * 6)],
  method: ['GET', 'POST', 'PUT', 'DELETE'][Math.floor(Math.random() * 4)],
  bytes: Math.floor(Math.random() * 4096) + 64,
});

/* ─────────────────────────────────────────
   BACKGROUND — world map attack lines + radar
───────────────────────────────────────── */
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

    /* attack origin points — simulated geo positions */
    const origins = [
      { x: 0.12, y: 0.38 }, { x: 0.18, y: 0.28 }, { x: 0.22, y: 0.55 },
      { x: 0.55, y: 0.22 }, { x: 0.60, y: 0.35 }, { x: 0.65, y: 0.48 },
      { x: 0.72, y: 0.30 }, { x: 0.80, y: 0.42 }, { x: 0.85, y: 0.25 },
      { x: 0.35, y: 0.65 }, { x: 0.45, y: 0.72 }, { x: 0.90, y: 0.60 },
    ];

    /* honeypot target — center of screen */
    const TARGET = { x: 0.5, y: 0.46 };

    /* attack packets travelling toward target */
    class Packet {
      constructor() { this.reset(); }
      reset() {
        const o = origins[Math.floor(Math.random() * origins.length)];
        this.ox = o.x; this.oy = o.y;
        this.tx = TARGET.x; this.ty = TARGET.y;
        this.progress = 0;
        this.speed = 0.003 + Math.random() * 0.004;
        this.color = mockActions[Math.floor(Math.random() * mockActions.length)].raw;
        this.size = Math.random() * 2 + 1.2;
        /* arc control point */
        this.cx = (o.x + TARGET.x) / 2 + (Math.random() - 0.5) * 0.25;
        this.cy = (o.y + TARGET.y) / 2 - 0.12 - Math.random() * 0.12;
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
        const prev = this.bezier(Math.max(0, this.progress - 0.06));

        /* trail */
        ctx.beginPath();
        ctx.moveTo(prev.x * W, prev.y * H);
        ctx.lineTo(pos.x * W, pos.y * H);
        ctx.strokeStyle = this.color + '55';
        ctx.lineWidth = this.size * 0.6;
        ctx.stroke();

        /* head dot */
        ctx.beginPath();
        ctx.arc(pos.x * W, pos.y * H, this.size, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }

    const packets = Array.from({ length: 22 }, () => {
      const p = new Packet();
      p.progress = Math.random(); // stagger starts
      return p;
    });

    /* static arc paths (faint route lines) */
    const routes = origins.map(o => ({
      ox: o.x, oy: o.y,
      cx: (o.x + TARGET.x) / 2 + (Math.random() - 0.5) * 0.2,
      cy: (o.y + TARGET.y) / 2 - 0.1 - Math.random() * 0.1,
    }));

    /* floating orbs */
    const orbs = [
      { x: 0.05, y: 0.1, hue: 0, size: 0.28 },
      { x: 0.92, y: 0.15, hue: 20, size: 0.22 },
      { x: 0.08, y: 0.85, hue: 130, size: 0.18 },
      { x: 0.88, y: 0.82, hue: 180, size: 0.16 },
    ];

    /* dot grid nodes */
    const nodes = Array.from({ length: 16 }, () => ({
      x: Math.random(), y: Math.random(),
      vx: (Math.random() - 0.5) * 0.0002,
      vy: (Math.random() - 0.5) * 0.0002,
      phase: Math.random() * Math.PI * 2,
    }));

    const draw = () => {
      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      /* base */
      ctx.fillStyle = '#03060f';
      ctx.fillRect(0, 0, W, H);

      /* orbs */
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

      /* dot grid */
      for (let x = 0; x < W; x += 40) {
        for (let y = 0; y < H; y += 40) {
          const a = 0.025 + Math.sin(t * 0.012 + x * 0.008 + y * 0.008) * 0.012;
          ctx.beginPath(); ctx.arc(x, y, 0.8, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,60,0,${a})`; ctx.fill();
        }
      }

      /* faint route arcs */
      routes.forEach(r => {
        ctx.beginPath();
        ctx.moveTo(r.ox * W, r.oy * H);
        ctx.quadraticCurveTo(r.cx * W, r.cy * H, TARGET.x * W, TARGET.y * H);
        ctx.strokeStyle = 'rgba(255,60,0,0.04)';
        ctx.lineWidth = 0.5;
        ctx.stroke();
      });

      /* origin dots */
      origins.forEach(o => {
        const pulse = Math.sin(t * 0.04 + o.x * 10) * 0.4 + 0.6;
        ctx.beginPath();
        ctx.arc(o.x * W, o.y * H, 2.5 * pulse, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,60,0,${0.3 * pulse})`;
        ctx.fill();
        /* ring */
        ctx.beginPath();
        ctx.arc(o.x * W, o.y * H, 6 * pulse, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255,60,0,${0.12 * pulse})`;
        ctx.lineWidth = 0.8;
        ctx.stroke();
      });

      /* target — honeypot node */
      const tpulse = Math.sin(t * 0.05) * 0.4 + 0.6;
      const tx = TARGET.x * W, ty = TARGET.y * H;

      for (let ring = 1; ring <= 3; ring++) {
        ctx.beginPath();
        ctx.arc(tx, ty, ring * 18 * tpulse, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(0,243,255,${0.08 / ring})`;
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }
      /* target core */
      const tg = ctx.createRadialGradient(tx, ty, 0, tx, ty, 16);
      tg.addColorStop(0, 'rgba(0,243,255,0.35)');
      tg.addColorStop(0.5, 'rgba(0,243,255,0.1)');
      tg.addColorStop(1, 'rgba(0,243,255,0)');
      ctx.fillStyle = tg;
      ctx.beginPath(); ctx.arc(tx, ty, 16, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(tx, ty, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#00f3ff'; ctx.shadowColor = '#00f3ff'; ctx.shadowBlur = 12; ctx.fill();
      ctx.shadowBlur = 0;

      /* packets */
      packets.forEach(p => { p.update(); p.draw(ctx, W, H); });

      /* node mesh */
      nodes.forEach(n => {
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0 || n.x > 1) n.vx *= -1;
        if (n.y < 0 || n.y > 1) n.vy *= -1;
      });
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = (nodes[i].x - nodes[j].x) * W;
          const dy = (nodes[i].y - nodes[j].y) * H;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(255,60,0,${(1 - dist / 120) * 0.04})`;
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

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-0"
    />
  );
};

/* ─────────────────────────────────────────
   STATS COUNTER (top strip)
───────────────────────────────────────── */
const StatChip = ({ label, value, color }) => (
  <div
    className="flex flex-col items-center px-4 py-1.5"
    style={{ borderRight: '1px solid rgba(255,255,255,0.05)' }}
  >
    <span className="font-mono font-black" style={{ fontSize: 14, color, textShadow: `0 0 10px ${color}55` }}>
      {value}
    </span>
    <span className="font-mono uppercase tracking-widest" style={{ fontSize: 10, color: '#334155', marginTop: 1 }}>
      {label}
    </span>
  </div>
);

/* ─────────────────────────────────────────
   LOG ROW
───────────────────────────────────────── */
const LogRow = ({ log, index }) => (
  <motion.div
    initial={{ opacity: 0, x: -12, backgroundColor: 'rgba(255,255,255,0.04)' }}
    animate={{ opacity: 1, x: 0, backgroundColor: 'rgba(255,255,255,0)' }}
    transition={{ duration: 0.35, ease: 'easeOut' }}
    className="grid font-mono group hover:bg-white/[0.02] transition-colors duration-150 rounded-lg px-2"
    style={{
      gridTemplateColumns: '110px 120px 50px 60px 80px 1fr',
      gap: '0 12px',
      paddingTop: 6,
      paddingBottom: 6,
      fontSize: 12,
    }}
  >
    <span style={{ color: '#334155' }}>[{log.time}]</span>
    <span style={{ color: '#475569' }}>{log.ip}</span>
    <span style={{ color: '#334155' }}>:{log.port}</span>
    <span style={{ color: '#1e3a5f', fontWeight: 700 }}>{log.method}</span>
    <span style={{ color: '#1e293b' }}>{log.bytes}B</span>
    <span style={{ color: log.raw, fontWeight: 600 }}>{log.text}</span>
  </motion.div>
);

/* ══════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════ */
const HoneypotLogs = () => {
  /* ── ALL ORIGINAL STATE (unchanged) ── */
  const [logs, setLogs] = useState([]);
  const bottomRef = useRef(null);

  /* ── ALL ORIGINAL EFFECTS (unchanged) ── */
  useEffect(() => {
    const initialLogs = Array(8).fill(null).map(() => generateRandomLog());
    setLogs(initialLogs);

    const interval = setInterval(() => {
      setLogs(prev => {
        const newLogs = [...prev, generateRandomLog()];
        if (newLogs.length > 50) return newLogs.slice(newLogs.length - 50);
        return newLogs;
      });
    }, 1200);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  /* derived counts */
  const counts = {
    total: logs.length,
    blocked: logs.filter(l => l.raw === '#facc15').length,
    injected: logs.filter(l => l.raw === '#ff003c').length,
    captured: logs.filter(l => l.raw === '#39ff14').length,
  };

  return (
    <div
      className="relative w-full"
      style={{ background: '#03060f', height: '100%', minHeight: 0 }}
    >
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
          className="flex items-start justify-between"
        >
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div style={{ width: 28, height: 1, background: 'rgba(255,60,0,0.6)' }} />
              <span className="font-mono uppercase tracking-[0.22em]" style={{ fontSize: 10, color: 'rgba(255,60,0,0.6)' }}>
                Module 05 / Deception Network
              </span>
            </div>
            <h1
              className="font-display font-black tracking-tight"
              style={{ fontSize: 24, color: '#f1f5f9', letterSpacing: '-0.01em' }}
            >
              HONEYPOT
              <span style={{ color: '#ff003c', textShadow: '0 0 28px rgba(255,0,60,0.6)', marginLeft: 10 }}>
                MONITOR
              </span>
            </h1>
            <p className="font-mono mt-0.5" style={{ fontSize: 10, color: '#334155', letterSpacing: '0.1em' }}>
              LIVE DECEPTION TRAFFIC · TAR-PIT ENGINE · CREDENTIAL HARVESTING · DECOY RESPONSES
            </p>
          </div>

          {/* live badge */}
          <div
            className="flex items-center gap-2 px-4 py-2 rounded-full"
            style={{ background: 'rgba(255,0,60,0.06)', border: '1px solid rgba(255,0,60,0.25)' }}
          >
            <motion.span
              className="rounded-full"
              style={{ width: 6, height: 6, background: '#ff003c', display: 'block', boxShadow: '0 0 8px #ff003c' }}
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 0.8, repeat: Infinity }}
            />
            <span className="font-mono font-bold uppercase tracking-widest" style={{ fontSize: 11, color: '#ff003c' }}>
              Live Feed
            </span>
          </div>
        </motion.div>

        {/* ══ STATS STRIP ══ */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex rounded-2xl overflow-hidden shrink-0"
          style={{
            background: 'rgba(5,9,18,0.85)',
            border: '1px solid rgba(255,255,255,0.06)',
            backdropFilter: 'blur(16px)',
          }}
        >
          <StatChip label="Total Events" value={counts.total} color="#00f3ff" />
          <StatChip label="Blocked" value={counts.blocked} color="#facc15" />
          <StatChip label="Injections Stopped" value={counts.injected} color="#ff003c" />
          <StatChip label="Creds Captured" value={counts.captured} color="#39ff14" />
          <div className="flex-1 flex items-center justify-end px-5 gap-3">
            {[
              { label: 'Decoy Nodes', val: '12' },
              { label: 'Active Traps', val: '4' },
              { label: 'Refresh', val: '1.2s' },
            ].map(({ label, val }) => (
              <div key={label} className="text-right">
                <p className="font-mono font-bold" style={{ fontSize: 11, color: '#334155' }}>{val}</p>
                <p className="font-mono uppercase tracking-widest" style={{ fontSize: 10, color: '#475569' }}>{label}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ══ MAIN GRID ══ */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_240px] gap-3 min-h-0 overflow-hidden">

          {/* ── TERMINAL LOG ── */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="flex flex-col rounded-2xl overflow-hidden"
            style={{
              background: 'rgba(3,5,12,0.92)',
              border: '1px solid rgba(255,255,255,0.06)',
              backdropFilter: 'blur(20px)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)',
            }}
          >
            {/* terminal chrome */}
            <div
              className="flex items-center justify-between px-5 py-3 shrink-0"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
            >
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5">
                  {['#ff003c', '#f59e0b', '#39ff14'].map((c, i) => (
                    <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: c, opacity: 0.6 }} />
                  ))}
                </div>
                <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.06)' }} />
                <span className="font-mono uppercase tracking-widest" style={{ fontSize: 11, color: '#475569' }}>
                  honeypot@cybershield:~$
                </span>
              </div>
              <div className="flex items-center gap-3">
                {/* colour legend */}
                {[
                  { label: 'Block', color: '#facc15' },
                  { label: 'Decoy', color: '#00f3ff' },
                  { label: 'Inject', color: '#ff003c' },
                  { label: 'Brute', color: '#39ff14' },
                ].map(({ label, color }) => (
                  <div key={label} className="flex items-center gap-1">
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: color, display: 'block' }} />
                    <span className="font-mono" style={{ fontSize: 10, color: '#475569', letterSpacing: '0.1em' }}>{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* column headers */}
            <div
              className="grid px-4 py-2 shrink-0"
              style={{
                gridTemplateColumns: '110px 120px 50px 60px 80px 1fr',
                gap: '0 12px',
                borderBottom: '1px solid rgba(255,255,255,0.04)',
              }}
            >
              {['TIMESTAMP', 'SOURCE IP', 'PORT', 'METHOD', 'SIZE', 'DECOY ACTION'].map(h => (
                <span key={h} className="font-mono uppercase tracking-widest" style={{ fontSize: 10, color: '#475569' }}>{h}</span>
              ))}
            </div>

            {/* log rows */}
            <div className="flex-1 overflow-y-auto px-2 py-2 custom-scrollbar space-y-0.5">
              {/* CRT scanline overlay */}
              <div
                className="pointer-events-none absolute inset-0 z-10 opacity-[0.03]"
                style={{
                  background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.4) 0px, rgba(0,0,0,0.4) 1px, transparent 1px, transparent 3px)',
                }}
              />
              <AnimatePresence initial={false}>
                {logs.map((log, idx) => (
                  <LogRow key={log.id} log={log} index={idx} />
                ))}
              </AnimatePresence>
              <div ref={bottomRef} className="h-2" />
            </div>

            {/* terminal input bar */}
            <div
              className="flex items-center gap-2 px-4 py-2 shrink-0"
              style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
            >
              <span className="font-mono font-bold" style={{ fontSize: 12, color: '#39ff14' }}>$</span>
              <span className="font-mono" style={{ fontSize: 11, color: '#334155' }}>
                tail -f /var/log/honeypot/decoy.log
              </span>
              <motion.span
                className="inline-block"
                style={{ width: 6, height: 12, background: '#39ff14', marginLeft: 2 }}
                animate={{ opacity: [1, 0, 1] }}
                transition={{ duration: 0.8, repeat: Infinity }}
              />
            </div>
          </motion.div>

          {/* ── RIGHT SIDEBAR ── */}
          <motion.div
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col gap-4"
          >

            {/* Attack type breakdown */}
            <div
              className="rounded-2xl p-4"
              style={{
                background: 'rgba(5,9,18,0.88)',
                border: '1px solid rgba(255,255,255,0.06)',
                backdropFilter: 'blur(16px)',
              }}
            >
              <p className="font-mono uppercase tracking-widest mb-4" style={{ fontSize: 12, color: '#475569' }}>
                Attack Breakdown
              </p>
              {[
                { label: 'Edge Blocked', color: '#facc15', pct: 28 },
                { label: 'Decoy Served', color: '#00f3ff', pct: 35 },
                { label: 'SQLi Dropped', color: '#ff003c', pct: 18 },
                { label: 'Port Scan', color: '#f97316', pct: 12 },
                { label: 'Creds Captured', color: '#39ff14', pct: 7 },
              ].map(({ label, color, pct }) => (
                <div key={label} className="mb-3">
                  <div className="flex justify-between mb-1">
                    <span className="font-mono" style={{ fontSize: 11, color: '#475569' }}>{label}</span>
                    <span className="font-mono font-bold" style={{ fontSize: 11, color }}>{pct}%</span>
                  </div>
                  <div className="rounded-full overflow-hidden" style={{ height: 3, background: 'rgba(255,255,255,0.04)' }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
                      style={{
                        height: '100%', borderRadius: 9999,
                        background: `linear-gradient(90deg, ${color}, ${color}55)`,
                        boxShadow: `0 0 6px ${color}55`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Top attacker IPs */}
            <div
              className="rounded-2xl p-4"
              style={{
                background: 'rgba(5,9,18,0.88)',
                border: '1px solid rgba(255,255,255,0.06)',
                backdropFilter: 'blur(16px)',
              }}
            >
              <p className="font-mono uppercase tracking-widest mb-3" style={{ fontSize: 12, color: '#475569' }}>
                Top Attacker IPs
              </p>
              {mockIPs.map((ip, i) => (
                <div
                  key={ip}
                  className="flex items-center justify-between py-2 font-mono"
                  style={{ borderBottom: i < mockIPs.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none' }}
                >
                  <div className="flex items-center gap-2">
                    <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#ff003c', display: 'block', opacity: 0.7 }} />
                    <span style={{ fontSize: 12, color: '#475569' }}>{ip}</span>
                  </div>
                  <span style={{ fontSize: 12, color: '#334155' }}>
                    {Math.floor(Math.random() * 80 + 10)} hits
                  </span>
                </div>
              ))}
            </div>

            {/* Decoy services */}
            <div
              className="flex-1 rounded-2xl p-4"
              style={{
                background: 'rgba(5,9,18,0.88)',
                border: '1px solid rgba(255,255,255,0.06)',
                backdropFilter: 'blur(16px)',
              }}
            >
              <p className="font-mono uppercase tracking-widest mb-3" style={{ fontSize: 12, color: '#475569' }}>
                Active Decoy Services
              </p>
              {[
                { name: 'SSH Honeypot', port: ':22', status: 'ACTIVE' },
                { name: 'MySQL Decoy', port: ':3306', status: 'ACTIVE' },
                { name: 'Redis Trap', port: ':6379', status: 'ACTIVE' },
                { name: 'HTTP Tar-pit', port: ':8080', status: 'ACTIVE' },
              ].map(({ name, port, status }) => (
                <div
                  key={name}
                  className="flex items-center justify-between py-2.5 px-3 rounded-xl mb-2"
                  style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.04)' }}
                >
                  <div>
                    <p className="font-mono font-bold" style={{ fontSize: 12, color: '#475569' }}>{name}</p>
                    <p className="font-mono" style={{ fontSize: 12, color: '#334155' }}>{port}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <motion.span
                      style={{ width: 5, height: 5, borderRadius: '50%', background: '#39ff14', display: 'block', boxShadow: '0 0 5px #39ff14' }}
                      animate={{ opacity: [1, 0.4, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity, delay: Math.random() }}
                    />
                    <span className="font-mono font-bold" style={{ fontSize: 11, color: '#39ff14', letterSpacing: '0.1em' }}>{status}</span>
                  </div>
                </div>
              ))}
            </div>

          </motion.div>
        </div>

        {/* ══ FOOTER ══ */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex items-center justify-between shrink-0"
          style={{ paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.04)' }}
        >
          <span className="font-mono uppercase tracking-[0.2em]" style={{ fontSize: 10, color: '#334155' }}>
            CyberShield AI · Honeypot Deception Engine v2
          </span>
          <div className="flex items-center gap-4">
            {[
              { label: 'Tar-pit Active', active: true },
              { label: 'Decoy Serving', active: true },
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