import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import AdminSidebar from "../../../components/AdminSidebar/AdminSidebar";
import styles from "./admin_properties.module.css";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";
const PAGE_SIZE = 12;

interface AdminUser { id: number; name: string; email: string; role: string; }

interface ActiveTenant {
  tenantId: number;
  tenantName: string;
  tenantEmail: string;
  startDate: string;
  leaseDurationMonths: number;
}

interface PropertyEntry {
  id: number;
  title: string;
  location: string;
  price: number;
  type: string;
  status: string;
  ownerName: string;
  createdAt: string;
  hasActiveTenant: boolean;
  activeTenant?: ActiveTenant;
  images: { id: number; imageUrl: string }[];
}

type ModalMode = "detail" | "deactivate" | null;

const STATUSES = ["ALL", "AVAILABLE", "UNAVAILABLE", "PENDING_REVIEW", "REJECTED", "OCCUPIED"];

const statusBg: Record<string, string> = { 
  AVAILABLE: "rgba(45,140,106,0.12)", 
  UNAVAILABLE: "rgba(192,57,43,0.12)", 
  PENDING_REVIEW: "rgba(183,142,66,0.12)", 
  APPROVED: "rgba(31,93,113,0.12)", 
  REJECTED: "rgba(192,57,43,0.12)",
  OCCUPIED: "rgba(125,60,152,0.12)" 
};

const statusColor: Record<string, string> = { 
  AVAILABLE: "#2d8c6a", 
  UNAVAILABLE: "#c0392b", 
  PENDING_REVIEW: "#b78e42", 
  APPROVED: "#1f5d71", 
  REJECTED: "#c0392b",
  OCCUPIED: "#7d3c98" 
};

