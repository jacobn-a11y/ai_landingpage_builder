/**
 * Serve published pages as HTML.
 * - GET /api/v1/serve/s/:slug - shortlink (resolves via slug)
 * - GET /api/v1/serve/demo/:workspaceId/:path - demo domain
 * - GET /api/v1/serve/host/* - custom domain resolved by Host header
 * - GET /api/v1/serve/domain/:domainId/:path* - custom domain by ID
 * - GET /api/v1/serve/preview/:pageId - auth-protected draft preview
 * Public endpoints (except preview) - no auth required.
 */

import { Router, Request, Response } from 'express';
import { requireAuth } from '../auth/auth.middleware.js';
import { Prisma } from '@prisma/client';
import { prisma } from '../../shared/db.js';
import {
  renderContentToHtml,
  renderFullPageHtml,
  type PageContentJson,
  type StickyBarData,
  type PopupData,
} from './renderer.js';
import { DomainStatus } from '../domains/domains.types.js';
import type { ScriptAllowlist } from '../scripts/scripts.types.js';
import {
  getFormActionUrl,
  getUrlParams,
  extractFormIdsFromContent,
  fetchFormSchemas,
  applyRedirects,
  setSecurityHeaders,
  renderPublishedPage,
  send404,
} from './serve.helpers.js';

export const serveRouter = Router();

/* ---- GET /s/:slug - short demo link ---- */
serveRouter.get('/s/:slug', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const page = await prisma.page.findFirst({
      where: { slug, lastPublishedContentJson: { not: Prisma.DbNull } },
      include: { workspace: true },
    });
    if (!page || !page.lastPublishedContentJson) {
      res.status(404).send('Page not found');
      return;
    }
    const config = (page.publishConfig ?? {}) as { status?: string };
    if (config.status !== 'published') {
      res.status(404).send('Page not found');
      return;
    }
    const workspace = page.workspace;
    const allowlist = (workspace?.scriptAllowlist ?? []) as unknown as ScriptAllowlist;
    setSecurityHeaders(res, { embedPolicy: 'deny', scriptAllowlist: allowlist });
    const html = await renderPublishedPage({ page, workspace, embedPolicy: 'deny', req });
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (err) {
    console.error('[serve] shortlink error:', err);
    res.status(500).send('Internal server error');
  }
});

/* ---- GET /demo/:workspaceId/:path* ---- */
serveRouter.get('/demo/:workspaceId/*', async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const path = req.params[0] ?? '';
    const segs = path.split('/').filter(Boolean);
    const pageSlug = segs[segs.length - 1] || segs[0] || '';
    const page = await prisma.page.findFirst({
      where: { workspaceId, slug: pageSlug, lastPublishedContentJson: { not: Prisma.DbNull } },
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
      if (page.workspace?.notFoundRedirectUrl) { res.redirect(302, page.workspace.notFoundRedirectUrl); return; }
      res.status(404).send('Page not found');
      return;
    }
    const workspace = page.workspace;
    const allowlist = (workspace?.scriptAllowlist ?? []) as unknown as ScriptAllowlist;
    setSecurityHeaders(res, { embedPolicy: 'deny', scriptAllowlist: allowlist });
    const html = await renderPublishedPage({ page, workspace, embedPolicy: 'deny', req });
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (err) {
    console.error('[serve] demo error:', err);
    res.status(500).send('Internal server error');
  }
});

serveRouter.get('/demo/:workspaceId', (_req: Request, res: Response) => {
  res.redirect(302, `${_req.path}/`);
});

