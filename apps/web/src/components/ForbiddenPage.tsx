import { useNavigate } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export function ForbiddenPage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-1 items-center justify-center py-20">
      <Card className="max-w-sm w-full">
        <CardContent className="flex flex-col items-center text-center gap-3 p-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <ShieldAlert className="h-6 w-6 text-destructive" />
          </div>
          <div className="space-y-1">
            <p className="text-lg font-semibold">Access Denied</p>
            <p className="text-sm text-muted-foreground">
              Your role doesn't have permission to view this page.
            </p>
          </div>
          <Button size="sm" onClick={() => navigate('/dashboard')}>
            Go to Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
