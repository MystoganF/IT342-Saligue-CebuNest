import React, { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import styles from "./OwnerNavbar.module.css";
import logo from "../../assets/images/cebunest-logo.png";
import { ownerNavbarApi } from "./ownerNavbarApi";
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
  Send,
  Info,
  Users,
  Shield
} from "lucide-react";

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
  targetRoles?: string[];
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

function getNotifConfig(type: string) {
  if (type === "EMERGENCY") return { icon: <AlertTriangle size={18} />, color: "#ef4444", bg: "rgba(239, 68, 68, 0.1)" };
  if (type === "MAINTENANCE") return { icon: <Wrench size={18} />, color: "#d97706", bg: "rgba(217, 119, 6, 0.1)" };
  if (type === "POLICY_UPDATE") return { icon: <FileText size={18} />, color: "#0ea5e9", bg: "rgba(14, 165, 233, 0.1)" };
  if (type === "ADMIN_BROADCAST") return { icon: <Megaphone size={18} />, color: "#0f766e", bg: "rgba(15, 118, 110, 0.1)" };
  if (type.includes("EXTENSION")) return { icon: <CalendarClock size={18} />, color: "#0f766e", bg: "rgba(15, 118, 110, 0.1)" };
  if (type.includes("SUBMITTED") || type.includes("REQUESTED")) return { icon: <Send size={18} />, color: "#0ea5e9", bg: "rgba(14, 165, 233, 0.1)" };
  if (type.includes("APPROVED")) return { icon: <CheckCircle size={18} />, color: "#10b981", bg: "rgba(16, 185, 129, 0.1)" };
  if (type.includes("REJECTED")) return { icon: <XCircle size={18} />, color: "#ef4444", bg: "rgba(239, 68, 68, 0.1)" };
  if (type.includes("CONFIRMED")) return { icon: <Home size={18} />, color: "#10b981", bg: "rgba(16, 185, 129, 0.1)" };
  if (type.includes("TERMINATED")) return { icon: <Ban size={18} />, color: "#ef4444", bg: "rgba(239, 68, 68, 0.1)" };
  if (type.includes("PAYMENT")) return { icon: <CreditCard size={18} />, color: "#d97706", bg: "rgba(217, 119, 6, 0.1)" };
  if (type.includes("REVIEW")) return { icon: <Star size={18} />, color: "#d97706", bg: "rgba(217, 119, 6, 0.1)" };
  return { icon: <Bell size={18} />, color: "#64748b", bg: "rgba(100, 116, 139, 0.1)" };
}

function isAdminBroadcast(type: string): boolean {
  return ["ADMIN_BROADCAST", "MAINTENANCE", "POLICY_UPDATE", "EMERGENCY"].includes(type);
}

// ─── component ─────────────────────────────────────────────────────────────

