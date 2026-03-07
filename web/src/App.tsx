import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Login from "./modules/authentication_module/login_module/Login";
import Register from "./modules/authentication_module/register_module/Register";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Default route */}
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
      </Routes>
    </BrowserRouter>
  );
}

export default App;