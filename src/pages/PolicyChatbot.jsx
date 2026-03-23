import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Send, FileText, CheckCircle, Loader, Hash, ChevronRight, AlertTriangle } from 'lucide-react';
import axios from 'axios';

/* ═══════════════════════════════════════════
   CANVAS BACKGROUND  — grid + orbs + scan line
═══════════════════════════════════════════ */
const ScanBackground = () => {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext('2d');
    let id, t = 0;
    const resize = () => { c.width = c.offsetWidth; c.height = c.offsetHeight; };
    resize();
    window.addEventListener('resize', resize);
    const draw = () => {
      ctx.clearRect(0, 0, c.width, c.height);
      ctx.fillStyle = '#020a06'; ctx.fillRect(0, 0, c.width, c.height);
      ctx.strokeStyle = 'rgba(0,255,136,0.022)'; ctx.lineWidth = 0.5;
      for (let x = 0; x < c.width; x += 44) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, c.height); ctx.stroke(); }
      for (let y = 0; y < c.height; y += 44) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(c.width, y); ctx.stroke(); }
      const g1 = ctx.createRadialGradient(0, 0, 0, 0, 0, c.width * 0.5);
      g1.addColorStop(0, 'rgba(0,255,136,0.055)'); g1.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g1; ctx.fillRect(0, 0, c.width, c.height);
      const g2 = ctx.createRadialGradient(c.width, c.height, 0, c.width, c.height, c.width * 0.38);
      g2.addColorStop(0, 'rgba(0,200,100,0.04)'); g2.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g2; ctx.fillRect(0, 0, c.width, c.height);
      const sy = ((t * 0.48) % (c.height + 80)) - 40;
      const sg = ctx.createLinearGradient(0, sy - 40, 0, sy + 40);
      sg.addColorStop(0, 'rgba(0,255,136,0)'); sg.addColorStop(0.5, 'rgba(0,255,136,0.032)'); sg.addColorStop(1, 'rgba(0,255,136,0)');
      ctx.fillStyle = sg; ctx.fillRect(0, sy - 40, c.width, 80);
      t++; id = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(id); window.removeEventListener('resize', resize); };
  }, []);
  return <canvas ref={ref} className="absolute inset-0 w-full h-full pointer-events-none z-0" />;
};

/* ═══════════════════════════════════════════
   REDACTION BARS  — decorative preview lines
═══════════════════════════════════════════ */
const RedactionLines = ({ loaded }) => (
  <div className="flex flex-col gap-1.5 w-full">
    {[100, 82, 93, 58, 87, 42, 75, 66].map((w, i) => (
      <motion.div
        key={i}
        initial={{ scaleX: 0, opacity: 0 }}
        animate={{ scaleX: 1, opacity: loaded ? 1 : 0.4 }}
        transition={{ delay: 0.5 + i * 0.06, duration: 0.35, ease: 'easeOut' }}
        style={{ transformOrigin: 'left' }}
      >
        <div className="rounded-sm" style={{
          width: `${w}%`, height: 6,
          background: loaded ? 'rgba(0,255,136,0.1)' : 'rgba(0,255,136,0.05)',
          border: `1px solid ${loaded ? 'rgba(0,255,136,0.18)' : 'rgba(0,255,136,0.08)'}`,
        }} />
      </motion.div>
    ))}
  </div>
);

/* ═══════════════════════════════════════════
   BLINKING CURSOR
═══════════════════════════════════════════ */
const Cursor = () => (
  <motion.span
    animate={{ opacity: [1, 0, 1] }}
    transition={{ duration: 0.65, repeat: Infinity }}
    style={{ display: 'inline-block', width: 7, height: 12, background: '#00ff88', verticalAlign: 'middle', marginLeft: 3 }}
  />
);

/* ═══════════════════════════════════════════
   DRAG-DROP HOOK
═══════════════════════════════════════════ */
const useDragDrop = (onFile) => {
  const [over, setOver] = useState(false);
  return {
    over,
    onDragOver: (e) => { e.preventDefault(); setOver(true); },
    onDragLeave: () => setOver(false),
    onDrop: (e) => { e.preventDefault(); setOver(false); onFile(e.dataTransfer.files[0]); },
  };
};

