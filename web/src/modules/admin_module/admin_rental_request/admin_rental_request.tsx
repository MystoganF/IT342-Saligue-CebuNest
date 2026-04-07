import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { adminApi } from "../adminApi";
import styles from "./admin_rental_request.module.css";

interface AdminUser { id: number; name: string; email: string; role: string; }

interface RentalRequest {
  id: number;
  propertyTitle: string;
  propertyLocation: string;
  propertyPrice: number;
  propertyImage: string | null;
  propertyType: string;
  status: string;
  createdAt: string;
  ownerName: string;
  beds: number | null;
  baths: number | null;
  sqm: number | null;
}

function timeAgo(isoStr: string): string {
  const diff  = Date.now() - new Date(isoStr).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins  < 1)  return "just now";
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days  < 7)  return `${days}d ago`;
  return new Date(isoStr).toLocaleDateString("en-PH", { month: "short", day: "numeric" });
}

function formatPrice(n: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency", currency: "PHP",
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(n);
}

const AdminRentalRequests: React.FC = () => {
  const navigate = useNavigate();
  const { user: admin } = useOutletContext<{ user: AdminUser }>();
  
  const [requests, setRequests] = useState<RentalRequest[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const data = await adminApi.getAllRentalRequests();
      if (!data.success) { setError(data?.error?.message ?? "Failed to fetch."); return; }
      setRequests(data.data.requests ?? []);
    } catch { 
      setError("Unable to connect to server."); 
    } finally { 
      setLoading(false); 
    }
  }, []);

  useEffect(() => { if (admin) fetchRequests(); }, [admin, fetchRequests]);

  if (!admin) return null;

  return (
    <div className={styles.page}>
      {/* ── AdminSidebar removed (Handled by AdminLayout) ── */}

      <div className={styles.main}>
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>Pending Rental Requests</h1>
            <p className={styles.pageSub}>{loading ? "Loading..." : `${requests.length} property awaiting review`}</p>
          </div>
          <button className={styles.refreshBtn} onClick={fetchRequests} disabled={loading} type="button">
            ↻ Refresh
          </button>
        </div>

        {loading ? (
          <div className={styles.skeletonList}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className={styles.skeletonCard}>
                <div className={styles.skeletonImg} />
                <div className={styles.skeletonBody}>
                  <div className={`${styles.skeletonLine} ${styles.skeletonLg}`} />
                  <div className={`${styles.skeletonLine} ${styles.skeletonMd}`} />
                  <div className={`${styles.skeletonLine} ${styles.skeletonSm}`} />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className={styles.stateBox}>
            <span className={styles.stateIcon}>⚠️</span>
            <h3 className={styles.stateTitle}>Failed to load</h3>
            <p className={styles.stateBody}>{error}</p>
            <button className={styles.stateBtn} onClick={fetchRequests} type="button">Try Again</button>
          </div>
        ) : requests.length === 0 ? (
          <div className={styles.stateBox}>
            <span className={styles.stateIcon}>🎉</span>
            <h3 className={styles.stateTitle}>All caught up!</h3>
            <p className={styles.stateBody}>There are no pending property requests at this time.</p>
          </div>
        ) : (
          <div className={styles.requestList}>
            {requests.map((r, i) => (
              <div key={r.id} className={styles.requestCard} style={{ animationDelay: `${i * 30}ms` }} 
                   onClick={() => navigate(`/admin/rental-requests/${r.id}`)}>
                <div className={styles.cardLeft}>
                  <div className={styles.cardImgWrap}>
                    {r.propertyImage ? <img src={r.propertyImage} alt="" className={styles.cardImg} /> : <div className={styles.cardImgPlaceholder}>🏠</div>}
                  </div>
                  <div className={styles.cardInfo}>
                    <h3 className={styles.cardTitle}>{r.propertyTitle}</h3>
                    <div className={styles.cardMeta}>
                      <span>📍 {r.propertyLocation}</span>
                      <span>🏷️ {r.propertyType}</span>
                      <span>👤 {r.ownerName}</span>
                      <span>🕐 {timeAgo(r.createdAt)}</span>
                    </div>
                    {(r.beds || r.baths || r.sqm) && (
                      <div className={styles.cardSpecs}>
                        {r.beds  != null && <span className={styles.specBadge}>🛏 {r.beds} beds</span>}
                        {r.baths != null && <span className={styles.specBadge}>🚿 {r.baths} bath</span>}
                        {r.sqm   != null && <span className={styles.specBadge}>📐 {r.sqm} sqm</span>}
                      </div>
                    )}
                  </div>
                </div>
                <div className={styles.cardRight}>
                  <div className={styles.cardPrice}>{formatPrice(r.propertyPrice)}<span>/mo</span></div>
                  <button className={styles.reviewBtn} type="button" onClick={(e) => { e.stopPropagation(); navigate(`/admin/rental-requests/${r.id}`); }}>
                    Review Listing →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminRentalRequests;