import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import Navbar from "../../../components/Navbar/Navbar";
import styles from "./rental_detail.module.css";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

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
  status: "PENDING" | "PAID" | "OVERDUE" | "CANCELLED";
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
}

function formatPrice(n: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency", currency: "PHP",
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(n);
}

function formatDate(d: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-PH", {
    year: "numeric", month: "long", day: "numeric",
  });
}

function geocodeUrl(location: string) {
  return `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json&limit=1`;
}

function mapSrc(lat: number, lon: number) {
  return (
    `https://www.openstreetmap.org/export/embed.html` +
    `?bbox=${lon - 0.01},${lat - 0.01},${lon + 0.01},${lat + 0.01}` +
    `&layer=mapnik&marker=${lat},${lon}`
  );
}

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

const StarPicker: React.FC<{ value: number; onChange: (v: number) => void }> = ({ value, onChange }) => {
  const [hovered, setHovered] = useState(0);
  return (
    <div className={styles.starPicker}>
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          className={`${styles.starBtn} ${s <= (hovered || value) ? styles.starBtnFilled : ""}`}
          onMouseEnter={() => setHovered(s)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(s)}
          aria-label={`Rate ${s} star${s > 1 ? "s" : ""}`}
        >★</button>
      ))}
      {value > 0 && (
        <span className={styles.starLabel}>
          {["", "Poor", "Fair", "Good", "Very Good", "Excellent"][value]}
        </span>
      )}
    </div>
  );
};

const StarDisplay: React.FC<{ rating: number }> = ({ rating }) => (
  <span className={styles.starDisplay}>
    {[1, 2, 3, 4, 5].map(s => (
      <span key={s} className={s <= rating ? styles.starFilled : styles.starEmpty}>★</span>
    ))}
  </span>
);

// ─────────────────────────────────────────────────────────────────────────────

