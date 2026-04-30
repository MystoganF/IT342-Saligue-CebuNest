import axiosInstance from "../../../api/axiosInstance";

export const dashboardApi = {
  getOwnerAnalytics: () => 
    axiosInstance.get("/api/analytics/owner").then(res => res.data),
};