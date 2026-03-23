import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/Navbar/Navbar";
import styles from "./Profile.module.css";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  phoneNumber?: string | null;
  avatarUrl?: string | null;
}


function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function getRoleMeta(role: string): { label: string; icon: string; className: string } {
  switch (role?.toUpperCase()) {
    case "OWNER":  return { label: "Property Owner", icon: "🔑", className: styles.heroRoleOwner };
    case "ADMIN":  return { label: "Administrator",  icon: "🛡️", className: styles.heroRoleAdmin };
    default:       return { label: "Tenant",         icon: "🏡", className: styles.heroRoleTenant };
  }
}

// ─── component ─────────────────────────────────────────────────────────────

const Profile: React.FC = () => {
  const navigate     = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auth / user
  const [user, setUser] = useState<User | null>(null);

  // Editable fields
  const [name, setName]               = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");

  // Avatar
  const [avatarPreview, setAvatarPreview]     = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarMsg, setAvatarMsg]             = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Save
  const [saving, setSaving]   = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Logout modal
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // ── Auth guard ─────────────────────────────────────────────────────────
  useEffect(() => {
    const stored = localStorage.getItem("user");
    const token  = localStorage.getItem("accessToken");
    if (!stored || !token) { navigate("/"); return; }
    try {
      const parsed: User = JSON.parse(stored);
      setUser(parsed);
      setName(parsed.name ?? "");
      setPhoneNumber(parsed.phoneNumber ?? "");
      setAvatarPreview(parsed.avatarUrl ?? null);
    } catch {
      navigate("/");
    }
  }, [navigate]);

  // ── Avatar upload ─────────────────────────────────────────────────────
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      setAvatarMsg({ type: "error", text: "Only image files are allowed." });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setAvatarMsg({ type: "error", text: "Image must be under 5MB." });
      return;
    }

    // Optimistic preview
    setAvatarPreview(URL.createObjectURL(file));
    setAvatarUploading(true);
    setAvatarMsg(null);

    try {
      const token    = localStorage.getItem("accessToken");
      const formData = new FormData();
      formData.append("file", file);

      const res  = await fetch(`${API_BASE}/api/users/${user.id}/avatar`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setAvatarMsg({ type: "error", text: data?.error?.message ?? "Upload failed." });
        setAvatarPreview(user.avatarUrl ?? null);
        return;
      }

      const updatedUser: User = { ...user, avatarUrl: data.data.avatarUrl };
      setUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));
      setAvatarMsg({ type: "success", text: "Profile picture updated!" });
    } catch {
      setAvatarMsg({ type: "error", text: "Upload failed. Please try again." });
      setAvatarPreview(user.avatarUrl ?? null);
    } finally {
      setAvatarUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // ── Save profile ──────────────────────────────────────────────────────
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!name.trim()) {
      setSaveMsg({ type: "error", text: "Full name cannot be empty." });
      return;
    }

    setSaving(true);
    setSaveMsg(null);

    try {
      const token = localStorage.getItem("accessToken");
      const res   = await fetch(`${API_BASE}/api/users/${user.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          name:        name.trim(),
          phoneNumber: phoneNumber.trim() || null,
          avatarUrl:   null,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setSaveMsg({ type: "error", text: data?.error?.message ?? "Save failed." });
        return;
      }

      const updatedUser: User = {
        ...user,
        name:        name.trim(),
        phoneNumber: phoneNumber.trim() || null,
      };
      setUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));
      setSaveMsg({ type: "success", text: "Changes saved successfully." });
    } catch {
      setSaveMsg({ type: "error", text: "Network error. Please try again." });
    } finally {
      setSaving(false);
    }
  };

  const confirmLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    navigate("/");
  };

  // ── Render ─────────────────────────────────────────────────────────────
  if (!user) return null;

  const roleMeta = getRoleMeta(user.role);

  return (
    <div className={styles.page}>
      <Navbar user={user} />

      {/* ── Logout Confirmation Modal ── */}
      {showLogoutModal && (
        <div
          className={styles.modalOverlay}
          onClick={() => setShowLogoutModal(false)}
        >
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalIcon}>🚪</div>
            <h3 className={styles.modalTitle}>Sign Out?</h3>
            <p className={styles.modalBody}>
              You'll be logged out of your account and returned to the login page.
            </p>
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.modalCancelBtn}
                onClick={() => setShowLogoutModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.modalConfirmBtn}
                onClick={confirmLogout}
              >
                Yes, Log Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Hero Banner ── */}
      <section className={styles.hero}>
        <div className={`${styles.heroDeco} ${styles.heroDeco1}`} />
        <div className={`${styles.heroDeco} ${styles.heroDeco2}`} />
        <div className={styles.heroAccent} />

        <div className={styles.heroInner}>

          {/* Avatar */}
          <div className={styles.heroAvatarWrap}>
            {avatarPreview ? (
              <img src={avatarPreview} alt={user.name} className={styles.heroAvatar} />
            ) : (
              <div className={styles.heroAvatarPlaceholder}>{getInitials(user.name)}</div>
            )}

            {avatarUploading ? (
              <div className={styles.heroAvatarUploading}>
                <span className={styles.avatarSpinner} />
              </div>
            ) : (
              <button
                type="button"
                className={styles.heroAvatarOverlay}
                onClick={() => fileInputRef.current?.click()}
                aria-label="Change profile picture"
              >
                <span className={styles.heroAvatarOverlayIcon}>📷</span>
                <span className={styles.heroAvatarOverlayText}>Change</span>
              </button>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className={styles.avatarInput}
              onChange={handleAvatarChange}
            />
          </div>

          {/* Name, role, email */}
          <div className={styles.heroText}>
            <h1 className={styles.heroName}>{user.name}</h1>

            <div className={`${styles.heroRoleBadge} ${roleMeta.className}`}>
              <span className={styles.heroRoleIcon}>{roleMeta.icon}</span>
              {roleMeta.label}
            </div>

            <div className={styles.heroEmail}>{user.email}</div>

            {avatarMsg && (
              <span className={`${styles.avatarMsg} ${
                avatarMsg.type === "success" ? styles.avatarMsgSuccess : styles.avatarMsgError
              }`}>
                {avatarMsg.type === "success" ? "✓" : "⚠"} {avatarMsg.text}
              </span>
            )}
          </div>
        </div>
      </section>

      {/* ── Main Content ── */}
      <main className={styles.main}>

        {/* Locked fields notice */}
        <div className={styles.lockedNotice}>
          <span className={styles.lockedNoticeIcon}>🔒</span>
          <p className={styles.lockedNoticeText}>
            <strong>Email and Role cannot be changed</strong> — these were set during
            registration and are locked for security. To update them, please contact support.
            You can freely edit your <strong>full name</strong> and <strong>phone number</strong>.
          </p>
        </div>

        {/* ── Info Card ── */}
        <form onSubmit={handleSave}>
          <div className={styles.infoCard}>
            <div className={styles.sectionTitle}>Account Information</div>

            <div className={styles.fieldsGrid}>

              {/* Full Name — editable */}
              <div className={styles.field}>
                <span className={`${styles.fieldLabel} ${styles.fieldLabelEditable}`}>
                  Full Name
                  <span className={`${styles.fieldBadge} ${styles.fieldBadgeEdit}`}>Editable</span>
                </span>
                <input
                  type="text"
                  className={styles.fieldInput}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                  required
                />
              </div>

              {/* Phone — editable */}
              <div className={styles.field}>
                <span className={`${styles.fieldLabel} ${styles.fieldLabelEditable}`}>
                  Phone Number
                  <span className={`${styles.fieldBadge} ${styles.fieldBadgeEdit}`}>Editable</span>
                </span>
                <input
                  type="tel"
                  className={styles.fieldInput}
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+63 912 345 6789"
                />
              </div>

            </div>

            <div className={styles.cardDivider} />
            <div className={styles.sectionTitle}>Locked Fields</div>

            <div className={styles.fieldsGrid}>

              {/* Email — locked */}
              <div className={styles.field}>
                <span className={styles.fieldLabel}>
                  Email Address
                  <span className={`${styles.fieldBadge} ${styles.fieldBadgeLocked}`}>
                    🔒 Locked
                  </span>
                </span>
                <div className={styles.fieldValue}>
                  {user.email}
                  <span className={styles.fieldLockIcon}>🔒</span>
                </div>
              </div>

              {/* Role — locked */}
              <div className={styles.field}>
                <span className={styles.fieldLabel}>
                  Role
                  <span className={`${styles.fieldBadge} ${styles.fieldBadgeLocked}`}>
                    🔒 Locked
                  </span>
                </span>
                <div className={styles.fieldValue}>
                  {roleMeta.icon} {roleMeta.label}
                  <span className={styles.fieldLockIcon}>🔒</span>
                </div>
              </div>

            </div>

            {/* Save row */}
            <div className={styles.saveRow}>
              {saveMsg && (
                <span className={`${styles.saveMsg} ${
                  saveMsg.type === "success" ? styles.saveMsgSuccess : styles.saveMsgError
                }`}>
                  {saveMsg.type === "success" ? "✓" : "⚠"} {saveMsg.text}
                </span>
              )}
              <button type="submit" className={styles.saveBtn} disabled={saving}>
                {saving
                  ? <><span className={styles.saveSpinner} /> Saving…</>
                  : "Save Changes"}
              </button>
            </div>
          </div>
        </form>

        {/* ── Logout Card ── */}
        <div className={styles.logoutCard}>
          <div>
            <div className={styles.logoutTitle}>Sign Out</div>
            <div className={styles.logoutDesc}>
              Your session will be cleared and you'll be returned to the login page.
            </div>
          </div>
          <button type="button" className={styles.logoutBtn} onClick={() => setShowLogoutModal(true)}>
            🚪 Logout
          </button>
        </div>

      </main>
    </div>
  );
};

export default Profile;