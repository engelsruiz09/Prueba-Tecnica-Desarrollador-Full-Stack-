/**
 * Layout principal de la app autenticada.
 * Sidebar fijo a la izquierda + área de contenido scrollable.
 * El sidebar colapsa en móvil con un botón de menú.
 */
import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  LayoutDashboard, ArrowUpRight, ArrowDownLeft,
  History, LogOut, Menu, X
} from "lucide-react";

interface Props { children: React.ReactNode }

export function AppShell({ children }: Props) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isSender = user?.role === "sender";

  const navItems = isSender
    ? [
        { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
        { to: "/send",      icon: ArrowUpRight,    label: "Enviar dinero" },
        { to: "/history",   icon: History,          label: "Historial" },
      ]
    : [
        { to: "/dashboard", icon: LayoutDashboard,  label: "Dashboard" },
        { to: "/request",   icon: ArrowDownLeft,    label: "Solicitar" },
        { to: "/history",   icon: History,           label: "Historial" },
      ];

  const handleLogout = () => { logout(); navigate("/login"); };

  const Sidebar = () => (
    <aside className="flex flex-col h-full bg-navy-900 border-r border-navy-700 w-60">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-navy-700">
        <div className="w-8 h-8 bg-amber-gold rounded-lg flex items-center justify-center flex-shrink-0">
          <span className="text-navy-950 font-display font-bold text-sm">V</span>
        </div>
        <div>
          <div className="font-ui font-semibold text-white text-sm">Vantum</div>
          <div className="font-ui text-xs text-slate-subtle">Remesas</div>
        </div>
      </div>

      {/* Perfil del usuario */}
      <div className="px-4 py-4 border-b border-navy-700">
        <div className="flex items-center gap-3 p-3 rounded-lg bg-navy-800">
          <div className="w-8 h-8 rounded-full bg-amber-gold/20 border border-amber-gold/30
                          flex items-center justify-center flex-shrink-0">
            <span className="text-amber-gold font-ui font-semibold text-sm">
              {user?.full_name[0].toUpperCase()}
            </span>
          </div>
          <div className="min-w-0">
            <div className="font-ui font-medium text-white text-xs truncate">
              {user?.full_name}
            </div>
            <div className={`text-xs font-ui mt-0.5 ${isSender ? "text-blue-400" : "text-amber-gold"}`}>
              {isSender ? "Emisor · USA" : "Receptor · GT"}
            </div>
          </div>
        </div>
      </div>

      {/* Navegación */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/dashboard"}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-ui
               font-medium transition-all duration-150 ${
                isActive
                  ? "bg-amber-gold/15 text-amber-gold border border-amber-gold/20"
                  : "text-slate-subtle hover:text-white hover:bg-navy-800"
              }`
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-navy-700">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm
                     font-ui font-medium text-slate-subtle hover:text-red-400
                     hover:bg-red-500/10 transition-all duration-150"
        >
          <LogOut size={16} />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );

  return (
    <div className="h-screen flex overflow-hidden bg-navy-950">
      {/* Sidebar desktop */}
      <div className="hidden lg:flex flex-shrink-0">
        <Sidebar />
      </div>

      {/* Sidebar móvil (overlay) */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <div className="relative z-50 flex-shrink-0">
            <Sidebar />
          </div>
        </div>
      )}

      {/* Área principal */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar móvil */}
        <div className="lg:hidden flex items-center justify-between px-4 py-3
                        border-b border-navy-700 bg-navy-900">
          <button onClick={() => setSidebarOpen(true)} className="text-slate-subtle hover:text-white">
            <Menu size={20} />
          </button>
          <span className="font-ui font-semibold text-white text-sm">Vantum</span>
          <div className="w-5" /> {/* spacer */}
        </div>

        {/* Contenido scrollable */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}