import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AppLayout } from '@/components/layout/AppLayout';
import { LoginFeature } from '@/features/auth/LoginFeature';
import { AcceptInviteFeature } from '@/features/auth/AcceptInviteFeature';
import { PagesFeature } from '@/features/pages/PagesFeature';
import { FormsFeature } from '@/features/forms/FormsFeature';
import { SubmissionsFeature } from '@/features/submissions/SubmissionsFeature';
import { PublishingFeature } from '@/features/publishing/PublishingFeature';
import { DomainsFeature } from '@/features/domains/DomainsFeature';
import { IntegrationsFeature } from '@/features/integrations/IntegrationsFeature';
import { ScriptsFeature } from '@/features/scripts/ScriptsFeature';
import { UsersFeature } from '@/features/users/UsersFeature';
import { SettingsFeature } from '@/features/settings/SettingsFeature';

const PageEditFeature = lazy(() => import('@/features/pages/PageEditFeature').then((m) => ({ default: m.PageEditFeature })));
const FormBuilderFeature = lazy(() => import('@/features/forms/FormBuilderFeature').then((m) => ({ default: m.FormBuilderFeature })));

function RouteFallback() {
  return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginFeature />} />
      <Route path="/accept-invite" element={<AcceptInviteFeature />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/pages" replace />} />
        <Route path="pages" element={<PagesFeature />} />
        <Route
          path="pages/:id/edit"
          element={
            <ErrorBoundary>
              <Suspense fallback={<RouteFallback />}>
                <PageEditFeature />
              </Suspense>
            </ErrorBoundary>
          }
        />
        <Route path="forms" element={<FormsFeature />} />
        <Route
          path="forms/:id"
          element={
            <Suspense fallback={<RouteFallback />}>
              <FormBuilderFeature />
            </Suspense>
          }
        />
        <Route path="submissions" element={<SubmissionsFeature />} />
        <Route path="publishing" element={<PublishingFeature />} />
        <Route
          path="domains"
          element={
            <ProtectedRoute requireAdmin>
              <DomainsFeature />
            </ProtectedRoute>
          }
        />
        <Route
          path="integrations"
          element={
            <ProtectedRoute requireAdmin>
              <IntegrationsFeature />
            </ProtectedRoute>
          }
        />
        <Route
          path="scripts"
          element={
            <ProtectedRoute requireAdmin>
              <ScriptsFeature />
            </ProtectedRoute>
          }
        />
        <Route
          path="users"
          element={
            <ProtectedRoute requireAdmin>
              <UsersFeature />
            </ProtectedRoute>
          }
        />
        <Route path="settings" element={<SettingsFeature />} />
      </Route>
    </Routes>
  );
}

export default App;
