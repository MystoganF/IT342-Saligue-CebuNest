import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate, useParams, useSearchParams, useOutletContext } from "react-router-dom";
import { rentalsApi } from "./rentals.api";
import styles from "./rental_detail.module.css";

// ─── Interfaces ─────────────────────────────────────────────────────────────
interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  avatarUrl?: string | null;
}

interface PropertyImage { imageUrl: string; }

interface Property {
  id: number;
  title: string;
  description: string;
  price: number;
  location: string;
  type: string;
  status: string;
  beds: number | null;
  baths: number | null;
  sqm: number | null;
  ownerName: string;
  ownerEmail: string;
  ownerFacebookUrl?: string | null;
  ownerInstagramUrl?: string | null;
  ownerTwitterUrl?: string | null;
  images: PropertyImage[];
}

interface Payment {
  id: number;
  installmentNumber: number;
  amount: number;
  dueDate: string;
  paidAt: string | null;
  status: "PENDING" | "PAID" | "OVERDUE" | "CANCELLED" | "FAILED";
  checkoutUrl: string | null;
  paymongoPaymentId: string | null;
}

interface RentalRequest {
  id: number;
  propertyId: number;
  propertyTitle: string;
  propertyLocation: string;
  propertyPrice: number;
  propertyImage: string | null;
  ownerId: number;
  ownerName: string;
  ownerEmail: string;
  ownerFacebookUrl?: string | null;
  ownerInstagramUrl?: string | null;
  ownerTwitterUrl?: string | null;
  startDate: string;
  leaseDurationMonths: number;
  status: string;
  createdAt: string;
}

interface Review {
  id: number;
  tenantId: number;
  tenantName: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  tenantAvatarUrl?: string | null;
}

interface LeaseExtension {
  id: number;
  requestedMonths: number;
  reason: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────────
function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

function formatReviewDate(isoStr: string | null | undefined): string {
  if (!isoStr) return "—";
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
}

function formatPrice(n: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency", currency: "PHP",
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(n);
}

function formatDate(d: string | null | undefined) {
  if (!d) return "—";
  const date = new Date(d);
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
}


function geocodeUrl(location: string) {
  return `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json&limit=1`;
}

function mapSrc(lat: number, lon: number) {
  return `https://www.openstreetmap.org/export/embed.html?bbox=${lon - 0.01},${lat - 0.01},${lon + 0.01},${lat + 0.01}&layer=mapnik&marker=${lat},${lon}`;
}

// ─── Sub-Components ────────────────────────────────────────────────────────
const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);
const InstagramIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);
const TwitterIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const StarPicker: React.FC<{ value: number; onChange: (v: number) => void }> = ({ value, onChange }) => {
  const [hovered, setHovered] = useState(0);
  return (
    <div className={styles.starPicker}>
      {[1, 2, 3, 4, 5].map((s) => (
        <button key={s} type="button"
          className={`${styles.starBtn} ${s <= (hovered || value) ? styles.starBtnFilled : ""}`}
          onMouseEnter={() => setHovered(s)} onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(s)} aria-label={`Rate ${s} star${s > 1 ? "s" : ""}`}>★</button>
      ))}
      {value > 0 && <span className={styles.starLabel}>{["", "Poor", "Fair", "Good", "Very Good", "Excellent"][value]}</span>}
    </div>
  );
};

const StarDisplay: React.FC<{ rating: number; size?: number }> = ({ rating, size = 16 }) => (
  <span className={styles.starDisplay} style={{ fontSize: size }}>
    {[1, 2, 3, 4, 5].map((s) => (
      <span key={s} className={s <= rating ? styles.starFilled : styles.starEmpty}>★</span>
    ))}
  </span>
);

