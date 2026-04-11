import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AdminSidebar from "../../../components/AdminSidebar/AdminSidebar";
import styles from "./AdminPropertyDetail.module.css";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

interface AdminUser { id: number; name: string; email: string; role: string; }

interface PropertyDetail {
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
  images: { id: number; imageUrl: string }[];
  createdAt: string;
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency", currency: "PHP",
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(price);
}

const AdminPropertyDetail: React.FC = () => {
  const navigate        = useNavigate();
  const { id }          = useParams<{ id: string }>();
  const [admin, setAdmin]           = useState<AdminUser | null>(null);
  const [property, setProperty]     = useState<PropertyDetail | null>(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [activeImg, setActiveImg]   = useState(0);

  // 🌟 NEW: State to control the fullscreen lightbox
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  // Review modal
  const [reviewAction, setReviewAction] = useState<"APPROVED" | "REJECTED" | null>(null);
  const [reason, setReason]             = useState("");
  const [submitting, setSubmitting]     = useState(false);
  const [reviewError, setReviewError]   = useState<string | null>(null);
  const [done, setDone]                 = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    const token  = localStorage.getItem("accessToken");
    if (!stored || !token) { navigate("/"); return; }
    try {
      const parsed: AdminUser = JSON.parse(stored);
      if (parsed.role?.toUpperCase() !== "ADMIN") { navigate("/home"); return; }
      setAdmin(parsed);
    } catch { navigate("/"); }
  }, [navigate]);

  const fetchProperty = useCallback(async () => {
    if (!id) return;
    setLoading(true); setError(null);
    try {
      const token = localStorage.getItem("accessToken");
      const res   = await fetch(`${API_BASE}/api/admin/rental-requests/${id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (!res.ok || !data.success) { setError(data?.error?.message ?? "Failed to load."); return; }
      setProperty(data.data.property);
    } catch { setError("Unable to connect to server."); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { if (admin) fetchProperty(); }, [admin, fetchProperty]);

  // 🌟 NEW: Keyboard navigation for the lightbox (Esc to close, arrows to navigate)
  useEffect(() => {
    if (!isLightboxOpen || !property) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsLightboxOpen(false);
      if (e.key === "ArrowLeft") setActiveImg((i) => Math.max(0, i - 1));
      if (e.key === "ArrowRight") setActiveImg((i) => Math.min(property.images.length - 1, i + 1));
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isLightboxOpen, property]);


  const openReview = (action: "APPROVED" | "REJECTED") => {
    setReviewAction(action); setReason(""); setReviewError(null);
  };
  const closeReview = () => { if (!submitting) { setReviewAction(null); setReason(""); setReviewError(null); } };

  const handleSubmit = async () => {
    if (!reviewAction || !property) return;
    if (reviewAction === "REJECTED" && !reason.trim()) {
      setReviewError("Please provide a reason for rejection."); return;
    }
    setSubmitting(true); setReviewError(null);
    try {
      const token = localStorage.getItem("accessToken");
      const res   = await fetch(`${API_BASE}/api/admin/rental-requests/${property.id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ status: reviewAction, reason: reason.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) { setReviewError(data?.error?.message ?? "Failed."); return; }
      
      setProperty(prev => prev ? { ...prev, status: reviewAction } : prev);
      setDone(true);
      closeReview();
    } catch { setReviewError("Network error."); }
    finally { setSubmitting(false); }
  };

  if (!admin) return null;

  return (
    <div className={styles.page}>
     

      <div className={styles.main}>
        <button type="button" className={styles.backBtn} onClick={() => navigate("/admin/rental-requests")}>
          ← Back to Requests
        </button>

        {loading && (
          <div className={styles.skeletonWrap}>
            <div className={styles.skeletonHero} />
            <div className={styles.skeletonBody}>
              {Array.from({ length: 5 }).map((_, i) => <div key={i} className={styles.skeletonLine} />)}
            </div>
          </div>
        )}

        {!loading && error && (
          <div className={styles.stateBox}>
            <span className={styles.stateIcon}>⚠️</span>
            <h3 className={styles.stateTitle}>Failed to load</h3>
            <p className={styles.stateBody}>{error}</p>
            <button type="button" className={styles.stateBtn} onClick={fetchProperty}>Try Again</button>
          </div>
        )}

        {!loading && !error && property && (
          <>
            {done && (
              <div className={styles.doneBanner}>
                ✓ Property has been {property.status === "APPROVED" ? "approved" : "rejected"}. Owner has been notified.
              </div>
            )}

            {/* ── Hero image gallery ── */}
            <div className={styles.gallery}>
              <div className={styles.galleryMain}>
                {property.images.length > 0
                  // 🌟 CHANGED: Added onClick and cursor pointer to trigger lightbox
                  ? <img 
                      src={property.images[activeImg]?.imageUrl} 
                      alt="Property" 
                      className={styles.galleryMainImg} 
                      onClick={() => setIsLightboxOpen(true)}
                      style={{ cursor: "pointer" }}
                    />
                  : <div className={styles.galleryPlaceholder}>🏠</div>
                }
                {property.images.length > 1 && (
                  <>
                    <button type="button" className={`${styles.galleryNav} ${styles.galleryNavPrev}`}
                      onClick={() => setActiveImg((i) => Math.max(0, i - 1))}
                      disabled={activeImg === 0}>‹</button>
                    <button type="button" className={`${styles.galleryNav} ${styles.galleryNavNext}`}
                      onClick={() => setActiveImg((i) => Math.min(property.images.length - 1, i + 1))}
                      disabled={activeImg === property.images.length - 1}>›</button>
                    <div className={styles.galleryCounter}>{activeImg + 1} / {property.images.length}</div>
                  </>
                )}
              </div>
              {property.images.length > 1 && (
                <div className={styles.galleryStrip}>
                  {property.images.map((img, i) => (
                    <button type="button" key={img.id} className={`${styles.galleryThumb} ${i === activeImg ? styles.galleryThumbActive : ""}`}
                      onClick={() => setActiveImg(i)}>
                      <img src={img.imageUrl} alt={`Photo ${i + 1}`} />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* ── Detail body ── */}
            <div className={styles.detailGrid}>

              {/* Left: main info */}
              <div className={styles.detailMain}>
                <div className={styles.detailHeaderRow}>
                  <div>
                    <div className={styles.statusBadge} data-status={property.status}>
                      {property.status.replace("_", " ")}
                    </div>
                    <h1 className={styles.detailTitle}>{property.title}</h1>
                    <div className={styles.detailMeta}>
                      <span>📍 {property.location}</span>
                      <span>🏷️ {property.type}</span>
                      {property.createdAt && (
                        <span>🕐 Submitted {new Date(property.createdAt).toLocaleDateString("en-PH", {
                          year: "numeric", month: "long", day: "numeric",
                        })}</span>
                      )}
                    </div>
                  </div>
                  <div className={styles.detailPrice}>
                    {formatPrice(property.price)}
                    <span>/mo</span>
                  </div>
                </div>

                {/* Specs */}
                <div className={styles.specRow}>
                  {property.beds  != null && <div className={styles.specCard}><span className={styles.specIcon}>🛏</span><span className={styles.specVal}>{property.beds}</span><span className={styles.specLbl}>Beds</span></div>}
                  {property.baths != null && <div className={styles.specCard}><span className={styles.specIcon}>🚿</span><span className={styles.specVal}>{property.baths}</span><span className={styles.specLbl}>Baths</span></div>}
                  {property.sqm   != null && <div className={styles.specCard}><span className={styles.specIcon}>📐</span><span className={styles.specVal}>{property.sqm}</span><span className={styles.specLbl}>sqm</span></div>}
                  <div className={styles.specCard}><span className={styles.specIcon}>📸</span><span className={styles.specVal}>{property.images.length}</span><span className={styles.specLbl}>Photos</span></div>
                </div>

                {/* Description */}
                {property.description && (
                  <div className={styles.section}>
                    <div className={styles.sectionLabel}>Description</div>
                    <p className={styles.sectionText}>{property.description}</p>
                  </div>
                )}
              </div>

              {/* Right: owner card + actions */}
              <div className={styles.detailSide}>

                {/* Owner card */}
                <div className={styles.ownerCard}>
                  <div className={styles.ownerCardLabel}>Property Owner</div>
                  <div className={styles.ownerCardName}>{property.ownerName}</div>
                  {(property.ownerFacebookUrl || property.ownerInstagramUrl || property.ownerTwitterUrl) && (
                    <div className={styles.ownerLinks}>
                      {property.ownerFacebookUrl  && <a href={property.ownerFacebookUrl}  target="_blank" rel="noreferrer" className={styles.ownerLink}>Facebook</a>}
                      {property.ownerInstagramUrl && <a href={property.ownerInstagramUrl} target="_blank" rel="noreferrer" className={styles.ownerLink}>Instagram</a>}
                      {property.ownerTwitterUrl   && <a href={property.ownerTwitterUrl}   target="_blank" rel="noreferrer" className={styles.ownerLink}>Twitter</a>}
                    </div>
                  )}
                </div>

                {/* Actions — only show if still pending */}
                {property.status === "PENDING_REVIEW" && (
                  <div className={styles.actionCard}>
                    <div className={styles.actionCardLabel}>Review Decision</div>
                    <p className={styles.actionCardHint}>
                      Once you approve or reject, the owner will be notified immediately.
                    </p>
                    <button type="button" className={styles.approveBtn} onClick={() => openReview("APPROVED")}>
                      ✓ Approve Listing
                    </button>
                    <button type="button" className={styles.rejectBtn} onClick={() => openReview("REJECTED")}>
                      ✕ Reject Listing
                    </button>
                  </div>
                )}

                {property.status !== "PENDING_REVIEW" && (
                  <div className={styles.resolvedCard} data-status={property.status}>
                    <span className={styles.resolvedIcon}>
                      {property.status === "APPROVED" ? "✅" : "❌"}
                    </span>
                    <div className={styles.resolvedText}>
                      This property has been {property.status === "APPROVED" ? "approved" : "rejected"}.
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Lightbox Modal ── */}
      {isLightboxOpen && property && (
        <div 
          onClick={() => setIsLightboxOpen(false)}
          style={{
            position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh",
            backgroundColor: "rgba(18, 18, 18, 0.95)", zIndex: 9999,
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center"
          }}
        >
          {/* Header Area */}
          <div style={{ position: "absolute", top: 0, width: "100%", padding: "20px", display: "flex", justifyContent: "space-between", alignItems: "center", color: "white", boxSizing: "border-box" }}>
            <span style={{ fontSize: "14px", fontWeight: "bold", letterSpacing: "1px" }}>
              {activeImg + 1} / {property.images.length}
            </span>
            <button 
              onClick={() => setIsLightboxOpen(false)}
              style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "white", width: "40px", height: "40px", borderRadius: "50%", cursor: "pointer", fontSize: "18px", display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              ✕
            </button>
          </div>

          {/* Main Content Area */}
          <div style={{ position: "relative", width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            
            {/* Prev Arrow */}
            {property.images.length > 1 && (
              <button 
                onClick={(e) => { e.stopPropagation(); setActiveImg((i) => Math.max(0, i - 1)); }}
                style={{ position: "absolute", left: "20px", background: "rgba(255,255,255,0.1)", border: "none", color: "white", width: "50px", height: "50px", borderRadius: "50%", cursor: "pointer", fontSize: "24px", display: "flex", alignItems: "center", justifyContent: "center", opacity: activeImg === 0 ? 0.3 : 1, pointerEvents: activeImg === 0 ? "none" : "auto" }}
              >
                ‹
              </button>
            )}

            {/* The Image */}
            <img 
              src={property.images[activeImg]?.imageUrl} 
              alt="Fullscreen property" 
              onClick={(e) => e.stopPropagation()} // Clicking image doesn't close modal
              style={{ maxWidth: "85%", maxHeight: "85vh", objectFit: "contain", borderRadius: "8px", boxShadow: "0 10px 30px rgba(0,0,0,0.5)" }} 
            />

            {/* Next Arrow */}
            {property.images.length > 1 && (
              <button 
                onClick={(e) => { e.stopPropagation(); setActiveImg((i) => Math.min(property.images.length - 1, i + 1)); }}
                style={{ position: "absolute", right: "20px", background: "rgba(255,255,255,0.1)", border: "none", color: "white", width: "50px", height: "50px", borderRadius: "50%", cursor: "pointer", fontSize: "24px", display: "flex", alignItems: "center", justifyContent: "center", opacity: activeImg === property.images.length - 1 ? 0.3 : 1, pointerEvents: activeImg === property.images.length - 1 ? "none" : "auto" }}
              >
                ›
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Review Modal ── */}
      {reviewAction && (
        <div className={styles.overlay} onClick={closeReview}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={`${styles.modalHeader} ${reviewAction === "APPROVED" ? styles.modalHeaderApprove : styles.modalHeaderReject}`}>
              <span>{reviewAction === "APPROVED" ? "✅" : "❌"}</span>
              <h3 className={styles.modalTitle}>{reviewAction === "APPROVED" ? "Approve Property" : "Reject Property"}</h3>
            </div>
            <div className={styles.modalBody}>
              <p className={styles.modalDesc}>
                {reviewAction === "APPROVED"
                  ? <>Approving <strong>"{property?.title}"</strong>. It will be listed publicly and the owner will be notified.</>
                  : <>Rejecting <strong>"{property?.title}"</strong>. The owner will be notified with your reason.</>
                }
              </p>
              {reviewAction === "REJECTED" && (
                <div className={styles.field}>
                  <label className={styles.fieldLabel}>Rejection Reason <span style={{ color: "#c0392b" }}>*</span></label>
                  <textarea className={styles.textarea} rows={3} value={reason}
                    onChange={(e) => setReason(e.target.value)} disabled={submitting}
                    placeholder="e.g. Incomplete details, missing photos, suspected fraud…" />
                </div>
              )}
              {reviewAction === "APPROVED" && (
                <div className={styles.field}>
                  <label className={styles.fieldLabel}>Note (optional)</label>
                  <textarea className={styles.textarea} rows={2} value={reason}
                    onChange={(e) => setReason(e.target.value)} disabled={submitting}
                    placeholder="Optional note for the owner…" />
                </div>
              )}
              {reviewError && <p className={styles.modalError}>⚠ {reviewError}</p>}
            </div>
            <div className={styles.modalFooter}>
              <button type="button" className={styles.cancelBtn} onClick={closeReview} disabled={submitting}>Cancel</button>
              <button type="button"
                className={reviewAction === "APPROVED" ? styles.modalApproveBtn : styles.modalRejectBtn}
                onClick={handleSubmit} disabled={submitting}>
                {submitting ? "Processing…" : reviewAction === "APPROVED" ? "✓ Approve" : "✕ Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPropertyDetail;