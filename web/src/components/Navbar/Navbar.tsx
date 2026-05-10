import React, { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import styles from "./Navbar.module.css";
import logo from "../../assets/images/cebunest-logo.png";
import { navbarApi } from "./navbarApi";
import {
  Bell,
  BellOff,
  CheckCircle,
  XCircle,
  Home,
  Ban,
  CreditCard,
  Star,
  LogOut,
  User,
  ChevronDown,
  Megaphone,
  Wrench,
  FileText,
  AlertTriangle,
  CalendarClock,
  Send
} from "lucide-react";

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

interface AppNotification {
  id: number;
  type: string;
  message: string;
  rentalRequestId: number | null;
  read: boolean;
  createdAt: string;
}

// ─── helpers ───────────────────────────────────────────────────────────────

function timeAgo(isoStr: string): string {
  const diff = Date.now() - new Date(isoStr).getTime();
  const mins = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);

  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return new Date(isoStr).toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
  });
}

// Map notification types to a clean Lucide icon and color scheme
function getNotifConfig(type: string) {
  // Admin Broadcasts
  if (type === "EMERGENCY") return { icon: <AlertTriangle size={18} />, color: "#c0392b", bg: "rgba(192,57,43,0.12)" };
  if (type === "MAINTENANCE") return { icon: <Wrench size={18} />, color: "#b78e42", bg: "rgba(183,142,66,0.12)" };
  if (type === "POLICY_UPDATE") return { icon: <FileText size={18} />, color: "#1f5d71", bg: "rgba(31,93,113,0.12)" };
  if (type === "ADMIN_BROADCAST") return { icon: <Megaphone size={18} />, color: "#1f5d71", bg: "rgba(31,93,113,0.12)" };

  // Lease / Request Actions
  if (type.includes("EXTENSION")) return { icon: <CalendarClock size={18} />, color: "#1f5d71", bg: "rgba(31,93,113,0.12)" };
  if (type.includes("SUBMITTED") || type.includes("REQUESTED")) return { icon: <Send size={18} />, color: "#53a4a3", bg: "rgba(83,164,163,0.12)" };

  // Existing Standard Actions
  if (type.includes("APPROVED")) return { icon: <CheckCircle size={18} />, color: "#2d8c6a", bg: "rgba(45,140,106,0.12)" };
  if (type.includes("REJECTED")) return { icon: <XCircle size={18} />, color: "#c0392b", bg: "rgba(192,57,43,0.12)" };
  if (type.includes("CONFIRMED")) return { icon: <Home size={18} />, color: "#53a4a3", bg: "rgba(83,164,163,0.12)" };
  if (type.includes("TERMINATED")) return { icon: <Ban size={18} />, color: "#c0392b", bg: "rgba(192,57,43,0.12)" };
  if (type.includes("PAYMENT")) return { icon: <CreditCard size={18} />, color: "#b78e42", bg: "rgba(183,142,66,0.12)" };
  if (type.includes("REVIEW")) return { icon: <Star size={18} />, color: "#b78e42", bg: "rgba(183,142,66,0.12)" };
  
  // Fallback
  return { icon: <Bell size={18} />, color: "#1f5d71", bg: "rgba(31,93,113,0.1)" };
}

// ─── component ─────────────────────────────────────────────────────────────

const Navbar: React.FC<NavbarProps> = ({ user }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const fetchNotifications = useCallback(async () => {
    setNotifLoading(true);
    try {
      const data = await navbarApi.getNotifications();
      if (data.success) setNotifications(data.data.notifications ?? []);
    } catch {
      // silent — badge will just show 0
    } finally {
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
      try {
        await navbarApi.markNotificationRead(notif.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
        );
      } catch { /* silent */ }
    }
    setNotifOpen(false);
    if (notif.rentalRequestId) navigate(`/my-rentals/${notif.rentalRequestId}`);
    else navigate("/my-rentals");
  };

  const markAllRead = async () => {
    setMarkingAll(true);
    try {
      await navbarApi.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
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

  const isActive = (path: string) => location.pathname === path ? styles.navLinkActive : "";
  const initials = user.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <>
      <nav className={styles.navbar}>
        <div className={styles.inner}>
          {/* ── Brand ── */}
          <Link to="/home" className={styles.brand}>
            <img src={logo} alt="CebuNest" className={styles.brandLogo} />
            <span className={styles.brandName}>CebuNest</span>
            <span className={styles.brandDot} />
          </Link>

          {/* ── Nav Links ── */}
          <div className={styles.navLinks}>
            <Link to="/home" className={`${styles.navLink} ${isActive("/home")}`}>
              Browse
            </Link>
            <Link to="/my-rentals" className={`${styles.navLink} ${isActive("/my-rentals")}`}>
              My Rentals
            </Link>
          </div>

          {/* ── Right Actions ── */}
          <div className={styles.actions}>
            
            {/* ── Notification Bell ── */}
            <div className={styles.notifWrap} ref={notifRef}>
              <button
                className={`${styles.notifBtn} ${notifOpen ? styles.notifBtnActive : ""}`}
                onClick={() => setNotifOpen((prev) => !prev)}
                aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
                aria-expanded={notifOpen}
              >
                <span className={styles.notifBellIcon}>
                  <Bell size={20} strokeWidth={2} />
                </span>
                {unreadCount > 0 && (
                  <span className={styles.notifBadge}>
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {/* ── Dropdown ── */}
              {notifOpen && (
                <div className={styles.notifDropdown} role="dialog" aria-label="Notifications">
                  <div className={styles.notifDropdownHeader}>
                    <span className={styles.notifDropdownTitle}>Notifications</span>
                    {unreadCount > 0 && (
                      <button className={styles.markAllBtn} onClick={markAllRead} disabled={markingAll} type="button">
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
                        <span className={styles.notifEmptyIcon}>
                          <BellOff size={32} strokeWidth={1.5} />
                        </span>
                        <span className={styles.notifEmptyText}>All caught up!</span>
                        <span className={styles.notifEmptySubtext}>No notifications yet.</span>
                      </div>
                    ) : (
                      notifications.map((notif) => {
                        const { icon, color, bg } = getNotifConfig(notif.type);
                        return (
                          <button
                            key={notif.id}
                            className={`${styles.notifItem} ${!notif.read ? styles.notifItemUnread : ""}`}
                            onClick={() => markRead(notif)}
                            type="button"
                          >
                            <span 
                              className={styles.notifItemIcon} 
                              style={{ color: color, backgroundColor: bg }}
                            >
                              {icon}
                            </span>
                            <div className={styles.notifItemBody}>
                              <p className={styles.notifItemMsg}>{notif.message}</p>
                              <span className={styles.notifItemTime}>{timeAgo(notif.createdAt)}</span>
                            </div>
                            {!notif.read && <span className={styles.notifDot} aria-hidden="true" />}
                          </button>
                        );
                      })
                    )}
                  </div>

                  {notifications.length > 0 && (
                    <div className={styles.notifDropdownFooter}>
                     <button
                        className={styles.viewAllBtn}
                        onClick={() => {
                          setNotifOpen(false);
                          navigate("/my-rentals");
                        }}
                        type="button"
                      >
                        View all rentals →
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── Profile Dropdown ── */}
            <div className={styles.profileWrap} ref={dropdownRef}>
              <button
                className={styles.profileBtn}
                onClick={() => setMenuOpen((prev) => !prev)}
                aria-expanded={menuOpen}
                aria-haspopup="true"
              >
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.name} className={styles.avatar} />
                ) : (
                  <div className={styles.avatarPlaceholder}>{initials}</div>
                )}
                <span className={styles.profileName}>{user.name.split(" ")[0]}</span>
                <span className={`${styles.chevron} ${menuOpen ? styles.chevronOpen : ""}`}>
                  <ChevronDown size={14} strokeWidth={2.5} />
                </span>
              </button>

              {menuOpen && (
                <div className={styles.dropdown} role="menu">
                  <div className={styles.dropdownHeader}>
                    <span className={styles.dropdownName}>{user.name}</span>
                    <span className={styles.dropdownEmail}>{user.email}</span>
                    <span className={styles.dropdownRole}>{user.role}</span>
                  </div>
                  <div className={styles.dropdownItems}>
                    <button
                      className={styles.dropdownItem}
                      role="menuitem"
                      onClick={() => {
                        setMenuOpen(false);
                        navigate("/tenant/profile");
                      }}
                    >
                      <User size={16} className={styles.dropdownItemIcon} />
                      Profile
                    </button>
                    <div className={styles.dropdownDivider} />
                    <button
                      className={`${styles.dropdownItem} ${styles.dropdownItemDanger}`}
                      role="menuitem"
                      onClick={() => {
                        setMenuOpen(false);
                        setShowLogoutModal(true);
                      }}
                    >
                      <LogOut size={16} className={styles.dropdownItemIcon} />
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* ── Logout Confirmation Modal ── */}
      {showLogoutModal && (
        <div className={styles.modalOverlay} onClick={() => setShowLogoutModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <LogOut size={40} color="#c0392b" className={styles.modalIcon} />
            <h3 className={styles.modalTitle}>Sign Out?</h3>
            <p className={styles.modalBody}>
              You'll be logged out of your account and returned to the login page.
            </p>
            <div className={styles.modalActions}>
              <button type="button" className={styles.modalCancelBtn} onClick={() => setShowLogoutModal(false)}>
                Cancel
              </button>
              <button type="button" className={styles.modalConfirmBtn} onClick={confirmLogout}>
                Yes, Log Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;