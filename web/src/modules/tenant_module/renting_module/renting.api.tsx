import axiosInstance from "../../../api/axiosInstance";

export const rentingApi = {
  getPropertyById: (id: string | number) => 
    axiosInstance.get(`/api/properties/${id}`).then(res => res.data),

  getPropertyReviews: (id: string | number) => 
    axiosInstance.get(`/api/property-reviews/property/${id}`).then(res => res.data),

  getMyRentalRequestForProperty: (id: string | number) => 
    axiosInstance.get(`/api/rental-requests/my/property/${id}`).then(res => res.data),

  submitRentalRequest: (data: { propertyId: number; startDate: string; leaseDurationMonths: number }) => 
    axiosInstance.post("/api/rental-requests", data).then(res => res.data),

  confirmRental: (requestId: string | number) => 
    axiosInstance.post("/api/payments/confirm", { requestId }).then(res => res.data),

  getPaymentsForRequest: (requestId: string | number) => 
    axiosInstance.get(`/api/payments/request/${requestId}`).then(res => res.data),

  initiatePayment: (paymentId: string | number) => 
    axiosInstance.post(`/api/payments/${paymentId}/initiate`).then(res => res.data),
};