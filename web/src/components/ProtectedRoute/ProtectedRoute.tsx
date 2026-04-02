import React, { useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";
const POLL_INTERVAL_MS = 30_000; // check every 30 seconds

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const storedUser = localStorage.getItem("user");
  const token      = localStorage.getItem("accessToken");
  const navigate   = useNavigate();

  useEffect(() => {
    if (!token) return;

    const checkSession = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.status === 401) {
          localStorage.removeItem("accessToken");
          localStorage.removeItem("user");
          navigate("/", { replace: true });
        }
      } catch {
        // Network error — don't kick, just wait for next poll
      }
    };

    // Check immediately on mount, then every POLL_INTERVAL_MS
    checkSession();
    const interval = setInterval(checkSession, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [token, navigate]);

  // 1. Check if user is logged in at all
  if (!storedUser || !token) {
    return <Navigate to="/" replace />;
  }

  try {
    const user = JSON.parse(storedUser);

    // 2. Check if the user's role is in the allowed list
    if (!allowedRoles.includes(user.role)) {
      // 3. If unauthorized, redirect them to their respective home page
      if (user.role === "OWNER") {
        return <Navigate to="/owner/dashboard" replace />;
      } else if (user.role === "ADMIN") {
        return <Navigate to="/admin/rental-requests" replace />;
      } else {
        return <Navigate to="/home" replace />;
      }
    }

    // 4. If authorized, render the requested page
    return <>{children}</>;

  } catch {
    localStorage.removeItem("user");
    localStorage.removeItem("accessToken");
    return <Navigate to="/" replace />;
  }
};

export default ProtectedRoute;