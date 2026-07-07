/**
 * backend/routes/honeypot.js
 *
 * Real-time Honeypot Monitoring Route
 * - Simulates live honeypot traffic with realistic attack patterns
 * - Emits Socket.IO events for real-time frontend updates
 * - Stores sessions in PostgreSQL for persistence
 * - REST endpoints for initial data load + stats
 */

import express from 'express';
import pool from '../db.js';

const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// DATA POOLS FOR REALISTIC SIMULATION
// ─────────────────────────────────────────────────────────────────────────────

const ATTACK_IPS = [
    '45.33.22.1', '104.21.5.3', '192.241.220.185', '185.220.101.47',
    '89.248.167.131', '171.25.193.78', '103.238.234.52', '198.98.54.119',
    '94.102.49.190', '5.188.86.172', '91.108.4.20', '178.128.23.11',
    '138.68.180.55', '64.227.41.200', '159.89.214.31', '167.99.149.170',
    '209.141.40.190', '46.161.27.151', '185.130.5.231', '112.85.42.162',
];

const GEO = {
    '45.33.22.1': { country: 'US', city: 'Fremont' },
    '104.21.5.3': { country: 'US', city: 'San Jose' },
    '192.241.220.185': { country: 'US', city: 'New York' },
    '185.220.101.47': { country: 'DE', city: 'Frankfurt' },
    '89.248.167.131': { country: 'NL', city: 'Amsterdam' },
    '171.25.193.78': { country: 'SE', city: 'Stockholm' },
    '103.238.234.52': { country: 'HK', city: 'Hong Kong' },
    '198.98.54.119': { country: 'US', city: 'Chicago' },
    '94.102.49.190': { country: 'NL', city: 'Naaldwijk' },
    '5.188.86.172': { country: 'RU', city: 'Moscow' },
    '91.108.4.20': { country: 'RU', city: 'Saint Petersburg' },
    '178.128.23.11': { country: 'SG', city: 'Singapore' },
    '138.68.180.55': { country: 'DE', city: 'Berlin' },
    '64.227.41.200': { country: 'IN', city: 'Bangalore' },
    '159.89.214.31': { country: 'CA', city: 'Toronto' },
    '167.99.149.170': { country: 'GB', city: 'London' },
    '209.141.40.190': { country: 'US', city: 'Las Vegas' },
    '46.161.27.151': { country: 'UA', city: 'Kyiv' },
    '185.130.5.231': { country: 'FR', city: 'Paris' },
    '112.85.42.162': { country: 'CN', city: 'Shanghai' },
};

const ATTACK_TYPES = [
    {
        type: 'SSH Brute Force',
        port: 22,
        severity: 'Critical',
        methods: ['Password Spray', 'Dictionary Attack', 'Credential Stuffing'],
        payloads: [
            'USER root PASS password123', 'USER admin PASS admin',
            'USER ubuntu PASS ubuntu', 'USER pi PASS raspberry',
        ],
        decoyResponse: 'SSH-2.0-OpenSSH_7.4 tarpit active — credentials logged',
        color: '#ff003c',
    },
    {
        type: 'SQL Injection',
        port: 3306,
        severity: 'Critical',
        methods: ['Union-Based', 'Blind SQLi', 'Time-Based', 'Error-Based'],
        payloads: [
            "' OR '1'='1", "'; DROP TABLE users;--",
            "' UNION SELECT * FROM information_schema.tables--",
            "1' AND SLEEP(5)--",
        ],
        decoyResponse: 'Query intercepted — fake schema returned with honeypot data',
        color: '#ff003c',
    },
    {
        type: 'Port Scan',
        port: null,
        severity: 'High',
        methods: ['SYN Scan', 'FIN Scan', 'XMAS Scan', 'NULL Scan'],
        payloads: ['Scanning ports 1-65535', 'Stealth SYN probe', 'OS fingerprinting'],
        decoyResponse: 'Tar-pit active — connection artificially slowed to 1bps',
        color: '#f97316',
    },
    {
        type: 'HTTP Directory Traversal',
        port: 80,
        severity: 'High',
        methods: ['Path Traversal', 'LFI', 'RFI'],
        payloads: [
            'GET /../../../etc/passwd HTTP/1.1',
            'GET /admin/config.php HTTP/1.1',
            'GET /.env HTTP/1.1',
            'GET /wp-admin/setup-config.php HTTP/1.1',
        ],
        decoyResponse: 'Fake /etc/passwd returned — attacker IP fingerprinted',
        color: '#f97316',
    },
    {
        type: 'RDP Brute Force',
        port: 3389,
        severity: 'High',
        methods: ['BlueKeep Exploit', 'Credential Stuffing', 'NLA Bypass'],
        payloads: ['Administrator:Welcome1', 'admin:P@ssw0rd', 'user:123456'],
        decoyResponse: 'Decoy RDP session opened — keylogger active on fake desktop',
        color: '#f97316',
    },
    {
        type: 'Redis Exploit',
        port: 6379,
        severity: 'Medium',
        methods: ['Unauthenticated Access', 'RCE via CONFIG SET', 'SSRF'],
        payloads: ['CONFIG SET dir /etc', 'CONFIG SET dbfilename authorized_keys', 'SLAVEOF attacker 6379'],
        decoyResponse: 'Fake Redis CONFIG accepted — attacker redirected to sink',
        color: '#eab308',
    },
    {
        type: 'FTP Anonymous Login',
        port: 21,
        severity: 'Medium',
        methods: ['Anonymous Auth', 'Bounce Attack', 'PASV Exploit'],
        payloads: ['USER anonymous', 'PASS guest@', 'LIST /'],
        decoyResponse: 'Honeypot FTP shell granted — monitoring active session',
        color: '#eab308',
    },
    {
        type: 'DNS Amplification',
        port: 53,
        severity: 'Low',
        methods: ['ANY Query Flood', 'NXDOMAIN Attack', 'Recursive Query Abuse'],
        payloads: ['ANY isc.org', 'AAAA target.victim.com', 'NS attack-amplifier.net'],
        decoyResponse: 'Query rate-limited — source IP reported to abuse database',
        color: '#00f3ff',
    },
];

