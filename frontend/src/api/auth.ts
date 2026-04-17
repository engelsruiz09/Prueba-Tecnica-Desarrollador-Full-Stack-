import type { LoginRequest, RegisterRequest, TokenResponse } from "../types";
import { apiClient } from "./client";

export const authApi = {
  login: async (data: LoginRequest): Promise<TokenResponse> => {
    const res = await apiClient.post<TokenResponse>("/auth/login", data);
    return res.data;
  },

  register: async (data: RegisterRequest): Promise<TokenResponse> => {
    const res = await apiClient.post<TokenResponse>("/auth/register", data);
    return res.data;
  },
};