const AdminProperties: React.FC = () => {
  const navigate = useNavigate();
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [allProps, setAllProps] = useState<PropertyEntry[]>([]);
  const [visible, setVisible] = useState<PropertyEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);

  const [modal, setModal] = useState<ModalMode>(null);
  const [target, setTarget] = useState<PropertyEntry | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // NEW: State for deactivation reason
  const [deactivateReason, setDeactivateReason] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem("user");
    const token = localStorage.getItem("accessToken");
    if (!stored || !token) { navigate("/"); return; }
    try {
      const parsed = JSON.parse(stored);
      if (parsed.role?.toUpperCase() !== "ADMIN") { navigate("/home"); return; }
      setAdmin(parsed);
    } catch { navigate("/"); }
  }, [navigate]);

  const fetchProperties = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch(`${API_BASE}/api/admin/properties`, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
      });
      const data = await res.json();
      if (!res.ok || !data.success) { setError(data?.error?.message ?? "Failed to fetch."); return; }
      setAllProps(data.data.properties ?? []);
      setPage(1);
    } catch { setError("Connection error."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (admin) fetchProperties(); }, [admin, fetchProperties]);

  useEffect(() => {
    const q = search.toLowerCase();
    const filtered = allProps.filter((p) => {
      const matchSearch = p.title.toLowerCase().includes(q) || p.location.toLowerCase().includes(q) || p.ownerName.toLowerCase().includes(q);
      const displayStatus = p.hasActiveTenant ? "OCCUPIED" : p.status.toUpperCase();
      const matchStatus = statusFilter === "ALL" || displayStatus === statusFilter;
      return matchSearch && matchStatus;
    });
    setVisible(filtered.slice(0, page * PAGE_SIZE));
  }, [allProps, search, statusFilter, page]);

  const getFilteredCount = () => {
    const q = search.toLowerCase();
    return allProps.filter((p) => {
      const displayStatus = p.hasActiveTenant ? "OCCUPIED" : p.status.toUpperCase();
      return (p.title.toLowerCase().includes(q) || p.location.toLowerCase().includes(q)) && (statusFilter === "ALL" || displayStatus === statusFilter);
    }).length;
  };

  const closeModal = () => {
    if (!submitting) {
      setModal(null);
      setTarget(null);
      setDeactivateReason(""); // Clear reason state
      setModalError(null);
    }
  };

  const handleToggleVisibility = async () => {
    if (!target) return;

    // Validate: If deactivating (moving from AVAILABLE), reason is required
    if (target.status === "AVAILABLE" && !deactivateReason.trim()) {
      setModalError("Please provide a reason for deactivation.");
      return;
    }

    setSubmitting(true); setModalError(null);
    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch(`${API_BASE}/api/admin/properties/${target.id}/visibility`, { 
        method: "PUT",
        headers: { 
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ reason: deactivateReason })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Failed update");

      await fetchProperties(); 
      closeModal();
    } catch (err: any) { 
        setModalError(err.message || "Network error."); 
    } finally { 
        setSubmitting(false); 
    }
  };

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
            <h1 className={styles.pageTitle}>Property Management</h1>
            <p className={styles.pageSub}>{loading ? "Syncing..." : `Showing ${visible.length} of ${getFilteredCount()} total properties`}</p>
          </div>
        </div>

        <div className={styles.filters}>
          <div className={styles.searchWrap}>
            <span className={styles.searchIcon}>🔍</span>
            <input className={styles.searchInput} type="text" placeholder="Search properties..." value={search} onChange={(e) => {setSearch(e.target.value); setPage(1);}} />
          </div>
          <div className={styles.roleFilters}>
            {STATUSES.map((s) => (
              <button key={s} className={`${styles.roleFilterBtn} ${statusFilter === s ? styles.roleFilterActive : ""}`} onClick={() => {setStatusFilter(s); setPage(1);}}>
                {s.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className={styles.cardGrid}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className={styles.skeletonCard} />
            ))}
          </div>
        ) : error ? (
          <div className={styles.stateBox}>
            <span className={styles.stateIcon}>⚠️</span>
            <h3 className={styles.stateTitle}>Failed to load</h3>
            <p className={styles.stateBody}>{error}</p>
            <button className={styles.stateBtn} onClick={fetchProperties} type="button">Try Again</button>
          </div>
        ) : visible.length === 0 ? (
          <div className={styles.stateBox}>
            <span className={styles.stateIcon}>🏘️</span>
            <h3 className={styles.stateTitle}>No properties found</h3>
            <p className={styles.stateBody}>Try adjusting your search or filters.</p>
          </div>
        ) : (
          <>
            <div className={styles.cardGrid}>
              {visible.map((p, i) => {
                const displayStatus = p.hasActiveTenant ? "OCCUPIED" : p.status;
                return (
                  <div key={p.id} className={styles.propertyCard} style={{ animationDelay: `${i * 20}ms` }} onClick={() => {setTarget(p); setModal("detail");}}>
                    <div className={styles.cardImageWrap}>
                      {p.images?.[0] ? <img src={p.images[0].imageUrl} className={styles.cardImg} alt="" /> : <div className={styles.cardImgPlaceholder}>🏡</div>}
                      <span className={styles.statusPill} style={{ background: statusBg[displayStatus], color: statusColor[displayStatus] }}>
                        {displayStatus.replace("_", " ")}
                      </span>
                    </div>
                    <div className={styles.cardContent}>
                      <div className={styles.cardPrice}>₱{p.price.toLocaleString()}</div>
                      <div className={styles.cardTitle}>{p.title}</div>
                      <div className={styles.cardLoc}>📍 {p.location}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {visible.length < getFilteredCount() && (
              <div className={styles.loadMoreWrap}>
                <button className={styles.loadMoreBtn} onClick={() => setPage(p => p + 1)}>Load More Properties</button>
              </div>
            )}
          </>
        )}
      </div>

      {/* DETAIL MODAL */}
      {modal === "detail" && target && (
        <div className={styles.overlay} onClick={() => closeModal()}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
               <h3 className={styles.modalTitle}>{target.title}</h3>
               <button className={styles.modalCloseBtn} onClick={() => closeModal()}>✕</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.detailRows}>
                <div className={styles.detailRow}><span className={styles.detailRowLabel}>Owner</span><span className={styles.detailRowValue}>{target.ownerName}</span></div>
                <div className={styles.detailRow}><span className={styles.detailRowLabel}>Location</span><span className={styles.detailRowValue}>{target.location}</span></div>
                <div className={styles.detailRow}>
                    <span className={styles.detailRowLabel}>Display Status</span>
                    <span className={styles.statusPill} style={{ position: 'static', background: statusBg[target.hasActiveTenant ? "OCCUPIED" : target.status], color: statusColor[target.hasActiveTenant ? "OCCUPIED" : target.status] }}>
                        {target.hasActiveTenant ? "OCCUPIED" : target.status.replace("_", " ")}
                    </span>
                </div>
              </div>

              {target.hasActiveTenant && target.activeTenant && (
                <div style={{ marginTop: "15px", padding: "12px", background: "rgba(125,60,152,0.05)", border: "1px solid rgba(125,60,152,0.15)", borderRadius: "10px" }}>
                  <div style={{ fontSize: "11px", fontWeight: 800, color: "#7d3c98", marginBottom: "8px", textTransform: 'uppercase' }}>Active Lease Info</div>
                  <div style={{ fontSize: "13px" }}>
                    <div className={styles.detailRow}><span className={styles.detailRowLabel}>Tenant</span><span className={styles.detailRowValue}>{target.activeTenant.tenantName}</span></div>
                    <div className={styles.detailRow}><span className={styles.detailRowLabel}>Email</span><span className={styles.detailRowValue}>{target.activeTenant.tenantEmail}</span></div>
                    <div className={styles.detailRow}><span className={styles.detailRowLabel}>Move-in</span><span className={styles.detailRowValue}>{target.activeTenant.startDate}</span></div>
                    <div className={styles.detailRow} style={{border: 'none'}}><span className={styles.detailRowLabel}>Duration</span><span className={styles.detailRowValue}>{target.activeTenant.leaseDurationMonths} Mo.</span></div>
                  </div>
                </div>
              )}

              <div className={styles.detailActions} style={{ marginTop: "24px" }}>
                <button className={styles.detailActionBtn} onClick={() => navigate(`/admin/properties/${target.id}/edit`)}>✏️ Edit Property</button>
                
                {target.hasActiveTenant ? (
                  <div style={{ marginTop: "8px", fontSize: "12px", color: "#7d3c98", background: "rgba(125,60,152,0.06)", padding: "10px", borderRadius: "8px", textAlign: 'center' }}>
                    Cannot toggle visibility while property is occupied.
                  </div>
                ) : (
                  <button className={`${styles.detailActionBtn} ${target.status === 'AVAILABLE' ? styles.detailActionBtnWarn : styles.detailActionBtnGreen}`} onClick={() => setModal("deactivate")}>
                    {target.status === "AVAILABLE" ? "Deactivate listing" : "Activate listing"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DEACTIVATE / ACTIVATE CONFIRMATION MODAL */}
      {modal === "deactivate" && target && (
        <div className={styles.overlay} onClick={() => closeModal()}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader} style={{
                background: target.status === "AVAILABLE" 
                ? 'linear-gradient(135deg, #fdf0ee, #fde0db)' 
                : 'linear-gradient(135deg, #f0fdf4, #dcfce7)'
            }}>
               <h3 className={styles.modalTitle}>
                 {target.status === "AVAILABLE" ? "Confirm Deactivation" : "Confirm Activation"}
               </h3>
            </div>
            <div className={styles.modalBody}>
              <p className={styles.modalDesc}>
                Are you sure you want to change the visibility for <strong>{target.title}</strong>?
              </p>

              {/* Show Reason field ONLY when deactivating an AVAILABLE listing */}
              {target.status === "AVAILABLE" && (
                <div style={{ marginTop: "15px" }}>
                    <label style={{ 
                        display: "block", 
                        fontSize: "12px", 
                        fontWeight: 700, 
                        marginBottom: "5px", 
                        color: "#c0392b" 
                    }}>
                        REASON FOR DEACTIVATION (Visible to Owner)
                    </label>
                    <textarea
                        style={{
                            width: "100%",
                            padding: "12px",
                            borderRadius: "10px",
                            border: "1.5px solid #eee",
                            fontSize: "14px",
                            minHeight: "100px",
                            fontFamily: "inherit",
                            resize: "none",
                            outline: 'none',
                            backgroundColor: '#fafafa'
                        }}
                        placeholder="Provide a specific reason (e.g., policy violation, duplicate listing, reported address issues)..."
                        value={deactivateReason}
                        onChange={(e) => setDeactivateReason(e.target.value)}
                    />
                </div>
              )}

              {modalError && (
                <p style={{ color: "#c0392b", fontSize: "13px", marginTop: "12px", fontWeight: 600 }}>
                    ⚠️ {modalError}
                </p>
              )}

              <div className={styles.modalFooter} style={{ marginTop: "24px" }}>
                <button className={styles.cancelBtn} onClick={() => closeModal()}>Cancel</button>
                <button 
                    className={target.status === "AVAILABLE" ? styles.dangerBtn : styles.confirmBtn} 
                    onClick={handleToggleVisibility} 
                    disabled={submitting}
                >
                  {submitting ? "Processing..." : "Confirm Change"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminProperties;