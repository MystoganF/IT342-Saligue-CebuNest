import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AdminSidebar from "../../../components/AdminSidebar/AdminSidebar";
import styles from "./admin_edit_property.module.css";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

interface ImageEntry { id: number; imageUrl: string; }
interface PropertyType { id: number; name: string; }
interface MapCoords { lat: number; lon: number; }

interface PropertyForm {
  title: string;
  description: string;
  price: string;
  location: string;
  typeId: string;
  beds: string;
  baths: string;
  sqm: string;
  status: string;
}

const AdminPropertyEdit: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [admin, setAdmin] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [form, setForm] = useState<PropertyForm>({
    title: "", description: "", price: "", location: "",
    typeId: "", beds: "", baths: "", sqm: "", status: "",
  });

  const [propertyTypes, setPropertyTypes] = useState<PropertyType[]>([]);
  const [ownerName, setOwnerName] = useState("");
  const [existingImages, setExistingImages] = useState<ImageEntry[]>([]);
  const [removedImageIds, setRemovedImageIds] = useState<number[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [newPreviews, setNewPreviews] = useState<string[]>([]);
  const [mapCoords, setMapCoords] = useState<MapCoords | null>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);

  // Auth Guard
  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored) { navigate("/"); return; }
    const parsed = JSON.parse(stored);
    if (parsed.role?.toUpperCase() !== "ADMIN") { navigate("/admin/dashboard"); return; }
    setAdmin(parsed);
  }, [navigate]);

  // Fetch Metadata
  useEffect(() => {
    fetch(`${API_BASE}/api/properties/types`)
      .then(r => r.json())
      .then(d => { if (d.success) setPropertyTypes(d.data.types || []); });
  }, []);

  const geocode = async (query: string) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`);
      const data = await res.json();
      if (data.length) setMapCoords({ lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) });
    } catch (e) { console.error("Geocoding failed", e); }
  };

  const fetchProperty = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch(`${API_BASE}/api/admin/properties/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const result = await res.json();

      if (result.success) {
        const p = result.data.property;
        setForm({
          title: p.title || "",
          description: p.description || "",
          price: String(p.price || ""),
          location: p.location || "",
          typeId: String(p.typeId || ""),
          beds: String(p.beds || ""),
          baths: String(p.baths || ""),
          sqm: String(p.sqm || ""),
          status: p.status || "AVAILABLE",
        });
        setExistingImages(p.images || []);
        setOwnerName(p.ownerName || "Unknown Owner");
        if (p.location) geocode(p.location);
      } else {
        setFetchError(result.error?.message || "Failed to fetch property.");
      }
    } catch {
      setFetchError("Connection to server failed.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { if (admin) fetchProperty(); }, [admin, fetchProperty]);

  const handleInputChange = (key: keyof PropertyForm, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
    if (key === 'location' && value.length > 5) geocode(value);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setNewFiles(prev => [...prev, ...files]);
    setNewPreviews(prev => [...prev, ...files.map(f => URL.createObjectURL(f))]);
  };

  const removeExisting = (imgId: number) => {
    setExistingImages(prev => prev.filter(img => img.id !== imgId));
    setRemovedImageIds(prev => [...prev, imgId]);
  };

  const removeNew = (index: number) => {
    const updatedFiles = newFiles.filter((_, i) => i !== index);
    setNewFiles(updatedFiles);
    setNewPreviews(updatedFiles.map(f => URL.createObjectURL(f)));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveStatus(null);

    try {
      const token = localStorage.getItem("accessToken");

      // 1. Update text data
      const updateRes = await fetch(`${API_BASE}/api/admin/properties/${id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ...form,
          price: parseFloat(form.price),
          typeId: parseInt(form.typeId),
          beds: parseInt(form.beds) || 0,
          baths: parseInt(form.baths) || 0,
          sqm: parseInt(form.sqm) || 0,
          removedImageIds: removedImageIds.length ? removedImageIds : null
        })
      });

      if (!updateRes.ok) throw new Error("Failed to update property details");

      // 2. Upload new images if any
      if (newFiles.length > 0) {
        const formData = new FormData();
        newFiles.forEach(file => formData.append("files", file));
        await fetch(`${API_BASE}/api/properties/${id}/images`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData
        });
      }

      setSaveStatus({ type: 'success', msg: "Property updated successfully!" });
      setTimeout(() => navigate("/admin/properties"), 1500);
    } catch (err: any) {
      setSaveStatus({ type: 'error', msg: err.message || "An error occurred" });
    } finally {
      setSaving(false);
    }
  };

  if (!admin) return null;

  const mapSrc = mapCoords
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${mapCoords.lon - 0.005},${mapCoords.lat - 0.005},${mapCoords.lon + 0.005},${mapCoords.lat + 0.005}&layer=mapnik&marker=${mapCoords.lat},${mapCoords.lon}`
    : null;

  return (
    <div className={styles.page}>
      <AdminSidebar user={admin} />

      {/* ── Lightbox ── */}
      {lightboxSrc && (
        <div className={styles.lightboxOverlay} onClick={() => setLightboxSrc(null)}>
          <button className={styles.lightboxClose} type="button">✕</button>
          <img src={lightboxSrc} className={styles.lightboxImg} alt="Enlarged"
            onClick={e => e.stopPropagation()} />
        </div>
      )}

      {/* ── Main content (offset for sidebar) ── */}
      <div className={styles.content}>

        {/* ── Page Header ── */}
        <div className={styles.pageBar}>
          <div className={styles.pageBarDeco} />
          <div className={styles.pageBarAccent} />
          <div className={styles.pageBarInner}>
            <button className={styles.backBtn} type="button" onClick={() => navigate(-1)}>
              ← Back to List
            </button>
            <h1 className={styles.pageBarTitle}>Edit Property Listing</h1>
            <p className={styles.pageBarSub}>ID: #{id} • Owner: {ownerName}</p>
          </div>
        </div>

        {/* ── Form ── */}
        <form onSubmit={handleSave}>
          <main className={styles.main}>

            {loading ? (
              <div className={styles.card} style={{ textAlign: "center", padding: "60px" }}>
                <div className={styles.submitSpinner}
                  style={{ borderColor: "#1f5d71", borderTopColor: "transparent", margin: "0 auto 20px" }} />
                <p style={{ color: "#6e7071" }}>Fetching property details…</p>
              </div>
            ) : fetchError ? (
              <div className={styles.card} style={{ color: "#c0392b", textAlign: "center" }}>
                {fetchError}
              </div>
            ) : (
              <>
                {/* ── Basic Details ── */}
                <section className={styles.card}>
                  <div className={styles.cardTitle}>Basic Details</div>
                  <div className={styles.fieldsGrid}>
                    <div className={`${styles.field} ${styles.fieldFull}`}>
                      <label className={styles.fieldLabel}>Listing Title</label>
                      <input
                        className={styles.fieldInput}
                        value={form.title}
                        onChange={e => handleInputChange('title', e.target.value)}
                        placeholder="e.g. Cozy Studio near IT Park"
                        required
                      />
                    </div>
                    <div className={`${styles.field} ${styles.fieldFull}`}>
                      <label className={styles.fieldLabel}>Description</label>
                      <textarea
                        className={styles.fieldTextarea}
                        value={form.description}
                        onChange={e => handleInputChange('description', e.target.value)}
                        rows={4}
                        placeholder="Describe the property…"
                      />
                    </div>
                    <div className={styles.field}>
                      <label className={styles.fieldLabel}>Price (₱ / month)</label>
                      <input
                        className={styles.fieldInput}
                        type="number"
                        value={form.price}
                        onChange={e => handleInputChange('price', e.target.value)}
                        placeholder="e.g. 6500"
                        required
                      />
                    </div>
                    <div className={styles.field}>
                      <label className={styles.fieldLabel}>Property Type</label>
                      <select
                        className={styles.fieldSelect}
                        value={form.typeId}
                        onChange={e => handleInputChange('typeId', e.target.value)}
                        required
                      >
                        <option value="">Select type</option>
                        {propertyTypes.map(t => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className={styles.field}>
                      <label className={styles.fieldLabel}>Bedrooms</label>
                      <input
                        className={styles.fieldInput}
                        type="number"
                        value={form.beds}
                        onChange={e => handleInputChange('beds', e.target.value)}
                        placeholder="e.g. 1"
                        min={0}
                      />
                    </div>
                    <div className={styles.field}>
                      <label className={styles.fieldLabel}>Bathrooms</label>
                      <input
                        className={styles.fieldInput}
                        type="number"
                        value={form.baths}
                        onChange={e => handleInputChange('baths', e.target.value)}
                        placeholder="e.g. 1"
                        min={0}
                      />
                    </div>
                    <div className={styles.field}>
                      <label className={styles.fieldLabel}>Floor Area (sqm)</label>
                      <input
                        className={styles.fieldInput}
                        type="number"
                        value={form.sqm}
                        onChange={e => handleInputChange('sqm', e.target.value)}
                        placeholder="e.g. 28"
                        min={0}
                      />
                    </div>
                  </div>
                </section>

                {/* ── Listing Status ── */}
                <section className={styles.card}>
                  <div className={styles.cardTitle}>Listing Status</div>
                  <div className={styles.visibilityWrap}>
                    <div className={styles.visibilityInfo}>
                      <div className={styles.visibilityLabel}>
                        {form.status === 'AVAILABLE' ? '🟢 Publicly Visible' : '🔴 Hidden from Search'}
                      </div>
                      <div className={styles.visibilitySub}>
                        {form.status === 'AVAILABLE'
                          ? 'Tenants can currently find and view this property.'
                          : 'This property is hidden and won\'t appear in search results.'}
                      </div>
                    </div>
                    <button
                      type="button"
                      className={`${styles.toggleBtn} ${form.status === 'AVAILABLE' ? styles.toggleBtnOn : styles.toggleBtnOff}`}
                      onClick={() => handleInputChange('status', form.status === 'AVAILABLE' ? 'UNAVAILABLE' : 'AVAILABLE')}
                    >
                      <span className={styles.toggleThumb} />
                    </button>
                  </div>
                </section>

                {/* ── Location & Map ── */}
                <section className={styles.card}>
                  <div className={styles.cardTitle}>Location & Map</div>
                  <div className={`${styles.field} ${styles.fieldFull}`} style={{ marginBottom: "20px" }}>
                    <label className={styles.fieldLabel}>Full Address</label>
                    <input
                      className={styles.fieldInput}
                      value={form.location}
                      onChange={e => handleInputChange('location', e.target.value)}
                      placeholder="e.g. Lahug, Cebu City"
                    />
                  </div>
                  <div className={styles.mapFrame}>
                    {mapSrc ? (
                      <iframe title="map" src={mapSrc} loading="lazy" referrerPolicy="no-referrer" />
                    ) : (
                      <div style={{
                        height: "100%", display: "flex", flexDirection: "column",
                        alignItems: "center", justifyContent: "center",
                        color: "#6e7071", gap: "10px"
                      }}>
                        <span style={{ fontSize: "36px", opacity: 0.4 }}>🗺️</span>
                        <span style={{ fontSize: "14px" }}>Enter an address to preview map</span>
                      </div>
                    )}
                  </div>
                  {mapCoords && (
                    <div style={{
                      display: "inline-flex", alignItems: "center", gap: "6px",
                      marginTop: "10px", background: "rgba(31,93,113,0.06)",
                      border: "1px solid rgba(31,93,113,0.14)", borderRadius: "10px",
                      padding: "8px 14px", fontSize: "13px", color: "#1f5d71", fontWeight: 600
                    }}>
                      📍 {mapCoords.lat.toFixed(5)}, {mapCoords.lon.toFixed(5)}
                    </div>
                  )}
                </section>

                {/* ── Media Gallery ── */}
                <section className={styles.card}>
                  <div className={styles.cardTitle}>
                    Media Gallery ({existingImages.length + newPreviews.length} photos)
                  </div>

                  {existingImages.length > 0 && (
                    <div>
                      <p style={{
                        fontSize: "12px", fontWeight: 700, color: "#1f5d71",
                        letterSpacing: "0.8px", textTransform: "uppercase", marginBottom: "10px"
                      }}>
                        Current Photos — click to enlarge
                      </p>
                      <div className={styles.imagePreviewGrid}>
                        {existingImages.map(img => (
                          <div key={img.id} className={styles.imagePreviewWrap}>
                            <img
                              src={img.imageUrl}
                              className={styles.imagePreview}
                              onClick={() => setLightboxSrc(img.imageUrl)}
                              alt="Property"
                            />
                            <button
                              type="button"
                              className={styles.imagePreviewRemove}
                              onClick={() => removeExisting(img.id)}
                            >✕</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {newPreviews.length > 0 && (
                    <div style={{ marginTop: existingImages.length > 0 ? "16px" : "0" }}>
                      <p style={{
                        fontSize: "12px", fontWeight: 700, color: "#1f5d71",
                        letterSpacing: "0.8px", textTransform: "uppercase", marginBottom: "10px"
                      }}>
                        New Photos
                      </p>
                      <div className={styles.imagePreviewGrid}>
                        {newPreviews.map((src, i) => (
                          <div key={i} className={styles.imagePreviewWrap}>
                            <img src={src} className={styles.imagePreview} alt="New" />
                            <div style={{
                              position: "absolute", bottom: 4, left: 4,
                              background: "#1f5d71", color: "#fff",
                              fontSize: "10px", fontWeight: 700,
                              padding: "2px 6px", borderRadius: "4px"
                            }}>New</div>
                            <button
                              type="button"
                              className={styles.imagePreviewRemove}
                              onClick={() => removeNew(i)}
                            >✕</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      marginTop: "20px",
                      border: "2px dashed #e5eced",
                      borderRadius: "14px",
                      padding: "28px 20px",
                      textAlign: "center",
                      cursor: "pointer",
                      transition: "border-color 0.2s, background 0.2s",
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLDivElement).style.borderColor = "#53a4a3";
                      (e.currentTarget as HTMLDivElement).style.background = "rgba(83,164,163,0.04)";
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLDivElement).style.borderColor = "#e5eced";
                      (e.currentTarget as HTMLDivElement).style.background = "";
                    }}
                  >
                    <div style={{ fontSize: "32px", opacity: 0.4, marginBottom: "8px" }}>📸</div>
                    <div style={{ fontSize: "15px", fontWeight: 700, color: "#1f5d71", marginBottom: "4px" }}>
                      {newFiles.length > 0
                        ? `${newFiles.length} new photo${newFiles.length > 1 ? "s" : ""} selected`
                        : "Click to upload new photos"}
                    </div>
                    <div style={{ fontSize: "13px", color: "#6e7071" }}>
                      JPG, PNG, WEBP · Max 5MB each
                    </div>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    hidden
                    onChange={handleFileChange}
                    accept="image/*"
                  />
                </section>

                {/* ── Submit Row ── */}
                <div className={styles.submitRow}>
                  {saveStatus && (
                    <span style={{
                      fontSize: "13px",
                      fontWeight: 600,
                      color: saveStatus.type === 'success' ? '#2d8c6a' : '#c0392b',
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}>
                      {saveStatus.type === 'success' ? '✓' : '✕'} {saveStatus.msg}
                    </span>
                  )}
                  <button
                    type="button"
                    style={{
                      padding: "12px 24px",
                      background: "#f0f4f5",
                      border: "1.5px solid #e5eced",
                      borderRadius: "12px",
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: "14px",
                      fontWeight: 700,
                      color: "#6e7071",
                      cursor: "pointer",
                    }}
                    onClick={() => navigate(-1)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className={styles.submitBtn} disabled={saving}>
                    {saving ? <div className={styles.submitSpinner} /> : "Update Property"}
                  </button>
                </div>
              </>
            )}

          </main>
        </form>
      </div>
    </div>
  );
};

export default AdminPropertyEdit;