const DECOY_SERVICES = [
    { name: 'SSH Honeypot', port: 22, protocol: 'TCP', status: 'ACTIVE' },
    { name: 'MySQL Decoy', port: 3306, protocol: 'TCP', status: 'ACTIVE' },
    { name: 'Redis Trap', port: 6379, protocol: 'TCP', status: 'ACTIVE' },
    { name: 'HTTP Tar-pit', port: 8080, protocol: 'TCP', status: 'ACTIVE' },
    { name: 'RDP Honeypot', port: 3389, protocol: 'TCP', status: 'ACTIVE' },
    { name: 'FTP Decoy', port: 21, protocol: 'TCP', status: 'ACTIVE' },
    { name: 'SMTP Trap', port: 25, protocol: 'TCP', status: 'ACTIVE' },
    { name: 'Telnet Honeypot', port: 23, protocol: 'TCP', status: 'ACTIVE' },
];

// ─────────────────────────────────────────────────────────────────────────────
// DB INIT — create honeypot tables if they don't exist
// ─────────────────────────────────────────────────────────────────────────────

const initHoneypotDB = async () => {
    try {
        await pool.query(`
      CREATE TABLE IF NOT EXISTS honeypot_events (
        id SERIAL PRIMARY KEY,
        ip VARCHAR(50) NOT NULL,
        country VARCHAR(10) DEFAULT 'XX',
        city VARCHAR(100) DEFAULT 'Unknown',
        port INTEGER,
        attack_type VARCHAR(100) NOT NULL,
        method VARCHAR(100),
        payload TEXT,
        severity VARCHAR(20) NOT NULL,
        decoy_response TEXT,
        bytes_in INTEGER DEFAULT 0,
        bytes_out INTEGER DEFAULT 0,
        http_method VARCHAR(10),
        session_id VARCHAR(64),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS honeypot_sessions (
        id SERIAL PRIMARY KEY,
        session_id VARCHAR(64) UNIQUE NOT NULL,
        ip VARCHAR(50) NOT NULL,
        attack_type VARCHAR(100) NOT NULL,
        event_count INTEGER DEFAULT 1,
        first_seen TIMESTAMPTZ DEFAULT NOW(),
        last_seen TIMESTAMPTZ DEFAULT NOW()
      );
    `);
        console.log('[Honeypot] Database tables initialized');
    } catch (err) {
        console.error('[Honeypot] DB init error:', err.message);
    }
};

initHoneypotDB();

// ─────────────────────────────────────────────────────────────────────────────
// EVENT GENERATOR
// ─────────────────────────────────────────────────────────────────────────────

