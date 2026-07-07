import { NavLink, useNavigate } from 'react-router-dom';
import { Shield, Activity, Bug, Mail, AlertTriangle, MessageSquare, Terminal, FileText, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';

/* ─────────────────────────────────────────
   MINI CANVAS BACKGROUND for sidebar
───────────────────────────────────────── */
const SidebarBackground = () => {
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

    const nodes = Array.from({ length: 12 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.12,
      vy: (Math.random() - 0.5) * 0.12,
      r: Math.random() * 1 + 0.3,
      phase: Math.random() * Math.PI * 2,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      /* vertical gradient base */
      const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
      g.addColorStop(0, 'rgba(0,243,255,0.025)');
      g.addColorStop(0.5, 'rgba(0,0,0,0)');
      g.addColorStop(1, 'rgba(0,243,255,0.015)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      /* slow breathing orb */
      const pulse = Math.sin(t * 0.01) * 0.4 + 0.6;
      const og = ctx.createRadialGradient(
        canvas.width * 0.5, canvas.height * 0.3, 0,
        canvas.width * 0.5, canvas.height * 0.3, canvas.width * pulse
      );
      og.addColorStop(0, 'rgba(0,243,255,0.04)');
      og.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = og;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      /* particles */
      nodes.forEach(n => {
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0 || n.x > canvas.width) n.vx *= -1;
        if (n.y < 0 || n.y > canvas.height) n.vy *= -1;
        const a = 0.08 + Math.sin(t * 0.025 + n.phase) * 0.05;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0,243,255,${a})`;
        ctx.fill();
      });

      /* connections */
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 90) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(0,243,255,${(1 - dist / 90) * 0.06})`;
            ctx.lineWidth = 0.4;
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.stroke();
          }
        }
      }

      t++;
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
    />
  );
};

/* ─────────────────────────────────────────
   NAV ITEMS CONFIG (same as original)
───────────────────────────────────────── */
const menuItems = [
  { name: 'Dashboard', path: '/dashboard', icon: Activity, accent: '#00f3ff', rgb: '0,243,255' },

  // 🛡️ NEW SPAM SHIELD (INSERTED HERE)
  { name: 'Spam Shield', path: '/spam-shield', icon: Shield, accent: '#22c55e', rgb: '34,197,94' },

  { name: 'Malware Detector', path: '/malware', icon: Bug, accent: '#ff003c', rgb: '255,0,60' },
  { name: 'Phishing Filter', path: '/phishing', icon: Mail, accent: '#a855f7', rgb: '168,85,247' },
  { name: 'Vulnerabilities', path: '/vulnerabilities', icon: AlertTriangle, accent: '#f97316', rgb: '249,115,22' },
  { name: 'Security Chatbot', path: '/chatbot', icon: MessageSquare, accent: '#39ff14', rgb: '57,255,20' },
  { name: 'Honeypot Logs', path: '/honeypot', icon: Terminal, accent: '#ff003c', rgb: '255,0,60' },
  { name: 'Policy Chatbot', path: '/policy', icon: FileText, accent: '#00f3ff', rgb: '0,243,255' },
];

