import { createContext } from 'react';

/** The current session — provided by AuthProvider, read with useAuth(). */
export const AuthContext = createContext(null);
