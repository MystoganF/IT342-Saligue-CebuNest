import axiosInstance from "../../../api/axiosInstance";

export const adminPropertiesApi = {
  getAllAdminProperties: () => 
    axiosInstance.get("/api/admin/properties").then(res => res.data),

  togglePropertyVisibility: (id: string | number, data: { reason?: string }) => 
    axiosInstance.put(`/api/admin/properties/${id}/visibility`, data).then(res => res.data),
};