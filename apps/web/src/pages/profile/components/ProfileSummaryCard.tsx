import type { ComponentType } from 'react';
import { Mail, Phone, Stethoscope, BadgeCheck } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useAuthStore } from '@/stores/auth.store';

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string | undefined;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex size-8 items-center justify-center rounded-lg bg-muted shrink-0">
        <Icon className="size-3.5 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground leading-none">{label}</p>
        <p className={`text-sm mt-1 truncate ${value ? 'font-medium' : 'text-muted-foreground italic'}`}>
          {value || 'Not set'}
        </p>
      </div>
    </div>
  );
}

export function ProfileSummaryCard() {
  const user = useAuthStore((s) => s.user);

  const initials = user
    ? `${user.first_name[0]}${user.last_name[0]}`.toUpperCase()
    : '??';
  const roleLabel = user?.role.toLowerCase().replace('_', ' ') ?? '';
  const showSpecialization = user?.role === 'VETERINARIAN';
  const showLicense = user?.role === 'VETERINARIAN' || user?.role === 'LAB_TECHNICIAN';

  return (
    <Card className="overflow-hidden">
      <div className="h-16 bg-gradient-to-r from-brand-500 to-brand-700" />
      <CardContent className="flex flex-col items-center px-6 pb-6 pt-0 text-center">
        <Avatar className="-mt-10 h-20 w-20 border-4 border-card shadow-sm">
          <AvatarFallback className="bg-brand-100 text-brand-700 text-xl font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
        <h2 className="mt-3 text-lg font-semibold leading-tight">
          {user ? `${user.first_name} ${user.last_name}` : '—'}
        </h2>
        <Badge variant="secondary" className="capitalize mt-2">
          {roleLabel}
        </Badge>
        <p className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground">
          <Mail className="size-3.5 shrink-0" />
          <span className="truncate">{user?.email}</span>
        </p>
      </CardContent>

      <Separator />

      <CardContent className="space-y-3 px-6 py-5">
        <InfoRow icon={Phone} label="Phone" value={user?.phone} />
        {showSpecialization && (
          <InfoRow icon={Stethoscope} label="Specialization" value={user?.specialization} />
        )}
        {showLicense && (
          <InfoRow icon={BadgeCheck} label="License number" value={user?.license_number} />
        )}
      </CardContent>
    </Card>
  );
}
