import axiosInstance from "../../../api/axiosInstance";

export const adminUsersApi = {
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