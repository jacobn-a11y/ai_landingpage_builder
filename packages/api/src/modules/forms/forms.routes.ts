import { Router, Request, Response } from 'express';
import { prisma } from '../../shared/db.js';
import { requireAuth, requireMinRole } from '../auth/auth.middleware.js';
import { requireWorkspace } from '../workspace/workspace.middleware.js';
import { FORM_FIELD_TYPES } from './forms.types.js';

export const formsRouter = Router();

const readMiddleware = [requireAuth, requireWorkspace];
const writeMiddleware = [requireAuth, requireWorkspace, requireMinRole('Editor')];

function normalizeSchemaJson(schemaJson: unknown): { valid: boolean; schema: unknown } {
  let fields: unknown[] = [];
  if (Array.isArray(schemaJson)) {
    fields = schemaJson;
  } else if (schemaJson && typeof schemaJson === 'object' && 'fields' in schemaJson) {
    const obj = schemaJson as { fields?: unknown[] };
    fields = Array.isArray(obj.fields) ? obj.fields : [];
  }
  for (const field of fields) {
    if (!field || typeof field !== 'object') return { valid: false, schema: null };
    const f = field as Record<string, unknown>;
    if (typeof f.id !== 'string') return { valid: false, schema: null };
    if (!FORM_FIELD_TYPES.includes(f.type as (typeof FORM_FIELD_TYPES)[number])) return { valid: false, schema: null };
    if (f.options !== undefined && !Array.isArray(f.options)) return { valid: false, schema: null };
  }
  const schema = Array.isArray(schemaJson) ? schemaJson : schemaJson;
  return { valid: true, schema };
}

formsRouter.post('/', ...writeMiddleware, async (req: Request, res: Response) => {
  const workspaceId = req.session!.workspaceId!;
  const { name, schemaJson } = req.body;

  if (!name || typeof name !== 'string') {
    res.status(400).json({ error: 'name is required' });
    return;
  }

  const trimmed = name.trim();
  if (!trimmed) {
    res.status(400).json({ error: 'name cannot be empty' });
    return;
  }

  const { valid, schema } = normalizeSchemaJson(schemaJson ?? []);
  if (!valid) {
    res.status(400).json({
      error: 'schemaJson must be an array of { id, type, label?, required?, options? } or { fields: [], config?: {} }',
    });
    return;
  }

  const form = await prisma.form.create({
    data: {
      workspaceId,
      name: trimmed,
      schemaJson: schema as object,
    },
  });
  res.status(201).json({ form });
});

formsRouter.get('/', ...readMiddleware, async (req: Request, res: Response) => {
  const workspaceId = req.session!.workspaceId!;

  const forms = await prisma.form.findMany({
    where: { workspaceId },
    orderBy: { name: 'asc' },
  });
  res.json({ forms });
});

formsRouter.get('/:id', ...readMiddleware, async (req: Request, res: Response) => {
  const workspaceId = req.session!.workspaceId!;
  const { id } = req.params;

  const form = await prisma.form.findFirst({
    where: { id, workspaceId },
  });

  if (!form) {
    res.status(404).json({ error: 'Form not found' });
    return;
  }

  res.json({ form });
});

formsRouter.patch('/:id', ...writeMiddleware, async (req: Request, res: Response) => {
  const workspaceId = req.session!.workspaceId!;
  const { id } = req.params;
  const { name, schemaJson } = req.body;

  const form = await prisma.form.findFirst({
    where: { id, workspaceId },
  });

  if (!form) {
    res.status(404).json({ error: 'Form not found' });
    return;
  }

  const updates: Record<string, unknown> = {};
  if (name !== undefined) {
    const trimmed = typeof name === 'string' ? name.trim() : '';
    if (!trimmed) {
      res.status(400).json({ error: 'name cannot be empty' });
      return;
    }
    updates.name = trimmed;
  }
  if (schemaJson !== undefined) {
    const { valid, schema } = normalizeSchemaJson(schemaJson);
    if (!valid) {
      res.status(400).json({
        error: 'schemaJson must be an array of { id, type, label?, required?, options? } or { fields: [], config?: {} }',
      });
      return;
    }
    updates.schemaJson = schema;
    updates.version = { increment: 1 };
  }

  const updated = await prisma.form.update({
    where: { id },
    data: updates,
  });
  res.json({ form: updated });
});

formsRouter.delete('/:id', ...writeMiddleware, async (req: Request, res: Response) => {
  const workspaceId = req.session!.workspaceId!;
  const { id } = req.params;

  const form = await prisma.form.findFirst({
    where: { id, workspaceId },
  });

  if (!form) {
    res.status(404).json({ error: 'Form not found' });
    return;
  }

  await prisma.form.delete({ where: { id } });
  res.json({ ok: true });
});
