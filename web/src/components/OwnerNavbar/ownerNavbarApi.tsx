import axiosInstance from "../../api/axiosInstance";

export const ownerNavbarApi = {
  getNotifications: () =>
    axiosInstance.get("/api/notifications").then(res => res.data),

  markNotificationRead: (id: number) =>
    axiosInstance.patch(`/api/notifications/${id}/read`).then(res => res.data),

  markAllNotificationsRead: () =>
    axiosInstance.patch("/api/notifications/read-all").then(res => res.data),
};