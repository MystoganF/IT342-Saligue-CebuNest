import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AdminSidebar from "../../../components/AdminSidebar/AdminSidebar";
import styles from "./admin_edit_property.module.css";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

// ─── types ──────────────────────────────────────────────────────────────────

interface AdminUser { id: number; name: string; email: string; role: string; }

interface PropertyType { id: number; name: string; }

interface ExistingImage { id: number; imageUrl: string; }

interface MapCoords { lat: number; lon: number; }

interface ActiveTenantInfo {
  tenantId: number;
  tenantName: string;
  tenantEmail: string;
  startDate: string;
  leaseDurationMonths: number;
}

// ─── helpers ─────────────────────────────────────────────────────────────────

async function geocode(query: string): Promise<MapCoords | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`,
      { headers: { "Accept-Language": "en" } }
    );
    const data = await res.json();
    if (!data.length) return null;
    return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
  } catch { return null; }
}

function buildMapSrc(coords: MapCoords): string {
  const { lat, lon } = coords;
  return (
    `https://www.openstreetmap.org/export/embed.html` +
    `?bbox=${lon - 0.01},${lat - 0.01},${lon + 0.01},${lat + 0.01}` +
    `&layer=mapnik&marker=${lat},${lon}`
  );
}

function calcMoveOut(startDate: string, months: number): string {
  const d = new Date(startDate + "T00:00:00");
  d.setMonth(d.getMonth() + months);
  return d.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
}

// ─── component ───────────────────────────────────────────────────────────────

