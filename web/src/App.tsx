import { BrowserRouter, Routes, Route } from "react-router-dom";

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

function App() {
  return (
    <BrowserRouter>
      <Routes>
         {/* Auth */}
        <Route path="/"               element={<Login />}           />
        <Route path="/register"       element={<Register />}        />
 
        {/* Tenant */}
        <Route path="/home"           element={<Home />}            />
        <Route path="/properties/:id" element={<PropertyDetail />}  />
        <Route path="/profile"        element={<Profile />}         />
        <Route path="/my-rentals" element={<MyRentals />} />
 
        {/* Owner */}
        <Route path="/owner/dashboard"   element={<OwnerDashboard />}  />
        <Route path="/owner/properties"  element={<OwnerProperties />} />
        <Route path="/owner/properties/new"   element={<AddProperty />}     />
        <Route path="/owner/properties/:id/edit"    element={<EditProperty />}    />

        {/* Edit */}
        <Route path="/admin/rental-requests" element={<AdminRentalRequests />} />
        
      </Routes>
    </BrowserRouter>
  );
}

export default App;