// ─── Main Component ────────────────────────────────────────────────────────
const RentalDetail: React.FC = () => {
  const navigate = useNavigate();
  const { requestId } = useParams<{ requestId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  const { user } = useOutletContext<{ user: User }>();

  // ── Core States ──
  const [request, setRequest]   = useState<RentalRequest | null>(null);
  const [property, setProperty] = useState<Property | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  const [activeImg, setActiveImg] = useState(0);
  const [mapCoords, setMapCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [mapLoading, setMapLoading] = useState(false);
  const [initiating, setInitiating] = useState<number | null>(null);

  const [verifyBanner, setVerifyBanner] = useState<{ state: "verifying" | "success" | "error"; text: string; } | null>(null);
  const autoVerifyAttempted = useRef(false);
  const overdueNotifiedRef = useRef(false);
  const paymentSectionRef = useRef<HTMLDivElement>(null);

  // ── Dropdown & Receipt States ──
  const [expandedYears, setExpandedYears]         = useState<Record<string, boolean>>({});
  const [historyExpanded, setHistoryExpanded]     = useState(false);
  const [extensionExpanded, setExtensionExpanded] = useState(false);
  const [viewingReceiptId, setViewingReceiptId]   = useState<number | null>(null);

  // ── Review states ──
  const [allReviews, setAllReviews]         = useState<Review[]>([]);
  const [existingReview, setExistingReview] = useState<Review | null>(null);
  const [reviewRating, setReviewRating]     = useState(0);
  const [reviewComment, setReviewComment]   = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewMsg, setReviewMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  // ── Lazy Loading Reviews Modal State ──
  const [modalFilterRating, setModalFilterRating] = useState<number | null>(null);
  const [isFetchingModal, setIsFetchingModal]     = useState(false);
  const [modalReviews, setModalReviews]           = useState<Review[]>([]);

  // ── Lease extension states ──
  const [extensions, setExtensions]               = useState<LeaseExtension[]>([]);
  const [extMonths, setExtMonths]                 = useState(1);
  const [extReason, setExtReason]                 = useState("");
  const [extSubmitting, setExtSubmitting]         = useState(false);
  const [extMsg, setExtMsg]                       = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showExtForm, setShowExtForm]             = useState(false);

  // ── Fetch everything ──────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    if (!requestId) return;
    setLoading(true);
    setError(null);
    setReviewsLoading(true);

    try {
      const reqData = await rentalsApi.getMyRentalRequests();
      if (!reqData.success) throw new Error("Failed to load rental.");

      const found: RentalRequest = (reqData.data.requests ?? []).find(
        (r: RentalRequest) => r.id === parseInt(requestId)
      );
      if (!found) throw new Error("Rental request not found.");
      setRequest(found);

      const promises: Promise<void>[] = [];

      promises.push(
        rentalsApi.getPropertyById(found.propertyId)
          .then((d) => { if (d.success) setProperty(d.data.property); })
          .catch(() => {})
      );

      if (found.status === "CONFIRMED" || found.status === "COMPLETED") {
        promises.push(
          rentalsApi.getPaymentsForRequest(found.id)
            .then((d) => {
              if (d.success) {
                const fetched: Payment[] = d.data.payments ?? [];
                setPayments(fetched);
                const years = new Set(fetched.map((p) => {
                  if (!p.dueDate) return "Unknown";
                  const dt = new Date(p.dueDate);
                  return isNaN(dt.getTime()) ? "Unknown" : dt.getFullYear().toString();
                }));
                const initial: Record<string, boolean> = {};
                years.forEach((y) => { initial[y] = false; });
                setExpandedYears(initial);

                const stale = fetched.find((p) => p.paymongoPaymentId !== null && p.status !== "PAID" && p.status !== "FAILED");
                if (stale) {
                  rentalsApi.cancelPayment(stale.id)
                    .then((cancelData) => {
                      if (cancelData.success) {
                        setPayments((prev) => prev.map((p) => p.id === stale.id ? { ...p, checkoutUrl: null, paymongoPaymentId: null } : p));
                      }
                    }).catch(() => {});
                }
              }
            })
            .catch(() => {})
        );

        promises.push(
          rentalsApi.getLeaseExtensions(found.id)
            .then((d) => { if (d.success) setExtensions(d.data.extensionRequests ?? []); })
            .catch(() => {})
        );

        promises.push(
          rentalsApi.getPropertyReviews(found.propertyId)
            .then((d) => {
              if (d.success) {
                const fetchedReviews = d.data.reviews ?? [];
                setAllReviews(fetchedReviews);
                const mine = fetchedReviews.find(
                  (r: Review & { rentalRequestId: number }) => r.tenantId === user.id && r.rentalRequestId === found.id
                );
                if (mine) {
                  setExistingReview(mine);
                  setReviewRating(mine.rating);
                  setReviewComment(mine.comment ?? "");
                }
              }
            })
            .catch(() => {})
        );
      }

      await Promise.all(promises);

    } catch (err: any) {
      setError(err.message || "Unable to load rental details.");
    } finally {
      setLoading(false);
      setReviewsLoading(false);
    }
  }, [requestId, user.id]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Show overdue banner once when payments load ───────────────────────────
  useEffect(() => {
    if (!payments.length || overdueNotifiedRef.current) return;
    const overduePayments = payments.filter(p => p.status === "OVERDUE");
    if (overduePayments.length > 0) {
      overdueNotifiedRef.current = true;
      setVerifyBanner({
        state: "error",
        text: `⚠ You have ${overduePayments.length} overdue payment${overduePayments.length > 1 ? "s" : ""}. Please settle your balance as soon as possible.`,
      });
    }
  }, [payments]);

  // ── Payment verify & redirect handling ───────────────────────────────────
  useEffect(() => {
    const paymentIdParam = searchParams.get("payment_id");
    const paymentStatus  = searchParams.get("payment");
    if (!paymentIdParam || !paymentStatus || autoVerifyAttempted.current) return;
    autoVerifyAttempted.current = true;
    setSearchParams({}, { replace: true });

    const paymentId = parseInt(paymentIdParam, 10);
    if (isNaN(paymentId)) return;

    setTimeout(() => { paymentSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }, 400);

    if (paymentStatus === "cancelled") {
      setVerifyBanner({ state: "error", text: "Payment was cancelled. You can try again whenever you're ready." });
      rentalsApi.cancelPayment(paymentId)
        .then((data) => {
          if (data.success) {
            setPayments((prev) => prev.map((p) => p.id === paymentId ? { ...p, checkoutUrl: null, paymongoPaymentId: null } : p));
          }
        }).catch(() => {});
      return;
    }

    if (paymentStatus === "failed") {
      setVerifyBanner({ state: "error", text: "Your payment failed or was declined. Please try again." });
      rentalsApi.failPayment(paymentId)
        .then((data) => {
          if (data.success) {
            setPayments((prev) => prev.map((p) => p.id === paymentId ? { ...p, status: "FAILED", checkoutUrl: null, paymongoPaymentId: null } : p));
          }
        }).catch(() => {});
      return;
    }

    if (paymentStatus === "success") {
      setVerifyBanner({ state: "verifying", text: "Verifying your payment with PayMongo…" });
      rentalsApi.verifyPayment(paymentId)
        .then((data) => {
          if (!data.success) { setVerifyBanner({ state: "error", text: data?.error?.message ?? "Verification failed." }); return; }
          const updated: Payment = data.data.payment;
          if (updated.status === "PAID") {
            setVerifyBanner({ state: "success", text: `Month ${updated.installmentNumber} payment of ${formatPrice(updated.amount)} confirmed! ✓` });
            setPayments((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
          } else {
            setVerifyBanner({ state: "error", text: "Payment not yet confirmed by PayMongo. It may take a moment — please refresh." });
          }
        }).catch(() => { setVerifyBanner({ state: "error", text: "Network error during verification. Please refresh." }); });
    }
  }, [searchParams, setSearchParams]);

  // ── Map ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!property?.location) return;
    setMapLoading(true);
    fetch(geocodeUrl(property.location), { headers: { "Accept-Language": "en" } })
      .then((r) => r.json())
      .then((data) => { if (data.length > 0) setMapCoords({ lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) }); })
      .catch(() => {})
      .finally(() => setMapLoading(false));
  }, [property?.location]);

  // ── Pay now ───────────────────────────────────────────────────────────────
  const handlePay = async (paymentId: number) => {
    setInitiating(paymentId);
    try {
      const data = await rentalsApi.initiatePayment(paymentId);
      if (!data.success) { setVerifyBanner({ state: "error", text: data?.error?.message ?? "Failed to create payment link." }); return; }
      if (data.data.payment.checkoutUrl) window.location.href = data.data.payment.checkoutUrl;
    } catch { setVerifyBanner({ state: "error", text: "Network error. Please try again." }); }
    finally { setInitiating(null); }
  };

  // ── Reset Expired Paymongo Link ───────────────────────────────────────────
  const handleResetPayment = async (paymentId: number) => {
    setInitiating(paymentId);
    try {
      await rentalsApi.cancelPayment(paymentId);
      setPayments(prev => prev.map(p => p.id === paymentId ? { ...p, checkoutUrl: null, paymongoPaymentId: null } : p));
      const data = await rentalsApi.initiatePayment(paymentId);
      if (data.success && data.data.payment.checkoutUrl) window.location.href = data.data.payment.checkoutUrl;
    } catch {
      setVerifyBanner({ state: "error", text: "Failed to reset link. Please try again." });
      setInitiating(null);
    }
  };

  // ── Review submit ─────────────────────────────────────────────────────────
  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!request) return;
    if (reviewRating === 0) { setReviewMsg({ type: "error", text: "Please select a star rating." }); return; }
    setReviewSubmitting(true); setReviewMsg(null);
    try {
      const data = await rentalsApi.submitPropertyReview({
        rentalRequestId: request.id,
        rating: reviewRating,
        comment: reviewComment.trim() || null
      });
      if (!data.success) { setReviewMsg({ type: "error", text: data?.error?.message ?? "Failed to submit review." }); return; }
      const newReview = data.data.review;
      setExistingReview(newReview);
      setAllReviews(prev => [newReview, ...prev]);
      setReviewMsg({ type: "success", text: "Review submitted! Thank you for your feedback." });
    } catch { setReviewMsg({ type: "error", text: "Network error. Please try again." }); }
    finally { setReviewSubmitting(false); }
  };

  // ── Reviews Modal ─────────────────────────────────────────────────────────
  const openReviewModal = (rating: number) => {
    setModalFilterRating(rating);
    setIsFetchingModal(true);
    setTimeout(() => {
      setModalReviews(rating === 0 ? allReviews : allReviews.filter(r => r.rating === rating));
      setIsFetchingModal(false);
    }, 600);
  };

  const closeReviewModal = () => {
    setModalFilterRating(null);
    setModalReviews([]);
  };

  // ── Lease extension submit ────────────────────────────────────────────────
  const handleExtensionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!request) return;
    setExtSubmitting(true); setExtMsg(null);
    try {
      const data = await rentalsApi.submitLeaseExtension({
        rentalRequestId: request.id,
        requestedMonths: extMonths,
        reason: extReason.trim() || null
      });
      if (!data.success) { setExtMsg({ type: "error", text: data?.error?.message ?? "Failed to submit request." }); return; }
      const newExt: LeaseExtension = data.data.extensionRequest;
      setExtensions((prev) => [newExt, ...prev]);
      setExtMsg({ type: "success", text: `Extension request for ${extMonths} month(s) sent to the owner!` });
      setShowExtForm(false);
      setExtMonths(1);
      setExtReason("");
    } catch {
      setExtMsg({ type: "error", text: "Network error. Please try again." });
    } finally {
      setExtSubmitting(false);
    }
  };

  const toggleYear = (year: string) =>
    setExpandedYears((prev) => ({ ...prev, [year]: !prev[year] }));

  // ── Derived ───────────────────────────────────────────────────────────────
  const { paymentsByYear, nextPayablePaymentId } = useMemo(() => {
    if (!payments.length) return { paymentsByYear: {}, nextPayablePaymentId: null };
    const grouped = payments.reduce((acc, p) => {
      if (!p.dueDate) return acc;
      const d = new Date(p.dueDate);
      const year = isNaN(d.getTime()) ? "Unknown" : d.getFullYear().toString();
      if (!acc[year]) acc[year] = [];
      acc[year].push(p);
      return acc;
    }, {} as Record<string, Payment[]>);

    const unpaid = payments
      .filter((p) => p.status === "PENDING" || p.status === "OVERDUE" || p.status === "FAILED")
      .sort((a, b) => a.installmentNumber - b.installmentNumber);
    return { paymentsByYear: grouped, nextPayablePaymentId: unpaid.length > 0 ? unpaid[0].id : null };
  }, [payments]);

  const paidCount    = payments.filter((p) => p.status === "PAID").length;
  const totalCount   = payments.length;
  const totalAmount  = payments.reduce((s, p) => s + p.amount, 0);
  const paidAmount   = payments.filter((p) => p.status === "PAID").reduce((s, p) => s + p.amount, 0);
  const progressPct  = totalCount > 0 ? Math.round((paidCount / totalCount) * 100) : 0;
  const nextDue      = payments.find((p) => p.status === "PENDING" || p.status === "OVERDUE" || p.status === "FAILED");
  const canReview    = request?.status === "CONFIRMED" || request?.status === "COMPLETED";
  const isConfirmed  = request?.status === "CONFIRMED";
  const hasPendingExt = extensions.some((e) => e.status === "PENDING");
  const activeReceipt = viewingReceiptId ? payments.find((p) => p.id === viewingReceiptId) : null;

  const averageRating = allReviews.length > 0
    ? allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length
    : 0;

  if (loading) return (
    <div className={styles.page}>
      <div className={styles.loadingWrap}><div className={styles.loadingSpinner} /><p>Loading rental details…</p></div>
    </div>
  );

  if (error || !request) return (
    <div className={styles.page}>
      <div className={styles.errorWrap}>
        <span>🏚️</span><h2>Not Found</h2>
        <p>{error ?? "This rental doesn't exist."}</p>
        <button onClick={() => navigate("/my-rentals")} type="button">← Back to My Rentals</button>
      </div>
    </div>
  );

  const images = property?.images ?? [];

  return (
    <div className={styles.page}>

      <div className={styles.backBar}>
        <button className={styles.backBtn} onClick={() => navigate("/my-rentals")} type="button">
          ← Back to My Rentals
        </button>
      </div>

      <div className={styles.main}>
        {/* ══ LEFT ══ */}
        <div className={styles.leftCol}>

          {/* Gallery */}
          <div className={styles.gallery}>
            <div className={styles.galleryMain}>
              {images.length > 0 ? (
                <img src={images[activeImg].imageUrl} alt={property?.title} className={styles.galleryImg} />
              ) : (
                <div className={styles.galleryPlaceholder}><span>🏠</span><span>No photos available</span></div>
              )}
              {images.length > 1 && (
                <>
                  <button className={`${styles.galleryNav} ${styles.galleryNavPrev}`}
                    onClick={() => setActiveImg((i) => (i === 0 ? images.length - 1 : i - 1))} type="button">‹</button>
                  <button className={`${styles.galleryNav} ${styles.galleryNavNext}`}
                    onClick={() => setActiveImg((i) => (i === images.length - 1 ? 0 : i + 1))} type="button">›</button>
                  <span className={styles.galleryCounter}>{activeImg + 1} / {images.length}</span>
                </>
              )}
            </div>
            {images.length > 1 && (
              <div className={styles.galleryThumbs}>
                {images.map((img, i) => (
                  <div key={i}
                    className={`${styles.galleryThumb} ${i === activeImg ? styles.galleryThumbActive : ""}`}
                    onClick={() => setActiveImg(i)}>
                    <img src={img.imageUrl} alt={`Thumb ${i + 1}`} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Property Info */}
          <div className={styles.infoCard}>
            <div className={styles.infoHeader}>
              <div>
                <h1 className={styles.infoTitle}>{property?.title ?? request.propertyTitle}</h1>
                <div className={styles.infoLocation}>📍 {property?.location ?? request.propertyLocation}</div>
              </div>
              <div className={styles.infoBadges}>
                {property?.type && <span className={styles.typeBadge}>{property.type}</span>}
              </div>
            </div>

            {property && (property.beds || property.baths || property.sqm) && (
              <div className={styles.infoStats}>
                {property.beds  != null && <div className={styles.infoStat}><span>🛏️</span><strong>{property.beds}</strong><small>Beds</small></div>}
                {property.baths != null && <div className={styles.infoStat}><span>🚿</span><strong>{property.baths}</strong><small>Baths</small></div>}
                {property.sqm   != null && <div className={styles.infoStat}><span>📐</span><strong>{property.sqm}</strong><small>sqm</small></div>}
              </div>
            )}

            {property?.description && (
              <><div className={styles.divider} /><div className={styles.descLabel}>About this property</div>
                <p className={styles.desc}>{property.description}</p></>
            )}

            <div className={styles.divider} />
            <div className={styles.ownerRow} style={{ display: "flex", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "16px", flex: 1 }}>
                <div className={styles.ownerAvatar}>{request.ownerName?.charAt(0)?.toUpperCase() || "?"}</div>
                <div>
                  <div style={{ textTransform: "uppercase", letterSpacing: "1px", fontSize: "0.8rem", color: "#64748b", fontWeight: "600", marginBottom: "4px" }}>Listed by</div>
                  <div style={{ fontWeight: "bold", fontSize: "1.1rem", color: "#0f172a" }}>{request.ownerName}</div>
                </div>
              </div>
              {(request.ownerFacebookUrl || request.ownerInstagramUrl || request.ownerTwitterUrl) && (
                <div style={{ display: "flex", gap: "10px" }}>
                  {request.ownerFacebookUrl && (
                    <a href={request.ownerFacebookUrl} target="_blank" rel="noopener noreferrer"
                      style={{ backgroundColor: "#e8f0fe", color: "#1877F2", width: "42px", height: "42px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none" }} aria-label="Facebook"><FacebookIcon /></a>
                  )}
                  {request.ownerInstagramUrl && (
                    <a href={request.ownerInstagramUrl} target="_blank" rel="noopener noreferrer"
                      style={{ backgroundColor: "#fceef3", color: "#E4405F", width: "42px", height: "42px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none" }} aria-label="Instagram"><InstagramIcon /></a>
                  )}
                  {request.ownerTwitterUrl && (
                    <a href={request.ownerTwitterUrl} target="_blank" rel="noopener noreferrer"
                      style={{ backgroundColor: "#eef1f4", color: "#0f1419", width: "42px", height: "42px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none", border: "1px solid #d5d9dc" }} aria-label="X (Twitter)"><TwitterIcon /></a>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* User Review Form Card */}
          {canReview && (
            <div className={styles.reviewCard}>
              <div className={styles.reviewCardTitle}><span>⭐</span> Rate This Property</div>
              {existingReview ? (
                <div className={styles.reviewSubmitted}>
                  <div className={styles.reviewSubmittedBadge}>✓ Review Submitted</div>
                  <StarDisplay rating={existingReview.rating} />
                  {existingReview.comment && <p className={styles.reviewSubmittedComment}>"{existingReview.comment}"</p>}
                  <span className={styles.reviewSubmittedDate}>Submitted on {formatDate(existingReview.createdAt)}</span>
                </div>
              ) : (
                <form onSubmit={handleReviewSubmit} className={styles.reviewForm}>
                  <div className={styles.reviewFormField}>
                    <label className={styles.reviewFormLabel}>Your Rating</label>
                    <StarPicker value={reviewRating} onChange={setReviewRating} />
                  </div>
                  <div className={styles.reviewFormField}>
                    <label className={styles.reviewFormLabel}>Comment <span className={styles.reviewOptional}>(optional)</span></label>
                    <textarea className={styles.reviewTextarea} value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      placeholder="Share your experience with this property…" rows={4} maxLength={500} />
                    <span className={styles.reviewCharCount}>{reviewComment.length}/500</span>
                  </div>
                  {reviewMsg && (
                    <div className={`${styles.reviewMsg} ${reviewMsg.type === "success" ? styles.reviewMsgSuccess : styles.reviewMsgError}`}>
                      {reviewMsg.type === "success" ? "✓" : "⚠"} {reviewMsg.text}
                    </div>
                  )}
                  <button type="submit" className={styles.reviewSubmitBtn} disabled={reviewSubmitting}>
                    {reviewSubmitting ? <><span className={styles.reviewSpinner} /> Submitting…</> : "Submit Review"}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Public Reviews Summary & List */}
          <div className={styles.card} style={{ padding: '28px 32px' }}>
            <div className={styles.cardTitle} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: '20px' }}>
              <div>Tenant Reviews</div>
            </div>

            {reviewsLoading && <div className={styles.requestsLoading}>Loading reviews…</div>}
            {!reviewsLoading && allReviews.length === 0 && <div className={styles.requestsEmpty}><span className={styles.requestsEmptyIcon}>⭐</span><p>No reviews yet for this property.</p></div>}

            {!reviewsLoading && allReviews.length > 0 && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '24px' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '42px', fontWeight: 800, color: '#1f5d71', lineHeight: 1 }}>{averageRating.toFixed(1)}</div>
                    <div style={{ margin: '4px 0' }}>
                      <StarDisplay rating={Math.round(averageRating)} />
                    </div>
                    <div style={{ fontSize: '12px', color: '#6e7071' }}>{allReviews.length} review{allReviews.length !== 1 ? "s" : ""}</div>
                  </div>

                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {[5, 4, 3, 2, 1].map((star) => {
                      const count = allReviews.filter((r) => r.rating === star).length;
                      const pct = allReviews.length > 0 ? Math.round((count / allReviews.length) * 100) : 0;
                      return (
                        <div
                          key={star}
                          onClick={() => openReviewModal(star)}
                          style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px', cursor: 'pointer' }}
                          title={`Click to view all ${star}-star reviews`}
                          onMouseOver={(e) => e.currentTarget.style.opacity = '0.7'}
                          onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
                        >
                          <span style={{ fontWeight: 700, color: '#1f5d71', width: '20px' }}>{star}★</span>
                          <div style={{ flex: 1, height: '8px', background: '#e5eced', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: '#f59e0b', borderRadius: '4px' }} />
                          </div>
                          <span style={{ color: '#6e7071', width: '20px', textAlign: 'right' }}>{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0", borderTop: '1px solid #f0f4f5' }}>
                  {allReviews.slice(0, 2).map((rev) => (
                    <div key={rev.id} className={styles.reviewItem}>
                      <div className={styles.reviewItemHeader}>
                        <div className={styles.reviewAvatar}>
                          {rev.tenantAvatarUrl
                            ? <img src={rev.tenantAvatarUrl} alt={rev.tenantName} className={styles.reviewAvatarImg} />
                            : <span>{getInitials(rev.tenantName)}</span>}
                        </div>
                        <div className={styles.reviewItemMeta}>
                          <span className={styles.reviewItemName}>{rev.tenantName}</span>
                          <span className={styles.reviewItemDate}>{formatDate(rev.createdAt)}</span>
                        </div>
                        <StarDisplay rating={rev.rating} size={15} />
                      </div>
                      {rev.comment && (<p className={styles.reviewItemComment}>{rev.comment}</p>)}
                    </div>
                  ))}
                </div>

                {allReviews.length > 2 && (
                  <button
                    type="button"
                    onClick={() => openReviewModal(0)}
                    style={{
                      marginTop: "16px", width: "100%", padding: "12px",
                      borderRadius: "10px", border: "1.5px solid rgba(83,164,163,0.3)",
                      background: "rgba(83,164,163,0.05)", color: "#1f5d71",
                      fontWeight: "bold", cursor: "pointer", transition: "0.2s"
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.background = "rgba(83,164,163,0.15)")}
                    onMouseOut={(e) => (e.currentTarget.style.background = "rgba(83,164,163,0.05)")}
                  >
                    View All {allReviews.length} Reviews
                  </button>
                )}
              </>
            )}
          </div>

          {/* Map */}
          <div className={styles.mapCard}>
            <div className={styles.mapHeader}>
              <span>🗺️</span>
              <span className={styles.mapTitle}>Location</span>
              <span className={styles.mapAddress}>{property?.location ?? request.propertyLocation}</span>
            </div>
            {mapLoading ? (
              <div className={styles.mapLoading}>📍 Finding location…</div>
            ) : mapCoords ? (
              <iframe className={styles.mapFrame} src={mapSrc(mapCoords.lat, mapCoords.lon)}
                title="Map" loading="lazy" referrerPolicy="no-referrer" />
            ) : (
              <div className={styles.mapLoading}>📍 Map unavailable for this location</div>
            )}
          </div>
        </div>

        {/* ══ RIGHT ══ */}
        <div className={styles.rightCol}>

          {/* Rental Summary */}
          <div className={styles.summaryCard}>
            <div className={styles.summaryPrice}>
              <span className={styles.summaryPriceAmount}>{formatPrice(request.propertyPrice)}</span>
              <span className={styles.summaryPriceLabel}>/ month</span>
            </div>
            <div className={styles.summaryRows}>
              <div className={styles.summaryRow}><span>Status</span><strong>{request.status.replace("_", " ")}</strong></div>
              <div className={styles.summaryRow}><span>Move-in Date</span><strong>{formatDate(request.startDate)}</strong></div>
              <div className={styles.summaryRow}><span>Lease Duration</span><strong>{request.leaseDurationMonths} month{request.leaseDurationMonths !== 1 ? "s" : ""}</strong></div>
              <div className={styles.summaryRow}><span>Total Lease Value</span><strong>{formatPrice(request.propertyPrice * request.leaseDurationMonths)}</strong></div>
              <div className={styles.summaryRow}><span>Submitted</span><strong>{formatDate(request.createdAt)}</strong></div>
            </div>

            {payments.length > 0 && (
              <div className={styles.progressSection}>
                <div className={styles.progressHeader}><span>Payment Progress</span><span>{paidCount}/{totalCount} paid</span></div>
                <div className={styles.progressBar}><div className={styles.progressFill} style={{ width: `${progressPct}%` }} /></div>
                <div className={styles.progressAmounts}>
                  <span className={styles.progressPaid}>{formatPrice(paidAmount)} paid</span>
                  <span className={styles.progressRemaining}>{formatPrice(totalAmount - paidAmount)} remaining</span>
                </div>
                {nextDue && (
                  <div className={`${styles.nextDue} ${nextDue.status === "OVERDUE" ? styles.nextDueOverdue : ""}`}>
  {nextDue.status === "OVERDUE" ? "⚠ Overdue:" : "📅 Next due:"}
                    <strong>{formatDate(nextDue.dueDate)}</strong> — {formatPrice(nextDue.amount)}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Action Dropdowns Container ── */}
          {isConfirmed && payments.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "16px" }} ref={paymentSectionRef}>

              {/* Verify / Overdue Banner */}
              {verifyBanner && (
                <div className={`${styles.verifyBanner} ${styles[`verifyBanner_${verifyBanner.state}`]}`}>
                  <span className={styles.verifyBannerIcon}>
                    {verifyBanner.state === "verifying" && <span className={styles.verifySpinner} />}
                    {verifyBanner.state === "success" && "✓"}
                    {verifyBanner.state === "error" && "⚠"}
                  </span>
                  <span className={styles.verifyBannerText}>{verifyBanner.text}</span>
                  {verifyBanner.state !== "verifying" && (
                    <button className={styles.verifyBannerDismiss} onClick={() => setVerifyBanner(null)} type="button" aria-label="Dismiss">✕</button>
                  )}
                </div>
              )}

              {/* 1. Payment Schedule */}
              <div style={{ border: "1px solid #e2e8f0", borderRadius: "12px", overflow: "hidden", background: "#fff" }}>
                <div style={{ padding: "16px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", fontWeight: "700", color: "#1f5d71" }}>
                  Payment Schedule
                </div>
                <div className={styles.yearAccordionList} style={{ padding: "8px 16px" }}>
                  {Object.keys(paymentsByYear).sort().map((year) => {
                    const isExpanded   = expandedYears[year] === true;
                    const yearPayments = paymentsByYear[year];
                    const schedulePayments = yearPayments.filter(p => p.status !== "PAID");
                    const yearPaid     = yearPayments.filter((p) => p.status === "PAID").length;

                    return (
                      <div key={year} className={styles.yearAccordion}>
                        <button type="button" className={styles.yearAccordionHeader}
                          onClick={() => toggleYear(year)} aria-expanded={isExpanded}>
                          <div className={styles.yearAccordionLeft}>
                            <span className={styles.yearAccordionChevron} style={{ transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)" }}>▼</span>
                            <span className={styles.yearAccordionLabel}>{year}</span>
                            <span className={styles.yearAccordionCount}>{yearPaid}/{yearPayments.length} paid</span>
                          </div>
                          <div className={styles.yearMiniProgress}>
                            <div className={styles.yearMiniProgressFill} style={{ width: `${Math.round((yearPaid / yearPayments.length) * 100)}%` }} />
                          </div>
                        </button>

                        {isExpanded && (
                          <div className={styles.yearAccordionBody}>
                            {schedulePayments.length === 0 ? (
                              <div style={{ padding: "12px 0", color: "#64748b", fontSize: "13px", textAlign: "center" }}>All payments for this year are complete.</div>
                            ) : (
                              schedulePayments.map((p) => {
                                const isNext          = p.id === nextPayablePaymentId;
                                const isLocked        = !isNext;
                                const isActionLoading = initiating === p.id;
                                const isActuallyOverdue = p.status === "OVERDUE";
                                const hasError        = isActuallyOverdue || p.status === "FAILED";

                                return (
                                  <div key={p.id} className={[
                                    styles.paymentRow,
                                    isLocked ? styles.paymentRowLocked : "",
                                    isNext ? styles.paymentRowNext : "",
                                    hasError ? styles.paymentRowOverdue : ""
                                  ].filter(Boolean).join(" ")}>
                                    <div className={styles.paymentRowLeft}>
                                      <div className={[styles.paymentMonthBadge, isNext ? styles.paymentMonthBadgeNext : ""].filter(Boolean).join(" ")}>
                                        {isLocked ? "🔒" : p.installmentNumber}
                                      </div>
                                      <div className={styles.paymentRowInfo}>
                                        <span className={styles.paymentLabel}>Month {p.installmentNumber}</span>
                                        <span className={styles.paymentDates}>Due {formatDate(p.dueDate)}</span>
                                        {/* ── Overdue pill ── */}
                                        {isActuallyOverdue && !isLocked && (
                                          <span className={styles.overduePill}>⚠ Overdue</span>
                                        )}
                                        {p.status === "PENDING" && p.checkoutUrl && !isLocked && (
                                          <div
                                            style={{ fontSize: "11px", color: "#b78e42", textDecoration: "underline", cursor: "pointer", marginTop: "4px" }}
                                            onClick={() => handleResetPayment(p.id)}
                                          >
                                            Link expired? Click to reset
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    <div className={styles.paymentRowRight}>
                                      <span className={styles.paymentAmount}>{formatPrice(p.amount)}</span>
                                      {hasError ? (
                                        <div className={styles.paymentRowActions}>
                                          <span className={`${styles.payStatusBadge} ${styles.payStatusOverdue}`}>
                                            {p.status === "FAILED" ? "Failed" : "Overdue"}
                                          </span>
                                          {isNext && (
                                            <button type="button" className={`${styles.payNowBtn} ${styles.payNowBtnOverdue}`}
                                              onClick={() => handlePay(p.id)} disabled={isActionLoading}>
                                              {isActionLoading ? <span className={styles.payBtnSpinner} /> : "Pay Now"}
                                            </button>
                                          )}
                                        </div>
                                      ) : isLocked ? (
                                        <span className={`${styles.payStatusBadge} ${styles.payStatusLocked}`}>Locked</span>
                                      ) : (
                                        <button type="button" className={styles.payNowBtn}
                                          onClick={() => handlePay(p.id)} disabled={isActionLoading}>
                                          {isActionLoading ? <span className={styles.payBtnSpinner} /> : "Pay Now"}
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 2. Payment History */}
              <div style={{ border: "1px solid #e2e8f0", borderRadius: "12px", overflow: "hidden", background: "#fff" }}>
                <button
                  type="button"
                  onClick={() => setHistoryExpanded(!historyExpanded)}
                  style={{ width: "100%", padding: "16px", display: "flex", justifyContent: "space-between", background: "#f8fafc", border: "none", cursor: "pointer", fontWeight: "700", color: "#1f5d71", fontSize: "15px" }}
                >
                  <span>Payment History</span>
                  <span>{historyExpanded ? "▲" : "▼"}</span>
                </button>

                {historyExpanded && (
                  <div style={{ padding: "0 16px" }}>
                    {payments.filter(p => p.status === "PAID").length === 0 ? (
                      <div style={{ padding: "16px 0", color: "#64748b", fontSize: "14px", textAlign: "center" }}>No past payments found.</div>
                    ) : (
                      payments.filter(p => p.status === "PAID").map((payment) => (
                        <div key={payment.id} style={{ padding: "16px 0", borderTop: "1px solid #f1f5f9" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                              <strong style={{ display: "block", color: "#1e293b", marginBottom: "4px" }}>
                                Month {payment.installmentNumber}
                              </strong>
                              <div style={{ fontSize: "13px", color: "#10b981", fontWeight: "600" }}>✓ Paid on {formatDate(payment.paidAt || payment.dueDate)}</div>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                              <span style={{ fontWeight: "600", color: "#1e293b" }}>{formatPrice(payment.amount)}</span>
                              <button
                                onClick={() => setViewingReceiptId(payment.id)}
                                className={styles.receiptBtn}
                              >
                                Receipt
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* 3. Lease Extension */}
              <div style={{ border: "1px solid #e2e8f0", borderRadius: "12px", overflow: "hidden", background: "#fff" }}>
                <button
                  type="button"
                  onClick={() => setExtensionExpanded(!extensionExpanded)}
                  style={{ width: "100%", padding: "16px", display: "flex", justifyContent: "space-between", background: "#f8fafc", border: "none", cursor: "pointer", fontWeight: "700", color: "#1f5d71", fontSize: "15px" }}
                >
                  <span>Lease Extension Requests</span>
                  <span>{extensionExpanded ? "▲" : "▼"}</span>
                </button>

                {extensionExpanded && (
                  <div style={{ padding: "16px", borderTop: "1px solid #e2e8f0" }}>
                    {extensions.length > 0 && (
                      <div style={{ marginBottom: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
                        {extensions.map((ext) => (
                          <div key={ext.id} style={{
                            padding: "10px 12px", borderRadius: "10px", fontSize: "13px",
                            background: ext.status === "APPROVED" ? "rgba(26,122,74,0.07)"
                              : ext.status === "REJECTED" ? "rgba(192,57,43,0.07)"
                              : "rgba(183,142,66,0.07)",
                            border: `1px solid ${ext.status === "APPROVED" ? "rgba(26,122,74,0.2)"
                              : ext.status === "REJECTED" ? "rgba(192,57,43,0.2)"
                              : "rgba(183,142,66,0.2)"}`,
                          }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <span style={{ fontWeight: "600", color: "#1e293b" }}>
                                {ext.requestedMonths} month{ext.requestedMonths !== 1 ? "s" : ""} requested
                              </span>
                              <span style={{
                                fontSize: "11px", fontWeight: "700", padding: "2px 8px", borderRadius: "20px",
                                color: ext.status === "APPROVED" ? "#1a7a4a" : ext.status === "REJECTED" ? "#c0392b" : "#b78e42",
                                background: ext.status === "APPROVED" ? "rgba(26,122,74,0.12)" : ext.status === "REJECTED" ? "rgba(192,57,43,0.12)" : "rgba(183,142,66,0.12)",
                              }}>
                                {ext.status === "APPROVED" ? "✓ Approved" : ext.status === "REJECTED" ? "✕ Rejected" : "⏳ Pending"}
                              </span>
                            </div>
                            {ext.reason && <div style={{ color: "#64748b", marginTop: "4px", fontSize: "12px" }}>"{ext.reason}"</div>}
                          </div>
                        ))}
                      </div>
                    )}

                    {extMsg && (
                      <div style={{
                        padding: "10px 12px", borderRadius: "10px", fontSize: "13px", fontWeight: "600", marginBottom: "10px",
                        background: extMsg.type === "success" ? "rgba(45,140,106,0.08)" : "rgba(192,57,43,0.06)",
                        border: `1px solid ${extMsg.type === "success" ? "rgba(45,140,106,0.2)" : "rgba(192,57,43,0.2)"}`,
                        color: extMsg.type === "success" ? "#2d8c6a" : "#c0392b",
                      }}>
                        {extMsg.type === "success" ? "✓" : "⚠"} {extMsg.text}
                      </div>
                    )}

                    {!hasPendingExt && !showExtForm && (
                      <button
                        type="button"
                        onClick={() => { setShowExtForm(true); setExtMsg(null); }}
                        style={{
                          width: "100%", padding: "11px", borderRadius: "11px",
                          background: "rgba(31,93,113,0.07)", border: "1.5px dashed rgba(31,93,113,0.25)",
                          color: "#1f5d71", fontWeight: "600", fontSize: "14px", cursor: "pointer",
                          transition: "background 0.2s, border-color 0.2s",
                        }}
                      >
                        + Request New Extension
                      </button>
                    )}

                    {hasPendingExt && !showExtForm && (
                      <p style={{ fontSize: "12px", color: "#b78e42", fontWeight: "600", textAlign: "center", margin: 0 }}>
                        ⏳ You have a pending extension request.
                      </p>
                    )}

                    {showExtForm && (
                      <form onSubmit={handleExtensionSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        <div>
                          <label style={{ fontSize: "11px", fontWeight: "700", color: "#1f5d71", textTransform: "uppercase", letterSpacing: "0.8px", display: "block", marginBottom: "6px" }}>
                            Additional Months
                          </label>
                          <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 14px", background: "#f8fbfb", borderRadius: "10px", border: "1.5px solid #e5eced" }}>
                            <button type="button"
                              style={{ width: 30, height: 30, borderRadius: "50%", border: "1.5px solid #e5eced", background: "#fff", fontSize: 18, cursor: "pointer", color: "#1f5d71", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}
                              onClick={() => setExtMonths((m) => Math.max(1, m - 1))}>−</button>
                            <span style={{ fontSize: 22, fontWeight: 800, color: "#1f5d71", minWidth: 36, textAlign: "center" }}>{extMonths}</span>
                            <button type="button"
                              style={{ width: 30, height: 30, borderRadius: "50%", border: "1.5px solid #e5eced", background: "#fff", fontSize: 18, cursor: "pointer", color: "#1f5d71", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}
                              onClick={() => setExtMonths((m) => m + 1)}>+</button>
                            <span style={{ fontSize: 13, color: "#6e7071" }}>month{extMonths !== 1 ? "s" : ""}</span>
                          </div>
                        </div>
                        <div>
                          <label style={{ fontSize: "11px", fontWeight: "700", color: "#1f5d71", textTransform: "uppercase", letterSpacing: "0.8px", display: "block", marginBottom: "6px" }}>
                            Reason <span style={{ fontWeight: 400, color: "#6e7071", textTransform: "none", letterSpacing: 0 }}>(optional)</span>
                          </label>
                          <textarea
                            value={extReason}
                            onChange={(e) => setExtReason(e.target.value)}
                            placeholder="Why are you requesting an extension?"
                            rows={3}
                            maxLength={300}
                            style={{ width: "100%", padding: "10px 12px", borderRadius: "10px", border: "1.5px solid #e5eced", fontFamily: "inherit", fontSize: "14px", resize: "vertical", outline: "none", boxSizing: "border-box" }}
                          />
                        </div>
                        <div style={{ display: "flex", gap: "8px" }}>
                          <button type="button" onClick={() => { setShowExtForm(false); setExtMsg(null); }}
                            style={{ flex: 1, padding: "10px", borderRadius: "10px", border: "1.5px solid #e5eced", background: "#f8fbfb", color: "#6e7071", fontWeight: "600", fontSize: "13px", cursor: "pointer" }}>
                            Cancel
                          </button>
                          <button type="submit" disabled={extSubmitting}
                            style={{ flex: 2, padding: "10px", borderRadius: "10px", border: "none", background: "#1f5d71", color: "#fff", fontWeight: "700", fontSize: "13px", cursor: extSubmitting ? "not-allowed" : "pointer", opacity: extSubmitting ? 0.6 : 1 }}>
                            {extSubmitting ? "Sending…" : `Request +${extMonths} month${extMonths !== 1 ? "s" : ""}`}
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Receipt Modal ── */}
      {viewingReceiptId && activeReceipt && (
        <div className={styles.modalOverlay} onClick={() => setViewingReceiptId(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitle}>Transaction Receipt</div>
              <button className={styles.modalClose} onClick={() => setViewingReceiptId(null)}>✕</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.receiptRow}>
                <span>Property:</span>
                <span style={{ fontWeight: "600" }}>{property?.title || request?.propertyTitle}</span>
              </div>
              <div className={styles.receiptRow}>
                <span>Installment:</span>
                <span>Month {activeReceipt.installmentNumber}</span>
              </div>
              <div className={styles.receiptRow}>
                <span>Amount Paid:</span>
                <span style={{ fontWeight: "700", color: "#1f5d71" }}>{formatPrice(activeReceipt.amount)}</span>
              </div>
              <div className={styles.receiptRow}>
                <span>Date Paid:</span>
                <span>{formatDate(activeReceipt.paidAt || activeReceipt.dueDate)}</span>
              </div>
              <div className={styles.receiptRow}>
                <span>Reference ID:</span>
                <span style={{ fontFamily: "monospace", fontSize: "12px", background: "#f0f4f5", padding: "2px 6px", borderRadius: "4px" }}>
                  {activeReceipt.paymongoPaymentId || `MANUAL-${activeReceipt.id}`}
                </span>
              </div>
              <div className={styles.receiptRow}>
                <span>Status:</span>
                <span style={{ color: "#10b981", fontWeight: "bold", display: "flex", alignItems: "center", gap: "4px" }}>
                  ✓ COMPLETED
                </span>
              </div>
            </div>
            <button className={styles.modalActionBtn} onClick={() => setViewingReceiptId(null)}>
              Close Receipt
            </button>
          </div>
        </div>
      )}

      {/* ── Reviews Modal ── */}
      {modalFilterRating !== null && (
        <div className={styles.modalOverlay} onClick={closeReviewModal}>
          <div style={{ maxWidth: '600px', width: '100%', padding: '24px', display: 'flex', flexDirection: 'column', maxHeight: '85vh', background: '#fff', borderRadius: '16px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '20px', margin: 0, color: '#1f5d71', fontFamily: "'Playfair Display', serif", fontWeight: 700 }}>
                {modalFilterRating === 0 ? "All" : `${modalFilterRating} Star`} Reviews
              </h3>
              <button onClick={closeReviewModal} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#94a3b8' }}>✕</button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '8px' }}>
              {isFetchingModal ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#6e7071', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                  <span className={styles.payBtnSpinner} style={{ borderColor: 'rgba(31,93,113,0.3)', borderTopColor: '#1f5d71', width: '24px', height: '24px' }}></span>
                  Loading reviews...
                </div>
              ) : modalReviews.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', color: '#6e7071', fontSize: '14px' }}>No reviews found for this rating.</div>
              ) : (
                modalReviews.map(r => (
                  <div key={r.id} className={styles.reviewItem}>
                    <div className={styles.reviewItemHeader}>
                      <div className={styles.reviewAvatar}>
                        {r.tenantAvatarUrl
                          ? <img src={r.tenantAvatarUrl} alt={r.tenantName} className={styles.reviewAvatarImg} />
                          : <span>{getInitials(r.tenantName)}</span>
                        }
                      </div>
                      <div className={styles.reviewItemMeta}>
                        <span className={styles.reviewItemName}>{r.tenantName}</span>
                        <span className={styles.reviewItemDate}>{formatReviewDate(r.createdAt)}</span>
                      </div>
                      <StarDisplay rating={r.rating} size={15} />
                    </div>
                    {r.comment && <p className={styles.reviewItemComment}>{r.comment}</p>}
                  </div>
                ))
              )}
            </div>

            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={closeReviewModal} style={{ padding: '10px 20px', background: '#f0f4f5', color: '#1f5d71', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Close</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default RentalDetail;