import axiosInstance from "./axiosInstance";

export const sharedApi = {
  updateAvatar: (userId: string | number, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return axiosInstance.post(`/api/users/${userId}/avatar`, formData, {
      headers: { "Content-Type": "multipart/form-data" }
    }).then(res => res.data);
  },

  updateProfile: (userId: string | number, data: any) => {
    return axiosInstance.put(`/api/users/${userId}`, data).then(res => res.data);
  }
};