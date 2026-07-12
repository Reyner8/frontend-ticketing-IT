import { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { 
  AppState, 
  User, 
  Notification, 
  QuickAction, 
} from '../types';
import { getToken, clearToken } from './api/client';
import {
  fetchCurrentUser,
  fetchNotifications,
  fetchUnreadNotificationCount,
  logout as apiLogout,
  markNotificationRead as apiMarkRead,
  markAllNotificationsRead as apiMarkAllRead,
  fetchUsers,
  setCachedUsers,
} from './api/services';

const initialState: AppState = {
  currentUser: null,
  authLoading: true,
  notifications: [],
  unreadNotificationCount: 0,
  quickActions: [],
  loading: {},
  errors: {}
};

type AppAction = 
  | { type: 'SET_AUTH_LOADING'; payload: boolean }
  | { type: 'SET_LOADING'; payload: { key: string; value: boolean } }
  | { type: 'SET_ERROR'; payload: { key: string; value: string | null } }
  | { type: 'SET_USER'; payload: User | null }
  | { type: 'SET_NOTIFICATIONS'; payload: { notifications: Notification[]; unreadCount: number } }
  | { type: 'ADD_NOTIFICATION'; payload: Notification }
  | { type: 'MARK_NOTIFICATION_READ'; payload: string }
  | { type: 'MARK_ALL_NOTIFICATIONS_READ' }
  | { type: 'UPDATE_USER_PREFERENCES'; payload: Partial<User['preferences']> }
  | { type: 'SET_QUICK_ACTIONS'; payload: QuickAction[] }
  | { type: 'TOGGLE_DARK_MODE' }
  | { type: 'LOGOUT' };

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_AUTH_LOADING':
      return { ...state, authLoading: action.payload };

    case 'SET_LOADING':
      return {
        ...state,
        loading: {
          ...state.loading,
          [action.payload.key]: action.payload.value
        }
      };

    case 'SET_ERROR':
      return {
        ...state,
        errors: {
          ...state.errors,
          [action.payload.key]: action.payload.value
        }
      };

    case 'SET_USER':
      return {
        ...state,
        currentUser: action.payload
      };

    case 'SET_NOTIFICATIONS':
      return {
        ...state,
        notifications: action.payload.notifications,
        unreadNotificationCount: action.payload.unreadCount
      };

    case 'ADD_NOTIFICATION':
      return {
        ...state,
        notifications: [action.payload, ...state.notifications],
        unreadNotificationCount: state.unreadNotificationCount + 1
      };

    case 'MARK_NOTIFICATION_READ':
      return {
        ...state,
        notifications: state.notifications.map(n => 
          n.id === action.payload ? { ...n, isRead: true } : n
        ),
        unreadNotificationCount: Math.max(0, state.unreadNotificationCount - 1)
      };

    case 'MARK_ALL_NOTIFICATIONS_READ':
      return {
        ...state,
        notifications: state.notifications.map(n => ({ ...n, isRead: true })),
        unreadNotificationCount: 0
      };

    case 'UPDATE_USER_PREFERENCES':
      if (!state.currentUser) return state;
      return {
        ...state,
        currentUser: {
          ...state.currentUser,
          preferences: {
            ...state.currentUser.preferences,
            ...action.payload
          }
        }
      };

    case 'SET_QUICK_ACTIONS':
      return {
        ...state,
        quickActions: action.payload
      };

    case 'TOGGLE_DARK_MODE':
      if (!state.currentUser) return state;
      const newDarkMode = !state.currentUser.preferences.darkMode;
      document.documentElement.classList.toggle('dark', newDarkMode);
      return {
        ...state,
        currentUser: {
          ...state.currentUser,
          preferences: {
            ...state.currentUser.preferences,
            darkMode: newDarkMode
          }
        }
      };

    case 'LOGOUT':
      return {
        ...initialState,
        authLoading: false,
      };

    default:
      return state;
  }
}

