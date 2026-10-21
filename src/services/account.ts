import { apiRequest } from "./http";
import type { User } from "./auth";
export type Address = {
  id: string;
  recipient: string;
  phone: string;
  province: string;
  district: string;
  address: string;
  isDefault: boolean;
};
export type AddressInput = Omit<Address, "id">;
export const saveAddress = (input: AddressInput, id?: string) =>
  apiRequest<{ address: Address }>(
    `/account/addresses${id ? "/" + encodeURIComponent(id) : ""}`,
    { method: id ? "PATCH" : "POST", body: JSON.stringify(input) },
  );
export const removeAddress = (id: string) =>
  apiRequest<{ ok: boolean }>(`/account/addresses/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
export const updateProfile = (name: string) =>
  apiRequest<{ user: User }>("/account/profile", {
    method: "PATCH",
    body: JSON.stringify({ name }),
  });
export const changePassword = (currentPassword: string, newPassword: string) =>
  apiRequest<{ ok: boolean }>("/account/password", {
    method: "POST",
    body: JSON.stringify({ currentPassword, newPassword }),
  });
export const sendVerification = () =>
  apiRequest<{ ok: boolean }>("/auth/verification-email", { method: "POST" });
export const forgotPassword = (email: string) =>
  apiRequest<{ ok: boolean }>("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
export const resetPassword = (token: string, password: string) =>
  apiRequest<{ ok: boolean }>("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, password }),
  });
export const verifyEmail = (token: string) =>
  apiRequest<{ ok: boolean }>("/auth/verify-email", {
    method: "POST",
    body: JSON.stringify({ token }),
  });

export const getAddresses = (signal?: AbortSignal) =>
  apiRequest<{ addresses: Address[] }>("/account/addresses", { signal });
