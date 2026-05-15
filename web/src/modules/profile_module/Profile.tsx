import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { 
  Camera, Lock, CheckCircle, AlertTriangle, LogOut, 
  ExternalLink, Key, Shield, Home, User as UserIcon, Phone, Mail, Save
} from "lucide-react";
import styles from "./Profile.module.css";
import type { User } from "./profile.types";
import { profileApi } from "./profile.api";

// ── Custom SVGs for missing Lucide brand icons ──
const FacebookIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>;
const InstagramIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>;
const TwitterIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path></svg>;

function getInitials(name: string): string {
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

function getRoleMeta(role: string): { label: string; icon: React.ReactNode; className: string } {
  switch (role?.toUpperCase()) {
    case "OWNER":  return { label: "Property Owner", icon: <Key size={14} />, className: styles.heroRoleOwner };
    case "ADMIN":  return { label: "Administrator",  icon: <Shield size={14} />, className: styles.heroRoleAdmin };
    default:       return { label: "Tenant",         icon: <Home size={14} />, className: styles.heroRoleTenant };
  }
}

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { user } = useOutletContext<{ user: User }>();
  const [activeUser, setActiveUser] = useState<User>(user);

  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [facebookUrl, setFacebookUrl] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [twitterUrl, setTwitterUrl] = useState("");

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarMsg, setAvatarMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [showLogoutModal, setShowLogoutModal] = useState(false);

  useEffect(() => {
    if (activeUser) {
      setName(activeUser.name ?? "");
      setPhoneNumber(activeUser.phoneNumber ?? "");
      setFacebookUrl(activeUser.facebookUrl ?? "");
      setInstagramUrl(activeUser.instagramUrl ?? "");
      setTwitterUrl(activeUser.twitterUrl ?? "");
      setAvatarPreview(activeUser.avatarUrl ?? null);
    }
  }, [activeUser]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeUser) return;

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
      const data = await profileApi.updateAvatar(activeUser.id, file);

      if (!data.success) {
        setAvatarMsg({ type: "error", text: data?.error?.message ?? "Upload failed." });
        setAvatarPreview(activeUser.avatarUrl ?? null);
        return;
      }

      const updatedUser: User = { ...activeUser, avatarUrl: data.data.avatarUrl };
      setActiveUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser)); 
      setAvatarMsg({ type: "success", text: "Profile picture updated!" });
    } catch (err: any) {
      const backendMessage = err.response?.data?.error?.message;
      setAvatarMsg({ type: "error", text: backendMessage || "Upload failed. Please try again." });
      setAvatarPreview(activeUser.avatarUrl ?? null);
    } finally {
      setAvatarUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeUser) return;

    if (!name.trim()) {
      setSaveMsg({ type: "error", text: "Full name cannot be empty." });
      return;
    }

    setSaving(true);
    setSaveMsg(null);

    try {
      const data = await profileApi.updateProfile(activeUser.id, {
        name:         name.trim(),
        phoneNumber:  phoneNumber.trim() || null,
        avatarUrl:    null, 
        facebookUrl:  facebookUrl.trim() || null,
        instagramUrl: instagramUrl.trim() || null,
        twitterUrl:   twitterUrl.trim() || null,
      });

      if (!data.success) {
        setSaveMsg({ type: "error", text: data?.error?.message ?? "Save failed." });
        return;
      }

      const updatedUser: User = {
        ...activeUser,
        name:         name.trim(),
        phoneNumber:  phoneNumber.trim() || null,
        facebookUrl:  facebookUrl.trim() || null,
        instagramUrl: instagramUrl.trim() || null,
        twitterUrl:   twitterUrl.trim() || null,
      };

      setActiveUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));
      setSaveMsg({ type: "success", text: "Changes saved successfully." });
    } catch (err: any) {
      const backendMessage = err.response?.data?.error?.message;
      setSaveMsg({ type: "error", text: backendMessage || "Network error. Please try again." });
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

  if (!activeUser) return null;

  const roleMeta = getRoleMeta(activeUser.role);

  return (
    <div className={styles.page}>
      
      {showLogoutModal && (
        <div className={styles.modalOverlay} onClick={() => setShowLogoutModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalIconWrap}><LogOut size={28} /></div>
            <h3 className={styles.modalTitle}>Sign Out?</h3>
            <p className={styles.modalBody}>
              You'll be logged out of your account and returned to the login page.
            </p>
            <div className={styles.modalActions}>
              <button type="button" className={styles.modalCancelBtn} onClick={() => setShowLogoutModal(false)}>
                Cancel
              </button>
              <button type="button" className={styles.modalConfirmBtn} onClick={confirmLogout}>
                <LogOut size={16} /> Yes, Log Out
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
              <img src={avatarPreview} alt={activeUser.name} className={styles.heroAvatar} />
            ) : (
              <div className={styles.heroAvatarPlaceholder}>{getInitials(activeUser.name)}</div>
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
                <span className={styles.heroAvatarOverlayIcon}><Camera size={24} /></span>
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
            <h1 className={styles.heroName}>{activeUser.name}</h1>

            <div className={`${styles.heroRoleBadge} ${roleMeta.className}`}>
              {roleMeta.icon}
              {roleMeta.label}
            </div>

            <div className={styles.heroEmail}><Mail size={16} /> {activeUser.email}</div>

            {/* Social link pills */}
            {(activeUser.facebookUrl || activeUser.instagramUrl || activeUser.twitterUrl) && (
              <div className={styles.heroSocialRow}>
                {activeUser.facebookUrl && (
                  <a href={activeUser.facebookUrl} target="_blank" rel="noopener noreferrer" className={styles.heroSocialPill}>
                    <span className={styles.heroSocialBadge}><FacebookIcon /></span> Facebook
                  </a>
                )}
                {activeUser.instagramUrl && (
                  <a href={activeUser.instagramUrl} target="_blank" rel="noopener noreferrer" className={styles.heroSocialPill}>
                    <span className={styles.heroSocialBadge}><InstagramIcon /></span> Instagram
                  </a>
                )}
                {activeUser.twitterUrl && (
                  <a href={activeUser.twitterUrl} target="_blank" rel="noopener noreferrer" className={styles.heroSocialPill}>
                    <span className={styles.heroSocialBadge}><TwitterIcon /></span> Twitter
                  </a>
                )}
              </div>
            )}

            {avatarMsg && (
              <span className={`${styles.avatarMsg} ${avatarMsg.type === "success" ? styles.avatarMsgSuccess : styles.avatarMsgError}`}>
                {avatarMsg.type === "success" ? <CheckCircle size={16} /> : <AlertTriangle size={16} />} {avatarMsg.text}
              </span>
            )}
          </div>
        </div>
      </section>

      <main className={styles.main}>

        <div className={styles.lockedNotice}>
          <div className={styles.lockedNoticeIcon}><AlertTriangle size={20} /></div>
          <p className={styles.lockedNoticeText}>
            <strong>Email and Role cannot be changed</strong> — these were set during registration and are locked for security. To update them, please contact <a href="mailto:support@cebunest.com" className={styles.supportLink}>support@cebunest.com</a>. You can freely edit your <strong>full name</strong>, <strong>phone number</strong>, and <strong>social links</strong>.
          </p>
        </div>

        <form onSubmit={handleSave}>
          <div className={styles.infoCard}>

            <div className={styles.sectionTitle}>Account Information</div>

            <div className={styles.fieldsGrid}>
              <div className={styles.field}>
                <span className={`${styles.fieldLabel} ${styles.fieldLabelEditable}`}>
                  Full Name
                  <span className={`${styles.fieldBadge} ${styles.fieldBadgeEdit}`}>Editable</span>
                </span>
                <div className={styles.fieldInputWrap}>
                  <input
                    type="text"
                    className={styles.fieldInput}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your full name"
                    required
                  />
                  <div className={styles.fieldInputIcon}><UserIcon size={18} /></div>
                </div>
              </div>

              <div className={styles.field}>
                <span className={`${styles.fieldLabel} ${styles.fieldLabelEditable}`}>
                  Phone Number
                  <span className={`${styles.fieldBadge} ${styles.fieldBadgeEdit}`}>Editable</span>
                </span>
                <div className={styles.fieldInputWrap}>
                  <input
                    type="tel"
                    className={styles.fieldInput}
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+63 912 345 6789"
                  />
                  <div className={styles.fieldInputIcon}><Phone size={18} /></div>
                </div>
              </div>
            </div>

            <div className={styles.cardDivider} />
            <div className={styles.sectionTitle}>Social Links</div>

            <div className={styles.fieldsGrid}>
              <div className={styles.field}>
                <span className={`${styles.fieldLabel} ${styles.fieldLabelEditable}`}>
                  <span className={styles.socialIconBadge}><FacebookIcon /></span>
                  Facebook
                  <span className={`${styles.fieldBadge} ${styles.fieldBadgeEdit}`}>Editable</span>
                </span>
                <div className={styles.socialInputWrap}>
                  <div className={styles.fieldInputIcon}><FacebookIcon /></div>
                  <input
                    type="url"
                    className={`${styles.fieldInput} ${styles.socialInput}`}
                    value={facebookUrl}
                    onChange={(e) => setFacebookUrl(e.target.value)}
                    placeholder="https://facebook.com/yourprofile"
                  />
                  {facebookUrl && (
                    <a href={facebookUrl} target="_blank" rel="noopener noreferrer" className={styles.socialVisitBtn}>
                      <ExternalLink size={16} />
                    </a>
                  )}
                </div>
              </div>

              <div className={styles.field}>
                <span className={`${styles.fieldLabel} ${styles.fieldLabelEditable}`}>
                  <span className={styles.socialIconBadge}><InstagramIcon /></span>
                  Instagram
                  <span className={`${styles.fieldBadge} ${styles.fieldBadgeEdit}`}>Editable</span>
                </span>
                <div className={styles.socialInputWrap}>
                  <div className={styles.fieldInputIcon}><InstagramIcon /></div>
                  <input
                    type="url"
                    className={`${styles.fieldInput} ${styles.socialInput}`}
                    value={instagramUrl}
                    onChange={(e) => setInstagramUrl(e.target.value)}
                    placeholder="https://instagram.com/yourhandle"
                  />
                  {instagramUrl && (
                    <a href={instagramUrl} target="_blank" rel="noopener noreferrer" className={styles.socialVisitBtn}>
                       <ExternalLink size={16} />
                    </a>
                  )}
                </div>
              </div>

              <div className={styles.field}>
                <span className={`${styles.fieldLabel} ${styles.fieldLabelEditable}`}>
                  <span className={styles.socialIconBadge}><TwitterIcon /></span>
                  X / Twitter
                  <span className={`${styles.fieldBadge} ${styles.fieldBadgeEdit}`}>Editable</span>
                </span>
                <div className={styles.socialInputWrap}>
                  <div className={styles.fieldInputIcon}><TwitterIcon /></div>
                  <input
                    type="url"
                    className={`${styles.fieldInput} ${styles.socialInput}`}
                    value={twitterUrl}
                    onChange={(e) => setTwitterUrl(e.target.value)}
                    placeholder="https://x.com/yourhandle"
                  />
                  {twitterUrl && (
                    <a href={twitterUrl} target="_blank" rel="noopener noreferrer" className={styles.socialVisitBtn}>
                       <ExternalLink size={16} />
                    </a>
                  )}
                </div>
              </div>
            </div>

            <div className={styles.cardDivider} />
            <div className={styles.sectionTitle}>Locked Fields</div>

            <div className={styles.fieldsGrid}>
              <div className={styles.field}>
                <span className={styles.fieldLabel}>
                  Email Address
                  <span className={`${styles.fieldBadge} ${styles.fieldBadgeLocked}`}><Lock size={10} /> Locked</span>
                </span>
                <div className={styles.fieldValue}>
                  <div className={styles.fieldValueInner}>
                    <Mail size={16} className={styles.fieldLockIcon} /> {activeUser.email}
                  </div>
                  <Lock size={14} className={styles.fieldLockIcon} />
                </div>
              </div>

              <div className={styles.field}>
                <span className={styles.fieldLabel}>
                  Role
                  <span className={`${styles.fieldBadge} ${styles.fieldBadgeLocked}`}><Lock size={10} /> Locked</span>
                </span>
                <div className={styles.fieldValue}>
                  <div className={styles.fieldValueInner}>
                    {roleMeta.icon} {roleMeta.label}
                  </div>
                  <Lock size={14} className={styles.fieldLockIcon} />
                </div>
              </div>
            </div>

            <div className={styles.saveRow}>
              {saveMsg && (
                <span className={`${styles.saveMsg} ${saveMsg.type === "success" ? styles.saveMsgSuccess : styles.saveMsgError}`}>
                  {saveMsg.type === "success" ? <CheckCircle size={16} /> : <AlertTriangle size={16} />} {saveMsg.text}
                </span>
              )}
              <button type="submit" className={styles.saveBtn} disabled={saving}>
                {saving ? <><span className={styles.saveSpinner} /> Saving…</> : <><Save size={16} /> Save Changes</>}
              </button>
            </div>
          </div>
        </form>

        <div className={styles.logoutCard}>
          <div>
            <div className={styles.logoutTitle}><LogOut size={18} /> Sign Out</div>
            <div className={styles.logoutDesc}>
              Your session will be cleared and you'll be returned to the login page.
            </div>
          </div>
          <button type="button" className={styles.logoutBtn} onClick={() => setShowLogoutModal(true)}>
             <LogOut size={16} /> Logout
          </button>
        </div>

      </main>
    </div>
  );
};

export default Profile;