const apiBase = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");

const buildUrl = (path) => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  if (apiBase) {
    return `${apiBase}${normalizedPath}`;
  }
  return normalizedPath;
};

const request = async (path, options = {}) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  let res;
  try {
    res = await fetch(buildUrl(path), {
      credentials: "include",
      signal: controller.signal,
      ...options
    });
  } catch (error) {
    clearTimeout(timeout);
    if (error.name === "AbortError") {
      throw new Error("Request timed out. Please try again.");
    }
    throw new Error("Network error. Please check if backend servers are running.");
  }

  clearTimeout(timeout);

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await res.json() : null;

  if (!res.ok) {
    if (res.status === 401) {
      throw new Error("Unauthorized. Please log in again.");
    }

    if (res.status === 403) {
      throw new Error(data?.message || "Forbidden. You don't have access to this action.");
    }

    const message = data?.message || data?.error || res.statusText;
    throw new Error(message);
  }

  return data;
};

export const registerUser = (payload) => {
  const isFormData = payload instanceof FormData;
  return request("/api/users/register", {
    method: "POST",
    headers: isFormData ? undefined : { "content-type": "application/json" },
    body: isFormData ? payload : JSON.stringify(payload)
  });
};

export const loginUser = (payload) =>
  request("/api/users/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });

export const logoutUser = () =>
  request("/api/users/logout", {
    method: "POST"
  });

export const getProfile = () => request("/api/users/profile");

export const getSociety = () => request("/api/societies/me");

export const listJoinRequests = () => request("/api/societies/requests");

export const approveJoinRequest = (requestId) =>
  request(`/api/societies/requests/${requestId}/approve`, {
    method: "POST"
  });

export const rejectJoinRequest = (requestId) =>
  request(`/api/societies/requests/${requestId}/reject`, {
    method: "POST"
  });

export const createEvent = (payload) =>
  request("/api/events", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });

export const listEvents = () => request("/api/events");

export const getEventDetails = (eventId) => request(`/api/events/${eventId}`);

export const deleteEvent = (eventId) => request(`/api/events/${eventId}`, {
  method: "DELETE"
});

export const uploadEventImages = (eventId, files) => {
  const formData = new FormData();
  files.forEach((file) => formData.append("images", file));

  return request(`/api/events/${eventId}/images`, {
    method: "POST",
    body: formData
  });
};

export const deleteEventImages = (eventId, imageIds) =>
  request(`/api/events/${eventId}/images`, {
    method: "DELETE",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ imageIds })
  });

export const runRecognition = (eventId) =>
  request(`/api/events/${eventId}/recognize?force=true`, {
    method: "POST"
  });

export const getRecognitionJobStatus = (jobId) =>
  request(`/api/events/recognition/jobs/${jobId}`);

export const getMyMatches = () => request("/api/users/me/matches");
