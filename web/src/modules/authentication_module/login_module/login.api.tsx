// src/modules/auth/login/login.api.ts
import axiosInstance from "../../../api/axiosInstance";
import type { AuthResponse } from "../shared/auth.types";

export const loginApi = {
  login: async (credentials: object): Promise<AuthResponse> => {
    const response = await axiosInstance.post("/api/auth/login", credentials);
    return response.data;
  },
  
  googleLogin: async (token: string, role?: string): Promise<AuthResponse> => {
    const response = await axiosInstance.post("/api/auth/google", { token, role });
    return response.data;
  }
};