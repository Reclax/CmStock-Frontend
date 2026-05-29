import toast from "react-hot-toast";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3000/api";

export { API_BASE_URL };

export const API_ROOT_URL = API_BASE_URL.replace(/\/api\/?$/, "");

export class ApiError extends Error {
  constructor(message, status, details) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

export const request = async (path, options = {}) => {
  const token = localStorage.getItem("cmstock_token");

  const isFormData =
    typeof FormData !== "undefined" && options.body instanceof FormData;

  const headers = {
    ...(options.headers || {}),
  };

  if (!isFormData && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
    });
  } catch (err) {
    // Network error (DNS, CORS, offline, tunnel issues)
    const friendly =
      err && err.message && /failed to fetch/i.test(err.message)
        ? "No se pudo conectar con el servidor. Revisa tu conexión a Internet."
        : "Error de red al contactar el servidor.";
    try {
      toast.error(friendly);
    } catch (e) {
      // ignore if toast isn't available
    }
    throw new ApiError(friendly, 0, { originalMessage: err && err.message });
  }

  const contentType = response.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const payload = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const message =
      (isJson && (payload.message || payload.error)) ||
      `Error ${response.status}`;

    if (response.status === 401) {
      localStorage.removeItem("cmstock_token");
      localStorage.removeItem("cmstock_user");
      window.location.href = "/login";
    }

    throw new ApiError(message, response.status, payload);
  }

  return payload;
};

export const api = {
  get: (path) => request(path),
  post: (path, body) =>
    request(path, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  postForm: (path, formData) =>
    request(path, {
      method: "POST",
      body: formData,
    }),
  put: (path, body) =>
    request(path, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  patch: (path, body) =>
    request(path, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  delete: (path) =>
    request(path, {
      method: "DELETE",
    }),
};
