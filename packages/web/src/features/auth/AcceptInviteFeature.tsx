import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';

export function AcceptInviteFeature() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const acceptInvite = async (inviteToken: string) => {
    setLoading(true);
    setError(null);
    try {
      const { redirectUrl } = await api.invites.accept(inviteToken);
      window.location.href = redirectUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept invite');
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    acceptInvite(token);
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
            {error ? error : 'Redirecting to sign in with Google...'}
          </p>
        </div>
        <Button
          className="w-full"
          onClick={() => acceptInvite(token)}
          disabled={loading}
          size="lg"
        >
          Accept invite and sign in
        </Button>
      </div>
    </div>
  );
}
