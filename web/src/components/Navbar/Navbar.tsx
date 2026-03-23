import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import styles from "./Navbar.module.css";
import logo from "../../assets/images/cebunest-logo.png";

// ─── types ─────────────────────────────────────────────────────────────────

interface NavUser {
  id: number;
  name: string;
  email: string;
  role: string;
  avatarUrl?: string | null;
}

interface NavbarProps {
  user: NavUser;
  notificationCount?: number;
}

// ─── component ─────────────────────────────────────────────────────────────

const Navbar: React.FC<NavbarProps> = ({ user, notificationCount = 0 }) => {
  const navigate  = useNavigate();
  const location  = useLocation();
  const [open, setOpen] = useState(false);
  const dropdownRef     = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    navigate("/");
  };

  const isActive = (path: string) =>
    location.pathname === path ? styles.navLinkActive : "";

  // Build initials for avatar placeholder
  const initials = user.name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <nav className={styles.navbar}>
      <div className={styles.inner}>

        {/* ── Brand ── */}
        <a href="/home" className={styles.brand}>
          <img src={logo} alt="CebuNest" className={styles.brandLogo} />
          <span className={styles.brandName}>CebuNest</span>
          <span className={styles.brandDot} />
        </a>

        {/* ── Nav Links ── */}
        <div className={styles.navLinks}>
          <a
            href="/home"
            className={`${styles.navLink} ${isActive("/home")}`}
          >
            <span className={styles.navLinkIcon}>🏠</span>
            Browse
          </a>

          <a
            href="/my-rentals"
            className={`${styles.navLink} ${isActive("/my-rentals")}`}
          >
            <span className={styles.navLinkIcon}>📋</span>
            My Rentals
          </a>

          <a
            href="/notifications"
            className={`${styles.navLink} ${isActive("/notifications")} ${styles.navLinkBadge}`}
          >
            <span className={styles.navLinkIcon}>🔔</span>
            Notifications
            {notificationCount > 0 && (
              <span className={styles.badge}>
                {notificationCount > 9 ? "9+" : notificationCount}
              </span>
            )}
          </a>
        </div>

        {/* ── Right: Profile Dropdown ── */}
        <div className={styles.actions}>
          <div className={styles.profileWrap} ref={dropdownRef}>
            <button
              className={styles.profileBtn}
              onClick={() => setOpen((prev) => !prev)}
              aria-expanded={open}
              aria-haspopup="true"
            >
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  className={styles.avatar}
                />
              ) : (
                <div className={styles.avatarPlaceholder}>{initials}</div>
              )}
              <span className={styles.profileName}>{user.name.split(" ")[0]}</span>
              <span className={`${styles.chevron} ${open ? styles.chevronOpen : ""}`}>
                ▼
              </span>
            </button>

            {open && (
              <div className={styles.dropdown} role="menu">
                {/* User info header */}
                <div className={styles.dropdownHeader}>
                  <span className={styles.dropdownName}>{user.name}</span>
                  <span className={styles.dropdownEmail}>{user.email}</span>
                  <span className={styles.dropdownRole}>{user.role}</span>
                </div>

                <div className={styles.dropdownItems}>
                  <a
                    href="/profile"
                    className={styles.dropdownItem}
                    role="menuitem"
                    onClick={() => setOpen(false)}
                  >
                    <span className={styles.dropdownItemIcon}></span>
                    Profile
                  </a>

                  <div className={styles.dropdownDivider} />

                  <button
                    className={`${styles.dropdownItem} ${styles.dropdownItemDanger}`}
                    role="menuitem"
                    onClick={handleLogout}
                  >
                    <span className={styles.dropdownItemIcon}></span>
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </nav>
  );
};

export default Navbar;