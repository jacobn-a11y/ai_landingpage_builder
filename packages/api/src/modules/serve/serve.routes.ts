/**
 * Serve published pages as HTML.
 * - GET /api/v1/serve/demo/:workspaceId/:path - demo domain
 * - GET /api/v1/serve/domain/:domainId/:path* - custom domain (path can have slashes)
 * - GET /api/v1/serve/preview/:pageId - auth-protected draft preview
 * Public endpoints (except preview) - no auth required.
 */

import { Router, Request, Response } from 'express';
import { requireAuth } from '../auth/auth.middleware.js';
import { Prisma } from '@prisma/client';
import { prisma } from '../../shared/db.js';
import { renderContentToHtml, renderFullPageHtml, type PageContentJson, type StickyBarData, type PopupData, type FormSchemaData } from './renderer.js';
import type { RedirectRule } from '../publishing/publishing.types.js';
import { DomainStatus } from '../domains/domains.types.js';
import { buildCspFromAllowlist } from '../scripts/csp.js';
import type { ScriptAllowlist } from '../scripts/scripts.types.js';

export const serveRouter = Router();

function getFormActionUrl(req: Request): string {
  const host = req.get('host') || 'localhost';
  const proto = req.get('x-forwarded-proto') || req.protocol || 'http';
  return `${proto}://${host}/api/v1/submissions`;
}

function securityHeaders(
  res: Response,
  opts: { embedPolicy?: 'allow' | 'deny' | null; scriptAllowlist?: ScriptAllowlist | null }
): void {
  const { embedPolicy, scriptAllowlist } = opts;
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', embedPolicy === 'allow' ? 'SAMEORIGIN' : 'DENY');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  const csp = buildCspFromAllowlist(scriptAllowlist);
  if (csp) {
    res.setHeader('Content-Security-Policy', csp);
  }
}

function extractFormIdsFromContent(content: PageContentJson & { blocks?: Record<string, { type?: string; props?: { formId?: string } }> }): string[] {
  const blocks = content?.blocks ?? {};
  const ids: string[] = [];
  for (const block of Object.values(blocks)) {
    if (block?.type === 'form' && block?.props && (block.props.formId as string)) {
      ids.push(block.props.formId as string);
    }
  }
  return [...new Set(ids)];
}

