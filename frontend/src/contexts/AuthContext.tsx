/**
 * AuthContext: estado global de autenticación.
 *
 * Persiste el token y el usuario en localStorage para sobrevivir recargas.
 * Expone: user, isAuthenticated, login(), logout().
 * Los componentes consumen esto via el hook useAuth().
 */
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { TokenResponse, User } from "../types";

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (tokenResponse: TokenResponse) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true); // true mientras restauramos sesión

  // Restaurar sesión desde localStorage al cargar la app
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("user");
      const storedToken = localStorage.getItem("access_token");
      if (storedUser && storedToken) {
        setUser(JSON.parse(storedUser));
      }
    } catch {
      // JSON malformado — limpiar
      localStorage.removeItem("user");
      localStorage.removeItem("access_token");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback((tokenResponse: TokenResponse) => {
    localStorage.setItem("access_token", tokenResponse.access_token);
    localStorage.setItem("user", JSON.stringify(tokenResponse.user));
    setUser(tokenResponse.user);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Hook tipado — lanza error si se usa fuera del provider
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}