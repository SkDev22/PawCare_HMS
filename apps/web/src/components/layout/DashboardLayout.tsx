import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from './sidebar/app-sidebar';
import { SiteHeader } from './header';

interface Props {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: Props) {
  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="flex-1 p-6">
            {children}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
