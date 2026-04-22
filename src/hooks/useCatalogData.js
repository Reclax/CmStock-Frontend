import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import { ENDPOINTS } from "../api/endpoints";

export const useCatalogData = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [clientes, setClientes] = useState([]);
  const [molderias, setMolderias] = useState([]);
  const [ubicaciones, setUbicaciones] = useState([]);
  const [usuarios, setUsuarios] = useState([]);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [clientesData, molderiasData, ubicacionesData, usuariosData] =
        await Promise.all([
          api.get(ENDPOINTS.clientes),
          api.get(ENDPOINTS.molderias),
          api.get(ENDPOINTS.ubicaciones),
          api.get(ENDPOINTS.usuarios),
        ]);

      setClientes(Array.isArray(clientesData) ? clientesData : []);
      setMolderias(Array.isArray(molderiasData) ? molderiasData : []);
      setUbicaciones(Array.isArray(ubicacionesData) ? ubicacionesData : []);
      setUsuarios(Array.isArray(usuariosData) ? usuariosData : []);
    } catch (err) {
      setError(err.message || "No se pudieron cargar catalogos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const maps = useMemo(
    () => ({
      clientesMap: Object.fromEntries(
        clientes.map((item) => [item.id, item.nombre]),
      ),
      molderiasMap: Object.fromEntries(
        molderias.map((item) => [item.id, item.nombre]),
      ),
      ubicacionesMap: Object.fromEntries(
        ubicaciones.map((item) => [item.id, item.nombre]),
      ),
      usuariosMap: Object.fromEntries(
        usuarios.map((item) => [item.id, item.nombre]),
      ),
    }),
    [clientes, molderias, ubicaciones, usuarios],
  );

  return {
    loading,
    error,
    clientes,
    molderias,
    ubicaciones,
    usuarios,
    load,
    ...maps,
  };
};
