import axiosInstance from "../../../api/axiosInstance";

export const propertiesApi = {
  getMyProperties: (params: Record<string, any>) => 
    axiosInstance.get("/api/properties/my", { params }).then(res => res.data),

  deleteProperty: (id: string | number) => 
    axiosInstance.delete(`/api/properties/${id}`).then(res => res.data),
};