import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./Navbar.css";
import logo from "../../assets/images/cebunest-logo.png";

const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const storedUser = localStorage.getItem("user");
  const user = storedUser ? JSON.parse(storedUser) : null;
  const initials = user?.name
    ? user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node))
        setProfileOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/";
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="cn-navbar">
      <div className="cn-navbar-inner">

        {/* Brand */}
        <div className="cn-navbar-brand" onClick={() => navigate("/home")}>
          <img src={logo} alt="CebuNest" className="cn-navbar-logo" />
          <span className="cn-navbar-wordmark">CebuNest</span>
        </div>

        {/* Nav links */}
        <nav className={`cn-navbar-nav${menuOpen ? " cn-navbar-nav--open" : ""}`}>
          <span
            className={`cn-nav-link${isActive("/home") ? " cn-nav-link--active" : ""}`}
            onClick={() => navigate("/home")}
          >
            Browse
          </span>
          <span className="cn-nav-link">My Rentals</span>
          <span className="cn-nav-link">Notifications</span>
        </nav>

        {/* Actions */}
        <div className="cn-navbar-actions">
          <div className="cn-profile-wrapper" ref={profileRef}>
            <button
              className="cn-navbar-avatar"
              onClick={() => setProfileOpen((o) => !o)}
              aria-label="Profile menu"
              aria-expanded={profileOpen}
            >
              {initials}
            </button>

            {profileOpen && (
              <div className="cn-profile-dropdown">
                <div className="cn-profile-dropdown-header">
                  <div className="cn-profile-dropdown-avatar">{initials}</div>
                  <div className="cn-profile-dropdown-info">
                    <span className="cn-profile-dropdown-name">{user?.name || "User"}</span>
                    <span className="cn-profile-dropdown-email">{user?.email || ""}</span>
                  </div>
                </div>
                <div className="cn-profile-dropdown-divider" />
                <button className="cn-profile-dropdown-item" disabled>
                  <span className="cn-profile-dropdown-icon">👤</span>
                  <span>My Profile</span>
                  <span className="cn-profile-dropdown-soon">Soon</span>
                </button>
                <div className="cn-profile-dropdown-divider" />
                <button
                  className="cn-profile-dropdown-item cn-profile-dropdown-item--logout"
                  onClick={handleLogout}
                >
                  <span className="cn-profile-dropdown-icon">🚪</span>
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>

          <button
            className="cn-hamburger"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Toggle menu"
          >
            <span /><span /><span />
          </button>
        </div>

      </div>
    </header>
  );
};

export default Navbar;