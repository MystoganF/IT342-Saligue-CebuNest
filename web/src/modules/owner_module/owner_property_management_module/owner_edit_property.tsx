import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams, useOutletContext } from "react-router-dom";
import { ownerApi } from "../ownerApi";
import styles from "./owner_add_property.module.css";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// ─── Fix for default marker icons in React-Leaflet ─────────────────────────
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// ─── types ─────────────────────────────────────────────────────────────────
interface User { id: number; name: string; email: string; role: string; avatarUrl?: string | null; }
interface PropertyType { id: number; name: string; }
interface ExistingImage { id: number; imageUrl: string; }
interface MapCoords { lat: number; lon: number; }
interface RentalRequest { id: number; tenantId: number; tenantName: string; tenantEmail: string; startDate: string; leaseDurationMonths: number; status: string; createdAt: string; }
interface ActiveTenant { id: number; tenantId: number; tenantName: string; tenantEmail: string; startDate: string; leaseDurationMonths: number; status: string; }
interface RentalPayment { id: number; rentalRequestId: number; installmentNumber: number; amount: number; dueDate: string; paidAt: string | null; status: string; checkoutUrl: string | null; paymongoPaymentId: string | null; createdAt: string; }
interface LeaseExtension { id: number; requestedMonths: number; reason: string | null; status: "PENDING" | "APPROVED" | "REJECTED"; createdAt: string; }
interface PropertyReview { id: number; tenantId: number; tenantName: string; tenantAvatarUrl: string | null; rating: number; comment: string | null; createdAt: string; }

// ─── helpers ───────────────────────────────────────────────────────────────

