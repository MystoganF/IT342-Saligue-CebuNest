import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import styles from "./OwnerNavbar.module.css";
import logo from "../../assets/images/cebunest-logo.png";

// ─── types ─────────────────────────────────────────────────────────────────

interface NavUser {
  id: number;
  name: string;
  email: string;
  role: string;
  avatarUrl?: string | null;
}

interface OwnerNavbarProps {
  user: NavUser;
  notificationCount?: number;
  onAddProperty?: () => void; // triggers the add property modal/page
}

// ─── component ─────────────────────────────────────────────────────────────

const OwnerNavbar: React.FC<OwnerNavbarProps> = ({
  user,
  notificationCount = 0,
  onAddProperty,
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  const [open, setOpen]                     = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const dropdownRef                          = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const confirmLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    navigate("/");
  };

  const isActive = (path: string) =>
    location.pathname === path ? styles.navLinkActive : "";

  const initials = user.name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <>
      <nav className={styles.navbar}>
        <div className={styles.inner}>

          {/* ── Brand ── */}
          <a href="/owner/dashboard" className={styles.brand}>
            <img src={logo} alt="CebuNest" className={styles.brandLogo} />
            <span className={styles.brandName}>CebuNest</span>
            <span className={styles.brandPill}>Owner</span>
          </a>

          {/* ── Nav Links ── */}
          <div className={styles.navLinks}>
            <a
              href="/owner/dashboard"
              className={`${styles.navLink} ${isActive("/owner/dashboard")}`}
            >
              <span className={styles.navLinkIcon}>📊</span>
              Dashboard
            </a>

            <a
              href="/owner/properties"
              className={`${styles.navLink} ${isActive("/owner/properties")}`}
            >
              <span className={styles.navLinkIcon}>🏠</span>
              My Properties
            </a>

            <a
              href="/owner/notifications"
              className={`${styles.navLink} ${isActive("/owner/notifications")} ${styles.navLinkBadge}`}
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

          {/* ── Right Actions ── */}
          <div className={styles.actions}>
            {/* Quick add button */}
            <button
              className={styles.addBtn}
              onClick={onAddProperty}
              type="button"
            >
              + Add Property
            </button>

            {/* Profile dropdown */}
            <div className={styles.profileWrap} ref={dropdownRef}>
              <button
                className={styles.profileBtn}
                onClick={() => setOpen((p) => !p)}
                aria-expanded={open}
                aria-haspopup="true"
              >
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.name} className={styles.avatar} />
                ) : (
                  <div className={styles.avatarPlaceholder}>{initials}</div>
                )}
                <span className={styles.profileName}>{user.name.split(" ")[0]}</span>
                <span className={`${styles.chevron} ${open ? styles.chevronOpen : ""}`}>▼</span>
              </button>

              {open && (
                <div className={styles.dropdown} role="menu">
                  <div className={styles.dropdownHeader}>
                    <span className={styles.dropdownName}>{user.name}</span>
                    <span className={styles.dropdownEmail}>{user.email}</span>
                    <span className={styles.dropdownRole}>🔑 Owner</span>
                  </div>

                  <div className={styles.dropdownItems}>
                    <a
                      href="/profile"
                      className={styles.dropdownItem}
                      role="menuitem"
                      onClick={() => setOpen(false)}
                    >
                      <span className={styles.dropdownItemIcon}>👤</span>
                      Profile
                    </a>

                    <div className={styles.dropdownDivider} />

                    <button
                      className={`${styles.dropdownItem} ${styles.dropdownItemDanger}`}
                      role="menuitem"
                      onClick={() => { setOpen(false); setShowLogoutModal(true); }}
                    >
                      <span className={styles.dropdownItemIcon}>🚪</span>
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </nav>

      {/* ── Logout Modal ── */}
      {showLogoutModal && (
        <div className={styles.modalOverlay} onClick={() => setShowLogoutModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalIcon}>🚪</div>
            <h3 className={styles.modalTitle}>Sign Out?</h3>
            <p className={styles.modalBody}>
              You'll be logged out of your owner account and returned to the login page.
            </p>
            <div className={styles.modalActions}>
              <button className={styles.modalCancelBtn} onClick={() => setShowLogoutModal(false)}>
                Cancel
              </button>
              <button className={styles.modalConfirmBtn} onClick={confirmLogout}>
                Yes, Log Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default OwnerNavbar;