import axiosInstance from "../../api/axiosInstance";
import type { ProfileUpdatePayload } from "./profile.types";

export const profileApi = {
  updateAvatar: async (userId: string | number, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    
    const response = await axiosInstance.post(`/api/users/${userId}/avatar`, formData, {
      headers: { "Content-Type": "multipart/form-data" }
    });
    return response.data;
  },

  updateProfile: async (userId: string | number, data: ProfileUpdatePayload) => {
    const response = await axiosInstance.put(`/api/users/${userId}`, data);
    return response.data;
  }
};