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
      setDone(true);
      closeReview();
    } catch { setReviewError("Network error."); }
    finally { setSubmitting(false); }
  };

  if (!admin) return null;

  return (
    <div className={styles.page}>
      <AdminSidebar user={admin} navItems={[
        { path: "/admin/rental-requests", icon: "📋", label: "Rental Requests" },
        { path: "/admin/properties",      icon: "🏘️", label: "All Properties"  },
        { path: "/admin/users",           icon: "👥", label: "Users"           },
         { path: "/admin/audit-log",       icon: "📜", label: "Audit Log"       },
      ]} />

      <div className={styles.main}>
        {/* Back button */}
        <button className={styles.backBtn} onClick={() => navigate("/admin/rental-requests")} type="button">
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
            <button className={styles.stateBtn} onClick={fetchProperty} type="button">Try Again</button>
          </div>
        )}

        {!loading && !error && property && (
          <>
            {done && (
              <div className={styles.doneBanner}>
                ✓ Property has been {reviewAction === "APPROVED" ? "approved" : "rejected"}. Owner has been notified.
              </div>
            )}

            {/* ── Hero image gallery ── */}
            <div className={styles.gallery}>
              <div className={styles.galleryMain}>
                {property.images.length > 0
                  ? <img src={property.images[activeImg]?.imageUrl} alt="Property" className={styles.galleryMainImg} />
                  : <div className={styles.galleryPlaceholder}>🏠</div>
                }
                {property.images.length > 1 && (
                  <>
                    <button className={`${styles.galleryNav} ${styles.galleryNavPrev}`}
                      onClick={() => setActiveImg((i) => Math.max(0, i - 1))}
                      disabled={activeImg === 0} type="button">‹</button>
                    <button className={`${styles.galleryNav} ${styles.galleryNavNext}`}
                      onClick={() => setActiveImg((i) => Math.min(property.images.length - 1, i + 1))}
                      disabled={activeImg === property.images.length - 1} type="button">›</button>
                    <div className={styles.galleryCounter}>{activeImg + 1} / {property.images.length}</div>
                  </>
                )}
              </div>
              {property.images.length > 1 && (
                <div className={styles.galleryStrip}>
                  {property.images.map((img, i) => (
                    <button key={img.id} className={`${styles.galleryThumb} ${i === activeImg ? styles.galleryThumbActive : ""}`}
                      onClick={() => setActiveImg(i)} type="button">
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
                {property.status === "PENDING_REVIEW" && !done && (
                  <div className={styles.actionCard}>
                    <div className={styles.actionCardLabel}>Review Decision</div>
                    <p className={styles.actionCardHint}>
                      Once you approve or reject, the owner will be notified immediately.
                    </p>
                    <button className={styles.approveBtn} onClick={() => openReview("APPROVED")} type="button">
                      ✓ Approve Listing
                    </button>
                    <button className={styles.rejectBtn} onClick={() => openReview("REJECTED")} type="button">
                      ✕ Reject Listing
                    </button>
                  </div>
                )}

                {(property.status !== "PENDING_REVIEW" || done) && (
                  <div className={styles.resolvedCard} data-status={done ? reviewAction ?? property.status : property.status}>
                    <span className={styles.resolvedIcon}>
                      {(done ? reviewAction : property.status) === "APPROVED" ? "✅" : "❌"}
                    </span>
                    <div className={styles.resolvedText}>
                      This property has been {(done ? reviewAction : property.status) === "APPROVED" ? "approved" : "rejected"}.
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

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
              <button className={styles.cancelBtn} onClick={closeReview} disabled={submitting} type="button">Cancel</button>
              <button
                className={reviewAction === "APPROVED" ? styles.modalApproveBtn : styles.modalRejectBtn}
                onClick={handleSubmit} disabled={submitting} type="button">
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