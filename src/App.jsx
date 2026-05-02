import { Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import { AppLayout } from "./components/AppLayout";
import { PwaPrompts } from "./components/PwaPrompts";
import { AdministracionPage } from "./pages/AdministracionPage";
import { DashboardPage } from "./pages/DashboardPage";
import { HerramientasPage } from "./pages/HerramientasPage";
import { HistorialPage } from "./pages/HistorialPage";
import { ImagenesPage } from "./pages/ImagenesPage";
import { InventarioPage } from "./pages/InventarioPage";
import { LoginPage } from "./pages/LoginPage";
import { MuestraDetailPage } from "./pages/MuestraDetailPage";
import { MuestrasPage } from "./pages/MuestrasPage";
import { ReportesPage } from "./pages/ReportesPage";

function App() {
  return (
    <>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/muestra/:muestraId" element={<MuestraDetailPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/muestras" element={<MuestrasPage />} />
            <Route path="/historial" element={<HistorialPage />} />
            <Route path="/inventario" element={<InventarioPage />} />
            <Route path="/administracion" element={<AdministracionPage />} />
            <Route path="/reportes" element={<ReportesPage />} />
            <Route path="/herramientas" element={<HerramientasPage />} />
            <Route path="/imagenes" element={<ImagenesPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <PwaPrompts />
      <Toaster position="top-center" toastOptions={{ duration: 4000, style: { background: '#1e293b', color: '#fff', fontSize: '14px', borderRadius: '12px', fontWeight: '500' } }} />
    </>
  );
}

export default App;
