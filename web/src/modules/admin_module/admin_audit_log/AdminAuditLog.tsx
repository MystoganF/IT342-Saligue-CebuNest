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

const AdminAuditLog: React.FC = () => {
  const navigate = useNavigate();
  const [admin, setAdmin]       = useState<AdminUser | null>(null);
  const [logs, setLogs]         = useState<AuditEntry[]>([]);
  const [loading, setLoading]   = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [page, setPage]         = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch]     = useState("");
  const [filter, setFilter]     = useState<"ALL" | "PROPERTY_APPROVED" | "PROPERTY_REJECTED">("ALL");
  const [expanded, setExpanded] = useState<number | null>(null);

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
      const token = localStorage.getItem("accessToken");
      const res   = await fetch(`${API_BASE}/api/admin/audit-logs?page=${pageNum}&size=${PAGE_SIZE}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (!res.ok || !data.success) { setError(data?.error?.message ?? "Failed to load."); return; }
      setLogs((prev) => append ? [...prev, ...data.data.logs] : data.data.logs);
      setTotalPages(data.data.totalPages);
      setPage(pageNum);
    } catch { setError("Unable to connect to server."); }
    finally { append ? setLoadingMore(false) : setLoading(false); }
  }, []);

  useEffect(() => { if (admin) fetchLogs(0); }, [admin, fetchLogs]);

  const filtered = logs.filter((l) => {
    const q = search.toLowerCase();
    const matchSearch = l.targetTitle.toLowerCase().includes(q)
      || l.ownerName.toLowerCase().includes(q)
      || l.ownerEmail.toLowerCase().includes(q)
      || l.adminName.toLowerCase().includes(q);
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
      ]} />

      <div className={styles.main}>
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>Audit Log</h1>
            <p className={styles.pageSub}>
              {loading ? "Loading…" : `${filtered.length} action${filtered.length !== 1 ? "s" : ""} shown`}
            </p>
          </div>
          <button className={styles.refreshBtn} onClick={() => fetchLogs(0)} disabled={loading} type="button">
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
            {search && <button className={styles.searchClear} onClick={() => setSearch("")} type="button">✕</button>}
          </div>
          <div className={styles.filterBtns}>
            {(["ALL", "PROPERTY_APPROVED", "PROPERTY_REJECTED"] as const).map((f) => (
              <button key={f}
                className={`${styles.filterBtn} ${filter === f ? styles.filterBtnActive : ""}`}
                onClick={() => setFilter(f)} type="button">
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
            <button className={styles.stateBtn} onClick={() => fetchLogs(0)} type="button">Try Again</button>
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
                          {log.reason && (
                            <button className={styles.expandBtn}
                              onClick={() => setExpanded(isExpanded ? null : log.id)} type="button">
                              {isExpanded ? "▲ Hide" : "▼ Reason"}
                            </button>
                          )}
                        </div>
                      </div>
                      {isExpanded && log.reason && (
                        <div className={styles.logReason}>
                          <span className={styles.logReasonLabel}>Rejection reason:</span> {log.reason}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {page + 1 < totalPages && (
              <div className={styles.loadMoreWrap}>
                <button className={styles.loadMoreBtn} onClick={() => fetchLogs(page + 1, true)}
                  disabled={loadingMore} type="button">
                  {loadingMore ? "Loading…" : "Load More"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AdminAuditLog;