/* ═══════════════════════════════════════════
   QUICK QUERIES
═══════════════════════════════════════════ */
const QUERIES = [
  { tag: 'PWD', q: 'What is the password policy?' },
  { tag: 'USB', q: 'Can employees use personal USB drives?' },
  { tag: 'INC', q: 'What should I do if I suspect a data breach?' },
  { tag: 'RWK', q: 'What are the remote work security requirements?' },
  { tag: 'PRIV', q: 'What data is classified as confidential?' },
  { tag: 'RPT', q: 'How should security incidents be reported?' },
];

/* ═══════════════════════════════════════════
   MAIN COMPONENT  — all original logic intact
═══════════════════════════════════════════ */
const PolicyChatbot = () => {
  const [policyLoaded, setPolicyLoaded] = useState(false);
  const [policyInfo, setPolicyInfo] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: '// POLICY INTELLIGENCE SYSTEM — ONLINE\n// No document loaded. Upload a PDF to begin.\n// Supports: ISO 27001 · NIST · SOC2 · GDPR · HIPAA · Internal Policies\n// Model: Groq LLaMA 3.3 70B  |  Standing by…',
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const endRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);

  useEffect(() => {
    axios.get('http://127.0.0.1:5000/api/policy-status').then(r => {
      if (r.data.data.loaded) { setPolicyLoaded(true); setPolicyInfo({ filename: r.data.data.filename }); }
    }).catch(() => { });
  }, []);

  /* ── upload ── */
  const processFile = useCallback(async (file) => {
    if (!file) return;
    setUploading(true); setError(null);
    try {
      const fd = new FormData(); fd.append('policy', file);
      const res = await axios.post('http://127.0.0.1:5000/api/upload-policy', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      if (res.data.success) {
        setPolicyLoaded(true); setPolicyInfo(res.data.data);
        setMessages([{
          role: 'assistant',
          content: `// DOCUMENT INGESTED\n// File    : ${res.data.data.filename}\n// Chars   : ${res.data.data.characters}\n// Status  : INDEXED\n\n> Interrogation mode ACTIVE. Submit your first query.`,
        }]);
      }
    } catch { setError('Upload failed — ensure backend is running on port 5000'); }
    finally { setUploading(false); }
  }, []);

  const handleUpload = (e) => processFile(e.target.files[0]);
  const dd = useDragDrop(processFile);

  /* ── ask ── */
  const handleAsk = async () => {
    if (!input.trim() || loading) return;
    const q = input.trim();
    setInput('');
    setMessages(p => [...p, { role: 'user', content: q }]);
    setLoading(true);
    try {
      const res = await axios.post('http://127.0.0.1:5000/api/ask-policy', { question: q });
      if (res.data.success) setMessages(p => [...p, { role: 'assistant', content: res.data.data.answer }]);
    } catch {
      setMessages(p => [...p, { role: 'assistant', content: '[ERR 503] Cannot reach backend. Check server.', isError: true }]);
    }
    setLoading(false);
  };

  return (
    <div className="relative overflow-hidden" style={{ height: '100%', minHeight: 0, background: '#020a06' }}>
      <ScanBackground />
      <div className="absolute inset-0 pointer-events-none z-[1]"
        style={{ background: 'radial-gradient(ellipse at 25% 50%, transparent 35%, rgba(0,0,0,0.72) 100%)' }} />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="relative z-10 flex flex-col"
        style={{ height: '100%', padding: '14px 18px', gap: 10 }}
      >
        {/* ══ HEADER ══ */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between shrink-0"
        >
          {/* title */}
          <div className="flex items-center gap-3">
            <div style={{ width: 3, height: 32, background: '#00ff88', boxShadow: '0 0 10px #00ff88', borderRadius: 2 }} />
            <div>
              <h1 className="font-display font-black" style={{ fontSize: 21, color: '#f0fdf4', letterSpacing: '-0.025em', lineHeight: 1 }}>
                POLICY
                <span style={{ color: '#00ff88', textShadow: '0 0 22px rgba(0,255,136,0.55)', marginLeft: 8 }}>_INTERROGATE</span>
              </h1>
              <p className="font-mono mt-0.5" style={{ fontSize: 8.5, color: 'rgba(0,255,136,0.32)', letterSpacing: '0.22em' }}>
                DOCUMENT INTELLIGENCE · LLaMA 3.3 70B · GROQ
              </p>
            </div>
          </div>

          {/* right chips */}
          <div className="flex items-center gap-3">
            {[
              { k: 'QUERIES', v: messages.length },
              { k: 'ENGINE', v: 'Groq AI' },
            ].map(({ k, v }) => (
              <div key={k} className="text-right">
                <p className="font-mono font-bold" style={{ fontSize: 12, color: '#00ff88', lineHeight: 1 }}>{v}</p>
                <p className="font-mono" style={{ fontSize: 7.5, color: 'rgba(0,255,136,0.28)', letterSpacing: '0.2em' }}>{k}</p>
              </div>
            ))}
            {/* status pill */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded"
              style={{
                background: policyLoaded ? 'rgba(0,255,136,0.06)' : 'rgba(0,255,136,0.02)',
                border: `1px solid ${policyLoaded ? 'rgba(0,255,136,0.28)' : 'rgba(0,255,136,0.07)'}`,
              }}
            >
              <motion.div
                animate={{ opacity: policyLoaded ? [1, 0.3, 1] : 0.18 }}
                transition={{ duration: 1.1, repeat: Infinity }}
                style={{ width: 5, height: 5, borderRadius: '50%', background: '#00ff88' }}
              />
              <span className="font-mono font-bold" style={{ fontSize: 8.5, color: policyLoaded ? '#00ff88' : 'rgba(0,255,136,0.25)', letterSpacing: '0.18em' }}>
                {policyLoaded ? 'DOC LOADED' : 'STANDBY'}
              </span>
            </div>
          </div>
        </motion.div>

        {/* ══ BODY SPLIT ══ */}
        <div className="flex-1 min-h-0" style={{ display: 'grid', gridTemplateColumns: '268px 1fr', gap: 10 }}>

          {/* ─── VAULT SIDEBAR ─── */}
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="flex flex-col gap-3 min-h-0"
          >

            {/* ── Upload card ── */}
            <div
              className="relative rounded-xl overflow-hidden flex-shrink-0"
              style={{
                background: 'rgba(0,12,6,0.92)',
                border: `1px solid ${dd.over ? 'rgba(0,255,136,0.45)' : 'rgba(0,255,136,0.09)'}`,
                boxShadow: dd.over ? '0 0 20px rgba(0,255,136,0.08)' : 'none',
                transition: 'border-color .2s, box-shadow .2s',
              }}
              onDragOver={dd.onDragOver} onDragLeave={dd.onDragLeave} onDrop={dd.onDrop}
            >
              {/* stamp */}
              <motion.div
                animate={{ opacity: policyLoaded ? 0.85 : 0.22, rotate: policyLoaded ? -7 : -12 }}
                transition={{ duration: 0.4 }}
                className="absolute top-3 right-3 pointer-events-none"
              >
                <div className="px-2.5 py-0.5 font-mono font-black uppercase tracking-[0.22em] rounded"
                  style={{ fontSize: 8, border: `2px solid ${policyLoaded ? 'rgba(0,255,136,0.55)' : 'rgba(0,255,136,0.14)'}`, color: policyLoaded ? 'rgba(0,255,136,0.65)' : 'rgba(0,255,136,0.18)' }}>
                  {policyLoaded ? 'INDEXED' : 'VACANT'}
                </div>
              </motion.div>

              {/* header */}
              <div className="flex items-center gap-2 px-4 py-2.5" style={{ borderBottom: '1px solid rgba(0,255,136,0.06)' }}>
                <FileText size={11} style={{ color: 'rgba(0,255,136,0.4)' }} />
                <span className="font-mono uppercase tracking-[0.2em]" style={{ fontSize: 8.5, color: 'rgba(0,255,136,0.35)' }}>Document Vault</span>
              </div>

              <div className="p-4">
                {/* redaction preview */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono truncate" style={{ fontSize: 8, color: 'rgba(0,255,136,0.22)', letterSpacing: '0.12em', maxWidth: '80%' }}>
                      {policyLoaded ? policyInfo?.filename : 'NO DOCUMENT'}
                    </span>
                    {policyLoaded && <CheckCircle size={9} style={{ color: '#00ff88', flexShrink: 0 }} />}
                  </div>
                  <RedactionLines loaded={policyLoaded} />
                </div>

                {/* drop zone */}
                <input type="file" id="policyUpload" accept=".pdf" className="hidden" onChange={handleUpload} />
                <label htmlFor="policyUpload"
                  className="flex flex-col items-center justify-center rounded-lg cursor-pointer transition-all duration-200"
                  style={{
                    minHeight: 72,
                    border: `1.5px dashed ${dd.over ? 'rgba(0,255,136,0.45)' : 'rgba(0,255,136,0.13)'}`,
                    background: dd.over ? 'rgba(0,255,136,0.04)' : 'rgba(0,0,0,0.2)',
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(0,255,136,0.28)'}
                  onMouseLeave={e => { if (!dd.over) e.currentTarget.style.borderColor = 'rgba(0,255,136,0.13)'; }}
                >
                  {uploading ? (
                    <>
                      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                        <Loader size={14} style={{ color: '#00ff88' }} />
                      </motion.div>
                      <span className="font-mono mt-1.5" style={{ fontSize: 8.5, color: 'rgba(0,255,136,0.45)', letterSpacing: '0.15em' }}>INGESTING…</span>
                    </>
                  ) : (
                    <>
                      <Upload size={15} style={{ color: 'rgba(0,255,136,0.32)' }} />
                      <span className="font-mono mt-1.5 text-center" style={{ fontSize: 8.5, color: 'rgba(0,255,136,0.32)', letterSpacing: '0.14em', lineHeight: 1.9 }}>
                        {policyLoaded ? 'DROP TO REPLACE' : 'DROP PDF HERE'}<br />
                        <span style={{ color: 'rgba(0,255,136,0.18)' }}>OR CLICK TO BROWSE</span>
                      </span>
                    </>
                  )}
                </label>

                {error && (
                  <div className="flex items-start gap-2 mt-3 px-3 py-2 rounded"
                    style={{ background: 'rgba(255,0,60,0.05)', border: '1px solid rgba(255,0,60,0.18)' }}>
                    <AlertTriangle size={9} style={{ color: '#ff003c', flexShrink: 0, marginTop: 1 }} />
                    <span className="font-mono" style={{ fontSize: 8.5, color: '#ff003c', lineHeight: 1.5 }}>{error}</span>
                  </div>
                )}
              </div>
            </div>

            {/* ── Quick Queries ── */}
            <div className="rounded-xl flex-1 min-h-0 overflow-hidden flex flex-col"
              style={{ background: 'rgba(0,12,6,0.92)', border: '1px solid rgba(0,255,136,0.09)' }}>
              <div className="flex items-center gap-2 px-4 py-2.5 shrink-0" style={{ borderBottom: '1px solid rgba(0,255,136,0.06)' }}>
                <Hash size={10} style={{ color: 'rgba(0,255,136,0.38)' }} />
                <span className="font-mono uppercase tracking-[0.2em]" style={{ fontSize: 8.5, color: 'rgba(0,255,136,0.35)' }}>
                  Quick Queries
                </span>
              </div>
              <div className="overflow-y-auto flex-1 p-2.5 space-y-1.5 custom-scrollbar">
                {QUERIES.map(({ tag, q }, i) => (
                  <motion.button
                    key={i}
                    initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.18 + i * 0.055 }}
                    onClick={() => { setInput(q); inputRef.current?.focus(); }}
                    disabled={!policyLoaded}
                    className="w-full text-left flex items-center gap-2 px-3 py-2.5 rounded-lg transition-all duration-150"
                    style={{
                      background: 'rgba(0,0,0,0.28)',
                      border: '1px solid rgba(0,255,136,0.05)',
                      opacity: policyLoaded ? 1 : 0.28,
                      cursor: policyLoaded ? 'pointer' : 'not-allowed',
                    }}
                    onMouseEnter={e => { if (policyLoaded) { e.currentTarget.style.borderColor = 'rgba(0,255,136,0.22)'; e.currentTarget.style.background = 'rgba(0,255,136,0.03)'; } }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(0,255,136,0.05)'; e.currentTarget.style.background = 'rgba(0,0,0,0.28)'; }}
                  >
                    <span className="font-mono font-bold shrink-0 px-1.5 py-0.5 rounded"
                      style={{ fontSize: 7, color: '#00ff88', background: 'rgba(0,255,136,0.08)', letterSpacing: '0.08em' }}>
                      {tag}
                    </span>
                    <span className="font-mono truncate" style={{ fontSize: 9.5, color: 'rgba(0,255,136,0.32)', lineHeight: 1.4 }}>{q}</span>
                    <ChevronRight size={8} style={{ color: 'rgba(0,255,136,0.18)', marginLeft: 'auto', flexShrink: 0 }} />
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>

          {/* ─── TERMINAL PANEL ─── */}
          <motion.div
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.12 }}
            className="flex flex-col rounded-xl overflow-hidden min-h-0"
            style={{ background: 'rgba(0,8,4,0.96)', border: '1px solid rgba(0,255,136,0.09)' }}
          >
            {/* chrome bar */}
            <div className="flex items-center justify-between px-4 py-2.5 shrink-0"
              style={{ borderBottom: '1px solid rgba(0,255,136,0.06)', background: 'rgba(0,0,0,0.32)' }}>
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5">
                  {['#ff5f57', '#febc2e', '#28c840'].map((c, i) => (
                    <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: c, opacity: 0.6 }} />
                  ))}
                </div>
                <div style={{ width: 1, height: 12, background: 'rgba(0,255,136,0.1)' }} />
                <span className="font-mono" style={{ fontSize: 9, color: 'rgba(0,255,136,0.3)', letterSpacing: '0.08em' }}>
                  policy@cybershield ~ {policyLoaded && <span style={{ color: 'rgba(0,255,136,0.5)' }}>— {policyInfo?.filename}</span>}
                </span>
              </div>
              <span className="font-mono" style={{ fontSize: 8, color: 'rgba(0,255,136,0.18)', letterSpacing: '0.15em' }}>
                {messages.length} EXCHANGES
              </span>
            </div>

            {/* messages */}
            <div className="flex-1 overflow-y-auto custom-scrollbar" style={{ padding: '14px 18px' }}>
              <AnimatePresence initial={false}>
                {messages.map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className="mb-4"
                  >
                    {msg.role === 'user' ? (
                      <div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="font-mono font-bold" style={{ fontSize: 8.5, color: '#00ff88', letterSpacing: '0.2em' }}>OPERATOR</span>
                          <div style={{ flex: 1, height: 1, background: 'rgba(0,255,136,0.07)' }} />
                          <span className="font-mono" style={{ fontSize: 7.5, color: 'rgba(0,255,136,0.2)' }}>{new Date().toLocaleTimeString()}</span>
                        </div>
                        <div className="rounded-lg px-4 py-2.5 font-mono"
                          style={{
                            fontSize: 11.5, lineHeight: 1.7,
                            color: '#86efac',
                            background: 'rgba(0,255,136,0.04)',
                            border: '1px solid rgba(0,255,136,0.11)',
                            borderLeft: '3px solid rgba(0,255,136,0.6)',
                          }}>
                          <span style={{ color: 'rgba(0,255,136,0.38)', marginRight: 8 }}>&gt;</span>{msg.content}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="font-mono font-bold" style={{ fontSize: 8.5, color: msg.isError ? '#ff003c' : 'rgba(0,255,136,0.45)', letterSpacing: '0.2em' }}>
                            {msg.isError ? '// ERROR' : '// POLICY_AI'}
                          </span>
                          <div style={{ flex: 1, height: 1, background: 'rgba(0,255,136,0.04)' }} />
                        </div>
                        <div className="rounded-lg px-4 py-2.5 font-mono"
                          style={{
                            fontSize: 11.5, lineHeight: 1.85,
                            whiteSpace: 'pre-wrap',
                            color: msg.isError ? '#ff6b6b' : 'rgba(0,255,136,0.52)',
                            background: msg.isError ? 'rgba(255,0,60,0.04)' : 'rgba(0,0,0,0.38)',
                            border: `1px solid ${msg.isError ? 'rgba(255,0,60,0.14)' : 'rgba(0,255,136,0.05)'}`,
                          }}>
                          {msg.content}
                        </div>
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>

              {loading && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-4">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="font-mono font-bold" style={{ fontSize: 8.5, color: 'rgba(0,255,136,0.38)', letterSpacing: '0.2em' }}>// POLICY_AI</span>
                    <div style={{ flex: 1, height: 1, background: 'rgba(0,255,136,0.04)' }} />
                  </div>
                  <div className="rounded-lg px-4 py-2.5 flex items-center gap-3"
                    style={{ background: 'rgba(0,0,0,0.38)', border: '1px solid rgba(0,255,136,0.05)' }}>
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.1, repeat: Infinity, ease: 'linear' }}>
                      <Loader size={10} style={{ color: 'rgba(0,255,136,0.45)' }} />
                    </motion.div>
                    <span className="font-mono" style={{ fontSize: 9.5, color: 'rgba(0,255,136,0.25)', letterSpacing: '0.1em' }}>
                      SCANNING · EXTRACTING RELEVANT SECTIONS…
                    </span>
                    <Cursor />
                  </div>
                </motion.div>
              )}

              <div ref={endRef} />
            </div>

            {/* input */}
            <div className="shrink-0 px-4 py-3"
              style={{ borderTop: '1px solid rgba(0,255,136,0.07)', background: 'rgba(0,0,0,0.38)' }}>
              {!policyLoaded && (
                <motion.div
                  animate={{ opacity: [0.45, 0.9, 0.45] }}
                  transition={{ duration: 2.2, repeat: Infinity }}
                  className="flex items-center gap-2 mb-2.5 px-3 py-2 rounded"
                  style={{ background: 'rgba(245,158,11,0.04)', border: '1px solid rgba(245,158,11,0.14)' }}>
                  <AlertTriangle size={9} style={{ color: '#f59e0b', flexShrink: 0 }} />
                  <span className="font-mono" style={{ fontSize: 8.5, color: '#f59e0b', letterSpacing: '0.1em' }}>
                    Upload a PDF to enable interrogation
                  </span>
                </motion.div>
              )}
              <div className="flex items-end gap-2">
                <span className="font-mono font-bold shrink-0 mb-2" style={{ fontSize: 16, color: '#00ff88', lineHeight: 1, letterSpacing: '-0.02em' }}>››</span>
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => {
                    setInput(e.target.value);
                    e.target.style.height = 'auto';
                    e.target.style.height = Math.min(e.target.scrollHeight, 96) + 'px';
                  }}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAsk(); } }}
                  placeholder={policyLoaded ? 'Query policy document… Enter ↵ to send' : 'Load a PDF first…'}
                  disabled={!policyLoaded || loading}
                  rows={1}
                  className="flex-1 resize-none font-mono outline-none custom-scrollbar"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    borderBottom: `1px solid ${input.trim() ? 'rgba(0,255,136,0.32)' : 'rgba(0,255,136,0.09)'}`,
                    borderRadius: 0,
                    padding: '5px 0 7px',
                    color: '#86efac',
                    fontSize: 11.5,
                    lineHeight: 1.6,
                    caretColor: '#00ff88',
                    minHeight: 34,
                    transition: 'border-color .18s',
                  }}
                />
                <motion.button
                  whileHover={{ scale: 1.06 }}
                  whileTap={{ scale: 0.94 }}
                  onClick={handleAsk}
                  disabled={!input.trim() || !policyLoaded || loading}
                  className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{
                    background: (input.trim() && policyLoaded && !loading) ? 'rgba(0,255,136,0.11)' : 'rgba(0,255,136,0.03)',
                    border: `1px solid ${(input.trim() && policyLoaded && !loading) ? 'rgba(0,255,136,0.38)' : 'rgba(0,255,136,0.07)'}`,
                    color: (input.trim() && policyLoaded && !loading) ? '#00ff88' : 'rgba(0,255,136,0.2)',
                    boxShadow: (input.trim() && policyLoaded && !loading) ? '0 0 10px rgba(0,255,136,0.1)' : 'none',
                    cursor: (!input.trim() || !policyLoaded || loading) ? 'not-allowed' : 'pointer',
                    transition: 'all .18s',
                  }}
                >
                  <Send size={12} />
                </motion.button>
              </div>
              <p className="font-mono text-right mt-1" style={{ fontSize: 7.5, color: 'rgba(0,255,136,0.15)', letterSpacing: '0.12em' }}>
                ENTER to send · SHIFT+ENTER for newline
              </p>
            </div>
          </motion.div>
        </div>

        {/* ══ FOOTER ══ */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }}
          className="flex items-center justify-between shrink-0"
          style={{ paddingTop: 7, borderTop: '1px solid rgba(0,255,136,0.05)' }}
        >
          <span className="font-mono" style={{ fontSize: 8, color: 'rgba(0,255,136,0.18)', letterSpacing: '0.2em' }}>
            CYBERSHIELD AI · POLICY INTELLIGENCE ENGINE v2
          </span>
          <div className="flex items-center gap-5">
            {[{ k: 'PDF PARSER', ok: true }, { k: 'VECTOR INDEX', ok: policyLoaded }, { k: 'AI BACKEND', ok: true }].map(({ k, ok }) => (
              <div key={k} className="flex items-center gap-1.5">
                <motion.div
                  animate={{ opacity: ok ? [1, 0.35, 1] : 0.18 }}
                  transition={{ duration: 1.6, repeat: Infinity }}
                  style={{ width: 4, height: 4, borderRadius: '50%', background: ok ? '#00ff88' : 'rgba(0,255,136,0.18)' }}
                />
                <span className="font-mono" style={{ fontSize: 7.5, color: ok ? 'rgba(0,255,136,0.28)' : 'rgba(0,255,136,0.12)', letterSpacing: '0.15em' }}>{k}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default PolicyChatbot;