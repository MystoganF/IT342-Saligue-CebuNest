import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login    from "./modules/authentication_module/login_module/Login";
import Register from "./modules/authentication_module/register_module/Register";
import Home     from "./modules/tenant_module/tenant_landing_module/Home";
import PropertyDetail from "./modules/tenant_module/renting_module/Property_detail";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"         element={<Login />}    />
        <Route path="/register" element={<Register />} />
        <Route path="/home"     element={<Home />}     />
        <Route path="/properties/:id"    element={<PropertyDetail />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;