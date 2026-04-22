import { useCallback, useState } from "react";
import { api } from "../api/client";

export const useCrud = (endpoint) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.get(endpoint);
      setItems(Array.isArray(data) ? data : []);
      return data;
    } catch (err) {
      setError(err.message || "Error cargando datos");
      throw err;
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  const create = useCallback(
    async (payload) => {
      const data = await api.post(endpoint, payload);
      await load();
      return data;
    },
    [endpoint, load],
  );

  const update = useCallback(
    async (id, payload) => {
      const data = await api.put(`${endpoint}/${id}`, payload);
      await load();
      return data;
    },
    [endpoint, load],
  );

  const remove = useCallback(
    async (id) => {
      await api.delete(`${endpoint}/${id}`);
      await load();
    },
    [endpoint, load],
  );

  return {
    items,
    loading,
    error,
    setItems,
    load,
    create,
    update,
    remove,
  };
};
