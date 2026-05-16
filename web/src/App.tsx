import { BrowserRouter, Routes, Route } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute/ProtectedRoute"; // <-- Adjust import path

import Login from "./modules/authentication_module/login/Login";
import Register from "./modules/authentication_module/register/Register";
import Home from "./modules/tenant_module/tenant_landing/Home";
import PropertyDetail from "./modules/tenant_module/renting/Property_detail";
import Profile from "./modules/profile_module/Profile";
import OwnerDashboard from "./modules/owner_module/owner_dashboard/Owner_dashboard";
import OwnerProperties from "./modules/owner_module/owner_property/Owner_properties";
import AddProperty from "./modules/owner_module/owner_add_property/owner_add_property";
import AdminRentalRequests from "./modules/admin_module/admin_rental_request/admin_rental_request";
import EditProperty from "./modules/owner_module/owner_edit_property/owner_edit_property";
import MyRentals from "./modules/tenant_module/rented_property/my_rentals";
import RentalDetail from "./modules/tenant_module/rented_property/RentalDetail";
import AdminUsers from "./modules/admin_module/admin_user_management/AdminUsers";
import AdminPropertyDetail from "./modules/admin_module/admin_property_detail/AdminPropertyDetail";
import AdminAuditLog from "./modules/admin_module/admin_audit_log/AdminAuditLog";
import AdminProperties from "./modules/admin_module/admin_property_management/AdminProperties";
import AdminPropertyEdit from "./modules/admin_module/admin_edit_property/AdminEditProperty";
import AdminNotifications from "./modules/admin_module/admin_notification/Admin_Notification";
import TenantLayout from "./modules/tenant_module/TenantLayout";
import OwnerLayout from "./modules/owner_module/OwnerLayout";
import AdminLayout from "./modules/admin_module/AdminLayout";

import ForgotPassword from "./modules/authentication_module/forgot_password/ForgotPassword";
import VerifyCode from "./modules/authentication_module/forgot_password/VerifyCode";
import ResetPassword from "./modules/authentication_module/forgot_password/ResetPassword";
import AuthLayout from "./modules/authentication_module/Auth_Layout";
import AdminPropertyEdits from "./modules/admin_module/admin_property_edit_requests/AdminPropertyEdits";
import AdminPropertyEditDetail from "./modules/admin_module/admin_property_edit_requests/AdminPropertyEditDetail";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AuthLayout />}>
          <Route path="/"                   element={<Login />} />
          <Route path="/register"           element={<Register />} />
          <Route path="/forgot-password"        element={<ForgotPassword />} />
          <Route path="/forgot-password/verify" element={<VerifyCode />} />
          <Route path="/forgot-password/reset"  element={<ResetPassword />} />
        </Route>
     
        <Route element={<ProtectedRoute allowedRoles={["TENANT"]}><TenantLayout /></ProtectedRoute>}>
          <Route path="/home" element={<Home />} />
          <Route path="/properties/:id" element={<PropertyDetail />} />
          <Route path="/my-rentals" element={<MyRentals />} />
          <Route path="/my-rentals/:requestId" element={<RentalDetail />} />
          
          {/* Tenant Profile */}
          <Route path="/tenant/profile" element={<Profile />} /> 
        </Route>
 
        <Route element={<ProtectedRoute allowedRoles={["OWNER"]}><OwnerLayout /></ProtectedRoute>}>
          <Route path="/owner/dashboard" element={<OwnerDashboard />} />
          <Route path="/owner/properties" element={<OwnerProperties />} />
          <Route path="/owner/properties/new" element={<AddProperty />} />
          <Route path="/owner/properties/:id/edit" element={<EditProperty />} />
          
          {/* Owner Profile */}
          <Route path="/owner/profile" element={<Profile />} />
        </Route>

        {/* Admin Routes */}
        <Route element={<ProtectedRoute allowedRoles={["ADMIN"]}><AdminLayout /></ProtectedRoute>}>
          <Route path="/admin/rental-requests" element={<AdminRentalRequests />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/rental-requests/:id" element={<AdminPropertyDetail />} />
          <Route path="/admin/audit-log" element={<AdminAuditLog />} />
          <Route path="/admin/properties" element={<AdminProperties />} />
          <Route path="/admin/properties/:id/edit" element={<AdminPropertyEdit />} />
          <Route path="/admin/notifications" element={<AdminNotifications />} />
          <Route path="/admin/property-edit-requests"     element={<AdminPropertyEdits />} />
          <Route path="/admin/property-edit-requests/:id" element={<AdminPropertyEditDetail />} />
        </Route>
        
      </Routes>
    </BrowserRouter>
  );
}

export default App;