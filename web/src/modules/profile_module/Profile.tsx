import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./Profile.module.css";
import Navbar from "../../components/Navbar/Navbar";

/* ─────────────────────────────────────────
   Types
───────────────────────────────────────── */
interface UserProfile {
  id: number;
  name: string;
  email: string;
  phoneNumber?: string;
  role: string;
  avatarUrl?: string;
}

/* ─────────────────────────────────────────
   Constants
───────────────────────────────────────── */
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8080";

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

/* ─────────────────────────────────────────
   Helper: read + parse user from storage
───────────────────────────────────────── */
function getStoredUser(): UserProfile | null {
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
   Helper: human-readable role label
───────────────────────────────────────── */
function getRoleLabel(role: string): string {
  switch (role?.toUpperCase()) {
    case "TENANT": return "🏡 Tenant";
    case "OWNER":  return "🔑 Property Owner";
    case "ADMIN":  return "⚙️ Administrator";
    default:       return role;
  }
}

/* ─────────────────────────────────────────
   Helper: persist user + notify other tabs
───────────────────────────────────────── */
function syncLocalStorage(user: UserProfile): void {
  localStorage.setItem("user", JSON.stringify(user));
  window.dispatchEvent(new Event("storage"));
}

/* ─────────────────────────────────────────
   Sub-component: Avatar upload zone
───────────────────────────────────────── */
interface AvatarZoneProps {
  avatarPreview: string;
  initials: string;
  uploading: boolean;
  uploadError: string | null;
  onFileSelect: (file: File) => void;
}

function AvatarZone({
  avatarPreview,
  initials,
  uploading,
  uploadError,
  onFileSelect,
}: AvatarZoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onFileSelect(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFileSelect(file);
    e.target.value = ""; // allow re-selecting the same file
  };

  const zoneClass = [
    styles.avatarZone,
    dragOver   ? styles.avatarZoneDragover   : "",
    uploading  ? styles.avatarZoneUploading  : "",
  ].filter(Boolean).join(" ");

  return (
    <>
      <div
        className={zoneClass}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
      >
        {/* Photo or initials fallback */}
        {avatarPreview ? (
          <img src={avatarPreview} alt="Avatar" className={styles.avatarImg} />
        ) : (
          <div className={styles.avatarPlaceholder}>
            <span className={styles.avatarInitials}>{initials}</span>
          </div>
        )}

        {/* Hover / upload overlay */}
        <div className={styles.avatarOverlay}>
          {uploading ? (
            <span className={styles.avatarSpinner} />
          ) : (
            <>
              <span className={styles.avatarOverlayIcon}>📷</span>
              <span className={styles.avatarOverlayText}>Change Photo</span>
            </>
          )}
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className={styles.avatarInput}
        onChange={handleFileInputChange}
      />

      {uploadError && <p className={styles.uploadError}>⚠ {uploadError}</p>}
      <p className={styles.avatarHint}>
        Click or drag & drop<br />JPG, PNG, WEBP · Max {MAX_FILE_SIZE_MB}MB
      </p>
    </>
  );
}

/* ─────────────────────────────────────────
   Sub-component: Read-only info sidebar
───────────────────────────────────────── */
interface AvatarCardProps {
  profile: UserProfile;
  avatarPreview: string;
  uploading: boolean;
  uploadError: string | null;
  onFileSelect: (file: File) => void;
}

function AvatarCard({
  profile,
  avatarPreview,
  uploading,
  uploadError,
  onFileSelect,
}: AvatarCardProps) {
  const initials = profile.name ? getInitials(profile.name) : "?";

  return (
    <aside className={styles.avatarCard}>
      <div className={styles.avatarCardTop}>
        <AvatarZone
          avatarPreview={avatarPreview}
          initials={initials}
          uploading={uploading}
          uploadError={uploadError}
          onFileSelect={onFileSelect}
        />
      </div>

      <div className={styles.avatarCardDivider} />

      {/* Name, email, role snapshot */}
      <div className={styles.avatarCardInfo}>
        <p className={styles.infoName}>{profile.name}</p>
        <div className={styles.infoRow}>
          <span className={styles.infoIcon}>✉</span>
          <span className={styles.infoValue}>{profile.email}</span>
        </div>
        <div className={styles.infoRow}>
          <span className={styles.infoIcon}>🏷</span>
          <span className={styles.roleBadge}>{getRoleLabel(profile.role)}</span>
        </div>
      </div>

      <div className={styles.avatarCardNote}>
        <span className={styles.noteIcon}>🔒</span>
        <span>Email and role cannot be changed after registration.</span>
      </div>
    </aside>
  );
}

/* ─────────────────────────────────────────
   Sub-component: Edit form (name + phone)
───────────────────────────────────────── */
interface EditFormProps {
  profile: UserProfile;
  onSave: (updated: UserProfile) => void;
}

function EditForm({ profile, onSave }: EditFormProps) {
  const [name,        setName]        = useState(profile.name        || "");
  const [phoneNumber, setPhoneNumber] = useState(profile.phoneNumber || "");
  const [saving,      setSaving]      = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ text: string; ok: boolean } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveMessage(null);
    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch(`${API_BASE}/api/users/${profile.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, phoneNumber }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setSaveMessage({ text: data?.error?.message || "Failed to save changes.", ok: false });
        return;
      }

      const updated = { ...profile, name, phoneNumber };
      onSave(updated);
      setSaveMessage({ text: "Profile updated successfully!", ok: true });
    } catch {
      setSaveMessage({ text: "Network error. Please try again.", ok: false });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className={styles.formCard}>
      {/* Card header */}
      <div className={styles.formHeader}>
        <div className={styles.formEyebrow}>
          <div className={styles.headerDot} />
          <span className={styles.headerEyebrowText}>Personal Information</span>
        </div>
        <h2 className={styles.formHeading}>Edit Details</h2>
        <p className={styles.formSubheading}>
          Update your name and contact number below.
        </p>
      </div>

      {/* Read-only fields */}
      <div className={styles.readonlyGroup}>
        <div className={styles.readonlyItem}>
          <span className={styles.readonlyLabel}>Email Address</span>
          <div className={styles.readonlyValueWrap}>
            <span className={styles.readonlyIcon}>✉</span>
            <span className={styles.readonlyValue}>{profile.email}</span>
          </div>
        </div>
        <div className={styles.readonlyItem}>
          <span className={styles.readonlyLabel}>Role</span>
          <div className={styles.readonlyValueWrap}>
            <span className={styles.readonlyIcon}>🏷</span>
            <span className={styles.readonlyValue}>{getRoleLabel(profile.role)}</span>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className={styles.sectionDivider}>
        <span className={styles.sectionDividerText}>Editable fields</span>
      </div>

      {/* Editable fields */}
      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel} htmlFor="pf-name">Full Name</label>
          <div className={styles.fieldWrap}>
            <span className={styles.fieldIcon}>👤</span>
            <input
              id="pf-name"
              className={styles.fieldInput}
              type="text"
              placeholder="Juan dela Cruz"
              value={name}
              onChange={(e) => { setName(e.target.value); setSaveMessage(null); }}
              required
            />
          </div>
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel} htmlFor="pf-phone">Phone Number</label>
          <div className={styles.fieldWrap}>
            <span className={styles.fieldIcon}>📞</span>
            <input
              id="pf-phone"
              className={styles.fieldInput}
              type="tel"
              placeholder="+63 912 345 6789"
              value={phoneNumber}
              onChange={(e) => { setPhoneNumber(e.target.value); setSaveMessage(null); }}
            />
          </div>
        </div>

        <button
          className={`${styles.saveBtn}${saving ? ` ${styles.saveBtnLoading}` : ""}`}
          type="submit"
          disabled={saving}
        >
          {saving ? <span className={styles.btnSpinner} /> : "Save Changes"}
        </button>

        {saveMessage && (
          <div className={`${styles.saveMsg} ${saveMessage.ok ? styles.saveMsgOk : styles.saveMsgErr}`}>
            <span>{saveMessage.ok ? "✓" : "⚠"}</span>
            {saveMessage.text}
          </div>
        )}
      </form>
    </section>
  );
}

/* ─────────────────────────────────────────
   Main Profile page component
───────────────────────────────────────── */
const Profile: React.FC = () => {
  const navigate = useNavigate();

  const [profile, setProfile] = useState<UserProfile>(
    getStoredUser() || { id: 0, name: "", email: "", role: "" }
  );

  const [avatarPreview,  setAvatarPreview]  = useState(profile.avatarUrl || "");
  const [savedAvatarUrl, setSavedAvatarUrl] = useState(profile.avatarUrl || "");
  const [uploading,      setUploading]      = useState(false);
  const [uploadError,    setUploadError]    = useState<string | null>(null);

  /* Upload avatar to backend → Supabase */
  const handleFileSelect = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setUploadError("Please select an image file.");
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setUploadError(`Image must be under ${MAX_FILE_SIZE_MB}MB.`);
      return;
    }

    // Show local blob preview immediately while the upload is in progress
    const reader = new FileReader();
    reader.onload = (e) => setAvatarPreview(e.target?.result as string);
    reader.readAsDataURL(file);

    setUploadError(null);
    setUploading(true);
    try {
      const token = localStorage.getItem("accessToken");
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`${API_BASE}/api/users/${profile.id}/avatar`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setUploadError(data?.error?.message || "Upload failed.");
        setAvatarPreview(savedAvatarUrl); // revert on failure
        return;
      }

      const newUrl: string = data.data.avatarUrl;
      setAvatarPreview(newUrl);
      setSavedAvatarUrl(newUrl);

      const updated = { ...profile, avatarUrl: newUrl };
      setProfile(updated);
      syncLocalStorage(updated);
    } catch {
      setUploadError("Upload failed. Please try again.");
      setAvatarPreview(savedAvatarUrl);
    } finally {
      setUploading(false);
    }
  };

  /* Called by EditForm after a successful save */
  const handleProfileSave = (updated: UserProfile) => {
    setProfile(updated);
    syncLocalStorage(updated);
  };

  return (
    <div className={styles.page}>
      <Navbar />

      <main>
        {/* Hero banner */}
        <div className={styles.hero}>
          <div className={styles.heroDeco1} />
          <div className={styles.heroDeco2} />
          <div className={styles.heroInner}>
            <button className={styles.backBtn} onClick={() => navigate(-1)}>
              ← Back
            </button>
            <div className={styles.heroEyebrow}>
              <div className={styles.eyebrowLine} />
              <span className={styles.eyebrowText}>Account Settings</span>
            </div>
            <h1 className={styles.heroHeading}>My Profile</h1>
          </div>
        </div>

        {/* Two-column content */}
        <div className={styles.content}>
          <AvatarCard
            profile={profile}
            avatarPreview={avatarPreview}
            uploading={uploading}
            uploadError={uploadError}
            onFileSelect={handleFileSelect}
          />
          <EditForm
            profile={profile}
            onSave={handleProfileSave}
          />
        </div>
      </main>
    </div>
  );
};

export default Profile;