// Geocode restricted to Cebu island bounding box
async function geocode(query: string): Promise<MapCoords | null> {
  try {
      const cebuQuery = query.toLowerCase().includes("cebu city")
    ? query
    : `${query}, Cebu City, Philippines`;
    const params = new URLSearchParams({
      q: cebuQuery,
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
  } catch { return null; }
}

const CEBU_CITY_BOUNDS = {
  minLat: 10.255, maxLat: 10.445,
  minLon: 123.808, maxLon: 123.924,
};

async function reverseGeocode(lat: number, lon: number): Promise<string | null> {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`);
    const data = await res.json();
    return data.display_name || null;
  } catch { return null; }
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function statusColor(status: string): string {
  switch (status) {
    case "APPROVED": return "#1a7a4a";
    case "REJECTED": return "#c0392b";
    case "CONFIRMED": return "#1f5d71";
    case "TERMINATED": return "#7d3c98";
    case "COMPLETED": return "#2e86c1";
    default: return "#b78e42";
  }
}

function paymentStatusColor(status: string): { color: string; bg: string; border: string } {
  switch (status) {
    case "PAID": return { color: "#1a7a4a", bg: "#e8f7ef", border: "rgba(26,122,74,0.2)" };
    case "OVERDUE": return { color: "#c0392b", bg: "#fdf0ee", border: "rgba(192,57,43,0.2)" };
    case "PENDING": return { color: "#b78e42", bg: "#fffbea", border: "rgba(183,142,66,0.2)" };
    default: return { color: "#6e7071", bg: "#f0f4f5", border: "#e5eced" };
  }
}

function paymentStatusIcon(status: string): string {
  switch (status) {
    case "PAID": return "✓";
    case "OVERDUE": return "⚠";
    case "PENDING": return "○";
    default: return "–";
  }
}

function calcMoveOut(startDate: string, months: number): string {
  const d = new Date(startDate + "T00:00:00");
  d.setMonth(d.getMonth() + months);
  return d.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
}

function groupBy<T>(arr: T[], keyFn: (item: T) => string): Record<string, T[]> {
  return arr.reduce<Record<string, T[]>>((acc, item) => {
    const key = keyFn(item);
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});
}

function getYear(dateStr: string): string {
  if (!dateStr) return "Unknown";
  return new Date(dateStr).getFullYear().toString();
}

function formatDate(d: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
}

// ─── Clickable Map Component ───────────────────────────────────────────────
function ClickableMap({
  coords,
  setCoords,
  onLocationSelect
}: {
  coords: MapCoords | null,
  setCoords: (c: MapCoords) => void,
  onLocationSelect: (lat: number, lon: number) => void
}) {
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      setCoords({ lat, lon: lng });
      onLocationSelect(lat, lng);
    },
  });

  return coords ? <Marker position={[coords.lat, coords.lon]} /> : null;
}

// ─── Main component ────────────────────────────────────────────────────────
const EditProperty: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { user } = useOutletContext<{ user: User }>();

  // ── Auth & metadata ────────────────────────────────────────────────────
  const [propertyTypes, setPropertyTypes] = useState<PropertyType[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  // ── Form fields ────────────────────────────────────────────────────────
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [location, setLocation] = useState("");
  const [typeId, setTypeId] = useState<string>("");
  const [beds, setBeds] = useState("");
  const [baths, setBaths] = useState("");
  const [sqm, setSqm] = useState("");
  const [status, setStatus] = useState<"AVAILABLE" | "UNAVAILABLE">("AVAILABLE");
  const [currentStatus, setCurrentStatus] = useState<string>("");

  const [isAdminDisabled, setIsAdminDisabled] = useState(false);
  const [adminNote, setAdminNote] = useState<string | null>(null);

  // ── Map ────────────────────────────────────────────────────────────────
  const [mapCoords, setMapCoords] = useState<MapCoords | null>(null);
  const [mapSearching, setMapSearching] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  // ── Images ─────────────────────────────────────────────────────────────
  const [existingImages, setExistingImages] = useState<ExistingImage[]>([]);
  const [removedImageIds, setRemovedImageIds] = useState<number[]>([]);
  const [newImageFiles, setNewImageFiles] = useState<File[]>([]);
  const [newImagePreviews, setNewImagePreviews] = useState<string[]>([]);
  const [dragOver, setDragOver] = useState(false);

  // ── Lightbox ───────────────────────────────────────────────────────────
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number>(0);
  const [lightboxList, setLightboxList] = useState<string[]>([]);

  // ── Rental requests ────────────────────────────────────────────────────
  const [requests, setRequests] = useState<RentalRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [requestsError, setRequestsError] = useState<string | null>(null);
  const [actionTarget, setActionTarget] = useState<RentalRequest | null>(null);
  const [actionType, setActionType] = useState<"APPROVED" | "REJECTED" | null>(null);
  const [actionSubmitting, setActionSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [openRequestYears, setOpenRequestYears] = useState<Set<string>>(new Set());
  const [showPastRequests, setShowPastRequests] = useState(false);

  // ── Active tenant ──────────────────────────────────────────────────────
  const [activeTenant, setActiveTenant] = useState<ActiveTenant | null>(null);
  const [activeTenantLoading, setActiveTenantLoading] = useState(false);

  // ── Payment history ────────────────────────────────────────────────────
  const [payments, setPayments] = useState<RentalPayment[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentsError, setPaymentsError] = useState<string | null>(null);
  const [openPaymentYears, setOpenPaymentYears] = useState<Set<string>>(new Set());

  // ── Lease management modal ─────────────────────────────────────────────
  const [leaseModal, setLeaseModal] = useState<"extend" | "reduce" | "terminate" | null>(null);
  const [leaseMonths, setLeaseMonths] = useState<number>(1);
  const [leaseSubmitting, setLeaseSubmitting] = useState(false);
  const [leaseError, setLeaseError] = useState<string | null>(null);
  const [leaseSuccess, setLeaseSuccess] = useState<string | null>(null);

  // ── Lease extension requests (from tenant) ─────────────────────────────
  const [leaseExtensions, setLeaseExtensions] = useState<LeaseExtension[]>([]);
  const [leaseExtLoading, setLeaseExtLoading] = useState(false);
  const [extActionId, setExtActionId] = useState<number | null>(null);
  const [extActionSubmitting, setExtActionSubmitting] = useState(false);
  const [extActionError, setExtActionError] = useState<string | null>(null);

  // ── Property reviews ───────────────────────────────────────────────────
  const [reviews, setReviews] = useState<PropertyReview[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);

  // ── Reviews Filtering Modal ──
  const [showReviewsModal, setShowReviewsModal] = useState(false);
  const [modalRatingFilter, setModalRatingFilter] = useState<number>(0);

  // ── Submit ─────────────────────────────────────────────────────────────
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState<{ type: "success" | "error" | "warning"; text: string; } | null>(null);

  // ── Property types ─────────────────────────────────────────────────────
  useEffect(() => {
    ownerApi.getPropertyTypes()
      .then((data) => { if (data.success) setPropertyTypes(data.data.types ?? []); })
      .catch(() => { });
  }, []);

  // ── Load Property Data ──────────────────────────────────────────────────
  const fetchAllPropertyData = useCallback(async () => {
    if (!id) return;
    setPageLoading(true);

    try {
      const propData = await ownerApi.getPropertyById(id);
      if (!propData.success) throw new Error("Property not found.");
      const p = propData.data.property;

      setTitle(p.title ?? "");
      setDescription(p.description ?? "");
      setPrice(String(p.price ?? ""));
      setLocation(p.location ?? "");
      setTypeId(String(p.typeId ?? ""));
      setBeds(p.beds != null ? String(p.beds) : "");
      setBaths(p.baths != null ? String(p.baths) : "");
      setSqm(p.sqm != null ? String(p.sqm) : "");
      setCurrentStatus(p.status ?? "");
      setRejectionReason(p.rejectionReason ?? null);
      setIsAdminDisabled(p.adminDisabled ?? p.isAdminDisabled ?? false);
      setAdminNote(p.adminNote ?? null);

      if (p.status === "AVAILABLE" || p.status === "UNAVAILABLE") setStatus(p.status);
      setExistingImages((p.images ?? []).map((img: any, idx: number) => ({ id: img.id ?? idx, imageUrl: img.imageUrl })));

      geocode(p.location).then((coords) => { if (coords) setMapCoords(coords); });

      setRequestsLoading(true);
      ownerApi.getPropertyRentalRequests(id)
        .then((data) => {
          if (data.success) {
            const reqs = data.data.requests ?? [];
            setRequests(reqs);
            if (reqs.length > 0) setOpenRequestYears(new Set([getYear(reqs[0].createdAt)]));
          } else setRequestsError("Failed to load requests.");
        })
        .catch(() => setRequestsError("Unable to load rental requests."))
        .finally(() => setRequestsLoading(false));

      setActiveTenantLoading(true);
      const activeTenantData = await ownerApi.getActiveTenant(id).catch(() => ({ success: false }));

      if (activeTenantData.success && activeTenantData.data?.activeTenant?.tenantId) {
        const t = activeTenantData.data.activeTenant;
        const tenant = {
          id: t.id, tenantId: t.tenantId, tenantName: t.tenantName,
          tenantEmail: t.tenantEmail, startDate: t.startDate,
          leaseDurationMonths: t.leaseDurationMonths, status: t.status,
        };
        setActiveTenant(tenant);

        setPaymentsLoading(true);
        ownerApi.getPaymentsForRequest(tenant.id)
          .then((data) => {
            if (data.success) {
              const pmts = data.data.payments ?? [];
              setPayments(pmts);
              const firstUnpaid = pmts.find((p: any) => p.status === "PENDING" || p.status === "OVERDUE");
              const autoYear = firstUnpaid ? getYear(firstUnpaid.dueDate) : pmts.length > 0 ? getYear(pmts[pmts.length - 1].dueDate) : null;
              if (autoYear) setOpenPaymentYears(new Set([autoYear]));
            } else setPaymentsError("Failed to load payment history.");
          })
          .catch(() => setPaymentsError("Unable to load payment history."))
          .finally(() => setPaymentsLoading(false));

        setLeaseExtLoading(true);
        ownerApi.getLeaseExtensions(tenant.id)
          .then((data) => { if (data.success) setLeaseExtensions(data.data.extensionRequests ?? []); })
          .catch(() => {})
          .finally(() => setLeaseExtLoading(false));
      } else {
        setActiveTenant(null);
        setActiveTenantLoading(false);
      }

      setReviewsLoading(true);
      ownerApi.getPropertyReviews(id)
        .then((data) => { if (data.success) setReviews(data.data.reviews ?? []); })
        .catch(() => {})
        .finally(() => setReviewsLoading(false));

    } catch (err: any) {
      setPageError(err.message);
    } finally {
      setPageLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchAllPropertyData(); }, [fetchAllPropertyData]);

  // ── Keyboard lightbox nav ──────────────────────────────────────────────
  useEffect(() => {
    if (!lightboxSrc) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lightboxSrc, lightboxIndex, lightboxList]);

  // ── Lightbox helpers ───────────────────────────────────────────────────
  const openLightbox = (srcs: string[], index: number) => { setLightboxList(srcs); setLightboxIndex(index); setLightboxSrc(srcs[index]); };
  const closeLightbox = () => setLightboxSrc(null);
  const goNext = () => { const next = (lightboxIndex + 1) % lightboxList.length; setLightboxIndex(next); setLightboxSrc(lightboxList[next]); };
  const goPrev = () => { const prev = (lightboxIndex - 1 + lightboxList.length) % lightboxList.length; setLightboxIndex(prev); setLightboxSrc(lightboxList[prev]); };

  const BLOCKED_CITIES = [
  "mandaue", "lapu-lapu", "lapulapu", "lapu lapu",
  "minglanilla", "talisay", "consolacion", "liloan",
  "compostela", "cordova", "naga", "toledo", "danao",
  "carcar", "bogo", "mactan",
];

function isBlockedLocation(input: string): boolean {
  const lower = input.toLowerCase();
  return BLOCKED_CITIES.some((city) => lower.includes(city));
}

const handleMapSearch = async () => {
  if (!location.trim()) return;

  // Strict city blocklist check
  if (isBlockedLocation(location.trim())) {
    setMapError("Only Cebu City addresses are allowed. Mandaue, Lapu-Lapu, Minglanilla, and other neighboring cities are not permitted.");
    return;
  }

  setMapSearching(true);
  setMapError(null);
  const coords = await geocode(location.trim());
  if (coords) {
    const inBounds =
      coords.lat >= CEBU_CITY_BOUNDS.minLat &&
      coords.lat <= CEBU_CITY_BOUNDS.maxLat &&
      coords.lon >= CEBU_CITY_BOUNDS.minLon &&
      coords.lon <= CEBU_CITY_BOUNDS.maxLon;

    if (!inBounds) {
      setMapError("This location is outside Cebu City. Only addresses within Cebu City are allowed.");
      return;
    }
    setMapCoords(coords);
  } else {
    setMapError("Location not found in Cebu City. Try a more specific address.");
  }
  setMapSearching(false);
};

  const handleMapClick = async (lat: number, lon: number) => {
    if (
      lat < CEBU_CITY_BOUNDS.minLat || lat > CEBU_CITY_BOUNDS.maxLat ||
      lon < CEBU_CITY_BOUNDS.minLon || lon > CEBU_CITY_BOUNDS.maxLon
    ) {
      setMapError("Please select a location within Cebu City.");
      return;
    }

    
    setMapSearching(true);
    setMapError(null);
    try {
      const address = await reverseGeocode(lat, lon);
      if (address) {
        setLocation(address);
      }
    } catch {
      setMapError("Could not retrieve address for this location.");
    } finally {
      setMapSearching(false);
    }
  };

  // ── Image helpers ──────────────────────────────────────────────────────
  const addFiles = (files: FileList | null) => {
    if (!files) return;
    const valid = Array.from(files).filter((f) => f.type.startsWith("image/") && f.size <= 5 * 1024 * 1024);
    const totalAllowed = 10 - (existingImages.length - removedImageIds.length);
    const combined = [...newImageFiles, ...valid].slice(0, totalAllowed);
    setNewImageFiles(combined);
    setNewImagePreviews(combined.map((f) => URL.createObjectURL(f)));
  };

  const removeExistingImage = (imgId: number) => setRemovedImageIds((prev) => [...prev, imgId]);
  const removeNewImage = (index: number) => {
    const updated = newImageFiles.filter((_, i) => i !== index);
    setNewImageFiles(updated);
    setNewImagePreviews(updated.map((f) => URL.createObjectURL(f)));
  };

  // ── Rental request actions ─────────────────────────────────────────────
  const openAction = (req: RentalRequest, type: "APPROVED" | "REJECTED") => { setActionTarget(req); setActionType(type); setActionError(null); };
  const closeAction = () => { if (actionSubmitting) return; setActionTarget(null); setActionType(null); setActionError(null); };
  const handleRequestAction = async () => {
    if (!actionTarget || !actionType) return;
    setActionSubmitting(true); setActionError(null);
    try {
      const data = await ownerApi.updateRentalRequestStatus(actionTarget.id, actionType);
      if (!data.success) { setActionError(data?.error?.message ?? "Action failed."); return; }

      if (actionType === "APPROVED") {
        setRequests((prev) => prev.map((r) =>
          r.id === actionTarget.id ? { ...r, status: "APPROVED" } : (r.status === "PENDING" ? { ...r, status: "REJECTED" } : r)
        ));
      } else {
        setRequests((prev) => prev.map((r) => r.id === actionTarget.id ? { ...r, status: actionType } : r));
      }
      closeAction();
    } catch { setActionError("Network error. Please try again."); }
    finally { setActionSubmitting(false); }
  };

  // ── Year accordion toggles ─────────────────────────────────────────────
  const toggleRequestYear = (year: string) => { setOpenRequestYears((prev) => { const next = new Set(prev); if (next.has(year)) next.delete(year); else next.add(year); return next; }); };
  const togglePaymentYear = (year: string) => { setOpenPaymentYears((prev) => { const next = new Set(prev); if (next.has(year)) next.delete(year); else next.add(year); return next; }); };

  // ── Lease management ───────────────────────────────────────────────────
  const openLeaseModal = (type: "extend" | "reduce" | "terminate") => { setLeaseModal(type); setLeaseMonths(1); setLeaseError(null); setLeaseSuccess(null); };
  const closeLeaseModal = () => { if (leaseSubmitting) return; setLeaseModal(null); setLeaseError(null); setLeaseSuccess(null); };
  const handleLeaseAction = async () => {
    if (!activeTenant) return;
    setLeaseSubmitting(true); setLeaseError(null);
    try {
      if (leaseModal === "terminate") {
        const data = await ownerApi.terminateLease(activeTenant.id);
        if (!data.success) { setLeaseError(data?.error?.message ?? "Failed to terminate lease."); return; }
        setActiveTenant(null); setPayments([]); setLeaseExtensions([]); setStatus("AVAILABLE"); setCurrentStatus("AVAILABLE"); setLeaseSuccess("Lease terminated. Property is now available.");
        setTimeout(closeLeaseModal, 1800);
      } else {
        const adjust = leaseModal === "extend" ? leaseMonths : -leaseMonths;
        const data = await ownerApi.adjustLease(activeTenant.id, adjust);
        if (!data.success) { setLeaseError(data?.error?.message ?? "Failed to update lease."); return; }
        setActiveTenant((prev) => prev ? { ...prev, leaseDurationMonths: data.data.request.leaseDurationMonths } : prev);
        setLeaseSuccess(leaseModal === "extend" ? `Lease extended by ${leaseMonths} month(s).` : `Lease reduced by ${leaseMonths} month(s).`);
        setTimeout(closeLeaseModal, 1800);
      }
    } catch { setLeaseError("Network error. Please try again."); }
    finally { setLeaseSubmitting(false); }
  };

  // ── Respond to lease extension request ────────────────────────────────
  const handleExtensionRespond = async (extensionId: number, decision: "APPROVED" | "REJECTED") => {
    setExtActionId(extensionId); setExtActionSubmitting(true); setExtActionError(null);
    try {
      const data = await ownerApi.respondToLeaseExtension(extensionId, decision);
      if (!data.success) { setExtActionError(data?.error?.message ?? "Action failed."); return; }
      const approved = leaseExtensions.find((e) => e.id === extensionId);
      setLeaseExtensions((prev) => prev.map((e) => e.id === extensionId ? { ...e, status: decision } : e));
      if (decision === "APPROVED" && approved) { setActiveTenant((prev) => prev ? { ...prev, leaseDurationMonths: prev.leaseDurationMonths + approved.requestedMonths } : prev); }
    } catch { setExtActionError("Network error. Please try again."); }
    finally { setExtActionSubmitting(false); setExtActionId(null); }
  };

  // ── Form submit ────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setSubmitting(true); setSubmitMsg(null);
    try {
      const updateData = await ownerApi.updateProperty(id, {
        title: title.trim(),
        description: description.trim(),
        price: parseFloat(price),
        location: location.trim(),
        typeId: parseInt(typeId),
        beds: beds ? parseInt(beds) : null,
        baths: baths ? parseInt(baths) : null,
        sqm: sqm ? parseInt(sqm) : null,
        status: (currentStatus === "AVAILABLE" || currentStatus === "UNAVAILABLE") ? status : undefined,
        removedImageIds: removedImageIds.length > 0 ? removedImageIds : undefined,
      });

      if (!updateData.success) { setSubmitMsg({ type: "error", text: updateData?.error?.message ?? "Failed to update property." }); return; }

      if (newImageFiles.length > 0) {
        const formData = new FormData();
        newImageFiles.forEach((f) => formData.append("files", f));
        const imgData = await ownerApi.uploadPropertyImages(id, formData);
        if (!imgData.success) {
          setSubmitMsg({ type: "warning", text: "Property updated! Some images failed to upload." });
          setTimeout(() => navigate("/owner/properties"), 2000);
          return;
        }
      }
      setSubmitMsg({ type: "success", text: "Property updated successfully! Redirecting…" });
      setTimeout(() => navigate("/owner/properties"), 1500);
    } catch { setSubmitMsg({ type: "error", text: "Network error. Please try again." }); }
    finally { setSubmitting(false); }
  };

  // ── Derived ────────────────────────────────────────────────────────────
  if (!user) return null;

  const isRejected = currentStatus === "REJECTED";
  const submitIcon = submitMsg?.type === "success" ? "✓" : submitMsg?.type === "warning" ? "⚠" : "✕";
  const submitMsgClass = submitMsg?.type === "success" ? styles.submitMsgSuccess : submitMsg?.type === "warning" ? styles.submitMsgWarning : styles.submitMsgError;
  const canToggleStatus = currentStatus === "AVAILABLE" || currentStatus === "UNAVAILABLE";
  const visibleExisting = existingImages.filter((img) => !removedImageIds.includes(img.id));
  const totalPhotos = visibleExisting.length + newImageFiles.length;
  const existingSrcs = visibleExisting.map((img) => img.imageUrl);

  const pendingRequests = requests.filter((r) => r.status === "PENDING");
  const pastRequests = requests.filter((r) => r.status !== "PENDING");
  const displayedRequests = showPastRequests ? requests : pendingRequests;
  const pendingCount = pendingRequests.length;
  const pendingExtensions = leaseExtensions.filter((e) => e.status === "PENDING");
  const avgRating = reviews.length > 0 ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : null;
  const requestsByYear = groupBy(displayedRequests, (r) => getYear(r.createdAt));
  const requestYears = Object.keys(requestsByYear).sort((a, b) => Number(b) - Number(a));
  const paymentsByYear = groupBy(payments, (p) => getYear(p.dueDate));
  const paymentYears = Object.keys(paymentsByYear).sort((a, b) => Number(b) - Number(a));
  const paidCount = payments.filter((p) => p.status === "PAID").length;
  const overdueCount = payments.filter((p) => p.status === "OVERDUE").length;
  const totalPaid = payments.filter((p) => p.status === "PAID").reduce((s, p) => s + p.amount, 0);

  const filteredReviews = modalRatingFilter === 0 ? reviews : reviews.filter(r => r.rating === modalRatingFilter);

  if (pageLoading) return (
    <div className={styles.page}>
      <div style={{ padding: "60px 40px", textAlign: "center", color: "#6e7071" }}>Loading property…</div>
    </div>
  );
  if (pageError) return (
    <div className={styles.page}>
      <div style={{ padding: "60px 40px", textAlign: "center", color: "#c0392b" }}>{pageError}</div>
    </div>
  );

  return (
    <div className={styles.page}>

      {/* ── Lightbox ── */}
      {lightboxSrc && (
        <div className={styles.lightboxOverlay} onClick={closeLightbox}>
          <button className={styles.lightboxClose} onClick={closeLightbox} type="button">✕</button>
          {lightboxList.length > 1 && (
            <div className={styles.lightboxCounter}>{lightboxIndex + 1} / {lightboxList.length}</div>
          )}
          {lightboxList.length > 1 && (
            <button className={`${styles.lightboxNav} ${styles.lightboxNavPrev}`} onClick={(e) => { e.stopPropagation(); goPrev(); }} type="button">‹</button>
          )}
          <img src={lightboxSrc} alt="Full preview" className={styles.lightboxImg} onClick={(e) => e.stopPropagation()} />
          {lightboxList.length > 1 && (
            <button className={`${styles.lightboxNav} ${styles.lightboxNavNext}`} onClick={(e) => { e.stopPropagation(); goNext(); }} type="button">›</button>
          )}
          {lightboxList.length > 1 && (
            <div className={styles.lightboxStrip} onClick={(e) => e.stopPropagation()}>
              {lightboxList.map((src, i) => (
                <img key={i} src={src} alt={`Thumb ${i + 1}`} className={`${styles.lightboxThumb} ${i === lightboxIndex ? styles.lightboxThumbActive : ""}`} onClick={() => { setLightboxIndex(i); setLightboxSrc(src); }} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Request Action Modal ── */}
      {actionTarget && actionType && (
        <div className={styles.modalOverlay} onClick={closeAction}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={`${styles.reqModalHeader} ${actionType === "APPROVED" ? styles.reqModalHeaderApprove : styles.reqModalHeaderReject}`}>
              <span>{actionType === "APPROVED" ? "✅" : "❌"}</span>
              <h3 className={styles.reqModalTitle}>{actionType === "APPROVED" ? "Approve Request" : "Reject Request"}</h3>
            </div>
            <div className={styles.reqModalBody}>
              <p className={styles.reqModalDesc}>
                {actionType === "APPROVED"
                  ? <><strong>{actionTarget.tenantName}</strong>'s request will be approved. They'll be notified by email. Other pending requests will automatically be rejected.</>
                  : <><strong>{actionTarget.tenantName}</strong>'s request will be rejected. They'll be notified by email.</>}
              </p>
              <div className={styles.reqModalMeta}>
                <span>👤 {actionTarget.tenantName}</span>
                <span>✉️ {actionTarget.tenantEmail}</span>
                <span>📅 {actionTarget.startDate}</span>
                <span>🗓 {actionTarget.leaseDurationMonths} month{actionTarget.leaseDurationMonths !== 1 ? "s" : ""}</span>
              </div>
              {actionError && <p className={styles.reqModalError}>⚠ {actionError}</p>}
            </div>
            <div className={styles.reqModalFooter}>
              <button className={styles.modalCancelBtn} onClick={closeAction} disabled={actionSubmitting} type="button">Cancel</button>
              <button className={actionType === "APPROVED" ? styles.modalApproveBtn : styles.modalRejectBtn} onClick={handleRequestAction} disabled={actionSubmitting} type="button">
                {actionSubmitting ? <><span className={styles.spinner} /> Processing…</> : actionType === "APPROVED" ? "✓ Approve" : "✕ Reject"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Reviews Filtering Modal ── */}
      {showReviewsModal && (
        <div className={styles.modalOverlay} onClick={() => setShowReviewsModal(false)}>
          <div className={styles.modal} style={{ maxWidth: '600px', width: '100%', padding: '24px', display: 'flex', flexDirection: 'column', maxHeight: '85vh' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 className={styles.modalTitle}>Tenant Reviews</h3>
              <button onClick={() => setShowReviewsModal(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#94a3b8' }}>✕</button>
            </div>
            <select
              className={styles.fieldSelect}
              value={modalRatingFilter}
              onChange={(e) => setModalRatingFilter(Number(e.target.value))}
              style={{ marginBottom: '16px' }}
            >
              <option value={0}>All Ratings</option>
              <option value={5}>5 Stars</option>
              <option value={4}>4 Stars</option>
              <option value={3}>3 Stars</option>
              <option value={2}>2 Stars</option>
              <option value={1}>1 Star</option>
            </select>
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '8px' }}>
              {filteredReviews.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', color: '#6e7071', fontSize: '14px' }}>No reviews match this filter.</div>
              ) : (
                filteredReviews.map(rev => (
                  <div key={rev.id} className={styles.reviewItem}>
                    <div className={styles.reviewItemHeader}>
                      <div className={styles.reviewItemAvatar}>{rev.tenantAvatarUrl ? <img src={rev.tenantAvatarUrl} alt={rev.tenantName} /> : <span>{rev.tenantName.charAt(0).toUpperCase()}</span>}</div>
                      <div className={styles.reviewItemMeta}><span className={styles.reviewItemName}>{rev.tenantName}</span><span className={styles.reviewItemDate}>{formatDate(rev.createdAt)}</span></div>
                      <div className={styles.reviewItemStars}>{[1, 2, 3, 4, 5].map((s) => (<span key={s} style={{ color: s <= rev.rating ? "#f59e0b" : "#e2e8f0", fontSize: "15px" }}>★</span>))}</div>
                    </div>
                    {rev.comment && (<p className={styles.reviewItemComment}>{rev.comment}</p>)}
                  </div>
                ))
              )}
            </div>
            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
              <button className={styles.modalCancelBtn} onClick={() => setShowReviewsModal(false)} style={{ padding: '10px 20px' }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Lease Management Modal ── */}
      {leaseModal && activeTenant && (
        <div className={styles.modalOverlay} onClick={closeLeaseModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={`${styles.reqModalHeader} ${leaseModal === "terminate" ? styles.reqModalHeaderReject : styles.reqModalHeaderApprove}`}>
              <span>{leaseModal === "extend" ? "➕" : leaseModal === "reduce" ? "➖" : "🚫"}</span>
              <h3 className={styles.reqModalTitle}>{leaseModal === "extend" ? "Extend Lease" : leaseModal === "reduce" ? "Reduce Lease" : "End Lease"}</h3>
            </div>
            <div className={styles.reqModalBody}>
              {leaseModal !== "terminate" ? (
                <>
                  <p className={styles.reqModalDesc}>
                    Current lease: <strong>{activeTenant.leaseDurationMonths} month(s)</strong> for <strong>{activeTenant.tenantName}</strong>.{" "}
                    {leaseModal === "extend" ? "How many months would you like to add?" : "How many months would you like to remove?"}
                  </p>
                  <div style={{ display: "flex", alignItems: "center", gap: "14px", margin: "16px 0", padding: "14px 16px", background: "#f8fbfb", borderRadius: "12px", border: "1px solid #e5eced" }}>
                    <button type="button" style={{ width: 34, height: 34, borderRadius: "50%", border: "1.5px solid #e5eced", background: "#fff", fontSize: 20, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#1f5d71", fontWeight: 700 }} onClick={() => setLeaseMonths((m) => Math.max(1, m - 1))}>−</button>
                    <span style={{ fontSize: 24, fontWeight: 800, color: "#1f5d71", minWidth: 40, textAlign: "center" }}>{leaseMonths}</span>
                    <button type="button" style={{ width: 34, height: 34, borderRadius: "50%", border: "1.5px solid #e5eced", background: "#fff", fontSize: 20, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#1f5d71", fontWeight: 700 }} onClick={() => setLeaseMonths((m) => m + 1)}>+</button>
                    <span style={{ fontSize: 13, color: "#6e7071" }}>month(s)</span>
                  </div>
                  <div className={styles.reqModalMeta}>
                    <span>New total: <strong>{leaseModal === "extend" ? activeTenant.leaseDurationMonths + leaseMonths : Math.max(1, activeTenant.leaseDurationMonths - leaseMonths)} month(s)</strong></span>
                    <span>👤 {activeTenant.tenantName}</span>
                  </div>
                </>
              ) : (
                <>
                  <p className={styles.reqModalDesc}>This will <strong>immediately terminate</strong> the lease for <strong>{activeTenant.tenantName}</strong> and mark this property as <strong>Available</strong>. The tenant will be notified by email. This action <strong>cannot be undone</strong>.</p>
                  <div className={styles.reqModalMeta}>
                    <span>👤 {activeTenant.tenantName}</span>
                    <span>✉️ {activeTenant.tenantEmail}</span>
                    <span>📅 {activeTenant.startDate}</span>
                    <span>🗓 {activeTenant.leaseDurationMonths} month(s)</span>
                  </div>
                </>
              )}
              {leaseSuccess && <p style={{ fontSize: 13, fontWeight: 600, color: "#2d8c6a", marginTop: 12 }}>✓ {leaseSuccess}</p>}
              {leaseError && <p className={styles.reqModalError}>⚠ {leaseError}</p>}
            </div>
            <div className={styles.reqModalFooter}>
              <button className={styles.modalCancelBtn} onClick={closeLeaseModal} disabled={leaseSubmitting} type="button">Cancel</button>
              <button className={leaseModal === "terminate" ? styles.modalRejectBtn : styles.modalApproveBtn} onClick={handleLeaseAction} disabled={leaseSubmitting || !!leaseSuccess} type="button">
                {leaseSubmitting ? <><span className={styles.spinner} /> Processing…</> : leaseModal === "extend" ? `➕ Add ${leaseMonths} Month(s)` : leaseModal === "reduce" ? `➖ Remove ${leaseMonths} Month(s)` : "🚫 End Lease Now"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Page Header ── */}
      <div className={styles.pageBar}>
        <div className={styles.pageBarDeco} />
        <div className={styles.pageBarAccent} />
        <div className={styles.pageBarInner}>
          <button className={styles.backBtn} onClick={() => navigate(-1)} type="button">← Back</button>
          <h1 className={styles.pageBarTitle}>Edit Property</h1>
          <p className={styles.pageBarSub}>Update the details for this listing.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ pointerEvents: isRejected ? "none" : undefined, opacity: isRejected ? 0.6 : 1 }}>
        <main className={styles.main}>

          {isRejected && (
            <div style={{ display: "flex", alignItems: "flex-start", gap: "14px", padding: "18px 22px", background: "rgba(192,57,43,0.06)", border: "1.5px solid rgba(192,57,43,0.22)", borderRadius: "14px", marginBottom: "20px" }}>
              <span style={{ fontSize: "22px", flexShrink: 0 }}>❌</span>
              <div>
                <div style={{ fontWeight: 800, fontSize: "15px", color: "#c0392b", marginBottom: "4px" }}>This property was rejected by an admin</div>
                {rejectionReason && (
                  <div style={{ fontSize: "13px", color: "#7b2d22", background: "rgba(192,57,43,0.07)", borderLeft: "3px solid #c0392b", borderRadius: "0 6px 6px 0", padding: "8px 12px", marginTop: "6px", lineHeight: 1.5 }}>
                    <strong>Reason:</strong> {rejectionReason}
                  </div>
                )}
                <div style={{ fontSize: "12px", color: "#6e7071", marginTop: "8px" }}>This listing is read-only.</div>
              </div>
            </div>
          )}

          {/* ── Basic Info ── */}
          <div className={styles.card}>
            <div className={styles.cardTitle}>Basic Information</div>
            <div className={styles.fieldsGrid}>
              <div className={`${styles.field} ${styles.fieldFull}`}>
                <label className={styles.fieldLabel}>Title <span className={styles.fieldRequired}>*</span></label>
                <input type="text" className={styles.fieldInput} placeholder="e.g. Cozy Studio near IT Park" value={title} onChange={(e) => setTitle(e.target.value)} required />
              </div>
              <div className={`${styles.field} ${styles.fieldFull}`}>
                <label className={styles.fieldLabel}>Description</label>
                <textarea className={styles.fieldTextarea} placeholder="Describe your property…" value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
              </div>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Monthly Price (₱) <span className={styles.fieldRequired}>*</span></label>
                <input type="number" className={styles.fieldInput} placeholder="e.g. 6500" value={price} onChange={(e) => setPrice(e.target.value)} min={0} required />
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
                <input type="number" className={styles.fieldInput} placeholder="e.g. 1" value={beds} onChange={(e) => setBeds(e.target.value)} min={0} />
              </div>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Bathrooms</label>
                <input type="number" className={styles.fieldInput} placeholder="e.g. 1" value={baths} onChange={(e) => setBaths(e.target.value)} min={0} />
              </div>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Floor Area (sqm)</label>
                <input type="number" className={styles.fieldInput} placeholder="e.g. 28" value={sqm} onChange={(e) => setSqm(e.target.value)} min={0} />
              </div>
            </div>
          </div>

          {/* ── Listing Visibility ── */}
          <div className={styles.card}>
            <div className={styles.cardTitle}>Listing Visibility</div>
            {activeTenant ? (
              <div className={styles.visibilityLocked}>
                <span className={styles.visibilityLockedIcon}>🔒</span>
                <div>
                  <div className={styles.visibilityLockedLabel}>Property is <strong>Occupied</strong></div>
                  <div className={styles.visibilityLockedSub}>Cannot change visibility while a tenant is active.</div>
                </div>
              </div>
            ) : canToggleStatus ? (
              <div className={styles.visibilityWrap}>
                <div className={styles.visibilityInfo}>
                  <div className={styles.visibilityLabel}>
                    {status === "AVAILABLE" ? "🟢 Visible on listings" : "🔴 Hidden from listings"}
                  </div>
                  {status === "UNAVAILABLE" && (
                    <div style={{ marginTop: "12px", padding: "12px 16px", borderRadius: "10px", fontSize: "13px", background: isAdminDisabled ? "rgba(192,57,43,0.08)" : "#f9f9f9", borderLeft: isAdminDisabled ? "4px solid #c0392b" : "4px solid #6e7071", color: isAdminDisabled ? "#c0392b" : "#444" }}>
                      <div style={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '10px', marginBottom: '4px', letterSpacing: '0.5px' }}>Deactivation Status</div>
                      {isAdminDisabled ? (
                        <div>
                          <strong style={{ fontSize: '14px' }}>ADMIN DEACTIVATED</strong>
                          <p style={{ margin: '4px 0 0', lineHeight: '1.5' }}><strong>Reason:</strong> {adminNote || "Administrative restriction applied by platform management."}</p>
                          <p style={{ margin: '8px 0 0', fontSize: '11px', fontStyle: 'italic', opacity: 0.8 }}>Contact support if you believe this is an error.</p>
                        </div>
                      ) : (
                        <div><strong>OFFLINE:</strong> Manual deactivation by Owner.</div>
                      )}
                    </div>
                  )}
                  <div className={styles.visibilitySub} style={{ marginTop: status === "UNAVAILABLE" ? "10px" : "4px" }}>
                    {status === "AVAILABLE" ? "Tenants can find this property in search results." : "This property is currently hidden from public view."}
                  </div>
                </div>
                <button
                  type="button"
                  className={`${styles.toggleBtn} ${status === "AVAILABLE" ? styles.toggleBtnOn : styles.toggleBtnOff}`}
                  onClick={() => setStatus((s) => s === "AVAILABLE" ? "UNAVAILABLE" : "AVAILABLE")}
                  disabled={isAdminDisabled}
                  style={{ cursor: isAdminDisabled ? "not-allowed" : "pointer", opacity: isAdminDisabled ? 0.4 : 1, flexShrink: 0 }}
                >
                  <span className={styles.toggleThumb} />
                </button>
              </div>
            ) : (
              <div className={styles.visibilityLocked}>
                <span className={styles.visibilityLockedIcon}>🔒</span>
                <div>
                  <div className={styles.visibilityLockedLabel}>Status: <strong>{currentStatus?.replace("_", " ")}</strong></div>
                  <div className={styles.visibilityLockedSub}>Visibility can only be toggled once approved.</div>
                </div>
              </div>
            )}
          </div>

          {/* ── Active Tenant ── */}
          <div className={styles.card}>
            <div className={styles.cardTitle}>Active Tenant</div>
            {activeTenantLoading ? (
              <div className={styles.requestsLoading}>Loading tenant info…</div>
            ) : !activeTenant ? (
              <div className={styles.requestsEmpty}>
                <span className={styles.requestsEmptyIcon}>🏠</span>
                <p>No active tenant. Property is currently vacant.</p>
              </div>
            ) : (
              <div className={styles.activeTenantWrap}>
                <div className={styles.activeTenantRow}>
                  <div className={styles.activeTenantAvatar}>{activeTenant.tenantName.charAt(0).toUpperCase()}</div>
                  <div className={styles.activeTenantInfo}>
                    <div className={styles.activeTenantName}>{activeTenant.tenantName}</div>
                    <div className={styles.activeTenantEmail}>✉️ {activeTenant.tenantEmail}</div>
                  </div>
                  <span className={styles.activeTenantBadge}>ACTIVE</span>
                </div>
                <div className={styles.activeTenantStats}>
                  <div className={styles.activeTenantStat}><span className={styles.activeTenantStatIcon}>📅</span><span className={styles.activeTenantStatLabel}>Move-in</span><span className={styles.activeTenantStatValue}>{activeTenant.startDate}</span></div>
                  <div className={styles.activeTenantStat}><span className={styles.activeTenantStatIcon}>🗓</span><span className={styles.activeTenantStatLabel}>Lease</span><span className={styles.activeTenantStatValue}>{activeTenant.leaseDurationMonths} month{activeTenant.leaseDurationMonths !== 1 ? "s" : ""}</span></div>
                  <div className={styles.activeTenantStat}><span className={styles.activeTenantStatIcon}>🏁</span><span className={styles.activeTenantStatLabel}>Move-out</span><span className={styles.activeTenantStatValue}>{calcMoveOut(activeTenant.startDate, activeTenant.leaseDurationMonths)}</span></div>
                </div>
                <div className={styles.activeTenantActions}>
                  <button type="button" className={styles.leaseExtendBtn} onClick={() => openLeaseModal("extend")}>➕ Extend Lease</button>
                  <button type="button" className={styles.leaseReduceBtn} onClick={() => openLeaseModal("reduce")}>➖ Reduce Lease</button>
                  <button type="button" className={styles.leaseTerminateBtn} onClick={() => openLeaseModal("terminate")}>🚫 End Lease</button>
                </div>
              </div>
            )}
          </div>

          {/* ── Payment History ── */}
          <div className={styles.card}>
            <div className={styles.cardTitle}>Payment History {overdueCount > 0 && <span className={styles.overduesBadge}>{overdueCount} overdue</span>}</div>
            {paymentsLoading && <div className={styles.requestsLoading}>Loading payment history…</div>}
            {!paymentsLoading && paymentsError && <div className={styles.requestsError}>⚠ {paymentsError}</div>}
            {!paymentsLoading && !paymentsError && payments.length === 0 && <div className={styles.requestsEmpty}><span className={styles.requestsEmptyIcon}>💳</span><p>No payments recorded yet for this tenant.</p></div>}
            {!paymentsLoading && !paymentsError && payments.length > 0 && (
              <>
                <div className={styles.paymentSummaryStrip}>
                  <div className={styles.paymentSummaryItem}><span className={styles.paymentSummaryValue}>{payments.length}</span><span className={styles.paymentSummaryLabel}>Total</span></div>
                  <div className={styles.paymentSummarySep} />
                  <div className={styles.paymentSummaryItem}><span className={styles.paymentSummaryValue} style={{ color: "#1a7a4a" }}>{paidCount}</span><span className={styles.paymentSummaryLabel}>Paid</span></div>
                  <div className={styles.paymentSummarySep} />
                  <div className={styles.paymentSummaryItem}><span className={styles.paymentSummaryValue} style={{ color: "#c0392b" }}>{overdueCount}</span><span className={styles.paymentSummaryLabel}>Overdue</span></div>
                  <div className={styles.paymentSummarySep} />
                  <div className={styles.paymentSummaryItem}><span className={styles.paymentSummaryValue} style={{ color: "#1f5d71" }}>₱{totalPaid.toLocaleString("en-PH", { minimumFractionDigits: 0 })}</span><span className={styles.paymentSummaryLabel}>Collected</span></div>
                </div>
                <div className={styles.yearAccordionList}>
                  {paymentYears.map((year) => {
                    const yearPayments = paymentsByYear[year];
                    const isOpen = openPaymentYears.has(year);
                    const yearPaid = yearPayments.filter((p) => p.status === "PAID").length;
                    const yearOverdue = yearPayments.filter((p) => p.status === "OVERDUE").length;
                    const yearTotal = yearPayments.reduce((s, p) => s + p.amount, 0);
                    return (
                      <div key={year} className={styles.yearAccordion}>
                        <button type="button" className={styles.yearAccordionHeader} onClick={() => togglePaymentYear(year)}>
                          <span className={styles.yearAccordionChevron}>{isOpen ? "▾" : "▸"}</span>
                          <span className={styles.yearAccordionLabel}>{year}</span>
                          <span className={styles.yearAccordionMeta}>{yearPayments.length} payment{yearPayments.length !== 1 ? "s" : ""} · <span style={{ color: "#1a7a4a" }}>{yearPaid} paid</span>{yearOverdue > 0 && <span style={{ color: "#c0392b" }}> · {yearOverdue} overdue</span>} · ₱{yearTotal.toLocaleString("en-PH", { minimumFractionDigits: 0 })}</span>
                        </button>
                        {isOpen && (
                          <div className={styles.yearAccordionBody}>
                            {yearPayments.map((pmt) => {
                              const sc = paymentStatusColor(pmt.status);
                              return (
                                <div key={pmt.id} className={styles.paymentRow} style={{ borderColor: sc.border }}>
                                  <div className={styles.paymentStatusBubble} style={{ background: sc.bg, color: sc.color, borderColor: sc.border }}>{paymentStatusIcon(pmt.status)}</div>
                                  <div className={styles.paymentInfo}>
                                    <div className={styles.paymentTitle}>Month {pmt.installmentNumber}<span className={styles.paymentStatusChip} style={{ color: sc.color, background: sc.bg, borderColor: sc.border }}>{pmt.status}</span></div>
                                    <div className={styles.paymentMeta}><span>📅 Due: {pmt.dueDate}</span>{pmt.paidAt && <span style={{ color: "#1a7a4a" }}>✓ Paid: {pmt.paidAt}</span>}</div>
                                  </div>
                                  <div className={styles.paymentAmount}>₱{pmt.amount.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* ── Lease Extension Requests ── */}
          <div className={styles.card}>
            <div className={styles.cardTitle}>Lease Extension Requests {pendingExtensions.length > 0 && <span className={styles.requestsBadge}>{pendingExtensions.length} pending</span>}</div>
            {leaseExtLoading && <div className={styles.requestsLoading}>Loading extension requests…</div>}
            {!leaseExtLoading && leaseExtensions.length === 0 && <div className={styles.requestsEmpty}><span className={styles.requestsEmptyIcon}>📋</span><p>No lease extension requests from the tenant yet.</p></div>}
            {extActionError && <div style={{ padding: "10px 14px", marginBottom: "12px", borderRadius: "10px", background: "rgba(192,57,43,0.06)", border: "1px solid rgba(192,57,43,0.2)", color: "#c0392b", fontSize: "13px", fontWeight: 600 }}>⚠ {extActionError}</div>}
            {!leaseExtLoading && leaseExtensions.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {leaseExtensions.map((ext) => {
                  const isPending = ext.status === "PENDING";
                  const isApproved = ext.status === "APPROVED";
                  const isLoading = extActionSubmitting && extActionId === ext.id;
                  const color = isApproved ? "#1a7a4a" : ext.status === "REJECTED" ? "#c0392b" : "#b78e42";
                  const bg = isApproved ? "rgba(26,122,74,0.06)" : ext.status === "REJECTED" ? "rgba(192,57,43,0.06)" : "rgba(183,142,66,0.06)";
                  const border = isApproved ? "rgba(26,122,74,0.18)" : ext.status === "REJECTED" ? "rgba(192,57,43,0.18)" : "rgba(183,142,66,0.18)";
                  return (
                    <div key={ext.id} style={{ padding: "14px 16px", borderRadius: "12px", background: bg, border: `1px solid ${border}` }}>
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                            <span style={{ fontWeight: 700, fontSize: "15px", color: "#1e293b" }}>+{ext.requestedMonths} month{ext.requestedMonths !== 1 ? "s" : ""} requested</span>
                            <span style={{ fontSize: "11px", fontWeight: 700, padding: "2px 10px", borderRadius: "20px", color, background: bg, border: `1px solid ${border}` }}>{isPending ? "⏳ Pending" : isApproved ? "✓ Approved" : "✕ Rejected"}</span>
                          </div>
                          {ext.reason && (<div style={{ marginTop: "6px", fontSize: "13px", color: "#64748b", fontStyle: "italic" }}>"{ext.reason}"</div>)}
                          <div style={{ marginTop: "4px", fontSize: "11px", color: "#94a3b8" }}>Requested {formatDate(ext.createdAt)}</div>
                        </div>
                        {isPending && (
                          <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                            <button type="button" disabled={isLoading} onClick={() => handleExtensionRespond(ext.id, "REJECTED")} style={{ padding: "7px 14px", borderRadius: "9px", fontWeight: 700, fontSize: "13px", cursor: isLoading ? "not-allowed" : "pointer", opacity: isLoading ? 0.6 : 1, background: "rgba(192,57,43,0.07)", border: "1.5px solid rgba(192,57,43,0.22)", color: "#c0392b" }}>{isLoading ? "…" : "✕ Reject"}</button>
                            <button type="button" disabled={isLoading} onClick={() => handleExtensionRespond(ext.id, "APPROVED")} style={{ padding: "7px 14px", borderRadius: "9px", fontWeight: 700, fontSize: "13px", cursor: isLoading ? "not-allowed" : "pointer", opacity: isLoading ? 0.6 : 1, background: "rgba(26,122,74,0.09)", border: "1.5px solid rgba(26,122,74,0.25)", color: "#1a7a4a" }}>{isLoading ? "…" : "✓ Approve"}</button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Reviews Card ── */}
          <div className={styles.card}>
            <div className={styles.cardTitle} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>Tenant Reviews {avgRating && <span className={styles.reviewsAvgBadge}>★ {avgRating} · {reviews.length} review{reviews.length !== 1 ? "s" : ""}</span>}</div>
            </div>
            {reviewsLoading && <div className={styles.requestsLoading}>Loading reviews…</div>}
            {!reviewsLoading && reviews.length === 0 && <div className={styles.requestsEmpty}><span className={styles.requestsEmptyIcon}>⭐</span><p>No reviews yet for this property.</p></div>}
            {!reviewsLoading && reviews.length > 0 && (
              <>
                <div className={styles.reviewRatingBreakdown}>
                  <div className={styles.reviewRatingBig}>
                    <span className={styles.reviewRatingNumber}>{avgRating}</span>
                    <div className={styles.reviewRatingStars}>{[1, 2, 3, 4, 5].map((s) => (<span key={s} style={{ color: s <= Math.round(parseFloat(avgRating!)) ? "#f59e0b" : "#e2e8f0", fontSize: "20px" }}>★</span>))}</div>
                    <span className={styles.reviewRatingCount}>{reviews.length} review{reviews.length !== 1 ? "s" : ""}</span>
                  </div>
                  <div className={styles.reviewRatingBars}>
                    {[5, 4, 3, 2, 1].map((star) => {
                      const count = reviews.filter((r) => r.rating === star).length;
                      const pct = reviews.length > 0 ? Math.round((count / reviews.length) * 100) : 0;
                      return (
                        <div key={star} className={styles.reviewRatingBarRow}>
                          <span className={styles.reviewRatingBarLabel}>{star}★</span>
                          <div className={styles.reviewRatingBarTrack}><div className={styles.reviewRatingBarFill} style={{ width: `${pct}%` }} /></div>
                          <span className={styles.reviewRatingBarCount}>{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "16px" }}>
                  {reviews.slice(0, 2).map((rev) => (
                    <div key={rev.id} className={styles.reviewItem}>
                      <div className={styles.reviewItemHeader}>
                        <div className={styles.reviewItemAvatar}>{rev.tenantAvatarUrl ? <img src={rev.tenantAvatarUrl} alt={rev.tenantName} /> : <span>{rev.tenantName.charAt(0).toUpperCase()}</span>}</div>
                        <div className={styles.reviewItemMeta}><span className={styles.reviewItemName}>{rev.tenantName}</span><span className={styles.reviewItemDate}>{formatDate(rev.createdAt)}</span></div>
                        <div className={styles.reviewItemStars}>{[1, 2, 3, 4, 5].map((s) => (<span key={s} style={{ color: s <= rev.rating ? "#f59e0b" : "#e2e8f0", fontSize: "15px" }}>★</span>))}</div>
                      </div>
                      {rev.comment && (<p className={styles.reviewItemComment}>{rev.comment}</p>)}
                    </div>
                  ))}
                </div>
                {reviews.length > 0 && (
                  <button
                    type="button"
                    onClick={() => { setModalRatingFilter(0); setShowReviewsModal(true); }}
                    className={styles.contactBtn}
                    style={{ marginTop: "16px", width: "100%" }}
                  >
                    View & Filter All {reviews.length} Reviews
                  </button>
                )}
              </>
            )}
          </div>

          {/* ── Location ── */}
          <div className={styles.card}>
            <div className={styles.cardTitle}>Location</div>

            {/* ── Single unified location + map search field ── */}
            <div className={styles.mapSearchWrap} style={{ marginBottom: "14px" }}>
              <input
                type="text"
                className={styles.mapSearchInput}
                placeholder="e.g. Lahug, Cebu City"
                value={location}
                onChange={(e) => { setLocation(e.target.value); setMapError(null); }}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleMapSearch())}
                required
              />
              <button
                type="button"
                className={styles.mapSearchBtn}
                onClick={handleMapSearch}
                disabled={mapSearching || !location.trim()}
              >
                {mapSearching ? "Searching…" : "🔍 Find"}
              </button>
            </div>

            {mapError && <p style={{ color: "#c0392b", fontSize: "13px", marginBottom: "10px" }}>⚠ {mapError}</p>}

            {/* ── React-Leaflet Interactive Map ── */}
            <div className={styles.mapFrame}>
              <MapContainer
                center={mapCoords ? [mapCoords.lat, mapCoords.lon] : [10.3157, 123.8854]}
                zoom={mapCoords ? 16 : 14}
                minZoom={12} // Prevents zooming out to see the rest of the island
                maxBounds={[
                  [CEBU_CITY_BOUNDS.minLat, CEBU_CITY_BOUNDS.minLon], 
                  [CEBU_CITY_BOUNDS.maxLat, CEBU_CITY_BOUNDS.maxLon]
                ]}
                maxBoundsViscosity={1.0} // Rubber-bands back instantly if they try to drag out
                style={{ height: "100%", width: "100%", zIndex: 1 }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <ClickableMap coords={mapCoords} setCoords={setMapCoords} onLocationSelect={handleMapClick} />
              </MapContainer>
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
            <div className={styles.photoTip}><span className={styles.photoTipIcon}>💡</span><div><div className={styles.photoTipTitle}>Improve your chances of approval</div><div className={styles.photoTipBody}>Include clear photos of the actual property and supporting documents such as your <strong>business permit</strong> or <strong>barangay certificate</strong>.</div></div></div>
            <div className={styles.thumbnailNote}>🖼 The <strong>first photo uploaded</strong> will be used as the listing thumbnail.</div>
            {visibleExisting.length > 0 && (
              <div className={styles.existingImagesWrap}>
                <p className={styles.existingImagesLabel}>Current photos — click to preview</p>
                <div className={styles.imagePreviewGrid}>
                  {visibleExisting.map((img, idx) => (
                    <div key={img.id} className={styles.imagePreviewWrap}>
                      <img src={img.imageUrl} alt="Existing" className={`${styles.imagePreview} ${styles.imagePreviewClickable}`} onClick={() => openLightbox(existingSrcs, idx)} />
                      <button type="button" className={styles.imagePreviewRemove} onClick={(e) => { e.stopPropagation(); removeExistingImage(img.id); }} aria-label="Remove image">✕</button>
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
                <input ref={fileInputRef} type="file" accept="image/*" multiple className={styles.imageUploadInput} onChange={(e) => addFiles(e.target.files)} />
                <div className={styles.imageUploadIcon}>📸</div>
                <div className={styles.imageUploadTitle}>{newImageFiles.length > 0 ? `${newImageFiles.length} new photo${newImageFiles.length > 1 ? "s" : ""} selected` : "Click or drag to add more photos"}</div>
                <div className={styles.imageUploadSub}>JPG, PNG, WEBP · Max 5MB each · Up to {10 - visibleExisting.length} more</div>
              </div>
            )}
            {newImagePreviews.length > 0 && (
              <div className={styles.imagePreviewGrid} style={{ marginTop: "12px" }}>
                {newImagePreviews.map((src, i) => (
                  <div key={i} className={styles.imagePreviewWrap}>
                    <img src={src} alt={`New ${i + 1}`} className={`${styles.imagePreview} ${styles.imagePreviewClickable}`} onClick={() => openLightbox(newImagePreviews, i)} />
                    <div className={styles.imagePreviewNewBadge}>New</div>
                    <button type="button" className={styles.imagePreviewRemove} onClick={(e) => { e.stopPropagation(); removeNewImage(i); }} aria-label="Remove image">✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Rental Requests ── */}
          <div className={styles.card}>
            <div className={styles.cardTitle}>Rental Requests {pendingCount > 0 && <span className={styles.requestsBadge}>{pendingCount} pending</span>}</div>
            {requestsLoading && <div className={styles.requestsLoading}>Loading requests…</div>}
            {!requestsLoading && requestsError && <div className={styles.requestsError}>⚠ {requestsError}</div>}
            {!requestsLoading && !requestsError && requests.length === 0 && <div className={styles.requestsEmpty}><span className={styles.requestsEmptyIcon}>📭</span><p>No rental requests yet for this property.</p></div>}

            {!requestsLoading && !requestsError && displayedRequests.length > 0 && (
              <div className={styles.yearAccordionList}>
                {requestYears.map((year) => {
                  const yearReqs = requestsByYear[year];
                  const isOpen = openRequestYears.has(year);
                  const yearPending = yearReqs.filter((r) => r.status === "PENDING").length;
                  return (
                    <div key={year} className={styles.yearAccordion}>
                      <button type="button" className={styles.yearAccordionHeader} onClick={() => toggleRequestYear(year)}>
                        <span className={styles.yearAccordionChevron}>{isOpen ? "▾" : "▸"}</span>
                        <span className={styles.yearAccordionLabel}>{year}</span>
                        <span className={styles.yearAccordionMeta}>{yearReqs.length} request{yearReqs.length !== 1 ? "s" : ""}{yearPending > 0 && <span style={{ color: "#b78e42" }}> · {yearPending} pending</span>}</span>
                      </button>
                      {isOpen && (
                        <div className={styles.yearAccordionBody}>
                          <div className={styles.requestsList}>
                            {yearReqs.map((req) => {
                              const isPending = req.status === "PENDING";
                              return (
                                <div key={req.id} className={styles.requestRow}>
                                  <div className={styles.requestAvatar}>{req.tenantName?.charAt(0).toUpperCase()}</div>
                                  <div className={styles.requestInfo}>
                                    <div className={styles.requestName}>{req.tenantName}</div>
                                    <div className={styles.requestMeta}>
                                      <span>✉️ {req.tenantEmail}</span>
                                      <span>📅 Move in: {req.startDate}</span>
                                      <span>🗓 {req.leaseDurationMonths} month{req.leaseDurationMonths !== 1 ? "s" : ""}</span>
                                      <span>🕐 {timeAgo(req.createdAt)}</span>
                                    </div>
                                  </div>
                                  <div className={styles.requestRight}>
                                    <span className={styles.requestStatus} style={{ color: statusColor(req.status), borderColor: statusColor(req.status) }}>{req.status}</span>
                                    {isPending && (
                                      <div className={styles.requestActions}>
                                        <button type="button" className={styles.requestRejectBtn} onClick={() => openAction(req, "REJECTED")}>✕ Reject</button>
                                        <button type="button" className={styles.requestApproveBtn} onClick={() => openAction(req, "APPROVED")}>✓ Approve</button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {!showPastRequests && pastRequests.length > 0 && (
              <button
                type="button"
                onClick={() => setShowPastRequests(true)}
                className={styles.contactBtn}
                style={{ width: "100%", marginTop: "16px" }}
              >
                Load Past Requests ({pastRequests.length})
              </button>
            )}
          </div>

          {/* ── Submit Row ── */}
          <div className={styles.submitRow}>
            {submitMsg && <span className={`${styles.submitMsg} ${submitMsgClass}`}>{submitIcon} {submitMsg.text}</span>}
            <button type="button" className={styles.cancelBtn} onClick={() => navigate(-1)} disabled={submitting}>Cancel</button>
            <button type="submit" className={styles.submitBtn} disabled={submitting || isRejected}>
              {submitting ? <><span className={styles.submitSpinner} /> Saving…</> : "Save Changes"}
            </button>
          </div>

        </main>
      </form>
    </div>
  );
};

export default EditProperty;