const RentalDetail: React.FC = () => {
  const navigate              = useNavigate();
  const { requestId }         = useParams<{ requestId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  const [user, setUser]         = useState<User | null>(null);
  const [request, setRequest]   = useState<RentalRequest | null>(null);
  const [property, setProperty] = useState<Property | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  const [activeImg, setActiveImg] = useState(0);

  const [mapCoords, setMapCoords]   = useState<{ lat: number; lon: number } | null>(null);
  const [mapLoading, setMapLoading] = useState(false);

  const [initiating, setInitiating] = useState<number | null>(null);

  // Auto-verify banner
  const [verifyBanner, setVerifyBanner] = useState<{
    state: "verifying" | "success" | "error";
    text: string;
  } | null>(null);
  const autoVerifyAttempted = useRef(false);

  // Year accordion — all open by default
  const [expandedYears, setExpandedYears] = useState<Record<string, boolean>>({});

  // Scroll anchor for payment schedule
  const paymentSectionRef = useRef<HTMLDivElement>(null);

  const [existingReview, setExistingReview]     = useState<Review | null>(null);
  const [reviewRating, setReviewRating]         = useState(0);
  const [reviewComment, setReviewComment]       = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewMsg, setReviewMsg]               = useState<{ type: "success" | "error"; text: string } | null>(null);

  // ── Auth ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const stored = localStorage.getItem("user");
    const token  = localStorage.getItem("accessToken");
    if (!stored || !token) { navigate("/"); return; }
    try {
      const parsed: User = JSON.parse(stored);
      if (parsed.role?.toUpperCase() !== "TENANT") { navigate("/home"); return; }
      setUser(parsed);
    } catch { navigate("/"); }
  }, [navigate]);

  // ── Fetch everything ─────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    if (!requestId) return;
    setLoading(true); setError(null);
    const token = localStorage.getItem("accessToken");

    try {
      const reqRes  = await fetch(`${API_BASE}/api/rental-requests/my`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const reqData = await reqRes.json();
      if (!reqData.success) { setError("Failed to load rental."); return; }

      const found: RentalRequest = (reqData.data.requests ?? [])
        .find((r: RentalRequest) => r.id === parseInt(requestId));
      if (!found) { setError("Rental request not found."); return; }
      setRequest(found);

      const propRes  = await fetch(`${API_BASE}/api/properties/${found.propertyId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const propData = await propRes.json();
      if (propData.success) setProperty(propData.data.property);

      if (found.status === "CONFIRMED" || found.status === "COMPLETED") {
        const payRes  = await fetch(`${API_BASE}/api/payments/request/${found.id}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const payData = await payRes.json();
        if (payData.success) {
          const fetched: Payment[] = payData.data.payments ?? [];
          setPayments(fetched);
          // Open all years by default
          const years = new Set(fetched.map(p => new Date(p.dueDate).getFullYear().toString()));
          const initial: Record<string, boolean> = {};
          years.forEach(y => { initial[y] = true; });
          setExpandedYears(initial);
        }
      }

      if (found.status === "CONFIRMED" || found.status === "COMPLETED") {
        const revRes  = await fetch(`${API_BASE}/api/property-reviews/property/${found.propertyId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const revData = await revRes.json();
        if (revData.success) {
          const storedUser: User = JSON.parse(localStorage.getItem("user") || "{}");
          const mine = (revData.data.reviews ?? []).find(
            (r: Review & { rentalRequestId: number }) =>
              r.tenantId === storedUser.id && r.rentalRequestId === found.id
          );
          if (mine) {
            setExistingReview(mine);
            setReviewRating(mine.rating);
            setReviewComment(mine.comment ?? "");
          }
        }
      }
    } catch {
      setError("Unable to load rental details.");
    } finally {
      setLoading(false);
    }
  }, [requestId]);

  useEffect(() => { if (user) fetchAll(); }, [user, fetchAll]);

  // ── Auto-verify on PayMongo redirect ─────────────────────────────────────
  // PayMongo redirects to: /my-rentals/:requestId?payment_id=X&payment=success
  // FIX: depend on searchParams so this fires correctly on redirect, not just
  // on user mount. Guard with ref so it only runs once per page load.
  useEffect(() => {
    const paymentIdParam = searchParams.get("payment_id");
    const paymentStatus  = searchParams.get("payment");

    if (!paymentIdParam || paymentStatus !== "success") return;
    if (!user) return; // wait until auth is resolved
    if (autoVerifyAttempted.current) return;
    autoVerifyAttempted.current = true;

    // Strip params from URL immediately so refresh doesn't re-trigger
    setSearchParams({}, { replace: true });

    const paymentId = parseInt(paymentIdParam, 10);
    if (isNaN(paymentId)) return;

    setVerifyBanner({ state: "verifying", text: "Verifying your payment with PayMongo…" });

    // Scroll to payment schedule section
    setTimeout(() => {
      paymentSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 400);

    const token = localStorage.getItem("accessToken");
    fetch(`${API_BASE}/api/payments/${paymentId}/verify`, {
      method: "GET",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(r => r.json())
      .then(data => {
        if (!data.success) {
          setVerifyBanner({
            state: "error",
            text: data?.error?.message ?? "Verification failed. Please try again.",
          });
          return;
        }
        const updated: Payment = data.data.payment;
        if (updated.status === "PAID") {
          setVerifyBanner({
            state: "success",
            text: `Month ${updated.installmentNumber} payment of ${formatPrice(updated.amount)} confirmed! ✓`,
          });
          // Update the specific payment in state so the UI reflects PAID immediately
          setPayments(prev =>
            prev.map(p => p.id === updated.id ? updated : p)
          );
        } else {
          setVerifyBanner({
            state: "error",
            text: "Payment not yet confirmed by PayMongo. It may take a moment — please refresh.",
          });
        }
      })
      .catch(() => {
        setVerifyBanner({
          state: "error",
          text: "Network error during verification. Please refresh.",
        });
      });
  }, [searchParams, user, setSearchParams]);

  // ── Map ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!property?.location) return;
    setMapLoading(true);
    fetch(geocodeUrl(property.location), { headers: { "Accept-Language": "en" } })
      .then(r => r.json())
      .then(data => {
        if (data.length > 0) setMapCoords({ lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) });
      })
      .catch(() => {})
      .finally(() => setMapLoading(false));
  }, [property?.location]);

  // ── Pay now ───────────────────────────────────────────────────────────────
  const handlePay = async (paymentId: number) => {
    setInitiating(paymentId);
    try {
      const token = localStorage.getItem("accessToken");
      const res   = await fetch(`${API_BASE}/api/payments/${paymentId}/initiate`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setVerifyBanner({
          state: "error",
          text: data?.error?.message ?? "Failed to create payment link.",
        });
        return;
      }
      if (data.data.payment.checkoutUrl) window.location.href = data.data.payment.checkoutUrl;
    } catch {
      setVerifyBanner({ state: "error", text: "Network error. Please try again." });
    } finally {
      setInitiating(null);
    }
  };

  // ── Review submit ─────────────────────────────────────────────────────────
  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!request) return;
    if (reviewRating === 0) {
      setReviewMsg({ type: "error", text: "Please select a star rating." });
      return;
    }

    setReviewSubmitting(true); setReviewMsg(null);
    try {
      const token = localStorage.getItem("accessToken");
      const res   = await fetch(`${API_BASE}/api/property-reviews`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          rentalRequestId: request.id,
          rating: reviewRating,
          comment: reviewComment.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setReviewMsg({ type: "error", text: data?.error?.message ?? "Failed to submit review." });
        return;
      }
      setExistingReview(data.data.review);
      setReviewMsg({ type: "success", text: "Review submitted! Thank you for your feedback." });
    } catch {
      setReviewMsg({ type: "error", text: "Network error. Please try again." });
    } finally {
      setReviewSubmitting(false);
    }
  };

  // ── Year accordion ────────────────────────────────────────────────────────
  const toggleYear = (year: string) => {
    setExpandedYears(prev => ({ ...prev, [year]: !prev[year] }));
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const { paymentsByYear, nextPayablePaymentId } = useMemo(() => {
    if (!payments.length) return { paymentsByYear: {}, nextPayablePaymentId: null };

    const grouped = payments.reduce((acc, p) => {
      const year = new Date(p.dueDate).getFullYear().toString();
      if (!acc[year]) acc[year] = [];
      acc[year].push(p);
      return acc;
    }, {} as Record<string, Payment[]>);

    const unpaid = payments
      .filter(p => p.status === "PENDING" || p.status === "OVERDUE")
      .sort((a, b) => a.installmentNumber - b.installmentNumber);

    return {
      paymentsByYear: grouped,
      nextPayablePaymentId: unpaid.length > 0 ? unpaid[0].id : null,
    };
  }, [payments]);

  const paidCount   = payments.filter(p => p.status === "PAID").length;
  const totalCount  = payments.length;
  const totalAmount = payments.reduce((s, p) => s + p.amount, 0);
  const paidAmount  = payments.filter(p => p.status === "PAID").reduce((s, p) => s + p.amount, 0);
  const progressPct = totalCount > 0 ? Math.round((paidCount / totalCount) * 100) : 0;
  const nextDue     = payments.find(p => p.status === "PENDING" || p.status === "OVERDUE");
  const canReview   = request?.status === "CONFIRMED" || request?.status === "COMPLETED";

  // ─────────────────────────────────────────────────────────────────────────

  if (!user) return null;

  if (loading) return (
    <div className={styles.page}>
      <Navbar user={user} />
      <div className={styles.loadingWrap}>
        <div className={styles.loadingSpinner} />
        <p>Loading rental details…</p>
      </div>
    </div>
  );

  if (error || !request) return (
    <div className={styles.page}>
      <Navbar user={user} />
      <div className={styles.errorWrap}>
        <span>🏚️</span>
        <h2>Not Found</h2>
        <p>{error ?? "This rental doesn't exist."}</p>
        <button onClick={() => navigate("/my-rentals")} type="button">← Back to My Rentals</button>
      </div>
    </div>
  );

  const images = property?.images ?? [];

  return (
    <div className={styles.page}>
      <Navbar user={user} />

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
                <div className={styles.galleryPlaceholder}>
                  <span>🏠</span><span>No photos available</span>
                </div>
              )}
              {images.length > 1 && (
                <>
                  <button
                    className={`${styles.galleryNav} ${styles.galleryNavPrev}`}
                    onClick={() => setActiveImg(i => (i === 0 ? images.length - 1 : i - 1))}
                    type="button"
                  >‹</button>
                  <button
                    className={`${styles.galleryNav} ${styles.galleryNavNext}`}
                    onClick={() => setActiveImg(i => (i === images.length - 1 ? 0 : i + 1))}
                    type="button"
                  >›</button>
                  <span className={styles.galleryCounter}>{activeImg + 1} / {images.length}</span>
                </>
              )}
            </div>
            {images.length > 1 && (
              <div className={styles.galleryThumbs}>
                {images.map((img, i) => (
                  <div
                    key={i}
                    className={`${styles.galleryThumb} ${i === activeImg ? styles.galleryThumbActive : ""}`}
                    onClick={() => setActiveImg(i)}
                  >
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
              <>
                <div className={styles.divider} />
                <div className={styles.descLabel}>About this property</div>
                <p className={styles.desc}>{property.description}</p>
              </>
            )}

            <div className={styles.divider} />

            <div className={styles.ownerRow} style={{ display: "flex", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "16px", flex: 1 }}>
                <div className={styles.ownerAvatar}>{request.ownerName?.charAt(0).toUpperCase()}</div>
                <div>
                  <div className={styles.ownerLabel} style={{ textTransform: "uppercase", letterSpacing: "1px", fontSize: "0.8rem", color: "#64748b", fontWeight: "600", marginBottom: "4px" }}>Listed by</div>
                  <div className={styles.ownerName} style={{ fontWeight: "bold", fontSize: "1.1rem", color: "#0f172a" }}>{request.ownerName}</div>
                </div>
              </div>
              {(request.ownerFacebookUrl || request.ownerInstagramUrl || request.ownerTwitterUrl) && (
                <div style={{ display: "flex", gap: "10px" }}>
                  {request.ownerFacebookUrl && (
                    <a href={request.ownerFacebookUrl} target="_blank" rel="noopener noreferrer" style={{ backgroundColor: "#e8f0fe", color: "#1877F2", width: "42px", height: "42px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none" }} aria-label="Facebook">
                      <FacebookIcon />
                    </a>
                  )}
                  {request.ownerInstagramUrl && (
                    <a href={request.ownerInstagramUrl} target="_blank" rel="noopener noreferrer" style={{ backgroundColor: "#fceef3", color: "#E4405F", width: "42px", height: "42px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none" }} aria-label="Instagram">
                      <InstagramIcon />
                    </a>
                  )}
                  {request.ownerTwitterUrl && (
                    <a href={request.ownerTwitterUrl} target="_blank" rel="noopener noreferrer" style={{ backgroundColor: "#eef1f4", color: "#0f1419", width: "42px", height: "42px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none", border: "1px solid #d5d9dc" }} aria-label="X (Twitter)">
                      <TwitterIcon />
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Review Card */}
          {canReview && (
            <div className={styles.reviewCard}>
              <div className={styles.reviewCardTitle}>
                <span>⭐</span> Rate This Property
              </div>
              {existingReview ? (
                <div className={styles.reviewSubmitted}>
                  <div className={styles.reviewSubmittedBadge}>✓ Review Submitted</div>
                  <StarDisplay rating={existingReview.rating} />
                  {existingReview.comment && (
                    <p className={styles.reviewSubmittedComment}>"{existingReview.comment}"</p>
                  )}
                  <span className={styles.reviewSubmittedDate}>
                    Submitted on {formatDate(existingReview.createdAt)}
                  </span>
                </div>
              ) : (
                <form onSubmit={handleReviewSubmit} className={styles.reviewForm}>
                  <div className={styles.reviewFormField}>
                    <label className={styles.reviewFormLabel}>Your Rating</label>
                    <StarPicker value={reviewRating} onChange={setReviewRating} />
                  </div>
                  <div className={styles.reviewFormField}>
                    <label className={styles.reviewFormLabel}>Comment <span className={styles.reviewOptional}>(optional)</span></label>
                    <textarea
                      className={styles.reviewTextarea}
                      value={reviewComment}
                      onChange={e => setReviewComment(e.target.value)}
                      placeholder="Share your experience with this property…"
                      rows={4}
                      maxLength={500}
                    />
                    <span className={styles.reviewCharCount}>{reviewComment.length}/500</span>
                  </div>
                  {reviewMsg && (
                    <div className={`${styles.reviewMsg} ${reviewMsg.type === "success" ? styles.reviewMsgSuccess : styles.reviewMsgError}`}>
                      {reviewMsg.type === "success" ? "✓" : "⚠"} {reviewMsg.text}
                    </div>
                  )}
                  <button type="submit" className={styles.reviewSubmitBtn} disabled={reviewSubmitting}>
                    {reviewSubmitting
                      ? <><span className={styles.reviewSpinner} /> Submitting…</>
                      : "Submit Review"}
                  </button>
                </form>
              )}
            </div>
          )}

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
              <iframe className={styles.mapFrame} src={mapSrc(mapCoords.lat, mapCoords.lon)} title="Map" loading="lazy" referrerPolicy="no-referrer" />
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
                <div className={styles.progressBar}>
                  <div className={styles.progressFill} style={{ width: `${progressPct}%` }} />
                </div>
                <div className={styles.progressAmounts}>
                  <span className={styles.progressPaid}>{formatPrice(paidAmount)} paid</span>
                  <span className={styles.progressRemaining}>{formatPrice(totalAmount - paidAmount)} remaining</span>
                </div>
                {nextDue && (
                  <div className={`${styles.nextDue} ${nextDue.status === "OVERDUE" ? styles.nextDueOverdue : ""}`}>
                    {nextDue.status === "OVERDUE" ? "⚠ Overdue:" : "📅 Next due:"}{" "}
                    <strong>{formatDate(nextDue.dueDate)}</strong> — {formatPrice(nextDue.amount)}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Payment Schedule (year accordion) ── */}
          {payments.length > 0 && (
            <div className={styles.paymentsCard} ref={paymentSectionRef}>

              {/* Verify banner */}
              {verifyBanner && (
                <div className={`${styles.verifyBanner} ${styles[`verifyBanner_${verifyBanner.state}`]}`}>
                  <span className={styles.verifyBannerIcon}>
                    {verifyBanner.state === "verifying" && <span className={styles.verifySpinner} />}
                    {verifyBanner.state === "success"   && "✓"}
                    {verifyBanner.state === "error"     && "⚠"}
                  </span>
                  <span className={styles.verifyBannerText}>{verifyBanner.text}</span>
                  {verifyBanner.state !== "verifying" && (
                    <button
                      className={styles.verifyBannerDismiss}
                      onClick={() => setVerifyBanner(null)}
                      type="button"
                      aria-label="Dismiss"
                    >✕</button>
                  )}
                </div>
              )}

              <div className={styles.paymentsTitle}>Payment Schedule</div>

              {/* Year accordion */}
              <div className={styles.yearAccordionList}>
                {Object.keys(paymentsByYear).sort().map(year => {
                  const isExpanded   = expandedYears[year] !== false;
                  const yearPayments = paymentsByYear[year];
                  const yearPaid     = yearPayments.filter(p => p.status === "PAID").length;

                  return (
                    <div key={year} className={styles.yearAccordion}>
                      <button
                        type="button"
                        className={styles.yearAccordionHeader}
                        onClick={() => toggleYear(year)}
                        aria-expanded={isExpanded}
                      >
                        <div className={styles.yearAccordionLeft}>
                          <span
                            className={styles.yearAccordionChevron}
                            style={{ transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)" }}
                          >▼</span>
                          <span className={styles.yearAccordionLabel}>{year}</span>
                          <span className={styles.yearAccordionCount}>{yearPaid}/{yearPayments.length} paid</span>
                        </div>
                        <div className={styles.yearMiniProgress}>
                          <div
                            className={styles.yearMiniProgressFill}
                            style={{ width: `${Math.round((yearPaid / yearPayments.length) * 100)}%` }}
                          />
                        </div>
                      </button>

                      {isExpanded && (
                        <div className={styles.yearAccordionBody}>
                          {yearPayments.map(p => {
                            const isPaid          = p.status === "PAID";
                            const isNext          = p.id === nextPayablePaymentId;
                            const isLocked        = !isPaid && !isNext;
                            const isActionLoading = initiating === p.id;

                            return (
                              <div
                                key={p.id}
                                className={[
                                  styles.paymentRow,
                                  isPaid   ? styles.paymentRowPaid    : "",
                                  isLocked ? styles.paymentRowLocked  : "",
                                  isNext   ? styles.paymentRowNext    : "",
                                  p.status === "OVERDUE" ? styles.paymentRowOverdue : "",
                                ].filter(Boolean).join(" ")}
                              >
                                {/* Left */}
                                <div className={styles.paymentRowLeft}>
                                  <div className={[
                                    styles.paymentMonthBadge,
                                    isPaid  ? styles.paymentMonthBadgePaid : "",
                                    isNext  ? styles.paymentMonthBadgeNext : "",
                                  ].filter(Boolean).join(" ")}>
                                    {isPaid ? "✓" : isLocked ? "🔒" : p.installmentNumber}
                                  </div>
                                  <div className={styles.paymentRowInfo}>
                                    <span className={styles.paymentLabel}>Month {p.installmentNumber}</span>
                                    <span className={styles.paymentDates}>
                                      Due {formatDate(p.dueDate)}
                                      {p.paidAt && <span className={styles.paymentPaidDate}> · Paid {formatDate(p.paidAt)}</span>}
                                    </span>
                                  </div>
                                </div>

                                {/* Right */}
                                <div className={styles.paymentRowRight}>
                                  <span className={styles.paymentAmount}>{formatPrice(p.amount)}</span>

                                  {isPaid ? (
                                    <span className={`${styles.payStatusBadge} ${styles.payStatusPaid}`}>Paid</span>
                                  ) : p.status === "OVERDUE" ? (
                                    <div className={styles.paymentRowActions}>
                                      <span className={`${styles.payStatusBadge} ${styles.payStatusOverdue}`}>Overdue</span>
                                      {isNext && (
                                        <button
                                          type="button"
                                          className={`${styles.payNowBtn} ${styles.payNowBtnOverdue}`}
                                          onClick={() => handlePay(p.id)}
                                          disabled={isActionLoading}
                                        >
                                          {isActionLoading ? <span className={styles.payBtnSpinner} /> : "Pay Now"}
                                        </button>
                                      )}
                                    </div>
                                  ) : isLocked ? (
                                    <span className={`${styles.payStatusBadge} ${styles.payStatusLocked}`}>Locked</span>
                                  ) : (
                                    <button
                                      type="button"
                                      className={styles.payNowBtn}
                                      onClick={() => handlePay(p.id)}
                                      disabled={isActionLoading}
                                    >
                                      {isActionLoading ? <span className={styles.payBtnSpinner} /> : "Pay Now"}
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
            </div>
          )}

          {/* Payment History */}
          {payments.filter(p => p.status === "PAID").length > 0 && (
            <div className={styles.historyCard}>
              <div className={styles.historyTitle}>Payment History</div>
              <div className={styles.historyList}>
                {payments.filter(p => p.status === "PAID").map(p => (
                  <div key={p.id} className={styles.historyRow}>
                    <div className={styles.historyIcon}>✓</div>
                    <div className={styles.historyInfo}>
                      <div className={styles.historyLabel}>Month {p.installmentNumber}</div>
                      <div className={styles.historyDate}>Paid on {formatDate(p.paidAt!)}</div>
                    </div>
                    <div className={styles.historyAmount}>{formatPrice(p.amount)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default RentalDetail;