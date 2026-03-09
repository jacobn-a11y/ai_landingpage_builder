/**
 * Dev-only: bypass auth when BYPASS_AUTH_LOCALHOST=1 and request is from localhost.
 * Creates seeded dev workspace/users/data for local demos. Never runs in production.
 */
import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../shared/db.js';

type Persona = 'admin' | 'marketer' | 'revops';

const DEV_WORKSPACE_NAME = 'Dev Workspace';
const DEV_USERS: Record<Persona, { email: string; role: 'Admin' | 'Editor' | 'Viewer' }> = {
  admin: { email: 'admin@localhost', role: 'Admin' },
  marketer: { email: 'marketer@localhost', role: 'Editor' },
  revops: { email: 'revops@localhost', role: 'Viewer' },
};

let seedPromise: Promise<void> | null = null;

function isLocalhost(req: Request): boolean {
  const host = req.get('host') ?? '';
  const origin = req.get('origin') ?? '';
  const forwarded = req.get('x-forwarded-host') ?? '';
  return (
    host.includes('localhost') ||
    host.includes('127.0.0.1') ||
    origin.includes('localhost') ||
    origin.includes('127.0.0.1') ||
    forwarded.includes('localhost')
  );
}

function resolvePersona(req: Request): Persona {
  const raw = (req.get('x-dev-persona') ?? (req.query.persona as string | undefined) ?? '')
    .trim()
    .toLowerCase();
  if (raw === 'marketer' || raw === 'editor') return 'marketer';
  if (raw === 'revops' || raw === 'viewer') return 'revops';
  return 'admin';
}

function buildSampleContent(title: string, subtitle: string): object {
  return {
    root: 'root',
    blocks: {
      root: {
        id: 'root',
        type: 'section',
        props: { padding: '64px 24px', backgroundColor: '#f8fafc' },
        children: ['hero-title', 'hero-subtitle'],
      },
      'hero-title': {
        id: 'hero-title',
        type: 'text',
        props: { text: title, fontSize: 40, fontWeight: 700, color: '#0f172a' },
      },
      'hero-subtitle': {
        id: 'hero-subtitle',
        type: 'text',
        props: { text: subtitle, fontSize: 18, color: '#334155' },
      },
    },
  };
}

