import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./useAuth";
import AppLoading from "../components/AppLoading";

export const ProtectedRoute = () => {
  const { loading, isAuthenticated } = useAuth();

  if (loading) {
    return <AppLoading message="Verificando sesión..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};
