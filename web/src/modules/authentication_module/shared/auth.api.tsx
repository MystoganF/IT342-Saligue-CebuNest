import axiosInstance from "../../../api/axiosInstance";
import type { AuthResponse } from "./auth.types";

export const authApi = {
  login: async (credentials: object): Promise<AuthResponse> => {
    const response = await axiosInstance.post("/api/auth/login", credentials);
    return response.data;
  },
  
  register: async (userData: object): Promise<AuthResponse> => {
    const response = await axiosInstance.post("/api/auth/register", userData);
    return response.data;
  },
  
  googleAuth: async (token: string, role?: string): Promise<AuthResponse> => {
    const response = await axiosInstance.post("/api/auth/google", { token, role });
    return response.data;
  }
};