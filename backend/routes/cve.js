import express from 'express';
import axios from 'axios';

const router = express.Router();

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_API_KEY = process.env.VITE_GROQ_API_KEY;

router.post('/analyze-cves', async (req, res) => {
  try {
    const { cveText } = req.body;

    if (!cveText) {
      return res.status(400).json({ error: 'No CVE data provided' });
    }

    // Step 1: Extract CVE IDs from user input
    const cvePattern = /CVE-\d{4}-\d{4,}/gi;
    const cveIds = cveText.match(cvePattern) || [];

    let cveData = [];

    // Step 2: Fetch real data from NVD database for each CVE
    for (const cveId of cveIds.slice(0, 5)) {
      try {
        console.log(`Fetching data for ${cveId}...`);
        
        const response = await axios.get(
          `https://services.nvd.nist.gov/rest/json/cves/2.0?cveId=${cveId}`,
          { 
            timeout: 8000,
            headers: { 'User-Agent': 'CyberShieldAI' }
          }
        );

        if (response.data.vulnerabilities?.length > 0) {
          const vuln = response.data.vulnerabilities[0].cve;
          
          // Get CVSS score (try v3 first, then v2)
          const score = 
            vuln.metrics?.cvssMetricV31?.[0]?.cvssData?.baseScore ||
            vuln.metrics?.cvssMetricV30?.[0]?.cvssData?.baseScore ||
            vuln.metrics?.cvssMetricV2?.[0]?.cvssData?.baseScore || 
            0;

          cveData.push({
            id: cveId,
            description: vuln.descriptions?.[0]?.value || 'No description available',
            score: score,
            published: vuln.published || 'Unknown'
          });
        }
      } catch (e) {
        console.log(`Could not fetch ${cveId}, adding with no data`);
        cveData.push({
          id: cveId,
          description: 'Could not fetch from NVD database',
          score: 0,
          published: 'Unknown'
        });
      }
    }

    // If user didnt enter CVE IDs, just analyze raw text
    if (cveData.length === 0) {
      cveData = [{
        id: 'CUSTOM',
        description: cveText,
        score: 0,
        published: 'Unknown'
      }];
    }

    // Step 3: Send to Groq AI for analysis and prioritization
    const groqResponse = await axios.post(
      GROQ_API_URL,
      {
        model: 'llama-3.3-70b-versatile',
        max_tokens: 2048,
        temperature: 0.3,
        messages: [
          {
            role: 'system',
            content: `You are a senior cybersecurity expert. 
            Analyze CVE vulnerabilities and respond ONLY with valid JSON.
            No extra text, no markdown, just raw JSON.`
          },
          {
            role: 'user',
            content: `Analyze these vulnerabilities and return this exact JSON structure:
{
  "vulnerabilities": [
    {
      "id": "CVE-ID here",
      "title": "Short 5 word title",
      "severity": "Critical or High or Medium or Low",
      "score": 9.8,
      "type": "RCE or SQLi or XSS or DoS or Other",
      "action": "Specific fix in one sentence",
      "priority": 1,
      "explanation": "Explain this CVE in simple English in 2 sentences"
    }
  ],
  "overallRisk": "Critical or High or Medium or Low",
  "summary": "2 sentence overall assessment"
}

CVE Data to analyze:
${JSON.stringify(cveData, null, 2)}`
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

    // Step 4: Parse and return the result
    const content = groqResponse.data.choices[0].message.content;
    
    // Clean the response in case AI adds extra text
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('AI returned invalid format');
    }
    
    const result = JSON.parse(jsonMatch[0]);
    
    res.json({ 
      success: true, 
      data: result,
      cvesFetched: cveData.length
    });

  } catch (err) {
    console.error('CVE Analysis Error:', err.message);
    res.status(500).json({ 
      error: 'CVE analysis failed',
      details: err.message 
    });
  }
});

export default router;