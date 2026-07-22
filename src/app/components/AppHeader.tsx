import { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger,
  DropdownMenuShortcut 
} from './ui/dropdown-menu';
import { 
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator
} from './ui/command';
import { 
  Popover,
  PopoverContent,
  PopoverTrigger
} from './ui/popover';
import { ScrollArea } from './ui/scroll-area';
import { useApp, useNotifications } from '../lib/store';
import { searchTickets, searchDowntimes, searchUsers, searchErrorReports, searchFeatures } from '../lib/api/services';
import { setFocusResource } from '../lib/resource-focus';
import { labelRole } from '../lib/ui-labels';
import { SearchResult } from '../types';
import { 
  Search, 
  Bell, 
  Plus, 
  Settings, 
  LogOut, 
  User, 
  Moon, 
  Sun,
  Zap,
  UserPlus,
  Download,
  FileText,
  Bug,
  Wrench,
  AlertTriangle,
  Calendar
} from 'lucide-react';

interface AppHeaderProps {
  onNavigate: (view: string) => void;
  onOpenQuickAction: (actionId: string) => void;
}

export function AppHeader({ onNavigate, onOpenQuickAction }: AppHeaderProps) {
  const { state, dispatch } = useApp();
  const { notifications, unreadCount, markAsRead, markAllAsRead, logout } = useNotifications();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // Global search functionality
  const performSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const [tickets, errors, features, downtimes, users] = await Promise.all([
        searchTickets(query).catch(() => []),
        searchErrorReports(query).catch(() => []),
        searchFeatures(query).catch(() => []),
        searchDowntimes(query).catch(() => []),
        state.currentUser?.role === 'admin' ? searchUsers(query).catch(() => []) : Promise.resolve([]),
      ]);

      const results: SearchResult[] = [
        ...tickets.map((ticket) => ({
          id: ticket.id,
          type: 'ticket' as const,
          title: ticket.title,
          description: `${ticket.id} • ${ticket.status} • ${ticket.priority}`,
          url: `/tickets?id=${ticket.id}`,
          relevanceScore: 1,
          createdAt: ticket.dateReported,
        })),
        ...errors.map((report) => ({
          id: report.id,
          type: 'error' as const,
          title: report.title,
          description: `${report.id} • ${report.status} • ${report.priority}`,
          url: `/error-reports?id=${report.id}`,
          relevanceScore: 1,
          createdAt: report.dateReported,
        })),
        ...features.map((feature) => ({
          id: feature.id,
          type: 'feature' as const,
          title: feature.title,
          description: `${feature.id} • ${feature.status} • ${feature.priority}`,
          url: `/feature-requests?id=${feature.id}`,
          relevanceScore: 1,
          createdAt: feature.createdAt,
        })),
        ...downtimes.map((downtime) => ({
          id: downtime.id,
          type: 'downtime' as const,
          title: downtime.title,
          description: `${downtime.id} • ${downtime.type} • ${downtime.status}`,
          url: `/downtime?id=${downtime.id}`,
          relevanceScore: 1,
          createdAt: downtime.startTime,
        })),
        ...users.map((user) => ({
          id: user.id,
          type: 'user' as const,
          title: user.name,
          description: `${user.email} • ${user.role}${user.team ? ` • ${user.team}` : ''}`,
          url: `/users`,
          relevanceScore: 1,
          createdAt: user.createdAt,
        })),
      ];
      setSearchResults(results.slice(0, 10));
    } catch {
      setSearchResults([]);
    }
  };

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      performSearch(searchQuery);
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        switch (e.key) {
          case 'k':
            e.preventDefault();
            setSearchOpen(true);
            break;
          case 'n':
            e.preventDefault();
            onOpenQuickAction('new-ticket');
            break;
          case 'd':
            e.preventDefault();
            onOpenQuickAction('log-downtime');
            break;
          case 'a':
            if (['admin', 'team_lead'].includes(state.currentUser?.role || '')) {
              e.preventDefault();
              onOpenQuickAction('assign-ticket');
            }
            break;
          case 'e':
            if (state.currentUser?.role === 'admin') {
              e.preventDefault();
              onOpenQuickAction('export-reports');
            }
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [state.currentUser, onOpenQuickAction]);

  const handleSearchSelect = (result: SearchResult) => {
    setSearchOpen(false);
    setSearchQuery('');

    const routeByType: Record<SearchResult['type'], string> = {
      ticket: '/tickets',
      error: '/error-reports',
      feature: '/feature-requests',
      downtime: '/downtime',
      user: '/users',
      comment: '/mentions',
    };

    if (result.type === 'ticket' || result.type === 'error' || result.type === 'feature') {
      setFocusResource(result.type, result.id);
    }

    onNavigate(routeByType[result.type] ?? '/');
  };

  const handleNotificationClick = (notification: any) => {
    markAsRead(notification.id);
    if (notification.ticketId) {
      setFocusResource('ticket', notification.ticketId);
      onNavigate('/tickets');
    } else if (notification.downtimeId) {
      onNavigate('/downtime');
    }
    setNotificationsOpen(false);
  };

  const getSearchIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'ticket': return Bug;
      case 'error': return AlertTriangle;
      case 'feature': return Wrench;
      case 'downtime': return Zap;
      case 'user': return User;
      default: return FileText;
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'sla_breach': return '🚨';
      case 'ticket_assigned': return '📋';
      case 'downtime_alert': return '⚡';
      case 'comment_mention': return '💬';
      default: return '📢';
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  if (!state.currentUser) return null;

  return (
    <header className="sticky top-0 z-50 shrink-0 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 w-full items-center px-4 md:px-8">
        {/* Global Search */}
        <div className="flex-1 flex items-center gap-4">
          <Button
            variant="outline"
            className="relative h-9 w-9 p-0 md:h-10 md:w-64 md:justify-start md:px-3 md:py-2"
            onClick={() => setSearchOpen(true)}
          >
            <Search className="h-4 w-4 md:mr-2" />
            <span className="hidden md:inline-flex">Search across the system...</span>
            <kbd className="pointer-events-none absolute right-1.5 top-2 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 md:flex">
              <span className="text-xs">⌘</span>K
            </kbd>
          </Button>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2">
          {state.quickActions.filter(action => 
            action.roles.includes(state.currentUser?.role || 'reporter')
          ).map(action => {
            const IconComponent = action.id === 'new-ticket' ? Plus :
                               action.id === 'log-downtime' ? Zap :
                               action.id === 'assign-ticket' ? UserPlus :
                               action.id === 'export-reports' ? Download : Plus;
            
            return (
              <Button
                key={action.id}
                variant="ghost"
                size="sm"
                onClick={() => onOpenQuickAction(action.id)}
                className="hidden md:flex"
              >
                <IconComponent className="h-4 w-4 mr-2" />
                {action.label}
              </Button>
            );
          })}

          {/* Mobile Quick Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="md:hidden">
                <Plus className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {state.quickActions.filter(action => 
                action.roles.includes(state.currentUser?.role || 'reporter')
              ).map(action => (
                <DropdownMenuItem 
                  key={action.id}
                  onClick={() => onOpenQuickAction(action.id)}
                >
                  {action.label}
                  {action.shortcut && (
                    <DropdownMenuShortcut>{action.shortcut}</DropdownMenuShortcut>
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Notifications */}
        <Popover open={notificationsOpen} onOpenChange={setNotificationsOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="relative ml-2">
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs">
                  {unreadCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="end">
            <div className="flex items-center justify-between p-4 border-b">
              <h4 className="font-medium">Notifications</h4>
              {unreadCount > 0 && (
                <Button variant="ghost" size="sm" onClick={markAllAsRead}>
                  Mark all as read
                </Button>
              )}
            </div>
            <ScrollArea className="h-96">
              {notifications.length > 0 ? (
                <div className="space-y-1 p-2">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`flex items-start gap-3 rounded-lg p-3 cursor-pointer hover:bg-muted/50 ${
                        !notification.isRead ? 'bg-muted/30' : ''
                      }`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <span className="text-lg">{getNotificationIcon(notification.type)}</span>
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium">{notification.title}</p>
                        <p className="text-xs text-muted-foreground">{notification.message}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatTimeAgo(notification.createdAt)}
                        </p>
                      </div>
                      {!notification.isRead && (
                        <div className="w-2 h-2 rounded-full bg-primary"></div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No notifications</p>
                </div>
              )}
            </ScrollArea>
          </PopoverContent>
        </Popover>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full ml-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={state.currentUser.avatar} alt={state.currentUser.name} />
                <AvatarFallback>
                  {state.currentUser.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{state.currentUser.name}</p>
                <p className="text-xs leading-none text-muted-foreground">
                  {state.currentUser.email}
                </p>
                <Badge variant="outline" className="w-fit mt-1">
                  {labelRole(state.currentUser.role)}
                </Badge>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onNavigate('/settings')}>
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onNavigate('/settings')}>
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => dispatch({ type: 'TOGGLE_DARK_MODE' })}>
              {state.currentUser.preferences.darkMode ? (
                <>
                  <Sun className="mr-2 h-4 w-4" />
                  <span>Light mode</span>
                </>
              ) : (
                <>
                  <Moon className="mr-2 h-4 w-4" />
                  <span>Dark mode</span>
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={logout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Global Search Dialog */}
      <CommandDialog open={searchOpen} onOpenChange={setSearchOpen}>
        <CommandInput 
          placeholder="Search tickets, errors, features, downtime..."
          value={searchQuery}
          onValueChange={setSearchQuery}
        />
        <CommandList>
          <CommandEmpty>No results.</CommandEmpty>
          {searchResults.length > 0 && (
            <>
              <CommandGroup heading="Search results">
                {searchResults.map((result) => {
                  const IconComponent = getSearchIcon(result.type);
                  return (
                    <CommandItem
                      key={result.id}
                      onSelect={() => handleSearchSelect(result)}
                      className="flex items-center gap-2"
                    >
                      <IconComponent className="h-4 w-4" />
                      <div className="flex-1">
                        <div className="font-medium">{result.title}</div>
                        <div className="text-xs text-muted-foreground">{result.description}</div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {result.type}
                      </Badge>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
              <CommandSeparator />
            </>
          )}
          <CommandGroup heading="Quick actions">
            <CommandItem onSelect={() => { setSearchOpen(false); onNavigate('/'); }}>
              <Calendar className="mr-2 h-4 w-4" />
              Open Dashboard
            </CommandItem>
            <CommandItem onSelect={() => { setSearchOpen(false); onNavigate('/error-reports'); }}>
              <Bug className="mr-2 h-4 w-4" />
              View Error Reports
            </CommandItem>
            <CommandItem onSelect={() => { setSearchOpen(false); onNavigate('/downtime'); }}>
              <Zap className="mr-2 h-4 w-4" />
              View Downtime Monitoring
            </CommandItem>
            <CommandItem onSelect={() => { setSearchOpen(false); onNavigate('/team-performance'); }}>
              <Wrench className="mr-2 h-4 w-4" />
              Open Team Performance
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </header>
  );
}