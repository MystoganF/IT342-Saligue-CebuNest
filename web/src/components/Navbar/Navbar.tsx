import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import styles from "./Navbar.module.css";
import logo from "../../assets/images/cebunest-logo.png";

/* ─────────────────────────────────────────
   Types
───────────────────────────────────────── */
interface UserData {
  name: string;
  email: string;
  avatarUrl?: string;
}

/* ─────────────────────────────────────────
   Helper: read + parse user from storage
───────────────────────────────────────── */
function getStoredUser(): UserData | null {
  const raw = localStorage.getItem("user");
  return raw ? JSON.parse(raw) : null;
}

/* ─────────────────────────────────────────
   Helper: derive initials from a full name
───────────────────────────────────────── */
function getInitials(name: string): string {
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/* ─────────────────────────────────────────
   Sub-component: Avatar (image or initials)
───────────────────────────────────────── */
interface AvatarProps {
  avatarUrl: string | null;
  initials: string;
  className?: string;
  imgClassName?: string;
}

function Avatar({ avatarUrl, initials, className, imgClassName }: AvatarProps) {
  if (avatarUrl) {
    return <img src={avatarUrl} alt={initials} className={imgClassName} />;
  }
  return <span className={className}>{initials}</span>;
}

/* ─────────────────────────────────────────
   Sub-component: Profile dropdown menu
───────────────────────────────────────── */
interface ProfileDropdownProps {
  user: UserData | null;
  avatarUrl: string | null;
  initials: string;
  isProfileActive: boolean;
  onProfileClick: () => void;
  onLogout: () => void;
}

function ProfileDropdown({
  user,
  avatarUrl,
  initials,
  isProfileActive,
  onProfileClick,
  onLogout,
}: ProfileDropdownProps) {
  return (
    <div className={styles.dropdown}>
      {/* User info header */}
      <div className={styles.dropdownHeader}>
        <div className={styles.dropdownAvatar}>
          <Avatar
            avatarUrl={avatarUrl}
            initials={initials}
            imgClassName={styles.dropdownAvatarImg}
          />
        </div>
        <div className={styles.dropdownUserInfo}>
          <span className={styles.dropdownName}>{user?.name || "User"}</span>
          <span className={styles.dropdownEmail}>{user?.email || ""}</span>
        </div>
      </div>

      <div className={styles.dropdownDivider} />

      {/* My Profile */}
      <button
        className={`${styles.dropdownItem}${isProfileActive ? ` ${styles.dropdownItemActive}` : ""}`}
        onClick={onProfileClick}
      >
        <span className={styles.dropdownIcon}>👤</span>
        <span>My Profile</span>
      </button>

      <div className={styles.dropdownDivider} />

      {/* Logout */}
      <button
        className={`${styles.dropdownItem} ${styles.dropdownItemLogout}`}
        onClick={onLogout}
      >
        <span className={styles.dropdownIcon}>🚪</span>
        <span>Logout</span>
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────
   Main Navbar component
───────────────────────────────────────── */
const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [menuOpen,    setMenuOpen]    = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const profileRef = useRef<HTMLDivElement>(null);

  const user      = getStoredUser();
  const initials  = user?.name ? getInitials(user.name) : "?";
  const avatarUrl = user?.avatarUrl || null;

  const isActive = (path: string) => location.pathname === path;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/";
  };

  const handleProfileClick = () => {
    setProfileOpen(false);
    navigate("/profile");
  };

  return (
    <header className={styles.navbar}>
      <div className={styles.navbarInner}>

        {/* Brand */}
        <div className={styles.brand} onClick={() => navigate("/home")}>
          <img src={logo} alt="CebuNest" className={styles.brandLogo} />
          <span className={styles.brandWordmark}>CebuNest</span>
        </div>

        {/* Nav links */}
        <nav className={`${styles.nav}${menuOpen ? ` ${styles.navOpen}` : ""}`}>
          <span
            className={`${styles.navLink}${isActive("/home") ? ` ${styles.navLinkActive}` : ""}`}
            onClick={() => navigate("/home")}
          >
            Browse
          </span>
          <span className={styles.navLink}>My Rentals</span>
          <span className={styles.navLink}>Notifications</span>
        </nav>

        {/* Actions */}
        <div className={styles.actions}>

          {/* Profile avatar + dropdown */}
          <div className={styles.profileWrapper} ref={profileRef}>
            <button
              className={styles.avatarBtn}
              onClick={() => setProfileOpen((prev) => !prev)}
              aria-label="Profile menu"
              aria-expanded={profileOpen}
            >
              <Avatar
                avatarUrl={avatarUrl}
                initials={initials}
                imgClassName={styles.avatarImg}
              />
            </button>

            {profileOpen && (
              <ProfileDropdown
                user={user}
                avatarUrl={avatarUrl}
                initials={initials}
                isProfileActive={isActive("/profile")}
                onProfileClick={handleProfileClick}
                onLogout={handleLogout}
              />
            )}
          </div>

          {/* Hamburger (mobile) */}
          <button
            className={styles.hamburger}
            onClick={() => setMenuOpen((prev) => !prev)}
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