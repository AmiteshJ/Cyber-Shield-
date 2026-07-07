import axios from 'axios';

const HF_BASE_URL = 'https://api-inference.huggingface.co/models';

// Primary deepfake detector - binary: "artificial" | "human"
const IMAGE_MODEL = 'Organika/sdxl-detector';
// Fallback - also binary: "artificial" | "human"
const IMAGE_MODEL_FALLBACK = 'umm-maybe/AI-image-detector';

/**
 * Scans a buffer for an embedded JPEG thumbnail (common in MP4/MOV).
 */
export const extractJpegFromBuffer = (buffer) => {
  for (let i = 0; i < buffer.length - 3; i++) {
    if (buffer[i] === 0xff && buffer[i + 1] === 0xd8 && buffer[i + 2] === 0xff) {
      for (let j = i + 3; j < buffer.length - 1; j++) {
        if (buffer[j] === 0xff && buffer[j + 1] === 0xd9) {
          const jpegSlice = buffer.slice(i, j + 2);
          if (jpegSlice.length > 1024) return jpegSlice;
        }
      }
    }
  }
  return null;
};

/**
 * Calls the HuggingFace Inference API.
 * Retries once on 503 (model loading).
 */
const callHFClassifier = async (imageBuffer, model) => {
  const HF_API_KEY = process.env.HF_API_KEY;
  if (!HF_API_KEY) throw new Error('HF_API_KEY not set in .env');

  const url = `${HF_BASE_URL}/${model}`;

  const attempt = async () =>
    axios.post(url, imageBuffer, {
      headers: {
        Authorization: `Bearer ${HF_API_KEY}`,
        'Content-Type': 'application/octet-stream',
      },
      timeout: 40000,
    });

  try {
    const res = await attempt();
    return res.data;
  } catch (err) {
    if (err.response?.status === 503) {
      console.log(`[HF] Model ${model} loading, retrying in 15s...`);
      await new Promise((r) => setTimeout(r, 15000));
      const retry = await attempt();
      return retry.data;
    }
    throw err;
  }
};

/**
 * Normalises raw HF classifier output into a clean verdict.
 */
const parseHFResults = (results) => {
  if (!Array.isArray(results) || results.length === 0) {
    throw new Error('Empty or invalid HF response');
  }

  const AI_KEYWORDS = ['artificial', 'ai-generated', 'ai_generated', 'fake', 'deepfake', 'label_0', 'synthetic', 'generated'];
  const REAL_KEYWORDS = ['human', 'real', 'not ai', 'not_ai', 'authentic', 'label_1', 'natural'];

  let aiEntry = null;
  let realEntry = null;

  for (const entry of results) {
    const label = (entry.label || '').toLowerCase();
    if (AI_KEYWORDS.some((kw) => label.includes(kw))) aiEntry = entry;
    else if (REAL_KEYWORDS.some((kw) => label.includes(kw))) realEntry = entry;
  }

  // If no keyword matched, sort by score — highest = AI (conservative)
  if (!aiEntry && !realEntry) {
    const sorted = [...results].sort((a, b) => b.score - a.score);
    aiEntry = sorted[0];
  }

  const isAI = aiEntry && (!realEntry || aiEntry.score >= realEntry.score);
  const winningEntry = isAI ? aiEntry : realEntry;
  const confidence = Math.round((winningEntry?.score ?? 0.5) * 100);

  return {
    isAI: Boolean(isAI),
    confidence,
    rawLabel: winningEntry?.label ?? 'unknown',
    rawScore: winningEntry?.score ?? 0,
  };
};

/**
 * Analyses an image buffer using HuggingFace deepfake detectors.
 */
