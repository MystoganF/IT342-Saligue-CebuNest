import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "../../../components/Navbar/Navbar";
import styles from "./Property_detail.module.css";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  avatarUrl?: string | null;
}

interface PropertyImage {
  imageUrl: string;
}

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
  ownerId: number;
  ownerName: string;
  ownerFacebookUrl?: string | null;
  ownerInstagramUrl?: string | null;
  ownerTwitterUrl?: string | null;
  images: PropertyImage[];
}

interface Review {
  id: number;
  tenantId: number;
  tenantName: string;
  tenantAvatarUrl?: string | null;
  rating: number;
  comment: string | null;
  createdAt: string;
}

interface ExistingRequest {
  id: number;
  status: string;
}

interface RentalPayment {
  id: number;
  installmentNumber: number;
  amount: number;
  dueDate: string;
  status: "PENDING" | "PAID" | "OVERDUE" | "CANCELLED";
  checkoutUrl?: string;
  paymongoPaymentId?: string;
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}

function getInitials(name: string): string {
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

function getStatusBadgeClass(status: string, s: typeof styles): string {
  switch (status?.toUpperCase()) {
    case "AVAILABLE":   return s.badgeAvailable;
    case "UNAVAILABLE": return s.badgeUnavailable;
    default:            return s.badgePending;
  }
}

function calcMoveOut(startDate: string, months: number): string {
  if (!startDate) return "";
  const d = new Date(startDate);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().split("T")[0];
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-PH", {
    year: "numeric", month: "long", day: "numeric",
  });
}

function formatReviewDate(isoStr: string): string {
  if (!isoStr) return "";
  return new Date(isoStr).toLocaleDateString("en-PH", {
    year: "numeric", month: "long", day: "numeric",
  });
}

function avgRating(reviews: Review[]): number {
  if (!reviews.length) return 0;
  return reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
}

