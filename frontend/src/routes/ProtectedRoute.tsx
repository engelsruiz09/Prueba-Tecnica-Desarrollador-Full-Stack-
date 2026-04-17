/**
 * ProtectedRoute: guarda rutas que requieren autenticación.
 *
 * Si el usuario no está autenticado, redirige a /login.
 * Si está cargando (restaurando sesión), muestra un spinner para
 * evitar un flash del login antes de verificar localStorage.
 */
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-navy-950">
        <div className="w-8 h-8 border-2 border-amber-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}