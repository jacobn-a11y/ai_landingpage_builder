/**
 * Shared helpers for serving published pages.
 * Extracted from serve.routes.ts to keep route files lean.
 */

import { Request, Response } from 'express';
import { prisma } from '../../shared/db.js';
import {
  renderContentToHtml,
  renderFullPageHtml,
  type PageContentJson,
  type StickyBarData,
  type PopupData,
  type FormSchemaData,
} from './renderer.js';
import type { RedirectRule } from '../publishing/publishing.types.js';
import { buildCspFromAllowlist } from '../scripts/csp.js';
import type { ScriptAllowlist } from '../scripts/scripts.types.js';

/* ---------- Types ---------- */

export interface ServePageContext {
  page: {
    id: string;
    name: string;
    slug: string;
    workspaceId: string;
    scripts: unknown;
    lastPublishedContentJson: unknown;
  };
  workspace: {
    globalHeaderScript?: string | null;
    globalFooterScript?: string | null;
    scriptAllowlist?: unknown;
  };
  embedPolicy?: 'allow' | 'deny' | null;
  req: Request;
}

/* ---------- Form helpers ---------- */

export function extractFormIdsFromContent(
  content: PageContentJson & { blocks?: Record<string, { type?: string; props?: { formId?: string } }> }
): string[] {
  const blocks = content?.blocks ?? {};
  const ids: string[] = [];
  for (const block of Object.values(blocks)) {
    if (block?.type === 'form' && block?.props && (block.props.formId as string)) {
      ids.push(block.props.formId as string);
    }
  }
  return [...new Set(ids)];
}

export async function fetchFormSchemas(formIds: string[]): Promise<Record<string, FormSchemaData>> {
  if (formIds.length === 0) return {};
  const forms = await prisma.form.findMany({
    where: { id: { in: formIds } },
    select: { id: true, schemaJson: true },
  });
  const result: Record<string, FormSchemaData> = {};
  for (const form of forms) {
    const schema = form.schemaJson as unknown;
    if (Array.isArray(schema)) {
      result[form.id] = { fields: schema };
    } else if (schema && typeof schema === 'object' && 'fields' in schema) {
      result[form.id] = schema as FormSchemaData;
    } else {
      result[form.id] = { fields: [] };
    }
  }
  return result;
}

/* ---------- URL helpers ---------- */

export function getFormActionUrl(req: Request): string {
  const host = req.get('host') || 'localhost';
  const proto = req.get('x-forwarded-proto') || req.protocol || 'http';
  return `${proto}://${host}/api/v1/submissions`;
}

export function getUrlParams(req: Request): Record<string, string> {
  const params: Record<string, string> = {};
  for (const [k, v] of Object.entries(req.query)) {
    if (typeof v === 'string') params[k] = v;
    else if (Array.isArray(v) && v[0]) params[k] = String(v[0]);
  }
  return params;
}

/* ---------- Redirect evaluation ---------- */

export function applyRedirects(
  redirects: unknown,
  path: string
): { redirect: string; status: number } | null {
  const rules = Array.isArray(redirects) ? redirects : [];
  const normalized = path.startsWith('/') ? path : `/${path}`;
  for (const r of rules) {
    const rule = r as RedirectRule;
    const from = rule.from?.startsWith('/') ? rule.from : `/${rule.from}`;
    if (from === normalized || path === rule.from) {
      return { redirect: rule.to, status: rule.status ?? 301 };
    }
  }
  return null;
}

/* ---------- Security headers ---------- */

export function setSecurityHeaders(
  res: Response,
  opts: {
    embedPolicy?: 'allow' | 'deny' | null;
    scriptAllowlist?: ScriptAllowlist | null;
    hstsEnabled?: boolean;
  }
): void {
  const { embedPolicy, scriptAllowlist, hstsEnabled = true } = opts;
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // X-Frame-Options: SAMEORIGIN when embedding is allowed, DENY otherwise
  res.setHeader('X-Frame-Options', embedPolicy === 'allow' ? 'SAMEORIGIN' : 'DENY');

  // HSTS
  if (hstsEnabled) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  // CSP
  const csp = buildCspFromAllowlist(scriptAllowlist);
  if (csp) {
    res.setHeader('Content-Security-Policy', csp);
  }
}

/* ---------- Render page to HTML ---------- */

export async function renderPublishedPage(ctx: ServePageContext): Promise<string> {
  const { page, workspace, embedPolicy, req } = ctx;

  const content = page.lastPublishedContentJson as PageContentJson & {
    pageSettings?: object;
    stickyBars?: StickyBarData[];
    popups?: PopupData[];
  };

  const formIds = extractFormIdsFromContent(content);
  const forms = await fetchFormSchemas(formIds);
  const urlParams = getUrlParams(req);
  const formActionUrl = getFormActionUrl(req);

  const contentHtml = renderContentToHtml(content, {
    forms,
    formActionUrl,
    pageId: page.id,
    urlParams,
  });

  const scripts = (page.scripts ?? {}) as { header?: string; footer?: string };
  return renderFullPageHtml({
    contentHtml,
    pageId: page.id,
    pageName: page.name,
    pageSlug: page.slug,
    scripts,
    globalHeaderScript: workspace.globalHeaderScript ?? null,
    globalFooterScript: workspace.globalFooterScript ?? null,
    formActionUrl,
    embedPolicy: embedPolicy ?? 'deny',
    pageSettings: content?.pageSettings ?? null,
    stickyBars: content?.stickyBars,
    popups: content?.popups,
  });
}

/* ---------- Send 404 with custom page or fallback ---------- */

export async function send404(
  req: Request,
  res: Response,
  opts: {
    custom404PageId?: string | null;
    workspaceId: string;
    notFoundRedirectUrl?: string | null;
    workspace?: { globalHeaderScript?: string | null; globalFooterScript?: string | null; scriptAllowlist?: unknown };
    embedPolicy?: 'allow' | 'deny' | null;
  }
): Promise<void> {
  // Try custom 404 page
  if (opts.custom404PageId) {
    const notFoundPage = await prisma.page.findFirst({
      where: {
        id: opts.custom404PageId,
        workspaceId: opts.workspaceId,
        lastPublishedContentJson: { not: { equals: null } },
      },
    });
    if (notFoundPage && notFoundPage.lastPublishedContentJson && opts.workspace) {
      const html = await renderPublishedPage({
        page: notFoundPage,
        workspace: opts.workspace,
        embedPolicy: opts.embedPolicy,
        req,
      });
      res.status(404).setHeader('Content-Type', 'text/html; charset=utf-8').send(html);
      return;
    }
  }

  // Workspace-level redirect
  if (opts.notFoundRedirectUrl) {
    res.redirect(302, opts.notFoundRedirectUrl);
    return;
  }

  res.status(404).send('Page not found');
}
