import axiosInstance from "../../../api/axiosInstance";

export const adminEditPropertyApi = {
  getAdminPropertyById: (id: string | number) => 
    axiosInstance.get(`/api/admin/properties/${id}`).then(res => res.data),

  updateAdminProperty: (id: string | number, data: any) => 
    axiosInstance.put(`/api/admin/properties/${id}`, data).then(res => res.data),

  uploadAdminPropertyImages: (id: string | number, formData: FormData) => 
    axiosInstance.post(`/api/admin/properties/${id}/images`, formData, {
      headers: { "Content-Type": "multipart/form-data" }
    }).then(res => res.data),
};