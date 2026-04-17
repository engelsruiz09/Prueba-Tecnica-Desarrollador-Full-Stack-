/**
 * AuthPage: Login y Register en una sola página con tabs.
 *
 * Layout: panel izquierdo de identidad (oculto en móvil) + panel derecho con form.
 * Estética: dark navy con acentos amber, Playfair Display para títulos.
 */
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { authApi } from "../api/auth";
import { useAuth } from "../contexts/AuthContext";

// ── Schemas de validación ──────────────────────────────────────────────────
const loginSchema = z.object({
  email: z.string().email("Correo inválido"),
  password: z.string().min(1, "Requerido"),
});

const registerSchema = z.object({
  full_name: z.string().min(2, "Mínimo 2 caracteres"),
  email: z.string().email("Correo inválido"),
  password: z
    .string()
    .min(8, "Mínimo 8 caracteres")
    .regex(/[a-zA-Z]/, "Debe contener al menos una letra")
    .regex(/[0-9]/, "Debe contener al menos un número"),
  role: z.enum(["sender", "receiver"]),
  linked_email: z.string().email("Correo inválido").optional().or(z.literal("")),
});

type LoginForm = z.infer<typeof loginSchema>;
type RegisterForm = z.infer<typeof registerSchema>;

// ── Componente principal ───────────────────────────────────────────────────
export function AuthPage() {
  const [tab, setTab] = useState<"login" | "register">("login");
  const [serverError, setServerError] = useState<string | null>(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex bg-navy-950">

      {/* ── Panel izquierdo: identidad visual ── */}
      <div className="hidden lg:flex lg:w-[45%] relative flex-col justify-between p-12 overflow-hidden">
        {/* Fondo con textura geométrica */}
        <div className="absolute inset-0 bg-navy-900">
          {/* Patrón de líneas diagonales sutil */}
          <div
            className="absolute inset-0 opacity-5"
            style={{
              backgroundImage: `repeating-linear-gradient(
                45deg,
                #d4a853 0px, #d4a853 1px,
                transparent 1px, transparent 40px
              )`,
            }}
          />
          {/* Círculo de acento decorativo */}
          <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full border border-amber-gold/10" />
          <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full border border-amber-gold/15" />
          <div className="absolute bottom-24 -left-24 w-80 h-80 rounded-full border border-amber-gold/8" />
        </div>

        {/* Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-gold rounded-lg flex items-center justify-center">
              <span className="text-navy-950 font-display font-bold text-lg">V</span>
            </div>
            <span className="font-ui font-semibold text-white tracking-wide">Vantum</span>
          </div>
        </div>

        {/* Texto central */}
        <div className="relative z-10 space-y-6">
          <div className="w-12 h-px bg-amber-gold" />
          <h1 className="font-display text-5xl text-white leading-tight">
            Conectando<br />
            <span className="text-amber-gold">familias</span>,<br />
            sin fronteras.
          </h1>
          <p className="font-ui text-slate-subtle text-base leading-relaxed max-w-xs">
            Envía remesas con transparencia total. Carlos y Don Alex, siempre conectados.
          </p>
        </div>

        {/* Estadísticas decorativas */}
        <div className="relative z-10 grid grid-cols-2 gap-6">
          {[
            { label: "Tipo de cambio", value: "En tiempo real" },
            { label: "Historial", value: "Completo" },
          ].map((stat) => (
            <div key={stat.label} className="border border-navy-600 rounded-lg p-4">
              <div className="font-display text-xl text-amber-gold">{stat.value}</div>
              <div className="font-ui text-xs text-slate-subtle mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Panel derecho: formulario ── */}
      <div className="flex-1 flex items-center justify-center p-8 lg:p-16">
        <div className="w-full max-w-md animate-fade-in">

          {/* Header del form */}
          <div className="mb-10">
            {/* Logo solo en móvil */}
            <div className="flex items-center gap-2 mb-8 lg:hidden">
              <div className="w-8 h-8 bg-amber-gold rounded-lg flex items-center justify-center">
                <span className="text-navy-950 font-display font-bold">V</span>
              </div>
              <span className="font-ui font-semibold text-white">Vantum</span>
            </div>

            <h2 className="font-display text-3xl text-white">
              {tab === "login" ? "Bienvenido de vuelta" : "Crear cuenta"}
            </h2>
            <p className="font-ui text-slate-subtle text-sm mt-2">
              {tab === "login"
                ? "Ingresa tus credenciales para continuar"
                : "Únete a la plataforma familiar"}
            </p>
          </div>

          {/* Tabs */}
          <div className="flex rounded-lg bg-navy-800 p-1 mb-8 border border-navy-700">
            {(["login", "register"] as const).map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); setServerError(null); }}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-ui font-medium transition-all duration-200 ${
                  tab === t
                    ? "bg-amber-gold text-navy-950"
                    : "text-slate-subtle hover:text-white"
                }`}
              >
                {t === "login" ? "Ingresar" : "Registrarse"}
              </button>
            ))}
          </div>

          {/* Error del servidor */}
          {serverError && (
            <div className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-ui">
              {serverError}
            </div>
          )}

          {/* Formularios */}
          {tab === "login" ? (
            <LoginForm
              onSuccess={(data) => { login(data); navigate("/dashboard"); }}
              onError={setServerError}
            />
          ) : (
            <RegisterForm
              onSuccess={(data) => { login(data); navigate("/dashboard"); }}
              onError={setServerError}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Sub-componente: Login Form ─────────────────────────────────────────────
function LoginForm({
  onSuccess,
  onError,
}: {
  onSuccess: (data: any) => void;
  onError: (msg: string) => void;
}) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    try {
      const res = await authApi.login(data);
      onSuccess(res);
    } catch (err: any) {
      onError(err.response?.data?.detail ?? "Error al iniciar sesión");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 animate-slide-up">
      <div>
        <label className="block text-xs font-ui font-medium text-slate-subtle mb-2 uppercase tracking-wider">
          Correo electrónico
        </label>
        <input
          {...register("email")}
          type="email"
          placeholder="tu@correo.com"
          className="input-field"
        />
        {errors.email && (
          <p className="mt-1 text-xs text-red-400 font-ui">{errors.email.message}</p>
        )}
      </div>

      <div>
        <label className="block text-xs font-ui font-medium text-slate-subtle mb-2 uppercase tracking-wider">
          Contraseña
        </label>
        <input
          {...register("password")}
          type="password"
          placeholder="••••••••"
          className="input-field"
        />
        {errors.password && (
          <p className="mt-1 text-xs text-red-400 font-ui">{errors.password.message}</p>
        )}
      </div>

      <div className="pt-2">
        <button type="submit" disabled={isSubmitting} className="btn-primary">
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-navy-950/40 border-t-navy-950 rounded-full animate-spin" />
              Verificando...
            </span>
          ) : (
            "Ingresar"
          )}
        </button>
      </div>
    </form>
  );
}

// ── Sub-componente: Register Form ──────────────────────────────────────────
function RegisterForm({
  onSuccess,
  onError,
}: {
  onSuccess: (data: any) => void;
  onError: (msg: string) => void;
}) {
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { role: "sender" },
  });

  const selectedRole = watch("role");

  const onSubmit = async (data: RegisterForm) => {
    try {
      const payload = {
        ...data,
        linked_email: data.linked_email || undefined,
      };
      const res = await authApi.register(payload);
      onSuccess(res);
    } catch (err: any) {
      onError(err.response?.data?.detail ?? "Error al registrarse");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 animate-slide-up">
      <div>
        <label className="block text-xs font-ui font-medium text-slate-subtle mb-2 uppercase tracking-wider">
          Nombre completo
        </label>
        <input {...register("full_name")} placeholder="Carlos García" className="input-field" />
        {errors.full_name && <p className="mt-1 text-xs text-red-400">{errors.full_name.message}</p>}
      </div>

      <div>
        <label className="block text-xs font-ui font-medium text-slate-subtle mb-2 uppercase tracking-wider">
          Correo electrónico
        </label>
        <input {...register("email")} type="email" placeholder="tu@correo.com" className="input-field" />
        {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>}
      </div>

      <div>
        <label className="block text-xs font-ui font-medium text-slate-subtle mb-2 uppercase tracking-wider">
          Contraseña
        </label>
        <input {...register("password")} type="password" placeholder="Mín. 8 chars, letras y números" className="input-field" />
        {errors.password && <p className="mt-1 text-xs text-red-400">{errors.password.message}</p>}
      </div>

      {/* Selector de rol con cards visuales */}
      <div>
        <label className="block text-xs font-ui font-medium text-slate-subtle mb-3 uppercase tracking-wider">
          Mi rol
        </label>
        <div className="grid grid-cols-2 gap-3">
          {([
            { value: "sender", label: "Emisor", desc: "Envío dinero desde USA", icon: "✈️" },
            { value: "receiver", label: "Receptor", desc: "Recibo en Guatemala", icon: "🏠" },
          ] as const).map((opt) => (
            <label
              key={opt.value}
              className={`relative cursor-pointer rounded-lg border p-4 transition-all duration-200 ${
                selectedRole === opt.value
                  ? "border-amber-gold bg-amber-gold/10"
                  : "border-navy-600 bg-navy-800 hover:border-navy-500"
              }`}
            >
              <input
                {...register("role")}
                type="radio"
                value={opt.value}
                className="sr-only"
              />
              <div className="text-xl mb-2">{opt.icon}</div>
              <div className="font-ui font-semibold text-sm text-white">{opt.label}</div>
              <div className="font-ui text-xs text-slate-subtle mt-1">{opt.desc}</div>
              {selectedRole === opt.value && (
                <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-amber-gold" />
              )}
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-ui font-medium text-slate-subtle mb-2 uppercase tracking-wider">
          Correo del familiar{" "}
          <span className="normal-case text-navy-600 ml-1">(opcional, para vincular cuentas)</span>
        </label>
        <input
          {...register("linked_email")}
          type="email"
          placeholder="familiar@correo.com"
          className="input-field"
        />
        {errors.linked_email && <p className="mt-1 text-xs text-red-400">{errors.linked_email.message}</p>}
      </div>

      <div className="pt-2">
        <button type="submit" disabled={isSubmitting} className="btn-primary">
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-navy-950/40 border-t-navy-950 rounded-full animate-spin" />
              Creando cuenta...
            </span>
          ) : (
            "Crear cuenta"
          )}
        </button>
      </div>
    </form>
  );
}