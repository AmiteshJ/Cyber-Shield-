# 🛡️ CyberShield AI

> Next-generation AI-powered cybersecurity platform for real-time threat detection, vulnerability prioritization, and intelligent security operations.

Built for the digital battlefield — powered by Groq LLaMA 3.3 70B, VirusTotal, and NIST NVD.

---

## ✨ Features

| Module | Description |
|--------|-------------|
| 🦠 Malware Detector | Real-time file scanning via VirusTotal API with SHA-256 caching |
| 🎭 Phishing & Deepfake Interceptor | Detects phishing emails, AI-generated images, and deepfake videos |
| 🎯 CVE Triage Engine | Fetches live NIST NVD data and AI-prioritizes vulnerabilities |
| 📄 Policy Chatbot | Upload any security PDF and query it in natural language |
| 🍯 Honeypot Monitor | Simulated live deception network traffic feed |
| 🤖 NEXUS AI Copilot | Streaming security chatbot for incident response and hardening |
| 📊 Dashboard | Real-time threat metrics, activity feed, and live chart |

---

## 🧰 Tech Stack

**Frontend**
- React 19 + Vite 8
- Tailwind CSS + Framer Motion
- Recharts, Lucide React, Socket.IO Client

**Backend**
- Node.js + Express 5
- PostgreSQL (Neon DB)
- Socket.IO for real-time events

**AI / APIs**
- Groq — LLaMA 3.3 70B for chat, CVE analysis, and phishing detection
- VirusTotal — malware scanning engine
- NIST NVD — live CVE vulnerability database

---

## 🚀 Getting Started

### Prerequisites

- Node.js >= 20
- PostgreSQL database or a Neon DB connection string

### 1. Clone the repo

```bash
git clone https://github.com/yourusername/cybershieldai.git
cd cybershieldai
```

### 2. Set up environment variables

Create a `.env` file in the root directory:

```env
VITE_GROQ_API_KEY=your_groq_api_key
VT_API_KEY=your_virustotal_api_key
DATABASE_URL=your_postgresql_connection_string
GROQ_API_KEY=your_groq_api_key
```

### 3. Install dependencies

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd backend && npm install
```

### 4. Initialize the database

```bash
node backend/db.js
```

### 5. Run the app

```bash
npm run dev
```

This starts both the Vite frontend and the Express backend concurrently.

- Frontend: http://localhost:5173
- Backend API: http://localhost:5000

---

## 📁 Project Structure

```
cybershieldai/
├── src/
│   ├── pages/              # All page components
│   │   ├── Dashboard.jsx
│   │   ├── MalwareDetector.jsx
│   │   ├── PhishingDetector.jsx
│   │   ├── VulnerabilityPrioritizer.jsx
│   │   ├── SecurityChatbot.jsx
│   │   ├── HoneypotLogs.jsx
│   │   └── PolicyChatbot.jsx
│   ├── components/
│   │   ├── Layout.jsx
│   │   └── Sidebar.jsx
│   └── index.css
├── backend/
│   ├── routes/
│   │   ├── api.js          # Scan, phishing, stats endpoints
│   │   ├── cve.js          # CVE analysis endpoint
│   │   └── policy.js       # PDF upload and Q&A endpoint
│   ├── db.js               # PostgreSQL connection and schema init
│   └── server.js           # Express + Socket.IO server
├── .env                    # Environment variables (not committed)
└── package.json
```

---

## 🔑 API Keys Required

| Service | Where to get it |
|---------|-----------------|
| Groq | https://console.groq.com |
| VirusTotal | https://www.virustotal.com/gui/my-apikey |
| Neon DB | https://neon.tech |

---

## 🗄️ Database Schema

The app automatically creates two tables on startup:

**scans** — stores malware scan results with filename, SHA-256 hash, status, confidence, and timestamp.

**activities** — stores real-time activity feed events with type (CRITICAL, WARNING, INFO), message text, and timestamp.

---

## 🌐 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/scan | Upload and scan a file for malware |
| POST | /api/phish/analyze | Analyze text or file for phishing or deepfakes |
| POST | /api/analyze-cves | Fetch and AI-prioritize CVE vulnerabilities |
| POST | /api/upload-policy | Upload a security policy PDF |
| POST | /api/ask-policy | Ask a question about the uploaded policy |
| GET | /api/policy-status | Check if a policy document is loaded |
| GET | /api/stats | Get dashboard summary statistics |
| GET | /api/threats | Get threat graph data for the last 7 hours |
| GET | /api/activity | Get recent activity feed entries |

---

## ⚙️ How It Works

**Malware Detection**
Files are hashed with SHA-256 and checked against the local database cache first. If not found, the file is looked up or uploaded to VirusTotal. Results are stored for future fast lookups.

**Phishing and Deepfake Detection**
Text inputs are analyzed by LLaMA 3.3 70B via Groq. Images are sent to the LLaMA vision model for deepfake artifact detection. Videos and email files are analyzed via metadata extraction and LLM classification.

**CVE Triage**
CVE IDs are extracted from user input, fetched from the NIST NVD REST API for real CVSS scores and descriptions, then sent to Groq for AI-powered prioritization and remediation guidance.

**Policy Chatbot**
PDF files are parsed server-side using pdfreader. Extracted text is stored in memory and used as context for Groq LLM queries, allowing precise question answering grounded in the document.

---

## 🔄 Real-Time Features

The dashboard uses Socket.IO to receive live activity events whenever a scan completes or a threat is detected. No polling required — events push instantly to all connected clients.

---

## 📜 License

MIT © CyberShield AI Team
```
