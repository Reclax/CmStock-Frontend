import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";

export const LoginPage = ({ onLogin, onLoadingSession }) => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fieldClass = (name) =>
    [
      "flex items-center gap-3 rounded-lg border px-4 py-3 transition-all duration-200",
      focused === name
        ? "border-[#1B3D8F] bg-white shadow-[0_0_0_3px_rgba(27,61,143,0.10)]"
        : "border-slate-200 bg-slate-50",
    ].join(" ");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const loginHandler =
        onLogin ??
        (async ({ email: userEmail, password: userPassword }) =>
          login(userEmail, userPassword));

      const result = await loginHandler({ email, password, remember });
      setSuccess(result.message || "Login exitoso");
      navigate("/dashboard", { replace: true });
    } catch (loginError) {
      setError(loginError.message || "Error al autenticar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Contenedor raíz: flex-col en mobile, flex-row en desktop */}
      <div className="flex flex-col min-h-[100svh] overflow-x-hidden bg-[#1B3D8F] text-white pb-[env(safe-area-inset-bottom)] md:flex-row md:overflow-visible">
        {/* ASIDE: solo header compacto en mobile, panel lateral en desktop */}
        <aside className="relative overflow-hidden px-4 pt-[env(safe-area-inset-top)] pb-6 pt-safe sm:px-7 rounded-b-2xl md:rounded-none md:flex md:w-[42%] md:max-w-[480px] md:shrink-0 md:flex-col md:justify-center md:px-14 md:py-0 md:min-h-screen">
          {/* Círculos decorativos — solo desktop */}
          <div className="absolute right-[-80px] top-[-80px] hidden h-64 w-64 rounded-full border border-white/10 md:block md:h-[340px] md:w-[340px]" />
          <div className="absolute right-[-10px] top-[18px] hidden h-40 w-40 rounded-full border border-white/10 md:block md:h-[200px] md:w-[200px]" />
          <div className="absolute bottom-6 left-[-20px] hidden h-20 w-20 rounded-full border border-white/10 md:block" />

          {/* Logo */}
          <div className="mb-3 inline-flex w-fit items-center gap-3 rounded-lg border border-white/20 bg-white/10 px-3 py-2 backdrop-blur-md md:mb-10">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-white text-sm font-bold text-[#1B3D8F]">
              cm
            </div>
            <div className="leading-tight">
              <div className="text-[17px] font-bold tracking-[-0.5px] text-white">
                CM Stock
              </div>
              <div className="text-[11px] uppercase tracking-[2px] text-white/75">
                original
              </div>
            </div>
          </div>

          {/* Título — visible en mobile y desktop */}
          <div className="max-w-md">
            <h1 className="text-[1.55rem] font-bold leading-[1.03] tracking-[-0.5px] sm:text-4xl md:text-5xl">
              Bienvenido
              <br />
              de vuelta
            </h1>
            <p className="mt-1 hidden max-w-sm text-sm leading-7 text-white/70 sm:block md:mt-4 md:text-[15px]">
              Inicia sesión para entrar al sistema de muestras, inventario y
              trazabilidad.
            </p>
          </div>
        </aside>

        {/* MAIN: crece para llenar el resto de la pantalla en mobile */}
        <main className="flex flex-1 grow items-center justify-center bg-white text-slate-900 px-3 py-6 md:min-h-screen md:items-center md:justify-center md:px-10 md:py-12">
          <section
            className="flex w-full max-w-xl flex-col px-3 py-2 sm:px-6 md:max-w-[460px] md:px-8 md:py-8"
            style={{ animation: "fadeUp 0.45s ease both" }}
          >
            <div>
              <div className="mb-6 sm:mb-8">
                <h2 className="text-[1.55rem] font-bold tracking-[-0.04em] text-slate-900 sm:text-3xl">
                  Iniciar sesión
                </h2>
                <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                  Usa tus credenciales del backend para acceder al sistema.
                </p>
              </div>

              {error ? (
                <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {error}
                </div>
              ) : null}

              {success ? (
                <div className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {success}
                </div>
              ) : null}

              {onLoadingSession ? (
                <div className="mb-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  {onLoadingSession}
                </div>
              ) : null}

              <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
                <div>
                  <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Correo electrónico
                  </label>
                  <div className={fieldClass("email")}>
                    <svg
                      className="h-5 w-5 shrink-0 text-slate-400"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onFocus={() => setFocused("email")}
                      onBlur={() => setFocused("")}
                      placeholder="tu@correo.com"
                      className="w-full border-0 bg-transparent text-base outline-none placeholder:text-slate-400"
                      autoComplete="email"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Contraseña
                  </label>
                  <div className={fieldClass("pass")}>
                    <svg
                      className="h-5 w-5 shrink-0 text-slate-400"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <rect x="3" y="11" width="18" height="11" rx="2" />
                      <path
                        d="M7 11V7a5 5 0 0110 0v4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <input
                      type={showPass ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onFocus={() => setFocused("pass")}
                      onBlur={() => setFocused("")}
                      placeholder="••••••••"
                      className="w-full border-0 bg-transparent text-base outline-none placeholder:text-slate-400"
                      autoComplete="current-password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass((current) => !current)}
                      className="shrink-0 rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                      aria-label={
                        showPass ? "Ocultar contraseña" : "Mostrar contraseña"
                      }
                    >
                      {showPass ? (
                        <svg
                          className="h-5 w-5"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path
                            d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      ) : (
                        <svg
                          className="h-5 w-5"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path
                            d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between">
                  <label className="flex items-center gap-3 text-sm text-slate-600">
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-[#1B3D8F] focus:ring-[#1B3D8F]"
                    />
                    Recordarme
                  </label>
                  <button
                    type="button"
                    className="text-sm font-semibold text-[#1B3D8F] hover:underline"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#1B3D8F] px-5 py-3.5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(27,61,143,0.28)] transition hover:bg-[#2550b8] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loading ? (
                    <>
                      <svg
                        className="h-5 w-5 animate-spin"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <circle
                          cx="12"
                          cy="12"
                          r="10"
                          className="opacity-25"
                          stroke="currentColor"
                          strokeWidth="3"
                        />
                        <path
                          d="M12 2a10 10 0 0110 10"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeLinecap="round"
                        />
                      </svg>
                      Verificando...
                    </>
                  ) : (
                    <>
                      Iniciar sesión
                      <svg
                        className="h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                      >
                        <path
                          d="M5 12h14M12 5l7 7-7 7"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </>
                  )}
                </button>
              </form>

              <p className="mt-6 text-center text-xs text-slate-500 sm:mt-8 sm:text-sm">
                Desarrollado por Arcm Solutions
              </p>
            </div>
          </section>
        </main>
      </div>
    </>
  );
};

export default LoginPage;
