import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../auth/useAuth";

const navItems = [
  { to: "/", label: "Dashboard" },
  { to: "/muestras", label: "Muestras" },
  { to: "/historial", label: "Historial" },
  { to: "/inventario", label: "Inventario" },
  { to: "/etiquetas-qr", label: "Etiquetas QR" },
  { to: "/administracion", label: "Administración" },
  { to: "/reportes", label: "Reportes" },
  { to: "/herramientas", label: "Herramientas" },
];

const LogoutIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
    <path
      d="M6 14H3a1 1 0 01-1-1V3a1 1 0 011-1h3M10 11l3-3-3-3M13 8H6"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const AppLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const initials = (user?.nombre || "U")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="min-h-screen flex flex-col bg-[linear-gradient(180deg,#f8fbff_0%,#edf3fb_100%)]">
      <header className="bg-[#0f2554] border-b border-white/[0.07]">

        {/* Top bar */}
        <div className="flex items-center h-[85px] px-5 lg:px-7 gap-0">

          {/* Brand */}
          <div className="flex items-center gap-3 pr-7 border-r border-white/10 flex-shrink-0">
            <img
              src="/image.png"
              alt="CM Stock"
              className="h-[42px] w-[42px] rounded-[11px] bg-[#1b3d8f] border border-white/15 object-contain p-1.5"
            />
            <div>
              <p className="m-0 text-[15px] font-semibold text-white tracking-[-0.02em]">
                CM Stock
              </p>
              <p className="m-0 text-[11px] text-white/40">Control de muestras</p>
            </div>
          </div>

          {/* Nav desktop */}
         <nav
  className="hidden lg:flex items-center flex-1 px-5 gap-0.5 overflow-x-auto"
  style={{ scrollbarWidth: "none" }}
>
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  isActive
                    ? "relative px-[15px] py-2 rounded-[9px] text-[13px] font-semibold text-white bg-white/[0.12] whitespace-nowrap after:absolute after:bottom-[-1px] after:left-[15px] after:right-[15px] after:h-[2px] after:bg-[#4e8ef7] after:rounded-t-sm"
                    : "px-[15px] py-2 rounded-[9px] text-[13px] font-semibold text-white/60 whitespace-nowrap transition hover:bg-white/[0.07] hover:text-white/90"
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* Usuario + logout desktop */}
          <div className="hidden lg:flex items-center gap-3 pl-5 border-l border-white/10 flex-shrink-0 ml-auto">
            <div className="flex items-center gap-2.5 px-[11px] py-[7px] rounded-[9px] hover:bg-white/[0.07] cursor-pointer transition">
              <div className="w-[34px] h-[34px] rounded-full bg-[#1b3d8f] border-[1.5px] border-white/20 flex items-center justify-center text-[12px] font-semibold text-white flex-shrink-0">
                {initials}
              </div>
              <div>
                <p className="m-0 text-[13px] font-semibold text-white">
                  {user?.nombre || "Usuario"}
                </p>
                <p className="m-0 text-[11px] text-white/40">{user?.rol || "rol"}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-[9px] border border-white/15 text-white/70 text-[12px] font-semibold transition hover:bg-white/[0.08] hover:text-white"
            >
              <LogoutIcon />
              Cerrar sesión
            </button>
          </div>

          {/* Hamburger mobile */}
          <button
            type="button"
            className="lg:hidden ml-auto w-[38px] h-[38px] flex flex-col items-center justify-center gap-[5px] rounded-[9px] border border-white/15 p-2.5"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Menú"
          >
            <span
              className={`block w-4 h-[1.5px] bg-white/75 rounded transition-transform origin-center ${
                menuOpen ? "rotate-45 translate-y-[6.5px]" : ""
              }`}
            />
            <span
              className={`block w-4 h-[1.5px] bg-white/75 rounded transition-opacity ${
                menuOpen ? "opacity-0" : ""
              }`}
            />
            <span
              className={`block w-4 h-[1.5px] bg-white/75 rounded transition-transform origin-center ${
                menuOpen ? "-rotate-45 -translate-y-[6.5px]" : ""
              }`}
            />
          </button>
        </div>

        {/* Menú mobile */}
        {menuOpen && (
          <div className="lg:hidden bg-[#0f2554] border-t border-white/[0.08] px-4 pb-4">
            <div className="flex items-center gap-3 py-3 px-3">
              <div className="w-8 h-8 rounded-full bg-[#1b3d8f] border border-white/20 flex items-center justify-center text-[12px] font-semibold text-white">
                {initials}
              </div>
              <div>
                <p className="m-0 text-[13px] font-semibold text-white">
                  {user?.nombre || "Usuario"}
                </p>
                <p className="m-0 text-[11px] text-white/40">{user?.rol || "rol"}</p>
              </div>
            </div>
            <div className="h-px bg-white/[0.07] mb-2" />
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  isActive
                    ? "block px-3 py-2.5 rounded-[9px] text-[13px] font-semibold text-white bg-white/10 mb-0.5"
                    : "block px-3 py-2.5 rounded-[9px] text-[13px] font-semibold text-white/60 mb-0.5 hover:bg-white/[0.07] hover:text-white transition"
                }
              >
                {item.label}
              </NavLink>
            ))}
            <div className="h-px bg-white/[0.07] my-2" />
            <button
              type="button"
              onClick={handleLogout}
              className="w-full text-left px-3 py-2.5 rounded-[9px] border border-white/15 text-white/65 text-[13px] font-semibold hover:bg-white/[0.07] hover:text-white transition"
            >
              Cerrar sesión
            </button>
          </div>
        )}
      </header>

      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-7">
        <Outlet />
      </main>
    </div>
  );
};