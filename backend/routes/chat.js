import express from 'express';
import axios from 'axios';

const router = express.Router();
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

router.post('/chat', async (req, res) => {
  try {
    const { model, messages, max_tokens, temperature, stream } = req.body;
    
    const groqApiKey = process.env.GROQ_API_KEY;
    if (!groqApiKey) {
      return res.status(500).json({ error: 'Groq API key not configured' });
    }

    if (stream) {
      const groqResponse = await axios({
        method: 'post',
        url: GROQ_API_URL,
        data: { model, messages, max_tokens, temperature, stream },
        headers: {
          'Authorization': `Bearer ${groqApiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream'
        },
        responseType: 'stream'
      });

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      groqResponse.data.pipe(res);
      
      req.on('close', () => {
        if (groqResponse.data && typeof groqResponse.data.destroy === 'function') {
          groqResponse.data.destroy();
        }
      });
    } else {
      const groqResponse = await axios.post(GROQ_API_URL, {
        model, messages, max_tokens, temperature, stream
      }, {
        headers: {
          'Authorization': `Bearer ${groqApiKey}`,
          'Content-Type': 'application/json'
        }
      });
      res.json(groqResponse.data);
    }
  } catch (err) {
    console.error('Chat API Error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Chat API failed', details: err.response?.data?.error?.message || err.message });
  }
});

export default router;
