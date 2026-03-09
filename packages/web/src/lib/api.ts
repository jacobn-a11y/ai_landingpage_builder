const API_BASE = '/api/v1';

async function fetchApi<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error ?? 'Request failed');
  }
  return res.json();
}

/**
 * Fetch API with FormData (no Content-Type header; browser sets multipart boundary).
 */
async function fetchApiFormData<T>(
  path: string,
  formData: FormData,
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
    // Do NOT set Content-Type — browser will set multipart boundary
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error ?? 'Request failed');
  }
  return res.json();
}

export const api = {
  auth: {
    me: () => fetchApi<{ user: AuthUser | null }>('/auth/me'),
    logout: () =>
      fetchApi<{ ok: boolean }>('/auth/logout', { method: 'POST' }),
  },
  workspaces: {
    get: () => fetchApi<{ workspace: Workspace }>('/workspaces'),
    getUsers: (id: string) =>
      fetchApi<{ users: WorkspaceUser[] }>(`/workspaces/${id}/users`),
    updateSettings: (
      id: string,
      data: Partial<{
        name: string;
        allowedEmailDomains: string[];
        globalHeaderScript: string | null;
        globalFooterScript: string | null;
        scriptAllowlist: ScriptAllowlistEntry[];
        notFoundRedirectUrl: string | null;
      }>
    ) =>
      fetchApi<{ workspace: Workspace }>(`/workspaces/${id}/settings`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
  },
  invites: {
    create: (data: { email: string; role: string }) =>
      fetchApi<InviteResponse>('/invites', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },
  users: {
    remove: (id: string) =>
      fetchApi<{ ok: boolean }>(`/users/${id}`, { method: 'DELETE' }),
  },
  pages: {
    list: (folderId?: string) =>
      fetchApi<{ pages: Page[] }>(
        folderId !== undefined ? `/pages?folderId=${folderId === '' ? 'root' : folderId}` : '/pages'
      ),
    get: (id: string) => fetchApi<{ page: Page }>(`/pages/${id}`),
    getDetectedForms: (id: string) =>
      fetchApi<{ forms: DetectedForm[] }>(`/pages/${id}/detected-forms`),
    create: (data: {
      name: string;
      slug?: string;
      folderId?: string;
      contentJson?: object;
    }) =>
      fetchApi<{ page: Page }>('/pages', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (
      id: string,
      data: Partial<{
        name: string;
        slug: string;
        folderId: string | null;
        contentJson: object;
        lastPublishedContentJson: object;
        scripts: PageScripts;
        publishConfig: object;
        formBindings: PageFormBinding[];
      }>
    ) =>
      fetchApi<{ page: Page }>(`/pages/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      fetchApi<{ ok: boolean }>(`/pages/${id}`, { method: 'DELETE' }),
    clone: (id: string, data?: { name?: string; slug?: string }) =>
      fetchApi<{ page: Page }>(`/pages/${id}/clone`, {
        method: 'POST',
        body: JSON.stringify(data ?? {}),
      }),
    publish: (id: string, data: PublishRequest) =>
      fetchApi<{ ok: boolean; publishStatus: PublishStatus }>(`/pages/${id}/publish`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    unpublish: (id: string) =>
      fetchApi<{ ok: boolean; publishStatus: PublishStatus }>(`/pages/${id}/unpublish`, {
        method: 'POST',
      }),
    getPublishStatus: (id: string) =>
      fetchApi<{ publishStatus: PublishStatus }>(`/pages/${id}/publish-status`),
    schedule: (id: string, data: ScheduleRequest) =>
      fetchApi<{ ok: boolean; publishStatus: PublishStatus }>(`/pages/${id}/schedule`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    updatePublishSchedule: (id: string, data: { publishAt?: string | null; unpublishAt?: string | null }) =>
      fetchApi<{ ok: boolean; publishStatus: PublishStatus }>(`/pages/${id}/publish-schedule`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
  },
  forms: {
    list: () => fetchApi<{ forms: Form[] }>('/forms'),
    get: (id: string) => fetchApi<{ form: Form }>(`/forms/${id}`),
    create: (data: { name: string; schemaJson: FormFieldSchema[] | { fields: FormFieldSchema[]; config?: FormSchemaConfig } }) =>
      fetchApi<{ form: Form }>('/forms', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: { name?: string; schemaJson?: FormFieldSchema[] | { fields: FormFieldSchema[]; config?: FormSchemaConfig } }) =>
      fetchApi<{ form: Form }>(`/forms/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      fetchApi<{ ok: boolean }>(`/forms/${id}`, { method: 'DELETE' }),
  },
  domains: {
    list: () => fetchApi<{ domains: Domain[] }>('/domains'),
    get: (id: string) => fetchApi<{ domain: Domain }>(`/domains/${id}`),
    create: (data: { hostname: string }) =>
      fetchApi<{ domain: Domain }>('/domains', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<Domain>) =>
      fetchApi<{ domain: Domain }>(`/domains/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    updateSettings: (id: string, data: { embedPolicy?: 'allow' | 'deny' | null; custom404PageId?: string | null; securityHeaders?: SecurityHeaders | null }) =>
      fetchApi<{ domain: Domain }>(`/domains/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    verify: (id: string) =>
      fetchApi<{
        domain: Domain;
        verification: { success: boolean; txtOk: boolean; cnameOk: boolean; hasConflictingA?: boolean };
      }>(`/domains/${id}/verify`, { method: 'POST' }),
    delete: (id: string) =>
      fetchApi<{ ok: boolean }>(`/domains/${id}`, { method: 'DELETE' }),
  },
  submissions: {
    list: (pageId?: string) =>
      fetchApi<{ submissions: Submission[] }>(
        pageId ? `/submissions?pageId=${pageId}` : '/submissions'
      ),
    get: (id: string) => fetchApi<{ submission: Submission }>(`/submissions/${id}`),
  },
  integrations: {
    list: () => fetchApi<{ integrations: IntegrationListItem[] }>('/integrations'),
    get: (id: string) => fetchApi<{ integration: IntegrationDetail }>(`/integrations/${id}`),
    create: (data: { type: string; config?: { webhookUrl?: string } }) =>
      fetchApi<{ integration: IntegrationListItem }>('/integrations', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: { config?: { webhookUrl?: string } }) =>
      fetchApi<{ integration: IntegrationListItem }>(`/integrations/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      fetchApi<{ ok: boolean }>(`/integrations/${id}`, { method: 'DELETE' }),
    testWebhook: (id: string) =>
      fetchApi<{ ok: boolean; message?: string }>(`/integrations/${id}/test`, {
        method: 'POST',
      }),
  },
  library: {
    listFolders: () =>
      fetchApi<{ folders: BlockLibraryFolder[] }>('/library/folders'),
    importFromPage: (pageName: string, contentJson: object) =>
      fetchApi<{ folder: BlockLibraryFolder }>('/library/import', {
        method: 'POST',
        body: JSON.stringify({ pageName, contentJson }),
      }),
    deleteFolder: (id: string) =>
      fetchApi<{ ok: boolean }>(`/library/folders/${id}`, { method: 'DELETE' }),
    deleteItem: (id: string) =>
      fetchApi<{ ok: boolean }>(`/library/items/${id}`, { method: 'DELETE' }),
  },
  import: {
    mhtml: (file: File, opts: { name?: string; slug?: string; folderId?: string; retainSource?: boolean; force?: boolean }) => {
      const form = new FormData();
      form.append('file', file);
      if (opts.name) form.append('name', opts.name);
      if (opts.slug) form.append('slug', opts.slug);
      if (opts.folderId) form.append('folderId', opts.folderId);
      if (opts.retainSource) form.append('retainSource', 'true');
      if (opts.force) form.append('force', 'true');
      return fetchApiFormData<ImportJobResponse>('/import/mhtml', form);
    },
    status: (jobId: string) => fetchApi<ImportJobStatus>(`/import/jobs/${jobId}`),
    cancel: (jobId: string) => fetchApi<{ jobId: string; status: string }>(`/import/jobs/${jobId}`, { method: 'DELETE' }),
  },
  folders: {
    list: () => fetchApi<{ folders: FolderNode[] }>('/folders'),
    create: (data: { name: string; parentId?: string }) =>
      fetchApi<{ folder: Folder }>('/folders', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: { name?: string; parentId?: string | null }) =>
      fetchApi<{ folder: Folder }>(`/folders/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      fetchApi<{ ok: boolean }>(`/folders/${id}`, { method: 'DELETE' }),
  },
};

export type AuthUser = {
  id: string;
  email: string;
  role: string;
  workspaceId: string;
  workspace: { id: string; name: string };
};

export type ScriptAllowlistEntry = {
  domain: string;
  pathPrefix?: string;
};

export type Workspace = {
  id: string;
  name: string;
  allowedEmailDomains: string[];
  globalHeaderScript?: string | null;
  globalFooterScript?: string | null;
  scriptAllowlist?: ScriptAllowlistEntry[];
  notFoundRedirectUrl?: string | null;
};

export type WorkspaceUser = {
  id: string;
  email: string;
  role: string;
  createdAt: string;
};

export type InviteResponse = {
  id: string;
  email: string;
  role: string;
  acceptUrl: string;
  expiresAt: string;
};

export type FormFieldSchema = {
  id: string;
  type: string;
  label?: string;
  required?: boolean;
  options?: string[];
  stepIndex?: number;
  accept?: string;
};

export type FormSchemaConfig = {
  stepNames?: string[];
  buttonText?: string;
  buttonStyle?: 'primary' | 'outline' | 'secondary';
};

export type PublishTargetType = 'demo' | 'custom' | 'webflow_subdomain';

export type PublishStatus = {
  publishConfig: {
    domainId?: string;
    targetType?: PublishTargetType;
    path?: string;
    status?: 'draft' | 'published' | 'scheduled';
    publishAt?: string;
    unpublishAt?: string;
    isPublished?: boolean;
    publishedAt?: string;
    webflowIntegrationId?: string;
    webflowSubdomain?: string;
  };
  status: 'draft' | 'published' | 'scheduled';
  targetLabel: string;
  url?: string;
};

export type PublishRequest = {
  targetType: PublishTargetType;
  domainId?: string;
  path?: string;
  webflowIntegrationId?: string;
  webflowSubdomain?: string;
};

export type ScheduleRequest = {
  publishAt?: string;
  unpublishAt?: string;
  targetType?: PublishTargetType;
  domainId?: string;
  path?: string;
  webflowIntegrationId?: string;
  webflowSubdomain?: string;
};

export type PageScripts = {
  header?: string;
  footer?: string;
};

export type Page = {
  id: string;
  workspaceId: string;
  folderId: string | null;
  name: string;
  slug: string;
  contentJson: object;
  lastPublishedContentJson?: object | null;
  scripts?: PageScripts | null;
  publishConfig?: object;
  formBindings?: PageFormBinding[];
  version: number;
  createdAt: string;
};

export type PageFormBinding = {
  id?: string;
  formId?: string | null;
  blockId?: string | null;
  type: 'native' | 'hooked';
  selector?: string | null;
  fieldMappings?: Record<string, string>;
};

export type DetectedFormField = {
  name: string;
  id: string;
  type: string;
  label?: string;
  suggestedCanonical?: string | null;
};

export type DetectedForm = {
  selector: string;
  fields: DetectedFormField[];
};

export type IntegrationListItem = {
  id: string;
  type: string;
  hasConfig: boolean;
  createdAt: string;
};

export type IntegrationDetail = {
  id: string;
  type: string;
  config: { webhookUrl?: string } | null;
  createdAt: string;
};

export type Form = {
  id: string;
  workspaceId: string;
  name: string;
  schemaJson: FormFieldSchema[] | object;
  version: number;
};

export type SecurityHeaders = {
  hstsEnabled?: boolean;
  xFrameOptions?: 'DENY' | 'SAMEORIGIN' | null;
};

export type Domain = {
  id: string;
  workspaceId: string;
  hostname: string;
  status: string;
  verificationTxt?: string | null;
  verificationCheckedAt?: string | null;
  verificationError?: string | null;
  cnameTarget?: string | null;
  sslStatus?: string | null;
  embedPolicy?: string | null;
  custom404PageId?: string | null;
  securityHeaders?: SecurityHeaders | null;
  redirects?: Array<{ from: string; to: string; status: number }> | null;
  createdAt: string;
};

export type Submission = {
  id: string;
  workspaceId: string;
  pageId: string;
  payloadJson: object;
  deliveryStatus?: string | null;
  createdAt: string;
  page?: { id: string; name: string; slug: string };
};

export type Folder = {
  id: string;
  workspaceId: string;
  parentId: string | null;
  name: string;
};

export type FolderNode = Folder & {
  children: FolderNode[];
};

export type BlockLibraryItem = {
  id: string;
  folderId: string;
  name: string;
  type: 'element' | 'block';
  blockJson: object;
  createdAt: string;
};

export type BlockLibraryFolder = {
  id: string;
  workspaceId: string;
  name: string;
  createdAt: string;
  items: BlockLibraryItem[];
};

export type ImportJobResponse = {
  jobId: string;
  status: string;
};

export type ImportJobStatus = {
  jobId: string;
  status: string;
  stage?: string;
  resultPageId?: string;
  errorCode?: string;
  errorMessage?: string;
  stats?: {
    sectionsDetected: number;
    blocksCreated: number;
    tierA: number;
    tierB: number;
    tierC: number;
    tierD: number;
    assetsExtracted: number;
    warnings: string[];
  };
  sourceRetained: boolean;
  schemaVersion: number;
  createdAt: string;
  updatedAt: string;
};