const AdminEditProperty: React.FC = () => {
  const navigate     = useNavigate();
  const { id }       = useParams<{ id: string }>();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Auth & metadata ─────────────────────────────────────────────────────
  const [admin, setAdmin]                 = useState<AdminUser | null>(null);
  const [propertyTypes, setPropertyTypes] = useState<PropertyType[]>([]);
  const [pageLoading, setPageLoading]     = useState(true);
  const [pageError, setPageError]         = useState<string | null>(null);

  // ── Property meta ───────────────────────────────────────────────────────
  const [ownerName, setOwnerName]             = useState("");
  const [ownerId, setOwnerId]                 = useState<number | null>(null);
  const [originalStatus, setOriginalStatus]   = useState("");
  const [createdAt, setCreatedAt]             = useState("");
  const [hasActiveTenant, setHasActiveTenant] = useState(false);
  const [activeTenant, setActiveTenant]       = useState<ActiveTenantInfo | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);

  // ── Form fields ─────────────────────────────────────────────────────────
  const [title, setTitle]             = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice]             = useState("");
  const [location, setLocation]       = useState("");
  const [typeId, setTypeId]           = useState<string>("");
  const [beds, setBeds]               = useState("");
  const [baths, setBaths]             = useState("");
  const [sqm, setSqm]                 = useState("");
  const [auditNote, setAuditNote]     = useState("");

  // ── Map ─────────────────────────────────────────────────────────────────
  const [mapQuery, setMapQuery]         = useState("");
  const [mapCoords, setMapCoords]       = useState<MapCoords | null>(null);
  const [mapSearching, setMapSearching] = useState(false);
  const [mapError, setMapError]         = useState<string | null>(null);

  // ── Images ──────────────────────────────────────────────────────────────
  const [existingImages, setExistingImages]     = useState<ExistingImage[]>([]);
  const [removedImageIds, setRemovedImageIds]   = useState<number[]>([]);
  const [newImageFiles, setNewImageFiles]       = useState<File[]>([]);
  const [newImagePreviews, setNewImagePreviews] = useState<string[]>([]);
  const [dragOver, setDragOver]                 = useState(false);

  // ── Lightbox ────────────────────────────────────────────────────────────
  const [lightboxSrc, setLightboxSrc]     = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number>(0);
  const [lightboxList, setLightboxList]   = useState<string[]>([]);

  // ── Confirm modal ────────────────────────────────────────────────────────
  const [showConfirm, setShowConfirm] = useState(false);

  // ── Submit ──────────────────────────────────────────────────────────────
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg]   = useState<{
    type: "success" | "error" | "warning";
    text: string;
  } | null>(null);

  // ── Auth guard ───────────────────────────────────────────────────────────
  useEffect(() => {
    const stored = localStorage.getItem("user");
    const token  = localStorage.getItem("accessToken");
    if (!stored || !token) { navigate("/"); return; }
    try {
      const parsed = JSON.parse(stored);
      if (parsed.role?.toUpperCase() !== "ADMIN") { navigate("/home"); return; }
      setAdmin(parsed);
    } catch { navigate("/"); }
  }, [navigate]);

  // ── Property types ───────────────────────────────────────────────────────
  useEffect(() => {
    fetch(`${API_BASE}/api/properties/types`)
      .then((r) => r.json())
      .then((data) => { if (data.success) setPropertyTypes(data.data.types ?? []); })
      .catch(() => {});
  }, []);

  // ── Load property ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!admin || !id) return;
    const token = localStorage.getItem("accessToken");
    setPageLoading(true);
    fetch(`${API_BASE}/api/admin/properties/${id}`, {
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
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
        setOwnerName(p.ownerName ?? "");
        setOwnerId(p.ownerId ?? null);
        setOriginalStatus(p.status ?? "");
        setCreatedAt(p.createdAt ?? "");
        setRejectionReason(p.rejectionReason ?? null);
        setHasActiveTenant(p.hasActiveTenant ?? false);
        setActiveTenant(p.activeTenant ?? null);
        setExistingImages(
          (p.images ?? []).map((img: any, idx: number) => ({
            id: img.id ?? idx,
            imageUrl: img.imageUrl,
          }))
        );
        geocode(p.location).then((coords) => { if (coords) setMapCoords(coords); });
      })
      .catch(() => setPageError("Failed to load property."))
      .finally(() => setPageLoading(false));
  }, [admin, id]);

  // ── Keyboard lightbox nav ─────────────────────────────────────────────────
  useEffect(() => {
    if (!lightboxSrc) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape")     closeLightbox();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft")  goPrev();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lightboxSrc, lightboxIndex, lightboxList]);

  // ── Lightbox helpers ──────────────────────────────────────────────────────
  const openLightbox = (srcs: string[], index: number) => {
    setLightboxList(srcs); setLightboxIndex(index); setLightboxSrc(srcs[index]);
  };
  const closeLightbox = () => setLightboxSrc(null);
  const goNext = () => {
    const next = (lightboxIndex + 1) % lightboxList.length;
    setLightboxIndex(next); setLightboxSrc(lightboxList[next]);
  };
  const goPrev = () => {
    const prev = (lightboxIndex - 1 + lightboxList.length) % lightboxList.length;
    setLightboxIndex(prev); setLightboxSrc(lightboxList[prev]);
  };

  // ── Map search ────────────────────────────────────────────────────────────
  const handleMapSearch = async () => {
    if (!mapQuery.trim()) return;
    setMapSearching(true); setMapError(null);
    const coords = await geocode(mapQuery.trim());
    if (coords) { setMapCoords(coords); if (!location.trim()) setLocation(mapQuery.trim()); }
    else setMapError("Location not found. Try a more specific address.");
    setMapSearching(false);
  };

  // ── Image helpers ─────────────────────────────────────────────────────────
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
  const removeExistingImage = (imgId: number) =>
    setRemovedImageIds((prev) => [...prev, imgId]);
  const removeNewImage = (index: number) => {
    const updated = newImageFiles.filter((_, i) => i !== index);
    setNewImageFiles(updated);
    setNewImagePreviews(updated.map((f) => URL.createObjectURL(f)));
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!admin || !id) return;
    setShowConfirm(false);
    setSubmitting(true);
    setSubmitMsg(null);

    try {
      const token = localStorage.getItem("accessToken");

      const updateRes = await fetch(`${API_BASE}/api/admin/properties/${id}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          title:           title.trim(),
          description:     description.trim(),
          price:           parseFloat(price),
          location:        location.trim(),
          typeId:          parseInt(typeId),
          beds:            beds  ? parseInt(beds)  : null,
          baths:           baths ? parseInt(baths) : null,
          sqm:             sqm   ? parseInt(sqm)   : null,
          removedImageIds: removedImageIds.length > 0 ? removedImageIds : undefined,
        }),
      });
      const updateData = await updateRes.json();
      console.log("BACKEND ERROR EXPOSED:", updateData);
      
      if (!updateRes.ok || !updateData.success) {
        setSubmitMsg({ type: "error", text: updateData?.error?.message ?? "Failed to update property." });
        return;
      }

      if (newImageFiles.length > 0) {
        const formData = new FormData();
        newImageFiles.forEach((f) => formData.append("files", f));
        const imgRes = await fetch(`${API_BASE}/api/admin/properties/${id}/images`, {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData,
        });
        const imgData = await imgRes.json();

        // 🚨 ADD THIS LINE 🚨
        console.log("IMAGE UPLOAD ERROR:", imgData);

        if (!imgRes.ok || !imgData.success) {
          setSubmitMsg({ type: "warning", text: "Property updated! Some images failed to upload." });
          setTimeout(() => navigate("/admin/properties"), 2000);
          return;
        }
      }

      setSubmitMsg({ type: "success", text: "Property updated successfully. Redirecting…" });
      setTimeout(() => navigate("/admin/properties"), 1500);
    } catch {
      setSubmitMsg({ type: "error", text: "Network error. Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  if (!admin) return null;

  const visibleExisting = existingImages.filter((img) => !removedImageIds.includes(img.id));
  const totalPhotos     = visibleExisting.length + newImageFiles.length;
  const existingSrcs    = visibleExisting.map((img) => img.imageUrl);

  const submitIcon     = submitMsg?.type === "success" ? "✓" : submitMsg?.type === "warning" ? "⚠" : "✕";
  const submitMsgClass = submitMsg?.type === "success" ? styles.submitMsgSuccess
                       : submitMsg?.type === "warning" ? styles.submitMsgWarning
                       : styles.submitMsgError;

  const isPendingReview = originalStatus === "PENDING_REVIEW";

  const formattedCreatedAt = createdAt
    ? new Date(createdAt).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })
    : "—";

  const navItems = [
    { path: "/admin/rental-requests", icon: "📋", label: "Rental Requests" },
    { path: "/admin/properties",      icon: "🏘️", label: "All Properties"  },
    { path: "/admin/users",           icon: "👥", label: "Users"           },
    { path: "/admin/audit-log",       icon: "📜", label: "Audit Log"       },
  ];

  if (pageLoading) return (
    <div className={styles.page}>
      <AdminSidebar user={admin} navItems={navItems} />
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#6e7071", fontSize: 15 }}>
        Loading property…
      </div>
    </div>
  );

  if (pageError) return (
    <div className={styles.page}>
      <AdminSidebar user={admin} navItems={navItems} />
      <div style={{ flex: 1, padding: "60px 40px", textAlign: "center", color: "#c0392b" }}>{pageError}</div>
    </div>
  );

  return (
    <div className={styles.page}>
      <AdminSidebar user={admin} navItems={navItems} />

      {/* ── Lightbox ── */}
      {lightboxSrc && (
        <div className={styles.lightboxOverlay} onClick={closeLightbox}>
          <button className={styles.lightboxClose} onClick={closeLightbox} type="button">✕</button>
          {lightboxList.length > 1 && (
            <div className={styles.lightboxCounter}>{lightboxIndex + 1} / {lightboxList.length}</div>
          )}
          {lightboxList.length > 1 && (
            <button className={`${styles.lightboxNav} ${styles.lightboxNavPrev}`}
              onClick={(e) => { e.stopPropagation(); goPrev(); }} type="button">‹</button>
          )}
          <img src={lightboxSrc} alt="Full preview" className={styles.lightboxImg}
            onClick={(e) => e.stopPropagation()} />
          {lightboxList.length > 1 && (
            <button className={`${styles.lightboxNav} ${styles.lightboxNavNext}`}
              onClick={(e) => { e.stopPropagation(); goNext(); }} type="button">›</button>
          )}
          {lightboxList.length > 1 && (
            <div className={styles.lightboxStrip} onClick={(e) => e.stopPropagation()}>
              {lightboxList.map((src, i) => (
                <img key={i} src={src} alt={`Thumb ${i + 1}`}
                  className={`${styles.lightboxThumb} ${i === lightboxIndex ? styles.lightboxThumbActive : ""}`}
                  onClick={() => { setLightboxIndex(i); setLightboxSrc(src); }} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Confirm Save Modal ── */}
      {showConfirm && (
        <div className={styles.modalOverlay} onClick={() => !submitting && setShowConfirm(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader} style={{ background: "linear-gradient(135deg, rgba(125,60,152,0.1), rgba(125,60,152,0.05))" }}>
              <span style={{ fontSize: 22 }}>🛡️</span>
              <h3 className={styles.modalTitle}>Confirm Property Edit</h3>
            </div>
            <div className={styles.modalBody}>
              <p className={styles.modalDesc}>
                You are about to save changes to <strong>{title}</strong>. These changes take immediate
                effect and will be recorded in the Audit Log alongside this property's rental request
                history and any rejection details.
              </p>
              {auditNote.trim() && (
                <div style={{
                  padding: "10px 14px", borderRadius: "10px",
                  background: "rgba(125,60,152,0.06)", border: "1px solid rgba(125,60,152,0.15)",
                  fontSize: 13, color: "#5a2d74",
                }}>
                  <span style={{ fontWeight: 700 }}>📝 Admin Note:</span> {auditNote}
                </div>
              )}
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.modalCancelBtn} onClick={() => setShowConfirm(false)} disabled={submitting}>
                Cancel
              </button>
              <button className={styles.modalConfirmBtn} onClick={handleSubmit} disabled={submitting}>
                {submitting ? <><span className={styles.spinner} /> Saving…</> : "🛡️ Confirm Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Content column ── */}
      <div className={styles.content}>

        {/* ── Page Header ── */}
        <div className={styles.pageBar}>
          <div className={styles.pageBarDeco} />
          <div className={styles.pageBarDeco2} />
          <div className={styles.pageBarAccent} />
          <div className={styles.pageBarInner}>
            <button className={styles.backBtn} onClick={() => navigate(-1)} type="button">← Back to Properties</button>
            <h1 className={styles.pageBarTitle}>Edit Property</h1>
            <p className={styles.pageBarSub}>Reviewing and modifying listing on behalf of owner.</p>
            <div className={styles.adminBadge}>🛡️ Admin Override Mode</div>
          </div>
        </div>

        {/* ── Main ── */}
        <div className={styles.main}>

          {/* ── Admin Warning ── */}
          <div className={styles.adminWarningBanner}>
            <span className={styles.adminWarningIcon}>⚠️</span>
            <div className={styles.adminWarningContent}>
              <div className={styles.adminWarningTitle}>You are editing as an Administrator</div>
              <div className={styles.adminWarningText}>
                Changes made here take immediate effect. All edits are recorded in the Audit Log
                together with this property's rental request history — including any prior rejection
                reasons — so your team has a full picture of the listing's timeline.
              </div>
              <div className={styles.adminWarningMeta}>
                <span className={styles.adminWarningChip}>👤 Owner: {ownerName}</span>
                <span className={styles.adminWarningChip}>📅 Listed: {formattedCreatedAt}</span>
                <span className={styles.adminWarningChip}>🆔 Property #{id}</span>
                {hasActiveTenant && (
                  <span className={styles.adminWarningChip} style={{ color: "#7d3c98", background: "rgba(125,60,152,0.15)", borderColor: "rgba(125,60,152,0.25)" }}>
                    🏠 Occupied
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* ── Rejection Banner ── */}
          {originalStatus === "REJECTED" && rejectionReason && (
            <div className={styles.rejectionBanner}>
              <span style={{ fontSize: 22 }}>❌</span>
              <div>
                <div className={styles.rejectionTitle}>This property was previously rejected</div>
                <div className={styles.rejectionReason}><strong>Reason on file:</strong> {rejectionReason}</div>
                <div className={styles.rejectionNote}>
                  This rejection reason is visible in the Audit Log under this property's rental request entry.
                  To change the status, use the <strong>Rental Requests</strong> panel for the proper review workflow.
                </div>
              </div>
            </div>
          )}

          {/* ── Occupied Warning ── */}
          {hasActiveTenant && activeTenant && (
            <div style={{
              display: "flex", alignItems: "flex-start", gap: 14,
              padding: "16px 20px",
              background: "rgba(125,60,152,0.05)",
              border: "1.5px solid rgba(125,60,152,0.2)",
              borderRadius: 14,
            }}>
              <span style={{ fontSize: 22 }}>🏠</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: 14, color: "#7d3c98", marginBottom: 4 }}>
                  Property has an active tenant
                </div>
                <div style={{ fontSize: 13, color: "#5a2d74", lineHeight: 1.6 }}>
                  <strong>{activeTenant.tenantName}</strong> ({activeTenant.tenantEmail}) is currently leasing
                  this property since <strong>{activeTenant.startDate}</strong> for{" "}
                  <strong>{activeTenant.leaseDurationMonths} month(s)</strong>.{" "}
                  Move-out: <strong>{calcMoveOut(activeTenant.startDate, activeTenant.leaseDurationMonths)}</strong>.
                </div>
                <div style={{ fontSize: 12, color: "#7d3c98", marginTop: 8, fontWeight: 600 }}>
                  ⚠ The active lease details are recorded in the Audit Log under this property's rental request entry.
                </div>
              </div>
            </div>
          )}

          {/* ── Pending Review Notice ── */}
          {isPendingReview && (
            <div style={{
              display: "flex", alignItems: "flex-start", gap: 14,
              padding: "16px 20px",
              background: "rgba(183,142,66,0.06)",
              border: "1.5px solid rgba(183,142,66,0.22)",
              borderRadius: 14,
            }}>
              <span style={{ fontSize: 22 }}>🕐</span>
              <div>
                <div style={{ fontWeight: 800, fontSize: 14, color: "#b78e42", marginBottom: 4 }}>
                  Pending admin review
                </div>
                <div style={{ fontSize: 13, color: "#7a5210", lineHeight: 1.6 }}>
                  This property is awaiting approval. To approve or reject it — and have the full
                  property details and any rejection reason properly logged — use the{" "}
                  <strong>Rental Requests</strong> panel. You may still edit listing details here.
                </div>
              </div>
            </div>
          )}

          {/* ── Owner Info ── */}
          <div className={styles.card}>
            <div className={styles.cardAdminTitle}>🏢 Property Owner</div>
            <div className={styles.ownerInfoRow}>
              <div className={styles.ownerAvatar}>{ownerName.charAt(0).toUpperCase()}</div>
              <div className={styles.ownerInfo}>
                <div className={styles.ownerName}>{ownerName}</div>
                <div className={styles.ownerEmail}>ID #{ownerId}</div>
              </div>
              <span className={styles.ownerBadge}>OWNER</span>
            </div>
            <div className={styles.ownerStats}>
              <div className={styles.ownerStat}>
                <span className={styles.ownerStatLabel}>Property ID</span>
                <span className={styles.ownerStatValue}>#{id}</span>
              </div>
              <div className={styles.ownerStat}>
                <span className={styles.ownerStatLabel}>Listed</span>
                <span className={styles.ownerStatValue} style={{ fontSize: 12 }}>{formattedCreatedAt}</span>
              </div>
              <div className={styles.ownerStat}>
                <span className={styles.ownerStatLabel}>Status</span>
                <span className={styles.ownerStatValue} style={{ fontSize: 12 }}>{originalStatus.replace("_", " ")}</span>
              </div>
              <div className={styles.ownerStat}>
                <span className={styles.ownerStatLabel}>Tenant</span>
                <span className={styles.ownerStatValue} style={{ fontSize: 12, color: hasActiveTenant ? "#7d3c98" : "#2d8c6a" }}>
                  {hasActiveTenant ? "Occupied" : "Vacant"}
                </span>
              </div>
            </div>
          </div>

          {/* ── Basic Info ── */}
          <div className={styles.card}>
            <div className={styles.cardTitle}>Basic Information</div>
            <div className={styles.fieldsGrid}>
              <div className={`${styles.field} ${styles.fieldFull}`}>
                <label className={styles.fieldLabel}>Title <span className={styles.fieldRequired}>*</span></label>
                <input type="text" className={styles.fieldInput} placeholder="e.g. Cozy Studio near IT Park"
                  value={title} onChange={(e) => setTitle(e.target.value)} required />
              </div>
              <div className={`${styles.field} ${styles.fieldFull}`}>
                <label className={styles.fieldLabel}>Description</label>
                <textarea className={styles.fieldTextarea} placeholder="Describe the property…"
                  value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
              </div>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Monthly Price (₱) <span className={styles.fieldRequired}>*</span></label>
                <input type="number" className={styles.fieldInput} placeholder="e.g. 6500"
                  value={price} onChange={(e) => setPrice(e.target.value)} min={0} required />
              </div>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Property Type <span className={styles.fieldRequired}>*</span></label>
                <select className={styles.fieldSelect} value={typeId} onChange={(e) => setTypeId(e.target.value)} required>
                  <option value="" disabled>Select a type…</option>
                  {propertyTypes.map((pt) => <option key={pt.id} value={pt.id}>{pt.name}</option>)}
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

         

          {/* ── Location ── */}
          <div className={styles.card}>
            <div className={styles.cardTitle}>Location</div>
            <div className={`${styles.field} ${styles.fieldFull}`} style={{ marginBottom: "20px" }}>
              <label className={styles.fieldLabel}>Address / Location <span className={styles.fieldRequired}>*</span></label>
              <input type="text" className={styles.fieldInput} placeholder="e.g. Lahug, Cebu City"
                value={location} onChange={(e) => setLocation(e.target.value)} required />
            </div>
            <div className={styles.mapSearchWrap}>
              <input type="text" className={styles.mapSearchInput} placeholder="Search on map…"
                value={mapQuery} onChange={(e) => setMapQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleMapSearch())} />
              <button type="button" className={styles.mapSearchBtn}
                onClick={handleMapSearch} disabled={mapSearching || !mapQuery.trim()}>
                {mapSearching ? "Searching…" : "🔍 Find"}
              </button>
            </div>
            {mapError && <p style={{ color: "#c0392b", fontSize: "13px", marginBottom: "10px" }}>⚠ {mapError}</p>}
            <div className={styles.mapFrame}>
              {mapCoords
                ? <iframe src={buildMapSrc(mapCoords)} title="Property location" loading="lazy" referrerPolicy="no-referrer" />
                : <div className={styles.mapPlaceholder}>
                    <div className={styles.mapPlaceholderIcon}>🗺️</div>
                    <span>Search an address above to pin it on the map</span>
                  </div>
              }
            </div>
            {mapCoords && (
              <div className={styles.mapCoordsBadge}>
                <span>📍</span>
                {mapCoords.lat.toFixed(5)}, {mapCoords.lon.toFixed(5)}
              </div>
            )}
          </div>

          {/* ── Photos ── */}
          <div className={styles.card}>
            <div className={styles.cardTitle}>Photos ({totalPhotos}/10)</div>
            <div className={styles.photoTip}>
              <span className={styles.photoTipIcon}>🛡️</span>
              <div>
                <div className={styles.photoTipTitle}>Admin photo management</div>
                <div className={styles.photoTipBody}>
                  You can add or remove photos on behalf of the owner. Make sure any changes comply with
                  platform guidelines. Removing all photos will make the listing less discoverable.
                </div>
              </div>
            </div>
            <div className={styles.thumbnailNote}>
              🖼 The <strong>last photo uploaded</strong> will be used as the listing thumbnail.
            </div>

            {visibleExisting.length > 0 && (
              <div className={styles.existingImagesWrap}>
                <p className={styles.existingImagesLabel}>Current photos — click to preview</p>
                <div className={styles.imagePreviewGrid}>
                  {visibleExisting.map((img, idx) => (
                    <div key={img.id} className={styles.imagePreviewWrap}>
                      <img src={img.imageUrl} alt="Existing"
                        className={`${styles.imagePreview} ${styles.imagePreviewClickable}`}
                        onClick={() => openLightbox(existingSrcs, idx)} />
                      <button type="button" className={styles.imagePreviewRemove}
                        onClick={(e) => { e.stopPropagation(); removeExistingImage(img.id); }}
                        aria-label="Remove image">✕</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {totalPhotos < 10 && (
              <div
                className={`${styles.imageUploadArea} ${dragOver ? styles.imageUploadAreaActive : ""}`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }}
                style={{ marginTop: visibleExisting.length > 0 ? "16px" : "0" }}
              >
                <input ref={fileInputRef} type="file" accept="image/*" multiple
                  className={styles.imageUploadInput} onChange={(e) => addFiles(e.target.files)} />
                <div className={styles.imageUploadIcon}>📸</div>
                <div className={styles.imageUploadTitle}>
                  {newImageFiles.length > 0
                    ? `${newImageFiles.length} new photo${newImageFiles.length > 1 ? "s" : ""} selected`
                    : "Click or drag to add photos"}
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
                    <img src={src} alt={`New ${i + 1}`}
                      className={`${styles.imagePreview} ${styles.imagePreviewClickable}`}
                      onClick={() => openLightbox(newImagePreviews, i)} />
                    <div className={styles.imagePreviewNewBadge}>New</div>
                    <button type="button" className={styles.imagePreviewRemove}
                      onClick={(e) => { e.stopPropagation(); removeNewImage(i); }}
                      aria-label="Remove image">✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Submit ── */}
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
            <button
              type="button"
              className={styles.submitBtn}
              disabled={submitting || !title.trim() || !price || !location.trim() || !typeId}
              onClick={() => { setSubmitMsg(null); setShowConfirm(true); }}
            >
              {submitting
                ? <><span className={styles.submitSpinner} /> Saving…</>
                : "🛡️ Save Admin Changes"
              }
            </button>
          </div>

        </div>{/* end .main */}
      </div>{/* end .content */}
    </div>
  );
};

export default AdminEditProperty;