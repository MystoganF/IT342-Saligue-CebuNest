import axiosInstance from "../../../api/axiosInstance";

export const notificationsApi = {
  getBroadcastHistory: () => 
    axiosInstance.get("/api/admin/notifications/history").then(res => res.data),

  sendBroadcast: (data: { type: string; message: string; targetRoles: string[] }) => 
    axiosInstance.post("/api/admin/notifications/broadcast", data).then(res => res.data),
};