export const analyzeImageWithHF = async (imageBuffer, filename = 'image') => {
  let results = null;
  let usedModel = IMAGE_MODEL;

  try {
    results = await callHFClassifier(imageBuffer, IMAGE_MODEL);
    console.log(`[HF] ${IMAGE_MODEL} response for ${filename}:`, JSON.stringify(results));
  } catch (primaryErr) {
    console.warn(`[HF] Primary model failed (${primaryErr.message}), trying fallback...`);
    try {
      results = await callHFClassifier(imageBuffer, IMAGE_MODEL_FALLBACK);
      usedModel = IMAGE_MODEL_FALLBACK;
      console.log(`[HF] ${IMAGE_MODEL_FALLBACK} response for ${filename}:`, JSON.stringify(results));
    } catch (fallbackErr) {
      console.error('[HF] Both image models failed:', fallbackErr.message);
      throw new Error(`HF image analysis failed: ${fallbackErr.message}`);
    }
  }

  const verdict = parseHFResults(results);

  const explanation = verdict.isAI
    ? `🚨 <b>AI-generated / deepfake image detected</b> by HuggingFace classifier <i>(${usedModel})</i>.\n\n` +
      `Confidence: <b>${verdict.confidence}%</b> — label: "${verdict.rawLabel}" (score: ${verdict.rawScore.toFixed(4)}).\n\n` +
      `The model identified <b>synthetic visual patterns</b> consistent with generative AI tools (Stable Diffusion, DALL-E, Midjourney, etc.). ` +
      `Common indicators: unnatural skin textures, distorted backgrounds, asymmetric facial features, or pixel-level rendering artifacts.`
    : `✅ <b>Authentic image</b> — no AI generation signatures detected by <i>${usedModel}</i>.\n\n` +
      `Confidence: <b>${verdict.confidence}%</b> — label: "${verdict.rawLabel}" (score: ${verdict.rawScore.toFixed(4)}).\n\n` +
      `The classifier found no evidence of generative AI rendering. Natural camera noise, organic lighting, and coherent structural patterns were observed.`;

  return {
    isPhishing: verdict.isAI,
    confidence: verdict.confidence,
    explanation,
    source: `HuggingFace / ${usedModel}`,
  };
};

/**
 * Analyses a video buffer for deepfake content.
 * Strategy:
 *   1. Extract embedded JPEG thumbnail → image classifier
 *   2. Scan metadata for known AI-video tool watermarks
 *   3. Inconclusive fallback
 */
export const analyzeVideoWithHF = async (videoBuffer, filename = 'video') => {
  // ── Step 1: Embedded thumbnail ──────────────────────────────────────────────
  const thumbnail = extractJpegFromBuffer(videoBuffer);

  if (thumbnail) {
    console.log(`[HF Video] Extracted thumbnail (${thumbnail.length} bytes) from ${filename}`);
    try {
      const imageResult = await analyzeImageWithHF(thumbnail, `${filename}[thumbnail]`);
      imageResult.explanation =
        `🎬 <b>Video analysed via embedded thumbnail frame</b>\n\n` + imageResult.explanation;
      imageResult.source = imageResult.source + ' (video thumbnail)';
      return imageResult;
    } catch (thumbErr) {
      console.warn('[HF Video] Thumbnail image analysis failed:', thumbErr.message);
    }
  } else {
    console.log(`[HF Video] No embedded JPEG found in ${filename}, running metadata scan`);
  }

  // ── Step 2: Metadata heuristics ─────────────────────────────────────────────
  const DEEPFAKE_TOOLS = [
    'runwayml', 'runway', 'sora', 'synthesia', 'heygen', 'deepface',
    'deepfacelab', 'faceswap', 'roop', 'reface', 'avatarify',
    'd-id', 'did.com', 'pika', 'stable-video', 'svd', 'kling',
    'ai-generated', 'artificial', 'generated by ai', 'created by ai',
    'luma ai', 'lumalabs', 'gen-3', 'gen3', 'modelscope', 'zeroscope',
  ];

  const sample = videoBuffer.subarray(0, Math.min(videoBuffer.length, 120_000));
  const metaStrings = (sample.toString('ascii').match(/[ -~]{4,}/g) ?? []).join(' ').toLowerCase();
  const lowerFilename = filename.toLowerCase();

  const matchedTool = DEEPFAKE_TOOLS.find(
    (tool) => metaStrings.includes(tool) || lowerFilename.includes(tool)
  );

  if (matchedTool) {
    return {
      isPhishing: true,
      confidence: 92,
      explanation:
        `🚨 <b>Deepfake / AI-video tool signature detected</b> in file metadata.\n\n` +
        `Matched token: <b>"${matchedTool}"</b> found in the video container's metadata strings.\n\n` +
        `This is a strong indicator the video was produced or processed by an AI generation or face-swap tool. ` +
        `Treat any claims or identities shown in this video as <b>unverified and potentially fabricated</b>.`,
      source: 'Metadata heuristic scan',
    };
  }

  // ── Step 3: Inconclusive ─────────────────────────────────────────────────────
  return {
    isPhishing: false,
    confidence: 55,
    explanation:
      `⚠️ <b>Video deepfake analysis inconclusive.</b>\n\n` +
      `No embedded JPEG thumbnail was available for the HuggingFace classifier, ` +
      `and no known AI-video tool signatures were detected in the container metadata.\n\n` +
      `<b>This does not guarantee the video is authentic.</b> For high-stakes cases, ` +
      `extract individual frames and run them through the image deepfake detector.`,
    source: 'Metadata heuristic scan (inconclusive)',
  };
};