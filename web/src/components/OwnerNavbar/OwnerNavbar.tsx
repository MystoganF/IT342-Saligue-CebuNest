import React, { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import styles from "./OwnerNavbar.module.css";
import logo from "../../assets/images/cebunest-logo.png";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

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
  onAddProperty?: () => void;
}

interface AppNotification {
  id: number;
  type: string;
  message: string;
  rentalRequestId: number | null;
  propertyId: number | null;
  read: boolean;
  createdAt: string;
}

function timeAgo(isoStr: string): string {
  const diff  = Date.now() - new Date(isoStr).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins  < 1)  return "just now";
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days  < 7)  return `${days}d ago`;
  return new Date(isoStr).toLocaleDateString("en-PH", { month: "short", day: "numeric" });
}

function notifIcon(type: string): string {
  if (type === "PAYMENT_RECEIVED")    return "💳";
  if (type === "RENTAL_CONFIRMED")    return "🏠";
  if (type === "NEW_REVIEW")          return "⭐";
  if (type === "EXTENSION_REQUESTED") return "📋";
  if (type === "PROPERTY_APPROVED")   return "✅";
  if (type === "PROPERTY_REJECTED")   return "❌";
  return "🔔";
}

const OwnerNavbar: React.FC<OwnerNavbarProps> = ({ user, onAddProperty }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const [menuOpen, setMenuOpen]               = useState(false);
  const [notifOpen, setNotifOpen]             = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [notifLoading, setNotifLoading]   = useState(false);
  const [markingAll, setMarkingAll]       = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const notifRef    = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node))
        setMenuOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node))
        setNotifOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const fetchNotifications = useCallback(async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;
    setNotifLoading(true);
    try {
      const res  = await fetch(`${API_BASE}/api/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setNotifications(data.data.notifications ?? []);
    } catch { /* silent */ } finally {
      setNotifLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30_000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  useEffect(() => {
    if (notifOpen) fetchNotifications();
  }, [notifOpen, fetchNotifications]);

  const markRead = async (notif: AppNotification) => {
    if (!notif.read) {
      const token = localStorage.getItem("accessToken");
      try {
        await fetch(`${API_BASE}/api/notifications/${notif.id}/read`, {
          method: "PATCH",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        setNotifications(prev =>
          prev.map(n => n.id === notif.id ? { ...n, read: true } : n)
        );
      } catch { /* silent */ }
    }
    setNotifOpen(false);
    if (notif.propertyId) {
      navigate(`/owner/properties/${notif.propertyId}/edit`);
    } else {
      navigate("/owner/dashboard");
    }
  };

  const markAllRead = async () => {
    const token = localStorage.getItem("accessToken");
    setMarkingAll(true);
    try {
      await fetch(`${API_BASE}/api/notifications/read-all`, {
        method: "PATCH",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch { /* silent */ } finally {
      setMarkingAll(false);
    }
  };

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

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <>
      <nav className={styles.navbar}>
        <div className={styles.inner}>

          <a href="/owner/dashboard" className={styles.brand}>
            <img src={logo} alt="CebuNest" className={styles.brandLogo} />
            <span className={styles.brandName}>CebuNest</span>
            <span className={styles.brandPill}>Owner</span>
          </a>

          <div className={styles.navLinks}>
            <a href="/owner/dashboard" className={`${styles.navLink} ${isActive("/owner/dashboard")}`}>
              <span className={styles.navLinkIcon}>📊</span>Dashboard
            </a>
            <a href="/owner/properties" className={`${styles.navLink} ${isActive("/owner/properties")}`}>
              <span className={styles.navLinkIcon}>🏠</span>My Properties
            </a>
          </div>

          <div className={styles.actions}>
            <button className={styles.addBtn} onClick={onAddProperty} type="button">
              + Add Property
            </button>

            <div className={styles.notifWrap} ref={notifRef}>
              <button
                className={`${styles.notifBtn} ${notifOpen ? styles.notifBtnActive : ""}`}
                onClick={() => setNotifOpen(prev => !prev)}
                aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
                aria-expanded={notifOpen}
              >
                <span className={styles.notifBellIcon}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                    strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                </span>
                {unreadCount > 0 && (
                  <span className={styles.notifBadge}>
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className={styles.notifDropdown} role="dialog" aria-label="Notifications">
                  <div className={styles.notifDropdownHeader}>
                    <span className={styles.notifDropdownTitle}>Notifications</span>
                    {unreadCount > 0 && (
                      <button
                        className={styles.markAllBtn}
                        onClick={markAllRead}
                        disabled={markingAll}
                        type="button"
                      >
                        {markingAll ? "Marking…" : "Mark all read"}
                      </button>
                    )}
                  </div>

                  <div className={styles.notifList}>
                    {notifLoading && notifications.length === 0 ? (
                      <div className={styles.notifEmpty}>
                        <div className={styles.notifSpinner} />
                        <span>Loading…</span>
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className={styles.notifEmpty}>
                        <span className={styles.notifEmptyIcon}>🔔</span>
                        <span className={styles.notifEmptyText}>All caught up!</span>
                        <span className={styles.notifEmptySubtext}>No notifications yet.</span>
                      </div>
                    ) : (
                      notifications.map(notif => (
                        <button
                          key={notif.id}
                          className={`${styles.notifItem} ${!notif.read ? styles.notifItemUnread : ""}`}
                          onClick={() => markRead(notif)}
                          type="button"
                        >
                          <span className={styles.notifItemIcon}>{notifIcon(notif.type)}</span>
                          <div className={styles.notifItemBody}>
                            <p className={styles.notifItemMsg}>{notif.message}</p>
                            <span className={styles.notifItemTime}>{timeAgo(notif.createdAt)}</span>
                          </div>
                          {!notif.read && <span className={styles.notifDot} aria-hidden="true" />}
                        </button>
                      ))
                    )}
                  </div>

                  {notifications.length > 0 && (
                    <div className={styles.notifDropdownFooter}>
                      <button
                        className={styles.viewAllBtn}
                        onClick={() => { setNotifOpen(false); navigate("/owner/properties"); }}
                        type="button"
                      >
                        View all properties →
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className={styles.profileWrap} ref={dropdownRef}>
              <button
                className={styles.profileBtn}
                onClick={() => setMenuOpen(p => !p)}
                aria-expanded={menuOpen}
                aria-haspopup="true"
              >
                {user.avatarUrl
                  ? <img src={user.avatarUrl} alt={user.name} className={styles.avatar} />
                  : <div className={styles.avatarPlaceholder}>{initials}</div>
                }
                <span className={styles.profileName}>{user.name.split(" ")[0]}</span>
                <span className={`${styles.chevron} ${menuOpen ? styles.chevronOpen : ""}`}>▼</span>
              </button>

              {menuOpen && (
                <div className={styles.dropdown} role="menu">
                  <div className={styles.dropdownHeader}>
                    <span className={styles.dropdownName}>{user.name}</span>
                    <span className={styles.dropdownEmail}>{user.email}</span>
                    <span className={styles.dropdownRole}>🔑 Owner</span>
                  </div>
                  <div className={styles.dropdownItems}>
                    <a href="/profile" className={styles.dropdownItem} role="menuitem"
                      onClick={() => setMenuOpen(false)}>
                      <span className={styles.dropdownItemIcon}>👤</span>Profile
                    </a>
                    <div className={styles.dropdownDivider} />
                    <button
                      className={`${styles.dropdownItem} ${styles.dropdownItemDanger}`}
                      role="menuitem"
                      onClick={() => { setMenuOpen(false); setShowLogoutModal(true); }}
                    >
                      <span className={styles.dropdownItemIcon}>🚪</span>Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {showLogoutModal && (
        <div className={styles.modalOverlay} onClick={() => setShowLogoutModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalIcon}>🚪</div>
            <h3 className={styles.modalTitle}>Sign Out?</h3>
            <p className={styles.modalBody}>
              You'll be logged out of your owner account and returned to the login page.
            </p>
            <div className={styles.modalActions}>
              <button className={styles.modalCancelBtn} onClick={() => setShowLogoutModal(false)}>Cancel</button>
              <button className={styles.modalConfirmBtn} onClick={confirmLogout}>Yes, Log Out</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default OwnerNavbar;