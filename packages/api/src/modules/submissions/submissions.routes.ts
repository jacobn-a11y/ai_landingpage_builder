import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { prisma } from '../../shared/db.js';
import { requireAuth, requireMinRole } from '../auth/auth.middleware.js';
import { requireWorkspace } from '../workspace/workspace.middleware.js';
import { validateAndNormalizePayload } from './submissions.service.js';

export const submissionsRouter = Router();

const readMiddleware = [requireAuth, requireWorkspace, requireMinRole('Editor')];

// Rate limit: 10 req/min per IP for public POST
const postRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Too many submissions. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// POST /api/v1/submissions - PUBLIC (form submit from published pages)
submissionsRouter.post('/', postRateLimiter, async (req: Request, res: Response) => {
  try {
    const body = req.body ?? {};
    const query = req.query;

    // Merge UTM from query or body (client sends from cookie/localStorage)
    const utmFromQuery = {
      utm_source: query.utm_source as string | undefined,
      utm_medium: query.utm_medium as string | undefined,
      utm_campaign: query.utm_campaign as string | undefined,
      utm_term: query.utm_term as string | undefined,
      utm_content: query.utm_content as string | undefined,
    };
    const merged = { ...body, ...utmFromQuery };

    const result = await validateAndNormalizePayload(merged);
    if (!result.ok) {
      res.status(400).json({ error: result.error });
      return;
    }

    const payload = result.payload!;
    const page = result.page!;

    const submission = await prisma.submission.create({
      data: {
        workspaceId: page.workspaceId,
        pageId: page.id,
        payloadJson: payload as object,
        deliveryStatus: 'pending',
        deliveryAttempts: [],
      },
    });

    // Queue Zapier delivery (Phase 1 - sync for now, can be async later)
    const { queueZapierDelivery } = await import('./submissions.delivery.js');
    queueZapierDelivery(submission.id).catch((err) => {
      console.error('[submissions] Zapier delivery failed:', err);
    });

    const formConfig = (page.publishConfig as { form?: { successBehavior?: string; redirectUrl?: string } })?.form;
    const successBehavior = formConfig?.successBehavior ?? 'inline';
    const redirectUrl = formConfig?.redirectUrl;

    if (successBehavior === 'redirect' && redirectUrl) {
      res.redirect(302, redirectUrl);
      return;
    }

    res.status(200).json({ success: true });
  } catch (err) {
    console.error('[submissions] POST error:', err);
    res.status(500).json({ error: 'Submission failed. Please try again.' });
  }
});

// GET /api/v1/submissions - list (authenticated, Editor+)
submissionsRouter.get('/', ...readMiddleware, async (req: Request, res: Response) => {
  const workspaceId = req.session!.workspaceId!;
  const pageId = req.query.pageId as string | undefined;

  const where: { workspaceId: string; pageId?: string } = { workspaceId };
  if (pageId) where.pageId = pageId;

  const submissions = await prisma.submission.findMany({
    where,
    include: { page: { select: { id: true, name: true, slug: true } } },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  res.json({ submissions });
});

// GET /api/v1/submissions/:id - single submission
submissionsRouter.get('/:id', ...readMiddleware, async (req: Request, res: Response) => {
  const workspaceId = req.session!.workspaceId!;
  const { id } = req.params;

  const submission = await prisma.submission.findFirst({
    where: { id, workspaceId },
    include: { page: { select: { id: true, name: true, slug: true } } },
  });

  if (!submission) {
    res.status(404).json({ error: 'Submission not found' });
    return;
  }

  res.json({ submission });
});
