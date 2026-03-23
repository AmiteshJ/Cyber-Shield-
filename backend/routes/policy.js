import express from 'express';
import multer from 'multer';
import axios from 'axios';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { PdfReader } = require('pdfreader');

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }
});

const GROQ_API_KEY = process.env.GROQ_API_KEY;

let currentPolicy = null;
let currentPolicyName = null;

const parsePDF = (buffer) => {
  return new Promise((resolve, reject) => {
    const reader = new PdfReader();
    let text = '';
    
    reader.parseBuffer(buffer, (err, item) => {
      if (err) {
        reject(err);
      } else if (!item) {
        resolve(text);
      } else if (item.text) {
        text += item.text + ' ';
      }
    });
  });
};

router.post('/upload-policy', upload.single('policy'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log(`Parsing policy document: ${req.file.originalname}`);

    const text = await parsePDF(req.file.buffer);

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: 'Could not extract text from PDF' });
    }

    currentPolicy = text;
    currentPolicyName = req.file.originalname;

    console.log(`Policy loaded: ${text.length} characters`);

    res.json({
      success: true,
      data: {
        filename: req.file.originalname,
        pages: 'N/A',
        characters: text.length,
        preview: text.substring(0, 200) + '...'
      }
    });

  } catch (err) {
    console.error('Policy upload error:', err.message);
    res.status(500).json({ 
      error: 'Failed to parse PDF',
      details: err.message 
    });
  }
});

router.post('/ask-policy', async (req, res) => {
  try {
    const { question } = req.body;

    if (!question) {
      return res.status(400).json({ error: 'No question provided' });
    }

    if (!currentPolicy) {
      return res.status(400).json({ error: 'No policy document uploaded yet' });
    }

    console.log(`Question asked: ${question}`);

    const policyText = currentPolicy.substring(0, 8000);

    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama-3.3-70b-versatile',
        max_tokens: 1024,
        temperature: 0.3,
        messages: [
          {
            role: 'system',
            content: `You are a cybersecurity policy expert assistant.
You have been given a security policy document to analyze.
Answer questions ONLY based on what is in the policy document.
If the answer is not in the document, say "This is not covered in the provided policy document."
Always mention which section or part of the policy your answer comes from.
Be specific and precise.`
          },
          {
            role: 'user',
            content: `Here is the security policy document:

---POLICY DOCUMENT START---
${policyText}
---POLICY DOCUMENT END---

Question: ${question}

Please answer based on the policy document above.`
          }
        ]
      },
      {
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const answer = response.data.choices[0].message.content;

    res.json({
      success: true,
      data: {
        question,
        answer,
        policyName: currentPolicyName
      }
    });

  } catch (err) {
    console.error('Policy question error:', err.message);
    res.status(500).json({ 
      error: 'Failed to answer question',
      details: err.message 
    });
  }
});

router.get('/policy-status', (req, res) => {
  res.json({
    success: true,
    data: {
      loaded: currentPolicy !== null,
      filename: currentPolicyName,
      characters: currentPolicy?.length || 0
    }
  });
});

export default router;