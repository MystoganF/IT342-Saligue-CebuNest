import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, useOutletContext } from "react-router-dom";
import { adminEditPropertyApi } from "./admin_edit_property.api";
import type { ActiveTenantInfo, ExistingImage, PropertyType } from "./admin_edit_property.api";
import styles from "./admin_edit_property.module.css";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

import {
  ShieldAlert,
  AlertTriangle,
  XCircle,
  Home,
  Clock,
  User,
  MapPin,
  Camera,
  CheckCircle2,
  X,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";

// Fix Leaflet's default marker icons for bundlers
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
L.Marker.prototype.options.icon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

// ─── Types ──────────────────────────────────────────────────────────────────
interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface MapCoords {
  lat: number;
  lon: number;
}

// ─── Cebu City map bounds ──────────────────────────────────────────────────
const CEBU_BOUNDS = {
  minLat: 10.255, maxLat: 10.445,
  minLon: 123.808, maxLon: 123.924,
};

// ─── Geocoding helpers ─────────────────────────────────────────────────────
async function geocode(query: string): Promise<MapCoords | null> {
  try {
    const q = query.toLowerCase().includes("cebu city")
      ? query
      : `${query}, Cebu City, Philippines`;
    const params = new URLSearchParams({
      q,
      format: "json",
      limit: "1",
      countrycodes: "ph",
      bounded: "1",
      viewbox: "123.75,10.48,123.95,10.24",
    });
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?${params}`,
      { headers: { "Accept-Language": "en" } }
    );
    const data = await res.json();
    if (!data.length) return null;
    return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
  } catch {
    return null;
  }
}

async function reverseGeocode(lat: number, lon: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`
    );
    const data = await res.json();
    return data.display_name ?? null;
  } catch {
    return null;
  }
}

function calcMoveOut(startDate: string, months: number): string {
  const d = new Date(`${startDate}T00:00:00`);
  d.setMonth(d.getMonth() + months);
  return d.toLocaleDateString("en-PH", {
    year: "numeric", month: "short", day: "numeric",
  });
}

// ─── Map click handler ─────────────────────────────────────────────────────
function ClickableMap({
  coords,
  setCoords,
  onSelect,
}: {
  coords: MapCoords | null;
  setCoords: (c: MapCoords) => void;
  onSelect: (lat: number, lon: number) => void;
}) {
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      setCoords({ lat, lon: lng });
      onSelect(lat, lng);
    },
  });
  return coords ? <Marker position={[coords.lat, coords.lon]} /> : null;
}