/* ─────────────────────────────────────────
   NAV LINK ITEM
───────────────────────────────────────── */
const NavItem = ({ item, index }) => {
  const Icon = item.icon;
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.05 + index * 0.06, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      <NavLink
        to={item.path}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {({ isActive }) => (
          <div
            className="relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 overflow-hidden group"
            style={{
              background: isActive
                ? `rgba(${item.rgb},0.1)`
                : hovered ? 'rgba(255,255,255,0.09)' : 'transparent',
              border: `1px solid ${isActive ? `rgba(${item.rgb},0.25)` : 'transparent'}`,
              boxShadow: isActive ? `0 0 20px rgba(${item.rgb},0.08)` : 'none',
            }}
          >
            {/* active left bar */}
            <AnimatePresence>
              {isActive && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: '60%', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] rounded-full"
                  style={{ background: item.accent, boxShadow: `0 0 8px ${item.accent}` }}
                />
              )}
            </AnimatePresence>

            {/* icon container */}
            <div
              className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200"
              style={{
                background: isActive
                  ? `rgba(${item.rgb},0.15)`
                  : hovered ? `rgba(${item.rgb},0.07)` : 'rgba(255,255,255,0.09)',
                border: `1px solid ${isActive ? `rgba(${item.rgb},0.3)` : hovered ? `rgba(${item.rgb},0.15)` : 'rgba(255,255,255,0.10)'}`,
              }}
            >
              <Icon
                size={14}
                style={{
                  color: isActive ? item.accent : hovered ? item.accent : '#8eb4d4',
                  filter: isActive ? `drop-shadow(0 0 4px ${item.accent})` : 'none',
                  transition: 'all 0.2s',
                }}
              />
            </div>

            {/* label */}
            <span
              className="font-mono font-bold tracking-wide truncate transition-all duration-200"
              style={{
                fontSize: 13,
                color: isActive ? item.accent : hovered ? '#a8bdd4' : '#8eb4d4',
                letterSpacing: '0.05em',
              }}
            >
              {item.name}
            </span>

            {/* active dot */}
            {isActive && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="ml-auto shrink-0 rounded-full"
                style={{ width: 4, height: 4, background: item.accent, boxShadow: `0 0 6px ${item.accent}` }}
              />
            )}
          </div>
        )}
      </NavLink>
    </motion.div>
  );
};

/* ─────────────────────────────────────────
   PROFILE NAV ITEM — matches NavItem style
───────────────────────────────────────── */
const ProfileNavItem = ({ user }) => {
  const [hovered, setHovered] = useState(false);
  const accent = '#a855f7';
  const rgb = '168,85,247';

  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.5, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      <NavLink
        to="/profile"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {({ isActive }) => (
          <div
            className="relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 overflow-hidden"
            style={{
              background: isActive
                ? `rgba(${rgb},0.1)`
                : hovered ? 'rgba(255,255,255,0.09)' : 'transparent',
              border: `1px solid ${isActive ? `rgba(${rgb},0.25)` : 'transparent'}`,
              boxShadow: isActive ? `0 0 20px rgba(${rgb},0.08)` : 'none',
            }}
          >
            {/* active left bar */}
            <AnimatePresence>
              {isActive && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: '60%', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] rounded-full"
                  style={{ background: accent, boxShadow: `0 0 8px ${accent}` }}
                />
              )}
            </AnimatePresence>

            {/* avatar — pulsing glow when active */}
            <motion.div
              animate={isActive ? {
                boxShadow: [
                  `0 0 6px rgba(${rgb},0.4)`,
                  `0 0 14px rgba(${rgb},0.8)`,
                  `0 0 6px rgba(${rgb},0.4)`,
                ],
              } : {}}
              transition={{ duration: 2.5, repeat: Infinity }}
              className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center font-display font-black transition-all duration-200"
              style={{
                background: isActive
                  ? `rgba(${rgb},0.2)`
                  : hovered ? `rgba(${rgb},0.1)` : 'rgba(255,255,255,0.09)',
                border: `1px solid ${isActive ? `rgba(${rgb},0.4)` : hovered ? `rgba(${rgb},0.2)` : 'rgba(255,255,255,0.10)'}`,
                fontSize: 11,
                color: isActive ? accent : hovered ? accent : '#8eb4d4',
              }}
            >
              {user?.avatar || user?.name?.slice(0, 2).toUpperCase() || 'OP'}
            </motion.div>

            {/* name + role stacked */}
            <div className="flex-1 min-w-0">
              <div
                className="font-mono font-bold truncate transition-all duration-200"
                style={{
                  fontSize: 13,
                  color: isActive ? accent : hovered ? '#a8bdd4' : '#8eb4d4',
                  letterSpacing: '0.05em',
                }}
              >
                {user?.name || 'Operator'}
              </div>
              <div
                className="font-mono truncate"
                style={{ fontSize: 10, color: '#4a6a8a', marginTop: 1 }}
              >
                {user?.role || 'Analyst'} · {user?.clearanceLevel || 'LEVEL-1'}
              </div>
            </div>

            {/* active dot */}
            {isActive && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="ml-auto shrink-0 rounded-full"
                style={{ width: 4, height: 4, background: accent, boxShadow: `0 0 6px ${accent}` }}
              />
            )}
          </div>
        )}
      </NavLink>
    </motion.div>
  );
};

