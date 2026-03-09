import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  FileText,
  FormInput,
  Inbox,
  Send,
  Globe,
  Plug,
  Code,
  Users,
  Settings,
  LogOut,
  Layers,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

const navItems = [
  { to: '/pages', label: 'Pages', icon: FileText },
  { to: '/forms', label: 'Forms', icon: FormInput },
  { to: '/submissions', label: 'Submissions', icon: Inbox },
  { to: '/publishing', label: 'Publishing', icon: Send },
  { to: '/domains', label: 'Domains', icon: Globe, adminOnly: true },
  { to: '/integrations', label: 'Integrations', icon: Plug, adminOnly: true },
  { to: '/scripts', label: 'Scripts', icon: Code, adminOnly: true },
  { to: '/users', label: 'Users', icon: Users, adminOnly: true },
  { to: '/settings', label: 'Settings', icon: Settings },
] as const;

export function NavSidebar() {
  const { isAdmin, user, logout } = useAuth();
  return (
    <aside className="flex w-56 flex-col border-r bg-muted/30 min-h-screen">
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Layers className="h-4 w-4" />
        </div>
        <span className="font-semibold tracking-tight">Replica Pages</span>
      </div>
      <nav className="flex flex-col gap-1 p-2">
        {navItems
          .filter((item) => !(item as { adminOnly?: boolean }).adminOnly || isAdmin)
          .map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )
            }
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto border-t p-2">
        <div className="mb-2 px-3 py-1 text-xs text-muted-foreground truncate" title={user?.email}>
          {user?.email}
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
          onClick={logout}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Sign out
        </Button>
      </div>
    </aside>
  );
}
