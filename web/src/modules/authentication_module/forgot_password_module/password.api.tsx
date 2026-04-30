// src/modules/auth/password_recovery/password.api.ts
import axiosInstance from "../../../api/axiosInstance";

export const passwordApi = {
  requestReset: async (email: string) => {
    const response = await axiosInstance.post("/api/auth/forgot-password", { email });
    return response.data;
  },

  verifyCode: async (email: string, code: string) => {
    const response = await axiosInstance.post("/api/auth/verify-reset-code", { email, code });
    return response.data;
  },

  resetPassword: async (payload: object) => {
    const response = await axiosInstance.post("/api/auth/reset-password", payload);
    return response.data;
  }
};