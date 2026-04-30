// src/modules/auth/register/register.api.ts
import axiosInstance from "../../../api/axiosInstance";
import type { AuthResponse } from "../shared/auth.types";

export const registerApi = {
  register: async (userData: object): Promise<AuthResponse> => {
    const response = await axiosInstance.post("/api/auth/register", userData);
    return response.data;
  },
  
  googleRegister: async (token: string, role?: string): Promise<AuthResponse> => {
    const response = await axiosInstance.post("/api/auth/google", { token, role });
    return response.data;
  }
};