async function fetchFormSchemas(formIds: string[]): Promise<Record<string, FormSchemaData>> {
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

function getUrlParams(req: Request): Record<string, string> {
  const params: Record<string, string> = {};
  for (const [k, v] of Object.entries(req.query)) {
    if (typeof v === 'string') params[k] = v;
    else if (Array.isArray(v) && v[0]) params[k] = String(v[0]);
  }
  return params;
}

function applyRedirects(redirects: unknown, path: string): { redirect: string; status: number } | null {
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

// GET /api/v1/serve/demo/:workspaceId/:path*
serveRouter.get('/demo/:workspaceId/*', async (req: Request, res: Response) => {
  try {
  const { workspaceId } = req.params;
  const path = req.params[0] ?? '';
  const pathSegments = path.split('/').filter(Boolean);
  const pageSlug = pathSegments[pathSegments.length - 1] || pathSegments[0] || '';

  const page = await prisma.page.findFirst({
    where: {
      workspaceId,
      slug: pageSlug,
      lastPublishedContentJson: { not: Prisma.DbNull },
    },
    include: { workspace: true },
  });

  if (!page || !page.lastPublishedContentJson) {
    const ws = await prisma.workspace.findUnique({ where: { id: workspaceId }, select: { notFoundRedirectUrl: true } });
    if (ws?.notFoundRedirectUrl) { res.redirect(302, ws.notFoundRedirectUrl); return; }
    res.status(404).send('Page not found');
    return;
  }

  const config = (page.publishConfig ?? {}) as { targetType?: string; status?: string };
  if (config.targetType !== 'demo' || config.status !== 'published') {
    const ws = page.workspace;
    if (ws?.notFoundRedirectUrl) { res.redirect(302, ws.notFoundRedirectUrl); return; }
    res.status(404).send('Page not found');
    return;
  }

  const workspace = page.workspace;
  const allowlist = (workspace?.scriptAllowlist ?? []) as unknown as ScriptAllowlist;
  securityHeaders(res, { embedPolicy: 'deny', scriptAllowlist: allowlist });

  const content = page.lastPublishedContentJson as PageContentJson & { pageSettings?: object; stickyBars?: StickyBarData[]; popups?: PopupData[] };
  const formIds = extractFormIdsFromContent(content);
  const forms = await fetchFormSchemas(formIds);
  const urlParams = getUrlParams(req);
  const contentHtml = renderContentToHtml(content, {
    forms,
    formActionUrl: getFormActionUrl(req),
    pageId: page.id,
    urlParams,
  });
  const scripts = (page.scripts ?? {}) as { header?: string; footer?: string };
  const html = renderFullPageHtml({
    contentHtml,
    pageId: page.id,
    pageName: page.name,
    pageSlug: page.slug,
    scripts,
    globalHeaderScript: workspace?.globalHeaderScript ?? null,
    globalFooterScript: workspace?.globalFooterScript ?? null,
    formActionUrl: getFormActionUrl(req),
    embedPolicy: 'deny',
    pageSettings: content?.pageSettings ?? null,
    stickyBars: content?.stickyBars,
    popups: content?.popups,
  });

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
  } catch (err) {
    console.error('[serve] demo route error:', err);
    res.status(500).send('Internal server error');
  }
});

// GET /api/v1/serve/demo/:workspaceId - redirect to first segment
serveRouter.get('/demo/:workspaceId', async (req: Request, res: Response) => {
  res.redirect(302, `${req.path}/`);
});

// GET /api/v1/serve/domain/:domainId/* - custom domain
serveRouter.get('/domain/:domainId/*', async (req: Request, res: Response) => {
  try {
  const { domainId } = req.params;
  const path = req.params[0] ?? '';
  const pathSegments = path.split('/').filter(Boolean);
  const pageSlug = pathSegments[pathSegments.length - 1] || pathSegments[0] || '';

  const domain = await prisma.domain.findFirst({
    where: { id: domainId },
    include: { workspace: true },
  });

  if (!domain || domain.status !== DomainStatus.Active) {
    res.status(404).send('Domain not found or inactive');
    return;
  }

  const redirect = applyRedirects(domain.redirects, path || '/');
  if (redirect) {
    res.redirect(redirect.status, redirect.redirect);
    return;
  }

  const page = await prisma.page.findFirst({
    where: {
      workspaceId: domain.workspaceId,
      slug: pageSlug,
      lastPublishedContentJson: { not: Prisma.DbNull },
    },
  });

  if (!page || !page.lastPublishedContentJson) {
    if (domain.custom404PageId) {
      const notFoundPage = await prisma.page.findFirst({
        where: {
          id: domain.custom404PageId,
          workspaceId: domain.workspaceId,
          lastPublishedContentJson: { not: Prisma.DbNull },
        },
      });
      if (notFoundPage) {
        const workspace = domain.workspace;
        const allowlist = (workspace?.scriptAllowlist ?? []) as unknown as ScriptAllowlist;
        securityHeaders(res, {
          embedPolicy: domain.embedPolicy as 'allow' | 'deny' | null,
          scriptAllowlist: allowlist,
        });
        const notFoundContent = notFoundPage.lastPublishedContentJson as PageContentJson & { pageSettings?: object; stickyBars?: StickyBarData[]; popups?: PopupData[] };
        const notFoundFormIds = extractFormIdsFromContent(notFoundContent);
        const notFoundForms = await fetchFormSchemas(notFoundFormIds);
        const urlParams = getUrlParams(req);
        const contentHtml = renderContentToHtml(notFoundContent, {
          forms: notFoundForms,
          formActionUrl: getFormActionUrl(req),
          pageId: notFoundPage.id,
          urlParams,
        });
        const scripts = (notFoundPage.scripts ?? {}) as { header?: string; footer?: string };
        const html = renderFullPageHtml({
          contentHtml,
          pageId: notFoundPage.id,
          pageName: notFoundPage.name,
          pageSlug: notFoundPage.slug,
          scripts,
          globalHeaderScript: workspace?.globalHeaderScript ?? null,
          globalFooterScript: workspace?.globalFooterScript ?? null,
          formActionUrl: getFormActionUrl(req),
          embedPolicy: domain.embedPolicy as 'allow' | 'deny' | null,
          pageSettings: notFoundContent?.pageSettings ?? null,
          stickyBars: notFoundContent?.stickyBars,
          popups: notFoundContent?.popups,
        });
        res.status(404).setHeader('Content-Type', 'text/html; charset=utf-8').send(html);
        return;
      }
    }
    const ws = domain.workspace;
    if (ws?.notFoundRedirectUrl) { res.redirect(302, ws.notFoundRedirectUrl); return; }
    res.status(404).send('Page not found');
    return;
  }

  const config = (page.publishConfig ?? {}) as { domainId?: string; targetType?: string; status?: string };
  if (config.domainId !== domainId || config.targetType !== 'custom' || config.status !== 'published') {
    const ws = domain.workspace;
    if (ws?.notFoundRedirectUrl) { res.redirect(302, ws.notFoundRedirectUrl); return; }
    res.status(404).send('Page not found');
    return;
  }

  const workspace = domain.workspace;
  const allowlist = (workspace?.scriptAllowlist ?? []) as unknown as ScriptAllowlist;
  securityHeaders(res, {
    embedPolicy: domain.embedPolicy as 'allow' | 'deny' | null,
    scriptAllowlist: allowlist,
  });

  const content = page.lastPublishedContentJson as PageContentJson & { pageSettings?: object; stickyBars?: StickyBarData[]; popups?: PopupData[] };
  const formIds = extractFormIdsFromContent(content);
  const forms = await fetchFormSchemas(formIds);
  const urlParams = getUrlParams(req);
  const contentHtml = renderContentToHtml(content, {
    forms,
    formActionUrl: getFormActionUrl(req),
    pageId: page.id,
    urlParams,
  });
  const scripts = (page.scripts ?? {}) as { header?: string; footer?: string };
  const html = renderFullPageHtml({
    contentHtml,
    pageId: page.id,
    pageName: page.name,
    pageSlug: page.slug,
    scripts,
    globalHeaderScript: workspace?.globalHeaderScript ?? null,
    globalFooterScript: workspace?.globalFooterScript ?? null,
    formActionUrl: getFormActionUrl(req),
    embedPolicy: domain.embedPolicy as 'allow' | 'deny' | null,
    pageSettings: content?.pageSettings ?? null,
    stickyBars: content?.stickyBars,
    popups: content?.popups,
  });

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
  } catch (err) {
    console.error('[serve] domain route error:', err);
    res.status(500).send('Internal server error');
  }
});

// GET /api/v1/serve/preview/:pageId - auth-protected draft preview (uses contentJson, not lastPublishedContentJson)
serveRouter.get('/preview/:pageId', requireAuth, async (req: Request, res: Response) => {
  try {
  const workspaceId = req.session?.workspaceId;
  if (!workspaceId) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  const { pageId } = req.params;
  const page = await prisma.page.findFirst({
    where: { id: pageId, workspaceId },
    include: { workspace: true },
  });
  if (!page) {
    res.status(404).send('Page not found');
    return;
  }
  const content = page.contentJson as PageContentJson & { pageSettings?: object; stickyBars?: StickyBarData[]; popups?: PopupData[] } | null;
  if (!content || typeof content !== 'object') {
    res.status(404).send('Page has no content');
    return;
  }
  const workspace = page.workspace;
  const allowlist = (workspace?.scriptAllowlist ?? []) as unknown as ScriptAllowlist;
  securityHeaders(res, { embedPolicy: 'deny', scriptAllowlist: allowlist });
  const formIds = extractFormIdsFromContent(content);
  const forms = await fetchFormSchemas(formIds);
  const urlParams = getUrlParams(req);
  const contentHtml = renderContentToHtml(content, {
    forms,
    formActionUrl: getFormActionUrl(req),
    pageId: page.id,
    urlParams,
  });
  const scripts = (page.scripts ?? {}) as { header?: string; footer?: string };
  const html = renderFullPageHtml({
    contentHtml,
    pageId: page.id,
    pageName: page.name,
    pageSlug: page.slug,
    scripts,
    globalHeaderScript: workspace?.globalHeaderScript ?? null,
    globalFooterScript: workspace?.globalFooterScript ?? null,
    formActionUrl: getFormActionUrl(req),
    embedPolicy: 'deny',
    pageSettings: content?.pageSettings ?? null,
    stickyBars: content?.stickyBars,
    popups: content?.popups,
  });
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
  } catch (err) {
    console.error('[serve] preview route error:', err);
    res.status(500).send('Internal server error');
  }
});
