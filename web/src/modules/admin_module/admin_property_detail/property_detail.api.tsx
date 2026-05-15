import axiosInstance from "../../../api/axiosInstance";

export const propertyDetailApi = {
  getRentalRequestById: (id: string | number) => 
    axiosInstance.get(`/api/admin/rental-requests/${id}`).then(res => res.data),

  updatePropertyReviewStatus: (id: string | number, data: { status: string; reason?: string | null }) => 
    axiosInstance.put(`/api/admin/rental-requests/${id}/status`, data).then(res => res.data),
};