import type { AuthResponse } from "./auth.types";

export function storeTokensAndRedirect(data: AuthResponse) {
  if (data.data.accessToken) localStorage.setItem("accessToken", data.data.accessToken);
  if (data.data.refreshToken) localStorage.setItem("refreshToken", data.data.refreshToken);
  if (data.data.user) localStorage.setItem("user", JSON.stringify(data.data.user));

  const role = data.data.user?.role?.toUpperCase();
  let destination = "/home";
  
  if (role === "ADMIN") destination = "/admin/rental-requests";
  else if (role === "OWNER") destination = "/owner/dashboard";

  setTimeout(() => {
    window.location.href = destination;
  }, 1200);
}