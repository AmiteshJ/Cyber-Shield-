import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MailSearch, UploadCloud, X, Terminal, ShieldAlert, ShieldCheck,
  Activity, BrainCircuit, ScanLine, FileText, Image, Video, Mail
} from 'lucide-react';

/* ─────────────────────────────────────────
   FILE CATEGORY DETECTION
───────────────────────────────────────── */
const getFileCategory = (file) => {
  if (!file) return null;
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('video/')) return 'video';
  return 'email';
};

const FILE_MODE_CONFIG = {
  image: {
    icon: Image,
    label: 'DEEPFAKE IMAGE SCAN',
    desc: 'Vision AI scans for synthetic artifacts, unnatural rendering & AI-generation markers.',
    color: '#a855f7',
    rgb: '168,85,247',
    accept: 'image/*',
  },
  video: {
    icon: Video,
    label: 'DEEPFAKE VIDEO SCAN',
    desc: 'Metadata forensics engine checks for RunwayML / Sora / HeyGen watermarks.',
    color: '#f97316',
    rgb: '249,115,22',
    accept: 'video/*',
  },
  email: {
    icon: Mail,
    label: 'PHISHING EMAIL SCAN',
    desc: 'NLP engine detects urgency loops, spoofed headers & malicious link patterns.',
    color: '#00f3ff',
    rgb: '0,243,255',
    accept: '.eml,.txt,.msg',
  },
};

