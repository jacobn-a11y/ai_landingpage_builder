/**
 * AI chat routes — SSE streaming endpoint for the AI editor assistant.
 */

import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { requireAuth, requireMinRole } from '../auth/auth.middleware.js';
import { requireWorkspace } from '../workspace/workspace.middleware.js';
import { aiService } from './ai.service.js';
import type { ChatRequest } from './ai.types.js';

export const aiRouter = Router();

// -------------------------------------------------------------------------
// Rate limiting: 30 requests per minute per user
// -------------------------------------------------------------------------

const aiRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  keyGenerator: (req: Request) => {
    return req.session?.userId ?? req.ip ?? 'anonymous';
  },
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many AI requests. Please wait a moment and try again.' },
});

// -------------------------------------------------------------------------
// Middleware stack
// -------------------------------------------------------------------------

const middleware = [requireAuth, requireWorkspace, requireMinRole('Editor'), aiRateLimit];

// -------------------------------------------------------------------------
// POST /chat — main AI chat endpoint (SSE streaming)
// -------------------------------------------------------------------------

aiRouter.post('/chat', ...middleware, async (req: Request, res: Response) => {
  const body = req.body as ChatRequest;

  // Validate required fields
  if (!body.message || typeof body.message !== 'string') {
    res.status(400).json({ error: 'message is required and must be a string' });
    return;
  }

  if (!body.pageContext || typeof body.pageContext !== 'object') {
    res.status(400).json({ error: 'pageContext is required' });
    return;
  }

  if (!body.sectionMap || !Array.isArray(body.sectionMap)) {
    res.status(400).json({ error: 'sectionMap is required and must be an array' });
    return;
  }

  // Enforce message length limit
  if (body.message.length > 2000) {
    res.status(400).json({ error: 'message must be 2000 characters or fewer' });
    return;
  }

  // Limit conversation history
  const conversationHistory = (body.conversationHistory ?? []).slice(-20);

  // Set up SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
  res.flushHeaders();

  try {
    const stream = aiService.chat({
      message: body.message,
      pageContext: body.pageContext,
      sectionMap: body.sectionMap,
      conversationHistory,
      selectedBlockId: body.selectedBlockId,
    });

    for await (const chunk of stream) {
      if (res.closed) break;

      if (chunk.type === 'text') {
        res.write(`event: text\ndata: ${JSON.stringify({ text: chunk.data })}\n\n`);
      } else if (chunk.type === 'mutations') {
        res.write(`event: mutations\ndata: ${JSON.stringify({ mutations: chunk.data })}\n\n`);
      }
    }

    // Signal end of stream
    if (!res.closed) {
      res.write(`event: done\ndata: {}\n\n`);
      res.end();
    }
  } catch (err) {
    console.error('[ai] Chat stream error:', err);

    if (!res.headersSent) {
      res.status(500).json({ error: 'AI service error' });
      return;
    }

    // If headers already sent (SSE in progress), send error event
    if (!res.closed) {
      const message = err instanceof Error ? err.message : 'Internal error';
      res.write(`event: error\ndata: ${JSON.stringify({ error: message })}\n\n`);
      res.end();
    }
  }
});

// -------------------------------------------------------------------------
// POST /analyze-file — file upload analysis (stub)
// -------------------------------------------------------------------------

aiRouter.post('/analyze-file', ...middleware, async (_req: Request, res: Response) => {
  res.status(501).json({ error: 'File analysis is not yet implemented' });
});
