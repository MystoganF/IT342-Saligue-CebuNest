import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import AdminSidebar from "../../../components/AdminSidebar/AdminSidebar";
import styles from "./AdminAuditLog.module.css";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";
const PAGE_SIZE = 20;

interface AdminUser { id: number; name: string; email: string; role: string; }
interface AuditEntry {
  id: number;
  adminId: number;
  adminName: string;
  action: string;
  targetType: string;
  targetId: number;
  targetTitle: string;
  reason?: string | null;
  ownerName: string;
  ownerEmail: string;
  createdAt: string;
}
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

const apiFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
  const token = localStorage.getItem("accessToken");
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers as Record<string, string> ?? {}),
    },
  });
  if (res.status === 401) {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");
    window.location.href = "/";
  }
  return res;
};

const AdminAuditLog: React.FC = () => {
  const navigate = useNavigate();
  const [admin, setAdmin]             = useState<AdminUser | null>(null);
  const [logs, setLogs]               = useState<AuditEntry[]>([]);
  const [loading, setLoading]         = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [page, setPage]               = useState(0);
  const [totalPages, setTotalPages]   = useState(1);
  const [search, setSearch]           = useState("");
  const [filter, setFilter]           = useState<"ALL" | "PROPERTY_APPROVED" | "PROPERTY_REJECTED">("ALL");
  const [expanded, setExpanded]       = useState<number | null>(null);

  // Property detail modal
  const [detailLog, setDetailLog]         = useState<AuditEntry | null>(null);
  const [property, setProperty]           = useState<PropertyDetail | null>(null);
  const [propertyLoading, setPropertyLoading] = useState(false);
  const [propertyError, setPropertyError] = useState<string | null>(null);
  const [activeImg, setActiveImg]         = useState(0);

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

  const fetchLogs = useCallback(async (pageNum: number, append = false) => {
    append ? setLoadingMore(true) : setLoading(true);
    setError(null);
    try {
      const res  = await apiFetch(`${API_BASE}/api/admin/audit-logs?page=${pageNum}&size=${PAGE_SIZE}`);
      const data = await res.json();
      if (!res.ok || !data.success) { setError(data?.error?.message ?? "Failed to load."); return; }
      setLogs((prev) => append ? [...prev, ...data.data.logs] : data.data.logs);
      setTotalPages(data.data.totalPages);
      setPage(pageNum);
    } catch { setError("Unable to connect to server."); }
    finally { append ? setLoadingMore(false) : setLoading(false); }
  }, []);

  useEffect(() => { if (admin) fetchLogs(0); }, [admin, fetchLogs]);

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
      const res  = await apiFetch(`${API_BASE}/api/admin/rental-requests/${log.targetId}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
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
    setDetailLog(null);
    setProperty(null);
    setPropertyError(null);
    setActiveImg(0);
  };

  const filtered = logs.filter((l) => {
    const q = search.toLowerCase();
    const matchSearch = (l.targetTitle || "").toLowerCase().includes(q)
      || (l.ownerName || "").toLowerCase().includes(q)
      || (l.ownerEmail || "").toLowerCase().includes(q)
      || (l.adminName || "").toLowerCase().includes(q);
      
    const matchFilter = filter === "ALL" || l.action === filter;
    return matchSearch && matchFilter;
  });

  if (!admin) return null;

  return (
    <div className={styles.page}>
      <AdminSidebar user={admin} navItems={[
        { path: "/admin/rental-requests", icon: "📋", label: "Rental Requests" },
        { path: "/admin/properties",      icon: "🏘️", label: "All Properties"  },
        { path: "/admin/users",           icon: "👥", label: "Users"           },
        { path: "/admin/audit-log",       icon: "📜", label: "Audit Log"       },
        { path: "/admin/notifications",   icon: "🔔", label: "Create Notification"   },
      ]} />

      <div className={styles.main}>
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>Audit Log</h1>
            <p className={styles.pageSub}>
              {loading ? "Loading…" : `${filtered.length} action${filtered.length !== 1 ? "s" : ""} shown`}
            </p>
          </div>
          <button type="button" className={styles.refreshBtn} onClick={() => fetchLogs(0)} disabled={loading}>
            ↻ Refresh
          </button>
        </div>

        {/* Filters */}
        <div className={styles.filters}>
          <div className={styles.searchWrap}>
            <span className={styles.searchIcon}>🔍</span>
            <input className={styles.searchInput} type="text"
              placeholder="Search by property, owner, or admin…"
              value={search} onChange={(e) => setSearch(e.target.value)} />
            {search && <button type="button" className={styles.searchClear} onClick={() => setSearch("")}>✕</button>}
          </div>
          <div className={styles.filterBtns}>
            {(["ALL", "PROPERTY_APPROVED", "PROPERTY_REJECTED"] as const).map((f) => (
              <button key={f} type="button"
                className={`${styles.filterBtn} ${filter === f ? styles.filterBtnActive : ""}`}
                onClick={() => setFilter(f)}>
                {f === "ALL" ? "All" : f === "PROPERTY_APPROVED" ? "✓ Approved" : "✕ Rejected"}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className={styles.skeletonList}>
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className={styles.skeletonRow} />)}
          </div>
        ) : error ? (
          <div className={styles.stateBox}>
            <span className={styles.stateIcon}>⚠️</span>
            <h3 className={styles.stateTitle}>Failed to load</h3>
            <p className={styles.stateBody}>{error}</p>
            <button type="button" className={styles.stateBtn} onClick={() => fetchLogs(0)}>Try Again</button>
          </div>
        ) : filtered.length === 0 ? (
          <div className={styles.stateBox}>
            <span className={styles.stateIcon}>📜</span>
            <h3 className={styles.stateTitle}>No audit entries</h3>
            <p className={styles.stateBody}>Actions will appear here after approvals or rejections.</p>
          </div>
        ) : (
          <>
            <div className={styles.logList}>
              {filtered.map((log, i) => {
                const isApproved = log.action === "PROPERTY_APPROVED";
                const isExpanded = expanded === log.id;
                return (
                  <div key={log.id} className={styles.logCard} style={{ animationDelay: `${i * 20}ms` }}>
                    <div className={`${styles.logAccent} ${isApproved ? styles.logAccentApprove : styles.logAccentReject}`} />
                    <div className={styles.logContent}>
                      <div className={styles.logTop}>
                        <div className={styles.logLeft}>
                          <span className={`${styles.logBadge} ${isApproved ? styles.logBadgeApprove : styles.logBadgeReject}`}>
                            {isApproved ? "✓ Approved" : "✕ Rejected"}
                          </span>
                          <div className={styles.logTitle}>{log.targetTitle}</div>
                          <div className={styles.logMeta}>
                            by <strong>{log.adminName}</strong> · owner: {log.ownerName}
                          </div>
                        </div>
                        <div className={styles.logRight}>
                          <div className={styles.logDate}>
                            {new Date(log.createdAt).toLocaleDateString("en-PH", {
                              year: "numeric", month: "short", day: "numeric",
                            })}
                          </div>
                          <div className={styles.logTime}>
                            {new Date(log.createdAt).toLocaleTimeString("en-PH", {
                              hour: "2-digit", minute: "2-digit",
                            })}
                          </div>
                          <div className={styles.logActions}>
                            {log.reason && (
                              <button type="button" className={styles.expandBtn}
                                onClick={() => setExpanded(isExpanded ? null : log.id)}>
                                {isExpanded ? "▲ Hide" : (isApproved ? "▼ Note" : "▼ Reason")}
                              </button>
                            )}
                            <button type="button" className={styles.viewDetailBtn}
                              onClick={() => openDetail(log)}>
                              🏠 View Property
                            </button>
                          </div>
                        </div>
                      </div>
                      {isExpanded && log.reason && (
                        <div className={`${styles.logReason} ${isApproved ? styles.logReasonApprove : styles.logReasonReject}`}>
                          <span className={`${styles.logReasonLabel} ${isApproved ? styles.logReasonLabelApprove : styles.logReasonLabelReject}`}>
                            {isApproved ? "Approval note:" : "Rejection reason:"}
                          </span> {log.reason}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {page + 1 < totalPages && (
              <div className={styles.loadMoreWrap}>
                <button type="button" className={styles.loadMoreBtn} onClick={() => fetchLogs(page + 1, true)}
                  disabled={loadingMore}>
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

            {/* Modal Header */}
            <div className={`${styles.detailModalHeader} ${detailLog.action === "PROPERTY_APPROVED" ? styles.detailModalHeaderApprove : styles.detailModalHeaderReject}`}>
              <div className={styles.detailModalHeaderLeft}>
                <span className={`${styles.logBadge} ${detailLog.action === "PROPERTY_APPROVED" ? styles.logBadgeApprove : styles.logBadgeReject}`}>
                  {detailLog.action === "PROPERTY_APPROVED" ? "✓ Approved" : "✕ Rejected"}
                </span>
                <h3 className={styles.detailModalTitle}>{detailLog.targetTitle}</h3>
                <p className={styles.detailModalSub}>
                  Reviewed by <strong>{detailLog.adminName}</strong> on{" "}
                  {new Date(detailLog.createdAt).toLocaleDateString("en-PH", {
                    year: "numeric", month: "long", day: "numeric",
                  })}
                </p>
              </div>
              <button type="button" className={styles.detailModalClose} onClick={closeDetail}>✕</button>
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
                  <span>⚠️</span>
                  <p>{propertyError}</p>
                </div>
              )}

              {property && !propertyLoading && (
                <>
                  {/* Gallery */}
                  {property.images.length > 0 && (
                    <div className={styles.gallery}>
                      <div className={styles.galleryMain}>
                        <img
                          src={property.images[activeImg]?.imageUrl}
                          alt="Property"
                          className={styles.galleryMainImg}
                        />
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

                  {/* Info grid */}
                  <div className={styles.propGrid}>
                    {/* Left: main info */}
                    <div className={styles.propMain}>
                      <div className={styles.propTitleRow}>
                        <div>
                          <h2 className={styles.propTitle}>{property.title}</h2>
                          <div className={styles.propMeta}>
                            <span>📍 {property.location}</span>
                            <span>🏷️ {property.type}</span>
                            {property.createdAt && (
                              <span>🕐 Submitted {new Date(property.createdAt).toLocaleDateString("en-PH", {
                                year: "numeric", month: "long", day: "numeric",
                              })}</span>
                            )}
                          </div>
                        </div>
                        <div className={styles.propPrice}>
                          {formatPrice(property.price)}<span>/mo</span>
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
                        <div className={styles.propSection}>
                          <div className={styles.propSectionLabel}>Description</div>
                          <p className={styles.propSectionText}>{property.description}</p>
                        </div>
                      )}
                    </div>

                    {/* Right: owner + audit info */}
                    <div className={styles.propSide}>
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

                      {/* Audit info */}
                      <div className={styles.auditInfoCard}>
                        <div className={styles.auditInfoLabel}>Audit Details</div>
                        <div className={styles.auditInfoRow}>
                          <span className={styles.auditInfoKey}>Action</span>
                          <span className={`${styles.logBadge} ${detailLog.action === "PROPERTY_APPROVED" ? styles.logBadgeApprove : styles.logBadgeReject}`}>
                            {detailLog.action === "PROPERTY_APPROVED" ? "✓ Approved" : "✕ Rejected"}
                          </span>
                        </div>
                        <div className={styles.auditInfoRow}>
                          <span className={styles.auditInfoKey}>Reviewed by</span>
                          <span className={styles.auditInfoVal}>{detailLog.adminName}</span>
                        </div>
                        <div className={styles.auditInfoRow}>
                          <span className={styles.auditInfoKey}>Date</span>
                          <span className={styles.auditInfoVal}>
                            {new Date(detailLog.createdAt).toLocaleDateString("en-PH", {
                              year: "numeric", month: "long", day: "numeric",
                            })}
                          </span>
                        </div>
                        <div className={styles.auditInfoRow}>
                          <span className={styles.auditInfoKey}>Time</span>
                          <span className={styles.auditInfoVal}>
                            {new Date(detailLog.createdAt).toLocaleTimeString("en-PH", {
                              hour: "2-digit", minute: "2-digit",
                            })}
                          </span>
                        </div>
                        {detailLog.reason && (
                          <div className={styles.auditReasonBlock}>
                            <span className={styles.auditInfoKey}>
                                {detailLog.action === "PROPERTY_APPROVED" ? "Approval Note" : "Rejection Reason"}
                            </span>
                            <p className={`${styles.auditReasonText} ${detailLog.action === "PROPERTY_APPROVED" ? styles.auditReasonTextApprove : styles.auditReasonTextReject}`}>
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
    </div>
  );
};

export default AdminAuditLog;