const OwnerNavbar: React.FC<OwnerNavbarProps> = ({ user, onAddProperty }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [selectedAdminNotif, setSelectedAdminNotif] = useState<AppNotification | null>(null);

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setMenuOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const fetchNotifications = useCallback(async () => {
    setNotifLoading(true);
    try {
      const data = await ownerNavbarApi.getNotifications();
      if (data.success) setNotifications(data.data.notifications ?? []);
    } catch { /* silent */ } finally { setNotifLoading(false); }
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
        await ownerNavbarApi.markNotificationRead(notif.id);
        setNotifications((prev) => prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n)));
      } catch { /* silent */ }
    }
    
    setNotifOpen(false);
    
    if (isAdminBroadcast(notif.type)) {
      setSelectedAdminNotif(notif);
    } else {
      if (notif.propertyId) navigate(`/owner/properties/${notif.propertyId}/edit`);
      else navigate("/owner/dashboard");
    }
  };

  const markAllRead = async () => {
    setMarkingAll(true);
    try {
      await ownerNavbarApi.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch { /* silent */ } finally { setMarkingAll(false); }
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
          
          <Link to="/owner/dashboard" className={styles.brand}>
            <img src={logo} alt="CebuNest" className={styles.brandLogo} />
            <span className={styles.brandName}>CebuNest</span>
            <span className={styles.brandPill}>Owner</span>
          </Link>

          <div className={styles.navLinks}>
            <Link to="/owner/dashboard" className={`${styles.navLink} ${isActive("/owner/dashboard")}`}>
             Dashboard
            </Link>
            <Link to="/owner/properties" className={`${styles.navLink} ${isActive("/owner/properties")}`}>
            My Properties
            </Link>
          </div>

          <div className={styles.actions}>
            <button className={styles.addBtn} onClick={onAddProperty} type="button">
              + Add Property
            </button>

            <div className={styles.notifWrap} ref={notifRef}>
              <button
                className={`${styles.notifBtn} ${notifOpen ? styles.notifBtnActive : ""}`}
                onClick={() => setNotifOpen((prev) => !prev)}
                aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
                aria-expanded={notifOpen}
              >
                <span className={styles.notifBellIcon}><Bell size={20} strokeWidth={2} /></span>
                {unreadCount > 0 && <span className={styles.notifBadge}>{unreadCount > 9 ? "9+" : unreadCount}</span>}
              </button>

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
                      <div className={styles.notifEmpty}><div className={styles.notifSpinner} /><span>Loading…</span></div>
                    ) : notifications.length === 0 ? (
                      <div className={styles.notifEmpty}>
                        <span className={styles.notifEmptyIcon}><BellOff size={32} strokeWidth={1.5} /></span>
                        <span className={styles.notifEmptyText}>All caught up!</span>
                        <span className={styles.notifEmptySubtext}>No notifications yet.</span>
                      </div>
                    ) : (
                      notifications.map((notif) => {
                        const { icon, color, bg } = getNotifConfig(notif.type);
                        return (
                          <button key={notif.id} className={`${styles.notifItem} ${!notif.read ? styles.notifItemUnread : ""}`} onClick={() => markRead(notif)} type="button">
                            <span className={styles.notifItemIcon} style={{ color: color, backgroundColor: bg }}>{icon}</span>
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
                      <button className={styles.viewAllBtn} onClick={() => { setNotifOpen(false); navigate("/owner/properties"); }} type="button">View all properties →</button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className={styles.profileWrap} ref={dropdownRef}>
              <button className={styles.profileBtn} onClick={() => setMenuOpen((prev) => !prev)} aria-expanded={menuOpen} aria-haspopup="true">
                {user.avatarUrl ? <img src={user.avatarUrl} alt={user.name} className={styles.avatar} /> : <div className={styles.avatarPlaceholder}>{initials}</div>}
                <span className={styles.profileName}>{user.name.split(" ")[0]}</span>
                <span className={`${styles.chevron} ${menuOpen ? styles.chevronOpen : ""}`}><ChevronDown size={14} strokeWidth={2.5} /></span>
              </button>
              {menuOpen && (
                <div className={styles.dropdown} role="menu">
                  <div className={styles.dropdownHeader}>
                    <span className={styles.dropdownName}>{user.name}</span>
                    <span className={styles.dropdownEmail}>{user.email}</span>
                    <span className={styles.dropdownRole}>{user.role}</span>
                  </div>
                  <div className={styles.dropdownItems}>
                    <button className={styles.dropdownItem} role="menuitem" onClick={() => { setMenuOpen(false); navigate("/owner/profile"); }}><User size={16} className={styles.dropdownItemIcon} /> Profile</button>
                    <div className={styles.dropdownDivider} />
                    <button className={`${styles.dropdownItem} ${styles.dropdownItemDanger}`} role="menuitem" onClick={() => { setMenuOpen(false); setShowLogoutModal(true); }}><LogOut size={16} className={styles.dropdownItemIcon} /> Logout</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Logout Modal */}
      {showLogoutModal && (
        <div className={styles.modalOverlay} onClick={() => setShowLogoutModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <LogOut size={40} color="#c0392b" className={styles.modalIcon} />
            <h3 className={styles.modalTitle}>Sign Out?</h3>
            <p className={styles.modalBody}>You'll be logged out of your owner account and returned to the login page.</p>
            <div className={styles.modalActions}>
              <button type="button" className={styles.modalCancelBtn} onClick={() => setShowLogoutModal(false)}>Cancel</button>
              <button type="button" className={styles.modalConfirmBtn} onClick={confirmLogout}>Yes, Log Out</button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Broadcast Modal */}
      {selectedAdminNotif && (
        <div className={styles.modalOverlay} onClick={() => setSelectedAdminNotif(null)}>
          <div 
            className={`${styles.modal} ${styles.adminModal}`} 
            onClick={(e) => e.stopPropagation()} 
          >
            
            {/* Header Area */}
            <div className={styles.adminModalHeader}>
              <span 
                className={styles.adminModalIconBox}
                style={{ 
                  color: getNotifConfig(selectedAdminNotif.type).color, 
                  backgroundColor: getNotifConfig(selectedAdminNotif.type).bg 
                }}
              >
                {React.cloneElement(getNotifConfig(selectedAdminNotif.type).icon, { size: 24 })}
              </span>
              
              <div className={styles.adminModalTitleWrap}>
                <h3 className={styles.adminModalTitle}>
                  {selectedAdminNotif.type.replace(/_/g, " ")}
                </h3>
                
                {/* Modern Badges for Sender and Recipients */}
                <div className={styles.adminModalBadges}>
                  <span className={styles.adminModalBadgeSystem}>
                    <Shield size={12} /> System Administration
                  </span>
                
                </div>
              </div>
            </div>

            {/* Message Body Area with Scroll for very long text */}
            <div className={styles.adminModalBodyBox}>
              <p className={styles.adminModalMessage}>
                {selectedAdminNotif.message}
              </p>
              
              <div className={styles.adminModalMeta}>
                <Info size={14} /> Sent on {new Date(selectedAdminNotif.createdAt).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" })}
              </div>
            </div>


          </div>
        </div>
      )}
    </>
  );
};

export default OwnerNavbar;