import axiosInstance from "../../../api/axiosInstance";

export const addPropertyApi = {
  getPropertyTypes: () => 
    axiosInstance.get("/api/properties/types").then(res => res.data),

  createProperty: (data: any) => 
    axiosInstance.post("/api/properties", data).then(res => res.data),

  uploadPropertyImages: (id: string | number, formData: FormData) => 
    axiosInstance.post(`/api/properties/${id}/images`, formData, {
      headers: { "Content-Type": "multipart/form-data" }
    }).then(res => res.data),
};