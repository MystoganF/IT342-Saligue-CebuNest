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
  facebookUrl?: string | null;
  instagramUrl?: string | null;
  twitterUrl?: string | null;
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

const Profile: React.FC = () => {
  const navigate     = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [user, setUser] = useState<User | null>(null);

  const [name, setName]               = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [facebookUrl, setFacebookUrl] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [twitterUrl, setTwitterUrl]   = useState("");

  const [avatarPreview, setAvatarPreview]     = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarMsg, setAvatarMsg]             = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [saving, setSaving]   = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [showLogoutModal, setShowLogoutModal] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    const token  = localStorage.getItem("accessToken");
    if (!stored || !token) { navigate("/"); return; }
    try {
      const parsed: User = JSON.parse(stored);
      setUser(parsed);
      setName(parsed.name ?? "");
      setPhoneNumber(parsed.phoneNumber ?? "");
      setFacebookUrl(parsed.facebookUrl ?? "");
      setInstagramUrl(parsed.instagramUrl ?? "");
      setTwitterUrl(parsed.twitterUrl ?? "");
      setAvatarPreview(parsed.avatarUrl ?? null);
    } catch {
      navigate("/");
    }
  }, [navigate]);

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
          name:         name.trim(),
          phoneNumber:  phoneNumber.trim() || null,
          avatarUrl:    null,
          facebookUrl:  facebookUrl.trim() || null,
          instagramUrl: instagramUrl.trim() || null,
          twitterUrl:   twitterUrl.trim() || null,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setSaveMsg({ type: "error", text: data?.error?.message ?? "Save failed." });
        return;
      }

      const updatedUser: User = {
        ...user,
        name:         name.trim(),
        phoneNumber:  phoneNumber.trim() || null,
        facebookUrl:  facebookUrl.trim() || null,
        instagramUrl: instagramUrl.trim() || null,
        twitterUrl:   twitterUrl.trim() || null,
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

  if (!user) return null;

  const roleMeta = getRoleMeta(user.role);

  return (
    <div className={styles.page}>
      <Navbar user={user} />

      {showLogoutModal && (
        <div className={styles.modalOverlay} onClick={() => setShowLogoutModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalIcon}>🚪</div>
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

      <section className={styles.hero}>
        <div className={`${styles.heroDeco} ${styles.heroDeco1}`} />
        <div className={`${styles.heroDeco} ${styles.heroDeco2}`} />
        <div className={styles.heroAccent} />

        <div className={styles.heroInner}>
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

          <div className={styles.heroText}>
            <h1 className={styles.heroName}>{user.name}</h1>

            <div className={`${styles.heroRoleBadge} ${roleMeta.className}`}>
              <span className={styles.heroRoleIcon}>{roleMeta.icon}</span>
              {roleMeta.label}
            </div>

            <div className={styles.heroEmail}>{user.email}</div>

            {/* Social link pills shown in hero if set */}
            {(user.facebookUrl || user.instagramUrl || user.twitterUrl) && (
              <div className={styles.heroSocialRow}>
                {user.facebookUrl && (
                  <a href={user.facebookUrl} target="_blank" rel="noopener noreferrer" className={styles.heroSocialPill}>
                    <span className={styles.heroSocialBadge}>f</span> Facebook
                  </a>
                )}
                {user.instagramUrl && (
                  <a href={user.instagramUrl} target="_blank" rel="noopener noreferrer" className={styles.heroSocialPill}>
                    <span className={styles.heroSocialBadge}>in</span> Instagram
                  </a>
                )}
                {user.twitterUrl && (
                  <a href={user.twitterUrl} target="_blank" rel="noopener noreferrer" className={styles.heroSocialPill}>
                    <span className={styles.heroSocialBadge}>𝕏</span> Twitter
                  </a>
                )}
              </div>
            )}

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

      <main className={styles.main}>

        <div className={styles.lockedNotice}>
          <span className={styles.lockedNoticeIcon}>🔒</span>
          <p className={styles.lockedNoticeText}>
            <strong>Email and Role cannot be changed</strong> — these were set during
            registration and are locked for security. To update them, please contact support.
            You can freely edit your <strong>full name</strong>, <strong>phone number</strong>,
            and <strong>social links</strong>.
          </p>
        </div>

        <form onSubmit={handleSave}>
          <div className={styles.infoCard}>

            {/* ── Editable Fields ── */}
            <div className={styles.sectionTitle}>Account Information</div>

            <div className={styles.fieldsGrid}>
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

            {/* ── Social Links ── */}
            <div className={styles.cardDivider} />
            <div className={styles.sectionTitle}>Social Links</div>

            <div className={styles.fieldsGrid}>
              <div className={styles.field}>
                <span className={`${styles.fieldLabel} ${styles.fieldLabelEditable}`}>
                  <span className={styles.socialIconBadge}>f</span>
                  Facebook
                  <span className={`${styles.fieldBadge} ${styles.fieldBadgeEdit}`}>Editable</span>
                </span>
                <div className={styles.socialInputWrap}>
                  <input
                    type="url"
                    className={`${styles.fieldInput} ${styles.socialInput}`}
                    value={facebookUrl}
                    onChange={(e) => setFacebookUrl(e.target.value)}
                    placeholder="https://facebook.com/yourprofile"
                  />
                  {facebookUrl && (
                    <a href={facebookUrl} target="_blank" rel="noopener noreferrer" className={styles.socialVisitBtn}>
                      ↗
                    </a>
                  )}
                </div>
              </div>

              <div className={styles.field}>
                <span className={`${styles.fieldLabel} ${styles.fieldLabelEditable}`}>
                  <span className={styles.socialIconBadge}>in</span>
                  Instagram
                  <span className={`${styles.fieldBadge} ${styles.fieldBadgeEdit}`}>Editable</span>
                </span>
                <div className={styles.socialInputWrap}>
                  <input
                    type="url"
                    className={`${styles.fieldInput} ${styles.socialInput}`}
                    value={instagramUrl}
                    onChange={(e) => setInstagramUrl(e.target.value)}
                    placeholder="https://instagram.com/yourhandle"
                  />
                  {instagramUrl && (
                    <a href={instagramUrl} target="_blank" rel="noopener noreferrer" className={styles.socialVisitBtn}>
                      ↗
                    </a>
                  )}
                </div>
              </div>

              <div className={styles.field}>
                <span className={`${styles.fieldLabel} ${styles.fieldLabelEditable}`}>
                  <span className={styles.socialIconBadge}>𝕏</span>
                  X / Twitter
                  <span className={`${styles.fieldBadge} ${styles.fieldBadgeEdit}`}>Editable</span>
                </span>
                <div className={styles.socialInputWrap}>
                  <input
                    type="url"
                    className={`${styles.fieldInput} ${styles.socialInput}`}
                    value={twitterUrl}
                    onChange={(e) => setTwitterUrl(e.target.value)}
                    placeholder="https://x.com/yourhandle"
                  />
                  {twitterUrl && (
                    <a href={twitterUrl} target="_blank" rel="noopener noreferrer" className={styles.socialVisitBtn}>
                      ↗
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* ── Locked Fields ── */}
            <div className={styles.cardDivider} />
            <div className={styles.sectionTitle}>Locked Fields</div>

            <div className={styles.fieldsGrid}>
              <div className={styles.field}>
                <span className={styles.fieldLabel}>
                  Email Address
                  <span className={`${styles.fieldBadge} ${styles.fieldBadgeLocked}`}>🔒 Locked</span>
                </span>
                <div className={styles.fieldValue}>
                  {user.email}
                  <span className={styles.fieldLockIcon}>🔒</span>
                </div>
              </div>

              <div className={styles.field}>
                <span className={styles.fieldLabel}>
                  Role
                  <span className={`${styles.fieldBadge} ${styles.fieldBadgeLocked}`}>🔒 Locked</span>
                </span>
                <div className={styles.fieldValue}>
                  {roleMeta.icon} {roleMeta.label}
                  <span className={styles.fieldLockIcon}>🔒</span>
                </div>
              </div>
            </div>

            {/* ── Save Row ── */}
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