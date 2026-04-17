import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { AuthPage } from "./pages/AuthPage";
import { SenderDashboard } from "./pages/SenderDashboard";
import { ReceiverDashboard } from "./pages/ReceiverDashboard";
import { ProtectedRoute } from "./routes/ProtectedRoute";
import { PublicOnlyRoute } from "./routes/PublicOnlyRoute";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 1000 * 60 },
  },
});

/**
 * Redirige al dashboard correcto según el rol del usuario autenticado.
 * sender → /dashboard/sender
 * receiver → /dashboard/receiver
 */
function DashboardRedirect() {
  const { user } = useAuth();
  return user?.role === "sender"
    ? <Navigate to="/dashboard/sender" replace />
    : <Navigate to="/dashboard/receiver" replace />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            {/* Rutas públicas */}
            <Route element={<PublicOnlyRoute />}>
              <Route path="/login" element={<AuthPage />} />
            </Route>

            {/* Rutas protegidas */}
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<DashboardRedirect />} />
              <Route path="/dashboard/sender"   element={<SenderDashboard />} />
              <Route path="/dashboard/receiver" element={<ReceiverDashboard />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}