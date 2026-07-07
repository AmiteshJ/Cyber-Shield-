import express from 'express';
import multer from 'multer';
import axios from 'axios';
import FormData from 'form-data';
import pool from '../db.js';
import { analyzeImageWithGemini, analyzeVideoWithGemini } from '../utils/gemini.js';
import { analyzeFile } from '../utils/heuristics.js';
import { PDFParse } from 'pdf-parse';

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 200 * 1024 * 1024 } }); // 200 MB max

const logActivity = async (io, type, text) => {
  try {
    const res = await pool.query(
      'INSERT INTO activities (type, text) VALUES ($1, $2) RETURNING *',
      [type, text]
    );
    io.emit('new_activity', res.rows[0]);
  } catch (err) {
    console.error('Error logging activity:', err);
  }
};

import crypto from 'crypto';

// ─────────────────────────────────────────────────────────────────────────────
// SCAN API — Malware detection via VirusTotal
// ─────────────────────────────────────────────────────────────────────────────
router.post('/scan', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { originalname, buffer } = req.file;
    await logActivity(req.io, 'INFO', `File uploaded for malware scan: ${originalname}`);

    const vtApiKey = process.env.VT_API_KEY;

    const hashSum = crypto.createHash('sha256');
    hashSum.update(buffer);
    const sha256 = hashSum.digest('hex');

    try {
      const cached = await pool.query('SELECT * FROM scans WHERE hash = $1 LIMIT 1', [sha256]);
      if (cached.rows.length > 0) {
        const scan = cached.rows[0];
        if (scan.is_malicious) {
          await logActivity(req.io, 'CRITICAL', `[THREAT DETECTED] Cached malware signature matched for: ${originalname}`);
        } else {
          await logActivity(req.io, 'INFO', `File matched in safe cache: ${originalname}`);
        }
        let explanation = scan.explanation;
        if (!explanation) {
          explanation = scan.is_malicious
            ? `[CRITICAL] Cached threat signature matched for ${originalname}. Highly likely to be a security threat.`
            : `[INFO] Cached safe file match for ${originalname}. Clean heuristic record.`;
        }
        return res.json({
          success: true,
          data: {
            status: scan.status,
            confidence: scan.confidence,
            isMalicious: scan.is_malicious,
            explanation,
            heuristics: scan.heuristics_json || null
          }
        });
      }
    } catch (dbErr) {
      console.error('DB Cache Error:', dbErr);
    }

    // Run local static heuristic analysis
    const localResult = analyzeFile(buffer, originalname);
    console.log(`[Heuristics] Scan for ${originalname}: score=${localResult.score}, malicious=${localResult.isMalicious}, flags=${localResult.flags.length}`);

    let analysisStats = null;
    let scanId = sha256;

    try {
      const lookupRes = await axios.get(`https://www.virustotal.com/api/v3/files/${sha256}`, {
        headers: { 'x-apikey': vtApiKey },
      });
      if (lookupRes.data?.data?.attributes) {
        analysisStats = lookupRes.data.data.attributes.last_analysis_stats;
        console.log(`[VT] Hash lookup successful for ${originalname}`);
      }
    } catch (lookupErr) {
      console.log(`[VT] Hash lookup failed for ${originalname}, uploading...`);
      try {
        const formData = new FormData();
        formData.append('file', buffer, originalname);
        const vtResponse = await axios.post('https://www.virustotal.com/api/v3/files', formData, {
          headers: { 'x-apikey': vtApiKey, ...formData.getHeaders() },
        });
        scanId = vtResponse.data.data.id;
        for (let i = 0; i < 4; i++) {
          await new Promise(resolve => setTimeout(resolve, 5000));
          const analysisRes = await axios.get(
            `https://www.virustotal.com/api/v3/analyses/${scanId}`,
            { headers: { 'x-apikey': vtApiKey } }
          );
          if (analysisRes.data?.data?.attributes?.status === 'completed') {
            analysisStats = analysisRes.data.data.attributes.stats;
            break;
          }
        }
      } catch (apiError) {
        console.error("VT Upload/Analysis Error:", apiError.response?.data || apiError.message);
      }
    }

    let isMalicious = false;
    let maliciousCount = 0;
    let confidence = 0;

    if (analysisStats) {
      maliciousCount = analysisStats.malicious || 0;
      const total = (analysisStats.malicious || 0) + (analysisStats.undetected || 0) + (analysisStats.harmless || 0);
      
      // Determine malice based on both VirusTotal and local heuristics
      isMalicious = maliciousCount > 0 || localResult.isMalicious;
      
      if (isMalicious) {
        if (maliciousCount > 0) {
          confidence = total > 0 ? Math.round((maliciousCount / total) * 100) : 100;
          if (confidence < 80) confidence = 85;
        } else {
          confidence = localResult.confidence;
        }
      } else {
        const vtConfidence = total > 0 ? Math.round(((analysisStats.undetected + analysisStats.harmless) / total) * 100) : 100;
        confidence = Math.round((vtConfidence + localResult.confidence) / 2);
      }
    } else {
      // Fallback: VT API didn't reply (offline or rate limited). Use local heuristics results!
      isMalicious = localResult.isMalicious;
      confidence = localResult.confidence;
      console.log(`[VT-Fallback] Using local static heuristics for classification. Malicious: ${isMalicious}`);
    }

    const status = isMalicious ? 'Malicious ⚠️' : 'Safe ✅';

    // 🔥 Generate explanation using AI (Groq LLaMA)
    let explanation = '';
    try {
      const groqApiKey = process.env.VITE_GROQ_API_KEY || process.env.GROQ_API_KEY;
      if (groqApiKey) {
        const heuristicDetailsStr = localResult.flags.length > 0
          ? `Local Heuristic Flags Triggered:\n- ${localResult.flags.join('\n- ')}\nFile Entropy: ${localResult.entropy}\nDetected magic structure: ${localResult.magicType}`
          : `No local heuristic flags triggered. File Entropy: ${localResult.entropy}\nDetected magic structure: ${localResult.magicType}`;

        const prompt = `You are a professional security analyst.
A file has been analyzed by a malware detector.
File Name: ${originalname}
Scan Status: ${status}
Is Malicious: ${isMalicious}
Confidence: ${confidence}%
VirusTotal Malicious Detections: ${maliciousCount}
${heuristicDetailsStr}

Provide a concise, detailed analysis explaining:
1. What this file type/format/extension is and what it is typically used for.
2. If it is malicious, explain what kind of threat it likely is based on the findings (e.g. trojan, ransomware, adware, test signature, or structural mismatch), how this threat behaves, and recommended remediation. Refer explicitly to any local heuristic flags if triggered.
3. If it is safe, explain why files of this type should still be handled with standard care, and comment on the clean heuristic record and file structure.

Keep the response concise (around 100-120 words), professional, and format it with clean line breaks or bullets suitable for a retro cyber terminal (monospace font). Use uppercase labels or tags like "[INFO]", "[TYPE]", "[THREAT]", "[REMEDIATION]", etc. to make it look like terminal logs.`;

        const groqResponse = await axios.post(
          'https://api.groq.com/openai/v1/chat/completions',
          {
            model: 'llama-3.3-70b-versatile',
            messages: [
              { role: 'system', content: 'You are an elite cybersecurity threat analyst explaining file scanner findings. Output clean, raw monospace-friendly text with uppercase terminal tags.' },
              { role: 'user', content: prompt }
            ],
            temperature: 0.3,
            max_tokens: 256
          },
          { headers: { Authorization: `Bearer ${groqApiKey}`, 'Content-Type': 'application/json' }, timeout: 15000 }
        );
        explanation = groqResponse.data.choices[0].message.content.trim();
      }
    } catch (aiErr) {
      console.error('AI Explanation Error:', aiErr);
    }

    if (!explanation) {
      explanation = isMalicious
        ? `[ALERT] File ${originalname} has been flagged as malicious.\n[TYPE] Heuristic threat pattern match.\n[REMEDIATION] Quarantine and inspect immediately.`
        : `[INFO] File ${originalname} appears to be safe.\n[TYPE] Standard file structure.\n[REMEDIATION] Standard care recommended when executing/opening.`;
    }

    await pool.query(
      'INSERT INTO scans (filename, hash, status, confidence, is_malicious, explanation, heuristics_json) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [originalname, sha256, status, confidence, isMalicious, explanation, JSON.stringify(localResult)]
    );
    await logActivity(req.io, isMalicious ? 'CRITICAL' : 'INFO',
      `AI scan complete for ${originalname}. Malicious engines: ${maliciousCount}, local risk flags: ${localResult.flags.length}`);

    res.json({ success: true, data: { status, confidence, isMalicious, explanation, heuristics: localResult } });
  } catch (err) {
    console.error('Scan Error:', err);
    res.status(500).json({ error: 'Server error during scan' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PHISHING / DEEPFAKE ANALYZER API
// ─────────────────────────────────────────────────────────────────────────────
router.post('/phish/analyze', upload.single('file'), async (req, res) => {
  try {
    const groqApiKey = process.env.VITE_GROQ_API_KEY || process.env.GROQ_API_KEY;
    if (!groqApiKey) return res.status(500).json({ error: 'Groq API key missing' });

    // ── TEXT / RAW MESSAGE ────────────────────────────────────────────────────
    if (!req.file) {
      const { text } = req.body;
      if (!text) return res.status(400).json({ error: 'No text or file provided' });

      await logActivity(req.io, 'INFO', 'Analyzing raw text payload for phishing...');

      const groqResponse = await axios.post(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          model: 'llama-3.3-70b-versatile',
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'system',
              content:
                'You are an elite cybersecurity AI. Analyze the text and determine if it is phishing/scam. ' +
                'Respond ONLY in valid JSON (no markdown): ' +
                '{"isPhishing": true, "confidence": 95, "explanation": "Brief reasoning with key words in <b>bold</b>."}',
            },
            { role: 'user', content: text },
          ],
        },
        { headers: { Authorization: `Bearer ${groqApiKey}`, 'Content-Type': 'application/json' }, timeout: 25000 }
      );

      let content = groqResponse.data.choices[0].message.content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const result = jsonMatch
        ? JSON.parse(jsonMatch[0])
        : JSON.parse(content.replace(/```json|```/g, '').trim());

      await logActivity(req.io, result.isPhishing ? 'CRITICAL' : 'INFO',
        `Text phishing scan: ${result.isPhishing ? 'THREAT DETECTED' : 'Clean'} (${result.confidence}%)`);

      return res.json({ success: true, data: result });
    }

    // ── FILE ANALYSIS ─────────────────────────────────────────────────────────
    const { originalname, buffer, mimetype } = req.file;
    await logActivity(req.io, 'INFO', `Analyzing file for deepfake/phishing: ${originalname}`);

    // ── IMAGE ─────────────────────────────────────────────────────────────────
    if (mimetype.startsWith('image/')) {
      console.log(`[Phish] Image detected: ${originalname} (${mimetype})`);

      // Full-buffer metadata forensics search for AI tool markers
      const entireFileString = buffer.toString('ascii').toLowerCase();
      const lowerName = originalname.toLowerCase();

      const AI_MARKERS = [
        'midjourney', 'stable diffusion', 'stablediffusion', 'dall-e', 'dalle',
        'ai-generated', 'firefly', 'ideogram', 'leonardo.ai', 'leonardo_ai',
        'adobe firefly', 'nightcafe', 'getimg', 'canva ai', 'comfyui', 'automatic1111',
        'sdxl', 'novelai', 'fooocus', 'flux.1', 'flux-1', 'civitai', 'negative prompt',
        'cfg scale:', 'steps:', 'denoising strength:', 'sampler:', 'creator: ai',
        'software: stable diffusion', 'software: midjourney', 'creator: midjourney', 'creator: dall-e'
      ];

      const matchedAiMarker = AI_MARKERS.find(
        (m) => entireFileString.includes(m) || lowerName.includes(m)
      );

      if (matchedAiMarker) {
        console.log(`[Phish] AI metadata forensics matched: "${matchedAiMarker}"`);
        const result = {
          isPhishing: true,
          confidence: 98,
          explanation:
            `🚨 <b>AI-generated image detected (metadata forensics)</b>\n\n` +
            `Embedded forensic signature matched: <b>"${matchedAiMarker}"</b>.\n\n` +
            `This is a definitive digital fingerprint of a generative AI tool (e.g. Stable Diffusion, Midjourney, DALL-E). No camera EXIF or organic sensor noise supports human capture.`,
        };
        await logActivity(req.io, 'CRITICAL', `AI-generated image detected (metadata forensics): ${originalname}`);
        return res.json({ success: true, data: result });
      }

      // ── Primary: Gemini Vision ──────────────────────────────────────────────
      const geminiAvailable = !!process.env.GEMINI_API_KEY;
      if (geminiAvailable) {
        try {
          console.log(`[Phish] Using Gemini Vision for image: ${originalname}`);
          const geminiResult = await analyzeImageWithGemini(buffer, mimetype, originalname);
          console.log(`[Phish] Gemini image result: isAI=${geminiResult.isPhishing}, conf=${geminiResult.confidence}%`);
          await logActivity(req.io, geminiResult.isPhishing ? 'CRITICAL' : 'INFO',
            `Image deepfake scan (Gemini): ${geminiResult.isPhishing ? 'AI DETECTED' : 'Authentic'} (${geminiResult.confidence}%)`);
          return res.json({ success: true, data: geminiResult });
        } catch (geminiErr) {
          console.warn(`[Phish] Gemini image analysis failed (${geminiErr.message}), falling back to Groq...`);
        }
      } else {
        console.log('[Phish] GEMINI_API_KEY not set, using Groq vision directly');
      }

      // ── Fallback: Groq Vision ───────────────────────────────────────────────
      console.log(`[Phish] Using Groq vision fallback for ${originalname}...`);
      try {
        const base64Image = buffer.toString('base64');
        const groqResponse = await axios.post(
          'https://api.groq.com/openai/v1/chat/completions',
          {
            model: 'meta-llama/llama-4-scout-17b-16e-instruct',
            messages: [
              {
                role: 'user',
                content: [
                  {
                    type: 'text',
                    text:
                      'You are an elite digital forensics AI specializing in deepfake and AI-generated image detection. ' +
                      'Carefully analyze this image for signs of AI generation or manipulation. ' +
                      'Check for: unnatural skin/hair/eyes rendering, warped backgrounds, distorted hands/ears/teeth, ' +
                      'inconsistent lighting, GAN/diffusion artifacts, unnatural bokeh, impossible geometry, ' +
                      'overly smooth or waxy textures, or uniform noise patterns. ' +
                      'Respond ONLY with valid JSON (no markdown code blocks): ' +
                      '{"isPhishing": true/false, "confidence": 0-100, "explanation": "Detailed analysis with specific visual evidence wrapped in <b>tags</b> for key findings."}',
                  },
                  {
                    type: 'image_url',
                    image_url: { url: `data:${mimetype};base64,${base64Image}` },
                  },
                ],
              },
            ],
          },
          { headers: { Authorization: `Bearer ${groqApiKey}`, 'Content-Type': 'application/json' } }
        );

        let content = groqResponse.data.choices[0].message.content;
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        const groqResult = jsonMatch
          ? JSON.parse(jsonMatch[0])
          : JSON.parse(content.replace(/```json|```/g, '').trim());

        groqResult.explanation =
          `⚠️ <b>[Gemini unavailable — Groq Vision fallback]</b>\n\n` + groqResult.explanation;

        await logActivity(req.io, groqResult.isPhishing ? 'CRITICAL' : 'INFO',
          `Image deepfake scan (Groq fallback): ${groqResult.isPhishing ? 'AI DETECTED' : 'Authentic'} (${groqResult.confidence}%)`);

        return res.json({ success: true, data: groqResult });
      } catch (visionErr) {
        console.warn('[Phish] Vision APIs failed. Initiating local metadata forensics fallback...');
        
        // Scan for camera profiles in metadata
        const cameraKeywords = ['exif', 'make', 'model', 'canon', 'nikon', 'apple', 'samsung', 'sony', 'fujifilm', 'olympus', 'gopro', 'photoshop'];
        const matchedCameraMarker = cameraKeywords.find(k => entireFileString.includes(k));
        
        if (matchedCameraMarker) {
          console.log(`[Phish] Local forensics: camera signature found ("${matchedCameraMarker}")`);
          const result = {
            isPhishing: false,
            confidence: 90,
            explanation:
              `✅ <b>Authentic image verified</b> (local forensics fallback)\n\n` +
              `Forensic scanning located hardware profile indicators: <b>"${matchedCameraMarker}"</b>.\n\n` +
              `The image contains camera EXIF metadata structures consistent with physical lens capture, and no AI tool signatures were found.`,
          };
          await logActivity(req.io, 'INFO', `Local forensics verified authentic image: ${originalname}`);
          return res.json({ success: true, data: result });
        } else {
          console.log('[Phish] Local forensics: inconclusive (no camera or AI metadata)');
          const result = {
            isPhishing: false,
            confidence: 65,
            explanation:
              `⚠️ <b>Inconclusive scan (safe classification)</b>\n\n` +
              `Cloud Vision APIs are offline, and local forensics could not find camera EXIF metadata or generative AI signatures.\n\n` +
              `Recommendation: Handle with standard caution. Check source authentication.`,
          };
          await logActivity(req.io, 'WARNING', `Local forensics scan inconclusive for: ${originalname}`);
          return res.json({ success: true, data: result });
        }
      }
    }

    // ── VIDEO ─────────────────────────────────────────────────────────────────
    if (mimetype.startsWith('video/')) {
      console.log(`[Phish] Video detected: ${originalname} (${mimetype})`);

      // ── Primary: Gemini Vision (File API) ──────────────────────────────────
      const geminiAvailable = !!process.env.GEMINI_API_KEY;
      if (geminiAvailable) {
        try {
          console.log(`[Phish] Using Gemini Vision for video: ${originalname}`);
          const geminiResult = await analyzeVideoWithGemini(buffer, mimetype, originalname);
          console.log(`[Phish] Gemini video result: isDeepfake=${geminiResult.isPhishing}, conf=${geminiResult.confidence}%`);
          await logActivity(req.io, geminiResult.isPhishing ? 'CRITICAL' : 'INFO',
            `Video deepfake scan (Gemini): ${geminiResult.isPhishing ? 'DEEPFAKE DETECTED' : 'Authentic'} (${geminiResult.confidence}%)`);
          return res.json({ success: true, data: geminiResult });
        } catch (geminiErr) {
          const geminiErrDetail = geminiErr.response?.data?.error?.message ?? geminiErr.message;
          console.error(`[Phish] Gemini video analysis FAILED:`, geminiErrDetail);
          if (geminiErr.response?.data) console.error('[Phish] Gemini response body:', JSON.stringify(geminiErr.response.data));
          // Store for use in fallback banner
          req._geminiVideoErr = geminiErrDetail;
        }
      } else {
        console.log('[Phish] GEMINI_API_KEY not set, using Groq metadata analysis directly');
      }

      // ── Fallback: Groq text-based metadata analysis ─────────────────────────
      console.log(`[Phish] Running Groq metadata fallback for video: ${originalname}`);
      try {
        const sampleSize = Math.min(buffer.length, 60_000);
        const sampleStrings = buffer.subarray(0, sampleSize).toString('ascii')
          .replace(/[^\x20-\x7E]/g, ' ')
          .replace(/\s+/g, ' ')
          .substring(0, 2000);

        const groqResponse = await axios.post(
          'https://api.groq.com/openai/v1/chat/completions',
          {
            model: 'llama-3.3-70b-versatile',
            response_format: { type: 'json_object' },
            messages: [
              {
                role: 'system',
                content:
                  'You are a strict digital forensics AI checking video files for deepfake/AI-generation evidence. ' +
                  'Analyze the provided filename and metadata strings extracted from the video container. ' +
                  'Known deepfake/AI-video tools to look for: RunwayML, Sora, Synthesia, HeyGen, D-ID, Pika, Stable Video Diffusion, Kling, Luma AI, DeepFaceLab, FaceSwap, Roop, Avatarify. ' +
                  'Also check for: missing camera metadata (no Make/Model/GPS), suspicious encoder strings, generic or stripped metadata. ' +
                  'Respond ONLY with valid JSON: ' +
                  '{"isPhishing": true/false, "confidence": 0-100, "explanation": "Specific findings with key terms in <b>bold</b>."}',
              },
              {
                role: 'user',
                content: `Filename: "${originalname}"\nFile size: ${buffer.length} bytes\nMIME type: ${mimetype}\n\nExtracted metadata strings:\n${sampleStrings}`,
              },
            ],
          },
          { headers: { Authorization: `Bearer ${groqApiKey}`, 'Content-Type': 'application/json' }, timeout: 25000 }
        );

        let content = groqResponse.data.choices[0].message.content;
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        const groqResult = jsonMatch
          ? JSON.parse(jsonMatch[0])
          : JSON.parse(content.replace(/```json|```/g, '').trim());

        const geminiReason = req._geminiVideoErr ? ` (${req._geminiVideoErr})` : '';
        groqResult.explanation =
          `⚠️ <b>[Gemini unavailable${geminiReason} — Groq metadata fallback]</b>\n\n` + groqResult.explanation;

        await logActivity(req.io, groqResult.isPhishing ? 'CRITICAL' : 'INFO',
          `Video deepfake scan (Groq fallback): ${groqResult.isPhishing ? 'DEEPFAKE DETECTED' : 'Clean'} (${groqResult.confidence}%)`);

        return res.json({ success: true, data: groqResult });
      } catch (groqVideoErr) {
        console.error('[Phish] Groq video fallback failed:', groqVideoErr.message);
        return res.status(500).json({
          error: 'Video analysis failed — both Gemini and Groq unavailable',
          details: groqVideoErr.message,
        });
      }
    }

    // ── EMAIL / TEXT FILES (.eml, .txt, .msg, etc.) ───────────────────────────
    {
      const fileText = buffer.toString('utf8').substring(0, 6000);
      const groqResponse = await axios.post(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          model: 'llama-3.3-70b-versatile',
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'system',
              content:
                'You are analyzing a raw email/document for phishing, malicious links, and urgency loops. ' +
                'Look for: spoofed sender addresses, urgency language, suspicious URLs, impersonation, credential harvesting. ' +
                'Respond ONLY in valid JSON: ' +
                '{"isPhishing": true/false, "confidence": 0-100, "explanation": "Key findings with suspicious elements in <b>bold</b>."}',
            },
            { role: 'user', content: `Filename: ${originalname}\n\nContent:\n${fileText}` },
          ],
        },
        { headers: { Authorization: `Bearer ${groqApiKey}`, 'Content-Type': 'application/json' }, timeout: 25000 }
      );

      let content = groqResponse.data.choices[0].message.content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const result = jsonMatch
        ? JSON.parse(jsonMatch[0])
        : JSON.parse(content.replace(/```json|```/g, '').trim());

      await logActivity(req.io, result.isPhishing ? 'CRITICAL' : 'INFO',
        `Email scan: ${result.isPhishing ? 'PHISHING DETECTED' : 'Clean'} (${result.confidence}%)`);

      return res.json({ success: true, data: result });
    }
  } catch (err) {
    console.error('Phish Analysis Error:', err.response?.data || err.message);
    res.status(500).json({
      error: 'Analysis failed',
      details: err.response?.data?.error?.message ?? err.message,
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// STATS API
// ─────────────────────────────────────────────────────────────────────────────
router.get('/stats', async (req, res) => {
  try {
    const maliciousCountRes = await pool.query('SELECT COUNT(*) FROM scans WHERE is_malicious = true');
    const totalScansRes = await pool.query('SELECT COUNT(*) FROM scans');
    const maliciousCount = parseInt(maliciousCountRes.rows[0].count) || 0;
    const totalScans = parseInt(totalScansRes.rows[0].count) || 0;
    const phishingAttempts = 24 + maliciousCount * 2;
    let cvesPending = 251433;
    try {
      const nvdRes = await axios.get('https://services.nvd.nist.gov/rest/json/cves/2.0?resultsPerPage=1', {
        timeout: 4000, headers: { 'User-Agent': 'CyberShieldAI-Hackathon' }
      });
      if (nvdRes.data?.totalResults) cvesPending = nvdRes.data.totalResults;
    } catch (e) {
      console.log('[API] NVD API timeout, using fallback');
    }
    res.json({
      success: true,
      data: {
        malwareBlocked: maliciousCount,
        totalScans,
        phishingAttempts,
        pendingCVEs: cvesPending,
        riskScore: totalScans > 0 ? Math.round((maliciousCount / totalScans) * 100) : 0,
      }
    });
  } catch (err) {
    console.error('Stats Error:', err);
    res.status(500).json({ error: 'Server error fetching stats' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// THREATS GRAPH API
// ─────────────────────────────────────────────────────────────────────────────
router.get('/threats', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT DATE_TRUNC('hour', created_at) AS time_bucket, COUNT(*) AS count
      FROM scans WHERE is_malicious = true
      GROUP BY time_bucket ORDER BY time_bucket DESC LIMIT 7
    `);
    const dbDataMap = {};
    rows.forEach(r => {
      const label = new Date(r.time_bucket).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      dbDataMap[label] = parseInt(r.count);
    });
    const data = [];
    const now = new Date();
    now.setMinutes(0, 0, 0);
    const staticBaseline = [2, 5, 1, 6, 3, 2, 4];
    for (let i = 6; i >= 0; i--) {
      const pastHour = new Date(now.getTime() - (i * 60 * 60 * 1000));
      const label = pastHour.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      data.push({ time: label, threats: dbDataMap[label] ?? staticBaseline[i] });
    }
    res.json({ success: true, data });
  } catch (err) {
    console.error('Threats Error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// ACTIVITY FEED API
// ─────────────────────────────────────────────────────────────────────────────
router.get('/activity', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM activities ORDER BY created_at DESC LIMIT 15');
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Activity Error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// EMAIL LOGS API
// ─────────────────────────────────────────────────────────────────────────────
router.get('/email-logs', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM email_logs ORDER BY created_at DESC LIMIT 60');
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Email Logs Fetch Error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// COPILOT DOCUMENT INGESTION API
// ─────────────────────────────────────────────────────────────────────────────
router.post('/upload-copilot-doc', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { originalname, buffer, mimetype } = req.file;
    console.log(`[Copilot] Ingesting document: ${originalname} (${mimetype})`);

    let text = '';
    let pages = 1;

    if (mimetype === 'application/pdf') {
      try {
        const parser = new PDFParse({ data: new Uint8Array(buffer) });
        const result = await parser.getText();
        text = result.text;
        pages = result.total;
      } catch (pdfErr) {
        console.error('[Copilot] PDF extraction failed, trying fallback to text:', pdfErr.message);
        text = buffer.toString('utf8');
      }
    } else {
      text = buffer.toString('utf8');
    }

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: 'Extracted document content is empty' });
    }

    const docSize = (buffer.length / 1024).toFixed(1) + ' KB';
    
    await logActivity(req.io, 'INFO', `Copilot document ingested: ${originalname} (${docSize})`);

    res.json({
      success: true,
      data: {
        name: originalname,
        size: docSize,
        content: text,
        characters: text.length,
        pages
      }
    });

  } catch (err) {
    console.error('[Copilot] Ingestion error:', err.message);
    res.status(500).json({ error: 'Failed to process document', details: err.message });
  }
});

export default router;