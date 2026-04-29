import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import { ENDPOINTS } from "../api/endpoints";

const toCollection = (payload) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (payload && Array.isArray(payload.data)) {
    return payload.data;
  }

  return [];
};

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

      setClientes(toCollection(clientesData));
      setMolderias(toCollection(molderiasData));
      setUbicaciones(toCollection(ubicacionesData));
      setUsuarios(toCollection(usuariosData));
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