/* ─────────────────────────────────────────
   LOGOUT BUTTON — mirrors NavItem hover style
───────────────────────────────────────── */
const LogoutButton = ({ onLogout }) => {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.56, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.button
        onClick={onLogout}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        whileTap={{ scale: 0.97 }}
        className="w-full relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 overflow-hidden"
        style={{
          background: hovered ? 'rgba(255,0,60,0.08)' : 'transparent',
          border: `1px solid ${hovered ? 'rgba(255,0,60,0.2)' : 'transparent'}`,
          boxShadow: hovered ? '0 0 20px rgba(255,0,60,0.06)' : 'none',
        }}
      >
        {/* icon container */}
        <div
          className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200"
          style={{
            background: hovered ? 'rgba(255,0,60,0.12)' : 'rgba(255,255,255,0.06)',
            border: `1px solid ${hovered ? 'rgba(255,0,60,0.25)' : 'rgba(255,255,255,0.08)'}`,
          }}
        >
          <LogOut
            size={13}
            style={{
              color: hovered ? '#ff003c' : '#4a6a8a',
              filter: hovered ? 'drop-shadow(0 0 4px #ff003c)' : 'none',
              transition: 'all 0.2s',
            }}
          />
        </div>

        <span
          className="font-mono font-bold tracking-wide transition-all duration-200"
          style={{
            fontSize: 13,
            color: hovered ? '#ff003c' : '#4a6a8a',
            letterSpacing: '0.05em',
          }}
        >
          Terminate Session
        </span>
      </motion.button>
    </motion.div>
  );
};

