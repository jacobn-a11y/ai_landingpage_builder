import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Outlet } from 'react-router-dom';
import { NavSidebar } from './NavSidebar';
import { UploadPageModal } from '@/features/upload/UploadPageModal';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { api, type FolderNode } from '@/lib/api';
import { Upload } from 'lucide-react';

export function AppLayout() {
  const navigate = useNavigate();
  const { role } = useAuth();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [folders, setFolders] = useState<FolderNode[]>([]);

  const fetchFolders = useCallback(async () => {
    try {
      const { folders: f } = await api.folders.list();
      setFolders(f);
    } catch {
      setFolders([]);
    }
  }, []);

  useEffect(() => {
    if (uploadOpen) fetchFolders();
  }, [uploadOpen, fetchFolders]);

  const isViewer = role === 'Viewer';

  return (
    <div className="flex min-h-screen">
      <NavSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        {!isViewer && (
          <div className="flex justify-end items-center h-14 px-4 border-b bg-background shrink-0">
            <Button
              size="lg"
              className="gap-2"
              onClick={() => setUploadOpen(true)}
            >
              <Upload className="h-5 w-5" />
              Upload page
            </Button>
          </div>
        )}
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>

      <UploadPageModal
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        folders={folders}
        onFormMapping={(pageId, hasForms) => {
          if (hasForms) {
            setUploadOpen(false);
            navigate(`/pages?mapForm=${pageId}`);
          }
        }}
      />
    </div>
  );
}
