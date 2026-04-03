import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import OwnerNavbar from "../../../components/OwnerNavbar/OwnerNavbar";
import styles from "./owner_add_property.module.css";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

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

async function geocode(query: string): Promise<MapCoords | null> {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`, { headers: { "Accept-Language": "en" } });
    const data = await res.json();
    if (!data.length) return null;
    return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
  } catch { return null; }
}

function buildMapSrc(coords: MapCoords): string {
  const { lat, lon } = coords;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${lon - 0.01},${lat - 0.01},${lon + 0.01},${lat + 0.01}&layer=mapnik&marker=${lat},${lon}`;
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

// ─── component ─────────────────────────────────────────────────────────────

const EditProperty: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Auth & metadata ────────────────────────────────────────────────────
  const [user, setUser] = useState<User | null>(null);
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

  // Admin Lockout State
  const [isAdminDisabled, setIsAdminDisabled] = useState(false);
  const [adminNote, setAdminNote] = useState<string | null>(null);

  // ── Map ────────────────────────────────────────────────────────────────
  const [mapQuery, setMapQuery] = useState("");
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

  // ── Submit ─────────────────────────────────────────────────────────────
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState<{ type: "success" | "error" | "warning"; text: string; } | null>(null);

  // ── Auth guard ─────────────────────────────────────────────────────────
  useEffect(() => {
    const stored = localStorage.getItem("user");
    const token = localStorage.getItem("accessToken");
    if (!stored || !token) { navigate("/"); return; }
    try {
      const parsed: User = JSON.parse(stored);
      if (parsed.role?.toUpperCase() !== "OWNER") { navigate("/home"); return; }
      setUser(parsed);
    } catch { navigate("/"); }
  }, [navigate]);

  // ── Property types ─────────────────────────────────────────────────────
  useEffect(() => {
    fetch(`${API_BASE}/api/properties/types`)
      .then((r) => r.json())
      .then((data) => { if (data.success) setPropertyTypes(data.data.types ?? []); })
      .catch(() => { });
  }, []);

  // ── Load property ──────────────────────────────────────────────────────
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
        setRejectionReason(p.rejectionReason ?? null);

        // Map Admin Lockout fields from Backend
        setIsAdminDisabled(p.adminDisabled ?? p.isAdminDisabled ?? false);
        setAdminNote(p.adminNote ?? null);

        if (p.status === "AVAILABLE" || p.status === "UNAVAILABLE") setStatus(p.status);
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
  }, [user, id]);

  // ── Load rental requests ───────────────────────────────────────────────
  useEffect(() => {
    if (!user || !id) return;
    const token = localStorage.getItem("accessToken");
    setRequestsLoading(true);
    fetch(`${API_BASE}/api/rental-requests/property/${id}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          const reqs: RentalRequest[] = data.data.requests ?? [];
          setRequests(reqs);
          if (reqs.length > 0) {
            const latestYear = getYear(reqs[0].createdAt);
            setOpenRequestYears(new Set([latestYear]));
          }
        } else {
          setRequestsError("Failed to load requests.");
        }
      })
      .catch(() => setRequestsError("Unable to load rental requests."))
      .finally(() => setRequestsLoading(false));
  }, [user, id]);

  // ── Load active tenant ─────────────────────────────────────────────────
  useEffect(() => {
    if (!user || !id) return;
    const token = localStorage.getItem("accessToken");
    setActiveTenantLoading(true);
    fetch(`${API_BASE}/api/rental-requests/property/${id}/active`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.data.activeTenant && data.data.activeTenant.tenantId) {
          const t = data.data.activeTenant;
          setActiveTenant({
            id: t.id,
            tenantId: t.tenantId,
            tenantName: t.tenantName,
            tenantEmail: t.tenantEmail,
            startDate: t.startDate,
            leaseDurationMonths: t.leaseDurationMonths,
            status: t.status,
          });
        } else {
          setActiveTenant(null);
        }
      })
      .catch(() => { })
      .finally(() => setActiveTenantLoading(false));
  }, [user, id]);

  // ── Load payment history when active tenant is known ──────────────────
  useEffect(() => {
    if (!activeTenant) { setPayments([]); return; }
    const token = localStorage.getItem("accessToken");
    setPaymentsLoading(true);
    setPaymentsError(null);
    fetch(`${API_BASE}/api/payments/request/${activeTenant.id}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          const pmts: RentalPayment[] = data.data.payments ?? [];
          setPayments(pmts);
          const firstUnpaid = pmts.find((p) => p.status === "PENDING" || p.status === "OVERDUE");
          const autoYear = firstUnpaid ? getYear(firstUnpaid.dueDate) : pmts.length > 0 ? getYear(pmts[pmts.length - 1].dueDate) : null;
          if (autoYear) setOpenPaymentYears(new Set([autoYear]));
        } else {
          setPaymentsError("Failed to load payment history.");
        }
      })
      .catch(() => setPaymentsError("Unable to load payment history."))
      .finally(() => setPaymentsLoading(false));
  }, [activeTenant]);

  // ── Load lease extension requests ─────────────────────────────────────
  useEffect(() => {
    if (!activeTenant) { setLeaseExtensions([]); return; }
    const token = localStorage.getItem("accessToken");
    setLeaseExtLoading(true);
    fetch(`${API_BASE}/api/lease-extensions/rental/${activeTenant.id}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.json())
      .then((data) => { if (data.success) setLeaseExtensions(data.data.extensionRequests ?? []); })
      .catch(() => { })
      .finally(() => setLeaseExtLoading(false));
  }, [activeTenant]);

  // ── Load property reviews ──────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    const token = localStorage.getItem("accessToken");
    setReviewsLoading(true);
    fetch(`${API_BASE}/api/property-reviews/property/${id}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.json())
      .then((data) => { if (data.success) setReviews(data.data.reviews ?? []); })
      .catch(() => { })
      .finally(() => setReviewsLoading(false));
  }, [id]);

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

  // ── Map search ─────────────────────────────────────────────────────────
  const handleMapSearch = async () => {
    if (!mapQuery.trim()) return;
    setMapSearching(true); setMapError(null);
    const coords = await geocode(mapQuery.trim());
    if (coords) { setMapCoords(coords); if (!location.trim()) setLocation(mapQuery.trim()); }
    else setMapError("Location not found. Try a more specific address.");
    setMapSearching(false);
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
  const removeNewImage = (index: number) => { const updated = newImageFiles.filter((_, i) => i !== index); setNewImageFiles(updated); setNewImagePreviews(updated.map((f) => URL.createObjectURL(f))); };

  // ── Rental request actions ─────────────────────────────────────────────
  const openAction = (req: RentalRequest, type: "APPROVED" | "REJECTED") => { setActionTarget(req); setActionType(type); setActionError(null); };
  const closeAction = () => { if (actionSubmitting) return; setActionTarget(null); setActionType(null); setActionError(null); };
  const handleRequestAction = async () => {
    if (!actionTarget || !actionType) return;
    setActionSubmitting(true); setActionError(null);
    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch(`${API_BASE}/api/rental-requests/${actionTarget.id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), },
        body: JSON.stringify({ status: actionType }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) { setActionError(data?.error?.message ?? "Action failed."); return; }
      setRequests((prev) => prev.map((r) => r.id === actionTarget.id ? { ...r, status: actionType } : r));
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
    const token = localStorage.getItem("accessToken");
    try {
      if (leaseModal === "terminate") {
        const res = await fetch(`${API_BASE}/api/rental-requests/${activeTenant.id}/terminate`, { method: "PUT", headers: token ? { Authorization: `Bearer ${token}` } : {}, });
        const data = await res.json();
        if (!res.ok || !data.success) { setLeaseError(data?.error?.message ?? "Failed to terminate lease."); return; }
        setActiveTenant(null); setPayments([]); setLeaseExtensions([]); setStatus("AVAILABLE"); setCurrentStatus("AVAILABLE"); setLeaseSuccess("Lease terminated. Property is now available.");
        setTimeout(closeLeaseModal, 1800);
      } else {
        const adjust = leaseModal === "extend" ? leaseMonths : -leaseMonths;
        const res = await fetch(`${API_BASE}/api/rental-requests/${activeTenant.id}/lease`, { method: "PUT", headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), }, body: JSON.stringify({ adjustMonths: adjust }), });
        const data = await res.json();
        if (!res.ok || !data.success) { setLeaseError(data?.error?.message ?? "Failed to update lease."); return; }
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
    const token = localStorage.getItem("accessToken");
    try {
      const res = await fetch(`${API_BASE}/api/lease-extensions/${extensionId}/respond`, { method: "PUT", headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), }, body: JSON.stringify({ decision }), });
      const data = await res.json();
      if (!res.ok || !data.success) { setExtActionError(data?.error?.message ?? "Action failed."); return; }
      const approved = leaseExtensions.find((e) => e.id === extensionId);
      setLeaseExtensions((prev) => prev.map((e) => e.id === extensionId ? { ...e, status: decision } : e));
      if (decision === "APPROVED" && approved) { setActiveTenant((prev) => prev ? { ...prev, leaseDurationMonths: prev.leaseDurationMonths + approved.requestedMonths } : prev); }
    } catch { setExtActionError("Network error. Please try again."); }
    finally { setExtActionSubmitting(false); setExtActionId(null); }
  };

  // ── Form submit ────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !id) return;
    setSubmitting(true); setSubmitMsg(null);
    try {
      const token = localStorage.getItem("accessToken");
      const updateRes = await fetch(`${API_BASE}/api/properties/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), },
        body: JSON.stringify({
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
        }),
      });
      const updateData = await updateRes.json();
      if (!updateRes.ok || !updateData.success) { setSubmitMsg({ type: "error", text: updateData?.error?.message ?? "Failed to update property." }); return; }
      if (newImageFiles.length > 0) {
        const formData = new FormData();
        newImageFiles.forEach((f) => formData.append("files", f));
        const imgRes = await fetch(`${API_BASE}/api/properties/${id}/images`, { method: "POST", headers: token ? { Authorization: `Bearer ${token}` } : {}, body: formData, });
        const imgData = await imgRes.json();
        if (!imgRes.ok || !imgData.success) { setSubmitMsg({ type: "warning", text: "Property updated! Some images failed to upload." }); setTimeout(() => navigate("/owner/properties"), 2000); return; }
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
  const pendingCount = requests.filter((r) => r.status === "PENDING").length;
  const pendingExtensions = leaseExtensions.filter((e) => e.status === "PENDING");
  const avgRating = reviews.length > 0 ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : null;
  const requestsByYear = groupBy(requests, (r) => getYear(r.createdAt));
  const requestYears = Object.keys(requestsByYear).sort((a, b) => Number(b) - Number(a));
  const paymentsByYear = groupBy(payments, (p) => getYear(p.dueDate));
  const paymentYears = Object.keys(paymentsByYear).sort((a, b) => Number(b) - Number(a));
  const paidCount = payments.filter((p) => p.status === "PAID").length;
  const overdueCount = payments.filter((p) => p.status === "OVERDUE").length;
  const totalPaid = payments.filter((p) => p.status === "PAID").reduce((s, p) => s + p.amount, 0);

  if (pageLoading) return (
    <div className={styles.page}>
      <OwnerNavbar user={user} onAddProperty={() => { }} />
      <div style={{ padding: "60px 40px", textAlign: "center", color: "#6e7071" }}>Loading property…</div>
    </div>
  );
  if (pageError) return (
    <div className={styles.page}>
      <OwnerNavbar user={user} onAddProperty={() => { }} />
      <div style={{ padding: "60px 40px", textAlign: "center", color: "#c0392b" }}>{pageError}</div>
    </div>
  );

  return (
    <div className={styles.page}>
      <OwnerNavbar user={user} onAddProperty={() => { }} />

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
                {actionType === "APPROVED" ? <><strong>{actionTarget.tenantName}</strong>'s request will be approved. They'll be notified by email.</> : <><strong>{actionTarget.tenantName}</strong>'s request will be rejected. They'll be notified by email.</>}
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
                    Current lease: <strong>{activeTenant.leaseDurationMonths} month(s)</strong> for <strong>{activeTenant.tenantName}</strong>. {leaseModal === "extend" ? "How many months would you like to add?" : "How many months would you like to remove?"}
                  </p>
                  <div style={{ display: "flex", alignItems: "center", gap: "14px", margin: "16px 0", padding: "14px 16px", background: "#f8fbfb", borderRadius: "12px", border: "1px solid #e5eced", }}>
                    <button type="button" style={{ width: 34, height: 34, borderRadius: "50%", border: "1.5px solid #e5eced", background: "#fff", fontSize: 20, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#1f5d71", fontWeight: 700, }} onClick={() => setLeaseMonths((m) => Math.max(1, m - 1))}>−</button>
                    <span style={{ fontSize: 24, fontWeight: 800, color: "#1f5d71", minWidth: 40, textAlign: "center" }}>{leaseMonths}</span>
                    <button type="button" style={{ width: 34, height: 34, borderRadius: "50%", border: "1.5px solid #e5eced", background: "#fff", fontSize: 20, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#1f5d71", fontWeight: 700, }} onClick={() => setLeaseMonths((m) => m + 1)}>+</button>
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
            <div style={{ display: "flex", alignItems: "flex-start", gap: "14px", padding: "18px 22px", background: "rgba(192,57,43,0.06)", border: "1.5px solid rgba(192,57,43,0.22)", borderRadius: "14px", marginBottom: "20px", }}>
              <span style={{ fontSize: "22px", flexShrink: 0 }}>❌</span>
              <div>
                <div style={{ fontWeight: 800, fontSize: "15px", color: "#c0392b", marginBottom: "4px" }}>This property was rejected by an admin</div>
                {rejectionReason && (
                  <div style={{ fontSize: "13px", color: "#7b2d22", background: "rgba(192,57,43,0.07)", borderLeft: "3px solid #c0392b", borderRadius: "0 6px 6px 0", padding: "8px 12px", marginTop: "6px", lineHeight: 1.5, }}>
                    <strong>Reason:</strong> {rejectionReason}
                  </div>
                )}
                <div style={{ fontSize: "12px", color: "#6e7071", marginTop: "8px" }}>This listing is read-only. </div>
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

                  {/* REASON BOX */}
                  {status === "UNAVAILABLE" && (
                    <div style={{
                      marginTop: "12px",
                      padding: "12px 16px",
                      borderRadius: "10px",
                      fontSize: "13px",
                      background: isAdminDisabled ? "rgba(192,57,43,0.08)" : "#f9f9f9",
                      borderLeft: isAdminDisabled ? "4px solid #c0392b" : "4px solid #6e7071",
                      color: isAdminDisabled ? "#c0392b" : "#444"
                    }}>
                      <div style={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '10px', marginBottom: '4px', letterSpacing: '0.5px' }}>
                         Deactivation Status
                      </div>
                      {isAdminDisabled ? (
                        <div>
                          <strong style={{ fontSize: '14px' }}>ADMIN DEACTIVATED</strong>
                          <p style={{ margin: '4px 0 0', lineHeight: '1.5' }}>
                            <strong>Reason:</strong> {adminNote || "Administrative restriction applied by platform management."}
                          </p>
                          <p style={{ margin: '8px 0 0', fontSize: '11px', fontStyle: 'italic', opacity: 0.8 }}>
                            Contact support if you believe this is an error.
                          </p>
                        </div>
                      ) : (
                        <div><strong>OFFLINE:</strong> Manual deactivation by Owner.</div>
                      )}
                    </div>
                  )}

                  <div className={styles.visibilitySub} style={{ marginTop: status === "UNAVAILABLE" ? "10px" : "4px" }}>
                    {status === "AVAILABLE" 
                      ? "Tenants can find this property in search results." 
                      : "This property is currently hidden from public view."}
                  </div>
                </div>

                <button
                  type="button"
                  className={`${styles.toggleBtn} ${status === "AVAILABLE" ? styles.toggleBtnOn : styles.toggleBtnOff}`}
                  onClick={() => setStatus((s) => s === "AVAILABLE" ? "UNAVAILABLE" : "AVAILABLE")}
                  disabled={isAdminDisabled} 
                  style={{ 
                    cursor: isAdminDisabled ? "not-allowed" : "pointer",
                    opacity: isAdminDisabled ? 0.4 : 1,
                    flexShrink: 0
                  }}
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
                    const yearPayments = paymentsByYear[year]; const isOpen = openPaymentYears.has(year); const yearPaid = yearPayments.filter((p) => p.status === "PAID").length; const yearOverdue = yearPayments.filter((p) => p.status === "OVERDUE").length; const yearTotal = yearPayments.reduce((s, p) => s + p.amount, 0);
                    return (
                      <div key={year} className={styles.yearAccordion}>
                        <button type="button" className={styles.yearAccordionHeader} onClick={() => togglePaymentYear(year)}>
                          <span className={styles.yearAccordionChevron}>{isOpen ? "▾" : "▸"}</span>
                          <span className={styles.yearAccordionLabel}>{year}</span>
                          <span className={styles.yearAccordionMeta}>{yearPayments.length} payment{yearPayments.length !== 1 ? "s" : ""} · <span style={{ color: "#1a7a4a" }}>{yearPaid} paid</span>{yearOverdue > 0 && <span style={{ color: "#c0392b" }}> · {yearOverdue} overdue</span>} · ₱{yearTotal.toLocaleString("en-PH", { minimumFractionDigits: 0 })}</span>
                        </button>
                        {isOpen && (<div className={styles.yearAccordionBody}>{yearPayments.map((pmt) => { const sc = paymentStatusColor(pmt.status); return (<div key={pmt.id} className={styles.paymentRow} style={{ borderColor: sc.border }}><div className={styles.paymentStatusBubble} style={{ background: sc.bg, color: sc.color, borderColor: sc.border }}>{paymentStatusIcon(pmt.status)}</div><div className={styles.paymentInfo}><div className={styles.paymentTitle}>Month {pmt.installmentNumber}<span className={styles.paymentStatusChip} style={{ color: sc.color, background: sc.bg, borderColor: sc.border }}>{pmt.status}</span></div><div className={styles.paymentMeta}><span>📅 Due: {pmt.dueDate}</span>{pmt.paidAt && <span style={{ color: "#1a7a4a" }}>✓ Paid: {pmt.paidAt}</span>}</div></div><div className={styles.paymentAmount}>₱{pmt.amount.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2, })}</div></div>); })}</div>)}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          <div className={styles.card}>
            <div className={styles.cardTitle}>Lease Extension Requests {pendingExtensions.length > 0 && <span className={styles.requestsBadge}>{pendingExtensions.length} pending</span>}</div>
            {leaseExtLoading && <div className={styles.requestsLoading}>Loading extension requests…</div>}
            {!leaseExtLoading && leaseExtensions.length === 0 && <div className={styles.requestsEmpty}><span className={styles.requestsEmptyIcon}>📋</span><p>No lease extension requests from the tenant yet.</p></div>}
            {extActionError && <div style={{ padding: "10px 14px", marginBottom: "12px", borderRadius: "10px", background: "rgba(192,57,43,0.06)", border: "1px solid rgba(192,57,43,0.2)", color: "#c0392b", fontSize: "13px", fontWeight: 600, }}>⚠ {extActionError}</div>}
            {!leaseExtLoading && leaseExtensions.length > 0 && (<div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>{leaseExtensions.map((ext) => { const isPending = ext.status === "PENDING"; const isApproved = ext.status === "APPROVED"; const isLoading = extActionSubmitting && extActionId === ext.id; const color = isApproved ? "#1a7a4a" : ext.status === "REJECTED" ? "#c0392b" : "#b78e42"; const bg = isApproved ? "rgba(26,122,74,0.06)" : ext.status === "REJECTED" ? "rgba(192,57,43,0.06)" : "rgba(183,142,66,0.06)"; const border = isApproved ? "rgba(26,122,74,0.18)" : ext.status === "REJECTED" ? "rgba(192,57,43,0.18)" : "rgba(183,142,66,0.18)"; return (<div key={ext.id} style={{ padding: "14px 16px", borderRadius: "12px", background: bg, border: `1px solid ${border}`, transition: "box-shadow 0.15s", }}><div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}><div style={{ flex: 1 }}><div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}><span style={{ fontWeight: 700, fontSize: "15px", color: "#1e293b" }}>+{ext.requestedMonths} month{ext.requestedMonths !== 1 ? "s" : ""} requested</span><span style={{ fontSize: "11px", fontWeight: 700, padding: "2px 10px", borderRadius: "20px", color, background: bg, border: `1px solid ${border}`, }}>{isPending ? "⏳ Pending" : isApproved ? "✓ Approved" : "✕ Rejected"}</span></div>{ext.reason && (<div style={{ marginTop: "6px", fontSize: "13px", color: "#64748b", fontStyle: "italic" }}>"{ext.reason}"</div>)}<div style={{ marginTop: "4px", fontSize: "11px", color: "#94a3b8" }}>Requested {formatDate(ext.createdAt)}</div></div>{isPending && (<div style={{ display: "flex", gap: "8px", flexShrink: 0 }}><button type="button" disabled={isLoading} onClick={() => handleExtensionRespond(ext.id, "REJECTED")} style={{ padding: "7px 14px", borderRadius: "9px", fontWeight: 700, fontSize: "13px", cursor: isLoading ? "not-allowed" : "pointer", opacity: isLoading ? 0.6 : 1, background: "rgba(192,57,43,0.07)", border: "1.5px solid rgba(192,57,43,0.22)", color: "#c0392b", transition: "background 0.15s", }}>{isLoading ? "…" : "✕ Reject"}</button><button type="button" disabled={isLoading} onClick={() => handleExtensionRespond(ext.id, "APPROVED")} style={{ padding: "7px 14px", borderRadius: "9px", fontWeight: 700, fontSize: "13px", cursor: isLoading ? "not-allowed" : "pointer", opacity: isLoading ? 0.6 : 1, background: "rgba(26,122,74,0.09)", border: "1.5px solid rgba(26,122,74,0.25)", color: "#1a7a4a", transition: "background 0.15s", }}>{isLoading ? "…" : "✓ Approve"}</button></div>)}</div></div>); })}</div>)}
          </div>

          <div className={styles.card}>
            <div className={styles.cardTitle}>Tenant Reviews {avgRating && <span className={styles.reviewsAvgBadge}>★ {avgRating} · {reviews.length} review{reviews.length !== 1 ? "s" : ""}</span>}</div>
            {reviewsLoading && <div className={styles.requestsLoading}>Loading reviews…</div>}
            {!reviewsLoading && reviews.length === 0 && <div className={styles.requestsEmpty}><span className={styles.requestsEmptyIcon}>⭐</span><p>No reviews yet for this property.</p></div>}
            {!reviewsLoading && reviews.length > 0 && (
              <>
                <div className={styles.reviewRatingBreakdown}><div className={styles.reviewRatingBig}><span className={styles.reviewRatingNumber}>{avgRating}</span><div className={styles.reviewRatingStars}>{[1, 2, 3, 4, 5].map((s) => (<span key={s} style={{ color: s <= Math.round(parseFloat(avgRating!)) ? "#f59e0b" : "#e2e8f0", fontSize: "20px", }}>★</span>))}</div><span className={styles.reviewRatingCount}>{reviews.length} review{reviews.length !== 1 ? "s" : ""}</span></div><div className={styles.reviewRatingBars}>{[5, 4, 3, 2, 1].map((star) => { const count = reviews.filter((r) => r.rating === star).length; const pct = reviews.length > 0 ? Math.round((count / reviews.length) * 100) : 0; return (<div key={star} className={styles.reviewRatingBarRow}><span className={styles.reviewRatingBarLabel}>{star}★</span><div className={styles.reviewRatingBarTrack}><div className={styles.reviewRatingBarFill} style={{ width: `${pct}%` }} /></div><span className={styles.reviewRatingBarCount}>{count}</span></div>); })}</div></div>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "16px" }}>{reviews.map((rev) => (<div key={rev.id} className={styles.reviewItem}><div className={styles.reviewItemHeader}><div className={styles.reviewItemAvatar}>{rev.tenantAvatarUrl ? <img src={rev.tenantAvatarUrl} alt={rev.tenantName} /> : <span>{rev.tenantName.charAt(0).toUpperCase()}</span>}</div><div className={styles.reviewItemMeta}><span className={styles.reviewItemName}>{rev.tenantName}</span><span className={styles.reviewItemDate}>{formatDate(rev.createdAt)}</span></div><div className={styles.reviewItemStars}>{[1, 2, 3, 4, 5].map((s) => (<span key={s} style={{ color: s <= rev.rating ? "#f59e0b" : "#e2e8f0", fontSize: "15px", }}>★</span>))}</div></div>{rev.comment && (<p className={styles.reviewItemComment}>{rev.comment}</p>)}</div>))}</div>
              </>
            )}
          </div>

          <div className={styles.card}>
            <div className={styles.cardTitle}>Location</div>
            <div className={`${styles.field} ${styles.fieldFull}`} style={{ marginBottom: "20px" }}>
              <label className={styles.fieldLabel}>Address / Location <span className={styles.fieldRequired}>*</span></label>
              <input type="text" className={styles.fieldInput} placeholder="e.g. Lahug, Cebu City" value={location} onChange={(e) => setLocation(e.target.value)} required />
            </div>
            <div className={styles.mapSearchWrap}>
              <input type="text" className={styles.mapSearchInput} placeholder="Search on map…" value={mapQuery} onChange={(e) => setMapQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleMapSearch())} />
              <button type="button" className={styles.mapSearchBtn} onClick={handleMapSearch} disabled={mapSearching || !mapQuery.trim()}>{mapSearching ? "Searching…" : "🔍 Find"}</button>
            </div>
            {mapError && <p style={{ color: "#c0392b", fontSize: "13px", marginBottom: "10px" }}>⚠ {mapError}</p>}
            <div className={styles.mapFrame}>{mapCoords ? <iframe src={buildMapSrc(mapCoords)} title="Property location" loading="lazy" referrerPolicy="no-referrer" /> : <div className={styles.mapPlaceholder}><div className={styles.mapPlaceholderIcon}>🗺️</div><span>Search an address above to pin it on the map</span></div>}</div>
            {mapCoords && (<div className={styles.mapCoordsBadge}><span className={styles.mapCoordsIcon}>📍</span>{mapCoords.lat.toFixed(5)}, {mapCoords.lon.toFixed(5)}</div>)}
          </div>

          <div className={styles.card}>
            <div className={styles.cardTitle}>Photos ({totalPhotos}/10)</div>
            <div className={styles.photoTip}><span className={styles.photoTipIcon}>💡</span><div><div className={styles.photoTipTitle}>Improve your chances of approval</div><div className={styles.photoTipBody}>Include clear photos of the actual property and supporting documents such as your <strong>business permit</strong> or <strong>barangay certificate</strong>.</div></div></div>
            <div className={styles.thumbnailNote}>🖼 The <strong>last photo uploaded</strong> will be used as the listing thumbnail.</div>
            {visibleExisting.length > 0 && (<div className={styles.existingImagesWrap}><p className={styles.existingImagesLabel}>Current photos — click to preview</p><div className={styles.imagePreviewGrid}>{visibleExisting.map((img, idx) => (<div key={img.id} className={styles.imagePreviewWrap}><img src={img.imageUrl} alt="Existing" className={`${styles.imagePreview} ${styles.imagePreviewClickable}`} onClick={() => openLightbox(existingSrcs, idx)} /><button type="button" className={styles.imagePreviewRemove} onClick={(e) => { e.stopPropagation(); removeExistingImage(img.id); }} aria-label="Remove image">✕</button></div>))}</div></div>)}
            {totalPhotos < 10 && (<div className={`${styles.imageUploadArea} ${dragOver ? styles.imageUploadAreaActive : ""}`} onClick={() => fileInputRef.current?.click()} onDragOver={(e) => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={(e) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }} style={{ marginTop: visibleExisting.length > 0 ? "16px" : "0" }}><input ref={fileInputRef} type="file" accept="image/*" multiple className={styles.imageUploadInput} onChange={(e) => addFiles(e.target.files)} /><div className={styles.imageUploadIcon}>📸</div><div className={styles.imageUploadTitle}>{newImageFiles.length > 0 ? `${newImageFiles.length} new photo${newImageFiles.length > 1 ? "s" : ""} selected` : "Click or drag to add more photos"}</div><div className={styles.imageUploadSub}>JPG, PNG, WEBP · Max 5MB each · Up to {10 - visibleExisting.length} more</div></div>)}
            {newImagePreviews.length > 0 && (<div className={styles.imagePreviewGrid} style={{ marginTop: "12px" }}>{newImagePreviews.map((src, i) => (<div key={i} className={styles.imagePreviewWrap}><img src={src} alt={`New ${i + 1}`} className={`${styles.imagePreview} ${styles.imagePreviewClickable}`} onClick={() => openLightbox(newImagePreviews, i)} /><div className={styles.imagePreviewNewBadge}>New</div><button type="button" className={styles.imagePreviewRemove} onClick={(e) => { e.stopPropagation(); removeNewImage(i); }} aria-label="Remove image">✕</button></div>))}</div>)}
          </div>

          <div className={styles.card}>
            <div className={styles.cardTitle}>Rental Requests {pendingCount > 0 && <span className={styles.requestsBadge}>{pendingCount} pending</span>}</div>
            {requestsLoading && <div className={styles.requestsLoading}>Loading requests…</div>}
            {!requestsLoading && requestsError && <div className={styles.requestsError}>⚠ {requestsError}</div>}
            {!requestsLoading && !requestsError && requests.length === 0 && <div className={styles.requestsEmpty}><span className={styles.requestsEmptyIcon}>📭</span><p>No rental requests yet for this property.</p></div>}
            {!requestsLoading && !requestsError && requests.length > 0 && (<div className={styles.yearAccordionList}>{requestYears.map((year) => { const yearReqs = requestsByYear[year]; const isOpen = openRequestYears.has(year); const yearPending = yearReqs.filter((r) => r.status === "PENDING").length; return (<div key={year} className={styles.yearAccordion}><button type="button" className={styles.yearAccordionHeader} onClick={() => toggleRequestYear(year)}><span className={styles.yearAccordionChevron}>{isOpen ? "▾" : "▸"}</span><span className={styles.yearAccordionLabel}>{year}</span><span className={styles.yearAccordionMeta}>{yearReqs.length} request{yearReqs.length !== 1 ? "s" : ""}{yearPending > 0 && (<span style={{ color: "#b78e42" }}> · {yearPending} pending</span>)}</span></button>{isOpen && (<div className={styles.yearAccordionBody}><div className={styles.requestsList}>{yearReqs.map((req) => { const isPending = req.status === "PENDING"; return (<div key={req.id} className={styles.requestRow}><div className={styles.requestAvatar}>{req.tenantName?.charAt(0).toUpperCase()}</div><div className={styles.requestInfo}><div className={styles.requestName}>{req.tenantName}</div><div className={styles.requestMeta}><span>✉️ {req.tenantEmail}</span><span>📅 Move in: {req.startDate}</span><span>🗓 {req.leaseDurationMonths} month{req.leaseDurationMonths !== 1 ? "s" : ""}</span><span>🕐 {timeAgo(req.createdAt)}</span></div></div><div className={styles.requestRight}><span className={styles.requestStatus} style={{ color: statusColor(req.status), borderColor: statusColor(req.status) }}>{req.status}</span>{isPending && (<div className={styles.requestActions}><button type="button" className={styles.requestRejectBtn} onClick={() => openAction(req, "REJECTED")}>✕ Reject</button><button type="button" className={styles.requestApproveBtn} onClick={() => openAction(req, "APPROVED")}>✓ Approve</button></div>)}</div></div>); })}</div></div>)}</div>); })}</div>)}
          </div>

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