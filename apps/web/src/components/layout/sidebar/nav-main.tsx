import * as React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ChevronRight, type LucideIcon } from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from '@/components/ui/sidebar';

type NavSubItem = {
  title: string;
  href: string;
};

type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  items?: NavSubItem[];
};

type NavGroup = {
  title: string;
  items: NavItem[];
};

export const pawCareNavGroups: NavGroup[] = [];

export function NavMain({ groups }: { groups: NavGroup[] }) {
  const location = useLocation();
  const { isMobile } = useSidebar();

  return (
    <>
      {groups.map((group) => (
        <SidebarGroup key={group.title} className="mb-2 first:mt-2">
          <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {group.items.map((item) =>
                Array.isArray(item.items) && item.items.length > 0 ? (
                  <SidebarMenuItem key={item.title}>
                    {/* Icon-only (collapsed): dropdown */}
                    <div className="hidden group-data-[collapsible=icon]:block">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <SidebarMenuButton tooltip={item.title}>
                            <item.icon />
                            <span>{item.title}</span>
                            <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                          </SidebarMenuButton>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          side={isMobile ? 'bottom' : 'right'}
                          align={isMobile ? 'end' : 'start'}
                          className="min-w-48 rounded-lg"
                        >
                          <DropdownMenuLabel>{item.title}</DropdownMenuLabel>
                          {item.items.map((sub) => (
                            <DropdownMenuItem key={sub.title} asChild>
                              <NavLink to={sub.href}>{sub.title}</NavLink>
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    {/* Expanded: collapsible */}
                    <Collapsible
                      defaultOpen={item.items.some((s) => s.href === location.pathname)}
                      className="group/collapsible block group-data-[collapsible=icon]:hidden"
                    >
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton tooltip={item.title}>
                          <item.icon />
                          <span className="truncate">{item.title}</span>
                          <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {item.items.map((sub) => (
                            <SidebarMenuSubItem key={sub.title}>
                              <SidebarMenuSubButton
                                isActive={location.pathname === sub.href}
                                asChild
                              >
                                <NavLink to={sub.href}>
                                  <span className="truncate">{sub.title}</span>
                                </NavLink>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </Collapsible>
                  </SidebarMenuItem>
                ) : (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      isActive={location.pathname === item.href}
                      tooltip={item.title}
                      asChild
                    >
                      <NavLink to={item.href}>
                        <item.icon />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                    {item.badge && (
                      <SidebarMenuBadge>{item.badge}</SidebarMenuBadge>
                    )}
                  </SidebarMenuItem>
                ),
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ))}
    </>
  );
}
