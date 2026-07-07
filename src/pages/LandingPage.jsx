import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from 'framer-motion';
import { Shield, Search, Zap, Eye, FileText, Terminal, ChevronRight, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/* ══════════════════════════════════════════════════════
   EPIC BACKGROUND — radar + matrix rain + particle mesh
══════════════════════════════════════════════════════ */
const EpicBackground = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId, t = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    /* ── Matrix rain columns ── */
    const COLS = Math.floor(window.innerWidth / 18);
    const drops = Array.from({ length: COLS }, () => Math.random() * -100);
    const chars = '01アイウエオカキクケコサシスセソタチツテトナニヌネノABCDEF'.split('');

    /* ── Particle mesh ── */
    const nodes = Array.from({ length: 55 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      r: Math.random() * 1.8 + 0.5,
      phase: Math.random() * Math.PI * 2,
      hue: [180, 160, 200, 0, 30][Math.floor(Math.random() * 5)],
    }));

    /* ── Floating orbs ── */
    const orbs = [
      { x: 0.15, y: 0.25, hue: 180, size: 0.35, speed: 0.005 },
      { x: 0.82, y: 0.20, hue: 0, size: 0.28, speed: 0.007 },
      { x: 0.72, y: 0.72, hue: 260, size: 0.22, speed: 0.006 },
      { x: 0.18, y: 0.78, hue: 130, size: 0.18, speed: 0.008 },
      { x: 0.5, y: 0.88, hue: 30, size: 0.15, speed: 0.009 },
    ];

    /* ── Radar ── */
    const radarX = () => canvas.width * 0.82;
    const radarY = () => canvas.height * 0.28;
    const radarR = () => Math.min(canvas.width, canvas.height) * 0.14;
    const blips = [
      { a: 0.6, d: 0.48 },
      { a: 2.3, d: 0.65 },
      { a: 4.1, d: 0.35 },
      { a: 5.4, d: 0.72 },
      { a: 1.1, d: 0.82 },
    ];

    /* ── Hex grid (top-left quarter) ── */
    const HEX = 36;

    const drawHex = (cx, cy, size, alpha) => {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i - Math.PI / 6;
        i === 0 ? ctx.moveTo(cx + size * Math.cos(a), cy + size * Math.sin(a))
          : ctx.lineTo(cx + size * Math.cos(a), cy + size * Math.sin(a));
      }
      ctx.closePath();
      ctx.strokeStyle = `rgba(0,243,255,${alpha})`;
      ctx.lineWidth = 0.5;
      ctx.stroke();
    };

    const draw = () => {
      const W = canvas.width, H = canvas.height;

      /* base */
      ctx.fillStyle = 'rgba(3,6,15,0.88)';
      ctx.fillRect(0, 0, W, H);

      /* ── matrix rain (very faint) ── */
      ctx.font = '11px monospace';
      drops.forEach((y, i) => {
        const char = chars[Math.floor(Math.random() * chars.length)];
        const alpha = 0.04 + Math.random() * 0.04;
        ctx.fillStyle = `rgba(0,243,255,${alpha})`;
        ctx.fillText(char, i * 18, y);
        drops[i] = y > H + Math.random() * 1000 ? 0 : y + 13;
      });

      /* ── orbs ── */
      orbs.forEach((o, i) => {
        const pulse = Math.sin(t * o.speed + i * 1.2) * 0.3 + 0.7;
        const r = o.size * Math.min(W, H) * pulse;
        const gx = o.x * W, gy = o.y * H;
        const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, r);
        g.addColorStop(0, `hsla(${o.hue},100%,60%,0.1)`);
        g.addColorStop(0.4, `hsla(${o.hue},100%,50%,0.045)`);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(gx, gy, r, 0, Math.PI * 2); ctx.fill();
      });

      /* ── hex grid (top 40% of screen, left 50%) ── */
      const hexCols = Math.ceil(W * 0.55 / (HEX * 1.75)) + 2;
      const hexRows = Math.ceil(H * 0.45 / (HEX * 1.52)) + 2;
      for (let r = -1; r < hexRows; r++) {
        for (let c = -1; c < hexCols; c++) {
          const x = c * HEX * 1.75;
          const y = r * HEX * 1.52 + (c % 2 === 0 ? 0 : HEX * 0.76);
          const brightness = Math.sin(t * 0.015 + r * 0.4 + c * 0.3) * 0.5 + 0.5;
          drawHex(x, y, HEX * 0.46, 0.018 + brightness * 0.04);
        }
      }

      /* ── particle mesh ── */
      nodes.forEach(n => {
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0 || n.x > W) n.vx *= -1;
        if (n.y < 0 || n.y > H) n.vy *= -1;
        const a = 0.1 + Math.sin(t * 0.02 + n.phase) * 0.07;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${n.hue},100%,60%,${a})`;
        ctx.fill();
      });
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x, dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 160) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(0,243,255,${(1 - dist / 160) * 0.055})`;
            ctx.lineWidth = 0.5;
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.stroke();
          }
        }
      }

      /* ── RADAR (top-right) ── */
      const rx = radarX(), ry = radarY(), rr = radarR();
      for (let ring = 1; ring <= 4; ring++) {
        ctx.beginPath();
        ctx.arc(rx, ry, (rr / 4) * ring, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(0,243,255,${ring === 4 ? 0.12 : 0.06})`;
        ctx.lineWidth = ring === 4 ? 1 : 0.5;
        ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(0,243,255,0.05)';
      ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(rx - rr, ry); ctx.lineTo(rx + rr, ry); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(rx, ry - rr); ctx.lineTo(rx, ry + rr); ctx.stroke();

      const sweep = (t * 0.025) % (Math.PI * 2);
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.arc(rx, ry, rr, sweep - 1.2, sweep);
      ctx.closePath();
      const sg = ctx.createLinearGradient(rx, ry, rx + rr * Math.cos(sweep), ry + rr * Math.sin(sweep));
      sg.addColorStop(0, 'rgba(0,243,255,0)');
      sg.addColorStop(1, 'rgba(0,243,255,0.15)');
      ctx.fillStyle = sg;
      ctx.fill();
      ctx.restore();

      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx + Math.cos(sweep) * rr, ry + Math.sin(sweep) * rr);
      ctx.strokeStyle = 'rgba(0,243,255,0.6)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      blips.forEach(b => {
        const diff = ((sweep - b.a) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
        const fade = Math.max(0, 1 - diff / (Math.PI * 0.65));
        if (fade > 0.01) {
          const bx = rx + Math.cos(b.a) * rr * b.d;
          const by = ry + Math.sin(b.a) * rr * b.d;
          ctx.beginPath();
          ctx.arc(bx, by, 3, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,0,60,${fade * 0.95})`;
          ctx.shadowColor = '#ff003c';
          ctx.shadowBlur = 10;
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      });

      ctx.beginPath();
      ctx.arc(rx, ry, rr, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(0,243,255,0.2)';
      ctx.lineWidth = 1;
      ctx.stroke();

      /* ── horizontal scan line ── */
      const scanY = ((t * 0.8) % (H + 60)) - 30;
      const scanG = ctx.createLinearGradient(0, scanY - 25, 0, scanY + 25);
      scanG.addColorStop(0, 'rgba(0,243,255,0)');
      scanG.addColorStop(0.5, 'rgba(0,243,255,0.035)');
      scanG.addColorStop(1, 'rgba(0,243,255,0)');
      ctx.fillStyle = scanG;
      ctx.fillRect(0, scanY - 25, W, 50);

      t++;
      animId = requestAnimationFrame(draw);
    };

    draw();
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize); };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
};

