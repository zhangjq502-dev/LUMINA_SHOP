import { apiRequest } from "./http";
export type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  emailVerifiedAt: string | null;
};
export function login(input: { email: string; password: string }) {
  return apiRequest<{ user: User }>("/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
export function register(input: {
  name: string;
  email: string;
  password: string;
}) {
  return apiRequest<{ user: User }>("/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
export function logout() {
  return apiRequest<{ ok: boolean }>("/auth/logout", { method: "POST" });
}
export function ensureGuestSession() {
  return apiRequest<{ ready: boolean }>("/session", { method: "POST" });
}

export const getCurrentUser = (signal?: AbortSignal) =>
  apiRequest<{ user: User | null }>("/auth/me", { signal });