/* ══════════════════════════════════════════
   SIDEBAR
══════════════════════════════════════════ */
const Sidebar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  /* live clock */
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="relative hidden md:flex flex-col w-64 h-full shrink-0 overflow-hidden"
      style={{
        background: 'rgba(3,6,15,0.95)',
        borderRight: '1px solid rgba(0,243,255,0.08)',
        backdropFilter: 'blur(20px)',
      }}
    >
      <SidebarBackground />

      {/* content — sits above canvas */}
      <div className="relative z-10 flex flex-col h-full">

        {/* ── LOGO ── */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.45 }}
          className="flex items-center gap-3 px-5 py-5"
          style={{ borderBottom: '1px solid rgba(0,243,255,0.07)' }}
        >
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: 'rgba(0,243,255,0.08)',
              border: '1px solid rgba(0,243,255,0.2)',
              boxShadow: '0 0 20px rgba(0,243,255,0.1)',
            }}
          >
            <motion.div
              animate={{ filter: ['drop-shadow(0 0 3px rgba(0,243,255,0.5))', 'drop-shadow(0 0 8px rgba(0,243,255,0.9))', 'drop-shadow(0 0 3px rgba(0,243,255,0.5))'] }}
              transition={{ duration: 2.5, repeat: Infinity }}
            >
              <Shield size={18} style={{ color: '#00f3ff' }} />
            </motion.div>
          </div>

          <div>
            <h1
              className="font-display font-black tracking-widest"
              style={{ fontSize: 15, color: '#f1f5f9', letterSpacing: '0.08em' }}
            >
              CYBER
              <span style={{ color: '#00f3ff', textShadow: '0 0 12px rgba(0,243,255,0.6)' }}>SHIELD</span>
            </h1>
            <p className="font-mono uppercase tracking-widest" style={{ fontSize: 11, color: '#8eb4d4', marginTop: 1 }}>
              AI Security Platform
            </p>
          </div>
        </motion.div>

        {/* ── MODULE LABEL ── */}
        <div className="px-5 pt-5 pb-2">
          <div className="flex items-center gap-2">
            <div style={{ width: 16, height: 1, background: 'rgba(0,243,255,0.3)' }} />
            <span className="font-mono uppercase tracking-[0.2em]" style={{ fontSize: 12, color: '#94a3b8' }}>
              Navigation
            </span>
          </div>
        </div>

        {/* ── NAV ITEMS ── */}
        <nav className="flex flex-col gap-1 px-3 flex-1">
          {menuItems.map((item, index) => (
            <NavItem key={item.path} item={item} index={index} />
          ))}
        </nav>

        {/* ── OPERATOR SECTION ── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.48, duration: 0.4 }}
          className="px-3 pt-3 pb-1"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
        >
          {/* section label — mirrors Navigation label */}
          <div className="flex items-center gap-2 px-1 mb-1.5">
            <div style={{ width: 16, height: 1, background: 'rgba(168,85,247,0.35)' }} />
            <span className="font-mono uppercase tracking-[0.2em]" style={{ fontSize: 12, color: '#94a3b8' }}>
              Operator
            </span>
          </div>

          {user && <ProfileNavItem user={user} />}
          <LogoutButton onLogout={handleLogout} />
        </motion.div>

        {/* ── SYSTEM STATUS CARD ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.45 }}
          className="mx-3 mb-3 rounded-2xl p-4 overflow-hidden"
          style={{
            background: 'rgba(0,0,0,0.4)',
            border: '1px solid rgba(255,255,255,0.10)',
          }}
        >
          {/* status header */}
          <div className="flex items-center justify-between mb-3">
            <span className="font-mono uppercase tracking-widest" style={{ fontSize: 12, color: '#94a3b8' }}>
              System Status
            </span>
            <div className="flex items-center gap-1.5">
              <motion.span
                className="rounded-full"
                style={{ width: 5, height: 5, background: '#39ff14', display: 'block', boxShadow: '0 0 6px #39ff14' }}
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
              <span className="font-mono font-bold uppercase tracking-widest" style={{ fontSize: 11, color: '#39ff14' }}>
                Online
              </span>
            </div>
          </div>

          {/* status rows */}
          {[
            { label: 'Node', val: 'ALPHA-7' },
            { label: 'Latency', val: '12ms' },
            { label: 'Uptime', val: '99.98%' },
          ].map(({ label, val }) => (
            <div
              key={label}
              className="flex items-center justify-between py-1.5"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.09)' }}
            >
              <span className="font-mono uppercase tracking-widest" style={{ fontSize: 12, color: '#94a3b8' }}>{label}</span>
              <span className="font-mono font-bold" style={{ fontSize: 13, color: '#a8bdd4' }}>{val}</span>
            </div>
          ))}

          {/* live clock */}
          <div className="flex items-center justify-between pt-2">
            <span className="font-mono uppercase tracking-widest" style={{ fontSize: 12, color: '#94a3b8' }}>Time</span>
            <span
              className="font-mono font-bold"
              style={{ fontSize: 11, color: '#00f3ff', fontVariantNumeric: 'tabular-nums' }}
            >
              {time.toLocaleTimeString('en-US', { hour12: false })}
            </span>
          </div>
        </motion.div>

        {/* ── FOOTER ── */}
        <div
          className="px-5 py-3 flex items-center justify-between"
          style={{ borderTop: '1px solid rgba(255,255,255,0.10)' }}
        >
          <span className="font-mono uppercase tracking-widest" style={{ fontSize: 11, color: '#8eb4d4' }}>
            v2.0.0
          </span>
          <span className="font-mono uppercase tracking-widest" style={{ fontSize: 11, color: '#8eb4d4' }}>
            CyberShield AI
          </span>
        </div>

      </div>
    </motion.div>
  );
};

export default Sidebar;