/* ─────────────────────────────────────────
   ANIMATED BACKGROUND
───────────────────────────────────────── */
const PhishBackground = () => {
  const canvasRef = useRef(null);

  useState(() => {
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
      vx: (Math.random() - 0.5) * 0.00035,
      vy: (Math.random() - 0.5) * 0.00035,
      r: Math.random() * 1.2 + 0.4,
      phase: Math.random() * Math.PI * 2,
    }));

    /* slowly cycling threat-colour orbs */
    const orbs = [
      { x: 0.15, y: 0.3, hue: 180, size: 0.28 },
      { x: 0.75, y: 0.6, hue: 270, size: 0.22 },
      { x: 0.5, y: 0.85, hue: 200, size: 0.18 },
      { x: 0.88, y: 0.18, hue: 30, size: 0.14 },
    ];

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#03060f';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      /* orbs */
      orbs.forEach((o, i) => {
        const pulse = Math.sin(t * 0.008 + i * 1.3) * 0.3 + 0.7;
        const r = o.size * Math.min(canvas.width, canvas.height) * pulse;
        const gx = o.x * canvas.width, gy = o.y * canvas.height;
        const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, r);
        g.addColorStop(0, `hsla(${o.hue},100%,60%,0.07)`);
        g.addColorStop(0.5, `hsla(${o.hue},100%,50%,0.03)`);
        g.addColorStop(1, `hsla(${o.hue},100%,40%,0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(gx, gy, r, 0, Math.PI * 2);
        ctx.fill();
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

      /* moving scan line */
      const sy = ((t * 0.5) % (canvas.height + 60)) - 30;
      const sg = ctx.createLinearGradient(0, sy - 30, 0, sy + 30);
      sg.addColorStop(0, 'rgba(0,243,255,0)');
      sg.addColorStop(0.5, 'rgba(0,243,255,0.05)');
      sg.addColorStop(1, 'rgba(0,243,255,0)');
      ctx.fillStyle = sg;
      ctx.fillRect(0, sy - 30, canvas.width, 60);

      /* particles */
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
  });

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-0" />;
};

/* ─────────────────────────────────────────
   SCANNING ANIMATION
───────────────────────────────────────── */
const NeuralSpinner = ({ color = '#00f3ff' }) => (
  <div className="relative flex items-center justify-center w-24 h-24 mx-auto">
    {[0, 1, 2].map(i => (
      <motion.div
        key={i}
        className="absolute rounded-full"
        style={{
          width: 36 + i * 22, height: 36 + i * 22,
          border: `1px solid ${color}`,
          opacity: 0,
        }}
        animate={{ opacity: [0, 0.6, 0], scale: [0.8, 1.1, 0.8] }}
        transition={{ duration: 2, repeat: Infinity, delay: i * 0.45, ease: 'easeInOut' }}
      />
    ))}
    <motion.div
      className="w-9 h-9 rounded-full border-2 border-t-transparent"
      style={{ borderColor: `${color} transparent transparent transparent` }}
      animate={{ rotate: 360 }}
      transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
    />
    <motion.div
      className="absolute w-5 h-5 rounded-full border border-b-transparent"
      style={{ borderColor: `transparent transparent transparent ${color}` }}
      animate={{ rotate: -360 }}
      transition={{ duration: 0.6, repeat: Infinity, ease: 'linear' }}
    />
    <motion.div
      className="absolute w-2 h-2 rounded-full"
      style={{ background: color, boxShadow: `0 0 8px ${color}` }}
      animate={{ opacity: [1, 0.3, 1] }}
      transition={{ duration: 0.8, repeat: Infinity }}
    />
  </div>
);

/* ─────────────────────────────────────────
   STAT PILL
───────────────────────────────────────── */
const StatPill = ({ label, value, color }) => (
  <div
    className="flex flex-col items-center py-3 px-4"
    style={{ borderRight: '1px solid rgba(255,255,255,0.05)' }}
  >
    <span className="font-mono font-bold" style={{ fontSize: 15, color }}>{value}</span>
    <span className="font-mono uppercase tracking-widest" style={{ fontSize: 11, color: '#334155', marginTop: 2 }}>{label}</span>
  </div>
);

/* ══════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════ */
const PhishingDetector = () => {
  /* ── ALL ORIGINAL STATE (unchanged) ── */
  const [text, setText] = useState('');
  const [file, setFile] = useState(null);
  const [fileCategory, setFileCategory] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [activeTab, setActiveTab] = useState('text');
  const fileInputRef = useRef(null);

  /* ── ALL ORIGINAL HANDLERS (unchanged) ── */
  const handleFileSelect = (selectedFile) => {
    if (!selectedFile) return;
    setFile(selectedFile);
    setFileCategory(getFileCategory(selectedFile));
    setResult(null);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files[0];
    if (dropped) handleFileSelect(dropped);
  };

  const clearFile = () => {
    setFile(null);
    setFileCategory(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const analyzeContent = async () => {
    if (!text.trim() && !file) return;
    setAnalyzing(true);
    setResult(null);
    try {
      const formData = new FormData();
      if (file) formData.append('file', file);
      else formData.append('text', text);

      const res = await fetch('http://127.0.0.1:5000/api/phish/analyze', { method: 'POST', body: formData });
      const data = await res.json();

      if (data.success && data.data) {
        let isPh = data.data.isPhishing;
        let conf = data.data.confidence;
        if (isPh) {
          conf = 100 - conf;
          if (conf < 1) conf = 1;
          if (conf > 49) conf = 15;
        }
        setResult({ isPhishing: isPh, confidence: conf, highlighted: data.data.explanation, mode: file ? fileCategory : 'text' });
      } else {
        setResult({ isPhishing: false, confidence: 0, highlighted: data.details ? `Error: ${JSON.stringify(data.details)}` : (data.error || 'Analysis failed.'), mode: file ? fileCategory : 'text' });
      }
    } catch (err) {
      console.error(err);
      setResult({ isPhishing: false, confidence: 0, highlighted: 'System connection error to deep learning clusters.', mode: 'text' });
    } finally {
      setAnalyzing(false);
    }
  };

  const modeConfig = fileCategory ? FILE_MODE_CONFIG[fileCategory] : null;
  const canAnalyze = !analyzing && (text.trim() || file);

  /* scan count display */
  const scanStats = [
    { label: 'Engine', value: 'LLaMA 3.3', color: '#00f3ff' },
    { label: 'Mode', value: fileCategory ? FILE_MODE_CONFIG[fileCategory].label.split(' ')[0] : 'TEXT', color: modeConfig ? modeConfig.color : '#00f3ff' },
    { label: 'Status', value: analyzing ? 'ACTIVE' : result ? 'DONE' : 'IDLE', color: analyzing ? '#f97316' : result ? '#39ff14' : '#334155' },
  ];

  return (
    <div className="relative w-full min-h-screen overflow-hidden" style={{ background: '#03060f' }}>
      <PhishBackground />

      {/* vignette */}
      <div
        className="absolute inset-0 pointer-events-none z-[1]"
        style={{ background: 'radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,0.55) 100%)' }}
      />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 flex flex-col h-full p-6 gap-5"
        style={{ minHeight: '100vh' }}
      >

        {/* ══ HEADER ══ */}
        <motion.div
          initial={{ opacity: 0, y: -14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-start justify-between"
        >
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div style={{ width: 28, height: 1, background: 'rgba(0,243,255,0.5)' }} />
              <span className="font-mono uppercase tracking-[0.22em]" style={{ fontSize: 11, color: 'rgba(0,243,255,0.5)' }}>
                Module 02 / Threat Interception
              </span>
            </div>
            <h1 className="font-display font-black tracking-tight" style={{ fontSize: 30, color: '#f1f5f9', letterSpacing: '-0.01em' }}>
              PHISHING
              <span style={{ color: '#00f3ff', textShadow: '0 0 28px rgba(0,243,255,0.6)', marginLeft: 10 }}>
                INTERCEPTOR
              </span>
            </h1>
            <p className="font-mono mt-1" style={{ fontSize: 13, color: '#475569', letterSpacing: '0.1em' }}>
              NLP · VISION AI · METADATA FORENSICS · DEEPFAKE DETECTION
            </p>
          </div>

          <div className="flex items-center gap-2 px-4 py-2 rounded-full" style={{ background: 'rgba(168,85,247,0.06)', border: '1px solid rgba(168,85,247,0.2)' }}>
            <BrainCircuit size={12} style={{ color: '#a855f7' }} />
            <span className="font-mono font-bold uppercase tracking-widest" style={{ fontSize: 11, color: '#a855f7' }}>
              Neural Engine Active
            </span>
          </div>
        </motion.div>

        {/* ══ MAIN GRID ══ */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-5 min-h-0">

          {/* ── LEFT: INPUT PANEL ── */}
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.12, duration: 0.5 }}
            className="flex flex-col gap-4"
          >

            {/* Tab switcher */}
            <div
              className="grid grid-cols-2 p-1 rounded-xl gap-1"
              style={{ background: 'rgba(5,9,18,0.9)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              {[
                { id: 'text', label: 'Raw Text / URL', icon: FileText },
                { id: 'file', label: 'Upload File', icon: UploadCloud },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => {
                    setActiveTab(id);
                    if (id === 'text') clearFile();
                    else setText('');
                    setResult(null);
                  }}
                  className="flex items-center justify-center gap-2 py-2.5 rounded-lg font-mono font-bold uppercase tracking-widest transition-all duration-200"
                  style={{
                    fontSize: 12,
                    background: activeTab === id ? 'rgba(0,243,255,0.12)' : 'transparent',
                    border: activeTab === id ? '1px solid rgba(0,243,255,0.3)' : '1px solid transparent',
                    color: activeTab === id ? '#00f3ff' : '#334155',
                    boxShadow: activeTab === id ? '0 0 16px rgba(0,243,255,0.08)' : 'none',
                  }}
                >
                  <Icon size={12} />
                  {label}
                </button>
              ))}
            </div>

            {/* Input area */}
            <div
              className="flex-1 flex flex-col rounded-2xl overflow-hidden"
              style={{
                background: 'rgba(5,9,18,0.85)',
                border: '1px solid rgba(255,255,255,0.06)',
                backdropFilter: 'blur(16px)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
              }}
            >
              {/* panel chrome */}
              <div
                className="flex items-center justify-between px-5 py-3"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
              >
                <div className="flex gap-1.5">
                  {['#ff003c', '#f59e0b', '#39ff14'].map((c, i) => (
                    <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: c, opacity: 0.6 }} />
                  ))}
                </div>
                <span className="font-mono uppercase tracking-widest" style={{ fontSize: 12, color: '#334155' }}>
                  {activeTab === 'text' ? 'Text / URL Payload' : 'File Upload'}
                </span>
              </div>

              {/* TEXT TAB */}
              {activeTab === 'text' && (
                <div className="flex-1 flex flex-col p-4 gap-3">
                  <div className="relative flex-1">
                    <FileText size={14} className="absolute top-3 left-3" style={{ color: '#334155' }} />
                    <textarea
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      className="w-full h-full min-h-[180px] resize-none font-mono outline-none custom-scrollbar"
                      placeholder="Paste email headers, suspicious URLs, raw message body..."
                      style={{
                        background: 'rgba(0,0,0,0.3)',
                        border: '1px solid rgba(0,243,255,0.1)',
                        borderRadius: 12,
                        padding: '12px 12px 12px 34px',
                        color: '#94a3b8',
                        fontSize: 13,
                        lineHeight: 1.7,
                        caretColor: '#00f3ff',
                      }}
                      onFocus={e => e.target.style.borderColor = 'rgba(0,243,255,0.3)'}
                      onBlur={e => e.target.style.borderColor = 'rgba(0,243,255,0.1)'}
                    />
                  </div>

                  {/* char count */}
                  <div className="flex items-center justify-between px-1">
                    <span className="font-mono" style={{ fontSize: 12, color: '#334155' }}>
                      {text.length} CHARS
                    </span>
                    {text.length > 0 && (
                      <button
                        onClick={() => setText('')}
                        className="font-mono flex items-center gap-1 transition-colors"
                        style={{ fontSize: 12, color: '#475569' }}
                        onMouseEnter={e => e.currentTarget.style.color = '#ff003c'}
                        onMouseLeave={e => e.currentTarget.style.color = '#334155'}
                      >
                        <X size={9} /> CLEAR
                      </button>
                    )}
                  </div>

                  {/* quick paste examples */}
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      'Your account has been suspended. Click here immediately to restore access.',
                      'URGENT: Verify your identity or your account will be deleted in 24h.',
                    ].map((ex, i) => (
                      <button
                        key={i}
                        onClick={() => setText(ex)}
                        className="text-left p-3 rounded-xl font-mono transition-all duration-200"
                        style={{
                          fontSize: 11,
                          color: '#334155',
                          background: 'rgba(0,0,0,0.3)',
                          border: '1px solid rgba(255,255,255,0.04)',
                          lineHeight: 1.5,
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(0,243,255,0.2)'; e.currentTarget.style.color = '#64748b'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#334155'; }}
                      >
                        <span style={{ color: 'rgba(0,243,255,0.4)', marginRight: 4 }}>EX{i + 1} ›</span>
                        {ex}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* FILE TAB */}
              {activeTab === 'file' && (
                <div className="flex-1 flex flex-col p-4 gap-3">
                  {/* mode chips */}
                  <div className="grid grid-cols-3 gap-2">
                    {Object.entries(FILE_MODE_CONFIG).map(([key, cfg]) => {
                      const Icon = cfg.icon;
                      const isActive = fileCategory === key;
                      return (
                        <button
                          key={key}
                          onClick={() => {
                            clearFile();
                            if (fileInputRef.current) {
                              fileInputRef.current.accept = cfg.accept;
                              fileInputRef.current.click();
                            }
                          }}
                          className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl transition-all duration-200"
                          style={{
                            background: isActive ? `rgba(${cfg.rgb},0.08)` : 'rgba(0,0,0,0.3)',
                            border: `1px solid ${isActive ? `rgba(${cfg.rgb},0.4)` : 'rgba(255,255,255,0.05)'}`,
                            boxShadow: isActive ? `0 0 16px rgba(${cfg.rgb},0.1)` : 'none',
                          }}
                        >
                          <Icon size={16} style={{ color: isActive ? cfg.color : '#334155' }} />
                          <span className="font-mono font-bold uppercase tracking-widest" style={{ fontSize: 12, color: isActive ? cfg.color : '#475569' }}>
                            {key}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* hidden input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*,.eml,.txt,.msg"
                    className="hidden"
                    onChange={(e) => handleFileSelect(e.target.files[0])}
                  />

                  {/* dropzone */}
                  <div
                    className="flex-1 flex flex-col items-center justify-center rounded-xl cursor-pointer transition-all duration-300 min-h-[180px] relative"
                    style={{
                      border: `1px dashed ${file ? (modeConfig?.color || 'rgba(0,243,255,0.5)') : 'rgba(255,255,255,0.08)'}`,
                      background: file ? `rgba(${modeConfig?.rgb || '0,243,255'},0.04)` : 'rgba(0,0,0,0.2)',
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                    onClick={() => { if (!file && fileInputRef.current) { fileInputRef.current.accept = 'image/*,video/*,.eml,.txt,.msg'; fileInputRef.current.click(); } }}
                  >
                    <AnimatePresence mode="wait">
                      {file ? (
                        <motion.div
                          key="loaded"
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0 }}
                          className="flex flex-col items-center gap-3 p-6 text-center"
                        >
                          {modeConfig && (
                            <div
                              className="flex items-center gap-2 px-3 py-1.5 rounded-full mb-1"
                              style={{ background: `rgba(${modeConfig.rgb},0.1)`, border: `1px solid rgba(${modeConfig.rgb},0.3)` }}
                            >
                              <modeConfig.icon size={11} style={{ color: modeConfig.color }} />
                              <span className="font-mono font-bold uppercase tracking-widest" style={{ fontSize: 11, color: modeConfig.color }}>
                                {modeConfig.label}
                              </span>
                            </div>
                          )}
                          <UploadCloud size={28} style={{ color: modeConfig?.color || '#00f3ff', filter: `drop-shadow(0 0 8px ${modeConfig?.color || '#00f3ff'})` }} />
                          <div>
                            <p className="font-mono font-bold" style={{ fontSize: 14, color: '#e2e8f0' }}>{file.name}</p>
                            <p className="font-mono mt-1" style={{ fontSize: 12, color: '#475569' }}>
                              {(file.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                          <p className="font-mono" style={{ fontSize: 13, color: '#475569', maxWidth: 220, lineHeight: 1.5 }}>
                            {modeConfig?.desc}
                          </p>
                          <button
                            onClick={(e) => { e.stopPropagation(); clearFile(); }}
                            className="flex items-center gap-1 font-mono font-bold transition-colors"
                            style={{ fontSize: 12, color: '#475569' }}
                            onMouseEnter={e => e.currentTarget.style.color = '#ff003c'}
                            onMouseLeave={e => e.currentTarget.style.color = '#334155'}
                          >
                            <X size={9} /> REMOVE
                          </button>
                        </motion.div>
                      ) : (
                        <motion.div
                          key="empty"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="flex flex-col items-center gap-3 p-6 pointer-events-none text-center"
                        >
                          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(0,243,255,0.04)', border: '1px solid rgba(0,243,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <UploadCloud size={20} style={{ color: 'rgba(0,243,255,0.3)' }} />
                          </div>
                          <p className="font-display font-bold" style={{ fontSize: 15, color: '#475569' }}>
                            Drop file or click a mode above
                          </p>
                          <div className="flex gap-2 flex-wrap justify-center">
                            {[
                              { ext: 'JPG/PNG', rgb: '168,85,247' },
                              { ext: 'MP4/MOV', rgb: '249,115,22' },
                              { ext: 'EML/TXT', rgb: '0,243,255' },
                            ].map(({ ext, rgb }) => (
                              <span key={ext} className="font-mono px-2 py-0.5 rounded" style={{ fontSize: 11, color: `rgba(${rgb},0.6)`, background: `rgba(${rgb},0.05)`, border: `1px solid rgba(${rgb},0.15)` }}>
                                {ext}
                              </span>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              )}
            </div>

            {/* Analyze button */}
            <motion.button
              whileHover={{ scale: canAnalyze ? 1.01 : 1 }}
              whileTap={{ scale: canAnalyze ? 0.98 : 1 }}
              onClick={analyzeContent}
              disabled={!canAnalyze}
              className="w-full py-4 rounded-xl font-display font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all duration-300"
              style={{
                fontSize: 15,
                background: !canAnalyze
                  ? 'rgba(255,255,255,0.03)'
                  : analyzing
                    ? 'rgba(0,243,255,0.08)'
                    : 'rgba(0,243,255,0.12)',
                border: `1px solid ${!canAnalyze ? 'rgba(255,255,255,0.05)' : 'rgba(0,243,255,0.35)'}`,
                color: !canAnalyze ? '#1e293b' : '#00f3ff',
                boxShadow: canAnalyze && !analyzing ? '0 0 30px rgba(0,243,255,0.1)' : 'none',
                cursor: !canAnalyze ? 'not-allowed' : 'pointer',
              }}
            >
              {analyzing ? (
                <>
                  <motion.div
                    className="w-4 h-4 rounded-full border-2 border-t-transparent"
                    style={{ borderColor: '#00f3ff transparent transparent transparent' }}
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                  />
                  ENGAGING NEURAL ENGINE
                </>
              ) : (
                <>
                  <ShieldAlert size={16} />
                  INITIATE FORENSIC SCAN
                </>
              )}
            </motion.button>
          </motion.div>

          {/* ── RIGHT: OUTPUT PANEL ── */}
          <motion.div
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.18, duration: 0.5 }}
            className="flex flex-col gap-4"
          >

            {/* Diagnostics panel */}
            <div
              className="flex-1 flex flex-col rounded-2xl overflow-hidden"
              style={{
                background: 'rgba(5,9,18,0.85)',
                border: '1px solid rgba(255,255,255,0.06)',
                backdropFilter: 'blur(16px)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
                minHeight: 340,
              }}
            >
              {/* panel header */}
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
                  <Activity size={12} style={{ color: '#00f3ff' }} />
                  <span className="font-mono font-bold uppercase tracking-widest" style={{ fontSize: 11, color: '#475569' }}>
                    Diagnostics Log
                  </span>
                </div>
                <div
                  className="flex items-center gap-1.5 px-2 py-1 rounded"
                  style={{ background: 'rgba(0,243,255,0.04)', border: '1px solid rgba(0,243,255,0.12)' }}
                >
                  <motion.span
                    className="rounded-full"
                    style={{ width: 5, height: 5, background: '#00f3ff', display: 'block' }}
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                  <span className="font-mono font-bold" style={{ fontSize: 11, color: '#00f3ff', letterSpacing: '0.15em' }}>ONLINE</span>
                </div>
              </div>

              {/* content area */}
              <div className="flex-1 flex flex-col overflow-hidden">
                <AnimatePresence mode="wait">

                  {/* STANDBY */}
                  {!result && !analyzing && (
                    <motion.div
                      key="standby"
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="flex-1 flex flex-col items-center justify-center gap-6 p-8"
                    >
                      <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(0,243,255,0.04)', border: '1px solid rgba(0,243,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ShieldCheck size={22} style={{ color: 'rgba(0,243,255,0.25)' }} />
                      </div>
                      <div className="text-center">
                        <p className="font-mono font-bold uppercase tracking-widest" style={{ fontSize: 12, color: '#334155' }}>System Standby</p>
                        <p className="font-mono mt-1" style={{ fontSize: 12, color: '#334155' }}>Awaiting data injection</p>
                      </div>

                      {/* mode legend */}
                      <div className="w-full flex flex-col gap-2 max-w-xs">
                        {Object.entries(FILE_MODE_CONFIG).map(([key, cfg]) => {
                          const Icon = cfg.icon;
                          return (
                            <div
                              key={key}
                              className="flex items-center gap-3 px-4 py-2.5 rounded-xl"
                              style={{ background: `rgba(${cfg.rgb},0.04)`, border: `1px solid rgba(${cfg.rgb},0.12)` }}
                            >
                              <Icon size={13} style={{ color: cfg.color, opacity: 0.7 }} />
                              <div className="flex-1">
                                <p className="font-mono font-bold uppercase tracking-widest" style={{ fontSize: 11, color: cfg.color, opacity: 0.8 }}>{cfg.label}</p>
                                <p className="font-mono" style={{ fontSize: 12, color: '#475569', marginTop: 2, lineHeight: 1.4 }}>{cfg.desc}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}

                  {/* ANALYZING */}
                  {analyzing && (
                    <motion.div
                      key="analyzing"
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="flex-1 flex flex-col items-center justify-center gap-6 p-8"
                    >
                      <NeuralSpinner color={modeConfig?.color || '#00f3ff'} />
                      <div className="text-center">
                        <p
                          className="font-mono font-bold uppercase tracking-widest animate-pulse"
                          style={{ fontSize: 13, color: modeConfig?.color || '#00f3ff', letterSpacing: '0.12em' }}
                        >
                          {fileCategory === 'image' ? 'RUNNING VISION AI DEEPFAKE SCAN'
                            : fileCategory === 'video' ? 'PARSING VIDEO METADATA FORENSICS'
                              : 'EXTRACTING PHISHING SIGNATURES'}
                        </p>
                        <p className="font-mono mt-2" style={{ fontSize: 12, color: '#475569' }}>
                          {fileCategory === 'image' ? 'Analyzing pixel artifacts & AI generation markers'
                            : fileCategory === 'video' ? 'Scanning for RunwayML / Sora / HeyGen watermarks'
                              : 'Connecting to NLP inference cluster…'}
                        </p>
                      </div>

                      {/* animated log lines */}
                      <div className="w-full max-w-xs flex flex-col gap-1">
                        {['Initializing neural engine', 'Loading threat signatures', 'Parsing payload structure', 'Running inference…'].map((line, i) => (
                          <motion.div
                            key={line}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.35 }}
                            className="flex items-center gap-2 font-mono"
                            style={{ fontSize: 12, color: '#475569' }}
                          >
                            <motion.span
                              style={{ width: 4, height: 4, borderRadius: '50%', background: modeConfig?.color || '#00f3ff', display: 'block', flexShrink: 0 }}
                              animate={{ opacity: [0.3, 1, 0.3] }}
                              transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                            />
                            {line}
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {/* RESULT */}
                  {result && !analyzing && (
                    <motion.div
                      key="result"
                      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                      className="flex-1 flex flex-col overflow-hidden"
                    >
                      {/* verdict bar */}
                      <div
                        className="px-6 py-4 flex items-center justify-between shrink-0"
                        style={{
                          borderBottom: `1px solid ${result.isPhishing ? 'rgba(255,0,60,0.15)' : 'rgba(57,255,20,0.12)'}`,
                          background: result.isPhishing ? 'rgba(255,0,60,0.05)' : 'rgba(57,255,20,0.04)',
                        }}
                      >
                        <div className="flex items-center gap-3">
                          {result.isPhishing
                            ? <ShieldAlert size={18} style={{ color: '#ff003c', filter: 'drop-shadow(0 0 6px #ff003c)' }} />
                            : <ShieldCheck size={18} style={{ color: '#39ff14', filter: 'drop-shadow(0 0 6px #39ff14)' }} />
                          }
                          <div>
                            {result.mode && result.mode !== 'text' && FILE_MODE_CONFIG[result.mode] && (
                              <p className="font-mono uppercase tracking-widest" style={{ fontSize: 11, color: FILE_MODE_CONFIG[result.mode].color, marginBottom: 2 }}>
                                {FILE_MODE_CONFIG[result.mode].label}
                              </p>
                            )}
                            <p
                              className="font-display font-black uppercase tracking-widest"
                              style={{
                                fontSize: 16,
                                color: result.isPhishing ? '#ff003c' : '#39ff14',
                                textShadow: result.isPhishing ? '0 0 20px rgba(255,0,60,0.5)' : '0 0 20px rgba(57,255,20,0.4)',
                              }}
                            >
                              {result.isPhishing
                                ? (result.mode === 'image' || result.mode === 'video' ? 'DEEPFAKE DETECTED' : 'THREAT DETECTED')
                                : 'CLEAN SCAN'}
                            </p>
                          </div>
                        </div>
                        <div
                          className="px-3 py-1.5 rounded-lg font-mono font-bold"
                          style={{
                            fontSize: 13,
                            background: result.isPhishing ? 'rgba(255,0,60,0.1)' : 'rgba(57,255,20,0.08)',
                            border: `1px solid ${result.isPhishing ? 'rgba(255,0,60,0.3)' : 'rgba(57,255,20,0.2)'}`,
                            color: result.isPhishing ? '#ff003c' : '#39ff14',
                          }}
                        >
                          {result.confidence}% CONF
                        </div>
                      </div>

                      {/* confidence bar */}
                      <div className="px-6 pt-4 pb-2 shrink-0">
                        <div className="flex justify-between mb-1.5">
                          <span className="font-mono uppercase tracking-widest" style={{ fontSize: 12, color: '#475569' }}>Confidence Score</span>
                          <span className="font-mono font-bold" style={{ fontSize: 11, color: result.isPhishing ? '#ff003c' : '#39ff14' }}>{result.confidence}%</span>
                        </div>
                        <div className="rounded-full overflow-hidden" style={{ height: 3, background: 'rgba(255,255,255,0.05)' }}>
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${result.confidence}%` }}
                            transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
                            style={{
                              height: '100%',
                              borderRadius: 9999,
                              background: result.isPhishing
                                ? 'linear-gradient(90deg, #ff003c, rgba(255,0,60,0.4))'
                                : 'linear-gradient(90deg, #39ff14, rgba(57,255,20,0.4))',
                              boxShadow: result.isPhishing ? '0 0 8px rgba(255,0,60,0.5)' : '0 0 8px rgba(57,255,20,0.4)',
                            }}
                          />
                        </div>
                      </div>

                      {/* explanation */}
                      <div className="flex-1 overflow-y-auto px-6 pb-5 custom-scrollbar">
                        <div className="flex items-center gap-2 mb-3">
                          <ScanLine size={11} style={{ color: '#00f3ff' }} />
                          <span className="font-mono uppercase tracking-widest" style={{ fontSize: 11, color: '#475569' }}>Analysis Log</span>
                        </div>
                        <div
                          dangerouslySetInnerHTML={{ __html: result.highlighted }}
                          className="font-mono leading-relaxed"
                          style={{ fontSize: 13, color: '#64748b', whiteSpace: 'pre-wrap' }}
                        />
                      </div>
                    </motion.div>
                  )}

                </AnimatePresence>
              </div>
            </div>

            {/* Stats strip */}
            <div
              className="grid grid-cols-3 rounded-xl overflow-hidden"
              style={{ background: 'rgba(5,9,18,0.8)', border: '1px solid rgba(255,255,255,0.05)' }}
            >
              {scanStats.map(({ label, value, color }) => (
                <StatPill key={label} label={label} value={value} color={color} />
              ))}
            </div>

          </motion.div>
        </div>

        {/* ══ FOOTER ══ */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55 }}
          className="flex items-center justify-between"
          style={{ paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.04)' }}
        >
          <span className="font-mono uppercase tracking-[0.2em]" style={{ fontSize: 12, color: '#475569' }}>
            CyberShield AI · Phishing Interceptor v2
          </span>
          <div className="flex items-center gap-4">
            {[
              { label: 'LLaMA 3.3 70B', active: true },
              { label: 'Vision AI', active: true },
              { label: 'NLP Engine', active: true },
            ].map(({ label, active }) => (
              <div key={label} className="flex items-center gap-1.5">
                <span style={{ width: 4, height: 4, borderRadius: '50%', background: active ? '#39ff14' : '#ff003c', display: 'block' }} />
                <span className="font-mono" style={{ fontSize: 12, color: '#475569', letterSpacing: '0.12em' }}>{label}</span>
              </div>
            ))}
          </div>
        </motion.div>

      </motion.div>
    </div>
  );
};

export default PhishingDetector;