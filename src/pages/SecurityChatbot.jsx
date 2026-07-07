import { useState, useRef, useEffect, useCallback } from 'react';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Paperclip, Send, Trash2, Download, Zap } from 'lucide-react';
import axios from 'axios';

/* ── ALL ORIGINAL CONSTANTS (unchanged) ── */
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;

const SYSTEM_PROMPT = `You are NEXUS, an elite AI security copilot embedded in CyberShield — 
an advanced cybersecurity operations platform. You specialize in:
- Network security, firewall policies, and intrusion detection
- Malware analysis, ransomware response, and threat hunting
- CVE triage, patch management, and vulnerability remediation
- Incident response playbooks and forensic analysis
- Zero-trust architecture and compliance (ISO 27001, NIST, SOC2)

Respond in a concise, technical, no-nonsense style befitting a security operations center. 
Use markdown code blocks with language tags when showing commands or configs.
Keep responses focused and actionable. Use terminal-style formatting where appropriate.`;

const QUICK_PROMPTS = [
  { label: '🚨 Active Breach', prompt: 'Our server is sending unusual outbound traffic at 3AM. Give me the first 5 immediate steps.' },
  { label: '🛡️ Harden Linux', prompt: 'Give me a hardening checklist for a production Ubuntu 22.04 server.' },
  { label: '🔍 CVE Explain', prompt: 'Explain CVE-2023-44487 HTTP/2 Rapid Reset and how to patch it.' },
  { label: '🔥 Firewall Rules', prompt: 'Write UFW firewall rules for a Node.js web server exposing ports 80 and 443 only.' },
  { label: '🎭 Red Team', prompt: 'As a red teamer, what are the first 3 things you do after initial access to a corporate network?' },
  { label: '🦠 Ransomware IOCs', prompt: 'List key indicators of compromise (IOCs) for a ransomware infection.' },
];

/* ── ALL ORIGINAL RENDER FUNCTION (unchanged) ── */
const renderContent = (content) => {
  const parts = content.split(/(```[\s\S]*?```)/g);
  return parts.map((part, i) => {
    if (part.startsWith('```')) {
      const lines = part.slice(3, -3).split('\n');
      const lang = lines[0].trim() || 'bash';
      const code = lines.slice(1).join('\n').trim();
      return (
        <div key={i} className="my-3 rounded-xl overflow-hidden" style={{ border: '1px solid rgba(0,243,255,0.15)' }}>
          <div
            className="flex items-center justify-between px-4 py-2"
            style={{ background: 'rgba(0,0,0,0.5)', borderBottom: '1px solid rgba(0,243,255,0.1)' }}
          >
            <span className="font-mono uppercase tracking-widest" style={{ fontSize: 11, color: '#00f3ff' }}>{lang}</span>
            <button
              onClick={() => navigator.clipboard.writeText(code)}
              className="font-mono transition-colors"
              style={{ fontSize: 12, color: '#a8bdd4', letterSpacing: '0.1em' }}
              onMouseEnter={e => e.currentTarget.style.color = '#00f3ff'}
              onMouseLeave={e => e.currentTarget.style.color = '#8eb4d4'}
            >
              [ copy ]
            </button>
          </div>
          <pre
            className="overflow-x-auto custom-scrollbar"
            style={{ background: 'rgba(0,0,0,0.4)', padding: '12px 16px', margin: 0 }}
          >
            <code style={{ fontSize: 13, color: '#39ff14', fontFamily: 'monospace', lineHeight: 1.6 }}>{code}</code>
          </pre>
        </div>
      );
    }
    const formatted = part.split('\n').map((line, j) => {
      const boldParts = line.split(/(\*\*.*?\*\*)/g).map((seg, k) => {
        if (seg.startsWith('**') && seg.endsWith('**')) {
          return <strong key={k} style={{ color: '#f1f5f9', fontWeight: 700 }}>{seg.slice(2, -2)}</strong>;
        }
        return seg;
      });
      return <span key={j}>{boldParts}{j < part.split('\n').length - 1 && <br />}</span>;
    });
    return <span key={i}>{formatted}</span>;
  });
};

