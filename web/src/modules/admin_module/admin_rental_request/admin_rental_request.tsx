import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { adminApi } from "../adminApi";
import { API_BASE } from "../../../api/axiosInstance"; 
import styles from "./admin_rental_request.module.css";

interface AdminUser { id: number; name: string; email: string; role: string; }

interface RentalRequest {
  id: number;
  // Fallbacks to support standard backend DTO keys
  title?: string;
  propertyTitle?: string;
  location?: string;
  propertyLocation?: string;
  price?: number;
  propertyPrice?: number;
  type?: string;
  propertyType?: string;
  images?: string[];
  imageUrl?: string;
  propertyImage?: string | null;
  status: string;
  createdAt: string;
  ownerName?: string;
  owner?: { name: string; id: number };
  beds: number | null;
  baths: number | null;
  sqm: number | null;
}

function timeAgo(isoStr: string | undefined): string {
  if (!isoStr) return "Unknown time";
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

function formatPrice(n: number | undefined) {
  if (n == null || isNaN(n)) return "₱0";
  return new Intl.NumberFormat("en-PH", {
    style: "currency", currency: "PHP",
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(n);
}

function getValidImageUrl(path: any): string | null {
  if (!path) return null;

  // 1. If the backend sent an object (like PropertyImageDTO), extract the URL string
  let imageStr = "";
  if (typeof path === "object") {
    imageStr = path.imageUrl || path.url || path.image || "";
  } else if (typeof path === "string") {
    imageStr = path;
  }

  // 2. If we couldn't extract a valid string, return null
  if (!imageStr || typeof imageStr !== "string") return null;

  // 3. If it's already a full URL (like your Supabase URLs!) or base64, return it as-is
  if (imageStr.startsWith("http") || imageStr.startsWith("data:")) return imageStr;
  
  // 4. Otherwise, prepend your dynamic API base URL for local files
  return `${API_BASE}${imageStr.startsWith("/") ? "" : "/"}${imageStr}`;
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
      
      // Handles both potential array keys from the backend map
      setRequests(data.data.properties ?? data.data.requests ?? []);
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
                  <div className={`${styles.skeletonLine} ${styles.skeletonLineLg}`} />
                  <div className={`${styles.skeletonLine} ${styles.skeletonLineMd}`} />
                  <div className={`${styles.skeletonLine} ${styles.skeletonLineSm}`} />
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
            {requests.map((r, i) => {
              // Extract values dynamically to handle both standard backend DTOs and old interfaces
              const displayTitle = r.title || r.propertyTitle || "Untitled Property";
              const displayLocation = r.location || r.propertyLocation || "Location not provided";
              const displayPrice = r.price ?? r.propertyPrice ?? 0;
              const displayType = r.type || r.propertyType || "Property";
              const displayOwner = r.ownerName || r.owner?.name || "Unknown Owner";
              
              // Process image
              const rawImg = (r.images && r.images.length > 0) ? r.images[0] : (r.imageUrl || r.propertyImage || null);
              const displayImg = getValidImageUrl(rawImg);

              return (
                <div key={r.id} className={styles.requestCard} style={{ animationDelay: `${i * 30}ms` }} 
                     onClick={() => navigate(`/admin/rental-requests/${r.id}`)}>
                     
                  <div className={styles.cardTop}>
                    <div className={styles.cardThumb}>
                      {displayImg ? (
                        <img src={displayImg} alt="" className={styles.cardThumbImg} />
                      ) : (
                        <div className={styles.cardThumbPlaceholder}>🏠</div>
                      )}
                    </div>
                    
                    <div className={styles.cardInfo}>
                      <div className={styles.cardInfoTop}>
                        <div>
                          <h3 className={styles.cardTitle}>{displayTitle}</h3>
                          <div className={styles.cardMeta}>
                            <span>📍 {displayLocation}</span>
                            <span>🏷️ {displayType}</span>
                            <span>👤 {displayOwner}</span>
                            <span>🕐 {timeAgo(r.createdAt)}</span>
                          </div>
                        </div>
                        <div className={styles.cardPrice}>
                          {formatPrice(displayPrice)}<span>/mo</span>
                        </div>
                      </div>

                      {(r.beds || r.baths || r.sqm) && (
                        <div className={styles.cardSpecs}>
                          {r.beds  != null && <span className={styles.spec}>🛏 {r.beds} beds</span>}
                          {r.baths != null && <span className={styles.spec}>🚿 {r.baths} bath</span>}
                          {r.sqm   != null && <span className={styles.spec}>📐 {r.sqm} sqm</span>}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className={styles.cardActions}>
                    <button 
                      className={styles.detailBtn} 
                      type="button" 
                      onClick={(e) => { e.stopPropagation(); navigate(`/admin/rental-requests/${r.id}`); }}
                    >
                      Review Listing →
                    </button>
                  </div>
                  
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminRentalRequests;