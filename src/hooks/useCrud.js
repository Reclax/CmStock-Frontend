import { useCallback, useState } from "react";
import { api } from "../api/client";

const toCollection = (payload) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (payload && Array.isArray(payload.data)) {
    return payload.data;
  }

  return [];
};

const PAGE_SIZE = 20;

const buildPagePath = (endpoint, page) => {
  const separator = endpoint.includes("?") ? "&" : "?";
  return `${endpoint}${separator}page=${page}&limit=${PAGE_SIZE}`;
};

const loadAllPages = async (endpoint) => {
  const firstPayload = await api.get(buildPagePath(endpoint, 1));

  if (Array.isArray(firstPayload)) {
    return firstPayload;
  }

  const firstPageItems = toCollection(firstPayload);
  const totalPages = Number(firstPayload?.totalPages || 1);

  if (totalPages <= 1) {
    return firstPageItems;
  }

  const remainingPages = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, index) =>
      api.get(buildPagePath(endpoint, index + 2)),
    ),
  );

  const allItems = [
    ...firstPageItems,
    ...remainingPages.flatMap((pagePayload) => toCollection(pagePayload)),
  ];

  // Deduplicar por id para proteger contra inestabilidades de paginación
  const uniqueItems = [];
  const seenIds = new Set();
  
  for (const item of allItems) {
    if (!item.id || !seenIds.has(item.id)) {
      if (item.id) seenIds.add(item.id);
      uniqueItems.push(item);
    }
  }

  return uniqueItems;
};

export const useCrud = (endpoint) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await loadAllPages(endpoint);
      setItems(data);
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
