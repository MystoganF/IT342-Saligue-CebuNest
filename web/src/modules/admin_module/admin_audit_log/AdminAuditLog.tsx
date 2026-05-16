import React, { useState, useEffect, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import { auditLogApi } from "./audit_log.api";
import styles from "./AdminAuditLog.module.css";
import { 
  Search, X, RefreshCw, CheckCircle, XCircle, Home, FileText,
  BedDouble, Bath, Maximize, Image as ImageIcon, MapPin, Tag,
  AlertTriangle, ChevronDown, ChevronUp, Clock, Calendar, 
  ChevronLeft, ChevronRight, SearchX
} from "lucide-react";

const PAGE_SIZE = 20;

interface AdminUser { id: number; name: string; email: string; role: string; }
interface AuditEntry {
  id: number; adminId: number; adminName: string; action: string;
  targetType: string; targetId: number; targetTitle: string;
  reason?: string | null; ownerName: string; ownerEmail: string; createdAt: string;
}
interface PropertyDetail {
  id: number; title: string; description: string; price: number; location: string;
  type: string; status: string; beds: number | null; baths: number | null;
  sqm: number | null; ownerId: number; ownerName: string;
  ownerFacebookUrl?: string | null; ownerInstagramUrl?: string | null; ownerTwitterUrl?: string | null;
  images: { id: number; imageUrl: string }[]; createdAt: string;
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency", currency: "PHP", minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(price);
}

// Normalise action strings — handles both "APPROVED" and "PROPERTY_APPROVED"
function isApprovedAction(action: string): boolean {
  return action === "PROPERTY_APPROVED" || action === "APPROVED" || action === "PROPERTY_EDIT_APPROVED";
}
function isRejectedAction(action: string): boolean {
  return action === "PROPERTY_REJECTED" || action === "REJECTED" || action === "PROPERTY_EDIT_REJECTED"; ;
}

const AdminAuditLog: React.FC = () => {
  const { user: admin } = useOutletContext<{ user: AdminUser }>();

  const [logs, setLogs]               = useState<AuditEntry[]>([]);
  const [loading, setLoading]         = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError]             = useState<string | null>(null);

  const [page, setPage]               = useState(0);
  const [totalPages, setTotalPages]   = useState(1);
  const [search, setSearch]           = useState("");
  const [filter, setFilter]           = useState<"ALL" | "APPROVED" | "REJECTED">("ALL");
  const [expanded, setExpanded]       = useState<number | null>(null);

  const [detailLog, setDetailLog]         = useState<AuditEntry | null>(null);
  const [property, setProperty]           = useState<PropertyDetail | null>(null);
  const [propertyLoading, setPropertyLoading] = useState(false);
  const [propertyError, setPropertyError] = useState<string | null>(null);
  const [activeImg, setActiveImg]         = useState(0);

  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const fetchLogs = useCallback(async (pageNum: number, append = false) => {
    append ? setLoadingMore(true) : setLoading(true);
    setError(null);
    try {
      const data = await auditLogApi.getAuditLogs(pageNum, PAGE_SIZE);
      if (!data.success) { setError(data?.error?.message ?? "Failed to load."); return; }
      setLogs((prev) => append ? [...prev, ...data.data.logs] : data.data.logs);
      setTotalPages(data.data.totalPages);
      setPage(pageNum);
    } catch { 
      setError("Unable to connect to server."); 
    } finally { 
      append ? setLoadingMore(false) : setLoading(false); 
    }
  }, []);

  useEffect(() => { if (admin) fetchLogs(0); }, [admin, fetchLogs]);

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

  const openDetail = async (log: AuditEntry) => {
    if (!log.targetId) {
      setDetailLog(log);
      setPropertyError("Cannot load property: The Audit Log is missing the property ID.");
      return;
    }
    setDetailLog(log);
    setProperty(null);
    setPropertyError(null);
    setActiveImg(0);
    setPropertyLoading(true);
    try {
      const data = await auditLogApi.getRentalRequestById(log.targetId);
      if (!data.success) {
        setPropertyError(data?.error?.message ?? "Failed to load property.");
        return;
      }
      setProperty(data.data.property);
    } catch {
      setPropertyError("Unable to connect to server.");
    } finally {
      setPropertyLoading(false);
    }
  };

  const closeDetail = () => {
    setDetailLog(null); setProperty(null); setPropertyError(null);
    setActiveImg(0); setIsLightboxOpen(false);
  };

  const filtered = logs.filter((l) => {
    const q = search.toLowerCase();
    const matchSearch =
      (l.targetTitle || "").toLowerCase().includes(q) ||
      (l.ownerName   || "").toLowerCase().includes(q) ||
      (l.ownerEmail  || "").toLowerCase().includes(q) ||
      (l.adminName   || "").toLowerCase().includes(q);

    // Match both "PROPERTY_APPROVED" and "APPROVED" (and likewise for REJECTED)
    const matchFilter =
      filter === "ALL" ||
      (filter === "APPROVED" && isApprovedAction(l.action)) ||
      (filter === "REJECTED" && isRejectedAction(l.action));

    return matchSearch && matchFilter;
  });

  if (!admin) return null;

  return (
    <div className={styles.page}>
      <div className={styles.main}>
        {/* Header */}
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>Audit Log</h1>
            <p className={styles.pageSub}>
              {loading ? "Syncing…" : `${filtered.length} action${filtered.length !== 1 ? "s" : ""} shown`}
            </p>
          </div>
          <button type="button" className={styles.refreshBtn} onClick={() => fetchLogs(0)} disabled={loading}>
            <RefreshCw size={16} className={loading ? styles.spin : ""} /> Refresh
          </button>
        </div>

        {/* Filter Bar */}
        <div className={styles.filterBar}>
          <div className={styles.searchWrap}>
            <span className={styles.searchIcon}><Search size={16} /></span>
            <input className={styles.searchInput} type="text"
              placeholder="Search by property, owner, or admin…"
              value={search} onChange={(e) => setSearch(e.target.value)} />
            {search && (
              <button type="button" className={styles.searchClear} onClick={() => setSearch("")}>
                <X size={14} />
              </button>
            )}
          </div>
          <select
            className={styles.filterSelect}
            value={filter}
            onChange={(e) => setFilter(e.target.value as "ALL" | "APPROVED" | "REJECTED")}
          >
            <option value="ALL">All Actions</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>

        {/* List Content */}
        {loading ? (
          <div className={styles.skeletonList}>
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className={styles.skeletonRow} />)}
          </div>
        ) : error ? (
          <div className={styles.stateBox}>
            <span className={styles.stateIcon}><AlertTriangle size={48} /></span>
            <h3 className={styles.stateTitle}>Failed to load</h3>
            <p className={styles.stateBody}>{error}</p>
            <button type="button" className={styles.stateBtn} onClick={() => fetchLogs(0)}>Try Again</button>
          </div>
        ) : filtered.length === 0 ? (
          <div className={styles.stateBox}>
            <span className={styles.stateIcon}><SearchX size={48} /></span>
            <h3 className={styles.stateTitle}>No audit entries</h3>
            <p className={styles.stateBody}>Actions will appear here after approvals or rejections.</p>
          </div>
        ) : (
          <>
            <div className={styles.logList}>
              {filtered.map((log, i) => {
                const isApproved = isApprovedAction(log.action);
                const isExpanded = expanded === log.id;

                return (
                  <div key={log.id} className={styles.logCard} style={{ animationDelay: `${i * 20}ms` }}>
                    <div className={styles.logCardMain}>

                      {/* Circular Status Icon */}
                      <div className={`${styles.logStatusIcon} ${isApproved ? styles.statusIconApprove : styles.statusIconReject}`}>
                        {isApproved ? <CheckCircle size={22} /> : <XCircle size={22} />}
                      </div>

                      {/* Main Info */}
                      <div className={styles.logInfo}>
                        <h3 className={styles.logTitle}>{log.targetTitle}</h3>
                        <div className={styles.logMeta}>
                          <span className={isApproved ? styles.statusTextApprove : styles.statusTextReject}>
                            {isApproved ? "Approved" : "Rejected"}
                          </span>
                          <span className={styles.dot}>•</span>
                          <span>by <strong>{log.adminName}</strong></span>
                          <span className={styles.dot}>•</span>
                          <span>owner: {log.ownerName}</span>
                        </div>
                      </div>

                      {/* Time aligned to right */}
                      <div className={styles.logTimeGroup}>
                        <div className={styles.logDate}>
                          {new Date(log.createdAt).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })}
                        </div>
                        <div className={styles.logTime}>
                          {new Date(log.createdAt).toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>
                    </div>

                    {/* Bottom Row - Actions & Reason */}
                    <div className={styles.logFooter}>
                      <div className={styles.logActions}>
                        {log.reason && (
                          <button type="button" className={styles.expandBtn} onClick={() => setExpanded(isExpanded ? null : log.id)}>
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            {isExpanded ? "Hide Note" : (isApproved ? "View Note" : "View Reason")}
                          </button>
                        )}
                        <button type="button" className={styles.viewDetailBtn} onClick={() => openDetail(log)}>
                          <Home size={14} /> View Property
                        </button>
                      </div>

                      {isExpanded && log.reason && (
                        <div className={`${styles.logReasonBox} ${isApproved ? styles.logReasonBoxApprove : styles.logReasonBoxReject}`}>
                          <strong className={isApproved ? styles.statusTextApprove : styles.statusTextReject}>
                            {isApproved ? "Approval Note: " : "Rejection Reason: "}
                          </strong>
                          <span>{log.reason}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {page + 1 < totalPages && (
              <div className={styles.loadMoreWrap}>
                <button type="button" className={styles.loadMoreBtn} onClick={() => fetchLogs(page + 1, true)} disabled={loadingMore}>
                  {loadingMore ? "Loading…" : "Load More"}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Property Detail Modal ── */}
      {detailLog && (
        <div className={styles.overlay} onClick={closeDetail}>
          <div className={styles.detailModal} onClick={(e) => e.stopPropagation()}>

            <div className={`${styles.detailModalHeader} ${isApprovedAction(detailLog.action) ? styles.detailModalHeaderApprove : styles.detailModalHeaderReject}`}>
              <div className={styles.detailModalHeaderLeft}>
                <span className={isApprovedAction(detailLog.action) ? styles.statusTextApprove : styles.statusTextReject}
                  style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  {isApprovedAction(detailLog.action) ? <CheckCircle size={14}/> : <XCircle size={14}/>}
                  {isApprovedAction(detailLog.action) ? "Approved" : "Rejected"}
                </span>
                <h3 className={styles.detailModalTitle}>{detailLog.targetTitle}</h3>
                <p className={styles.detailModalSub}>
                  Reviewed by <strong>{detailLog.adminName}</strong> on{" "}
                  {new Date(detailLog.createdAt).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })}
                </p>
              </div>
              <button type="button" className={styles.detailModalClose} onClick={closeDetail}><X size={18} /></button>
            </div>

            <div className={styles.detailModalBody}>
              {propertyLoading && (
                <div className={styles.detailModalLoading}>
                  <div className={styles.detailModalSkeletonHero} />
                  <div className={styles.detailModalSkeletonLines}>
                    {Array.from({ length: 4 }).map((_, i) => <div key={i} className={styles.detailModalSkeletonLine} />)}
                  </div>
                </div>
              )}

              {propertyError && !propertyLoading && (
                <div className={styles.detailModalError}>
                  <AlertTriangle size={20} />
                  <p>{propertyError}</p>
                </div>
              )}

              {property && !propertyLoading && (
                <>
                  {property.images.length > 0 && (
                    <div className={styles.gallery}>
                      <div className={styles.galleryMain}>
                        <img
                          src={property.images[activeImg]?.imageUrl}
                          alt="Property"
                          className={styles.galleryMainImg}
                          onClick={() => setIsLightboxOpen(true)}
                          style={{ cursor: "pointer" }}
                        />
                        {property.images.length > 1 && (
                          <>
                            <button type="button" className={`${styles.galleryNav} ${styles.galleryNavPrev}`}
                              onClick={() => setActiveImg((i) => Math.max(0, i - 1))}
                              disabled={activeImg === 0}><ChevronLeft size={20} /></button>
                            <button type="button" className={`${styles.galleryNav} ${styles.galleryNavNext}`}
                              onClick={() => setActiveImg((i) => Math.min(property.images.length - 1, i + 1))}
                              disabled={activeImg === property.images.length - 1}><ChevronRight size={20}/></button>
                            <div className={styles.galleryCounter}>{activeImg + 1} / {property.images.length}</div>
                          </>
                        )}
                      </div>
                      {property.images.length > 1 && (
                        <div className={styles.galleryStrip}>
                          {property.images.map((img, i) => (
                            <button type="button" key={img.id}
                              className={`${styles.galleryThumb} ${i === activeImg ? styles.galleryThumbActive : ""}`}
                              onClick={() => setActiveImg(i)}>
                              <img src={img.imageUrl} alt={`Photo ${i + 1}`} />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div className={styles.propGrid}>
                    <div className={styles.propMain}>
                      <div className={styles.propTitleRow}>
                        <div>
                          <h2 className={styles.propTitle}>{property.title}</h2>
                          <div className={styles.propMeta}>
                            <div className={styles.propMetaItem}><MapPin size={14}/> {property.location}</div>
                            <div className={styles.propMetaItem}><Tag size={14}/> {property.type}</div>
                            {property.createdAt && (
                              <div className={styles.propMetaItem}><Clock size={14}/> Submitted {new Date(property.createdAt).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })}</div>
                            )}
                          </div>
                        </div>
                        <div className={styles.propPrice}>
                          {formatPrice(property.price)}<span>/mo</span>
                        </div>
                      </div>

                      <div className={styles.specRow}>
                        {property.beds  != null && <div className={styles.specCard}><BedDouble size={20} className={styles.specIcon} /><span className={styles.specVal}>{property.beds}</span><span className={styles.specLbl}>Beds</span></div>}
                        {property.baths != null && <div className={styles.specCard}><Bath size={20} className={styles.specIcon} /><span className={styles.specVal}>{property.baths}</span><span className={styles.specLbl}>Baths</span></div>}
                        {property.sqm   != null && <div className={styles.specCard}><Maximize size={20} className={styles.specIcon} /><span className={styles.specVal}>{property.sqm}</span><span className={styles.specLbl}>sqm</span></div>}
                        <div className={styles.specCard}><ImageIcon size={20} className={styles.specIcon} /><span className={styles.specVal}>{property.images.length}</span><span className={styles.specLbl}>Photos</span></div>
                      </div>

                      {property.description && (
                        <div className={styles.propSection}>
                          <div className={styles.propSectionLabel}>Description</div>
                          <p className={styles.propSectionText}>{property.description}</p>
                        </div>
                      )}
                    </div>

                    <div className={styles.propSide}>
                      <div className={styles.sideCard}>
                        <div className={styles.sideCardLabel}>Property Owner</div>
                        <div className={styles.ownerCardName}>{property.ownerName}</div>
                        {(property.ownerFacebookUrl || property.ownerInstagramUrl || property.ownerTwitterUrl) && (
                          <div className={styles.ownerLinks}>
                            {property.ownerFacebookUrl  && <a href={property.ownerFacebookUrl}  target="_blank" rel="noreferrer" className={styles.ownerLink}>Facebook</a>}
                            {property.ownerInstagramUrl && <a href={property.ownerInstagramUrl} target="_blank" rel="noreferrer" className={styles.ownerLink}>Instagram</a>}
                            {property.ownerTwitterUrl   && <a href={property.ownerTwitterUrl}   target="_blank" rel="noreferrer" className={styles.ownerLink}>Twitter</a>}
                          </div>
                        )}
                      </div>

                      <div className={styles.sideCard}>
                        <div className={styles.sideCardLabel}>Audit Details</div>
                        <div className={styles.auditInfoRow}>
                          <span className={styles.auditInfoKey}>Action</span>
                          <span className={isApprovedAction(detailLog.action) ? styles.statusTextApprove : styles.statusTextReject}
                            style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                            {isApprovedAction(detailLog.action) ? <CheckCircle size={12}/> : <XCircle size={12}/>}
                            {isApprovedAction(detailLog.action) ? "Approved" : "Rejected"}
                          </span>
                        </div>
                        <div className={styles.auditInfoRow}>
                          <span className={styles.auditInfoKey}>Reviewed by</span>
                          <span className={styles.auditInfoVal}>{detailLog.adminName}</span>
                        </div>
                        <div className={styles.auditInfoRow}>
                          <span className={styles.auditInfoKey}>Date</span>
                          <span className={styles.auditInfoVal}>
                            {new Date(detailLog.createdAt).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })}
                          </span>
                        </div>
                        <div className={styles.auditInfoRow}>
                          <span className={styles.auditInfoKey}>Time</span>
                          <span className={styles.auditInfoVal}>
                            {new Date(detailLog.createdAt).toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>

                        {detailLog.reason && (
                          <div className={styles.auditReasonBlock}>
                            <span className={styles.auditInfoKey}>
                              {isApprovedAction(detailLog.action) ? "Approval Note" : "Rejection Reason"}
                            </span>
                            <p className={`${styles.auditReasonText} ${isApprovedAction(detailLog.action) ? styles.auditReasonTextApprove : styles.auditReasonTextReject}`}>
                              {detailLog.reason}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Lightbox ── */}
      {isLightboxOpen && property && (
        <div onClick={() => setIsLightboxOpen(false)} style={{
          position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh",
          backgroundColor: "rgba(18,18,18,0.95)", zIndex: 99999,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{ position: "absolute", top: 0, width: "100%", padding: "24px", display: "flex", justifyContent: "space-between", alignItems: "center", color: "white", boxSizing: "border-box" }}>
            <span style={{ fontSize: "14px", fontWeight: "bold", letterSpacing: "1px" }}>
              {activeImg + 1} / {property.images.length}
            </span>
            <button onClick={() => setIsLightboxOpen(false)} style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "white", width: "44px", height: "44px", borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <X size={24} />
            </button>
          </div>

          <div style={{ position: "relative", width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {property.images.length > 1 && (
              <button onClick={(e) => { e.stopPropagation(); setActiveImg((i) => Math.max(0, i - 1)); }}
                style={{ position: "absolute", left: "24px", background: "rgba(255,255,255,0.1)", border: "none", color: "white", width: "56px", height: "56px", borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: activeImg === 0 ? 0.3 : 1, pointerEvents: activeImg === 0 ? "none" : "auto" }}>
                <ChevronLeft size={32} />
              </button>
            )}
            <img src={property.images[activeImg]?.imageUrl} alt="Fullscreen property" onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: "85%", maxHeight: "85vh", objectFit: "contain", borderRadius: "8px", boxShadow: "0 10px 40px rgba(0,0,0,0.6)" }} />
            {property.images.length > 1 && (
              <button onClick={(e) => { e.stopPropagation(); setActiveImg((i) => Math.min(property.images.length - 1, i + 1)); }}
                style={{ position: "absolute", right: "24px", background: "rgba(255,255,255,0.1)", border: "none", color: "white", width: "56px", height: "56px", borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: activeImg === property.images.length - 1 ? 0.3 : 1, pointerEvents: activeImg === property.images.length - 1 ? "none" : "auto" }}>
                <ChevronRight size={32} />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAuditLog;