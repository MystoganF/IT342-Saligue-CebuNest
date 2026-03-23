import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import OwnerNavbar from "../../../components/OwnerNavbar/OwnerNavbar";
import styles from "./owner_add_property.module.css";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

// ─── types ─────────────────────────────────────────────────────────────────

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  avatarUrl?: string | null;
}

interface PropertyType {
  id: number;
  name: string;
}

interface ExistingImage {
  id: number;
  imageUrl: string;
}

interface MapCoords {
  lat: number;
  lon: number;
}

// ─── helpers ───────────────────────────────────────────────────────────────

async function geocode(query: string): Promise<MapCoords | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`,
      { headers: { "Accept-Language": "en" } }
    );
    const data = await res.json();
    if (!data.length) return null;
    return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
  } catch {
    return null;
  }
}

function buildMapSrc(coords: MapCoords): string {
  const { lat, lon } = coords;
  return (
    `https://www.openstreetmap.org/export/embed.html` +
    `?bbox=${lon - 0.01},${lat - 0.01},${lon + 0.01},${lat + 0.01}` +
    `&layer=mapnik&marker=${lat},${lon}`
  );
}

// ─── component ─────────────────────────────────────────────────────────────

const EditProperty: React.FC = () => {
  const navigate     = useNavigate();
  const { id }       = useParams<{ id: string }>();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [user, setUser]                   = useState<User | null>(null);
  const [propertyTypes, setPropertyTypes] = useState<PropertyType[]>([]);
  const [pageLoading, setPageLoading]     = useState(true);
  const [pageError, setPageError]         = useState<string | null>(null);

  // Form fields
  const [title, setTitle]             = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice]             = useState("");
  const [location, setLocation]       = useState("");
  const [typeId, setTypeId]           = useState<string>("");
  const [beds, setBeds]               = useState("");
  const [baths, setBaths]             = useState("");
  const [sqm, setSqm]                 = useState("");
  const [status, setStatus]           = useState<"AVAILABLE" | "UNAVAILABLE">("AVAILABLE");
  const [currentStatus, setCurrentStatus] = useState<string>("");

  // Map
  const [mapQuery, setMapQuery]         = useState("");
  const [mapCoords, setMapCoords]       = useState<MapCoords | null>(null);
  const [mapSearching, setMapSearching] = useState(false);
  const [mapError, setMapError]         = useState<string | null>(null);

  // Images
  const [existingImages, setExistingImages]   = useState<ExistingImage[]>([]);
  const [removedImageIds, setRemovedImageIds] = useState<number[]>([]);
  const [newImageFiles, setNewImageFiles]     = useState<File[]>([]);
  const [newImagePreviews, setNewImagePreviews] = useState<string[]>([]);
  const [dragOver, setDragOver]               = useState(false);

  // Submit
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg]   = useState<{
    type: "success" | "error" | "warning";
    text: string;
  } | null>(null);

  // ── Auth guard ─────────────────────────────────────────────────────────
  useEffect(() => {
    const stored = localStorage.getItem("user");
    const token  = localStorage.getItem("accessToken");
    if (!stored || !token) { navigate("/"); return; }
    try {
      const parsed: User = JSON.parse(stored);
      if (parsed.role?.toUpperCase() !== "OWNER") { navigate("/home"); return; }
      setUser(parsed);
    } catch { navigate("/"); }
  }, [navigate]);

  // ── Fetch property types ───────────────────────────────────────────────
  useEffect(() => {
    fetch(`${API_BASE}/api/properties/types`)
      .then((r) => r.json())
      .then((data) => { if (data.success) setPropertyTypes(data.data.types ?? []); })
      .catch(() => {});
  }, []);

  // ── Fetch property to edit ─────────────────────────────────────────────
  useEffect(() => {
    if (!user || !id) return;
    const token = localStorage.getItem("accessToken");
    setPageLoading(true);
    fetch(`${API_BASE}/api/properties/${id}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.json())
      .then((data) => {
        if (!data.success) { setPageError("Property not found."); return; }
        const p = data.data.property;
        setTitle(p.title ?? "");
        setDescription(p.description ?? "");
        setPrice(String(p.price ?? ""));
        setLocation(p.location ?? "");
        setTypeId(String(p.typeId ?? ""));
        setBeds(p.beds != null ? String(p.beds) : "");
        setBaths(p.baths != null ? String(p.baths) : "");
        setSqm(p.sqm != null ? String(p.sqm) : "");
        setCurrentStatus(p.status ?? "");
        // Only allow toggle if already AVAILABLE or UNAVAILABLE
        if (p.status === "AVAILABLE" || p.status === "UNAVAILABLE") {
          setStatus(p.status);
        }
        setExistingImages(
          (p.images ?? []).map((img: any, idx: number) => ({
            id: img.id ?? idx,
            imageUrl: img.imageUrl,
          }))
        );
        // Pre-fill map from location
        geocode(p.location).then((coords) => {
          if (coords) setMapCoords(coords);
        });
      })
      .catch(() => setPageError("Failed to load property."))
      .finally(() => setPageLoading(false));
  }, [user, id]);

  // ── Map search ─────────────────────────────────────────────────────────
  const handleMapSearch = async () => {
    if (!mapQuery.trim()) return;
    setMapSearching(true);
    setMapError(null);
    const coords = await geocode(mapQuery.trim());
    if (coords) {
      setMapCoords(coords);
      if (!location.trim()) setLocation(mapQuery.trim());
    } else {
      setMapError("Location not found. Try a more specific address.");
    }
    setMapSearching(false);
  };

  // ── Image handling ─────────────────────────────────────────────────────
  const addFiles = (files: FileList | null) => {
    if (!files) return;
    const valid = Array.from(files).filter(
      (f) => f.type.startsWith("image/") && f.size <= 5 * 1024 * 1024
    );
    const totalAllowed = 10 - (existingImages.length - removedImageIds.length);
    const combined = [...newImageFiles, ...valid].slice(0, totalAllowed);
    setNewImageFiles(combined);
    setNewImagePreviews(combined.map((f) => URL.createObjectURL(f)));
  };

  const removeExistingImage = (imgId: number) => {
    setRemovedImageIds((prev) => [...prev, imgId]);
  };

  const removeNewImage = (index: number) => {
    const updated = newImageFiles.filter((_, i) => i !== index);
    setNewImageFiles(updated);
    setNewImagePreviews(updated.map((f) => URL.createObjectURL(f)));
  };

  // ── Submit ─────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !id) return;
    setSubmitting(true);
    setSubmitMsg(null);

    try {
      const token = localStorage.getItem("accessToken");

      // Step 1 — Update property details + status
      const updateRes = await fetch(`${API_BASE}/api/properties/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          title:          title.trim(),
          description:    description.trim(),
          price:          parseFloat(price),
          location:       location.trim(),
          typeId:         parseInt(typeId),
          beds:           beds  ? parseInt(beds)  : null,
          baths:          baths ? parseInt(baths) : null,
          sqm:            sqm   ? parseInt(sqm)   : null,
          status:         (currentStatus === "AVAILABLE" || currentStatus === "UNAVAILABLE")
                            ? status
                            : undefined,
          removedImageIds: removedImageIds.length > 0 ? removedImageIds : undefined,
        }),
      });
      const updateData = await updateRes.json();

      if (!updateRes.ok || !updateData.success) {
        setSubmitMsg({
          type: "error",
          text: updateData?.error?.message ?? "Failed to update property.",
        });
        return;
      }

      // Step 2 — Upload new images if any
      if (newImageFiles.length > 0) {
        const formData = new FormData();
        newImageFiles.forEach((f) => formData.append("files", f));
        const imgRes = await fetch(`${API_BASE}/api/properties/${id}/images`, {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData,
        });
        const imgData = await imgRes.json();
        if (!imgRes.ok || !imgData.success) {
          setSubmitMsg({
            type: "warning",
            text: "Property updated! Some new images failed to upload.",
          });
          setTimeout(() => navigate("/owner/properties"), 2000);
          return;
        }
      }

      setSubmitMsg({ type: "success", text: "Property updated successfully! Redirecting…" });
      setTimeout(() => navigate("/owner/properties"), 1500);
    } catch {
      setSubmitMsg({ type: "error", text: "Network error. Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) return null;

  const submitIcon =
    submitMsg?.type === "success" ? "✓"
    : submitMsg?.type === "warning" ? "⚠"
    : "✕";

  const submitMsgClass =
    submitMsg?.type === "success" ? styles.submitMsgSuccess
    : submitMsg?.type === "warning" ? styles.submitMsgWarning
    : styles.submitMsgError;

  const canToggleStatus = currentStatus === "AVAILABLE" || currentStatus === "UNAVAILABLE";
  const visibleExisting = existingImages.filter((img) => !removedImageIds.includes(img.id));
  const totalPhotos     = visibleExisting.length + newImageFiles.length;

  if (pageLoading) {
    return (
      <div className={styles.page}>
        <OwnerNavbar user={user} onAddProperty={() => {}} />
        <div style={{ padding: "60px 40px", textAlign: "center", color: "#6e7071" }}>
          Loading property…
        </div>
      </div>
    );
  }

  if (pageError) {
    return (
      <div className={styles.page}>
        <OwnerNavbar user={user} onAddProperty={() => {}} />
        <div style={{ padding: "60px 40px", textAlign: "center", color: "#c0392b" }}>
          {pageError}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <OwnerNavbar user={user} onAddProperty={() => {}} />

      {/* ── Page Header ── */}
      <div className={styles.pageBar}>
        <div className={styles.pageBarDeco} />
        <div className={styles.pageBarAccent} />
        <div className={styles.pageBarInner}>
          <button className={styles.backBtn} onClick={() => navigate(-1)} type="button">
            ← Back
          </button>
          <h1 className={styles.pageBarTitle}>Edit Property</h1>
          <p className={styles.pageBarSub}>Update the details for this listing.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <main className={styles.main}>

          {/* ── Basic Info ── */}
          <div className={styles.card}>
            <div className={styles.cardTitle}>Basic Information</div>
            <div className={styles.fieldsGrid}>

              <div className={`${styles.field} ${styles.fieldFull}`}>
                <label className={styles.fieldLabel}>
                  Title <span className={styles.fieldRequired}>*</span>
                </label>
                <input
                  type="text"
                  className={styles.fieldInput}
                  placeholder="e.g. Cozy Studio near IT Park"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className={`${styles.field} ${styles.fieldFull}`}>
                <label className={styles.fieldLabel}>Description</label>
                <textarea
                  className={styles.fieldTextarea}
                  placeholder="Describe your property…"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.fieldLabel}>
                  Monthly Price (₱) <span className={styles.fieldRequired}>*</span>
                </label>
                <input
                  type="number"
                  className={styles.fieldInput}
                  placeholder="e.g. 6500"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  min={0}
                  required
                />
              </div>

              <div className={styles.field}>
                <label className={styles.fieldLabel}>
                  Property Type <span className={styles.fieldRequired}>*</span>
                </label>
                <select
                  className={styles.fieldSelect}
                  value={typeId}
                  onChange={(e) => setTypeId(e.target.value)}
                  required
                >
                  <option value="" disabled>Select a type…</option>
                  {propertyTypes.map((pt) => (
                    <option key={pt.id} value={pt.id}>{pt.name}</option>
                  ))}
                </select>
              </div>

              <div className={styles.field}>
                <label className={styles.fieldLabel}>Bedrooms</label>
                <input type="number" className={styles.fieldInput} placeholder="e.g. 1"
                  value={beds} onChange={(e) => setBeds(e.target.value)} min={0} />
              </div>

              <div className={styles.field}>
                <label className={styles.fieldLabel}>Bathrooms</label>
                <input type="number" className={styles.fieldInput} placeholder="e.g. 1"
                  value={baths} onChange={(e) => setBaths(e.target.value)} min={0} />
              </div>

              <div className={styles.field}>
                <label className={styles.fieldLabel}>Floor Area (sqm)</label>
                <input type="number" className={styles.fieldInput} placeholder="e.g. 28"
                  value={sqm} onChange={(e) => setSqm(e.target.value)} min={0} />
              </div>

            </div>
          </div>

          {/* ── Visibility Toggle ── */}
          <div className={styles.card}>
            <div className={styles.cardTitle}>Listing Visibility</div>
            {canToggleStatus ? (
              <div className={styles.visibilityWrap}>
                <div className={styles.visibilityInfo}>
                  <div className={styles.visibilityLabel}>
                    {status === "AVAILABLE" ? "🟢 Visible on listings" : "🔴 Hidden from listings"}
                  </div>
                  <div className={styles.visibilitySub}>
                    {status === "AVAILABLE"
                      ? "Tenants can currently find and view this property."
                      : "This property is hidden and won't appear in search results."}
                  </div>
                </div>
                <button
                  type="button"
                  className={`${styles.toggleBtn} ${status === "AVAILABLE" ? styles.toggleBtnOn : styles.toggleBtnOff}`}
                  onClick={() => setStatus((s) => s === "AVAILABLE" ? "UNAVAILABLE" : "AVAILABLE")}
                >
                  <span className={styles.toggleThumb} />
                </button>
              </div>
            ) : (
              <div className={styles.visibilityLocked}>
                <span className={styles.visibilityLockedIcon}>🔒</span>
                <div>
                  <div className={styles.visibilityLockedLabel}>
                    Status: <strong>{currentStatus?.replace("_", " ")}</strong>
                  </div>
                  <div className={styles.visibilityLockedSub}>
                    Visibility can only be toggled on approved properties. This property is currently under review or rejected.
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Location + Map ── */}
          <div className={styles.card}>
            <div className={styles.cardTitle}>Location</div>

            <div className={`${styles.field} ${styles.fieldFull}`} style={{ marginBottom: "20px" }}>
              <label className={styles.fieldLabel}>
                Address / Location <span className={styles.fieldRequired}>*</span>
              </label>
              <input
                type="text"
                className={styles.fieldInput}
                placeholder="e.g. Lahug, Cebu City"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                required
              />
            </div>

            <div className={styles.mapSearchWrap}>
              <input
                type="text"
                className={styles.mapSearchInput}
                placeholder="Search on map…"
                value={mapQuery}
                onChange={(e) => setMapQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleMapSearch())}
              />
              <button
                type="button"
                className={styles.mapSearchBtn}
                onClick={handleMapSearch}
                disabled={mapSearching || !mapQuery.trim()}
              >
                {mapSearching ? "Searching…" : "🔍 Find"}
              </button>
            </div>

            {mapError && (
              <p style={{ color: "#c0392b", fontSize: "13px", marginBottom: "10px" }}>
                ⚠ {mapError}
              </p>
            )}

            <div className={styles.mapFrame}>
              {mapCoords ? (
                <iframe src={buildMapSrc(mapCoords)} title="Property location"
                  loading="lazy" referrerPolicy="no-referrer" />
              ) : (
                <div className={styles.mapPlaceholder}>
                  <div className={styles.mapPlaceholderIcon}>🗺️</div>
                  <span>Search an address above to pin it on the map</span>
                </div>
              )}
            </div>

            {mapCoords && (
              <div className={styles.mapCoordsBadge}>
                <span className={styles.mapCoordsIcon}>📍</span>
                {mapCoords.lat.toFixed(5)}, {mapCoords.lon.toFixed(5)}
              </div>
            )}
          </div>

          {/* ── Photos ── */}
          <div className={styles.card}>
            <div className={styles.cardTitle}>Photos ({totalPhotos}/10)</div>

            {/* Existing images */}
            {visibleExisting.length > 0 && (
              <div className={styles.existingImagesWrap}>
                <p className={styles.existingImagesLabel}>Current photos</p>
                <div className={styles.imagePreviewGrid}>
                  {visibleExisting.map((img) => (
                    <div key={img.id} className={styles.imagePreviewWrap}>
                      <img src={img.imageUrl} alt="Existing" className={styles.imagePreview} />
                      <button
                        type="button"
                        className={styles.imagePreviewRemove}
                        onClick={() => removeExistingImage(img.id)}
                        aria-label="Remove image"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* New image upload */}
            {totalPhotos < 10 && (
              <div
                className={`${styles.imageUploadArea} ${dragOver ? styles.imageUploadAreaActive : ""}`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }}
                style={{ marginTop: visibleExisting.length > 0 ? "16px" : "0" }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className={styles.imageUploadInput}
                  onChange={(e) => addFiles(e.target.files)}
                />
                <div className={styles.imageUploadIcon}>📸</div>
                <div className={styles.imageUploadTitle}>
                  {newImageFiles.length > 0
                    ? `${newImageFiles.length} new photo${newImageFiles.length > 1 ? "s" : ""} selected`
                    : "Click or drag to add more photos"}
                </div>
                <div className={styles.imageUploadSub}>
                  JPG, PNG, WEBP · Max 5MB each · Up to {10 - visibleExisting.length} more
                </div>
              </div>
            )}

            {newImagePreviews.length > 0 && (
              <div className={styles.imagePreviewGrid} style={{ marginTop: "12px" }}>
                {newImagePreviews.map((src, i) => (
                  <div key={i} className={styles.imagePreviewWrap}>
                    <img src={src} alt={`New ${i + 1}`} className={styles.imagePreview} />
                    <div className={styles.imagePreviewNewBadge}>New</div>
                    <button
                      type="button"
                      className={styles.imagePreviewRemove}
                      onClick={(e) => { e.stopPropagation(); removeNewImage(i); }}
                      aria-label="Remove image"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Submit Row ── */}
          <div className={styles.submitRow}>
            {submitMsg && (
              <span className={`${styles.submitMsg} ${submitMsgClass}`}>
                {submitIcon} {submitMsg.text}
              </span>
            )}
            <button type="button" className={styles.cancelBtn}
              onClick={() => navigate(-1)} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className={styles.submitBtn} disabled={submitting}>
              {submitting
                ? <><span className={styles.submitSpinner} /> Saving…</>
                : "Save Changes"}
            </button>
          </div>

        </main>
      </form>
    </div>
  );
};

export default EditProperty;