// ─── Component ────────────────────────────────────────────────────────────
const AdminEditProperty: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user: admin } = useOutletContext<{ user: AdminUser }>();

  // Server data
  const [propertyTypes, setPropertyTypes] = useState<PropertyType[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  // Property meta (read-only display)
  const [ownerName, setOwnerName] = useState("");
  const [ownerId, setOwnerId] = useState<number | null>(null);
  const [originalStatus, setOriginalStatus] = useState("");
  const [createdAt, setCreatedAt] = useState("");
  const [hasActiveTenant, setHasActiveTenant] = useState(false);
  const [activeTenant, setActiveTenant] = useState<ActiveTenantInfo | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);

  // Editable form fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [location, setLocation] = useState("");
  const [typeId, setTypeId] = useState("");
  const [beds, setBeds] = useState("");
  const [baths, setBaths] = useState("");
  const [sqm, setSqm] = useState("");

  // Map
  const [mapCoords, setMapCoords] = useState<MapCoords | null>(null);
  const [mapSearching, setMapSearching] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  // Images
  const [existingImages, setExistingImages] = useState<ExistingImage[]>([]);
  const [removedImageIds, setRemovedImageIds] = useState<number[]>([]);
  const [newImageFiles, setNewImageFiles] = useState<File[]>([]);
  const [newImagePreviews, setNewImagePreviews] = useState<string[]>([]);
  const [dragOver, setDragOver] = useState(false);

  // Lightbox
  const [lbList, setLbList] = useState<string[]>([]);
  const [lbIndex, setLbIndex] = useState(0);
  const [lbOpen, setLbOpen] = useState(false);

  // Submit / confirm
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState<{
    type: "success" | "error" | "warning";
    text: string;
  } | null>(null);

  // ── Fetch property types ──────────────────────────────────────────────────
  useEffect(() => {
    adminEditPropertyApi.getPropertyTypes()
      .then((data) => {
        if (data.success) setPropertyTypes(data.data.types ?? []);
      })
      .catch(() => {});
  }, []);

  // ── Fetch property detail ─────────────────────────────────────────────────
  useEffect(() => {
    if (!admin || !id) return;
    setPageLoading(true);
    adminEditPropertyApi.getAdminPropertyById(id)
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
          (p.images ?? []).map((img, idx) => ({
            id: img.id ?? idx,
            imageUrl: img.imageUrl,
          }))
        );
        geocode(p.location).then((c) => { if (c) setMapCoords(c); });
      })
      .catch(() => setPageError("Failed to load property."))
      .finally(() => setPageLoading(false));
  }, [admin, id]);

  // ── Keyboard navigation for lightbox ─────────────────────────────────────
  useEffect(() => {
    if (!lbOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape")     closeLb();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft")  goPrev();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lbOpen, lbIndex, lbList]);

  // ── Lightbox helpers ──────────────────────────────────────────────────────
  const openLb = (srcs: string[], index: number) => {
    setLbList(srcs); setLbIndex(index); setLbOpen(true);
  };
  const closeLb = () => setLbOpen(false);
  const goNext  = () => setLbIndex((i) => { const n = (i + 1) % lbList.length; return n; });
  const goPrev  = () => setLbIndex((i) => { const n = (i - 1 + lbList.length) % lbList.length; return n; });

  // ── Map actions ───────────────────────────────────────────────────────────
  const handleMapSearch = async () => {
    if (!location.trim()) return;
    setMapSearching(true); setMapError(null);
    const coords = await geocode(location.trim());
    if (coords) {
      const inBounds =
        coords.lat >= CEBU_BOUNDS.minLat && coords.lat <= CEBU_BOUNDS.maxLat &&
        coords.lon >= CEBU_BOUNDS.minLon && coords.lon <= CEBU_BOUNDS.maxLon;
      if (!inBounds) {
        setMapError("This location is outside Cebu City.");
        setMapSearching(false); return;
      }
      setMapCoords(coords);
    } else {
      setMapError("Location not found. Try a more specific address.");
    }
    setMapSearching(false);
  };

  const handleMapClick = async (lat: number, lon: number) => {
    const out =
      lat < CEBU_BOUNDS.minLat || lat > CEBU_BOUNDS.maxLat ||
      lon < CEBU_BOUNDS.minLon || lon > CEBU_BOUNDS.maxLon;
    if (out) { setMapError("That pin is outside Cebu City."); return; }
    setMapSearching(true); setMapError(null);
    const address = await reverseGeocode(lat, lon);
    if (address) setLocation(address);
    else setMapError("Could not retrieve address for this location.");
    setMapSearching(false);
  };

  // ── Image helpers ─────────────────────────────────────────────────────────
  const addFiles = (files: FileList | null) => {
    if (!files) return;
    const valid = Array.from(files).filter(
      (f) => f.type.startsWith("image/") && f.size <= 5 * 1024 * 1024
    );
    const allowed = 10 - (existingImages.length - removedImageIds.length);
    const combined = [...newImageFiles, ...valid].slice(0, allowed);
    setNewImageFiles(combined);
    setNewImagePreviews(combined.map((f) => URL.createObjectURL(f)));
  };

  const removeExisting = (imgId: number) =>
    setRemovedImageIds((prev) => [...prev, imgId]);

  const removeNew = (index: number) => {
    const updated = newImageFiles.filter((_, i) => i !== index);
    setNewImageFiles(updated);
    setNewImagePreviews(updated.map((f) => URL.createObjectURL(f)));
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!admin || !id) return;
    setShowConfirm(false); setSubmitting(true); setSubmitMsg(null);
    try {
      const res = await adminEditPropertyApi.updateAdminProperty(id, {
        title: title.trim(),
        description: description.trim(),
        price: parseFloat(price),
        location: location.trim(),
        typeId: parseInt(typeId),
        beds: beds ? parseInt(beds) : null,
        baths: baths ? parseInt(baths) : null,
        sqm: sqm ? parseInt(sqm) : null,
        removedImageIds: removedImageIds.length > 0 ? removedImageIds : undefined,
      });

      if (!res.success) {
        setSubmitMsg({ type: "error", text: res.error?.message ?? "Failed to update property." });
        setSubmitting(false); return;
      }

      if (newImageFiles.length > 0) {
        const fd = new FormData();
        newImageFiles.forEach((f) => fd.append("files", f));
        const imgRes = await adminEditPropertyApi.uploadAdminPropertyImages(id, fd);
        if (!imgRes.success) {
          setSubmitMsg({ type: "warning", text: "Property updated. Some images failed to upload." });
          setTimeout(() => navigate("/admin/properties"), 2200);
          return;
        }
      }

      setSubmitMsg({ type: "success", text: "Property updated successfully. Redirecting…" });
      setTimeout(() => navigate("/admin/properties"), 1600);
    } catch {
      setSubmitMsg({ type: "error", text: "Network error. Please try again." });
      setSubmitting(false);
    }
  };

  // ── Derived values ────────────────────────────────────────────────────────
  if (!admin) return null;

  const visibleExisting = existingImages.filter(
    (img) => !removedImageIds.includes(img.id)
  );
  const totalPhotos    = visibleExisting.length + newImageFiles.length;
  const existingSrcs   = visibleExisting.map((img) => img.imageUrl);
  const isPending      = originalStatus === "PENDING_REVIEW";
  const isRejected     = originalStatus === "REJECTED";
  const formattedDate  = createdAt
    ? new Date(createdAt).toLocaleDateString("en-PH", {
        year: "numeric", month: "short", day: "numeric",
      })
    : "—";

  const submitMsgClass =
    submitMsg?.type === "success" ? styles.submitMsgSuccess
    : submitMsg?.type === "warning" ? styles.submitMsgWarning
    : styles.submitMsgError;

  const canSubmit =
    !submitting && title.trim() && price && location.trim() && typeId;

  // ── Loading ───────────────────────────────────────────────────────────────
  if (pageLoading) return (
    <div className={styles.page}>
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#6e7071" }}>
        <Loader2 size={22} style={{ animation: "spin 0.7s linear infinite", marginRight: 8 }} />
        Loading property…
      </div>
    </div>
  );

  // ── Error ─────────────────────────────────────────────────────────────────
  if (pageError) return (
    <div className={styles.page}>
      <div className={styles.stateBox} style={{ margin: "60px auto 0", maxWidth: 380 }}>
        <div className={styles.stateIcon}><AlertTriangle size={44} /></div>
        <h3 className={styles.stateTitle}>Something went wrong</h3>
        <p className={styles.stateBody}>{pageError}</p>
        <button className={styles.cancelBtn} onClick={() => navigate(-1)} type="button">
          Go Back
        </button>
      </div>
    </div>
  );

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className={styles.page}>

      {/* ── Lightbox ── */}
      {lbOpen && (
        <div className={styles.lightboxOverlay} onClick={closeLb}>
          <button className={styles.lightboxClose} onClick={closeLb} type="button">
            <X size={20} />
          </button>
          {lbList.length > 1 && (
            <div className={styles.lightboxCounter}>{lbIndex + 1} / {lbList.length}</div>
          )}
          {lbList.length > 1 && (
            <button
              className={`${styles.lightboxNav} ${styles.lightboxNavPrev}`}
              onClick={(e) => { e.stopPropagation(); goPrev(); }}
              type="button"
            >
              <ChevronLeft size={32} />
            </button>
          )}
          <img
            src={lbList[lbIndex]}
            alt="Full preview"
            className={styles.lightboxImg}
            onClick={(e) => e.stopPropagation()}
          />
          {lbList.length > 1 && (
            <button
              className={`${styles.lightboxNav} ${styles.lightboxNavNext}`}
              onClick={(e) => { e.stopPropagation(); goNext(); }}
              type="button"
            >
              <ChevronRight size={32} />
            </button>
          )}
          {lbList.length > 1 && (
            <div className={styles.lightboxStrip} onClick={(e) => e.stopPropagation()}>
              {lbList.map((src, i) => (
                <img
                  key={i}
                  src={src}
                  alt={`Thumb ${i + 1}`}
                  className={`${styles.lightboxThumb} ${i === lbIndex ? styles.lightboxThumbActive : ""}`}
                  onClick={() => setLbIndex(i)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Confirm modal ── */}
      {showConfirm && (
        <div
          className={styles.modalOverlay}
          onClick={() => !submitting && setShowConfirm(false)}
        >
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHead}>
              <ShieldAlert size={22} className={styles.modalHeadIcon} />
              <h3 className={styles.modalTitle}>Confirm Property Edit</h3>
            </div>
            <div className={styles.modalBody}>
              <p className={styles.modalDesc}>
                You are about to save changes to <strong>{title}</strong>. These
                changes take immediate effect and are recorded in the Audit Log
                alongside this property's full history.
              </p>
            </div>
            <div className={styles.modalFoot}>
              <button
                className={styles.modalCancel}
                onClick={() => setShowConfirm(false)}
                disabled={submitting}
                type="button"
              >
                Cancel
              </button>
              <button
                className={styles.modalConfirm}
                onClick={handleSubmit}
                disabled={submitting}
                type="button"
              >
                {submitting ? (
                  <><span className={styles.spinner} /> Saving…</>
                ) : (
                  <><ShieldAlert size={15} /> Confirm Save</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Page content ── */}
      <div className={styles.content}>

        {/* Header bar */}
        <div className={styles.pageBar}>
          <div className={styles.pageBarOrb1} />
          <div className={styles.pageBarOrb2} />
          <div className={styles.pageBarAccent} />
          <div className={styles.pageBarInner}>
            <button className={styles.backBtn} onClick={() => navigate(-1)} type="button">
              <ChevronLeft size={14} /> Back to Properties
            </button>
            <h1 className={styles.pageBarTitle}>Edit Property</h1>
            <p className={styles.pageBarSub}>Reviewing and modifying this listing on behalf of the owner.</p>
            <span className={styles.adminBadge}>
              <ShieldAlert size={12} /> Admin Override Mode
            </span>
          </div>
        </div>

        <div className={styles.main}>

          {/* Admin warning banner */}
          <div className={styles.adminBanner}>
            <AlertTriangle size={22} className={styles.adminBannerIcon} />
            <div className={styles.adminBannerBody}>
              <div className={styles.adminBannerTitle}>You are editing as an Administrator</div>
              <div className={styles.adminBannerText}>
                Changes made here take immediate effect. All edits are recorded in the
                Audit Log together with this property's history.
              </div>
              <div className={styles.adminBannerChips}>
                <span className={styles.chip}>
                  <User size={11} /> Owner: {ownerName}
                </span>
                <span className={styles.chip}>
                  <Clock size={11} /> Listed: {formattedDate}
                </span>
                <span className={styles.chip}>ID #{id}</span>
                {hasActiveTenant && (
                  <span className={`${styles.chip} ${styles.chipOccupied}`}>
                    <Home size={11} /> Occupied
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Rejection banner */}
          {isRejected && rejectionReason && (
            <div className={`${styles.banner} ${styles.bannerDanger}`}>
              <XCircle size={20} className={`${styles.bannerIcon} ${styles.bannerIconDanger}`} />
              <div>
                <div className={`${styles.bannerTitle} ${styles.bannerTitleDanger}`}>
                  Previously Rejected
                </div>
                <div className={styles.rejectionBlock}>
                  <strong>Reason on file:</strong> {rejectionReason}
                </div>
                <div className={styles.rejectionNote}>
                  To change the status, use the <strong>Rental Requests</strong> panel.
                </div>
              </div>
            </div>
          )}

          {/* Occupied banner */}
          {hasActiveTenant && activeTenant && (
            <div className={`${styles.banner} ${styles.bannerOccupied}`}>
              <Home size={20} className={`${styles.bannerIcon} ${styles.bannerIconOccupied}`} />
              <div style={{ flex: 1 }}>
                <div className={`${styles.bannerTitle} ${styles.bannerTitleOccupied}`}>
                  Property Has an Active Tenant
                </div>
                <div className={`${styles.bannerBody} ${styles.bannerBodyOccupied}`}>
                  <strong>{activeTenant.tenantName}</strong> ({activeTenant.tenantEmail}) is
                  leasing since <strong>{activeTenant.startDate}</strong> for{" "}
                  <strong>{activeTenant.leaseDurationMonths} month(s)</strong>. Move-out:{" "}
                  <strong>{calcMoveOut(activeTenant.startDate, activeTenant.leaseDurationMonths)}</strong>.
                </div>
                <div className={styles.occupiedNote}>
                  <AlertTriangle size={12} /> Active lease details are recorded in the Audit Log.
                </div>
              </div>
            </div>
          )}

          {/* Pending banner */}
          {isPending && (
            <div className={`${styles.banner} ${styles.bannerWarning}`}>
              <Clock size={20} className={`${styles.bannerIcon} ${styles.bannerIconWarning}`} />
              <div>
                <div className={`${styles.bannerTitle} ${styles.bannerTitleWarning}`}>
                  Pending Admin Review
                </div>
                <div className={`${styles.bannerBody} ${styles.bannerBodyWarning}`}>
                  This property awaits approval. To approve or reject it, use the{" "}
                  <strong>Rental Requests</strong> panel. You may still edit listing details here.
                </div>
              </div>
            </div>
          )}

          {/* Owner info */}
          <div className={styles.card}>
            <div className={`${styles.sectionLabel} ${styles.sectionLabelAdmin}`}>
              <User size={13} /> Property Owner
            </div>
            <div className={styles.ownerRow}>
              <div className={styles.ownerAvatar}><User size={20} /></div>
              <div>
                <div className={styles.ownerName}>{ownerName}</div>
                <div className={styles.ownerEmail}>User ID #{ownerId}</div>
              </div>
              <span className={styles.ownerBadge}>Owner</span>
            </div>
            <div className={styles.ownerStats}>
              <div className={styles.ownerStat}>
                <span className={styles.ownerStatLabel}>Property ID</span>
                <span className={styles.ownerStatValue}>#{id}</span>
              </div>
              <div className={styles.ownerStat}>
                <span className={styles.ownerStatLabel}>Listed</span>
                <span className={styles.ownerStatValue} style={{ fontSize: 12 }}>{formattedDate}</span>
              </div>
              <div className={styles.ownerStat}>
                <span className={styles.ownerStatLabel}>Status</span>
                <span className={styles.ownerStatValue} style={{ fontSize: 12 }}>
                  {originalStatus.replace(/_/g, " ")}
                </span>
              </div>
              <div className={styles.ownerStat}>
                <span className={styles.ownerStatLabel}>Tenant</span>
                <span
                  className={styles.ownerStatValue}
                  style={{
                    fontSize: 12,
                    color: hasActiveTenant ? "var(--admin)" : "var(--success)",
                  }}
                >
                  {hasActiveTenant ? "Occupied" : "Vacant"}
                </span>
              </div>
            </div>
          </div>

          {/* Basic info */}
          <div className={styles.card}>
            <div className={`${styles.sectionLabel} ${styles.sectionLabelTeal}`}>
              <Home size={13} /> Basic Information
            </div>
            <div className={styles.fieldsGrid}>
              <div className={`${styles.field} ${styles.fieldFull}`}>
                <label className={styles.fieldLabel}>
                  Title <span className={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  className={styles.fieldInput}
                  placeholder="e.g. Cozy Studio near IT Park"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className={`${styles.field} ${styles.fieldFull}`}>
                <label className={styles.fieldLabel}>Description</label>
                <textarea
                  className={styles.fieldTextarea}
                  placeholder="Describe the property…"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>
                  Monthly Price (₱) <span className={styles.required}>*</span>
                </label>
                <input
                  type="number"
                  className={styles.fieldInput}
                  placeholder="e.g. 6500"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  min={0}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>
                  Property Type <span className={styles.required}>*</span>
                </label>
                <select
                  className={styles.fieldSelect}
                  value={typeId}
                  onChange={(e) => setTypeId(e.target.value)}
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

          {/* Location */}
          <div className={styles.card}>
            <div className={`${styles.sectionLabel} ${styles.sectionLabelTeal}`}>
              <MapPin size={13} /> Location
            </div>
            <div className={styles.mapSearchRow}>
              <input
                type="text"
                className={styles.mapSearchInput}
                placeholder="Search an address in Cebu City…"
                value={location}
                onChange={(e) => { setLocation(e.target.value); setMapError(null); }}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleMapSearch())}
              />
              <button
                type="button"
                className={styles.mapSearchBtn}
                onClick={handleMapSearch}
                disabled={mapSearching || !location.trim()}
              >
                {mapSearching
                  ? <><Loader2 size={14} style={{ animation: "spin 0.65s linear infinite" }} /> Searching…</>
                  : <><MapPin size={14} /> Find</>
                }
              </button>
            </div>

            {mapError && (
              <div className={styles.mapError}>
                <AlertTriangle size={14} /> {mapError}
              </div>
            )}

            <div className={styles.mapFrame}>
              <MapContainer
                center={mapCoords ? [mapCoords.lat, mapCoords.lon] : [10.3157, 123.8854]}
                zoom={mapCoords ? 16 : 13}
                minZoom={11}
                maxBounds={[
                  [CEBU_BOUNDS.minLat, CEBU_BOUNDS.minLon],
                  [CEBU_BOUNDS.maxLat, CEBU_BOUNDS.maxLon],
                ]}
                maxBoundsViscosity={1.0}
                style={{ height: "100%", width: "100%", zIndex: 1 }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <ClickableMap
                  coords={mapCoords}
                  setCoords={setMapCoords}
                  onSelect={handleMapClick}
                />
              </MapContainer>
            </div>

            {mapCoords && (
              <div className={styles.mapCoords}>
                <MapPin size={13} />
                {mapCoords.lat.toFixed(5)}, {mapCoords.lon.toFixed(5)}
              </div>
            )}
          </div>

          {/* Photos */}
          <div className={styles.card}>
            <div className={`${styles.sectionLabel} ${styles.sectionLabelTeal}`}>
              <Camera size={13} /> Photos ({totalPhotos}/10)
            </div>

            <div className={styles.photoTip}>
              <ShieldAlert size={18} className={styles.photoTipIcon} />
              <div>
                <div className={styles.photoTipTitle}>Admin photo management</div>
                <div className={styles.photoTipBody}>
                  You can add or remove photos on behalf of the owner. Ensure all
                  changes comply with platform guidelines.
                </div>
              </div>
            </div>

            {/* Existing images */}
            {visibleExisting.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div className={styles.imagesLabel}>Current photos — click to preview</div>
                <div className={styles.imageGrid}>
                  {visibleExisting.map((img, idx) => (
                    <div key={img.id} className={styles.imageThumb}>
                      <img
                        src={img.imageUrl}
                        alt="Existing"
                        className={styles.imageFit}
                        onClick={() => openLb(existingSrcs, idx)}
                      />
                      <button
                        type="button"
                        className={styles.imageRemoveBtn}
                        onClick={(e) => { e.stopPropagation(); removeExisting(img.id); }}
                        aria-label="Remove image"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upload zone */}
            {totalPhotos < 10 && (
              <div
                className={`${styles.uploadZone} ${dragOver ? styles.uploadZoneActive : ""}`}
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
                  className={styles.uploadInput}
                  onChange={(e) => addFiles(e.target.files)}
                />
                <Camera size={32} className={styles.uploadZoneIcon} />
                <div className={styles.uploadZoneTitle}>
                  {newImageFiles.length > 0
                    ? `${newImageFiles.length} new photo${newImageFiles.length > 1 ? "s" : ""} selected`
                    : "Click or drag to add photos"}
                </div>
                <div className={styles.uploadZoneSub}>
                  JPG, PNG, WEBP · Max 5 MB each · Up to {10 - visibleExisting.length} more
                </div>
              </div>
            )}

            {/* New image previews */}
            {newImagePreviews.length > 0 && (
              <div className={styles.imageGrid} style={{ marginTop: 12 }}>
                {newImagePreviews.map((src, i) => (
                  <div key={i} className={styles.imageThumb}>
                    <img
                      src={src}
                      alt={`New ${i + 1}`}
                      className={styles.imageFit}
                      onClick={() => openLb(newImagePreviews, i)}
                    />
                    <div className={styles.imageNewBadge}>New</div>
                    <button
                      type="button"
                      className={styles.imageRemoveBtn}
                      onClick={(e) => { e.stopPropagation(); removeNew(i); }}
                      aria-label="Remove image"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit row */}
          <div className={styles.submitRow}>
            {submitMsg && (
              <span className={`${styles.submitMsg} ${submitMsgClass}`}>
                {submitMsg.type === "success" && <CheckCircle2 size={14} />}
                {submitMsg.type === "warning" && <AlertTriangle size={14} />}
                {submitMsg.type === "error"   && <XCircle size={14} />}
                {submitMsg.text}
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
              type="button"
              className={styles.submitBtn}
              disabled={!canSubmit}
              onClick={() => { setSubmitMsg(null); setShowConfirm(true); }}
            >
              {submitting
                ? <><span className={styles.spinner} /> Saving…</>
                : <><ShieldAlert size={15} /> Save Admin Changes</>
              }
            </button>
          </div>

        </div>{/* /main */}
      </div>{/* /content */}
    </div>
  );
};

export default AdminEditProperty;