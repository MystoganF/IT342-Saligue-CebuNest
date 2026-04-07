import axiosInstance from "../../api/axiosInstance";

export const adminApi = {
  // Audit Logs
  getAuditLogs: (page: number, size: number) => 
    axiosInstance.get(`/api/admin/audit-logs?page=${page}&size=${size}`).then(res => res.data),

  // Rental Requests (Admin View)
  getAllRentalRequests: () => 
    axiosInstance.get("/api/admin/rental-requests").then(res => res.data),

  getRentalRequestById: (id: string | number) => 
    axiosInstance.get(`/api/admin/rental-requests/${id}`).then(res => res.data),

  updatePropertyReviewStatus: (id: string | number, data: { status: string; reason?: string | null }) => 
    axiosInstance.put(`/api/admin/rental-requests/${id}/status`, data).then(res => res.data),

  // Notifications / Broadcasts
  getBroadcastHistory: () => 
    axiosInstance.get("/api/admin/notifications/history").then(res => res.data),

  sendBroadcast: (data: { type: string; message: string; targetRoles: string[] }) => 
    axiosInstance.post("/api/admin/notifications/broadcast", data).then(res => res.data),

  // Properties (Admin View)
  getAllAdminProperties: () => 
    axiosInstance.get("/api/admin/properties").then(res => res.data),

  getAdminPropertyById: (id: string | number) => 
    axiosInstance.get(`/api/admin/properties/${id}`).then(res => res.data),

  updateAdminProperty: (id: string | number, data: any) => 
    axiosInstance.put(`/api/admin/properties/${id}`, data).then(res => res.data),

  uploadAdminPropertyImages: (id: string | number, formData: FormData) => 
    axiosInstance.post(`/api/admin/properties/${id}/images`, formData, {
      headers: { "Content-Type": "multipart/form-data" }
    }).then(res => res.data),

  togglePropertyVisibility: (id: string | number, data: { reason?: string }) => 
    axiosInstance.put(`/api/admin/properties/${id}/visibility`, data).then(res => res.data),

  // Users (Admin View)
  getAllUsers: () => 
    axiosInstance.get("/api/admin/users").then(res => res.data),

  createUser: (data: any) => 
    axiosInstance.post("/api/admin/users", data).then(res => res.data),

  updateUserRole: (id: string | number, data: { role: string }) => 
    axiosInstance.put(`/api/admin/users/${id}/role`, data).then(res => res.data),

  updateUserEmail: (id: string | number, data: { email: string }) => 
    axiosInstance.put(`/api/admin/users/${id}/email`, data).then(res => res.data),

  toggleUserActiveStatus: (id: string | number, data: { active: boolean }) => 
    axiosInstance.put(`/api/admin/users/${id}/active`, data).then(res => res.data),
};