export type Role = "TENANT" | "OWNER" | "ADMIN";

export interface PendingGoogleUser {
  email: string;
  name: string;
}

export interface AuthResponse {
  success: boolean;
  data: {
    accessToken?: string;
    refreshToken?: string;
    user?: { role: string; [key: string]: unknown };
    requiresRoleSelection?: boolean;
    alreadyExists?: boolean;
    email?: string;
    name?: string;
  };
  error?: { message: string; code?: string };
}

