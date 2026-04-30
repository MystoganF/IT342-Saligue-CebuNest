import axiosInstance from "../../../api/axiosInstance";

export const editPropertyApi = {
  getPropertyById: (id: string | number) => 
    axiosInstance.get(`/api/properties/${id}`).then(res => res.data),
    
  getPropertyTypes: () => 
    axiosInstance.get("/api/properties/types").then(res => res.data),

  updateProperty: (id: string | number, data: any) => 
    axiosInstance.put(`/api/properties/${id}`, data).then(res => res.data),

  uploadPropertyImages: (id: string | number, formData: FormData) => 
    axiosInstance.post(`/api/properties/${id}/images`, formData, {
      headers: { "Content-Type": "multipart/form-data" }
    }).then(res => res.data),

  getPropertyRentalRequests: (propertyId: string | number) => 
    axiosInstance.get(`/api/rental-requests/property/${propertyId}`).then(res => res.data),

  getActiveTenant: (propertyId: string | number) => 
    axiosInstance.get(`/api/rental-requests/property/${propertyId}/active`).then(res => res.data),

  updateRentalRequestStatus: (requestId: string | number, status: string) => 
    axiosInstance.put(`/api/rental-requests/${requestId}/status`, { status }).then(res => res.data),

  terminateLease: (requestId: string | number) => 
    axiosInstance.put(`/api/rental-requests/${requestId}/terminate`).then(res => res.data),

  adjustLease: (requestId: string | number, adjustMonths: number) => 
    axiosInstance.put(`/api/rental-requests/${requestId}/lease`, { adjustMonths }).then(res => res.data),

  getLeaseExtensions: (rentalRequestId: string | number) => 
    axiosInstance.get(`/api/lease-extensions/rental/${rentalRequestId}`).then(res => res.data),

  respondToLeaseExtension: (extensionId: string | number, decision: "APPROVED" | "REJECTED") => 
    axiosInstance.put(`/api/lease-extensions/${extensionId}/respond`, { decision }).then(res => res.data),

  getPaymentsForRequest: (requestId: string | number) => 
    axiosInstance.get(`/api/payments/request/${requestId}`).then(res => res.data),

  getPropertyReviews: (propertyId: string | number) => 
    axiosInstance.get(`/api/property-reviews/property/${propertyId}`).then(res => res.data),
};