/* ─────────────────────────────────────────
   ANIMATED BACKGROUND
───────────────────────────────────────── */
const ChatBackground = () => {
  useState(() => {
    const tryInit = () => {
      const canvas = document.getElementById('chat-bg-canvas');
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      let animId, t = 0;

      const resize = () => {
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
      };
      resize();
      window.addEventListener('resize', resize);

      const nodes = Array.from({ length: 20 }, () => ({
        x: Math.random(), y: Math.random(),
        vx: (Math.random() - 0.5) * 0.00025,
        vy: (Math.random() - 0.5) * 0.00025,
        r: Math.random() * 1.1 + 0.3,
        phase: Math.random() * Math.PI * 2,
      }));

      const orbs = [
        { x: 0.08, y: 0.15, hue: 180, size: 0.22 },
        { x: 0.92, y: 0.7, hue: 200, size: 0.18 },
        { x: 0.5, y: 0.9, hue: 160, size: 0.15 },
      ];

      const draw = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#03060f';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        orbs.forEach((o, i) => {
          const pulse = Math.sin(t * 0.006 + i * 1.5) * 0.3 + 0.7;
          const r = o.size * Math.min(canvas.width, canvas.height) * pulse;
          const gx = o.x * canvas.width, gy = o.y * canvas.height;
          const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, r);
          g.addColorStop(0, `hsla(${o.hue},100%,55%,0.065)`);
          g.addColorStop(0.5, `hsla(${o.hue},100%,50%,0.025)`);
          g.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(gx, gy, r, 0, Math.PI * 2); ctx.fill();
        });

        /* subtle dot grid */
        for (let x = 0; x < canvas.width; x += 36) {
          for (let y = 0; y < canvas.height; y += 36) {
            const alpha = 0.03 + Math.sin(t * 0.015 + x * 0.01 + y * 0.01) * 0.015;
            ctx.beginPath();
            ctx.arc(x, y, 0.7, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(0,243,255,${alpha})`;
            ctx.fill();
          }
        }

        nodes.forEach(n => {
          n.x += n.vx; n.y += n.vy;
          if (n.x < 0 || n.x > 1) n.vx *= -1;
          if (n.y < 0 || n.y > 1) n.vy *= -1;
        });
        for (let i = 0; i < nodes.length; i++) {
          for (let j = i + 1; j < nodes.length; j++) {
            const dx = (nodes[i].x - nodes[j].x) * canvas.width;
            const dy = (nodes[i].y - nodes[j].y) * canvas.height;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 130) {
              ctx.beginPath();
              ctx.strokeStyle = `rgba(0,243,255,${(1 - dist / 130) * 0.04})`;
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
    };
    setTimeout(tryInit, 80);
  });

  return <canvas id="chat-bg-canvas" className="absolute inset-0 w-full h-full pointer-events-none z-0" />;
};

/* ─────────────────────────────────────────
   TYPING DOTS
───────────────────────────────────────── */
const TypingDots = () => (
  <div className="flex items-center gap-1.5 py-1">
    {[0, 1, 2].map(i => (
      <motion.span
        key={i}
        style={{ width: 5, height: 5, borderRadius: '50%', background: '#00f3ff', display: 'block' }}
        animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1.1, 0.8] }}
        transition={{ duration: 1, repeat: Infinity, delay: i * 0.22 }}
      />
    ))}
  </div>
);

/* ─────────────────────────────────────────
   MESSAGE BUBBLE
───────────────────────────────────────── */
const MessageBubble = ({ msg, isStreaming, streamText }) => {
  const isUser = msg.role === 'user';
  const content = isStreaming ? streamText : msg.content;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
    >
      {/* avatar */}
      <div
        className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center font-mono font-black self-end mb-1"
        style={{
          fontSize: 11,
          background: isUser ? 'rgba(0,243,255,0.1)' : 'rgba(57,255,20,0.08)',
          border: `1px solid ${isUser ? 'rgba(0,243,255,0.25)' : 'rgba(57,255,20,0.2)'}`,
          color: isUser ? '#00f3ff' : '#39ff14',
          letterSpacing: '0.05em',
        }}
      >
        {isUser ? 'YOU' : 'NX'}
      </div>

      {/* bubble */}
      <div
        className="max-w-[80%] rounded-2xl px-4 py-3 font-mono text-sm leading-relaxed"
        style={{
          fontSize: 14,
          background: isUser
            ? 'rgba(0,243,255,0.07)'
            : msg.isError
              ? 'rgba(255,0,60,0.07)'
              : 'rgba(5,9,18,0.9)',
          border: `1px solid ${isUser ? 'rgba(0,243,255,0.18)' : msg.isError ? 'rgba(255,0,60,0.2)' : 'rgba(255,255,255,0.13)'}`,
          color: isUser ? '#94a3b8' : msg.isError ? '#ff003c' : '#a8bdd4',
          borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
          backdropFilter: 'blur(12px)',
        }}
      >
        {!isUser && !msg.isError && (
          <div className="flex items-center gap-2 mb-2 pb-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.10)' }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#39ff14', display: 'block', boxShadow: '0 0 5px #39ff14' }} />
            <span className="font-mono font-bold uppercase tracking-widest" style={{ fontSize: 11, color: '#39ff14' }}>NEXUS</span>
            <span className="font-mono" style={{ fontSize: 12, color: '#94a3b8', marginLeft: 'auto' }}>
              {new Date(msg.timestamp).toLocaleTimeString()}
            </span>
          </div>
        )}
        {isUser && (
          <div className="flex justify-end mb-1.5">
            <span className="font-mono" style={{ fontSize: 12, color: '#94a3b8' }}>
              {new Date(msg.timestamp).toLocaleTimeString()}
            </span>
          </div>
        )}
        <div style={{ color: isUser ? '#94a3b8' : '#a8bdd4', lineHeight: 1.7 }}>
          {renderContent(content)}
          {isStreaming && (
            <span
              className="inline-block w-2 h-4 ml-0.5 align-middle"
              style={{ background: '#00f3ff', animation: 'pulse 0.8s infinite' }}
            />
          )}
        </div>
      </div>
    </motion.div>
  );
};

/* ─────────────────────────────────────────
   DOC ITEM (sidebar)
───────────────────────────────────────── */
const DocItem = ({ name, size }) => (
  <div
    className="flex justify-between items-center px-3 py-2.5 rounded-xl font-mono cursor-pointer transition-all duration-200"
    style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.10)', fontSize: 12 }}
    onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(0,243,255,0.2)'}
    onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)'}
  >
    <span className="truncate pr-2" style={{ color: '#8eb4d4' }}>{name}</span>
    <span style={{ color: '#00f3ff', fontSize: 11, flexShrink: 0 }}>{size}</span>
  </div>
);

/* ══════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════ */
const SecurityChatbot = () => {
  /* ── ALL ORIGINAL STATE (unchanged) ── */
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'INTELLIGENCE UPLINK SECURED.\n\nI am NEXUS — your AI security copilot. I can help with incident response, threat hunting, CVE analysis, firewall configuration, and more.\n\nState your query or select a quick action below.',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [error, setError] = useState(null);
  const [tokenCount, setTokenCount] = useState(0);
  const endOfMessagesRef = useRef(null);
  const abortControllerRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);

  const [documents, setDocuments] = useState([
    { name: 'ISO_27001_Compliance.pdf', size: '2.4MB', content: 'ISO/IEC 27001 standard details compliance guidelines, security checkmarks, risks, policies, threat assets protection, and risk assessment procedures.' },
    { name: 'Incident_Response_Playbook.md', size: '45KB', content: 'Incident Response steps: 1. Identification: Detect and log anomalous behavior. 2. Containment: Isolate target systems. 3. Eradication: Purge malware signatures. 4. Recovery: Restore backup images. 5. Lessons Learned: Update threat intelligence databases.' },
    { name: 'Firewall_Ruleset_v3.json', size: '12KB', content: 'Firewall configurations: Block port 22 except from bastion IP, allow HTTP (80) and HTTPS (443), log rejected packets, rate limit SSH requests.' },
    { name: 'ZeroTrust_Architecture.docx', size: '1.1MB', content: 'Zero Trust architecture requirements: Authenticate and authorize every access request, assume breach, verify explicitly, use least privilege access policies.' }
  ]);
  const [uploading, setUploading] = useState(false);

  const handleIngestFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post('http://127.0.0.1:5000/api/upload-copilot-doc', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.data.success) {
        const newDoc = {
          name: response.data.data.name,
          size: response.data.data.size,
          content: response.data.data.content
        };
        setDocuments(prev => [...prev, newDoc]);
        
        // Add log message to chat history
        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: `📥 **DOCUMENT INGESTED INTO KNOWLEDGE BASE**\n\n**Name:** ${newDoc.name}\n**Size:** ${newDoc.size}\n**Characters:** ${response.data.data.characters}\n\n*NEXUS copilot intelligence has indexed the content and added it to active memory.*`,
            timestamp: new Date()
          }
        ]);
      }
    } catch (err) {
      console.error('Ingestion failed:', err);
      const errMsg = err.response?.data?.error || err.message || 'Server connection error';
      setError(`Ingestion failed: ${errMsg}`);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `❌ **INGESTION FAILED: ${errMsg}**\n\nEnsure the backend server is running on port 5000 and that you uploaded a valid document format.`,
          timestamp: new Date(),
          isError: true
        }
      ]);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText]);

  /* ── ALL ORIGINAL SEND LOGIC (unchanged) ── */
  const handleSend = useCallback(async (overrideInput) => {
    const query = overrideInput ?? input;
    if (!query.trim() || isStreaming) return;

    const userMessage = { role: 'user', content: query, timestamp: new Date() };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsStreaming(true);
    setStreamingText('');
    setError(null);

    abortControllerRef.current = new AbortController();

    try {
      const history = [...messages, userMessage]
        .filter((_, i) => i !== 0)
        .map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content }));

      const docsContext = documents
        .map(d => `[DOCUMENT: ${d.name}]\n${d.content.substring(0, 4000)}`)
        .join('\n\n');

      const customSystemPrompt = docsContext
        ? `${SYSTEM_PROMPT}\n\nHere are reference documents loaded in your Knowledge Base context:\n${docsContext}`
        : SYSTEM_PROMPT;

      const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GROQ_API_KEY}` },
        signal: abortControllerRef.current.signal,
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'system', content: customSystemPrompt }, ...history],
          max_tokens: 1024,
          temperature: 0.7,
          stream: true,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error?.message || `HTTP ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';
      let totalTokens = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter((l) => l.startsWith('data: '));
        for (const line of lines) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;
          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta?.content || '';
            fullText += delta;
            totalTokens = parsed.x_groq?.usage?.completion_tokens ?? totalTokens;
            setStreamingText(fullText);
          } catch (e) {
            console.warn('Failed to parse chunk', e);
          }
        }
      }

      setTokenCount((prev) => prev + totalTokens);
      setMessages((prev) => [...prev, { role: 'assistant', content: fullText, timestamp: new Date() }]);
    } catch (err) {
      if (err.name === 'AbortError') return;
      setError(err.message);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `[ERROR] UPLINK FAILED: ${err.message}\n\nCheck your VITE_GROQ_API_KEY in .env`, timestamp: new Date(), isError: true },
      ]);
    } finally {
      setIsStreaming(false);
      setStreamingText('');
    }
  }, [input, isStreaming, messages, documents]);

  /* ── ALL ORIGINAL HANDLERS (unchanged) ── */
  const handleAbort = () => {
    abortControllerRef.current?.abort();
    setIsStreaming(false);
    setStreamingText('');
  };

  const handleClear = () => {
    setMessages([{ role: 'assistant', content: 'Session cleared. NEXUS uplink re-established. Ready for new queries.', timestamp: new Date() }]);
    setTokenCount(0);
    setError(null);
  };

  const handleExport = () => {
    const text = messages
      .map((m) => `[${m.role.toUpperCase()}] ${new Date(m.timestamp).toLocaleTimeString()}\n${m.content}`)
      .join('\n\n---\n\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nexus-session-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
   <div className="relative w-full overflow-hidden" style={{ background: '#03060f', height: '100%' }}>


      <ChatBackground />

      {/* vignette */}
      <div
        className="absolute inset-0 pointer-events-none z-[1]"
        style={{ background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.5) 100%)' }}
      />

      <div className="relative z-10 flex gap-5 p-4" style={{ height: '100%', minHeight: 0 }}>

        {/* ── SIDEBAR ── */}
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="hidden md:flex flex-col gap-4 w-64 shrink-0 overflow-y-auto"        >
          {/* NEXUS identity card */}
          <div
            className="rounded-2xl p-4"
            style={{
              background: 'rgba(5,9,18,0.9)',
              border: '1px solid rgba(0,243,255,0.12)',
              backdropFilter: 'blur(16px)',
              boxShadow: '0 0 30px rgba(0,243,255,0.05)',
            }}
          >
            {/* avatar */}
            <div className="flex items-center gap-3 mb-4 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.10)' }}>
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center font-display font-black"
                style={{
                  background: isStreaming ? 'rgba(57,255,20,0.1)' : 'rgba(0,243,255,0.08)',
                  border: `1px solid ${isStreaming ? 'rgba(57,255,20,0.3)' : 'rgba(0,243,255,0.2)'}`,
                  color: isStreaming ? '#39ff14' : '#00f3ff',
                  fontSize: 15,
                  boxShadow: isStreaming ? '0 0 16px rgba(57,255,20,0.2)' : '0 0 16px rgba(0,243,255,0.1)',
                  transition: 'all 0.3s',
                }}
              >
                NX
              </div>
              <div>
                <p className="font-display font-black" style={{ fontSize: 15, color: '#f1f5f9', letterSpacing: '0.05em' }}>NEXUS</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span
                    style={{ width: 5, height: 5, borderRadius: '50%', background: isStreaming ? '#39ff14' : '#00f3ff', display: 'block', boxShadow: `0 0 5px ${isStreaming ? '#39ff14' : '#00f3ff'}` }}
                    className={isStreaming ? 'animate-pulse' : ''}
                  />
                  <span className="font-mono" style={{ fontSize: 12, color: isStreaming ? '#39ff14' : '#a8bdd4', letterSpacing: '0.1em' }}>
                    {isStreaming ? 'COMPUTING…' : 'ONLINE'}
                  </span>
                </div>
              </div>
            </div>

            {/* stats */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Model', val: 'LLaMA 3.3' },
                { label: 'Tokens', val: `~${tokenCount}` },
                { label: 'Messages', val: messages.length },
                { label: 'Provider', val: 'Groq' },
              ].map(({ label, val }) => (
                <div
                  key={label}
                  className="flex flex-col rounded-xl px-3 py-2"
                  style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.10)' }}
                >
                  <span className="font-mono font-bold" style={{ fontSize: 13, color: '#94a3b8' }}>{val}</span>
                  <span className="font-mono uppercase tracking-widest" style={{ fontSize: 12, color: '#a8bdd4', marginTop: 2 }}>{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* quick actions */}
          <div
            className="rounded-2xl p-4 flex flex-col gap-2"
            style={{
              background: 'rgba(5,9,18,0.85)',
              border: '1px solid rgba(255,255,255,0.13)',
              backdropFilter: 'blur(16px)',
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <Zap size={11} style={{ color: '#00f3ff' }} />
              <span className="font-mono uppercase tracking-widest" style={{ fontSize: 12, color: '#a8bdd4' }}>Quick Actions</span>
            </div>
            {QUICK_PROMPTS.map((qp) => (
              <button
                key={qp.label}
                onClick={() => handleSend(qp.prompt)}
                disabled={isStreaming}
                className="w-full text-left px-3 py-2.5 rounded-xl font-mono transition-all duration-200"
                style={{
                  fontSize: 12,
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid rgba(255,255,255,0.10)',
                  color: '#8eb4d4',
                  cursor: isStreaming ? 'not-allowed' : 'pointer',
                  opacity: isStreaming ? 0.4 : 1,
                }}
                onMouseEnter={e => { if (!isStreaming) { e.currentTarget.style.borderColor = 'rgba(0,243,255,0.2)'; e.currentTarget.style.color = '#a8bdd4'; } }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)'; e.currentTarget.style.color = '#8eb4d4'; }}
              >
                {qp.label}
              </button>
            ))}
          </div>

          {/* knowledge base */}
          <div
            className="rounded-2xl p-4 flex flex-col gap-2 flex-1"
            style={{
              background: 'rgba(5,9,18,0.85)',
              border: '1px solid rgba(255,255,255,0.13)',
              backdropFilter: 'blur(16px)',
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <Paperclip size={11} style={{ color: '#00f3ff' }} />
              <span className="font-mono uppercase tracking-widest" style={{ fontSize: 12, color: '#a8bdd4' }}>Knowledge Base</span>
            </div>
            <div className="space-y-2 flex-1 overflow-y-auto max-h-[220px] custom-scrollbar pr-1">
              {documents.map((d) => <DocItem key={d.name} name={d.name} size={d.size} />)}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.txt,.md,.json,.docx"
              className="hidden"
              onChange={handleIngestFile}
              disabled={uploading}
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full py-2.5 rounded-xl font-mono font-bold uppercase tracking-widest mt-1 transition-all duration-200 disabled:opacity-50"
              style={{
                fontSize: 11,
                background: uploading ? 'rgba(0,243,255,0.02)' : 'rgba(0,243,255,0.05)',
                border: '1px solid rgba(0,243,255,0.15)',
                color: '#00f3ff',
                cursor: uploading ? 'not-allowed' : 'pointer'
              }}
              onMouseEnter={e => { if (!uploading) e.currentTarget.style.background = 'rgba(0,243,255,0.1)'; }}
              onMouseLeave={e => { if (!uploading) e.currentTarget.style.background = 'rgba(0,243,255,0.05)'; }}
            >
              {uploading ? 'INGESTING...' : '+ INGEST DOCUMENT'}
            </button>
          </div>
        </motion.div>

        {/* ── MAIN CHAT PANEL ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="flex-1 flex flex-col rounded-2xl overflow-hidden min-w-0"
          style={{
            background: 'rgba(5,9,18,0.88)',
            border: '1px solid rgba(0,243,255,0.1)',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 0 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.10)',
          }}
        >
          {/* ── TOP BAR ── */}
          <div
            className="flex items-center justify-between px-6 py-4 shrink-0"
            style={{ borderBottom: '1px solid rgba(0,243,255,0.07)' }}
          >
            <div className="flex items-center gap-4">
              {/* 3-dot chrome */}
              <div className="flex gap-1.5">
                {['#ff003c', '#f59e0b', '#39ff14'].map((c, i) => (
                  <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: c, opacity: 0.65 }} />
                ))}
              </div>
              <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.13)' }} />
              <div className="flex items-center gap-2">
                <MessageSquare size={13} style={{ color: isStreaming ? '#39ff14' : '#00f3ff', transition: 'color 0.3s' }} />
                <span className="font-mono font-bold uppercase tracking-widest" style={{ fontSize: 12, color: '#94a3b8' }}>
                  NEXUS Copilot
                </span>
                <div
                  className="px-2 py-0.5 rounded font-mono font-bold"
                  style={{
                    fontSize: 11,
                    background: isStreaming ? 'rgba(57,255,20,0.08)' : 'rgba(0,243,255,0.05)',
                    border: `1px solid ${isStreaming ? 'rgba(57,255,20,0.2)' : 'rgba(0,243,255,0.12)'}`,
                    color: isStreaming ? '#39ff14' : '#00f3ff',
                    letterSpacing: '0.12em',
                    transition: 'all 0.3s',
                  }}
                >
                  {isStreaming ? '● LIVE' : '● READY'}
                </div>
              </div>
            </div>

            {/* action buttons */}
            <div className="flex items-center gap-1">
              {[
                { icon: Download, fn: handleExport, tip: 'Export session' },
                { icon: Trash2, fn: handleClear, tip: 'Clear session' },
              ].map(({ icon: Icon, fn, tip }) => (
                <button
                  key={tip}
                  onClick={fn}
                  title={tip}
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200"
                  style={{ background: 'transparent', border: '1px solid transparent', color: '#8eb4d4' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.10)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#a8bdd4'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.color = '#8eb4d4'; }}
                >
                  <Icon size={14} />
                </button>
              ))}
            </div>
          </div>

          {/* ── MESSAGES ── */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 custom-scrollbar">
            <AnimatePresence initial={false}>
              {messages.map((msg, idx) => (
                <MessageBubble key={idx} msg={msg} isStreaming={false} streamText="" />
              ))}
            </AnimatePresence>

            {/* streaming bubble */}
            {isStreaming && streamingText && (
              <MessageBubble
                msg={{ role: 'assistant', content: '', timestamp: new Date() }}
                isStreaming={true}
                streamText={streamingText}
              />
            )}

            {/* thinking dots */}
            {isStreaming && !streamingText && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex gap-3"
              >
                <div
                  className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center font-mono font-black self-end mb-1"
                  style={{ fontSize: 11, background: 'rgba(57,255,20,0.08)', border: '1px solid rgba(57,255,20,0.2)', color: '#39ff14' }}
                >
                  NX
                </div>
                <div
                  className="px-4 py-3 rounded-2xl"
                  style={{
                    background: 'rgba(5,9,18,0.9)',
                    border: '1px solid rgba(255,255,255,0.13)',
                    borderRadius: '18px 18px 18px 4px',
                  }}
                >
                  <TypingDots />
                </div>
              </motion.div>
            )}

            <div ref={endOfMessagesRef} />
          </div>

          {/* ── INPUT BAR ── */}
          <div
            className="shrink-0 px-6 py-4"
            style={{ borderTop: '1px solid rgba(0,243,255,0.07)' }}
          >
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 mb-3 px-3 py-2 rounded-xl font-mono"
                style={{ background: 'rgba(255,0,60,0.06)', border: '1px solid rgba(255,0,60,0.15)', fontSize: 12, color: '#ff003c' }}
              >
                <span className="animate-pulse">⚠</span>
                {error}
              </motion.div>
            )}

            <div className="flex items-end gap-3">
              {/* prompt indicator */}
              <span className="font-mono font-bold shrink-0 mb-3" style={{ fontSize: 16, color: '#00f3ff', lineHeight: 1 }}>›</span>

              {/* input */}
              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => { setInput(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'; }}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder="Query security parameters… (Enter to send, Shift+Enter for newline)"
                  disabled={isStreaming}
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

              {/* send / stop button */}
              {isStreaming ? (
                <button
                  onClick={handleAbort}
                  className="shrink-0 px-4 py-2.5 rounded-xl font-mono font-bold uppercase tracking-widest transition-all duration-200"
                  style={{
                    fontSize: 11,
                    background: 'rgba(255,0,60,0.08)',
                    border: '1px solid rgba(255,0,60,0.25)',
                    color: '#ff003c',
                    letterSpacing: '0.12em',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,0,60,0.15)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,0,60,0.08)'; }}
                >
                  STOP
                </button>
              ) : (
                <button
                  onClick={() => handleSend()}
                  disabled={!input.trim()}
                  className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200"
                  style={{
                    background: input.trim() ? 'rgba(0,243,255,0.1)' : 'rgba(255,255,255,0.09)',
                    border: `1px solid ${input.trim() ? 'rgba(0,243,255,0.3)' : 'rgba(255,255,255,0.10)'}`,
                    color: input.trim() ? '#00f3ff' : '#5a7a9a',
                    cursor: input.trim() ? 'pointer' : 'not-allowed',
                    boxShadow: input.trim() ? '0 0 16px rgba(0,243,255,0.1)' : 'none',
                  }}
                  onMouseEnter={e => { if (input.trim()) e.currentTarget.style.background = 'rgba(0,243,255,0.18)'; }}
                  onMouseLeave={e => { if (input.trim()) e.currentTarget.style.background = 'rgba(0,243,255,0.1)'; }}
                >
                  <Send size={15} />
                </button>
              )}
            </div>

            {/* footer hint */}
            <div className="flex items-center justify-between mt-3">
              <p className="font-mono" style={{ fontSize: 12, color: '#94a3b8', letterSpacing: '0.1em' }}>
                ENTER · send &nbsp;·&nbsp; SHIFT+ENTER · newline &nbsp;·&nbsp; Session not stored
              </p>
              <p className="font-mono" style={{ fontSize: 12, color: '#94a3b8', letterSpacing: '0.1em' }}>
                ~{tokenCount} tokens used
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default SecurityChatbot;
