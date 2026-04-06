import axiosInstance from "../../api/axiosInstance";

export const tenantApi = {
  // Properties
  getPropertyTypes: () => axiosInstance.get("/api/properties/types").then(res => res.data),
  
  getProperties: (params: Record<string, any>) => 
    axiosInstance.get("/api/properties", { params }).then(res => res.data),
    
  getPropertyById: (id: string | number) => 
    axiosInstance.get(`/api/properties/${id}`).then(res => res.data),

  // Reviews
  getPropertyReviews: (id: string | number) => 
    axiosInstance.get(`/api/property-reviews/property/${id}`).then(res => res.data),

  // Rental Requests
  getMyRentalRequestForProperty: (id: string | number) => 
    axiosInstance.get(`/api/rental-requests/my/property/${id}`).then(res => res.data),

  submitRentalRequest: (data: { propertyId: number; startDate: string; leaseDurationMonths: number }) => 
    axiosInstance.post("/api/rental-requests", data).then(res => res.data),

  // Payments
  getPaymentsForRequest: (requestId: string | number) => 
    axiosInstance.get(`/api/payments/request/${requestId}`).then(res => res.data),

  confirmRental: (requestId: string | number) => 
    axiosInstance.post("/api/payments/confirm", { requestId }).then(res => res.data),

  initiatePayment: (paymentId: string | number) => 
    axiosInstance.post(`/api/payments/${paymentId}/initiate`).then(res => res.data),



  // Rental Requests
  getMyRentalRequests: () => 
    axiosInstance.get("/api/rental-requests/my").then(res => res.data),

  // Lease Extensions
  getLeaseExtensions: (rentalRequestId: string | number) => 
    axiosInstance.get(`/api/lease-extensions/rental/${rentalRequestId}`).then(res => res.data),

  submitLeaseExtension: (data: { rentalRequestId: number; requestedMonths: number; reason: string | null }) => 
    axiosInstance.post("/api/lease-extensions", data).then(res => res.data),

  // Reviews
  submitPropertyReview: (data: { rentalRequestId: number; rating: number; comment: string | null }) => 
    axiosInstance.post("/api/property-reviews", data).then(res => res.data),

  // Payments (Additional methods)
  cancelPayment: (paymentId: string | number) => 
    axiosInstance.get(`/api/payments/${paymentId}/cancel`).then(res => res.data),

  failPayment: (paymentId: string | number) => 
    axiosInstance.get(`/api/payments/${paymentId}/fail`).then(res => res.data),

  verifyPayment: (paymentId: string | number) => 
    axiosInstance.get(`/api/payments/${paymentId}/verify`).then(res => res.data),
};