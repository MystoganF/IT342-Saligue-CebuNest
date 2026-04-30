export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  phoneNumber?: string | null;
  avatarUrl?: string | null;
  facebookUrl?: string | null;
  instagramUrl?: string | null;
  twitterUrl?: string | null;
}

export interface ProfileUpdatePayload {
  name: string;
  phoneNumber?: string | null;
  avatarUrl?: string | null;
  facebookUrl?: string | null;
  instagramUrl?: string | null;
  twitterUrl?: string | null;
}