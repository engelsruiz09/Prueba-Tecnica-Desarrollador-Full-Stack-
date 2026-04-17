/**
 * PublicOnlyRoute: rutas solo accesibles sin sesión (login, register).
 * Si el usuario ya está autenticado, lo redirige al dashboard.
 */
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export function PublicOnlyRoute() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-navy-950">
        <div className="w-8 h-8 border-2 border-amber-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <Outlet />;
}