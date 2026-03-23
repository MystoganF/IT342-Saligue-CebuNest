import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
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

const AddProperty: React.FC = () => {
  const navigate     = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auth
  const [user, setUser] = useState<User | null>(null);

  // Property types
  const [propertyTypes, setPropertyTypes] = useState<PropertyType[]>([]);

  // Form fields
  const [title, setTitle]             = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice]             = useState("");
  const [location, setLocation]       = useState("");
  const [typeId, setTypeId]           = useState<string>("");
  const [beds, setBeds]               = useState("");
  const [baths, setBaths]             = useState("");
  const [sqm, setSqm]                 = useState("");

  // Map
  const [mapQuery, setMapQuery]           = useState("");
  const [mapCoords, setMapCoords]         = useState<MapCoords | null>(null);
  const [mapSearching, setMapSearching]   = useState(false);
  const [mapError, setMapError]           = useState<string | null>(null);

  // Images
  const [imageFiles, setImageFiles]         = useState<File[]>([]);
  const [imagePreviews, setImagePreviews]   = useState<string[]>([]);
  const [dragOver, setDragOver]             = useState(false);

  // Submit — added "warning" as a third type
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
      .then((data) => {
        if (data.success) setPropertyTypes(data.data.types ?? []);
      })
      .catch(() => {});
  }, []);

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
    const combined = [...imageFiles, ...valid].slice(0, 10);
    setImageFiles(combined);
    setImagePreviews(combined.map((f) => URL.createObjectURL(f)));
  };

  const removeImage = (index: number) => {
    const updated = imageFiles.filter((_, i) => i !== index);
    setImageFiles(updated);
    setImagePreviews(updated.map((f) => URL.createObjectURL(f)));
  };

  // ── Submit ─────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSubmitting(true);
    setSubmitMsg(null);

    try {
      const token = localStorage.getItem("accessToken");

      // Step 1 — Create property
      const createRes = await fetch(`${API_BASE}/api/properties`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          title:       title.trim(),
          description: description.trim(),
          price:       parseFloat(price),
          location:    location.trim(),
          typeId:      parseInt(typeId),
          beds:        beds  ? parseInt(beds)  : null,
          baths:       baths ? parseInt(baths) : null,
          sqm:         sqm   ? parseInt(sqm)   : null,
        }),
      });
      const createData = await createRes.json();

      // Hard failure — property was NOT created
      if (!createRes.ok || !createData.success) {
        setSubmitMsg({
          type: "error",
          text: createData?.error?.message ?? "Failed to create property.",
        });
        return;
      }

      // Controller returns: { success, data: { property: {...} } }
      const propertyId: number = createData.data?.property?.id;

      // Property was created but we can't get the ID to upload images
      // Use "warning" — it's not a failure
      if (!propertyId) {
        setSubmitMsg({
          type: "warning",
          text: "Property created but ID not returned. Check your listings.",
        });
        setTimeout(() => navigate("/owner/properties"), 2000);
        return;
      }

      // Step 2 — Upload images if any
      if (imageFiles.length > 0) {
        const formData = new FormData();
        imageFiles.forEach((f) => formData.append("files", f));

        const imgRes = await fetch(`${API_BASE}/api/properties/${propertyId}/images`, {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData,
        });
        const imgData = await imgRes.json();

        // Property was created; only images failed — use "warning"
        if (!imgRes.ok || !imgData.success) {
          setSubmitMsg({
            type: "warning",
            text: "Property created! Some images failed to upload — you can add them later.",
          });
          setTimeout(() => navigate("/owner/properties"), 2000);
          return;
        }
      }

      // Full success
      setSubmitMsg({ type: "success", text: "Property listed successfully! Redirecting…" });
      setTimeout(() => navigate("/owner/properties"), 1500);
    } catch {
      // True network / unexpected failure
      setSubmitMsg({ type: "error", text: "Network error. Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) return null;

  // ── Resolve submit message icon ────────────────────────────────────────
  const submitIcon =
    submitMsg?.type === "success" ? "✓"
    : submitMsg?.type === "warning" ? "⚠"
    : "✕";

  const submitMsgClass =
    submitMsg?.type === "success" ? styles.submitMsgSuccess
    : submitMsg?.type === "warning" ? styles.submitMsgWarning
    : styles.submitMsgError;

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
          <h1 className={styles.pageBarTitle}>Add New Property</h1>
          <p className={styles.pageBarSub}>Fill in the details below to list your property.</p>
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
                  placeholder="Describe your property — amenities, nearby landmarks, house rules…"
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
                <input
                  type="number"
                  className={styles.fieldInput}
                  placeholder="e.g. 1"
                  value={beds}
                  onChange={(e) => setBeds(e.target.value)}
                  min={0}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.fieldLabel}>Bathrooms</label>
                <input
                  type="number"
                  className={styles.fieldInput}
                  placeholder="e.g. 1"
                  value={baths}
                  onChange={(e) => setBaths(e.target.value)}
                  min={0}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.fieldLabel}>Floor Area (sqm)</label>
                <input
                  type="number"
                  className={styles.fieldInput}
                  placeholder="e.g. 28"
                  value={sqm}
                  onChange={(e) => setSqm(e.target.value)}
                  min={0}
                />
              </div>

            </div>
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

            {/* Map search */}
            <div className={styles.mapSearchWrap}>
              <input
                type="text"
                className={styles.mapSearchInput}
                placeholder="Search on map (e.g. IT Park Cebu)…"
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
                <iframe
                  src={buildMapSrc(mapCoords)}
                  title="Property location"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
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

          {/* ── Images ── */}
          <div className={styles.card}>
            <div className={styles.cardTitle}>Photos (up to 10)</div>

            <div
              className={`${styles.imageUploadArea} ${dragOver ? styles.imageUploadAreaActive : ""}`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }}
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
                {imageFiles.length > 0
                  ? `${imageFiles.length} photo${imageFiles.length > 1 ? "s" : ""} selected`
                  : "Click or drag photos here"}
              </div>
              <div className={styles.imageUploadSub}>
                JPG, PNG, WEBP · Max 5MB each · Up to 10 photos
              </div>
            </div>

            {imagePreviews.length > 0 && (
              <div className={styles.imagePreviewGrid}>
                {imagePreviews.map((src, i) => (
                  <div key={i} className={styles.imagePreviewWrap}>
                    <img src={src} alt={`Preview ${i + 1}`} className={styles.imagePreview} />
                    <button
                      type="button"
                      className={styles.imagePreviewRemove}
                      onClick={(e) => { e.stopPropagation(); removeImage(i); }}
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
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={() => navigate(-1)}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.submitBtn}
              disabled={submitting}
            >
              {submitting
                ? <><span className={styles.submitSpinner} /> Listing…</>
                : "List Property"}
            </button>
          </div>

        </main>
      </form>
    </div>
  );
};

export default AddProperty;