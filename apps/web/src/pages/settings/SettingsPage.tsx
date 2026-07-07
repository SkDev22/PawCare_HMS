import { Building2, Bell, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const SECTIONS = [
  {
    icon: Building2,
    title: 'Clinic Information',
    description: 'Name, address, contact details, timezone, and currency.',
  },
  {
    icon: Bell,
    title: 'Notification Preferences',
    description: 'Choose how and when you receive reminders and alerts.',
  },
  {
    icon: ShieldCheck,
    title: 'Security',
    description: 'Password policy and session management.',
  },
];

export function SettingsPage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">Clinic and account configuration</p>
      </div>

      <div className="space-y-4">
        {SECTIONS.map((section) => (
          <Card key={section.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div className="flex items-center gap-3">
                <section.icon className="h-5 w-5 text-muted-foreground shrink-0" />
                <CardTitle className="text-base">{section.title}</CardTitle>
              </div>
              <Badge variant="secondary">Coming soon</Badge>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{section.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