/* ══════════════════════════════════════════
   MOUSE FOLLOW GLOW
══════════════════════════════════════════ */
const MouseGlow = () => {
  const [pos, setPos] = useState({ x: -200, y: -200 });
  useEffect(() => {
    const move = (e) => setPos({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', move);
    return () => window.removeEventListener('mousemove', move);
  }, []);
  return (
    <div
      className="fixed pointer-events-none z-[2] transition-transform duration-75"
      style={{
        left: pos.x - 200,
        top: pos.y - 200,
        width: 400,
        height: 400,
        background: 'radial-gradient(circle, rgba(0,243,255,0.06) 0%, transparent 70%)',
        borderRadius: '50%',
      }}
    />
  );
};

/* ══════════════════════════════════════════
   TYPING EFFECT
══════════════════════════════════════════ */
const useTyping = (text, speed = 45, delay = 400) => {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);
  useEffect(() => {
    let i = 0;
    const timer = setTimeout(() => {
      const interval = setInterval(() => {
        setDisplayed(text.slice(0, i + 1));
        i++;
        if (i >= text.length) { clearInterval(interval); setDone(true); }
      }, speed);
      return () => clearInterval(interval);
    }, delay);
    return () => clearTimeout(timer);
  }, [text, speed, delay]);
  return { displayed, done };
};

/* ══════════════════════════════════════════
   GLITCH TEXT
══════════════════════════════════════════ */
const GlitchText = ({ children, className, style }) => {
  const [glitching, setGlitching] = useState(false);
  useEffect(() => {
    const fire = () => {
      setGlitching(true);
      setTimeout(() => setGlitching(false), 200);
      setTimeout(fire, 3000 + Math.random() * 4000);
    };
    const t = setTimeout(fire, 2000);
    return () => clearTimeout(t);
  }, []);

  return (
    <span className={`relative inline-block ${className}`} style={style}>
      {children}
      {glitching && (
        <>
          <span
            className="absolute inset-0 pointer-events-none"
            style={{
              color: '#ff003c',
              clipPath: 'polygon(0 20%, 100% 20%, 100% 40%, 0 40%)',
              transform: 'translateX(-3px)',
              opacity: 0.8,
            }}
          >{children}</span>
          <span
            className="absolute inset-0 pointer-events-none"
            style={{
              color: '#00f3ff',
              clipPath: 'polygon(0 60%, 100% 60%, 100% 80%, 0 80%)',
              transform: 'translateX(3px)',
              opacity: 0.8,
            }}
          >{children}</span>
        </>
      )}
    </span>
  );
};

/* ══════════════════════════════════════════
   FEATURE CARD
══════════════════════════════════════════ */
const featureAccents = {
  neonRed: { hex: '#ff003c', rgb: '255,0,60' },
  neonCyan: { hex: '#00f3ff', rgb: '0,243,255' },
  neonGreen: { hex: '#39ff14', rgb: '57,255,20' },
  neonPurple: { hex: '#b000ff', rgb: '176,0,255' },
};

const FeatureCard = ({ feature, index }) => {
  const [hovered, setHovered] = useState(false);
  const Icon = feature.icon;
  const acc = featureAccents[feature.color] || featureAccents.neonCyan;
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.07, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => navigate(feature.path)}
      className="relative cursor-pointer overflow-hidden rounded-2xl"
      style={{
        background: hovered ? `rgba(${acc.rgb},0.07)` : 'rgba(5,9,18,0.8)',
        border: `1px solid ${hovered ? `rgba(${acc.rgb},0.4)` : 'rgba(255,255,255,0.14)'}`,
        backdropFilter: 'blur(16px)',
        boxShadow: hovered ? `0 0 40px rgba(${acc.rgb},0.15), inset 0 1px 0 rgba(255,255,255,0.10)` : 'inset 0 1px 0 rgba(255,255,255,0.10)',
        padding: '24px',
        transition: 'all 0.35s ease',
      }}
    >
      {/* top-right number */}
      <div
        className="absolute top-4 right-4 font-mono font-black"
        style={{ fontSize: 11, color: `rgba(${acc.rgb},0.2)`, letterSpacing: '0.1em' }}
      >
        {String(index + 1).padStart(2, '0')}
      </div>

      {/* diagonal slash */}
      <div
        className="absolute top-0 right-0 w-24 h-24 pointer-events-none"
        style={{
          background: `linear-gradient(135deg, transparent 55%, rgba(${acc.rgb},${hovered ? 0.08 : 0.03}) 100%)`,
          transition: 'all 0.35s',
        }}
      />

      {/* icon */}
      <motion.div
        animate={hovered ? { rotate: [0, -8, 8, 0], scale: [1, 1.15, 1] } : {}}
        transition={{ duration: 0.4 }}
        className="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
        style={{
          background: `rgba(${acc.rgb},${hovered ? 0.15 : 0.08})`,
          border: `1px solid rgba(${acc.rgb},${hovered ? 0.4 : 0.18})`,
          boxShadow: hovered ? `0 0 20px rgba(${acc.rgb},0.25)` : 'none',
          transition: 'all 0.3s',
        }}
      >
        <Icon size={20} style={{ color: acc.hex, filter: hovered ? `drop-shadow(0 0 6px ${acc.hex})` : 'none', transition: 'all 0.3s' }} />
      </motion.div>

      {/* tag */}
      <div className="flex items-center gap-2 mb-3">
        <div style={{ width: 4, height: 4, borderRadius: '50%', background: acc.hex, boxShadow: `0 0 6px ${acc.hex}` }} />
        <span
          className="font-mono uppercase tracking-[0.18em]"
          style={{ fontSize: 8, color: acc.hex, opacity: 0.7 }}
        >
          {feature.tag}
        </span>
      </div>

      <h3 className="font-display font-black mb-2" style={{ fontSize: 14, color: '#f1f5f9', letterSpacing: '0.03em' }}>
        {feature.title}
      </h3>
      <p className="font-mono leading-relaxed" style={{ fontSize: 10, color: '#8eb4d4', lineHeight: 1.7 }}>
        {feature.desc}
      </p>

      {/* hover CTA */}
      <motion.div
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: hovered ? 1 : 0, x: hovered ? 0 : -8 }}
        transition={{ duration: 0.2 }}
        className="flex items-center gap-1.5 mt-4 font-mono font-bold"
        style={{ fontSize: 10, color: acc.hex }}
      >
        EXPLORE <ChevronRight size={12} />
      </motion.div>

      {/* bottom accent line */}
      <div
        className="absolute bottom-0 left-0 h-[2px] transition-all duration-500"
        style={{
          width: hovered ? '100%' : '0%',
          background: `linear-gradient(90deg, ${acc.hex}, rgba(${acc.rgb},0.2))`,
          boxShadow: `0 0 8px rgba(${acc.rgb},0.5)`,
        }}
      />

      {/* corner brackets */}
      {[
        'top-2 left-2 border-t border-l',
        'top-2 right-2 border-t border-r',
        'bottom-2 left-2 border-b border-l',
        'bottom-2 right-2 border-b border-r',
      ].map((cls, i) => (
        <div
          key={i}
          className={`absolute w-3 h-3 ${cls} transition-all duration-300`}
          style={{ borderColor: hovered ? acc.hex : 'rgba(255,255,255,0.08)', opacity: hovered ? 1 : 0.4 }}
        />
      ))}
    </motion.div>
  );
};

