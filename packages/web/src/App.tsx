import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AppLayout } from '@/components/layout/AppLayout';
import { LoginFeature } from '@/features/auth/LoginFeature';
import { AcceptInviteFeature } from '@/features/auth/AcceptInviteFeature';
import { PagesFeature } from '@/features/pages/PagesFeature';
import { PageEditFeature } from '@/features/pages/PageEditFeature';
import { FormsFeature } from '@/features/forms/FormsFeature';
import { FormBuilderFeature } from '@/features/forms/FormBuilderFeature';
import { SubmissionsFeature } from '@/features/submissions/SubmissionsFeature';
import { PublishingFeature } from '@/features/publishing/PublishingFeature';
import { DomainsFeature } from '@/features/domains/DomainsFeature';
import { IntegrationsFeature } from '@/features/integrations/IntegrationsFeature';
import { ScriptsFeature } from '@/features/scripts/ScriptsFeature';
import { UsersFeature } from '@/features/users/UsersFeature';
import { SettingsFeature } from '@/features/settings/SettingsFeature';

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
        <Route path="pages/:id/edit" element={<PageEditFeature />} />
        <Route path="forms" element={<FormsFeature />} />
        <Route path="forms/:id" element={<FormBuilderFeature />} />
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
        <Route path="scripts" element={<ScriptsFeature />} />
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