const generateEvent = () => {
    const ip = ATTACK_IPS[Math.floor(Math.random() * ATTACK_IPS.length)];
    const geo = GEO[ip] || { country: 'XX', city: 'Unknown' };
    const attack = ATTACK_TYPES[Math.floor(Math.random() * ATTACK_TYPES.length)];
    const method = attack.methods[Math.floor(Math.random() * attack.methods.length)];
    const payload = attack.payloads[Math.floor(Math.random() * attack.payloads.length)];
    const port = attack.port || [22, 80, 443, 3306, 8080, 6379, 21, 3389][Math.floor(Math.random() * 8)];
    const httpMethods = ['GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'OPTIONS'];
    const sessionId = Math.random().toString(36).substring(2, 18);

    return {
        ip,
        country: geo.country,
        city: geo.city,
        port,
        attack_type: attack.type,
        method,
        payload,
        severity: attack.severity,
        decoy_response: attack.decoyResponse,
        bytes_in: Math.floor(Math.random() * 2048) + 64,
        bytes_out: Math.floor(Math.random() * 8192) + 128,
        http_method: httpMethods[Math.floor(Math.random() * httpMethods.length)],
        session_id: sessionId,
        color: attack.color,
    };
};

// ─────────────────────────────────────────────────────────────────────────────
// REAL-TIME SIMULATION ENGINE — runs when clients are connected
// ─────────────────────────────────────────────────────────────────────────────

let simulationInterval = null;
let connectedClients = 0;

export const startHoneypotSimulation = (io) => {
    // Track connected clients for the honeypot namespace
    io.on('connection', (socket) => {
        socket.on('honeypot:subscribe', () => {
            connectedClients++;
            console.log(`[Honeypot] Client subscribed. Total: ${connectedClients}`);

            // Start simulation if not already running
            if (!simulationInterval) {
                simulationInterval = setInterval(async () => {
                    // Generate 1-3 events per tick to simulate burst attacks
                    const batchSize = Math.random() < 0.3 ? Math.floor(Math.random() * 3) + 2 : 1;

                    for (let i = 0; i < batchSize; i++) {
                        const event = generateEvent();

                        try {
                            // Persist to DB
                            const result = await pool.query(
                                `INSERT INTO honeypot_events
                  (ip, country, city, port, attack_type, method, payload, severity,
                   decoy_response, bytes_in, bytes_out, http_method, session_id)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
                 RETURNING id, created_at`,
                                [
                                    event.ip, event.country, event.city, event.port,
                                    event.attack_type, event.method, event.payload, event.severity,
                                    event.decoy_response, event.bytes_in, event.bytes_out,
                                    event.http_method, event.session_id,
                                ]
                            );

                            // Upsert session
                            await pool.query(
                                `INSERT INTO honeypot_sessions (session_id, ip, attack_type)
                 VALUES ($1, $2, $3)
                 ON CONFLICT (session_id) DO UPDATE
                   SET event_count = honeypot_sessions.event_count + 1,
                       last_seen = NOW()`,
                                [event.session_id, event.ip, event.attack_type]
                            );

                            const fullEvent = {
                                ...event,
                                id: result.rows[0].id,
                                created_at: result.rows[0].created_at,
                            };

                            // Emit to all subscribed clients
                            io.emit('honeypot:event', fullEvent);

                        } catch (dbErr) {
                            console.error('[Honeypot] DB insert error:', dbErr.message);
                            // Still emit even if DB fails
                            io.emit('honeypot:event', {
                                ...event,
                                id: Date.now(),
                                created_at: new Date().toISOString(),
                            });
                        }
                    }

                    // Emit updated stats every tick
                    try {
                        const stats = await getHoneypotStats();
                        io.emit('honeypot:stats', stats);
                    } catch (e) {
                        console.error('[Honeypot] Stats emit error:', e.message);
                    }

                }, 1800 + Math.random() * 1200); // 1.8–3s intervals

                console.log('[Honeypot] Simulation engine started');
            }

            // Send last 50 events immediately on subscribe
            pool.query(
                `SELECT * FROM honeypot_events ORDER BY created_at DESC LIMIT 50`
            ).then(r => {
                socket.emit('honeypot:history', r.rows.reverse());
            }).catch(e => {
                console.error('[Honeypot] History fetch error:', e.message);
                socket.emit('honeypot:history', []);
            });
        });

        socket.on('honeypot:unsubscribe', () => {
            connectedClients = Math.max(0, connectedClients - 1);
            if (connectedClients === 0 && simulationInterval) {
                clearInterval(simulationInterval);
                simulationInterval = null;
                console.log('[Honeypot] Simulation paused — no clients');
            }
        });

        socket.on('disconnect', () => {
            connectedClients = Math.max(0, connectedClients - 1);
            if (connectedClients === 0 && simulationInterval) {
                clearInterval(simulationInterval);
                simulationInterval = null;
                console.log('[Honeypot] Simulation paused — client disconnected');
            }
        });
    });
};

// ─────────────────────────────────────────────────────────────────────────────
// STATS HELPER
// ─────────────────────────────────────────────────────────────────────────────

const getHoneypotStats = async () => {
    const [total, bySeverity, byType, topIPs, recent] = await Promise.all([
        pool.query(`SELECT COUNT(*) FROM honeypot_events`),
        pool.query(`
      SELECT severity, COUNT(*) as count
      FROM honeypot_events
      GROUP BY severity
    `),
        pool.query(`
      SELECT attack_type, COUNT(*) as count
      FROM honeypot_events
      GROUP BY attack_type
      ORDER BY count DESC LIMIT 5
    `),
        pool.query(`
      SELECT ip, country, city, COUNT(*) as hits
      FROM honeypot_events
      GROUP BY ip, country, city
      ORDER BY hits DESC LIMIT 8
    `),
        pool.query(`
      SELECT COUNT(*) as count
      FROM honeypot_events
      WHERE created_at > NOW() - INTERVAL '60 seconds'
    `),
    ]);

    const sevMap = { Critical: 0, High: 0, Medium: 0, Low: 0 };
    bySeverity.rows.forEach(r => { sevMap[r.severity] = parseInt(r.count); });

    return {
        total: parseInt(total.rows[0].count),
        bySeverity: sevMap,
        byType: byType.rows.map(r => ({ type: r.attack_type, count: parseInt(r.count) })),
        topIPs: topIPs.rows.map(r => ({ ip: r.ip, country: r.country, city: r.city, hits: parseInt(r.hits) })),
        eventsPerMinute: parseInt(recent.rows[0].count),
        activeServices: DECOY_SERVICES.length,
        activeSessions: connectedClients,
    };
};

// ─────────────────────────────────────────────────────────────────────────────
// REST ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/honeypot/stats
router.get('/honeypot/stats', async (req, res) => {
    try {
        const stats = await getHoneypotStats();
        res.json({ success: true, data: stats });
    } catch (err) {
        console.error('[Honeypot] Stats error:', err.message);
        res.status(500).json({ error: 'Failed to fetch stats', details: err.message });
    }
});

// GET /api/honeypot/events?limit=100&severity=Critical
router.get('/honeypot/events', async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 100, 500);
        const severity = req.query.severity;

        let query = `SELECT * FROM honeypot_events`;
        const params = [];

        if (severity && ['Critical', 'High', 'Medium', 'Low'].includes(severity)) {
            query += ` WHERE severity = $1`;
            params.push(severity);
        }

        query += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
        params.push(limit);

        const result = await pool.query(query, params);
        res.json({ success: true, data: result.rows });
    } catch (err) {
        console.error('[Honeypot] Events fetch error:', err.message);
        res.status(500).json({ error: 'Failed to fetch events', details: err.message });
    }
});

