import axiosInstance from "../../../api/axiosInstance";

export const rentalsApi = {
  getMyRentalRequests: () => 
    axiosInstance.get("/api/rental-requests/my").then(res => res.data),

  confirmRental: (requestId: string | number) => 
    axiosInstance.post("/api/payments/confirm", { requestId }).then(res => res.data),

  getPropertyById: (id: string | number) => 
    axiosInstance.get(`/api/properties/${id}`).then(res => res.data),

  getPaymentsForRequest: (requestId: string | number) => 
    axiosInstance.get(`/api/payments/request/${requestId}`).then(res => res.data),

  cancelPayment: (paymentId: string | number) => 
    axiosInstance.get(`/api/payments/${paymentId}/cancel`).then(res => res.data),

  failPayment: (paymentId: string | number) => 
    axiosInstance.get(`/api/payments/${paymentId}/fail`).then(res => res.data),

  verifyPayment: (paymentId: string | number) => 
    axiosInstance.get(`/api/payments/${paymentId}/verify`).then(res => res.data),

  initiatePayment: (paymentId: string | number) => 
    axiosInstance.post(`/api/payments/${paymentId}/initiate`).then(res => res.data),

  getLeaseExtensions: (rentalRequestId: string | number) => 
    axiosInstance.get(`/api/lease-extensions/rental/${rentalRequestId}`).then(res => res.data),

  submitLeaseExtension: (data: { rentalRequestId: number; requestedMonths: number; reason: string | null }) => 
    axiosInstance.post("/api/lease-extensions", data).then(res => res.data),

  getPropertyReviews: (id: string | number) => 
    axiosInstance.get(`/api/property-reviews/property/${id}`).then(res => res.data),

  submitPropertyReview: (data: { rentalRequestId: number; rating: number; comment: string | null }) => 
    axiosInstance.post("/api/property-reviews", data).then(res => res.data),
};