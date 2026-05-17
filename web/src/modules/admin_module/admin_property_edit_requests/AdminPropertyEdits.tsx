import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { propertyEditsApi } from "./admin_property_edits.api";
import styles from "./AdminPropertyEdits.module.css";
import {
  RefreshCw, MapPin, Tag, User, Clock, ArrowRight,
  AlertTriangle, CheckCircle, FilePen,
} from "lucide-react";

interface AdminUser { id: number; name: string; email: string; role: string; }

interface EditRequest {
  id: number;
  propertyId: number;
  propertyCurrentStatus: string;
  submittedByName: string;
  submittedByEmail: string;
  editStatus: string;
  proposedTitle: string;
  proposedLocation: string;
  proposedPrice: number;
  proposedTypeName: string;
  titleChanged: boolean;
  descriptionChanged: boolean;
  priceChanged: boolean;
  locationChanged: boolean;
  typeChanged: boolean;
  bedsChanged: boolean;
  bathsChanged: boolean;
  sqmChanged: boolean;
  createdAt: string;
  firstImageUrl: string | null;
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

function countChanges(r: EditRequest): number {
  return [
    r.titleChanged, r.descriptionChanged, r.priceChanged,
    r.locationChanged, r.typeChanged, r.bedsChanged, r.bathsChanged, r.sqmChanged,
  ].filter(Boolean).length;
}

const AdminPropertyEdits: React.FC = () => {
  const navigate = useNavigate();
  const { user: admin } = useOutletContext<{ user: AdminUser }>();

  const [requests, setRequests] = useState<EditRequest[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const data = await propertyEditsApi.getPendingEditRequests();
      if (!data.success) { setError(data?.error?.message ?? "Failed to fetch."); return; }
      setRequests(data.data.editRequests ?? []);
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

        {/* ── Header ── */}
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>Property Edit Requests</h1>
            <p className={styles.pageSub}>
              {loading
                ? "Syncing..."
                : `${requests.length} pending edit${requests.length === 1 ? "" : "s"} awaiting review`}
            </p>
          </div>
          <button className={styles.refreshBtn} onClick={fetchRequests} disabled={loading} type="button">
            <RefreshCw size={16} className={loading ? styles.spin : ""} /> Refresh
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
            <span className={styles.stateIcon}><AlertTriangle size={48} /></span>
            <h3 className={styles.stateTitle}>Failed to load</h3>
            <p className={styles.stateBody}>{error}</p>
            <button className={styles.stateBtn} onClick={fetchRequests} type="button">Try Again</button>
          </div>
        ) : requests.length === 0 ? (
          <div className={styles.stateBox}>
            <span className={styles.stateIcon}><CheckCircle size={48} /></span>
            <h3 className={styles.stateTitle}>All caught up!</h3>
            <p className={styles.stateBody}>No property edit requests pending review at this time.</p>
          </div>
        ) : (
          <div className={styles.requestList}>
            {requests.map((r, i) => {
              const changesCount = countChanges(r);
              return (
                <div
                  key={r.id}
                  className={styles.requestCard}
                  style={{ animationDelay: `${i * 30}ms` }}
                  onClick={() => navigate(`/admin/property-edit-requests/${r.id}`)}
                >
                  <div className={styles.cardTop}>
                    <div className={styles.cardThumb}>
                      {r.firstImageUrl ? (
                        <img
                          src={r.firstImageUrl}
                          alt={r.proposedTitle}
                          style={{
                            width: "100%", height: "100%",
                            objectFit: "cover", borderRadius: 12,
                            display: "block",
                          }}
                        />
                      ) : (
                        <FilePen size={32} />
                      )}
                    </div>    

                    <div className={styles.cardInfo}>
                      <div className={styles.cardInfoTop}>
                        <div>
                          <h3 className={styles.cardTitle}>{r.proposedTitle}</h3>
                          <div className={styles.cardMeta}>
                            <span className={styles.metaItem}><MapPin size={14} /> {r.proposedLocation}</span>
                            <span className={styles.metaItem}><Tag    size={14} /> {r.proposedTypeName}</span>
                            <span className={styles.metaItem}><User   size={14} /> {r.submittedByName}</span>
                            <span className={styles.metaItem}><Clock  size={14} /> {timeAgo(r.createdAt)}</span>
                          </div>
                        </div>
                        <div className={styles.cardPrice}>
                          {formatPrice(r.proposedPrice)}<span>/mo</span>
                        </div>
                      </div>

                      <div className={styles.changedPills}>
                        <span className={styles.changesCount}>
                          {changesCount} field{changesCount !== 1 ? "s" : ""} changed
                        </span>
                        {r.titleChanged       && <span className={styles.pill}>Title</span>}
                        {r.descriptionChanged && <span className={styles.pill}>Description</span>}
                        {r.priceChanged       && <span className={styles.pill}>Price</span>}
                        {r.locationChanged    && <span className={styles.pill}>Location</span>}
                        {r.typeChanged        && <span className={styles.pill}>Type</span>}
                        {r.bedsChanged        && <span className={styles.pill}>Beds</span>}
                        {r.bathsChanged       && <span className={styles.pill}>Baths</span>}
                        {r.sqmChanged         && <span className={styles.pill}>Sqm</span>}
                      </div>
                    </div>
                  </div>

                  <div className={styles.cardFooter}>
                    <button
                      className={styles.detailBtn}
                      type="button"
                      onClick={(e) => { e.stopPropagation(); navigate(`/admin/property-edit-requests/${r.id}`); }}
                    >
                      Review Changes <ArrowRight size={16} />
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

export default AdminPropertyEdits;