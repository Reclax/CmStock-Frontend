import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import { AppLayout } from "./components/AppLayout";
import AppLoading from "./components/AppLoading";
import { PwaPrompts } from "./components/PwaPrompts";
import { LoginPage } from "./pages/LoginPage";

const AdministracionPage = lazy(() => import("./pages/AdministracionPage").then((mod) => ({ default: mod.AdministracionPage })));
const DashboardPage = lazy(() => import("./pages/DashboardPage").then((mod) => ({ default: mod.DashboardPage })));
const EtiquetasQrPage = lazy(() => import("./pages/EtiquetasQrPage").then((mod) => ({ default: mod.EtiquetasQrPage })));
const HerramientasPage = lazy(() => import("./pages/HerramientasPage").then((mod) => ({ default: mod.HerramientasPage })));
const HistorialPage = lazy(() => import("./pages/HistorialPage").then((mod) => ({ default: mod.HistorialPage })));
const ImagenesPage = lazy(() => import("./pages/ImagenesPage").then((mod) => ({ default: mod.ImagenesPage })));
const InventarioPage = lazy(() => import("./pages/InventarioPage").then((mod) => ({ default: mod.InventarioPage })));
const MuestraDetailPage = lazy(() => import("./pages/MuestraDetailPage").then((mod) => ({ default: mod.MuestraDetailPage })));
const MuestrasPage = lazy(() => import("./pages/MuestrasPage").then((mod) => ({ default: mod.MuestrasPage })));
const ReportesPage = lazy(() => import("./pages/ReportesPage").then((mod) => ({ default: mod.ReportesPage })));

function App() {
  return (
    <>
      <Suspense fallback={<AppLoading message="Cargando módulo..." />}>
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
              <Route path="/etiquetas-qr" element={<EtiquetasQrPage />} />
              <Route path="/imagenes" element={<ImagenesPage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      <PwaPrompts />
      <Toaster position="top-center" toastOptions={{ duration: 4000, style: { background: '#1e293b', color: '#fff', fontSize: '14px', borderRadius: '12px', fontWeight: '500' } }} />
    </>
  );
}

export default App;
