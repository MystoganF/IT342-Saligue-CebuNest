import { BrowserRouter, Routes, Route } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute/ProtectedRoute"; // <-- Adjust import path

import Login    from "./modules/authentication_module/login_module/Login";
import Register from "./modules/authentication_module/register_module/Register";
import Home     from "./modules/tenant_module/tenant_landing_module/Home";
import PropertyDetail from "./modules/tenant_module/renting_module/Property_detail";
import Profile from "./modules/profile_module/Profile";
import OwnerDashboard   from "./modules/owner_module/owner_dashboard_module/Owner_dashboard";
import OwnerProperties  from "./modules/owner_module/owner_property_module/Owner_properties";
import AddProperty      from "./modules/owner_module/owner_property_management_module/owner_add_property";
import AdminRentalRequests from "./modules/admin_module/admin_rental_request/admin_rental_request";
import EditProperty      from "./modules/owner_module/owner_property_management_module/owner_edit_property";
import MyRentals from "./modules/tenant_module/rented_property_module/my_rentals";
import RentalDetail from "./modules/tenant_module/rented_property_module/RentalDetal";
import AdminUsers from "./modules/admin_module/admin_user_management/AdminUsers";
import AdminPropertyDetail from "./modules/admin_module/admin_property_detail/AdminPropertyDetail";
import AdminAuditLog from "./modules/admin_module/admin_audit_log/AdminAuditLog";
import AdminProperties from "./modules/admin_module/admin_property_management/AdminProperties";
import AdminPropertyEdit from "./modules/admin_module/admin_property_management/AdminEditProperty";
function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Auth (Public Routes) */}
        <Route path="/"           element={<Login />}           />
        <Route path="/register"   element={<Register />}        />
 
        {/* Tenant Routes */}
        <Route path="/home" element={
          <ProtectedRoute allowedRoles={["TENANT"]}>
            <Home />
          </ProtectedRoute>
        } />
        <Route path="/properties/:id" element={
          <ProtectedRoute allowedRoles={["TENANT"]}>
            <PropertyDetail />
          </ProtectedRoute>
        } />
        <Route path="/my-rentals" element={
          <ProtectedRoute allowedRoles={["TENANT"]}>
            <MyRentals />
          </ProtectedRoute>
        } />
        <Route path="/my-rentals/:requestId" element={
          <ProtectedRoute allowedRoles={["TENANT"]}>
            <RentalDetail />
          </ProtectedRoute>
        } />
 
        {/* Owner Routes */}
        <Route path="/owner/dashboard" element={
          <ProtectedRoute allowedRoles={["OWNER"]}>
            <OwnerDashboard />
          </ProtectedRoute>
        } />
        <Route path="/owner/properties" element={
          <ProtectedRoute allowedRoles={["OWNER"]}>
            <OwnerProperties />
          </ProtectedRoute>
        } />
        <Route path="/owner/properties/new" element={
          <ProtectedRoute allowedRoles={["OWNER"]}>
            <AddProperty />
          </ProtectedRoute>
        } />
        <Route path="/owner/properties/:id/edit" element={
          <ProtectedRoute allowedRoles={["OWNER"]}>
            <EditProperty />
          </ProtectedRoute>
        } />

        {/* Admin Routes */}
        <Route path="/admin/rental-requests" element={
          <ProtectedRoute allowedRoles={["ADMIN"]}>
            <AdminRentalRequests />
          </ProtectedRoute>
        } />
        <Route path="/admin/users" element={
          <ProtectedRoute allowedRoles={["ADMIN"]}>
            <AdminUsers />
          </ProtectedRoute>
        } />

        <Route path="/admin/rental-requests/:id" element={
          <ProtectedRoute allowedRoles={["ADMIN"]}>
            <AdminPropertyDetail />
          </ProtectedRoute>
        } />
        <Route path="/admin/audit-log" element={
          <ProtectedRoute allowedRoles={["ADMIN"]}>
            <AdminAuditLog />
          </ProtectedRoute>
        } />

        <Route path="/admin/properties" element={
          <ProtectedRoute allowedRoles={["ADMIN"]}>
            <AdminProperties />
          </ProtectedRoute>
        } />
        
       <Route path="/admin/properties/:id/edit" element={
          <ProtectedRoute allowedRoles={["ADMIN"]}>
            <AdminPropertyEdit /> 
          </ProtectedRoute>
        } />

        {/* Shared Routes (Accessible by multiple roles) */}
        <Route path="/profile" element={
        
          <ProtectedRoute allowedRoles={["TENANT", "OWNER", "ADMIN"]}>
            <Profile />
          </ProtectedRoute>
        } />
        
      </Routes>
    </BrowserRouter>
  );
}

export default App;