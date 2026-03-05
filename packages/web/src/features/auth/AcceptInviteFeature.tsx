import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export function AcceptInviteFeature() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) return;
    window.location.href = `/api/v1/invites/accept?token=${encodeURIComponent(token)}`;
  }, [token]);

  if (!token) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30">
        <div className="w-full max-w-sm space-y-6 rounded-lg border bg-card p-8 shadow-sm">
          <div className="space-y-2 text-center">
            <h1 className="text-2xl font-semibold">Invalid Invite</h1>
            <p className="text-sm text-muted-foreground">
              This invite link is invalid or missing a token.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30">
      <div className="w-full max-w-sm space-y-6 rounded-lg border bg-card p-8 shadow-sm">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold">Accept Invite</h1>
          <p className="text-sm text-muted-foreground">
            Redirecting to sign in with Google...
          </p>
        </div>
        <Button
          className="w-full"
          onClick={() => {
            window.location.href = `/api/v1/invites/accept?token=${encodeURIComponent(token)}`;
          }}
          size="lg"
        >
          Accept invite and sign in
        </Button>
      </div>
    </div>
  );
}
