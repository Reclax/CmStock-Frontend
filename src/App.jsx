import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import { AppLayout } from "./components/AppLayout";
import { CatalogosPage } from "./pages/CatalogosPage";
import { DashboardPage } from "./pages/DashboardPage";
import { EtiquetasQrPage } from "./pages/EtiquetasQrPage";
import { HerramientasPage } from "./pages/HerramientasPage";
import { HistorialPage } from "./pages/HistorialPage";
import { InventarioPage } from "./pages/InventarioPage";
import { LoginPage } from "./pages/LoginPage";
import { MuestrasPage } from "./pages/MuestrasPage";
import { ReportesPage } from "./pages/ReportesPage";
import { PwaPrompts } from "./components/PwaPrompts";

function App() {
  return (
    <>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/muestras" element={<MuestrasPage />} />
          <Route path="/historial" element={<HistorialPage />} />
          <Route path="/inventario" element={<InventarioPage />} />
          <Route path="/etiquetas-qr" element={<EtiquetasQrPage />} />
          <Route path="/catalogos" element={<CatalogosPage />} />
          <Route path="/reportes" element={<ReportesPage />} />
          <Route path="/herramientas" element={<HerramientasPage />} />
        </Route>
      </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <PwaPrompts />
    </>
  );
}

export default App;
