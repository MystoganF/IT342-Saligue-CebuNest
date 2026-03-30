import React from "react";
import { Navigate } from "react-router-dom";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const storedUser = localStorage.getItem("user");
  const token = localStorage.getItem("accessToken");

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
        return <Navigate to="/home" replace />; // Default fallback for TENANT
      }
    }

    // 4. If authorized, render the requested page
    return <>{children}</>;

  } catch (error) {
    // If JSON parsing fails or user object is malformed, force logout
    localStorage.removeItem("user");
    localStorage.removeItem("accessToken");
    return <Navigate to="/" replace />;
  }
};

export default ProtectedRoute;