/* ══════════════════════════════════════════
   STAT COUNTER
══════════════════════════════════════════ */
const StatCounter = ({ value, label, color, delay }) => {
  const [count, setCount] = useState(0);
  const target = parseInt(value.replace(/\D/g, ''));
  const suffix = value.replace(/[\d,]/g, '');

  useEffect(() => {
    const t = setTimeout(() => {
      let start = 0;
      const step = Math.ceil(target / 60);
      const interval = setInterval(() => {
        start = Math.min(start + step, target);
        setCount(start);
        if (start >= target) clearInterval(interval);
      }, 20);
    }, delay);
    return () => clearTimeout(t);
  }, [target, delay]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: delay / 1000, duration: 0.5 }}
      className="flex flex-col items-center"
    >
      <div
        className="font-display font-black"
        style={{ fontSize: 36, color, textShadow: `0 0 24px ${color}88`, letterSpacing: '-0.02em' }}
      >
        {count.toLocaleString()}{suffix}
      </div>
      <div className="font-mono uppercase tracking-[0.2em]" style={{ fontSize: 8, color: '#5a7a9a', marginTop: 4 }}>
        {label}
      </div>
    </motion.div>
  );
};

/* ══════════════════════════════════════════
   STEP CARD (how it works)
══════════════════════════════════════════ */
const StepCard = ({ step, index }) => {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.15, duration: 0.5 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative flex flex-col items-center text-center"
    >
      {/* numbered circle */}
      <motion.div
        animate={hovered ? { scale: 1.08 } : { scale: 1 }}
        transition={{ duration: 0.3 }}
        className="relative w-20 h-20 rounded-2xl flex items-center justify-center mb-5"
        style={{
          background: hovered ? 'rgba(0,243,255,0.1)' : 'rgba(5,9,18,0.9)',
          border: `1px solid ${hovered ? 'rgba(0,243,255,0.4)' : 'rgba(0,243,255,0.12)'}`,
          boxShadow: hovered ? '0 0 30px rgba(0,243,255,0.2)' : 'none',
          transition: 'all 0.3s',
        }}
      >
        <span style={{ fontSize: 32 }}>{step.icon}</span>
        {/* step number badge */}
        <div
          className="absolute -top-2 -right-2 w-6 h-6 rounded-lg flex items-center justify-center font-mono font-black"
          style={{ fontSize: 9, background: '#00f3ff', color: '#03060f' }}
        >
          {String(index + 1).padStart(2, '0')}
        </div>
      </motion.div>

      <div className="font-mono uppercase tracking-[0.2em] mb-2" style={{ fontSize: 8, color: 'rgba(0,243,255,0.5)' }}>
        STEP {step.step}
      </div>
      <h3 className="font-display font-black mb-2" style={{ fontSize: 13, color: '#f1f5f9', letterSpacing: '0.05em' }}>
        {step.title}
      </h3>
      <p className="font-mono leading-relaxed" style={{ fontSize: 10, color: '#8eb4d4', maxWidth: 200 }}>
        {step.desc}
      </p>

      {/* connector line */}
      {index < 2 && (
        <div
          className="hidden md:block absolute top-10 left-[calc(50%+52px)] right-0"
          style={{ height: 1, background: 'linear-gradient(90deg, rgba(0,243,255,0.3), rgba(0,243,255,0.05))' }}
        >
          <motion.div
            className="absolute top-1/2 -translate-y-1/2"
            animate={{ left: ['0%', '100%'] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
            style={{ width: 6, height: 6, borderRadius: '50%', background: '#00f3ff', boxShadow: '0 0 8px #00f3ff' }}
          />
        </div>
      )}
    </motion.div>
  );
};

/* ══════════════════════════════════════════
   LANDING PAGE
══════════════════════════════════════════ */
const LandingPage = () => {
  const navigate = useNavigate();
  const { displayed: typed, done: typedDone } = useTyping('INITIALIZING CYBERSHIELD AI SYSTEMS...', 42, 300);
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    const t = setInterval(() => setShowCursor(p => !p), 500);
    return () => clearInterval(t);
  }, []);

  const features = [
    { icon: AlertTriangle, title: 'AI Malware Detection', desc: 'Real-time polymorphic malware scanning powered by VirusTotal and AI heuristics.', color: 'neonRed', path: '/malware', tag: 'ACTIVE' },
    { icon: Eye, title: 'Phishing & Deepfake', desc: 'Detect AI-generated deepfakes and spear-phishing across text, images and video.', color: 'neonCyan', path: '/phishing', tag: 'ACTIVE' },
    { icon: Search, title: 'CVE Prioritization', desc: 'Intelligent vulnerability triage using live NVD data and Groq AI analysis.', color: 'neonGreen', path: '/vulnerabilities', tag: 'ACTIVE' },
    { icon: FileText, title: 'Policy Intelligence', desc: 'Upload any security policy PDF and query it in natural language instantly.', color: 'neonPurple', path: '/policy', tag: 'ACTIVE' },
    { icon: Terminal, title: 'Honeypot Simulator', desc: 'Generative deceptive network responses to confuse and track attackers.', color: 'neonCyan', path: '/honeypot', tag: 'ACTIVE' },
    { icon: Zap, title: 'NEXUS AI Copilot', desc: 'Elite security chatbot for incident response, CVE analysis and hardening.', color: 'neonGreen', path: '/chatbot', tag: 'ACTIVE' },
  ];

  const steps = [
    { step: '01', title: 'UPLOAD & SCAN', desc: 'Upload files, paste emails, or input CVE IDs. Our AI begins analysis instantly.', icon: '📤' },
    { step: '02', title: 'AI ANALYSIS', desc: 'Groq LLaMA 3.3 70B and VirusTotal engines analyze threats in milliseconds.', icon: '🧠' },
    { step: '03', title: 'ACT ON RESULTS', desc: 'Get prioritized recommendations and exact remediation steps immediately.', icon: '🛡️' },
  ];

  return (
    <div className="relative min-h-screen overflow-x-hidden" style={{ background: '#03060f' }}>
      <EpicBackground />
      <MouseGlow />

      {/* vignette */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.6) 100%)', zIndex: 1 }}
      />

      {/* ════════════════════════════
          HERO SECTION
      ════════════════════════════ */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 overflow-hidden" style={{ zIndex: 10 }}>

        {/* boot text */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="font-mono mb-8 h-5 flex items-center gap-1"
          style={{ fontSize: 10, color: '#39ff14', letterSpacing: '0.12em' }}
        >
          <span style={{ color: '#5a7a9a' }}>{'> '}</span>
          {typed}
          {showCursor && <span style={{ color: '#39ff14', fontWeight: 900 }}>█</span>}
        </motion.div>

        {/* shield with orbiting elements */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', duration: 1.2, delay: 0.5 }}
          className="relative mb-8"
        >
          {/* outer rings */}
          {[90, 65, 44].map((size, i) => (
            <motion.div
              key={size}
              className="absolute rounded-full"
              style={{
                width: size * 2, height: size * 2,
                top: '50%', left: '50%',
                transform: 'translate(-50%,-50%)',
                border: `1px solid rgba(0,243,255,${0.08 + i * 0.04})`,
              }}
              animate={{ rotate: i % 2 === 0 ? 360 : -360 }}
              transition={{ duration: 8 + i * 5, repeat: Infinity, ease: 'linear' }}
            />
          ))}

          {/* orbiting threat dots */}
          {[
            { color: '#ff003c', delay: 0, radius: 82, duration: 5 },
            { color: '#f97316', delay: 1.5, radius: 65, duration: 7 },
            { color: '#39ff14', delay: 0.8, radius: 50, duration: 4.5 },
          ].map((orb, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full"
              style={{
                width: 6, height: 6,
                top: '50%', left: '50%',
                marginTop: -3, marginLeft: -3,
                background: orb.color,
                boxShadow: `0 0 10px ${orb.color}`,
              }}
              animate={{ rotate: 360 }}
              transition={{ duration: orb.duration, repeat: Infinity, ease: 'linear', delay: orb.delay }}
              transformTemplate={({ rotate }) => `rotate(${rotate}) translateX(${orb.radius}px)`}
            />
          ))}

          {/* shield icon */}
          <motion.div
            className="relative z-10 w-24 h-24 rounded-2xl flex items-center justify-center"
            style={{
              background: 'rgba(0,243,255,0.08)',
              border: '1px solid rgba(0,243,255,0.3)',
            }}
            animate={{
              boxShadow: [
                '0 0 20px rgba(0,243,255,0.2)',
                '0 0 60px rgba(0,243,255,0.5)',
                '0 0 20px rgba(0,243,255,0.2)',
              ],
            }}
            transition={{ duration: 2.5, repeat: Infinity }}
          >
            <Shield size={44} style={{ color: '#00f3ff', filter: 'drop-shadow(0 0 12px rgba(0,243,255,0.8))' }} />
          </motion.div>
        </motion.div>

        {/* main title */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-4"
        >
          <h1 className="font-display font-black leading-none tracking-tight mb-3" style={{ fontSize: 'clamp(52px,8vw,100px)' }}>
            <span style={{ color: '#f1f5f9' }}>CYBER</span>
            <GlitchText
              style={{ color: '#00f3ff', textShadow: '0 0 40px rgba(0,243,255,0.7)', marginLeft: 12 }}
            >
              SHIELD
            </GlitchText>
          </h1>
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 1.3, duration: 0.6 }}
            className="font-mono uppercase tracking-[0.45em] text-center"
            style={{ fontSize: 12, color: '#39ff14', textShadow: '0 0 10px rgba(57,255,20,0.7)', letterSpacing: '0.5em' }}
          >
            AI SECURITY PLATFORM
          </motion.div>
        </motion.div>

        {/* subtitle */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4 }}
          className="text-center font-mono max-w-xl mb-10"
          style={{ fontSize: 11, color: '#8eb4d4', lineHeight: 1.9, letterSpacing: '0.06em' }}
        >
          Next-generation AI-powered cybersecurity platform for real-time threat detection,
          vulnerability prioritization, and intelligent policy interpretation.
        </motion.p>

        {/* CTA buttons */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.6 }}
          className="flex gap-4 flex-wrap justify-center mb-12"
        >
          {/* primary */}
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => navigate('/dashboard')}
            className="relative overflow-hidden px-10 py-4 rounded-xl font-display font-black uppercase tracking-widest flex items-center gap-3"
            style={{
              fontSize: 12,
              background: '#00f3ff',
              color: '#03060f',
              boxShadow: '0 0 40px rgba(0,243,255,0.35)',
            }}
          >
            {/* shimmer */}
            <motion.div
              className="absolute inset-0"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)' }}
              animate={{ x: ['-100%', '200%'] }}
              transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2 }}
            />
            <span className="relative z-10 flex items-center gap-2">
              LAUNCH PLATFORM <ChevronRight size={16} />
            </span>
          </motion.button>

          {/* secondary */}
          <motion.button
            whileHover={{ scale: 1.04, boxShadow: '0 0 24px rgba(0,243,255,0.2)' }}
            whileTap={{ scale: 0.96 }}
            onClick={() => navigate('/chatbot')}
            className="px-10 py-4 rounded-xl font-display font-black uppercase tracking-widest flex items-center gap-2 transition-all duration-200"
            style={{
              fontSize: 12,
              background: 'rgba(0,243,255,0.07)',
              border: '1px solid rgba(0,243,255,0.3)',
              color: '#00f3ff',
            }}
          >
            TRY NEXUS AI
          </motion.button>
        </motion.div>

        {/* status badges */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.9 }}
          className="flex gap-6 flex-wrap justify-center"
        >
          {[
            { label: 'THREAT DETECTION', color: '#39ff14' },
            { label: 'CVE MONITORING', color: '#00f3ff' },
            { label: 'AI ANALYSIS', color: '#b000ff' },
            { label: 'LIVE FEED', color: '#ff003c' },
          ].map((b, i) => (
            <div key={b.label} className="flex items-center gap-2">
              <motion.div
                className="rounded-full"
                style={{ width: 6, height: 6, background: b.color, boxShadow: `0 0 8px ${b.color}` }}
                animate={{ opacity: [1, 0.3, 1], scale: [1, 1.2, 1] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.3 }}
              />
              <span className="font-mono uppercase tracking-[0.18em]" style={{ fontSize: 8, color: b.color }}>
                {b.label}
              </span>
            </div>
          ))}
        </motion.div>

        {/* scroll indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
        >
          <span className="font-mono uppercase tracking-widest" style={{ fontSize: 7, color: '#5a7a9a' }}>SCROLL</span>
          <div
            className="w-5 h-8 rounded-full flex items-start justify-center p-1"
            style={{ border: '1px solid rgba(0,243,255,0.2)' }}
          >
            <motion.div
              className="w-1 h-2 rounded-full"
              style={{ background: '#00f3ff' }}
              animate={{ y: [0, 12, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </div>
        </motion.div>
      </section>

      {/* ════════════════════════════
          STATS SECTION
      ════════════════════════════ */}
      <section className="relative py-20 px-6" style={{ zIndex: 10 }}>
        <div className="max-w-5xl mx-auto">
          <div
            className="grid grid-cols-2 md:grid-cols-4 gap-8 rounded-2xl px-8 py-10"
            style={{
              background: 'rgba(5,9,18,0.85)',
              border: '1px solid rgba(0,243,255,0.08)',
              backdropFilter: 'blur(20px)',
            }}
          >
            <StatCounter value="251,000+" label="CVEs Tracked" color="#00f3ff" delay={100} />
            <StatCounter value="99.98%" label="Uptime SLA" color="#39ff14" delay={200} />
            <StatCounter value="70B" label="Param AI Model" color="#b000ff" delay={300} />
            <StatCounter value="12ms" label="Avg Response Time" color="#f97316" delay={400} />
          </div>
        </div>
      </section>

      {/* ════════════════════════════
          FEATURES SECTION
      ════════════════════════════ */}
      <section className="relative py-20 px-6" style={{ zIndex: 10 }}>
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <div className="flex items-center justify-center gap-3 mb-4">
              <div style={{ width: 40, height: 1, background: 'rgba(0,243,255,0.4)' }} />
              <span className="font-mono uppercase tracking-[0.25em]" style={{ fontSize: 9, color: 'rgba(0,243,255,0.5)' }}>
                Platform Capabilities
              </span>
              <div style={{ width: 40, height: 1, background: 'rgba(0,243,255,0.4)' }} />
            </div>
            <h2 className="font-display font-black" style={{ fontSize: 'clamp(28px,4vw,48px)', color: '#f1f5f9' }}>
              EVERY THREAT.{' '}
              <GlitchText style={{ color: '#00f3ff', textShadow: '0 0 20px rgba(0,243,255,0.6)' }}>
                NEUTRALIZED.
              </GlitchText>
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f, i) => <FeatureCard key={f.title} feature={f} index={i} />)}
          </div>
        </div>
      </section>

      {/* ════════════════════════════
          HOW IT WORKS
      ════════════════════════════ */}
      <section className="relative py-20 px-6" style={{ zIndex: 10 }}>
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(1px)' }}
        />
        <div className="relative max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <div className="flex items-center justify-center gap-3 mb-4">
              <div style={{ width: 40, height: 1, background: 'rgba(57,255,20,0.4)' }} />
              <span className="font-mono uppercase tracking-[0.25em]" style={{ fontSize: 9, color: 'rgba(57,255,20,0.5)' }}>
                How It Works
              </span>
              <div style={{ width: 40, height: 1, background: 'rgba(57,255,20,0.4)' }} />
            </div>
            <h2 className="font-display font-black" style={{ fontSize: 'clamp(28px,4vw,48px)', color: '#f1f5f9' }}>
              3 STEPS TO{' '}
              <span style={{ color: '#39ff14', textShadow: '0 0 20px rgba(57,255,20,0.6)' }}>
                FULL PROTECTION
              </span>
            </h2>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
            {steps.map((s, i) => <StepCard key={s.step} step={s} index={i} />)}
          </div>
        </div>
      </section>

      {/* ════════════════════════════
          CTA SECTION
      ════════════════════════════ */}
      <section className="relative py-32 px-6" style={{ zIndex: 10 }}>
        {/* pulsing background glow */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at center, rgba(0,243,255,0.06) 0%, transparent 70%)' }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 4, repeat: Infinity }}
        />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto text-center relative"
        >
          {/* corner decorations */}
          {[
            '-top-8 -left-8 border-t-2 border-l-2',
            '-top-8 -right-8 border-t-2 border-r-2',
            '-bottom-8 -left-8 border-b-2 border-l-2',
            '-bottom-8 -right-8 border-b-2 border-r-2',
          ].map((cls, i) => (
            <motion.div
              key={i}
              className={`absolute w-10 h-10 ${cls}`}
              style={{ borderColor: 'rgba(0,243,255,0.25)' }}
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 2, repeat: Infinity, delay: i * 0.4 }}
            />
          ))}

          <div className="flex items-center justify-center gap-3 mb-5">
            <div style={{ width: 28, height: 1, background: 'rgba(0,243,255,0.4)' }} />
            <span className="font-mono uppercase tracking-[0.25em]" style={{ fontSize: 9, color: 'rgba(0,243,255,0.5)' }}>
              Ready to Deploy?
            </span>
            <div style={{ width: 28, height: 1, background: 'rgba(0,243,255,0.4)' }} />
          </div>

          <h2 className="font-display font-black mb-4" style={{ fontSize: 'clamp(32px,5vw,64px)', color: '#f1f5f9', lineHeight: 1 }}>
            BECOME THE
            <GlitchText
              className="block"
              style={{ color: '#00f3ff', textShadow: '0 0 40px rgba(0,243,255,0.7)' }}
            >
              DIGITAL SHIELD
            </GlitchText>
          </h2>

          <p className="font-mono mb-10" style={{ fontSize: 10, color: '#8eb4d4', lineHeight: 1.8, letterSpacing: '0.06em' }}>
            Detect threats before they strike. Powered by real AI, real data, real protection.
          </p>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/dashboard')}
            className="relative overflow-hidden px-14 py-5 rounded-xl font-display font-black uppercase tracking-widest inline-flex items-center gap-3"
            style={{
              fontSize: 13,
              background: '#00f3ff',
              color: '#03060f',
              boxShadow: '0 0 60px rgba(0,243,255,0.45)',
            }}
          >
            <motion.div
              className="absolute inset-0"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)' }}
              animate={{ x: ['-100%', '200%'] }}
              transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 1.5 }}
            />
            <span className="relative z-10">INITIATE UPLINK →</span>
          </motion.button>
        </motion.div>
      </section>

      {/* ════════════════════════════
          FOOTER
      ════════════════════════════ */}
      <footer
        className="relative py-6 px-8 flex items-center justify-between flex-wrap gap-4"
        style={{ borderTop: '1px solid rgba(0,243,255,0.07)', zIndex: 10 }}
      >
        <div className="flex items-center gap-3">
          <Shield size={16} style={{ color: '#00f3ff' }} />
          <span className="font-display font-bold tracking-widest" style={{ fontSize: 11, color: '#8eb4d4' }}>CYBERSHIELD AI</span>
        </div>
        <div className="flex items-center gap-2">
          <motion.div
            className="rounded-full"
            style={{ width: 6, height: 6, background: '#39ff14', boxShadow: '0 0 6px #39ff14' }}
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
          <span className="font-mono uppercase tracking-widest" style={{ fontSize: 8, color: '#39ff14' }}>ALL SYSTEMS OPERATIONAL</span>
        </div>
        <span className="font-mono uppercase tracking-widest" style={{ fontSize: 7, color: '#0f172a' }}>
          BUILT FOR THE DIGITAL BATTLEFIELD
        </span>
      </footer>
    </div>
  );
};

export default LandingPage;