async function geocodeLocation(location: string): Promise<{ lat: number; lon: number } | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json&limit=1`,
      { headers: { "Accept-Language": "en" } }
    );
    const data = await res.json();
    if (data.length === 0) return null;
    return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
  } catch {
    return null;
  }
}

const StarDisplay: React.FC<{ rating: number; size?: number }> = ({ rating, size = 16 }) => (
  <span className={styles.starDisplay} style={{ fontSize: size }}>
    {[1, 2, 3, 4, 5].map((s) => (
      <span key={s} className={s <= rating ? styles.starFilled : styles.starEmpty}>★</span>
    ))}
  </span>
);

const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
  </svg>
);

const InstagramIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
  </svg>
);

const TwitterIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

interface LightboxProps {
  images: PropertyImage[];
  startIndex: number;
  onClose: () => void;
}

const Lightbox: React.FC<LightboxProps> = ({ images, startIndex, onClose }) => {
  const [current, setCurrent] = useState(startIndex);
  const prev = useCallback(() => setCurrent(i => (i === 0 ? images.length - 1 : i - 1)), [images.length]);
  const next = useCallback(() => setCurrent(i => (i === images.length - 1 ? 0 : i + 1)), [images.length]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", handler); document.body.style.overflow = ""; };
  }, [onClose, prev, next]);

  return (
    <div className={styles.lightboxOverlay} onClick={onClose}>
      <button className={styles.lightboxClose} onClick={onClose} aria-label="Close">✕</button>
      <div className={styles.lightboxContent} onClick={e => e.stopPropagation()}>
        <img src={images[current].imageUrl} alt={`Image ${current + 1}`} className={styles.lightboxImg} />
        {images.length > 1 && (
          <>
            <button className={`${styles.lightboxNav} ${styles.lightboxNavPrev}`} onClick={prev} aria-label="Previous">‹</button>
            <button className={`${styles.lightboxNav} ${styles.lightboxNavNext}`} onClick={next} aria-label="Next">›</button>
            <div className={styles.lightboxCounter}>{current + 1} / {images.length}</div>
            <div className={styles.lightboxThumbs}>
              {images.map((img, i) => (
                <div key={i} className={`${styles.lightboxThumb} ${i === current ? styles.lightboxThumbActive : ""}`} onClick={() => setCurrent(i)}>
                  <img src={img.imageUrl} alt={`Thumb ${i + 1}`} />
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

function getBookingBlockReason(req: ExistingRequest | null): string | null {
  if (!req) return null;
  switch (req.status) {
    case "PENDING":   return "pending";
    case "APPROVED":  return "approved";
    case "CONFIRMED": return "confirmed";
    default:          return null;
  }
}

function getBookingBtnLabel(req: ExistingRequest | null, submitted: boolean): string {
  if (submitted) return "✓ Request Sent";
  if (!req) return "Request to Rent";
  switch (req.status) {
    case "PENDING":   return "Request Pending…";
    case "APPROVED":  return "Awaiting Confirmation";
    case "CONFIRMED": return "Already a Tenant";
    default:          return "Request to Rent";
  }
}

const PropertyDetail: React.FC = () => {
  const { id }   = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [user, setUser]         = useState<User | null>(null);
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  const [activeImg, setActiveImg]       = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const [mapCoords, setMapCoords]   = useState<{ lat: number; lon: number } | null>(null);
  const [mapLoading, setMapLoading] = useState(true);

  const [startDate, setStartDate]                     = useState("");
  const [leaseDurationMonths, setLeaseDurationMonths] = useState<number>(1);
  const [submitting, setSubmitting]                   = useState(false);
  const [bookingMsg, setBookingMsg]                   = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [existingRequest, setExistingRequest]         = useState<ExistingRequest | null>(null);
  const [requestCheckLoading, setRequestCheckLoading] = useState(false);

  const [reviews, setReviews]               = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  const [payments, setPayments]                         = useState<RentalPayment[]>([]);
  const [paymentsLoading, setPaymentsLoading]           = useState(false);
  const [expandedYears, setExpandedYears]               = useState<Record<string, boolean>>({});
  const [paymentActionLoading, setPaymentActionLoading] = useState<number | null>(null);

  // ── Confirm state ──────────────────────────────────────────────────────
  const [confirming, setConfirming]   = useState(false);
  const [confirmMsg, setConfirmMsg]   = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    const token  = localStorage.getItem("accessToken");
    if (!stored || !token) { navigate("/"); return; }
    try { setUser(JSON.parse(stored)); } catch { navigate("/"); }
  }, [navigate]);

  useEffect(() => {
    if (!id) return;
    const token = localStorage.getItem("accessToken");
    fetch(`${API_BASE}/api/properties/${id}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(r => r.json())
      .then(data => {
        if (!data.success) { setError(data?.error?.message ?? "Property not found."); return; }
        setProperty(data.data.property);
      })
      .catch(() => setError("Unable to load property. Please try again."))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!id) return;
    setReviewsLoading(true);
    fetch(`${API_BASE}/api/property-reviews/property/${id}`)
      .then(r => r.json())
      .then(data => { if (data.success) setReviews(data.data.reviews ?? []); })
      .catch(() => {})
      .finally(() => setReviewsLoading(false));
  }, [id]);

  useEffect(() => {
    if (!id || !user) return;
    const token = localStorage.getItem("accessToken");
    setRequestCheckLoading(true);
    fetch(`${API_BASE}/api/rental-requests/my/property/${id}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(r => r.json())
      .then(data => {
        if (data.success && data.data.request && data.data.request.status) {
          setExistingRequest({ id: data.data.request.id, status: data.data.request.status });
        } else {
          setExistingRequest(null);
        }
      })
      .catch(() => {})
      .finally(() => setRequestCheckLoading(false));
  }, [id, user]);

  useEffect(() => {
    if (existingRequest?.status === "CONFIRMED" && existingRequest.id) {
      setPaymentsLoading(true);
      const token = localStorage.getItem("accessToken");
      fetch(`${API_BASE}/api/payments/request/${existingRequest.id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
        .then(r => r.json())
        .then(data => { if (data.success) setPayments(data.data.payments || []); })
        .catch(console.error)
        .finally(() => setPaymentsLoading(false));
    }
  }, [existingRequest?.status, existingRequest?.id]);

  useEffect(() => {
    if (!property?.location) return;
    setMapLoading(true);
    geocodeLocation(property.location).then(coords => { setMapCoords(coords); setMapLoading(false); });
  }, [property?.location]);

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!property || !user) return;
    setSubmitting(true);
    setBookingMsg(null);
    try {
      const token = localStorage.getItem("accessToken");
      const res   = await fetch(`${API_BASE}/api/rental-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ propertyId: property.id, startDate, leaseDurationMonths }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setBookingMsg({ type: "error", text: data?.error?.message ?? "Request failed. Please try again." });
        return;
      }
      setBookingMsg({ type: "success", text: "Rental request submitted! The owner will review it shortly." });
      setExistingRequest({ id: data.data.request.id, status: "PENDING" });
    } catch {
      setBookingMsg({ type: "error", text: "Network error. Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  // ── Confirm rental (always MONTHLY) ───────────────────────────────────
  const handleConfirm = async () => {
    if (!existingRequest) return;
    setConfirming(true);
    setConfirmMsg(null);
    try {
      const token = localStorage.getItem("accessToken");
      const res   = await fetch(`${API_BASE}/api/payments/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ requestId: existingRequest.id }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setConfirmMsg({ type: "error", text: data?.error?.message ?? "Failed to confirm rental." });
        return;
      }
      setConfirmMsg({ type: "success", text: "Rental confirmed! Your monthly payment schedule is ready." });
      setExistingRequest(prev => prev ? { ...prev, status: "CONFIRMED" } : prev);
    } catch {
      setConfirmMsg({ type: "error", text: "Network error. Please try again." });
    } finally {
      setConfirming(false);
    }
  };

  const handlePayClick = async (paymentId: number) => {
    setPaymentActionLoading(paymentId);
    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch(`${API_BASE}/api/payments/${paymentId}/initiate`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (data.success && data.data.payment.checkoutUrl) {
        window.location.href = data.data.payment.checkoutUrl;
      } else {
        alert("Failed to initiate payment: " + (data?.error?.message ?? "Unknown error"));
      }
    } catch (e) {
      console.error(e);
      alert("Network error while trying to initiate payment.");
    } finally {
      setPaymentActionLoading(null);
    }
  };

  const { paymentsByYear, nextPayablePaymentId } = useMemo(() => {
    if (!payments || payments.length === 0) {
      return { paymentsByYear: {}, nextPayablePaymentId: null };
    }
    const grouped = payments.reduce((acc, payment) => {
      const year = new Date(payment.dueDate).getFullYear().toString();
      if (!acc[year]) acc[year] = [];
      acc[year].push(payment);
      return acc;
    }, {} as Record<string, RentalPayment[]>);

    const unpaidPayments = payments
      .filter((p) => p.status === "PENDING" || p.status === "OVERDUE")
      .sort((a, b) => (a.installmentNumber ?? Number.MAX_SAFE_INTEGER) - (b.installmentNumber ?? Number.MAX_SAFE_INTEGER));

    const nextPayablePaymentId = unpaidPayments.length > 0 ? unpaidPayments[0].id : null;
    return { paymentsByYear: grouped, nextPayablePaymentId };
  }, [payments]);

  const toggleYear = (year: string) => {
    setExpandedYears((prev) => ({
      ...prev,
      [year]: prev[year] === undefined ? false : !prev[year],
    }));
  };

  const isAvailable      = property?.status?.toUpperCase() === "AVAILABLE";
  const totalCost        = property ? property.price * leaseDurationMonths : 0;
  const today            = new Date().toISOString().split("T")[0];
  const images           = property?.images ?? [];
  const hasImages        = images.length > 0;
  const moveOutDate      = calcMoveOut(startDate, leaseDurationMonths);
  const hasSocials       = property && (property.ownerFacebookUrl || property.ownerInstagramUrl || property.ownerTwitterUrl);
  const avg              = avgRating(reviews);
  const blockReason      = getBookingBlockReason(existingRequest);
  const isBookingBlocked = blockReason !== null;

  if (loading) {
    return (
      <div className={styles.page}>
        {user && <Navbar user={user} />}
        <div className={styles.skeleton}>
          <div className={styles.skeletonLeft}>
            <div className={styles.skeletonImg} />
            <div className={`${styles.skeletonBlock} ${styles.skeletonCard}`} />
            <div className={`${styles.skeletonBlock} ${styles.skeletonMap}`} />
          </div>
          <div className={styles.skeletonRight}>
            <div className={`${styles.skeletonBlock}`} style={{ height: "460px", borderRadius: "20px" }} />
          </div>
        </div>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className={styles.page}>
        {user && <Navbar user={user} />}
        <div className={styles.errorBox}>
          <span className={styles.errorIcon}>🏚️</span>
          <h2 className={styles.errorTitle}>Property Not Found</h2>
          <p className={styles.errorBody}>{error ?? "This property doesn't exist or has been removed."}</p>
          <button className={styles.errorBtn} onClick={() => navigate("/home")}>← Back to Listings</button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <Navbar user={user!} />

      {lightboxOpen && hasImages && (
        <Lightbox images={images} startIndex={activeImg} onClose={() => setLightboxOpen(false)} />
      )}

      <div className={styles.backBar}>
        <button className={styles.backBtn} onClick={() => navigate(-1)}>← Back to listings</button>
      </div>

      <div className={styles.main}>

        {/* ══ LEFT COLUMN ══ */}
        <div className={styles.leftCol}>

          {/* Gallery */}
          <div className={styles.gallery}>
            <div className={styles.galleryMain}>
              {hasImages ? (
                <>
                  <img
                    src={images[activeImg].imageUrl}
                    alt={`${property.title} — image ${activeImg + 1}`}
                    className={styles.galleryMainImg}
                    onClick={() => setLightboxOpen(true)}
                    title="Click to enlarge"
                  />
                  <div className={styles.galleryExpandHint}><span>🔍</span> Click to enlarge</div>
                </>
              ) : (
                <div className={styles.galleryPlaceholder}>
                  <span className={styles.galleryPlaceholderIcon}>🏠</span>
                  <span className={styles.galleryPlaceholderText}>No photos available</span>
                </div>
              )}
              {images.length > 1 && (
                <>
                  <button className={`${styles.galleryNav} ${styles.galleryNavPrev}`} onClick={() => setActiveImg(i => (i === 0 ? images.length - 1 : i - 1))} aria-label="Previous image">‹</button>
                  <button className={`${styles.galleryNav} ${styles.galleryNavNext}`} onClick={() => setActiveImg(i => (i === images.length - 1 ? 0 : i + 1))} aria-label="Next image">›</button>
                  <span className={styles.galleryCounter}>{activeImg + 1} / {images.length}</span>
                </>
              )}
            </div>
            {images.length > 1 && (
              <div className={styles.galleryThumbs}>
                {images.map((img, i) => (
                  <div key={i} className={`${styles.galleryThumb} ${i === activeImg ? styles.galleryThumbActive : ""}`} onClick={() => setActiveImg(i)}>
                    <img src={img.imageUrl} alt={`Thumbnail ${i + 1}`} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Info Card */}
          <div className={styles.infoCard}>
            <div className={styles.infoHeader}>
              <div className={styles.infoTitleGroup}>
                <h1 className={styles.infoTitle}>{property.title}</h1>
                <div className={styles.infoLocation}>
                  <span className={styles.infoLocationIcon}>📍</span>
                  {property.location}
                </div>
                {reviews.length > 0 && (
                  <div className={styles.infoRatingPill}>
                    <StarDisplay rating={Math.round(avg)} size={14} />
                    <span className={styles.infoRatingValue}>{avg.toFixed(1)}</span>
                    <span className={styles.infoRatingCount}>({reviews.length} review{reviews.length !== 1 ? "s" : ""})</span>
                  </div>
                )}
              </div>
              <div className={styles.infoBadges}>
                <span className={`${styles.badge} ${getStatusBadgeClass(property.status, styles)}`}>
                  {property.status?.charAt(0) + property.status?.slice(1).toLowerCase()}
                </span>
                {property.type && <span className={`${styles.badge} ${styles.badgeType}`}>{property.type}</span>}
              </div>
            </div>

            {(property.beds || property.baths || property.sqm) && (
              <div className={styles.infoStats}>
                {property.beds  != null && <div className={styles.infoStat}><span className={styles.infoStatIcon}>🛏️</span><span className={styles.infoStatValue}>{property.beds}</span><span className={styles.infoStatLabel}>Beds</span></div>}
                {property.baths != null && <div className={styles.infoStat}><span className={styles.infoStatIcon}>🚿</span><span className={styles.infoStatValue}>{property.baths}</span><span className={styles.infoStatLabel}>Baths</span></div>}
                {property.sqm   != null && <div className={styles.infoStat}><span className={styles.infoStatIcon}>📐</span><span className={styles.infoStatValue}>{property.sqm}</span><span className={styles.infoStatLabel}>sqm</span></div>}
              </div>
            )}

            <div className={styles.infoDivider} />
            <div className={styles.infoDescLabel}>About this property</div>
            <p className={styles.infoDesc}>{property.description}</p>

            <div className={styles.ownerRow}>
              <div className={styles.ownerAvatar}>{getInitials(property.ownerName)}</div>
              <div className={styles.ownerInfo}>
                <span className={styles.ownerLabel}>Listed by</span>
                <span className={styles.ownerName}>{property.ownerName}</span>
              </div>
              {hasSocials && (
                <div className={styles.ownerSocials}>
                  {property.ownerFacebookUrl && <a href={property.ownerFacebookUrl} target="_blank" rel="noopener noreferrer" className={`${styles.socialLink} ${styles.socialFacebook}`} aria-label="Facebook"><FacebookIcon /></a>}
                  {property.ownerInstagramUrl && <a href={property.ownerInstagramUrl} target="_blank" rel="noopener noreferrer" className={`${styles.socialLink} ${styles.socialInstagram}`} aria-label="Instagram"><InstagramIcon /></a>}
                  {property.ownerTwitterUrl && <a href={property.ownerTwitterUrl} target="_blank" rel="noopener noreferrer" className={`${styles.socialLink} ${styles.socialTwitter}`} aria-label="Twitter / X"><TwitterIcon /></a>}
                </div>
              )}
            </div>
          </div>

          {/* Reviews Section */}
          <div className={styles.reviewsCard}>
            <div className={styles.reviewsHeader}>
              <div className={styles.reviewsTitle}>
                <span>⭐</span> Tenant Reviews
              </div>
              {reviews.length > 0 && (
                <div className={styles.reviewsSummary}>
                  <span className={styles.reviewsAvgBig}>{avg.toFixed(1)}</span>
                  <div>
                    <StarDisplay rating={Math.round(avg)} size={18} />
                    <div className={styles.reviewsCount}>{reviews.length} review{reviews.length !== 1 ? "s" : ""}</div>
                  </div>
                </div>
              )}
            </div>
            {reviewsLoading ? (
              <div className={styles.reviewsLoading}>
                <div className={styles.reviewsSpinner} />
                Loading reviews…
              </div>
            ) : reviews.length === 0 ? (
              <div className={styles.reviewsEmpty}>
                <span>💬</span>
                <p>No reviews yet. Be the first to review after your stay!</p>
              </div>
            ) : (
              <div className={styles.reviewsList}>
                {reviews.map((r) => (
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
                ))}
              </div>
            )}
          </div>

          {/* Map */}
          <div className={styles.mapCard}>
            <div className={styles.mapHeader}>
              <span className={styles.mapHeaderIcon}>🗺️</span>
              <span className={styles.mapHeaderTitle}>Location</span>
              <span className={styles.mapHeaderAddress}>{property.location}</span>
            </div>
            {mapLoading ? (
              <div className={styles.mapLoading}><span>📍</span> Finding location…</div>
            ) : mapCoords ? (
              <iframe
                className={styles.mapFrame}
                src={
                  `https://www.openstreetmap.org/export/embed.html` +
                  `?bbox=${mapCoords.lon - 0.01},${mapCoords.lat - 0.01},${mapCoords.lon + 0.01},${mapCoords.lat + 0.01}` +
                  `&layer=mapnik&marker=${mapCoords.lat},${mapCoords.lon}`
                }
                title="Property location map"
                loading="lazy"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className={styles.mapLoading}>📍 Map unavailable for this location</div>
            )}
          </div>

        </div>

        {/* ══ RIGHT COLUMN ══ */}
        <div className={styles.rightCol}>
          <div className={styles.bookingCard}>

            {existingRequest?.status === "CONFIRMED" ? (
              <div className={styles.paymentScheduleSection}>
                <div className={`${styles.bookingMessage} ${styles.bookingMessageSuccess}`}>
                  <span>🏠</span> You are currently an active tenant.
                </div>

                <h3 style={{ marginTop: "24px", marginBottom: "16px", fontSize: "1.2rem", fontWeight: "600" }}>
                  Your Payment Schedule
                </h3>

                {paymentsLoading ? (
                  <div style={{ textAlign: "center", padding: "20px", color: "#666" }}>Loading payments...</div>
                ) : payments.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "20px", color: "#666" }}>No payment schedule found.</div>
                ) : (
                  <div>
                    {Object.keys(paymentsByYear).sort().map((year) => {
                      const isExpanded  = expandedYears[year] !== false;
                      const yearPayments = paymentsByYear[year];
                      return (
                        <div key={year} style={{ marginBottom: "1rem", border: "1px solid #e2e8f0", borderRadius: "8px", overflow: "hidden" }}>
                          <button
                            type="button"
                            onClick={() => toggleYear(year)}
                            style={{
                              width: "100%", padding: "14px 16px", display: "flex", justifyContent: "space-between",
                              backgroundColor: "#f8fafc", border: "none", cursor: "pointer", fontWeight: "600",
                              fontSize: "1rem", color: "#334155",
                            }}
                          >
                            <span>Year {year}</span>
                            <span>{isExpanded ? "▲" : "▼"}</span>
                          </button>
                          {isExpanded && (
                            <div style={{ padding: "0 16px", backgroundColor: "#fff" }}>
                              {yearPayments.map((payment) => {
                                const isPaid          = payment.status === "PAID";
                                const isPayable       = !isPaid && payment.id === nextPayablePaymentId;
                                const isActionLoading = paymentActionLoading === payment.id;
                                return (
                                  <div key={payment.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 0", borderBottom: "1px solid #f1f5f9" }}>
                                    <div>
                                      <strong style={{ display: "block", color: "#1e293b", marginBottom: "4px" }}>
                                        {`Month ${payment.installmentNumber}`}
                                      </strong>
                                      <div style={{ fontSize: "13px", color: "#64748b" }}>
                                        Due: {formatDate(payment.dueDate)}
                                      </div>
                                    </div>
                                    <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                                      <span style={{ fontWeight: "600", color: "#1e293b" }}>{formatPrice(payment.amount)}</span>
                                      {isPaid ? (
                                        <span style={{ color: "#10b981", fontWeight: "bold", fontSize: "14px", display: "flex", alignItems: "center", gap: "4px" }}>
                                          ✓ Paid
                                        </span>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => handlePayClick(payment.id)}
                                          disabled={!isPayable || isActionLoading}
                                          style={{
                                            padding: "8px 16px",
                                            backgroundColor: isPayable ? "#0f766e" : "#e2e8f0",
                                            color: isPayable ? "#ffffff" : "#94a3b8",
                                            border: "none", borderRadius: "6px",
                                            cursor: isPayable ? "pointer" : "not-allowed",
                                            fontWeight: "600",
                                            opacity: isPayable ? 1 : 0.6,
                                            transition: "all 0.2s",
                                          }}
                                          title={!isPayable ? "You must pay previous months first" : "Proceed to payment"}
                                        >
                                          {isActionLoading ? "Loading..." : "Pay Now"}
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className={styles.bookingPrice}>
                  <span className={styles.bookingPriceAmount}>{formatPrice(property.price)}</span>
                  <span className={styles.bookingPriceLabel}>/ month</span>
                </div>

                {isAvailable ? (
                  <form className={styles.bookingForm} onSubmit={handleBooking}>
                    {existingRequest?.status === "PENDING" && (
                      <div className={`${styles.bookingMessage} ${styles.bookingMessagePending}`}>
                        <span>⏳</span>
                        Your rental request is awaiting owner review. You cannot submit another until it is decided.
                      </div>
                    )}

                    {existingRequest?.status === "APPROVED" && (
                      <div className={`${styles.bookingMessage} ${styles.bookingMessagePending}`}>
                        <span>✅</span>
                        Your request has been approved! Confirm your rental to start your monthly payment schedule.
                        <button
                          type="button"
                          onClick={handleConfirm}
                          disabled={confirming}
                          style={{
                            marginTop: "12px", width: "100%", padding: "10px",
                            backgroundColor: "#0f766e", color: "#fff", border: "none",
                            borderRadius: "8px", fontWeight: "600", cursor: "pointer",
                            fontSize: "0.95rem",
                          }}
                        >
                          {confirming ? "Confirming…" : "Confirm Rental"}
                        </button>
                        {confirmMsg && (
                          <div style={{ marginTop: "8px", fontSize: "0.9rem", color: confirmMsg.type === "success" ? "#1a7a4a" : "#c0392b" }}>
                            {confirmMsg.type === "success" ? "✓" : "⚠"} {confirmMsg.text}
                          </div>
                        )}
                      </div>
                    )}

                    {!isBookingBlocked && (
                      <>
                        <div className={styles.bookingField}>
                          <label className={styles.bookingLabel}>Move-in Date</label>
                          <input type="date" className={styles.bookingInput} value={startDate} onChange={e => setStartDate(e.target.value)} min={today} required />
                        </div>
                        <div className={styles.bookingField}>
                          <label className={styles.bookingLabel}>Lease Duration (months)</label>
                          <input type="number" className={styles.bookingInput} value={leaseDurationMonths} onChange={e => setLeaseDurationMonths(Math.max(1, parseInt(e.target.value) || 1))} min={1} max={24} required />
                        </div>
                        {startDate && (
                          <div className={styles.moveOutRow}>
                            <div className={styles.moveOutIcon}>🏁</div>
                            <div className={styles.moveOutInfo}>
                              <span className={styles.moveOutLabel}>Move-out Date</span>
                              <span className={styles.moveOutDate}>{formatDate(moveOutDate)}</span>
                            </div>
                          </div>
                        )}
                        {startDate && (
                          <div className={styles.bookingSummary}>
                            <div className={styles.bookingSummaryRow}><span className={styles.bookingSummaryLabel}>Move-in</span><span className={styles.bookingSummaryValue}>{formatDate(startDate)}</span></div>
                            <div className={styles.bookingSummaryRow}><span className={styles.bookingSummaryLabel}>Move-out</span><span className={styles.bookingSummaryValue}>{formatDate(moveOutDate)}</span></div>
                            <div className={styles.bookingSummaryRow}><span className={styles.bookingSummaryLabel}>Monthly rent</span><span className={styles.bookingSummaryValue}>{formatPrice(property.price)}</span></div>
                            <div className={styles.bookingSummaryRow}><span className={styles.bookingSummaryLabel}>Duration</span><span className={styles.bookingSummaryValue}>{leaseDurationMonths} month{leaseDurationMonths > 1 ? "s" : ""}</span></div>
                            <div className={`${styles.bookingSummaryRow} ${styles.bookingSummaryTotal}`}><span className={styles.bookingSummaryTotalLabel}>Total</span><span className={styles.bookingSummaryTotalValue}>{formatPrice(totalCost)}</span></div>
                          </div>
                        )}
                      </>
                    )}

                    {!isBookingBlocked && (
                      <button
                        type="submit"
                        className={styles.bookingBtn}
                        disabled={submitting || bookingMsg?.type === "success" || requestCheckLoading}
                      >
                        {submitting ? <span className={styles.bookingSpinner} /> : getBookingBtnLabel(existingRequest, bookingMsg?.type === "success")}
                      </button>
                    )}

                    {bookingMsg && (
                      <div className={`${styles.bookingMessage} ${bookingMsg.type === "success" ? styles.bookingMessageSuccess : styles.bookingMessageError}`}>
                        <span>{bookingMsg.type === "success" ? "✓" : "⚠"}</span>
                        {bookingMsg.text}
                      </div>
                    )}

                    {!isBookingBlocked && (
                      <p className={styles.bookingNote}>No payment yet — the owner will review your request first.</p>
                    )}

                    {(existingRequest?.status === "REJECTED" || existingRequest?.status === "TERMINATED") && (
                      <p className={styles.bookingNote}>
                        Your previous request was {existingRequest.status.toLowerCase()}. You may submit a new request.
                      </p>
                    )}
                  </form>
                ) : (
                  <>
                    <button className={`${styles.bookingBtn} ${styles.bookingBtnUnavailable}`} disabled>Not Available</button>
                    <p className={styles.bookingNote} style={{ marginTop: "12px" }}>This property is currently unavailable for new rental requests.</p>
                  </>
                )}
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default PropertyDetail;