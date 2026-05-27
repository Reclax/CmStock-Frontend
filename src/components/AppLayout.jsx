import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { FiCamera, FiLogOut } from "react-icons/fi";
import { useAuth } from "../auth/useAuth";
import { Modal } from "./Modal";

const navItems = [
  { to: "/", label: "Dashboard" },
  { to: "/muestras", label: "Muestras" },
  { to: "/historial", label: "Historial" },
  { to: "/inventario", label: "Inventario" },
  { to: "/administracion", label: "Administración" },
  { to: "/herramientas", label: "Herramientas" },
];

export const AppLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const openLogoutConfirm = () => {
    setMenuOpen(false);
    setLogoutConfirmOpen(true);
  };

  const openQrScanner = () => {
    setMenuOpen(false);
    navigate("/etiquetas-qr");
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
        <div className="flex items-center h-[85px] px-5 lg:px-7 gap-0">
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
              <p className="m-0 text-[11px] text-white/40">
                Control de muestras
              </p>
            </div>
          </div>

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

          <div className="hidden lg:flex items-center gap-3 pl-5 border-l border-white/10 flex-shrink-0 ml-auto">
            <div className="flex items-center gap-2.5 px-[11px] py-[7px] rounded-[9px] hover:bg-white/[0.07] cursor-pointer transition">
              <div className="w-[34px] h-[34px] rounded-full bg-[#1b3d8f] border-[1.5px] border-white/20 flex items-center justify-center text-[12px] font-semibold text-white flex-shrink-0">
                {initials}
              </div>
              <div>
                <p className="m-0 text-[13px] font-semibold text-white">
                  {user?.nombre || "Usuario"}
                </p>
                <p className="m-0 text-[11px] text-white/40">
                  {user?.rol || "rol"}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={openQrScanner}
              className="flex h-[38px] w-[38px] items-center justify-center rounded-[9px] border border-white/15 text-white/70 transition hover:bg-white/[0.08] hover:text-white"
              aria-label="Escanear QR"
              title="Escanear QR"
            >
              <FiCamera className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={openLogoutConfirm}
              className="flex h-[38px] w-[38px] items-center justify-center rounded-[9px] border border-white/15 text-white/70 transition hover:bg-white/[0.08] hover:text-white"
              aria-label="Cerrar sesión"
              title="Cerrar sesión"
            >
              <FiLogOut className="h-5 w-5" />
            </button>
          </div>

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
                <p className="m-0 text-[11px] text-white/40">
                  {user?.rol || "rol"}
                </p>
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
            <div className="flex flex-wrap gap-2 px-3">
              <button
                type="button"
                onClick={openQrScanner}
                className="inline-flex items-center gap-2 rounded-[9px] border border-white/15 px-3 py-2 text-[13px] font-semibold text-white/70 transition hover:bg-white/[0.07] hover:text-white"
              >
                <FiCamera className="h-4 w-4" />
                Escanear QR
              </button>
              <button
                type="button"
                onClick={openLogoutConfirm}
                className="inline-flex items-center gap-2 rounded-[9px] border border-white/15 px-3 py-2 text-[13px] font-semibold text-white/70 transition hover:bg-white/[0.07] hover:text-white"
              >
                <FiLogOut className="h-4 w-4" />
                Cerrar sesión
              </button>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-7">
        <Outlet />
      </main>

      {logoutConfirmOpen && (
        <Modal
          title="Confirmar cierre de sesión"
          onClose={() => setLogoutConfirmOpen(false)}
          maxWidthClass="max-w-[420px]"
        >
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              ¿Seguro que deseas cerrar sesión?
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                className="ghost-btn"
                onClick={() => setLogoutConfirmOpen(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700 active:scale-[0.98]"
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
