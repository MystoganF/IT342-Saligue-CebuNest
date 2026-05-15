import axiosInstance from "../../../api/axiosInstance";

export const auditLogApi = {
  getAuditLogs: (page: number, size: number) => 
    axiosInstance.get(`/api/admin/audit-logs?page=${page}&size=${size}`).then(res => res.data),

  getRentalRequestById: (id: string | number) => 
    axiosInstance.get(`/api/admin/rental-requests/${id}`).then(res => res.data),
};