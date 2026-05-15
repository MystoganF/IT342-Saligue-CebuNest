import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { propertyDetailApi } from "./property_detail.api";
import styles from "./AdminPropertyDetail.module.css";

import {
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Home,
  MapPin,
  Tag,
  Clock,
  Bed,
  Bath,
  Maximize,
  Camera,
  Check,
  X,
  CheckCircle2,
  XCircle,
  Loader2,
  User,
} from "lucide-react";

// ─── Custom Social Icons (Lucide removed brands) ───────────────────────────
const FacebookIcon = ({ size = 18 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" width={size} height={size}>
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);

const InstagramIcon = ({ size = 18 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);

const TwitterIcon = ({ size = 18 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" width={size} height={size}>
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

// ─── Types ─────────────────────────────────────────────────────────────────
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

// ─── Helpers ───────────────────────────────────────────────────────────────
function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency", currency: "PHP",
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(price);
}

// ─── Main Component ────────────────────────────────────────────────────────
const AdminPropertyDetail: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [property, setProperty] = useState<PropertyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Gallery Lightbox
  const [activeImg, setActiveImg] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  
  // Review Modal
  const [reviewAction, setReviewAction] = useState<"APPROVED" | "REJECTED" | null>(null);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // Authentication check
  useEffect(() => {
    const stored = localStorage.getItem("user");
    const token = localStorage.getItem("accessToken");
    if (!stored || !token) { navigate("/"); return; }
    try {
      const parsed: AdminUser = JSON.parse(stored);
      if (parsed.role?.toUpperCase() !== "ADMIN") { navigate("/home"); return; }
      setAdmin(parsed);
    } catch { navigate("/"); }
  }, [navigate]);

  // Fetch data
  const fetchProperty = useCallback(async () => {
    if (!id) return;
    setLoading(true); setError(null);
    try {
      const data = await propertyDetailApi.getRentalRequestById(id);
      if (!data.success) { setError(data?.error?.message ?? "Failed to load."); return; }
      setProperty(data.data.property);
    } catch { 
      setError("Unable to connect to server."); 
    } finally { 
      setLoading(false); 
    }
  }, [id]);

  useEffect(() => { if (admin) fetchProperty(); }, [admin, fetchProperty]);

  // Lightbox keyboard navigation
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

  // Review Actions
  const openReview = (action: "APPROVED" | "REJECTED") => {
    setReviewAction(action);
    setReason(""); 
    setReviewError(null);
  };
  
  const closeReview = () => { 
    if (!submitting) { 
      setReviewAction(null); 
      setReason(""); 
      setReviewError(null); 
    } 
  };

  const handleSubmit = async () => {
    if (!reviewAction || !property) return;
    if (reviewAction === "REJECTED" && !reason.trim()) {
      setReviewError("Please provide a reason for rejection."); 
      return;
    }
    
    setSubmitting(true); 
    setReviewError(null);
    try {
      const data = await propertyDetailApi.updatePropertyReviewStatus(property.id, {
        status: reviewAction,
        reason: reason.trim() || null
      });
      
      if (!data.success) { 
        setReviewError(data?.error?.message ?? "Failed."); 
        return;
      }
      
      setProperty(prev => prev ? { ...prev, status: reviewAction } : prev);
      setDone(true);
      closeReview();
    } catch { 
      setReviewError("Network error."); 
    } finally { 
      setSubmitting(false); 
    }
  };

  if (!admin) return null;

  return (
    <div className={styles.page}>
      
      {/* ── Page Header ── */}
      <div className={styles.pageBar}>
        <div className={styles.pageBarDeco} />
        <div className={styles.pageBarAccent} />
        <div className={styles.pageBarInner}>
          <button className={styles.backBtn} onClick={() => navigate("/admin/rental-requests")} type="button">
            <ChevronLeft size={16} /> Back to Requests
          </button>
          <h1 className={styles.pageBarTitle}>Review Listing</h1>
          <p className={styles.pageBarSub}>
            Evaluate the property details submitted by the owner.
          </p>
        </div>
      </div>

      <main className={styles.main}>
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
            <span className={styles.stateIcon}><AlertTriangle size={48} /></span>
            <h3 className={styles.stateTitle}>Failed to load</h3>
            <p className={styles.stateBody}>{error}</p>
            <button type="button" className={styles.stateBtn} onClick={fetchProperty}>Try Again</button>
          </div>
        )}

        {!loading && !error && property && (
          <>
            {done && (
              <div className={styles.doneBanner}>
                <CheckCircle2 size={18} /> Property has been {property.status === "APPROVED" ? "approved" : "rejected"}. The owner has been notified.
              </div>
            )}

            <div className={styles.detailGrid}>
              
              {/* ── LEFT COLUMN ── */}
              <div className={styles.detailMain}>
                
                {/* Basic Info Card */}
                <div className={styles.card}>
                  <div className={styles.detailHeaderRow}>
                    <div>
                      <div className={styles.statusBadge} data-status={property.status}>
                        {property.status.replace("_", " ")}
                      </div>
                      <h1 className={styles.detailTitle}>{property.title}</h1>
                      <div className={styles.detailMeta}>
                        <span className={styles.metaItem}><MapPin size={14} className={styles.inlineIcon} /> {property.location}</span>
                        <span className={styles.metaItem}><Tag size={14} className={styles.inlineIcon} /> {property.type}</span>
                        {property.createdAt && (
                          <span className={styles.metaItem}><Clock size={14} className={styles.inlineIcon} /> Submitted {new Date(property.createdAt).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })}</span>
                        )}
                      </div>
                    </div>
                    <div className={styles.detailPrice}>
                      {formatPrice(property.price)}<span>/mo</span>
                    </div>
                  </div>

                  {/* Specs */}
                  <div className={styles.specRow}>
                    {property.beds != null && <div className={styles.specCard}><Bed size={20} className={styles.specIcon} /><span className={styles.specVal}>{property.beds}</span><span className={styles.specLbl}>Beds</span></div>}
                    {property.baths != null && <div className={styles.specCard}><Bath size={20} className={styles.specIcon} /><span className={styles.specVal}>{property.baths}</span><span className={styles.specLbl}>Baths</span></div>}
                    {property.sqm != null && <div className={styles.specCard}><Maximize size={20} className={styles.specIcon} /><span className={styles.specVal}>{property.sqm}</span><span className={styles.specLbl}>sqm</span></div>}
                    <div className={styles.specCard}><Camera size={20} className={styles.specIcon} /><span className={styles.specVal}>{property.images.length}</span><span className={styles.specLbl}>Photos</span></div>
                  </div>
                </div>

                {/* Gallery Card */}
                <div className={styles.card}>
                  <div className={styles.cardTitle}>Property Photos</div>
                  <div className={styles.gallery}>
                    <div className={styles.galleryMain}>
                      {property.images.length > 0
                        ? <img 
                            src={property.images[activeImg]?.imageUrl} 
                            alt="Property" 
                            className={styles.galleryMainImg} 
                            onClick={() => setIsLightboxOpen(true)}
                          />
                        : <div className={styles.galleryPlaceholder}><Home size={64} /></div>
                      }
                      {property.images.length > 1 && (
                        <>
                          <button type="button" className={`${styles.galleryNav} ${styles.galleryNavPrev}`} onClick={() => setActiveImg((i) => Math.max(0, i - 1))} disabled={activeImg === 0}><ChevronLeft size={24} /></button>
                          <button type="button" className={`${styles.galleryNav} ${styles.galleryNavNext}`} onClick={() => setActiveImg((i) => Math.min(property.images.length - 1, i + 1))} disabled={activeImg === property.images.length - 1}><ChevronRight size={24} /></button>
                          <div className={styles.galleryCounter}>{activeImg + 1} / {property.images.length}</div>
                        </>
                      )}
                    </div>
                    {property.images.length > 1 && (
                      <div className={styles.galleryStrip}>
                        {property.images.map((img, i) => (
                          <button type="button" key={img.id} className={`${styles.galleryThumb} ${i === activeImg ? styles.galleryThumbActive : ""}`} onClick={() => setActiveImg(i)}>
                            <img src={img.imageUrl} alt={`Photo ${i + 1}`} />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Description Card */}
                {property.description && (
                  <div className={styles.card}>
                    <div className={styles.cardTitle}>Description</div>
                    <p className={styles.sectionText}>{property.description}</p>
                  </div>
                )}
              </div>

              {/* ── RIGHT COLUMN ── */}
              <div className={styles.detailSide}>

                {/* Owner Card */}
                <div className={styles.card}>
                  <div className={styles.cardTitle}>Property Owner</div>
                  <div className={styles.ownerWrap}>
                    <div className={styles.ownerAvatar}><User size={24} /></div>
                    <div>
                      <div className={styles.ownerCardName}>{property.ownerName}</div>
                      {(property.ownerFacebookUrl || property.ownerInstagramUrl || property.ownerTwitterUrl) && (
                        <div className={styles.ownerLinks}>
                          {property.ownerFacebookUrl  && <a href={property.ownerFacebookUrl} target="_blank" rel="noreferrer" className={styles.ownerLink}><FacebookIcon size={14}/></a>}
                          {property.ownerInstagramUrl && <a href={property.ownerInstagramUrl} target="_blank" rel="noreferrer" className={styles.ownerLink}><InstagramIcon size={14}/></a>}
                          {property.ownerTwitterUrl   && <a href={property.ownerTwitterUrl} target="_blank" rel="noreferrer" className={styles.ownerLink}><TwitterIcon size={14}/></a>}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action / Review Card */}
                {property.status === "PENDING_REVIEW" && (
                  <div className={styles.card}>
                    <div className={styles.cardTitle}>Review Decision</div>
                    <p className={styles.actionCardHint}>
                      Once you approve or reject, the owner will be notified immediately.
                    </p>
                    <div className={styles.actionButtons}>
                      <button type="button" className={styles.approveBtn} onClick={() => openReview("APPROVED")}>
                        <Check size={16} /> Approve Listing
                      </button>
                      <button type="button" className={styles.rejectBtn} onClick={() => openReview("REJECTED")}>
                        <X size={16} /> Reject Listing
                      </button>
                    </div>
                  </div>
                )}

                {property.status !== "PENDING_REVIEW" && (
                  <div className={`${styles.card} ${property.status === "APPROVED" ? styles.resolvedCardApprove : styles.resolvedCardReject}`}>
                    <span className={styles.resolvedIcon}>
                      {property.status === "APPROVED" ? <CheckCircle2 size={24} /> : <XCircle size={24} />}
                    </span>
                    <div className={styles.resolvedText}>
                      This property has been <strong>{property.status === "APPROVED" ? "Approved" : "Rejected"}</strong>.
                    </div>
                  </div>
                )}
              </div>

            </div>
          </>
        )}
      </main>

      {/* ── Lightbox Modal ── */}
      {isLightboxOpen && property && (
        <div className={styles.lightboxOverlay} onClick={() => setIsLightboxOpen(false)}>
          <div className={styles.lightboxHeader}>
            <span>{activeImg + 1} / {property.images.length}</span>
            <button className={styles.lightboxClose} onClick={() => setIsLightboxOpen(false)}><X size={24} /></button>
          </div>
          <div className={styles.lightboxContent}>
            {property.images.length > 1 && (
              <button 
                className={`${styles.lightboxNav} ${styles.lightboxNavLeft}`}
                onClick={(e) => { e.stopPropagation(); setActiveImg((i) => Math.max(0, i - 1)); }}
                disabled={activeImg === 0}
              ><ChevronLeft size={36} /></button>
            )}
            <img 
              src={property.images[activeImg]?.imageUrl} 
              alt="Fullscreen property" 
              className={styles.lightboxImg}
              onClick={(e) => e.stopPropagation()} 
            />
            {property.images.length > 1 && (
              <button 
                className={`${styles.lightboxNav} ${styles.lightboxNavRight}`}
                onClick={(e) => { e.stopPropagation(); setActiveImg((i) => Math.min(property.images.length - 1, i + 1)); }}
                disabled={activeImg === property.images.length - 1}
              ><ChevronRight size={36} /></button>
            )}
          </div>
        </div>
      )}

      {/* ── Review Action Modal ── */}
      {reviewAction && (
        <div className={styles.overlay} onClick={closeReview}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={`${styles.modalHeader} ${reviewAction === "APPROVED" ? styles.modalHeaderApprove : styles.modalHeaderReject}`}>
              <h3 className={styles.modalTitle}>
                {reviewAction === "APPROVED" ? "Approve Property" : "Reject Property"}
              </h3>
              <button className={styles.modalCloseBtn} onClick={closeReview}><X size={20} /></button>
            </div>
            
            <div className={styles.modalBody}>
              <p className={styles.modalDesc}>
                {reviewAction === "APPROVED"
                  ? <>You are about to approve <strong>"{property?.title}"</strong>. It will become visible publicly and the owner will be notified.</>
                  : <>You are rejecting <strong>"{property?.title}"</strong>. The owner will be notified with your reasoning below.</>
                }
              </p>
              
              {reviewAction === "REJECTED" && (
                <div className={styles.field}>
                  <label className={styles.fieldLabel}>Rejection Reason <span className={styles.requiredMark}>*</span></label>
                  <textarea 
                    className={styles.textarea} 
                    rows={4} 
                    value={reason}
                    onChange={(e) => setReason(e.target.value)} 
                    disabled={submitting}
                    placeholder="e.g. Incomplete details, missing photos, suspected fraud…" 
                  />
                </div>
              )}
              
              {reviewAction === "APPROVED" && (
                <div className={styles.field}>
                  <label className={styles.fieldLabel}>Note (optional)</label>
                  <textarea 
                    className={styles.textarea} 
                    rows={3} 
                    value={reason}
                    onChange={(e) => setReason(e.target.value)} 
                    disabled={submitting}
                    placeholder="Optional note for the owner…" 
                  />
                </div>
              )}

              {reviewError && (
                <p className={styles.modalError}>
                  <AlertTriangle size={14} className={styles.inlineIcon} /> {reviewError}
                </p>
              )}
            </div>

            <div className={styles.modalFooter}>
              <button type="button" className={styles.cancelBtn} onClick={closeReview} disabled={submitting}>Cancel</button>
              <button 
                type="button"
                className={reviewAction === "APPROVED" ? styles.confirmApproveBtn : styles.confirmRejectBtn}
                onClick={handleSubmit} 
                disabled={submitting}
              >
                {submitting ? (
                  <><Loader2 size={16} className={styles.spinner} /> Processing…</>
                ) : reviewAction === "APPROVED" ? (
                  <><Check size={16} /> Approve Listing</>
                ) : (
                  <><X size={16} /> Reject Listing</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPropertyDetail;