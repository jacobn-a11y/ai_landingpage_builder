import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api, type WorkspaceUser } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function UsersFeature() {
  const { user, workspaceId } = useAuth();
  const [users, setUsers] = useState<WorkspaceUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<string>('Editor');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [removeLoading, setRemoveLoading] = useState<string | null>(null);

  const fetchUsers = async () => {
    if (!workspaceId) return;
    try {
      const { users: u } = await api.workspaces.getUsers(workspaceId);
      setUsers(u);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [workspaceId]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviteError(null);
    setInviteLoading(true);
    try {
      await api.invites.create({
        email: inviteEmail.trim(),
        role: inviteRole,
      });
      setInviteEmail('');
      await fetchUsers();
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'Failed to invite');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleRemove = async (targetId: string) => {
    if (!user || targetId === user.id) return;
    setRemoveLoading(targetId);
    try {
      await api.users.remove(targetId);
      await fetchUsers();
    } finally {
      setRemoveLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Users</h1>
        <p className="mt-2 text-muted-foreground">
          Invite and manage workspace users and roles.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invite user</CardTitle>
          <CardDescription>
            Send an invite link. The user will sign in with Google to join.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleInvite} className="flex flex-wrap gap-4">
            <Input
              type="email"
              placeholder="email@example.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="w-64"
            />
            <Select value={inviteRole} onValueChange={setInviteRole}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Admin">Admin</SelectItem>
                <SelectItem value="Editor">Editor</SelectItem>
                <SelectItem value="Viewer">Viewer</SelectItem>
              </SelectContent>
            </Select>
            <Button type="submit" disabled={inviteLoading}>
              {inviteLoading ? 'Inviting...' : 'Invite'}
            </Button>
          </form>
          {inviteError && (
            <p className="mt-2 text-sm text-destructive">{inviteError}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Workspace users</CardTitle>
          <CardDescription>
            Users with access to this workspace. Remove to revoke access immediately.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>{u.role}</TableCell>
                  <TableCell>
                    {new Date(u.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {u.id !== user?.id && (
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={removeLoading === u.id}
                        onClick={() => handleRemove(u.id)}
                      >
                        {removeLoading === u.id ? 'Removing...' : 'Remove'}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
