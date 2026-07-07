import { useState } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarFooter,
  SidebarRail,
} from "./ui/sidebar";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { useApp } from "../lib/store";
import {
  Home,
  Bug,
  Lightbulb,
  Zap,
  Users,
  Calendar,
  Settings,
  ChevronRight,
  Activity,
  TrendingUp,
  Clock,
  AlertTriangle,
  ExternalLink,
  Ticket as TicketIcon,
} from "lucide-react";

interface AppSidebarProps {
  activeView: string;
  onNavigate: (view: string) => void;
}

export function AppSidebar({ activeView, onNavigate }: AppSidebarProps) {
  const { state } = useApp();
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['main']));
  
  const currentUser = state.currentUser;

  const toggleGroup = (groupId: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId);
    } else {
      newExpanded.add(groupId);
    }
    setExpandedGroups(newExpanded);
  };

  type MenuSubItem = { id: string; title: string };
  type MenuItem = {
    id: string;
    title: string;
    icon: typeof Home;
    description: string;
    badge?: string;
    badgeVariant?: 'default' | 'secondary' | 'destructive' | 'outline';
    subItems?: MenuSubItem[];
  };
  type MenuGroup = { groupId: string; groupLabel: string; items: MenuItem[] };

  const menuItems: MenuGroup[] = [
    {
      groupId: 'main',
      groupLabel: 'Main Navigation',
      items: [
        {
          id: '/',
          title: 'Dashboard',
          icon: Home,
          description: 'Overview and analytics',
        },
        {
          id: '/tickets',
          title: 'Tickets',
          icon: TicketIcon,
          description: 'All tickets and public submissions',
        },
        {
          id: '/error-reports',
          title: 'Error Reports',
          icon: Bug,
          description: 'Track and manage error reports',
        },
        {
          id: '/feature-requests',
          title: 'Feature Requests',
          icon: Lightbulb,
          description: 'Feature requests and bug fixes',
        },
        {
          id: '/downtime',
          title: 'Downtime Monitoring',
          icon: Zap,
          description: 'Monitor system downtimes',
        },
        {
          id: '/calendar',
          title: 'Calendar View',
          icon: Calendar,
          description: 'Scheduled maintenance & deadlines',
        },
        {
          id: '/public-form',
          title: 'Public Form',
          icon: ExternalLink,
          description: 'Share public submission form',
        },
      ],
    },
    {
      groupId: 'analytics',
      groupLabel: 'Analytics & Reports',
      items: [
        {
          id: '/team-performance',
          title: 'Team Performance',
          icon: TrendingUp,
          description: 'Team metrics and analytics',
          subItems: currentUser?.role === 'admin' ? [
            { id: '/team-performance?view=overview', title: 'Overview' },
            { id: '/team-performance?view=sla', title: 'SLA Compliance' },
            { id: '/team-performance?view=workload', title: 'Team Workload' },
            { id: '/team-performance?view=trends', title: 'Performance Trends' },
          ] : undefined,
        },
      ],
    },
  ];

  // Add admin-only items
  if (currentUser?.role === 'admin') {
    menuItems.push({
      groupId: 'admin',
      groupLabel: 'Administration',
      items: [
        {
          id: '/users',
          title: 'User Management',
          icon: Users,
          description: 'Manage users and permissions',
        },
        {
          id: '/settings',
          title: 'System Settings',
          icon: Settings,
          description: 'Configure system settings',
        },
      ],
    });
  } else {
    // Add settings for non-admin users
    menuItems[0].items.push({
      id: '/settings',
      title: 'Settings',
      icon: Settings,
      description: 'User preferences',
    });
  }

  const isActive = (itemId: string) => {
    if (itemId === '/' && activeView === '/') return true;
    if (itemId !== '/' && activeView.startsWith(itemId)) return true;
    return false;
  };

  return (
    <Sidebar variant="inset" className="border-r">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-2">
          <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Activity className="size-4" />
          </div>
          <div className="grid flex-1 leading-tight">
            <span className="truncate font-semibold">IT Ticketing</span>
            <span className="truncate text-xs text-muted-foreground">
              Management System
            </span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {menuItems.map((group) => (
          <SidebarGroup key={group.groupId}>
            <SidebarGroupLabel 
              className="flex items-center justify-between cursor-pointer hover:bg-sidebar-accent rounded-md px-2 py-1"
              onClick={() => toggleGroup(group.groupId)}
            >
              <span>{group.groupLabel}</span>
              <ChevronRight 
                className={`h-4 w-4 transition-transform ${
                  expandedGroups.has(group.groupId) ? 'rotate-90' : ''
                }`}
              />
            </SidebarGroupLabel>
            
            {expandedGroups.has(group.groupId) && (
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map((item) => (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive(item.id)}
                        tooltip={item.description}
                      >
                        <button
                          onClick={() => onNavigate(item.id)}
                          className="w-full flex items-center gap-2"
                        >
                          <item.icon className="h-4 w-4" />
                          <span className="flex-1 text-left">{item.title}</span>
                          {item.badge && (
                            <Badge variant={item.badgeVariant} className="text-xs">
                              {item.badge}
                            </Badge>
                          )}
                        </button>
                      </SidebarMenuButton>
                      
                      {item.subItems && isActive(item.id) && (
                        <SidebarMenuSub>
                          {item.subItems.map((subItem) => (
                            <SidebarMenuSubItem key={subItem.id}>
                              <SidebarMenuSubButton
                                asChild
                                isActive={activeView === subItem.id}
                              >
                                <button onClick={() => onNavigate(subItem.id)}>
                                  {subItem.title}
                                </button>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      )}
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            )}
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <div className="px-2 py-2 space-y-2">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>Ticketing System</span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <AlertTriangle className="h-3 w-3" />
              <span>v1.0</span>
            </div>
          </div>
          
          {/* Current User Info */}
          {currentUser && (
            <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-sidebar-accent/50">
              <div className="flex aspect-square size-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">
                {currentUser.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div className="flex-1 leading-tight">
                <span className="text-xs font-medium truncate block">
                  {currentUser.name.split(' ')[0]}
                </span>
                <span className="text-xs text-muted-foreground capitalize">
                  {currentUser.role.replace('_', ' ')}
                </span>
              </div>
            </div>
          )}
        </div>
      </SidebarFooter>
      
      <SidebarRail />
    </Sidebar>
  );
}