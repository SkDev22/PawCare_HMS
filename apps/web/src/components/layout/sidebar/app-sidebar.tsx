import * as React from "react";
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
  type LucideIcon,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import type { PermissionKey } from "@pawcare/shared";
import { useAuthStore } from "@/stores/auth.store";
import { hasPermission } from "@/lib/permissions";
import { NavMain } from "./nav-main";
import { NavUser } from "./nav-user";

const NAV_GROUPS: {
  title: string;
  items: {
    title: string;
    href: string;
    icon: LucideIcon;
    permission?: PermissionKey;
    items?: { title: string; href: string }[];
  }[];
}[] = [
  {
    title: "Main",
    items: [{ title: "Dashboard", href: "/dashboard", icon: LayoutDashboard, permission: "DASHBOARD_READ" }],
  },
  {
    title: "Clinical",
    items: [
      {
        title: "Appointments",
        href: "/appointments",
        icon: CalendarDays,
        permission: "APPOINTMENT_READ",
        items: [
          { title: "All Appointments", href: "/appointments" },
          { title: "Queue", href: "/appointments/queue" },
        ],
      },
      {
        title: "Patients",
        href: "/patients",
        icon: PawPrint,
        permission: "PATIENT_READ",
        items: [
          { title: "Owners", href: "/owners" },
          { title: "Pets", href: "/patients" },
        ],
      },
      { title: "Medical Records", href: "/emr", icon: FileText, permission: "MEDICAL_RECORD_READ" },
      { title: "Laboratory", href: "/lab", icon: FlaskConical, permission: "LAB_ORDER_WRITE" },
      { title: "Ward", href: "/ward", icon: BedDouble, permission: "WARD_READ" },
    ],
  },
  {
    title: "Operations",
    items: [
      { title: "Billing", href: "/billing", icon: Receipt, permission: "INVOICE_READ" },
      { title: "Inventory", href: "/inventory", icon: Package, permission: "INVENTORY_READ" },
      { title: "Reports", href: "/reports", icon: BarChart3, permission: "REPORT_READ" },
    ],
  },
  {
    title: "System",
    items: [
      { title: "Staff", href: "/staff", icon: UserCog, permission: "STAFF_READ" },
      { title: "Settings", href: "/settings", icon: Settings },
    ],
  },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const role = useAuthStore((s) => s.user?.role);

  const visibleGroups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => !item.permission || hasPermission(role, item.permission)),
  })).filter((group) => group.items.length > 0);

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
                  <span className="text-muted-foreground truncate text-xs">
                    Hospital Management
                  </span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain groups={visibleGroups} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
