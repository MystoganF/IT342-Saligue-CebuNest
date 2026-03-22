import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/Navbar/Navbar";
import "./Profile.css";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8080";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  phoneNumber?: string;
  role: string;
  avatarUrl?: string;
}

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const storedUser = localStorage.getItem("user");
  const localUser: UserProfile = storedUser ? JSON.parse(storedUser) : null;

  const [profile, setProfile]             = useState<UserProfile>(localUser || { id: "", name: "", email: "", role: "" });
  const [name, setName]                   = useState(localUser?.name || "");
  const [phoneNumber, setPhoneNumber]     = useState(localUser?.phoneNumber || "");
  const [avatarUrl, setAvatarUrl]         = useState(localUser?.avatarUrl || "");
  const [avatarPreview, setAvatarPreview] = useState(localUser?.avatarUrl || "");

  const [uploading, setUploading]         = useState(false);
  const [saving, setSaving]               = useState(false);
  const [uploadError, setUploadError]     = useState<string | null>(null);
  const [saveMessage, setSaveMessage]     = useState<{ text: string; ok: boolean } | null>(null);
  const [dragOver, setDragOver]           = useState(false);

  const initials = profile.name
    ? profile.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  /* ── Upload avatar via Spring Boot → Supabase ── */
  const handleFileSelect = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setUploadError("Please select an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("Image must be under 5MB.");
      return;
    }

    // Instant local preview
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
        headers: { "Authorization": `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setUploadError(data?.error?.message || "Upload failed.");
        setAvatarPreview(avatarUrl);
        return;
      }

      const newUrl = data.data.avatarUrl;
      setAvatarUrl(newUrl);
      setAvatarPreview(newUrl);

      const updated = { ...profile, avatarUrl: newUrl };
      localStorage.setItem("user", JSON.stringify(updated));
      setProfile(updated);

    } catch {
      setUploadError("Upload failed. Please try again.");
      setAvatarPreview(avatarUrl);
    } finally {
      setUploading(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  };

  /* ── Save name + phone ── */
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveMessage(null);
    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch(`${API_BASE}/api/users/${profile.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ name, phoneNumber }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setSaveMessage({ text: data?.error?.message || "Failed to save changes.", ok: false });
        return;
      }

      const updated = { ...profile, name, phoneNumber };
      localStorage.setItem("user", JSON.stringify(updated));
      setProfile(updated);
      setSaveMessage({ text: "Profile updated successfully!", ok: true });

    } catch {
      setSaveMessage({ text: "Network error. Please try again.", ok: false });
    } finally {
      setSaving(false);
    }
  };

  const roleLabel = (role: string) => {
    switch (role?.toUpperCase()) {
      case "TENANT": return "🏡 Tenant";
      case "OWNER":  return "🔑 Property Owner";
      case "ADMIN":  return "⚙️ Administrator";
      default:       return role;
    }
  };

  return (
    <div className="pf-page">
      <Navbar />

      <main className="pf-main">

        {/* ── HERO ── */}
        <div className="pf-hero">
          <div className="pf-hero-deco pf-hero-deco--1" />
          <div className="pf-hero-deco pf-hero-deco--2" />
          <div className="pf-hero-inner">
            <button className="pf-back-btn" onClick={() => navigate(-1)}>← Back</button>
            <div className="pf-hero-eyebrow">
              <div className="pf-eyebrow-line" />
              <span className="pf-eyebrow-text">Account Settings</span>
            </div>
            <h1 className="pf-hero-heading">My Profile</h1>
          </div>
        </div>

        {/* ── CONTENT ── */}
        <div className="pf-content">

          {/* LEFT — Avatar + read-only snapshot */}
          <aside className="pf-avatar-card">
            <div className="pf-avatar-card-top">
              <div
                className={`pf-avatar-zone${dragOver ? " pf-avatar-zone--dragover" : ""}${uploading ? " pf-avatar-zone--uploading" : ""}`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => !uploading && fileInputRef.current?.click()}
              >
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar" className="pf-avatar-img" />
                ) : (
                  <div className="pf-avatar-placeholder">
                    <span className="pf-avatar-initials">{initials}</span>
                  </div>
                )}
                <div className="pf-avatar-overlay">
                  {uploading
                    ? <span className="pf-avatar-spinner" />
                    : (<><span className="pf-avatar-overlay-icon">📷</span><span className="pf-avatar-overlay-text">Change Photo</span></>)
                  }
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="pf-avatar-input"
                onChange={handleFileInputChange}
              />

              {uploadError && <p className="pf-upload-error">⚠ {uploadError}</p>}
              <p className="pf-avatar-hint">Click or drag & drop<br />JPG, PNG, WEBP · Max 5MB</p>
            </div>

            <div className="pf-avatar-card-divider" />

            {/* Read-only snapshot */}
            <div className="pf-avatar-card-info">
              <p className="pf-info-name">{profile.name}</p>

              <div className="pf-info-row">
                <span className="pf-info-icon">✉</span>
                <span className="pf-info-value">{profile.email}</span>
              </div>

              <div className="pf-info-row">
                <span className="pf-info-icon">🏷</span>
                <span className="pf-role-badge">{roleLabel(profile.role)}</span>
              </div>
            </div>

            <div className="pf-avatar-card-note">
              <span className="pf-note-icon">🔒</span>
              <span>Email and role cannot be changed after registration.</span>
            </div>
          </aside>

          {/* RIGHT — Form */}
          <section className="pf-form-card">
            <div className="pf-form-header">
              <div className="pf-form-eyebrow">
                <div className="pf-header-dot" />
                <span className="pf-header-eyebrow-text">Personal Information</span>
              </div>
              <h2 className="pf-form-heading">Edit Details</h2>
              <p className="pf-form-subheading">
                Update your name and contact number below.
              </p>
            </div>

            {/* Read-only display */}
            <div className="pf-readonly-group">
              <div className="pf-readonly-item">
                <span className="pf-readonly-label">Email Address</span>
                <div className="pf-readonly-value-wrap">
                  <span className="pf-readonly-icon">✉</span>
                  <span className="pf-readonly-value">{profile.email}</span>
                </div>
              </div>
              <div className="pf-readonly-item">
                <span className="pf-readonly-label">Role</span>
                <div className="pf-readonly-value-wrap">
                  <span className="pf-readonly-icon">🏷</span>
                  <span className="pf-readonly-value">{roleLabel(profile.role)}</span>
                </div>
              </div>
            </div>

            <div className="pf-section-divider">
              <span className="pf-section-divider-text">Editable fields</span>
            </div>

            <form className="pf-form" onSubmit={handleSave}>

              <div className="pf-field-group">
                <label className="pf-field-label" htmlFor="pf-name">Full Name</label>
                <div className="pf-field-wrap">
                  <span className="pf-field-icon">👤</span>
                  <input
                    className="pf-field-input"
                    id="pf-name"
                    type="text"
                    placeholder="Juan dela Cruz"
                    value={name}
                    onChange={(e) => { setName(e.target.value); setSaveMessage(null); }}
                    required
                  />
                </div>
              </div>

              <div className="pf-field-group">
                <label className="pf-field-label" htmlFor="pf-phone">Phone Number</label>
                <div className="pf-field-wrap">
                  <span className="pf-field-icon">📞</span>
                  <input
                    className="pf-field-input"
                    id="pf-phone"
                    type="tel"
                    placeholder="+63 912 345 6789"
                    value={phoneNumber}
                    onChange={(e) => { setPhoneNumber(e.target.value); setSaveMessage(null); }}
                  />
                </div>
              </div>

              <button
                className={`pf-save-btn${saving ? " pf-save-btn--loading" : ""}`}
                type="submit"
                disabled={saving || uploading}
              >
                {saving ? <span className="pf-btn-spinner" /> : "Save Changes"}
              </button>

              {saveMessage && (
                <div className={`pf-save-msg${saveMessage.ok ? " pf-save-msg--ok" : " pf-save-msg--err"}`}>
                  <span>{saveMessage.ok ? "✓" : "⚠"}</span>
                  {saveMessage.text}
                </div>
              )}
            </form>
          </section>

        </div>
      </main>
    </div>
  );
};

export default Profile;