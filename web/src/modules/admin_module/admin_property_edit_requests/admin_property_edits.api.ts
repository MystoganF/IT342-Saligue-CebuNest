import axiosInstance from "../../../api/axiosInstance";

export const propertyEditsApi = {
  // List all pending edit requests
  getPendingEditRequests: () =>
    axiosInstance.get("/api/admin/property-edit-requests").then((res) => res.data),

  // Get a single edit request detail (with diff data)
  getEditRequestDetail: (id: number | string) =>
    axiosInstance.get(`/api/admin/property-edit-requests/${id}`).then((res) => res.data),

  // Approve or reject
  reviewEditRequest: (id: number | string, decision: "APPROVED" | "REJECTED", reason?: string) =>
    axiosInstance
      .put(`/api/admin/property-edit-requests/${id}/decision`, { decision, reason })
      .then((res) => res.data),
};

// ── Owner API (called from owner_edit_property.tsx) ──────────────────────────
export const ownerEditRequestApi = {
  submitEditRequest: (propertyId: number | string, data: SubmitEditPayload) =>
    axiosInstance
      .post(`/api/properties/${propertyId}/edit-request`, data)
      .then((res) => res.data),
};

export interface SubmitEditPayload {
  title: string;
  description: string;
  price: number;
  location: string;
  typeId: number;
  beds: number | null;
  baths: number | null;
  sqm: number | null;
}