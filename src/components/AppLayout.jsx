import { NavLink, Outlet, useNavigate } from "react-router-dom";
import logo from "../assets/LogoCM.jpeg";
import { useAuth } from "../auth/useAuth";

const navItems = [
  { to: "/", label: "Dashboard" },
  { to: "/muestras", label: "Muestras" },
  { to: "/historial", label: "Historial" },
  { to: "/inventario", label: "Inventario" },
  { to: "/catalogos", label: "Catalogos" },
  { to: "/reportes", label: "Reportes" },
  { to: "/herramientas", label: "Herramientas" },
];

export const AppLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,rgba(27,61,143,0.06),transparent_24%),linear-gradient(180deg,#f8fbff_0%,#edf3fb_100%)] flex flex-col lg:flex-row">
      <aside className="flex min-h-0 w-full flex-col gap-5 bg-gradient-to-b from-[#173472] to-[#102b60] px-4 py-5 text-white shadow-[inset_-1px_0_0_rgba(255,255,255,0.06)] lg:min-h-screen lg:w-[310px] lg:px-6 lg:py-7">
        <div className="flex items-center gap-3 rounded-[18px] border border-white/10 bg-white/8 p-3.5 backdrop-blur-md">
          <img
            src={logo}
            alt="CM Stock"
            className="h-[54px] w-[54px] rounded-2xl bg-white/10 object-contain p-2"
          />
          <div>
            <p className="m-0 text-[1.05rem] font-extrabold tracking-[-0.03em]">
              CM Stock
            </p>
            <p className="mt-1 m-0 text-sm text-white/70">
              Control de muestras
            </p>
          </div>
        </div>

        <nav className="flex flex-col gap-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                isActive
                  ? "flex min-h-[46px] items-center rounded-2xl bg-white px-4 font-semibold tracking-[-0.01em] text-[#1B3D8F] shadow-[0_12px_22px_rgba(0,0,0,0.12)] transition hover:-translate-y-px"
                  : "flex min-h-[46px] items-center rounded-2xl px-4 font-semibold tracking-[-0.01em] text-white/82 transition hover:-translate-x-0.5 hover:bg-white/8 hover:text-white"
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto rounded-[18px] border border-white/10 bg-white/8 p-4">
          <p className="m-0 font-extrabold">{user?.nombre || "Usuario"}</p>
          <small className="mt-1 block text-white/70">
            {user?.rol || "rol"}
          </small>
          <button
            type="button"
            onClick={handleLogout}
            className="mt-3 w-full rounded-2xl border border-white/10 bg-white/15 px-4 py-3 font-bold text-white transition hover:-translate-y-px hover:bg-white/20"
          >
            Cerrar sesion
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-7">
        <Outlet />
      </main>
    </div>
  );
};
