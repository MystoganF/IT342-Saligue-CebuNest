import axiosInstance from "../../../api/axiosInstance";

export interface UpdatePropertyPayload {
  title: string;
  description: string;
  price: number;
  location: string;
  typeId: number;
  beds: number | null;
  baths: number | null;
  sqm: number | null;
  removedImageIds?: number[];
}

export interface PropertyType {
  id: number;
  name: string;
}

export interface ExistingImage {
  id: number;
  imageUrl: string;
}

export interface ActiveTenantInfo {
  tenantId: number;
  tenantName: string;
  tenantEmail: string;
  startDate: string;
  leaseDurationMonths: number;
}

export interface PropertyDetail {
  title: string;
  description: string;
  price: number;
  location: string;
  typeId: number;
  beds: number | null;
  baths: number | null;
  sqm: number | null;
  ownerName: string;
  ownerId: number;
  status: string;
  createdAt: string;
  rejectionReason: string | null;
  hasActiveTenant: boolean;
  activeTenant: ActiveTenantInfo | null;
  images: ExistingImage[];
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  error?: { message: string };
}

export const adminEditPropertyApi = {
  /**
   * Fetch all available property types for the dropdown.
   */
  getPropertyTypes: (): Promise<ApiResponse<{ types: PropertyType[] }>> =>
    axiosInstance.get("/api/properties/types").then((res) => res.data),

  /**
   * Fetch a single property by ID using the admin endpoint.
   */
  getAdminPropertyById: (
    id: string | number
  ): Promise<ApiResponse<{ property: PropertyDetail }>> =>
    axiosInstance.get(`/api/admin/properties/${id}`).then((res) => res.data),

  /**
   * Update a property's core fields as an admin.
   */
  updateAdminProperty: (
    id: string | number,
    data: UpdatePropertyPayload
  ): Promise<ApiResponse> =>
    axiosInstance
      .put(`/api/admin/properties/${id}`, data)
      .then((res) => res.data),

  /**
   * Upload new images for a property.
   * Sends a multipart/form-data POST with files appended under the "files" key.
   */
  uploadAdminPropertyImages: (
    id: string | number,
    formData: FormData
  ): Promise<ApiResponse> =>
    axiosInstance
      .post(`/api/admin/properties/${id}/images`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((res) => res.data),
};