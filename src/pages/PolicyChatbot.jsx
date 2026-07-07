import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Send, FileText, CheckCircle, Loader, Hash, AlertTriangle, Shield, Search } from 'lucide-react';
import axios from 'axios';

/* ═══════════════════════════════════════════
   ANIMATED BACKGROUND — matches other pages
═══════════════════════════════════════════ */
const PolicyBackground = () => {
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

    const nodes = Array.from({ length: 22 }, () => ({
      x: Math.random(), y: Math.random(),
      vx: (Math.random() - 0.5) * 0.00028,
      vy: (Math.random() - 0.5) * 0.00028,
      r: Math.random() * 1.2 + 0.4,
      phase: Math.random() * Math.PI * 2,
    }));

    const orbs = [
      { x: 0.1,  y: 0.2,  hue: 180, size: 0.3  },
      { x: 0.88, y: 0.25, hue: 160, size: 0.22 },
      { x: 0.5,  y: 0.85, hue: 200, size: 0.2  },
      { x: 0.15, y: 0.75, hue: 170, size: 0.15 },
    ];

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#03060f';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

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

      ctx.strokeStyle = 'rgba(0,243,255,0.025)';
      ctx.lineWidth = 0.5;
      for (let x = 0; x < canvas.width; x += 50) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += 50) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
      }

      const sy = ((t * 0.5) % (canvas.height + 60)) - 30;
      const sg = ctx.createLinearGradient(0, sy - 30, 0, sy + 30);
      sg.addColorStop(0, 'rgba(0,243,255,0)');
      sg.addColorStop(0.5, 'rgba(0,243,255,0.04)');
      sg.addColorStop(1, 'rgba(0,243,255,0)');
      ctx.fillStyle = sg;
      ctx.fillRect(0, sy - 30, canvas.width, 60);

      nodes.forEach(n => {
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0 || n.x > 1) n.vx *= -1;
        if (n.y < 0 || n.y > 1) n.vy *= -1;
        const alpha = 0.12 + Math.sin(t * 0.02 + n.phase) * 0.08;
        ctx.beginPath();
        ctx.arc(n.x * canvas.width, n.y * canvas.height, n.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0,243,255,${alpha})`;
        ctx.fill();
      });

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

const QUERIES = [
  { tag: 'PWD',  q: 'What is the password policy?' },
  { tag: 'USB',  q: 'Can employees use personal USB drives?' },
  { tag: 'INC',  q: 'What should I do if I suspect a data breach?' },
  { tag: 'RWK',  q: 'What are the remote work security requirements?' },
  { tag: 'PRIV', q: 'What data is classified as confidential?' },
  { tag: 'RPT',  q: 'How should security incidents be reported?' },
];

const PolicyChatbot = () => {
  const [policyLoaded, setPolicyLoaded] = useState(false);
  const [policyInfo,   setPolicyInfo]   = useState(null);
  const [uploading,    setUploading]    = useState(false);
  const [isDragging,   setIsDragging]   = useState(false);
  const [messages,     setMessages]     = useState([{
    role: 'assistant',
    content: 'POLICY INTELLIGENCE SYSTEM — ONLINE\n\nNo document loaded. Upload a security policy PDF to begin interrogation.\n\nSupports: ISO 27001 · NIST · SOC2 · GDPR · HIPAA · Internal Policies',
    timestamp: new Date(),
  }]);
  const [input,   setInput]   = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  const endRef      = useRef(null);
  const inputRef    = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    axios.get('http://127.0.0.1:5000/api/policy-status')
      .then(r => {
        if (r.data.data.loaded) {
          setPolicyLoaded(true);
          setPolicyInfo({ filename: r.data.data.filename, characters: r.data.data.characters });
        }
      })
      .catch(() => {});
  }, []);

  const processFile = useCallback(async (file) => {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('policy', file);
      const res = await axios.post('http://127.0.0.1:5000/api/upload-policy', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data.success) {
        setPolicyLoaded(true);
        setPolicyInfo(res.data.data);
        setMessages([{
          role: 'assistant',
          content: `DOCUMENT INDEXED SUCCESSFULLY\n\nFile: ${res.data.data.filename}\nCharacters: ${res.data.data.characters}\nStatus: READY FOR INTERROGATION\n\nYou may now query this policy document.`,
          timestamp: new Date(),
          isSuccess: true,
        }]);
      }
    } catch (err) {
      if (err.response?.data?.error) {
        setError(`Upload failed: ${err.response.data.error}`);
      } else {
        setError('Upload failed — ensure backend is running on port 5000');
      }
    } finally {
      setUploading(false);
    }
  }, []);

  const handleFileChange = (e) => processFile(e.target.files[0]);
  const handleDrop = (e) => { e.preventDefault(); setIsDragging(false); processFile(e.dataTransfer.files[0]); };

  const handleAsk = async () => {
    if (!input.trim() || loading) return;
    const q = input.trim();
    setInput('');
    setMessages(p => [...p, { role: 'user', content: q, timestamp: new Date() }]);
    setLoading(true);
    try {
      const res = await axios.post('http://127.0.0.1:5000/api/ask-policy', { question: q });
      if (res.data.success) {
        setMessages(p => [...p, { role: 'assistant', content: res.data.data.answer, timestamp: new Date() }]);
      }
    } catch {
      setMessages(p => [...p, {
        role: 'assistant',
        content: '[ERR 503] Cannot reach backend. Check server.',
        timestamp: new Date(),
        isError: true,
      }]);
    }
    setLoading(false);
  };

  return (
    <div className="relative w-full overflow-hidden" style={{ background: '#03060f', height: '100%' }}>
      <PolicyBackground />

      <div
        className="absolute inset-0 pointer-events-none z-[1]"
        style={{ background: 'radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,0.55) 100%)' }}
      />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 flex flex-col gap-4 p-6"
        style={{ height: '100%' }}
      >

        {/* ══ HEADER ══ */}
        <motion.div
          initial={{ opacity: 0, y: -14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center justify-between shrink-0"
        >
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div style={{ width: 28, height: 1, background: 'rgba(0,243,255,0.5)' }} />
              <span className="font-mono uppercase tracking-[0.22em]" style={{ fontSize: 11, color: 'rgba(0,243,255,0.6)' }}>
                Module 07 / Policy Intelligence
              </span>
            </div>
            <h1 className="font-display font-black tracking-tight" style={{ fontSize: 26, color: '#f1f5f9', letterSpacing: '-0.01em' }}>
              POLICY
              <span style={{ color: '#00f3ff', textShadow: '0 0 28px rgba(0,243,255,0.6)', marginLeft: 10 }}>
                INTERROGATOR
              </span>
            </h1>
            <p className="font-mono mt-1" style={{ fontSize: 11, color: '#94a3b8', letterSpacing: '0.1em' }}>
              PDF PARSING · NLP EXTRACTION · GROQ LLaMA 3.3 70B · DOCUMENT Q&amp;A
            </p>
          </div>

          <div
            className="flex items-center gap-2 px-4 py-2 rounded-full"
            style={{
              background: policyLoaded ? 'rgba(57,255,20,0.06)' : 'rgba(0,243,255,0.06)',
              border: `1px solid ${policyLoaded ? 'rgba(57,255,20,0.2)' : 'rgba(0,243,255,0.15)'}`,
            }}
          >
            <motion.span
              className="rounded-full"
              style={{ width: 6, height: 6, background: policyLoaded ? '#39ff14' : '#00f3ff', display: 'block' }}
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <span className="font-mono font-bold uppercase tracking-widest" style={{ fontSize: 11, color: policyLoaded ? '#39ff14' : '#00f3ff' }}>
              {policyLoaded ? 'Document Loaded' : 'Awaiting Document'}
            </span>
          </div>
        </motion.div>

        {/* ══ MAIN GRID ══ */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4 min-h-0">

          {/* ── LEFT PANEL ── */}
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="flex flex-col gap-3 min-h-0"
          >
            {/* Upload Zone */}
            <div
              className="rounded-2xl shrink-0"
              style={{ background: 'rgba(5,9,18,0.85)', border: '1px solid rgba(255,255,255,0.10)', backdropFilter: 'blur(16px)' }}
            >
              <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={handleFileChange} />

              {policyLoaded && policyInfo ? (
                <div className="flex flex-col gap-3 p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: 'rgba(57,255,20,0.08)', border: '1px solid rgba(57,255,20,0.25)' }}>
                      <CheckCircle size={18} style={{ color: '#39ff14' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-mono font-bold truncate" style={{ fontSize: 12, color: '#39ff14' }}>{policyInfo.filename}</p>
                      <p className="font-mono" style={{ fontSize: 11, color: '#94a3b8' }}>{policyInfo.characters?.toLocaleString()} chars indexed</p>
                    </div>
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-2 rounded-xl font-mono font-bold uppercase tracking-widest transition-all duration-200"
                    style={{ fontSize: 11, color: '#94a3b8', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}
                    onMouseEnter={e => { e.currentTarget.style.color = '#00f3ff'; e.currentTarget.style.borderColor = 'rgba(0,243,255,0.2)'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
                  >
                    swap document
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  className="flex flex-col items-center justify-center gap-4 p-8 cursor-pointer rounded-2xl transition-all duration-200"
                  style={{
                    minHeight: 164,
                    border: `1px dashed ${isDragging ? 'rgba(0,243,255,0.55)' : 'rgba(0,243,255,0.2)'}`,
                    background: isDragging ? 'rgba(0,243,255,0.04)' : 'transparent',
                  }}
                >
                  <motion.div
                    animate={uploading ? {} : { y: [0, -5, 0] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                    className="w-14 h-14 rounded-2xl flex items-center justify-center"
                    style={{ background: 'rgba(0,243,255,0.06)', border: '1px solid rgba(0,243,255,0.18)' }}
                  >
                    {uploading
                      ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                          <Loader size={24} style={{ color: '#00f3ff' }} />
                        </motion.div>
                      : <Upload size={24} style={{ color: 'rgba(0,243,255,0.6)' }} />
                    }
                  </motion.div>
                  <div className="text-center">
                    <p className="font-display font-bold" style={{ fontSize: 14, color: uploading ? '#00f3ff' : '#cbd5e1', marginBottom: 4 }}>
                      {uploading ? 'Ingesting document…' : 'Drop PDF here'}
                    </p>
                    <p className="font-mono" style={{ fontSize: 11, color: '#94a3b8' }}>or click to browse · PDF only</p>
                  </div>
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 px-4 pb-4 font-mono" style={{ fontSize: 11, color: '#ff003c' }}>
                  <AlertTriangle size={11} style={{ flexShrink: 0 }} />
                  {error}
                </div>
              )}
            </div>

            {/* Quick Queries */}
            <div
              className="rounded-2xl flex-1 flex flex-col min-h-0"
              style={{ background: 'rgba(5,9,18,0.85)', border: '1px solid rgba(255,255,255,0.10)', backdropFilter: 'blur(16px)' }}
            >
              <div className="flex items-center gap-2 px-4 py-3 shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                <Hash size={11} style={{ color: 'rgba(0,243,255,0.4)' }} />
                <span className="font-mono uppercase tracking-widest" style={{ fontSize: 11, color: '#94a3b8' }}>Quick Queries</span>
              </div>

              <div className="flex-1 overflow-y-auto py-2 custom-scrollbar">
                {QUERIES.map(({ tag, q }, i) => (
                  <motion.button
                    key={i}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.12 + i * 0.05 }}
                    onClick={() => { setInput(q); inputRef.current?.focus(); }}
                    disabled={!policyLoaded}
                    className="w-full text-left flex items-start gap-3 px-4 py-3 font-mono transition-all duration-150"
                    style={{
                      opacity: policyLoaded ? 1 : 0.3,
                      cursor: policyLoaded ? 'pointer' : 'not-allowed',
                      background: 'transparent',
                    }}
                    onMouseEnter={e => { if (policyLoaded) e.currentTarget.style.background = 'rgba(0,243,255,0.04)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <span className="font-mono font-black shrink-0 mt-0.5"
                      style={{ fontSize: 10, color: 'rgba(0,243,255,0.45)', letterSpacing: '0.08em', minWidth: 30 }}>
                      {tag}
                    </span>
                    <span style={{ fontSize: 12, color: '#8eb4d4', lineHeight: 1.55 }}>{q}</span>
                  </motion.button>
                ))}
              </div>

              <div className="flex items-center justify-between px-4 py-3 shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                <span className="font-mono" style={{ fontSize: 11, color: '#94a3b8' }}>LLaMA 3.3 · Groq</span>
                <div className="flex items-center gap-1.5">
                  <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#39ff14', display: 'block', boxShadow: '0 0 4px #39ff14' }} />
                  <span className="font-mono" style={{ fontSize: 11, color: '#39ff14' }}>online</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* ── RIGHT: CHAT PANEL ── */}
          <motion.div
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15, duration: 0.5 }}
            className="flex flex-col rounded-2xl overflow-hidden min-h-0"
            style={{
              background: 'rgba(5,9,18,0.88)',
              border: '1px solid rgba(0,243,255,0.1)',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 0 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.10)',
            }}
          >
            {/* top bar */}
            <div className="flex items-center justify-between px-6 py-4 shrink-0" style={{ borderBottom: '1px solid rgba(0,243,255,0.07)' }}>
              <div className="flex items-center gap-4">
                <div className="flex gap-1.5">
                  {['#ff003c', '#f59e0b', '#39ff14'].map((c, i) => (
                    <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: c, opacity: 0.65 }} />
                  ))}
                </div>
                <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.13)' }} />
                <div className="flex items-center gap-2">
                  <Shield size={13} style={{ color: '#00f3ff' }} />
                  <span className="font-mono font-bold uppercase tracking-widest" style={{ fontSize: 12, color: '#94a3b8' }}>
                    Policy Intelligence
                  </span>
                  <div className="px-2 py-0.5 rounded font-mono font-bold"
                    style={{
                      fontSize: 11,
                      background: policyLoaded ? 'rgba(57,255,20,0.08)' : 'rgba(0,243,255,0.05)',
                      border: `1px solid ${policyLoaded ? 'rgba(57,255,20,0.2)' : 'rgba(0,243,255,0.12)'}`,
                      color: policyLoaded ? '#39ff14' : '#00f3ff',
                      letterSpacing: '0.12em',
                    }}>
                    {policyLoaded ? '● ACTIVE' : '● STANDBY'}
                  </div>
                </div>
              </div>
              {policyLoaded && policyInfo && (
                <div className="flex items-center gap-2">
                  <FileText size={11} style={{ color: '#94a3b8' }} />
                  <span className="font-mono truncate max-w-[200px]" style={{ fontSize: 11, color: '#94a3b8' }}>
                    {policyInfo.filename}
                  </span>
                </div>
              )}
            </div>

            {/* messages */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 custom-scrollbar">
              <AnimatePresence initial={false}>
                {messages.map((msg, idx) => {
                  const isUser = msg.role === 'user';
                  return (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25 }}
                      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                    >
                      <div
                        className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center font-mono font-black self-end mb-1"
                        style={{
                          fontSize: 10,
                          background: isUser ? 'rgba(0,243,255,0.1)' : msg.isError ? 'rgba(255,0,60,0.1)' : 'rgba(57,255,20,0.08)',
                          border: `1px solid ${isUser ? 'rgba(0,243,255,0.25)' : msg.isError ? 'rgba(255,0,60,0.25)' : 'rgba(57,255,20,0.2)'}`,
                          color: isUser ? '#00f3ff' : msg.isError ? '#ff003c' : '#39ff14',
                        }}
                      >
                        {isUser ? 'YOU' : 'AI'}
                      </div>

                      <div
                        className="max-w-[80%] rounded-2xl px-4 py-3 font-mono"
                        style={{
                          fontSize: 11,
                          lineHeight: 1.65,
                          background: isUser ? 'rgba(0,243,255,0.07)' : msg.isError ? 'rgba(255,0,60,0.07)' : msg.isSuccess ? 'rgba(57,255,20,0.05)' : 'rgba(5,9,18,0.9)',
                          border: `1px solid ${isUser ? 'rgba(0,243,255,0.18)' : msg.isError ? 'rgba(255,0,60,0.2)' : msg.isSuccess ? 'rgba(57,255,20,0.2)' : 'rgba(255,255,255,0.13)'}`,
                          color: isUser ? '#94a3b8' : msg.isError ? '#ff003c' : msg.isSuccess ? '#39ff14' : '#a8bdd4',
                          borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                          backdropFilter: 'blur(12px)',
                          whiteSpace: 'pre-wrap',
                        }}
                      >
                        {!isUser && (
                          <div className="flex items-center gap-2 mb-2 pb-2"
                            style={{ borderBottom: `1px solid ${msg.isError ? 'rgba(255,0,60,0.15)' : msg.isSuccess ? 'rgba(57,255,20,0.15)' : 'rgba(255,255,255,0.10)'}` }}>
                            <span style={{ width: 5, height: 5, borderRadius: '50%', background: msg.isError ? '#ff003c' : '#39ff14', display: 'block', boxShadow: `0 0 5px ${msg.isError ? '#ff003c' : '#39ff14'}` }} />
                            <span className="font-mono font-bold uppercase tracking-widest" style={{ fontSize: 10, color: msg.isError ? '#ff003c' : '#39ff14' }}>
                              {msg.isError ? 'ERROR' : 'POLICY AI'}
                            </span>
                            <span className="font-mono ml-auto" style={{ fontSize: 10, color: '#94a3b8' }}>
                              {new Date(msg.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                        )}
                        {isUser && (
                          <div className="flex justify-end mb-1.5">
                            <span className="font-mono" style={{ fontSize: 10, color: '#94a3b8' }}>
                              {new Date(msg.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                        )}
                        {msg.content}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {loading && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3">
                  <div className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center font-mono font-black self-end mb-1"
                    style={{ fontSize: 10, background: 'rgba(57,255,20,0.08)', border: '1px solid rgba(57,255,20,0.2)', color: '#39ff14' }}>
                    AI
                  </div>
                  <div className="px-4 py-3 rounded-2xl flex items-center gap-3"
                    style={{ background: 'rgba(5,9,18,0.9)', border: '1px solid rgba(255,255,255,0.13)', borderRadius: '18px 18px 18px 4px' }}>
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.1, repeat: Infinity, ease: 'linear' }}>
                      <Search size={12} style={{ color: '#00f3ff' }} />
                    </motion.div>
                    <span className="font-mono" style={{ fontSize: 11, color: '#94a3b8' }}>Scanning policy document…</span>
                    <div className="flex items-center gap-1">
                      {[0, 1, 2].map(i => (
                        <motion.span key={i}
                          style={{ width: 4, height: 4, borderRadius: '50%', background: '#00f3ff', display: 'block' }}
                          animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1.1, 0.8] }}
                          transition={{ duration: 1, repeat: Infinity, delay: i * 0.22 }}
                        />
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              <div ref={endRef} />
            </div>

            {/* input bar */}
            <div className="shrink-0 px-6 py-4" style={{ borderTop: '1px solid rgba(0,243,255,0.07)' }}>
              {!policyLoaded && (
                <motion.div
                  animate={{ opacity: [0.5, 0.9, 0.5] }}
                  transition={{ duration: 2.2, repeat: Infinity }}
                  className="flex items-center gap-2 mb-3 px-3 py-2 rounded-xl font-mono"
                  style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)', fontSize: 12, color: '#f59e0b' }}
                >
                  <AlertTriangle size={12} style={{ flexShrink: 0 }} />
                  Upload a PDF document to enable interrogation
                </motion.div>
              )}

              <div className="flex items-end gap-3">
                <span className="font-mono font-bold shrink-0 mb-3" style={{ fontSize: 16, color: '#00f3ff', lineHeight: 1 }}>›</span>
                <div className="flex-1">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => {
                      setInput(e.target.value);
                      e.target.style.height = 'auto';
                      e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                    }}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAsk(); } }}
                    placeholder={policyLoaded ? 'Query policy document… (Enter to send)' : 'Load a PDF first…'}
                    disabled={!policyLoaded || loading}
                    rows={1}
                    className="w-full resize-none font-mono outline-none custom-scrollbar"
                    style={{
                      background: 'rgba(0,0,0,0.35)',
                      border: '1px solid rgba(0,243,255,0.1)',
                      borderRadius: 14,
                      padding: '10px 14px',
                      color: '#94a3b8',
                      fontSize: 13,
                      lineHeight: 1.6,
                      caretColor: '#00f3ff',
                      overflow: 'hidden',
                      transition: 'border-color 0.2s',
                      minHeight: 42,
                    }}
                    onFocus={e => e.target.style.borderColor = 'rgba(0,243,255,0.3)'}
                    onBlur={e => e.target.style.borderColor = 'rgba(0,243,255,0.1)'}
                  />
                </div>
                <button
                  onClick={handleAsk}
                  disabled={!input.trim() || !policyLoaded || loading}
                  className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200"
                  style={{
                    background: (input.trim() && policyLoaded && !loading) ? 'rgba(0,243,255,0.1)' : 'rgba(255,255,255,0.06)',
                    border: `1px solid ${(input.trim() && policyLoaded && !loading) ? 'rgba(0,243,255,0.3)' : 'rgba(255,255,255,0.08)'}`,
                    color: (input.trim() && policyLoaded && !loading) ? '#00f3ff' : '#5a7a9a',
                    cursor: (!input.trim() || !policyLoaded || loading) ? 'not-allowed' : 'pointer',
                  }}
                  onMouseEnter={e => { if (input.trim() && policyLoaded && !loading) e.currentTarget.style.background = 'rgba(0,243,255,0.18)'; }}
                  onMouseLeave={e => { if (input.trim() && policyLoaded && !loading) e.currentTarget.style.background = 'rgba(0,243,255,0.1)'; }}
                >
                  <Send size={15} />
                </button>
              </div>

              <div className="flex items-center justify-between mt-2">
                <p className="font-mono" style={{ fontSize: 11, color: '#94a3b8', letterSpacing: '0.08em' }}>
                  ENTER · send &nbsp;·&nbsp; SHIFT+ENTER · newline
                </p>
                <p className="font-mono" style={{ fontSize: 11, color: '#94a3b8' }}>
                  {messages.length} exchanges
                </p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* ══ FOOTER ══ */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55 }}
          className="flex items-center justify-between shrink-0"
          style={{ paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.07)' }}
        >
          <span className="font-mono uppercase tracking-[0.2em]" style={{ fontSize: 11, color: '#8eb4d4' }}>
            CyberShield AI · Policy Intelligence Engine v2
          </span>
          <div className="flex items-center gap-4">
            {[
              { label: 'PDF Parser',   active: true         },
              { label: 'Vector Index', active: policyLoaded },
              { label: 'Groq AI',      active: true         },
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

export default PolicyChatbot;