async function ensureSeededData(): Promise<void> {
  if (!seedPromise) {
    seedPromise = (async () => {
      const knownEmails = [
        DEV_USERS.admin.email,
        DEV_USERS.marketer.email,
        DEV_USERS.revops.email,
        'dev@localhost',
      ];
      const anchorUser = await prisma.user.findFirst({
        where: { email: { in: knownEmails } },
        include: { workspace: true },
      });

      const workspace =
        anchorUser?.workspace ??
        (await prisma.workspace.findFirst({
          where: { name: DEV_WORKSPACE_NAME },
        })) ??
        (await prisma.workspace.create({
          data: {
            name: DEV_WORKSPACE_NAME,
            allowedEmailDomains: ['localhost'],
            globalHeaderScript: '<script src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>',
            globalFooterScript: '<script>window.replicaDebugMode = true;</script>',
            scriptAllowlist: [{ domain: 'cdn.jsdelivr.net' }],
          },
        }));

      await prisma.workspace.update({
        where: { id: workspace.id },
        data: {
          allowedEmailDomains: ['localhost'],
          scriptAllowlist: [{ domain: 'cdn.jsdelivr.net' }, { domain: 'www.googletagmanager.com' }],
        },
      });

      const adminUser = await prisma.user.upsert({
        where: {
          workspaceId_email: {
            workspaceId: workspace.id,
            email: DEV_USERS.admin.email,
          },
        },
        update: { role: DEV_USERS.admin.role },
        create: {
          workspaceId: workspace.id,
          email: DEV_USERS.admin.email,
          role: DEV_USERS.admin.role,
        },
      });
      await prisma.user.upsert({
        where: {
          workspaceId_email: {
            workspaceId: workspace.id,
            email: DEV_USERS.marketer.email,
          },
        },
        update: { role: DEV_USERS.marketer.role },
        create: {
          workspaceId: workspace.id,
          email: DEV_USERS.marketer.email,
          role: DEV_USERS.marketer.role,
        },
      });
      await prisma.user.upsert({
        where: {
          workspaceId_email: {
            workspaceId: workspace.id,
            email: DEV_USERS.revops.email,
          },
        },
        update: { role: DEV_USERS.revops.role },
        create: {
          workspaceId: workspace.id,
          email: DEV_USERS.revops.email,
          role: DEV_USERS.revops.role,
        },
      });

      const mainFolder =
        (await prisma.folder.findFirst({
          where: { workspaceId: workspace.id, name: 'Demo Campaigns' },
        })) ??
        (await prisma.folder.create({
          data: {
            workspaceId: workspace.id,
            name: 'Demo Campaigns',
          },
        }));

      const marketerForm =
        (await prisma.form.findFirst({
          where: { workspaceId: workspace.id, name: 'Demand Gen Lead Form' },
        })) ??
        (await prisma.form.create({
          data: {
            workspaceId: workspace.id,
            name: 'Demand Gen Lead Form',
            schemaJson: {
              fields: [
                { id: 'first_name', type: 'text', label: 'First name', required: true },
                { id: 'last_name', type: 'text', label: 'Last name', required: true },
                { id: 'email', type: 'email', label: 'Work email', required: true },
                { id: 'company', type: 'text', label: 'Company' },
              ],
              config: { buttonText: 'Get the Guide' },
            },
          },
        }));

      const revopsForm =
        (await prisma.form.findFirst({
          where: { workspaceId: workspace.id, name: 'RevOps Pipeline Form' },
        })) ??
        (await prisma.form.create({
          data: {
            workspaceId: workspace.id,
            name: 'RevOps Pipeline Form',
            schemaJson: {
              fields: [
                { id: 'email', type: 'email', label: 'Email', required: true },
                { id: 'title', type: 'text', label: 'Job title' },
                { id: 'utm_source', type: 'hidden', label: 'UTM Source' },
              ],
              config: { buttonText: 'Send to CRM' },
            },
          },
        }));

      const marketerPage =
        (await prisma.page.findFirst({
          where: { workspaceId: workspace.id, slug: 'spring-demand-gen-campaign' },
        })) ??
        (await prisma.page.create({
          data: {
            workspaceId: workspace.id,
            folderId: mainFolder.id,
            name: 'Spring Demand Gen Campaign',
            slug: 'spring-demand-gen-campaign',
            contentJson: buildSampleContent(
              '2026 Demand Gen Campaign',
              'Persona seed: Demand Gen Marketer (Editor)'
            ),
            lastPublishedContentJson: buildSampleContent(
              '2026 Demand Gen Campaign',
              'Published demo snapshot'
            ),
            publishConfig: {
              targetType: 'demo',
              path: '/spring-demand-gen-campaign',
              status: 'published',
              isPublished: true,
              publishedAt: new Date().toISOString(),
            },
            scripts: {
              header: '<script src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"></script>',
            },
          },
        }));

      const revopsPage =
        (await prisma.page.findFirst({
          where: { workspaceId: workspace.id, slug: 'revops-attribution-dashboard' },
        })) ??
        (await prisma.page.create({
          data: {
            workspaceId: workspace.id,
            folderId: mainFolder.id,
            name: 'RevOps Attribution Dashboard',
            slug: 'revops-attribution-dashboard',
            contentJson: buildSampleContent(
              'Pipeline Attribution Snapshot',
              'Persona seed: RevOps (Viewer)'
            ),
          },
        }));

      const adminPage =
        (await prisma.page.findFirst({
          where: { workspaceId: workspace.id, slug: 'admin-publishing-controls' },
        })) ??
        (await prisma.page.create({
          data: {
            workspaceId: workspace.id,
            folderId: mainFolder.id,
            name: 'Admin Publishing Controls',
            slug: 'admin-publishing-controls',
            contentJson: buildSampleContent(
              'Publishing Controls',
              'Persona seed: Admin controls and domain setup'
            ),
          },
        }));

      const marketerBinding = await prisma.pageFormBinding.findFirst({
        where: { pageId: marketerPage.id, formId: marketerForm.id, type: 'native' },
      });
      if (!marketerBinding) {
        await prisma.pageFormBinding.create({
          data: {
            pageId: marketerPage.id,
            formId: marketerForm.id,
            type: 'native',
            blockId: 'form-demand-gen',
            fieldMappings: {},
          },
        });
      }

      const revopsBinding = await prisma.pageFormBinding.findFirst({
        where: { pageId: revopsPage.id, formId: revopsForm.id, type: 'hooked' },
      });
      if (!revopsBinding) {
        await prisma.pageFormBinding.create({
          data: {
            pageId: revopsPage.id,
            formId: revopsForm.id,
            type: 'hooked',
            selector: '#revops-form',
            fieldMappings: {
              email: 'email',
              title: 'title',
            },
          },
        });
      }

      await prisma.domain.upsert({
        where: {
          workspaceId_hostname: {
            workspaceId: workspace.id,
            hostname: 'lp.demo.localhost',
          },
        },
        update: {
          status: 'Active',
          cnameTarget: process.env.CNAME_TARGET ?? 'cname.replicapages.io',
          embedPolicy: 'allow',
          verificationTxt: 'replica-dev-verify-token',
          verificationCheckedAt: new Date(),
          sslStatus: 'Active',
          verificationError: null,
        },
        create: {
          workspaceId: workspace.id,
          hostname: 'lp.demo.localhost',
          status: 'Active',
          cnameTarget: process.env.CNAME_TARGET ?? 'cname.replicapages.io',
          embedPolicy: 'allow',
          verificationTxt: 'replica-dev-verify-token',
          verificationCheckedAt: new Date(),
          sslStatus: 'Active',
        },
      });

      const zapierIntegration = await prisma.integration.findFirst({
        where: { workspaceId: workspace.id, type: 'zapier' },
      });
      if (!zapierIntegration) {
        await prisma.integration.create({
          data: {
            workspaceId: workspace.id,
            type: 'zapier',
            configEncrypted: JSON.stringify({
              webhookUrl: 'https://hooks.zapier.com/hooks/catch/123456/dev',
            }),
          },
        });
      }

      const existingSubmissions = await prisma.submission.count({
        where: { workspaceId: workspace.id },
      });
      if (existingSubmissions === 0) {
        const nowIso = new Date().toISOString();
        await prisma.submission.create({
          data: {
            workspaceId: workspace.id,
            pageId: marketerPage.id,
            payloadJson: {
              page_id: marketerPage.id,
              first_name: 'Avery',
              last_name: 'Shaw',
              email: 'avery.shaw@example.com',
              company: 'Northwind',
              utm_source: 'linkedin',
              utm_medium: 'paid-social',
              utm_campaign: 'spring-demand-gen',
              utm_page: marketerPage.slug,
              submitted_at: nowIso,
            },
            deliveryStatus: 'delivered',
            deliveryAttempts: [{ attempt: 1, status: 'delivered', at: nowIso }],
            deliveredAt: new Date(),
          },
        });
        await prisma.submission.create({
          data: {
            workspaceId: workspace.id,
            pageId: revopsPage.id,
            payloadJson: {
              page_id: revopsPage.id,
              email: 'ops.manager@example.com',
              title: 'Revenue Operations Manager',
              custom_fields: { crm_region: 'NA-East' },
              utm_source: 'newsletter',
              utm_medium: 'email',
              utm_campaign: 'revops-q2',
              utm_page: revopsPage.slug,
              submitted_at: nowIso,
            },
            deliveryStatus: 'pending',
            deliveryAttempts: [],
          },
        });
        await prisma.submission.create({
          data: {
            workspaceId: workspace.id,
            pageId: adminPage.id,
            payloadJson: {
              page_id: adminPage.id,
              email: 'admin.audit@example.com',
              utm_source: 'direct',
              utm_medium: 'none',
              utm_campaign: 'ops-audit',
              utm_page: adminPage.slug,
              submitted_at: nowIso,
            },
            deliveryStatus: 'failed',
            deliveryAttempts: [{ attempt: 1, status: 'failed', error: 'Webhook timeout', at: nowIso }],
          },
        });
      }

      // Keep backward compatibility if old dev user exists.
      await prisma.user.upsert({
        where: {
          workspaceId_email: {
            workspaceId: workspace.id,
            email: 'dev@localhost',
          },
        },
        update: { role: 'Admin' },
        create: {
          workspaceId: workspace.id,
          email: 'dev@localhost',
          role: 'Admin',
        },
      });

      // Ensure admin user remains available even if old dev data existed first.
      await prisma.user.update({
        where: { id: adminUser.id },
        data: { role: 'Admin' },
      });
    })();
  }

  await seedPromise;
}

export async function devBypassAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    next();
    return;
  }
  if (process.env.BYPASS_AUTH_LOCALHOST !== '1') {
    next();
    return;
  }
  if (!isLocalhost(req)) {
    next();
    return;
  }

  try {
    await ensureSeededData();
    const persona = resolvePersona(req);
    const selected = DEV_USERS[persona];
    const user = await prisma.user.findFirst({
      where: { email: selected.email },
      include: { workspace: true },
    });

    if (!user) {
      next();
      return;
    }

    const userShape = {
      id: user.id,
      email: user.email,
      role: user.role,
      workspaceId: user.workspaceId,
    };

    (req as { user?: object }).user = userShape;
    (req as { isAuthenticated?: () => boolean }).isAuthenticated = () => true;

    if (req.session) {
      req.session.userId = user.id;
      req.session.workspaceId = user.workspaceId;
      req.session.role = user.role as 'Admin' | 'Editor' | 'Viewer';
    }
  } catch (err) {
    console.error('[dev-bypass] Failed to get/create dev persona data:', err);
  }

  next();
}
