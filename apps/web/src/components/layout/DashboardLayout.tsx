import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AppSidebar } from './sidebar/app-sidebar';
import { SiteHeader } from './header';
import { TrialBanner } from './TrialBanner';
import { PaymentReminderBanner } from './PaymentReminderBanner';
import { useClinicTheme } from '@/hooks/use-clinic-theme';
import { useIdleLogout } from '@/hooks/use-idle-logout';

interface Props {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: Props) {
  useClinicTheme();
  const { secondsLeft, stayLoggedIn } = useIdleLogout();

  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar variant="inset" />
      <SidebarInset className="print:m-0 print:rounded-none print:shadow-none">
        <SiteHeader />
        <TrialBanner />
        <PaymentReminderBanner />
        <div className="flex flex-1 flex-col">
          <div className="flex-1 p-6 print:p-0">
            {children}
          </div>
        </div>
      </SidebarInset>

      <Dialog
        open={secondsLeft !== null}
        onOpenChange={(open) => {
          // Dismissing via the X or Escape counts as "I'm here" too.
          if (!open) stayLoggedIn();
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Still there?</DialogTitle>
            <DialogDescription>
              You'll be logged out in {secondsLeft ?? 0} second{secondsLeft === 1 ? '' : 's'} due to inactivity.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={stayLoggedIn}>Stay logged in</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
