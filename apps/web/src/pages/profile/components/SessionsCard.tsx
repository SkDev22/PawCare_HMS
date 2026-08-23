import { toast } from 'sonner';
import { MonitorX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRevokeOtherSessions } from '@/hooks/use-auth';

function getServerErrorMessage(err: unknown): string {
  if (
    err !== null &&
    typeof err === 'object' &&
    'response' in err &&
    err.response !== null &&
    typeof err.response === 'object' &&
    'data' in err.response
  ) {
    const data = err.response.data as { error?: { message?: string } };
    return data?.error?.message ?? 'Failed to sign out other sessions. Please try again.';
  }
  return 'Unable to connect to the server. Check your network.';
}

export function SessionsCard() {
  const revokeOthers = useRevokeOtherSessions();

  const handleClick = async () => {
    if (!window.confirm('Sign out of all other devices? You will stay signed in here.')) {
      return;
    }
    try {
      const { revokedCount } = await revokeOthers.mutateAsync();
      toast.success(
        revokedCount > 0
          ? `Signed out of ${revokedCount} other session${revokedCount === 1 ? '' : 's'}`
          : 'No other active sessions found',
      );
    } catch (err) {
      toast.error(getServerErrorMessage(err));
    }
  };

  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border p-4">
      <div className="flex gap-3">
        <MonitorX className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium">Sign out of all other devices</p>
          <p className="text-sm text-muted-foreground mt-0.5">
            Ends every other active session for your account. This device stays signed in.
          </p>
        </div>
      </div>
      <Button
        type="button"
        variant="outline"
        className="shrink-0"
        onClick={handleClick}
        disabled={revokeOthers.isPending}
      >
        {revokeOthers.isPending ? 'Signing out…' : 'Sign out others'}
      </Button>
    </div>
  );
}
