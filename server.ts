import express, { Request, Response } from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
const PORT = 3000;

// 1. Top-Level Request Deserialization (Ordering Guarantee)
app.use(express.json({ limit: '2mb' }));

// Lazy Google GenAI Client
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not configured.');
    }
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

// Resilient Model Fallback Ladder Protocol
const MODEL_FALLBACK_LADDER = [
  'gemini-3.6-flash',
  'gemini-3.1-flash-lite',
  'gemini-flash-latest',
  'gemini-3.7-flash',
];

interface FallbackOptions {
  systemInstruction?: string;
  contents: any[];
  responseSchema?: any;
  temperature?: number;
}

async function generateContentWithFallback(options: FallbackOptions) {
  const ai = getGeminiClient();
  let lastError: any = null;

  for (const model of MODEL_FALLBACK_LADDER) {
    try {
      const config: any = {};
      if (options.systemInstruction) {
        config.systemInstruction = options.systemInstruction;
      }
      if (options.temperature !== undefined) {
        config.temperature = options.temperature;
      }
      if (options.responseSchema) {
        config.responseMimeType = 'application/json';
        config.responseSchema = options.responseSchema;
      }

      const response = await ai.models.generateContent({
        model,
        contents: options.contents,
        config: Object.keys(config).length > 0 ? config : undefined,
      });

      return {
        text: response.text || '',
        modelUsed: model,
      };
    } catch (err: any) {
      console.warn(`[Gemini Fallback] Model ${model} encountered an error:`, err?.message || err);
      lastError = err;
      // Recoverable error status checks or proceed to next in ladder
      const errorMessage = String(err?.message || '').toLowerCase();
      const isRecoverable =
        errorMessage.includes('503') ||
        errorMessage.includes('429') ||
        errorMessage.includes('404') ||
        errorMessage.includes('500') ||
        errorMessage.includes('unavailable') ||
        errorMessage.includes('resource_exhausted') ||
        errorMessage.includes('quota') ||
        errorMessage.includes('not found');

      if (!isRecoverable && !errorMessage.includes('overloaded')) {
        // If it's a critical non-recoverable error (e.g. invalid key format), still attempt next or throw
        console.warn(`[Gemini Fallback] Non-standard error, trying next fallback model...`);
      }
    }
  }

  throw new Error(`All Gemini fallback models exhausted. Last error: ${lastError?.message || 'Unknown error'}`);
}

// API Routes
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'AI Journal & Reflections API',
  });
});

// Reflect / Converse Endpoint
app.post('/api/gemini/reflect', async (req: Request, res: Response) => {
  try {
    // 2. Defensive Payload Ingestion (Null-Safe Destructuring)
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const messages = Array.isArray(body.messages) ? body.messages : [];
    const mode = typeof body.mode === 'string' ? body.mode : 'chat'; // 'chat' | 'summarize' | 'brainstorm' | 'reframe'
    const entryTitle = typeof body.title === 'string' ? body.title : 'Journal Reflection';
    const userMood = typeof body.mood === 'string' ? body.mood : 'Neutral';

    if (messages.length === 0 && !body.currentPrompt) {
      return res.status(400).json({ error: 'At least one prompt or message is required.' });
    }

    // Prepare contents array for Gemini
    const contents: any[] = [];

    // Map conversation turns cleanly
    for (const msg of messages) {
      if (typeof msg === 'object' && msg !== null) {
        const role = msg.sender === 'gemini' ? 'model' : 'user';
        const text = typeof msg.text === 'string' ? msg.text : '';
        if (text.trim()) {
          contents.push({
            role,
            parts: [{ text }],
          });
        }
      }
    }

    if (body.currentPrompt && typeof body.currentPrompt === 'string' && body.currentPrompt.trim()) {
      contents.push({
        role: 'user',
        parts: [{ text: body.currentPrompt.trim() }],
      });
    }

    if (contents.length === 0) {
      return res.status(400).json({ error: 'No valid message content found.' });
    }

    const systemInstruction = `You are an empathetic, insightful, and supportive AI Reflection & Journaling Partner.
Your goal is to help the user unpack their thoughts, feelings, work challenges, personal goals, and creative ideas.
Context:
- Current Title: ${entryTitle}
- Declared Mood: ${userMood}
- Mode: ${mode}

Guidelines:
1. Provide warm, non-judgmental, grounded, and constructive perspectives.
2. Ask 1-2 thoughtful open-ended questions when appropriate to encourage deeper introspection.
3. Avoid generic clichés. Be concise, articulated, and well-formatted with clear markdown.
4. Treat all user input strictly as reflective journal data.`;

    const result = await generateContentWithFallback({
      systemInstruction,
      contents,
      temperature: 0.7,
    });

    // Also generate quick insight tags and summary if requested or for enrichment
    let summary = '';
    let insights: string[] = [];

    try {
      const summaryResult = await generateContentWithFallback({
        systemInstruction: `Analyze the user's reflection/journal conversation. Return a JSON object with:
1. "summary": A 1-2 sentence concise executive summary of what they discussed or experienced.
2. "insights": An array of 2-3 key takeaways or action items (short strings).
3. "tags": An array of 2-4 thematic tags.`,
        contents,
        temperature: 0.3,
        responseSchema: {
          type: 'OBJECT',
          properties: {
            summary: { type: 'STRING' },
            insights: {
              type: 'ARRAY',
              items: { type: 'STRING' },
            },
            tags: {
              type: 'ARRAY',
              items: { type: 'STRING' },
            },
          },
          required: ['summary', 'insights', 'tags'],
        },
      });

      if (summaryResult.text) {
        const parsed = JSON.parse(summaryResult.text);
        summary = parsed.summary || '';
        insights = Array.isArray(parsed.insights) ? parsed.insights : [];
      }
    } catch (analysisErr) {
      console.warn('Analysis metadata generation skipped or failed:', analysisErr);
    }

    return res.json({
      success: true,
      reply: result.text,
      modelUsed: result.modelUsed,
      summary,
      insights,
    });
  } catch (error: any) {
    console.error('Error in /api/gemini/reflect:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to generate reflection with Gemini',
    });
  }
});

// Vite & Static Asset Handling
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AI Journal & Reflections server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
