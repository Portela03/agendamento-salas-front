import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';

/**
 * useAuth — convenience hook for consuming AuthContext.
 * Throws if used outside <AuthProvider>.
 */
export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider.');
  }

  return context;
}
