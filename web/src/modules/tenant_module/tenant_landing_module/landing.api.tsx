import axiosInstance from "../../../api/axiosInstance";

export const landingApi = {
  getPropertyTypes: () => 
    axiosInstance.get("/api/properties/types").then(res => res.data),
  
  getProperties: (params: Record<string, any>) => 
    axiosInstance.get("/api/properties", { params }).then(res => res.data),
};