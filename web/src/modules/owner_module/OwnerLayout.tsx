import React, { useState, useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import OwnerNavbar from "../../components/OwnerNavbar/OwnerNavbar";

const OwnerLayout: React.FC = () => {
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
      if (parsedUser.role?.toUpperCase() !== "OWNER") {
        navigate("/home"); 
        return;
      }
      setUser(parsedUser);
    } catch {
      navigate("/");
    }
  }, [navigate]);

  if (!user) return null;

  return (
    <>
      <OwnerNavbar 
        user={user} 
        onAddProperty={() => navigate("/owner/properties/new")} 
      />
      <Outlet context={{ user }} />
    </>
  );
};

export default OwnerLayout;