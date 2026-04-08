import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { TOKEN_KEY, api } from '../services/api';
import { LoginCredentials, UserData, authService } from '../services/authService';

// ── Types ─────────────────────────────────────────────────────────────────────

interface AuthState {
  token: string;
  user: UserData;
}

interface AuthContextData {
  user: UserData | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (credentials: LoginCredentials) => Promise<void>;
  signOut: () => void;
}

// ── Context ───────────────────────────────────────────────────────────────────

export const AuthContext = createContext<AuthContextData>({} as AuthContextData);

// ── Provider ──────────────────────────────────────────────────────────────────

const USER_KEY = '@agendamento:user';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();

  const [authState, setAuthState] = useState<AuthState | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session from localStorage on mount
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    const rawUser = localStorage.getItem(USER_KEY);

    if (token && rawUser) {
      const user: UserData = JSON.parse(rawUser) as UserData;
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setAuthState({ token, user });
    }
    setIsLoading(false);
  }, []);

  const signIn = useCallback(
    async (credentials: LoginCredentials) => {
      const { token, user } = await authService.login(credentials);

      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      setAuthState({ token, user });

      // Redirect based on role
      if (user.role === 'COORDENADOR') {
        navigate('/coordenador/dashboard');
      } else {
        navigate('/professor/dashboard');
      }
    },
    [navigate],
  );

  const signOut = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    delete api.defaults.headers.common['Authorization'];

    setAuthState(null);
    navigate('/login');
  }, [navigate]);

  const value = useMemo<AuthContextData>(
    () => ({
      user: authState?.user ?? null,
      isAuthenticated: !!authState,
      isLoading,
      signIn,
      signOut,
    }),
    [authState, isLoading, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