// GET /api/honeypot/services
router.get('/honeypot/services', (req, res) => {
    res.json({ success: true, data: DECOY_SERVICES });
});

// GET /api/honeypot/timeline — events grouped by minute for chart
router.get('/honeypot/timeline', async (req, res) => {
    try {
        const result = await pool.query(`
      SELECT
        DATE_TRUNC('minute', created_at) AS bucket,
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE severity = 'Critical') AS critical,
        COUNT(*) FILTER (WHERE severity = 'High') AS high
      FROM honeypot_events
      WHERE created_at > NOW() - INTERVAL '15 minutes'
      GROUP BY bucket
      ORDER BY bucket ASC
    `);

        // Fill in any missing minutes with zeros
        const data = result.rows.map(r => ({
            time: new Date(r.bucket).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
            total: parseInt(r.total),
            critical: parseInt(r.critical),
            high: parseInt(r.high),
        }));

        res.json({ success: true, data });
    } catch (err) {
        console.error('[Honeypot] Timeline error:', err.message);
        res.status(500).json({ error: 'Failed to fetch timeline', details: err.message });
    }
});

// DELETE /api/honeypot/events — clear all events (for testing)
router.delete('/honeypot/events', async (req, res) => {
    try {
        await pool.query(`DELETE FROM honeypot_events`);
        await pool.query(`DELETE FROM honeypot_sessions`);
        res.json({ success: true, message: 'All honeypot events cleared' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to clear events', details: err.message });
    }
});

export default router;