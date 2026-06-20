import * as React from 'react';
import {
  LayoutDashboard,
  CalendarDays,
  PawPrint,
  Users,
  FileText,
  Receipt,
  Package,
  BarChart3,
  FlaskConical,
  BedDouble,
  UserCog,
  Settings,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar';
import { NavMain } from './nav-main';
import { NavUser } from './nav-user';

const NAV_GROUPS = [
  {
    title: 'Main',
    items: [
      { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    title: 'Clinical',
    items: [
      { title: 'Appointments', href: '/appointments', icon: CalendarDays },
      {
        title: 'Patients',
        href: '/patients',
        icon: PawPrint,
        items: [
          { title: 'Owners', href: '/owners' },
          { title: 'Pets', href: '/patients' },
        ],
      },
      { title: 'Medical Records', href: '/emr', icon: FileText },
      { title: 'Laboratory', href: '/laboratory', icon: FlaskConical },
      { title: 'Ward', href: '/ward', icon: BedDouble },
    ],
  },
  {
    title: 'Operations',
    items: [
      { title: 'Billing', href: '/billing', icon: Receipt },
      { title: 'Inventory', href: '/inventory', icon: Package },
      { title: 'Reports', href: '/reports', icon: BarChart3 },
    ],
  },
  {
    title: 'System',
    items: [
      { title: 'Staff', href: '/staff', icon: UserCog },
      { title: 'Settings', href: '/settings', icon: Settings },
    ],
  },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="/dashboard">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-brand-600 text-white shrink-0">
                  <PawPrint className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">PawCare HMS</span>
                  <span className="text-muted-foreground truncate text-xs">Hospital Management</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain groups={NAV_GROUPS} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