const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
} | undefined>(undefined);

interface AppProviderProps {
  children: ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  useEffect(() => {
    const initAuth = async () => {
      const token = getToken();
      if (!token) {
        dispatch({ type: 'SET_AUTH_LOADING', payload: false });
        return;
      }

      try {
        const user = await fetchCurrentUser();
        dispatch({ type: 'SET_USER', payload: user });
        setCachedUsers([user]);

        if (user.preferences.darkMode) {
          document.documentElement.classList.add('dark');
        }

        const [notifications, unreadCount] = await Promise.all([
          fetchNotifications().catch(() => []),
          fetchUnreadNotificationCount().catch(() => 0),
        ]);
        dispatch({ type: 'SET_NOTIFICATIONS', payload: { notifications, unreadCount } });

        fetchUsers().catch(() => {});
      } catch {
        clearToken();
        dispatch({ type: 'SET_USER', payload: null });
      } finally {
        dispatch({ type: 'SET_AUTH_LOADING', payload: false });
      }
    };

    initAuth();
  }, []);

  useEffect(() => {
    if (state.currentUser) {
      const quickActions: QuickAction[] = [
        {
          id: 'new-ticket',
          label: 'New Ticket',
          icon: 'Plus',
          action: () => {},
          shortcut: 'Ctrl+N',
          roles: ['admin', 'team_lead', 'it_staff', 'reporter']
        }
      ];

      if (state.currentUser.role === 'it_staff') {
        quickActions.push({
          id: 'log-downtime',
          label: 'Log Downtime',
          icon: 'Zap',
          action: () => {},
          shortcut: 'Ctrl+D',
          roles: ['it_staff']
        });
      }

      if (['admin', 'team_lead'].includes(state.currentUser.role)) {
        quickActions.push({
          id: 'assign-ticket',
          label: 'Assign Ticket',
          icon: 'UserPlus',
          action: () => {},
          shortcut: 'Ctrl+A',
          roles: ['admin', 'team_lead']
        });
      }

      if (state.currentUser.role === 'admin') {
        quickActions.push({
          id: 'export-reports',
          label: 'Export Reports',
          icon: 'Download',
          action: () => {},
          shortcut: 'Ctrl+E',
          roles: ['admin']
        });
      }

      dispatch({ type: 'SET_QUICK_ACTIONS', payload: quickActions });
    }
  }, [state.currentUser]);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

export function useLoading(key: string) {
  const { state, dispatch } = useApp();
  
  const setLoading = (value: boolean) => {
    dispatch({ type: 'SET_LOADING', payload: { key, value } });
  };

  return [state.loading[key] || false, setLoading] as const;
}

export function useError(key: string) {
  const { state, dispatch } = useApp();
  
  const setError = (value: string | null) => {
    dispatch({ type: 'SET_ERROR', payload: { key, value } });
  };

  return [state.errors[key] || null, setError] as const;
}

export function useNotifications() {
  const { state, dispatch } = useApp();

  const markAsRead = async (notificationId: string) => {
    dispatch({ type: 'MARK_NOTIFICATION_READ', payload: notificationId });
    try {
      await apiMarkRead(notificationId);
    } catch {
      // optimistic update already applied
    }
  };

  const markAllAsRead = async () => {
    dispatch({ type: 'MARK_ALL_NOTIFICATIONS_READ' });
    try {
      await apiMarkAllRead();
    } catch {
      // optimistic update already applied
    }
  };

  const addNotification = (notification: Notification) => {
    dispatch({ type: 'ADD_NOTIFICATION', payload: notification });
  };

  const handleLogout = async () => {
    try {
      await apiLogout();
    } finally {
      dispatch({ type: 'LOGOUT' });
      window.location.href = '/login';
    }
  };

  return {
    notifications: state.notifications,
    unreadCount: state.unreadNotificationCount,
    markAsRead,
    markAllAsRead,
    addNotification,
    logout: handleLogout,
  };
}
