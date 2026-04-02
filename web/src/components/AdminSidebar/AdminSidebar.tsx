import React, { useRef, useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import styles from "./AdminSidebar.module.css";

interface AdminUser {
  name: string;
  email: string;
}

interface NavItem {
  path: string;
  icon: string;
  label: string;
  badge?: number;
}

interface Props {
  user: AdminUser;
  navItems?: NavItem[];
}

const DEFAULT_NAV: NavItem[] = [
  { path: "/admin/rental-requests", icon: "📋", label: "Rental Requests" },
  { path: "/admin/properties",      icon: "🏘️", label: "All Properties"  },
  { path: "/admin/users",           icon: "👥", label: "Users"           },
];

const AdminSidebar: React.FC<Props> = ({ user, navItems = DEFAULT_NAV }) => {
  const navigate    = useNavigate();
  const location    = useLocation();
  const profileRef  = useRef<HTMLDivElement>(null);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node))
        setProfileOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    window.location.href = "/";
  };

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>
        <span className={styles.logoIcon}>🏡</span>
        <span className={styles.logoText}>CebuNest</span>
      </div>

      <nav className={styles.nav}>
        {navItems.map((item) => {
          const active = location.pathname === item.path;
          return (
            <button
              key={item.path}
              className={`${styles.navItem} ${active ? styles.navItemActive : ""}`}
              onClick={() => navigate(item.path)}
              type="button"
            >
              <span className={styles.navIcon}>{item.icon}</span>
              {item.label}
              {item.badge != null && item.badge > 0 && (
                <span className={styles.navBadge}>{item.badge}</span>
              )}
            </button>
          );
        })}
      </nav>

      <div className={styles.footer} ref={profileRef}>
        {profileOpen && (
          <div className={styles.dropdown}>
            <div className={styles.dropdownInfo}>
              <div className={styles.dropdownName}>{user.name}</div>
              <div className={styles.dropdownEmail}>{user.email}</div>
            </div>
            <div className={styles.dropdownDivider} />
            <button className={styles.dropdownLogout} onClick={handleLogout} type="button">
              <span>⎋</span> Logout
            </button>
          </div>
        )}
        <button
          className={`${styles.profile} ${profileOpen ? styles.profileActive : ""}`}
          onClick={() => setProfileOpen((p) => !p)}
          type="button"
        >
          <div className={styles.avatar}>{user.name?.charAt(0).toUpperCase()}</div>
          <div className={styles.profileInfo}>
            <div className={styles.profileName}>{user.name}</div>
            <div className={styles.profileRole}>Administrator</div>
          </div>
          <span className={`${styles.chevron} ${profileOpen ? styles.chevronOpen : ""}`}>›</span>
        </button>
      </div>
    </aside>
  );
};

export default AdminSidebar;