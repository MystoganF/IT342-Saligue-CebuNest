import React from "react";
import "./Navbar.css";
import logo from "../../assets/images/cebunest-logo.png";

const Footer: React.FC = () => (
  <footer className="cn-footer">
    <div className="cn-footer-inner">
      <div className="cn-footer-brand">
        <img src={logo} alt="CebuNest" className="cn-footer-logo" />
        <span className="cn-footer-wordmark">CebuNest</span>
      </div>
      <p className="cn-footer-copy">© 2026 CebuNest. All rights reserved.</p>
    </div>
  </footer>
);

export default Footer;