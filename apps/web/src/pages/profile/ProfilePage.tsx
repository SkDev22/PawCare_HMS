import { UserCircle2 } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/stores/auth.store';

export function ProfilePage() {
  const user = useAuthStore((s) => s.user);

  const initials = user
    ? `${user.first_name[0]}${user.last_name[0]}`.toUpperCase()
    : '??';
  const roleLabel = user?.role.toLowerCase().replace('_', ' ') ?? '';

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold">My Profile</h1>
        <p className="text-sm text-muted-foreground">Your account details</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center gap-4 space-y-0">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="bg-brand-100 text-brand-700 text-lg font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <CardTitle>{user ? `${user.first_name} ${user.last_name}` : '—'}</CardTitle>
            <Badge variant="secondary" className="capitalize mt-1">{roleLabel}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center justify-between border-t pt-3">
            <span className="text-muted-foreground">Email</span>
            <span className="font-medium">{user?.email ?? '—'}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-center gap-3 p-4 text-sm text-muted-foreground">
          <UserCircle2 className="h-5 w-5 shrink-0" />
          Editing your profile, password, and avatar is coming soon.
        </CardContent>
      </Card>
    </div>
  );
}
