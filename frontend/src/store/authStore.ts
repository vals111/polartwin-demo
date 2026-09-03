import { create } from 'zustand';
import { User } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  role: 'admin' | 'operator' | 'viewer';
  isAuthenticated: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
}

const storedToken = localStorage.getItem('polartwin_token');
const storedUser = localStorage.getItem('polartwin_user');

let initialUser: User | null = null;
if (storedUser) {
  try {
    initialUser = JSON.parse(storedUser);
  } catch (e) {
    initialUser = null;
  }
}

// Default fallback viewer if none set, for immediate exploratory viewing
if (!initialUser && !storedToken) {
  initialUser = {
    user_id: 'viewer_guest',
    email: 'operator@polartwin.gov.in',
    role: 'operator'
  };
}

export const useAuthStore = create<AuthState>((set) => ({
  user: initialUser,
  token: storedToken,
  role: initialUser?.role || 'operator',
  isAuthenticated: !!initialUser,

  login: (token: string, user: User) => {
    localStorage.setItem('polartwin_token', token);
    localStorage.setItem('polartwin_user', JSON.stringify(user));
    set({ token, user, role: user.role, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem('polartwin_token');
    localStorage.removeItem('polartwin_user');
    set({ user: null, token: null, role: 'viewer', isAuthenticated: false });
  }
}));
