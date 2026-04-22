import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./useAuth";

export const ProtectedRoute = () => {
  const { loading, isAuthenticated } = useAuth();

  if (loading) {
    return <div className="page-loader">Cargando sesion...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};
