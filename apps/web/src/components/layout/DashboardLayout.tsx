import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from './sidebar/app-sidebar';
import { SiteHeader } from './header';
import { TrialBanner } from './TrialBanner';

interface Props {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: Props) {
  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar variant="inset" />
      <SidebarInset className="print:m-0 print:rounded-none print:shadow-none">
        <SiteHeader />
        <TrialBanner />
        <div className="flex flex-1 flex-col">
          <div className="flex-1 p-6 print:p-0">
            {children}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
