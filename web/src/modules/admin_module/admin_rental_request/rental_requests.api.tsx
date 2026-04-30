import axiosInstance from "../../../api/axiosInstance";

export const rentalRequestsApi = {
  getAllRentalRequests: () => 
    axiosInstance.get("/api/admin/rental-requests").then(res => res.data),
};