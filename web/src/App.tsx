import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Login from "./modules/authentication_module/login_module/Login";


function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Default route */}
        <Route path="/" element={<Login />} />
        
      </Routes>
    </BrowserRouter>
  );
}

export default App;