/* ---- GET /host/* - resolve domain by Host header ---- */
serveRouter.get('/host/*', async (req: Request, res: Response) => {
  try {
    const hostname = (req.get('x-forwarded-host') || req.get('host') || '').split(':')[0];
    if (!hostname) { res.status(400).send('Host header required'); return; }
    const domain = await prisma.domain.findFirst({
      where: { hostname, status: DomainStatus.Active },
      include: { workspace: true },
    });
    if (!domain) { res.status(404).send('Domain not found or inactive'); return; }
    const path = req.params[0] ?? '';
    const redirect = applyRedirects(domain.redirects, path || '/');
    if (redirect) { res.redirect(redirect.status, redirect.redirect); return; }
    const segs = path.split('/').filter(Boolean);
    const pageSlug = segs[segs.length - 1] || segs[0] || '';
    const page = await prisma.page.findFirst({
      where: { workspaceId: domain.workspaceId, slug: pageSlug, lastPublishedContentJson: { not: Prisma.DbNull } },
    });
    if (!page || !page.lastPublishedContentJson) {
      await send404(req, res, {
        custom404PageId: domain.custom404PageId,
        workspaceId: domain.workspaceId,
        notFoundRedirectUrl: domain.workspace?.notFoundRedirectUrl,
        workspace: domain.workspace,
        embedPolicy: domain.embedPolicy as 'allow' | 'deny' | null,
      });
      return;
    }
    const config = (page.publishConfig ?? {}) as { targetType?: string; status?: string };
    if (config.targetType !== 'custom' || config.status !== 'published') {
      await send404(req, res, {
        workspaceId: domain.workspaceId,
        notFoundRedirectUrl: domain.workspace?.notFoundRedirectUrl,
      });
      return;
    }
    const ws = domain.workspace;
    const allowlist = (ws?.scriptAllowlist ?? []) as unknown as ScriptAllowlist;
    const ep = domain.embedPolicy as 'allow' | 'deny' | null;
    setSecurityHeaders(res, { embedPolicy: ep, scriptAllowlist: allowlist });
    const html = await renderPublishedPage({ page, workspace: ws, embedPolicy: ep, req });
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (err) {
    console.error('[serve] host error:', err);
    res.status(500).send('Internal server error');
  }
});

/* ---- GET /domain/:domainId/* - custom domain by ID ---- */
serveRouter.get('/domain/:domainId/*', async (req: Request, res: Response) => {
  try {
    const { domainId } = req.params;
    const path = req.params[0] ?? '';
    const segs = path.split('/').filter(Boolean);
    const pageSlug = segs[segs.length - 1] || segs[0] || '';
    const domain = await prisma.domain.findFirst({
      where: { id: domainId },
      include: { workspace: true },
    });
    if (!domain || domain.status !== DomainStatus.Active) {
      res.status(404).send('Domain not found or inactive');
      return;
    }
    const redirect = applyRedirects(domain.redirects, path || '/');
    if (redirect) { res.redirect(redirect.status, redirect.redirect); return; }
    const page = await prisma.page.findFirst({
      where: {
        workspaceId: domain.workspaceId,
        slug: pageSlug,
        lastPublishedContentJson: { not: Prisma.DbNull },
      },
    });
    if (!page || !page.lastPublishedContentJson) {
      await send404(req, res, {
        custom404PageId: domain.custom404PageId,
        workspaceId: domain.workspaceId,
        notFoundRedirectUrl: domain.workspace?.notFoundRedirectUrl,
        workspace: domain.workspace,
        embedPolicy: domain.embedPolicy as 'allow' | 'deny' | null,
      });
      return;
    }
    const config = (page.publishConfig ?? {}) as {
      domainId?: string;
      targetType?: string;
      status?: string;
    };
    if (
      config.domainId !== domainId ||
      config.targetType !== 'custom' ||
      config.status !== 'published'
    ) {
      await send404(req, res, {
        workspaceId: domain.workspaceId,
        notFoundRedirectUrl: domain.workspace?.notFoundRedirectUrl,
      });
      return;
    }
    const ws = domain.workspace;
    const allowlist = (ws?.scriptAllowlist ?? []) as unknown as ScriptAllowlist;
    const ep = domain.embedPolicy as 'allow' | 'deny' | null;
    setSecurityHeaders(res, { embedPolicy: ep, scriptAllowlist: allowlist });
    const html = await renderPublishedPage({
      page,
      workspace: ws,
      embedPolicy: ep,
      req,
    });
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (err) {
    console.error('[serve] domain error:', err);
    res.status(500).send('Internal server error');
  }
});

/* ---- GET /preview/:pageId - auth-protected draft preview ---- */
serveRouter.get(
  '/preview/:pageId',
  requireAuth,
  async (req: Request, res: Response) => {
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
      const content = page.contentJson as PageContentJson & {
        pageSettings?: object;
        stickyBars?: StickyBarData[];
        popups?: PopupData[];
      } | null;
      if (!content || typeof content !== 'object') {
        res.status(404).send('Page has no content');
        return;
      }
      const workspace = page.workspace;
      const allowlist = (workspace?.scriptAllowlist ?? []) as unknown as ScriptAllowlist;
      setSecurityHeaders(res, { embedPolicy: 'deny', scriptAllowlist: allowlist });
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
      const html = renderFullPageHtml({
        contentHtml,
        pageId: page.id,
        pageName: page.name,
        pageSlug: page.slug,
        scripts,
        globalHeaderScript: workspace?.globalHeaderScript ?? null,
        globalFooterScript: workspace?.globalFooterScript ?? null,
        formActionUrl,
        embedPolicy: 'deny',
        pageSettings: content?.pageSettings ?? null,
        stickyBars: content?.stickyBars,
        popups: content?.popups,
      });
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(html);
    } catch (err) {
      console.error('[serve] preview error:', err);
      res.status(500).send('Internal server error');
    }
  },
);
