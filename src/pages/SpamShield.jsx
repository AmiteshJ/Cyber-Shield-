import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, ShieldCheck, ShieldAlert, RefreshCw, Activity, Inbox, AlertTriangle, CheckCircle, Zap } from 'lucide-react';
import axios from 'axios';
import { io } from 'socket.io-client';

const BACKEND_URL = 'http://127.0.0.1:5000';
const socket = io(BACKEND_URL);

/* ─────────────────────────────────────────
   ANIMATED BACKGROUND
───────────────────────────────────────── */
const SpamBackground = () => {
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

        const orbs = [
            { x: 0.12, y: 0.22, hue: 180, size: 0.28 },
            { x: 0.88, y: 0.3, hue: 200, size: 0.22 },
            { x: 0.5, y: 0.8, hue: 160, size: 0.2 },
            { x: 0.2, y: 0.75, hue: 30, size: 0.15 },
        ];

        const nodes = Array.from({ length: 24 }, () => ({
            x: Math.random(), y: Math.random(),
            vx: (Math.random() - 0.5) * 0.00028,
            vy: (Math.random() - 0.5) * 0.00028,
            r: Math.random() * 1.2 + 0.4,
            phase: Math.random() * Math.PI * 2,
        }));

        /* floating mail envelopes */
        const envelopes = Array.from({ length: 8 }, () => ({
            x: Math.random() * 1.2 - 0.1,
            y: Math.random(),
            speed: 0.0003 + Math.random() * 0.0004,
            size: 8 + Math.random() * 10,
            alpha: 0.03 + Math.random() * 0.05,
            drift: (Math.random() - 0.5) * 0.0001,
        }));

        const drawEnvelope = (ex, ey, size, alpha) => {
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.strokeStyle = '#00f3ff';
            ctx.lineWidth = 0.6;
            ctx.strokeRect(ex, ey, size, size * 0.7);
            ctx.beginPath();
            ctx.moveTo(ex, ey);
            ctx.lineTo(ex + size / 2, ey + size * 0.35);
            ctx.lineTo(ex + size, ey);
            ctx.stroke();
            ctx.restore();
        };

        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#03060f';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            /* orbs */
            orbs.forEach((o, i) => {
                const pulse = Math.sin(t * 0.007 + i * 1.3) * 0.3 + 0.7;
                const r = o.size * Math.min(canvas.width, canvas.height) * pulse;
                const gx = o.x * canvas.width, gy = o.y * canvas.height;
                const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, r);
                g.addColorStop(0, `hsla(${o.hue},100%,60%,0.07)`);
                g.addColorStop(0.5, `hsla(${o.hue},100%,50%,0.03)`);
                g.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.fillStyle = g;
                ctx.beginPath(); ctx.arc(gx, gy, r, 0, Math.PI * 2); ctx.fill();
            });

            /* grid */
            ctx.strokeStyle = 'rgba(0,243,255,0.025)';
            ctx.lineWidth = 0.5;
            for (let x = 0; x < canvas.width; x += 52) {
                ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
            }
            for (let y = 0; y < canvas.height; y += 52) {
                ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
            }

            /* scan line */
            const sy = ((t * 0.45) % (canvas.height + 60)) - 30;
            const sg = ctx.createLinearGradient(0, sy - 30, 0, sy + 30);
            sg.addColorStop(0, 'rgba(0,243,255,0)');
            sg.addColorStop(0.5, 'rgba(0,243,255,0.04)');
            sg.addColorStop(1, 'rgba(0,243,255,0)');
            ctx.fillStyle = sg;
            ctx.fillRect(0, sy - 30, canvas.width, 60);

            /* floating envelopes */
            envelopes.forEach(e => {
                e.y -= e.speed;
                e.x += e.drift;
                if (e.y < -0.1) { e.y = 1.1; e.x = Math.random() * 1.2 - 0.1; }
                drawEnvelope(e.x * canvas.width, e.y * canvas.height, e.size, e.alpha);
            });

            /* particles */
            nodes.forEach(n => {
                n.x += n.vx; n.y += n.vy;
                if (n.x < 0 || n.x > 1) n.vx *= -1;
                if (n.y < 0 || n.y > 1) n.vy *= -1;
                const alpha = 0.1 + Math.sin(t * 0.02 + n.phase) * 0.07;
                ctx.beginPath();
                ctx.arc(n.x * canvas.width, n.y * canvas.height, n.r, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(0,243,255,${alpha})`;
                ctx.fill();
            });

            /* connections */
            for (let i = 0; i < nodes.length; i++) {
                for (let j = i + 1; j < nodes.length; j++) {
                    const dx = (nodes[i].x - nodes[j].x) * canvas.width;
                    const dy = (nodes[i].y - nodes[j].y) * canvas.height;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 140) {
                        ctx.beginPath();
                        ctx.strokeStyle = `rgba(0,243,255,${(1 - dist / 140) * 0.045})`;
                        ctx.lineWidth = 0.4;
                        ctx.moveTo(nodes[i].x * canvas.width, nodes[i].y * canvas.height);
                        ctx.lineTo(nodes[j].x * canvas.width, nodes[j].y * canvas.height);
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

/* ─────────────────────────────────────────
   DB LOG MAPPER & CONFIG
 ───────────────────────────────────────── */
const mapDbLog = (dbLog) => {
    const rawTime = dbLog.received_at || dbLog.created_at;
    const isSpam = dbLog.classification?.toLowerCase().includes('spam');
    return {
        id: dbLog.id,
        sender: dbLog.sender,
        subject: dbLog.subject,
        action: isSpam ? 'Sent to Spam' : 'Allowed',
        risk: isSpam ? 'Critical' : 'Low',
        time: new Date(rawTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        timestamp: new Date(rawTime).getTime(),
    };
};

const RISK_CFG = {
    Critical: { color: '#ff003c', rgb: '255,0,60', bg: 'rgba(255,0,60,0.08)', border: 'rgba(255,0,60,0.25)' },
    High: { color: '#f97316', rgb: '249,115,22', bg: 'rgba(249,115,22,0.08)', border: 'rgba(249,115,22,0.25)' },
    Medium: { color: '#eab308', rgb: '234,179,8', bg: 'rgba(234,179,8,0.08)', border: 'rgba(234,179,8,0.25)' },
    Low: { color: '#00f3ff', rgb: '0,243,255', bg: 'rgba(0,243,255,0.06)', border: 'rgba(0,243,255,0.2)' },
};



/* ─────────────────────────────────────────
   STAT CHIP
───────────────────────────────────────── */
const StatChip = ({ label, value, color, index }) => (
    <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.07 }}
        className="flex flex-col items-center px-5 py-3"
        style={{ borderRight: '1px solid rgba(255,255,255,0.07)' }}
    >
        <span className="font-mono font-black" style={{ fontSize: 20, color, textShadow: `0 0 12px ${color}66` }}>
            {value}
        </span>
        <span className="font-mono uppercase tracking-widest mt-1" style={{ fontSize: 11, color: '#475569' }}>
            {label}
        </span>
    </motion.div>
);

/* ─────────────────────────────────────────
   LOG ROW
───────────────────────────────────────── */
const LogRow = ({ log, index }) => {
    const r = RISK_CFG[log.risk] || RISK_CFG.Low;

    return (
        <motion.div
            initial={{ opacity: 0, x: -14, backgroundColor: 'rgba(255,255,255,0.04)' }}
            animate={{ opacity: 1, x: 0, backgroundColor: 'rgba(255,255,255,0)' }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="grid items-center px-4 py-3 rounded-xl group hover:bg-white/[0.025] transition-colors duration-150 gap-3"
            style={{ gridTemplateColumns: '1fr 1fr 140px 90px 100px' }}
        >
            {/* sender */}
            <div className="min-w-0">
                <p className="font-mono truncate" style={{ fontSize: 12, color: '#94a3b8' }}>{log.sender}</p>
            </div>

            {/* subject */}
            <div className="min-w-0">
                <p className="font-mono truncate" style={{ fontSize: 12, color: '#64748b' }}>{log.subject}</p>
            </div>

            {/* action */}
            <div>
                <span className="font-mono" style={{ fontSize: 12, color: '#39ff14' }}>{log.action}</span>
            </div>

            {/* risk badge */}
            <div>
                <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono font-bold uppercase"
                    style={{
                        fontSize: 11,
                        color: r.color,
                        background: r.bg,
                        border: `1px solid ${r.border}`,
                        letterSpacing: '0.08em',
                    }}
                >
                    <span style={{ width: 4, height: 4, borderRadius: '50%', background: r.color, display: 'inline-block', flexShrink: 0 }} />
                    {log.risk}
                </span>
            </div>

            {/* time */}
            <div className="text-right">
                <span className="font-mono" style={{ fontSize: 12, color: '#334155' }}>{log.time}</span>
            </div>
        </motion.div>
    );
};

/* ══════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════ */
const SpamShield = () => {
    const [isActive, setIsActive] = useState(true);
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const bottomRef = useRef(null);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${BACKEND_URL}/api/email-logs`);
            if (response.data?.success && Array.isArray(response.data.data)) {
                const mapped = response.data.data.map(mapDbLog).reverse();
                setLogs(mapped);
            }
        } catch (err) {
            console.error('Error fetching email logs:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    useEffect(() => {
        if (!isActive) return;
        const interval = setInterval(fetchLogs, 5000);
        return () => clearInterval(interval);
    }, [isActive]);

    useEffect(() => {
        socket.on('new_email_log', (newLog) => {
            setLogs(prev => {
                if (prev.some(l => l.id === newLog.id)) return prev;
                return [...prev, mapDbLog(newLog)];
            });
        });
        return () => {
            socket.off('new_email_log');
        };
    }, []);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    /* derived counts */
    const counts = {
        total: logs.length,
        critical: logs.filter(l => l.risk === 'Critical').length,
        high: logs.filter(l => l.risk === 'High').length,
        blocked: logs.filter(l => l.action === 'Sent to Spam').length,
    };

    const riskBreakdown = Object.entries(RISK_CFG).map(([name, cfg]) => ({
        name, cfg,
        pct: logs.length > 0 ? Math.round((logs.filter(l => l.risk === name).length / logs.length) * 100) : 0,
        count: logs.filter(l => l.risk === name).length,
    }));

    return (
        <div className="relative w-full" style={{ background: '#03060f', height: '100%', minHeight: 0 }}>
            <SpamBackground />

            {/* vignette */}
            <div
                className="absolute inset-0 pointer-events-none z-[1]"
                style={{ background: 'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.65) 100%)' }}
            />

            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6 }}
                className="relative z-10 flex flex-col gap-4"
                style={{ height: '100%', padding: '20px 24px', minHeight: 0 }}
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
                            <div style={{ width: 28, height: 1, background: 'rgba(0,243,255,0.6)' }} />
                            <span className="font-mono uppercase tracking-[0.22em]" style={{ fontSize: 10, color: 'rgba(0,243,255,0.6)' }}>
                                Module 08 / Inbox Intelligence
                            </span>
                        </div>
                        <h1 className="font-display font-black tracking-tight" style={{ fontSize: 26, color: '#f1f5f9', letterSpacing: '-0.01em' }}>
                            SPAM
                            <span style={{ color: '#00f3ff', textShadow: '0 0 28px rgba(0,243,255,0.6)', marginLeft: 10 }}>
                                SHIELD
                            </span>
                        </h1>
                        <p className="font-mono mt-0.5" style={{ fontSize: 10, color: '#475569', letterSpacing: '0.1em' }}>
                            NLP DETECTION · HEADER FORENSICS · LIVE QUARANTINE · HEURISTIC ENGINE
                        </p>
                    </div>

                    {/* user card */}
                    <div
                        className="flex items-center gap-3 px-4 py-3 rounded-2xl"
                        style={{ background: 'rgba(5,9,18,0.9)', border: '1px solid rgba(0,243,255,0.12)', backdropFilter: 'blur(16px)' }}
                    >
                        <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center font-display font-black"
                            style={{ background: 'rgba(0,243,255,0.1)', border: '1px solid rgba(0,243,255,0.25)', color: '#00f3ff', fontSize: 13 }}
                        >
                            AJ
                        </div>
                        <div>
                            <p className="font-mono font-bold" style={{ fontSize: 13, color: '#f1f5f9' }}>Amitesh</p>
                            <p className="font-mono" style={{ fontSize: 11, color: '#475569' }}>Active User Profile</p>
                        </div>
                    </div>
                </motion.div>

                {/* ══ STATS STRIP ══ */}
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="flex rounded-2xl overflow-hidden shrink-0"
                    style={{
                        background: 'rgba(5,9,18,0.88)',
                        border: '1px solid rgba(255,255,255,0.07)',
                        backdropFilter: 'blur(16px)',
                    }}
                >
                    <StatChip label="Intercepted" value={counts.total} color="#00f3ff" index={0} />
                    <StatChip label="Critical" value={counts.critical} color="#ff003c" index={1} />
                    <StatChip label="High Risk" value={counts.high} color="#f97316" index={2} />
                    <StatChip label="Blocked" value={counts.blocked} color="#39ff14" index={3} />

                    {/* spacer + controls */}
                    <div className="flex-1 flex items-center justify-end gap-3 px-5">
                        {/* refresh */}
                        <motion.button
                            whileHover={{ scale: 1.04 }}
                            whileTap={{ scale: 0.96 }}
                            onClick={fetchLogs}
                            disabled={loading}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl font-mono font-bold uppercase tracking-widest transition-all duration-200"
                            style={{
                                fontSize: 11,
                                background: 'rgba(0,243,255,0.07)',
                                border: '1px solid rgba(0,243,255,0.2)',
                                color: loading ? '#334155' : '#00f3ff',
                                cursor: loading ? 'not-allowed' : 'pointer',
                            }}
                        >
                            <motion.div
                                animate={loading ? { rotate: 360 } : { rotate: 0 }}
                                transition={loading ? { duration: 1, repeat: Infinity, ease: 'linear' } : {}}
                            >
                                <RefreshCw size={11} />
                            </motion.div>
                            Refresh
                        </motion.button>

                        {/* toggle */}
                        <div className="flex items-center gap-3">
                            <span className="font-mono uppercase tracking-widest" style={{ fontSize: 11, color: isActive ? '#39ff14' : '#475569' }}>
                                {isActive ? 'Active' : 'Paused'}
                            </span>
                            <motion.button
                                onClick={() => setIsActive(p => !p)}
                                className="relative rounded-full transition-colors duration-300"
                                style={{
                                    width: 44, height: 24,
                                    background: isActive ? 'rgba(57,255,20,0.2)' : 'rgba(255,255,255,0.07)',
                                    border: `1px solid ${isActive ? 'rgba(57,255,20,0.4)' : 'rgba(255,255,255,0.1)'}`,
                                    boxShadow: isActive ? '0 0 12px rgba(57,255,20,0.25)' : 'none',
                                }}
                            >
                                <motion.div
                                    animate={{ x: isActive ? 22 : 2 }}
                                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                                    className="absolute top-1 rounded-full"
                                    style={{
                                        width: 14, height: 14,
                                        background: isActive ? '#39ff14' : '#475569',
                                        boxShadow: isActive ? '0 0 8px #39ff14' : 'none',
                                    }}
                                />
                            </motion.button>
                        </div>
                    </div>
                </motion.div>

                {/* ══ MAIN GRID ══ */}
                <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_220px] gap-4 min-h-0 overflow-hidden">

                    {/* ── TERMINAL LOG ── */}
                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 }}
                        className="flex flex-col rounded-2xl overflow-hidden"
                        style={{
                            background: 'rgba(3,5,12,0.92)',
                            border: '1px solid rgba(255,255,255,0.07)',
                            backdropFilter: 'blur(20px)',
                            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
                        }}
                    >
                        {/* chrome bar */}
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
                                <Mail size={11} style={{ color: '#00f3ff' }} />
                                <span className="font-mono uppercase tracking-widest" style={{ fontSize: 11, color: '#475569' }}>
                                    spamshield@cybershield:~$
                                </span>
                            </div>
                            <div className="flex items-center gap-4">
                                {[
                                    { label: 'Critical', color: '#ff003c' },
                                    { label: 'High', color: '#f97316' },
                                    { label: 'Medium', color: '#eab308' },
                                    { label: 'Low', color: '#00f3ff' },
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
                            className="grid px-4 py-2 shrink-0 gap-3"
                            style={{
                                gridTemplateColumns: '1fr 1fr 140px 90px 100px',
                                borderBottom: '1px solid rgba(255,255,255,0.04)',
                            }}
                        >
                            {['SENDER', 'SUBJECT', 'ACTION', 'RISK', 'TIME'].map(h => (
                                <span key={h} className="font-mono uppercase tracking-widest" style={{ fontSize: 10, color: '#475569' }}>{h}</span>
                            ))}
                        </div>

                        {/* log rows */}
                        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5 custom-scrollbar">
                            <AnimatePresence initial={false}>
                                {logs.length === 0 ? (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="flex flex-col items-center justify-center h-48 gap-4"
                                    >
                                        <motion.div
                                            animate={{ scale: [1, 1.06, 1], opacity: [0.3, 0.7, 0.3] }}
                                            transition={{ duration: 3, repeat: Infinity }}
                                            className="w-14 h-14 rounded-2xl flex items-center justify-center"
                                            style={{ background: 'rgba(0,243,255,0.04)', border: '1px solid rgba(0,243,255,0.1)' }}
                                        >
                                            <Inbox size={22} style={{ color: 'rgba(0,243,255,0.25)' }} />
                                        </motion.div>
                                        <div className="text-center">
                                            <p className="font-mono font-bold uppercase tracking-widest" style={{ fontSize: 12, color: '#475569' }}>
                                                {isActive ? 'Scanning inbox…' : 'Awaiting activation'}
                                            </p>
                                            <p className="font-mono mt-1" style={{ fontSize: 11, color: '#334155' }}>
                                                {isActive ? 'Monitoring for threats' : 'Toggle the switch to begin'}
                                            </p>
                                        </div>
                                    </motion.div>
                                ) : (
                                    logs.map((log, idx) => (
                                        <LogRow key={log.id} log={log} index={idx} />
                                    ))
                                )}
                            </AnimatePresence>
                            <div ref={bottomRef} />
                        </div>

                        {/* terminal input bar */}
                        <div
                            className="flex items-center gap-2 px-4 py-2.5 shrink-0"
                            style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
                        >
                            <span className="font-mono font-bold" style={{ fontSize: 12, color: '#39ff14' }}>$</span>
                            <span className="font-mono" style={{ fontSize: 11, color: '#334155' }}>
                                tail -f /var/log/spamshield/intercept.log
                            </span>
                            {isActive && (
                                <motion.span
                                    className="inline-block ml-0.5"
                                    style={{ width: 6, height: 11, background: '#39ff14' }}
                                    animate={{ opacity: [1, 0, 1] }}
                                    transition={{ duration: 0.8, repeat: Infinity }}
                                />
                            )}
                        </div>
                    </motion.div>

                    {/* ── RIGHT SIDEBAR ── */}
                    <motion.div
                        initial={{ opacity: 0, x: 12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                        className="flex flex-col gap-4"
                    >

                        {/* Protection toggle card */}
                        <div
                            className="rounded-2xl p-4"
                            style={{
                                background: 'rgba(5,9,18,0.9)',
                                border: `1px solid ${isActive ? 'rgba(57,255,20,0.2)' : 'rgba(255,255,255,0.07)'}`,
                                backdropFilter: 'blur(16px)',
                                boxShadow: isActive ? '0 0 30px rgba(57,255,20,0.06)' : 'none',
                                transition: 'all 0.4s ease',
                            }}
                        >
                            <p className="font-mono uppercase tracking-widest mb-3" style={{ fontSize: 12, color: '#475569' }}>
                                Protection Engine
                            </p>

                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <motion.span
                                        className="rounded-full"
                                        style={{ width: 8, height: 8, background: isActive ? '#39ff14' : '#ff003c', display: 'block', boxShadow: isActive ? '0 0 8px #39ff14' : '0 0 8px #ff003c' }}
                                        animate={{ opacity: isActive ? [1, 0.4, 1] : 1 }}
                                        transition={{ duration: 1.2, repeat: Infinity }}
                                    />
                                    <span className="font-mono font-bold uppercase tracking-widest" style={{ fontSize: 13, color: isActive ? '#39ff14' : '#ff003c' }}>
                                        {isActive ? 'RUNNING' : 'STOPPED'}
                                    </span>
                                </div>
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => setIsActive(p => !p)}
                                    className="relative rounded-full transition-all duration-300"
                                    style={{
                                        width: 48, height: 26,
                                        background: isActive ? 'rgba(57,255,20,0.15)' : 'rgba(255,255,255,0.06)',
                                        border: `1px solid ${isActive ? 'rgba(57,255,20,0.35)' : 'rgba(255,255,255,0.1)'}`,
                                        boxShadow: isActive ? '0 0 14px rgba(57,255,20,0.2)' : 'none',
                                    }}
                                >
                                    <motion.div
                                        animate={{ x: isActive ? 24 : 2 }}
                                        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                                        className="absolute top-1.5 rounded-full"
                                        style={{
                                            width: 14, height: 14,
                                            background: isActive ? '#39ff14' : '#475569',
                                            boxShadow: isActive ? '0 0 10px #39ff14' : 'none',
                                        }}
                                    />
                                </motion.button>
                            </div>

                            {/* engine indicators */}
                            {[
                                { label: 'NLP Filter', active: isActive },
                                { label: 'Header Check', active: isActive },
                                { label: 'Link Scanner', active: isActive },
                                { label: 'Quarantine', active: true },
                            ].map(({ label, active }) => (
                                <div key={label} className="flex items-center justify-between py-1.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                    <span className="font-mono" style={{ fontSize: 12, color: '#475569' }}>{label}</span>
                                    <div className="flex items-center gap-1.5">
                                        <span style={{ width: 4, height: 4, borderRadius: '50%', background: active ? '#39ff14' : '#334155', display: 'block' }} />
                                        <span className="font-mono" style={{ fontSize: 11, color: active ? '#39ff14' : '#334155', letterSpacing: '0.1em' }}>
                                            {active ? 'ON' : 'OFF'}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Risk breakdown */}
                        <div
                            className="rounded-2xl p-4 flex-1"
                            style={{ background: 'rgba(5,9,18,0.9)', border: '1px solid rgba(255,255,255,0.07)', backdropFilter: 'blur(16px)' }}
                        >
                            <p className="font-mono uppercase tracking-widest mb-3" style={{ fontSize: 12, color: '#475569' }}>
                                Risk Breakdown
                            </p>

                            {riskBreakdown.map(({ name, cfg, pct, count }) => (
                                <div key={name} className="mb-3">
                                    <div className="flex justify-between mb-1">
                                        <span className="font-mono" style={{ fontSize: 11, color: '#475569' }}>{name}</span>
                                        <span className="font-mono font-bold" style={{ fontSize: 11, color: cfg.color }}>
                                            {count} · {pct}%
                                        </span>
                                    </div>
                                    <div className="rounded-full overflow-hidden" style={{ height: 3, background: 'rgba(255,255,255,0.04)' }}>
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${pct}%` }}
                                            transition={{ duration: 0.7, ease: 'easeOut' }}
                                            style={{
                                                height: '100%',
                                                borderRadius: 9999,
                                                background: `linear-gradient(90deg, ${cfg.color}, ${cfg.color}55)`,
                                                boxShadow: `0 0 5px ${cfg.color}55`,
                                            }}
                                        />
                                    </div>
                                </div>
                            ))}

                            {/* scan rate */}
                            <div
                                className="mt-4 flex items-center gap-3 px-3 py-2.5 rounded-xl"
                                style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)' }}
                            >
                                <Activity size={12} style={{ color: isActive ? '#39ff14' : '#334155', flexShrink: 0 }} />
                                <div>
                                    <p className="font-mono font-bold" style={{ fontSize: 12, color: '#94a3b8' }}>
                                        {isActive ? '3.5s' : '—'} Scan Rate
                                    </p>
                                    <p className="font-mono" style={{ fontSize: 11, color: '#334155' }}>Auto-refresh</p>
                                </div>
                            </div>
                        </div>

                        {/* Quick stats */}
                        <div
                            className="rounded-2xl p-4"
                            style={{ background: 'rgba(5,9,18,0.9)', border: '1px solid rgba(255,255,255,0.07)', backdropFilter: 'blur(16px)' }}
                        >
                            <p className="font-mono uppercase tracking-widest mb-3" style={{ fontSize: 12, color: '#475569' }}>
                                Session Stats
                            </p>
                            {[
                                { label: 'Engine', val: 'LLaMA 3.3 70B' },
                                { label: 'Mode', val: 'Real-time' },
                                { label: 'Queue', val: `${Math.max(0, counts.total - counts.blocked)} pending` },
                            ].map(({ label, val }) => (
                                <div key={label} className="flex justify-between py-1.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                    <span className="font-mono" style={{ fontSize: 12, color: '#475569' }}>{label}</span>
                                    <span className="font-mono font-bold" style={{ fontSize: 12, color: '#94a3b8' }}>{val}</span>
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
                    style={{ paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.05)' }}
                >
                    <span className="font-mono uppercase tracking-[0.2em]" style={{ fontSize: 10, color: '#334155' }}>
                        CyberShield AI · Spam Shield v2
                    </span>
                    <div className="flex items-center gap-4">
                        {[
                            { label: 'NLP Engine', active: true },
                            { label: 'Quarantine', active: true },
                            { label: 'Live Scan', active: isActive },
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

export default SpamShield;
