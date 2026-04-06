import React, { useState, useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import Navbar from "../../components/Navbar/Navbar";

const TenantLayout: React.FC = () => {
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
      setUser(JSON.parse(stored));
    } catch {
      navigate("/");
    }
  }, [navigate]);

  if (!user) return null; // Or a loading spinner

  return (
    <>
      {/* Navbar is now centralized for all tenant routes */}
      <Navbar user={user} />
      
      {/* This renders the child route (e.g., Home or PropertyDetail) */}
      <Outlet context={{ user }} /> 
    </>
  );
};

export default TenantLayout;