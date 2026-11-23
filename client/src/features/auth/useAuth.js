import { useContext } from 'react';
import { AuthContext } from './auth-context';

/** Current session: `{ user, isAuthenticated, isAdmin, permissions, signIn, signOut, … }`. */
export default function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
    return context;
}
