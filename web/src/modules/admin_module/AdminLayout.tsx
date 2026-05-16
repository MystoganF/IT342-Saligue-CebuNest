import React, { useState, useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import AdminSidebar from "../../components/AdminSidebar/AdminSidebar";

const AdminLayout: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    const token = localStorage.getItem("accessToken");

    if (!stored || !token) {
      navigate("/");
      return;
    }

    try {
      const parsedUser = JSON.parse(stored);
      if (parsedUser.role?.toUpperCase() !== "ADMIN") {
        navigate("/home"); 
        return;
      }
      setUser(parsedUser);
    } catch {
      navigate("/");
    }
  }, [navigate]);

  if (!user) return null;

  const navItems = [
    { path: "/admin/rental-requests", icon: "", label: "Property Requests" },
    { path: "/admin/property-edit-requests", icon: "", label: "Property Edit Requests"   },
    { path: "/admin/properties",      icon: "", label: "All Properties"  },
    { path: "/admin/users",           icon: "", label: "Users"           },
    { path: "/admin/audit-log",       icon: "", label: "Audit Log"       },
    { path: "/admin/notifications",   icon: "", label: "Notifications"   },
    
    
  ];

  return (
    <>
      <div style={{ display: "flex", minHeight: "100vh" }}>
        <AdminSidebar user={user} navItems={navItems} />
        <div style={{ flex: 1 }}>
          <Outlet context={{ user }} />
        </div>
      </div>
    </>
  );
};

export default AdminLayout;