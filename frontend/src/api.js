const apiBase = import.meta.env.VITE_API_URL || "";

const buildUrl = (path) => {
  if (apiBase) {
    return `${apiBase}${path}`;
  }
  return path;
};

const request = async (path, options = {}) => {
  const res = await fetch(buildUrl(path), {
    credentials: "include",
    ...options
  });

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await res.json() : null;

  if (!res.ok) {
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

export const uploadEventImages = (eventId, files) => {
  const formData = new FormData();
  files.forEach((file) => formData.append("images", file));

  return request(`/api/events/${eventId}/images`, {
    method: "POST",
    body: formData
  });
};

export const runRecognition = (eventId) =>
  request(`/api/events/${eventId}/recognize`, {
    method: "POST"
  });

export const getMyMatches = () => request("/api/users/me/matches");
