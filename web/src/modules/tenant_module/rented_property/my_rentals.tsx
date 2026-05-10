import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams, useOutletContext } from "react-router-dom";
import { rentalsApi } from "./rentals.api";
import styles from "./my_rentals.module.css";
import {
  Home,
  Clock,
  XCircle,
  History,
  MapPin,
  CalendarDays,
  User,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Ban,
  Building
} from "lucide-react";

// ─── Interfaces ─────────────────────────────────────────────────────────────
interface NavUser {
  id: number;
  name: string;
  email: string;
  role: string;
  avatarUrl?: string | null;
}

interface RentalRequest {
  id: number;
  propertyId: number;
  propertyTitle: string;
  propertyLocation: string;
  propertyPrice: number;
  propertyImage: string | null;
  ownerId: number;
  ownerName: string;
  ownerEmail: string;
  startDate: string;
  leaseDurationMonths: number;
  status: string;
  createdAt: string;
}

type Tab = "active" | "pending" | "rejected" | "past";

// ─── Helpers ───────────────────────────────────────────────────────────────
function formatPrice(amount: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function statusLabel(status: string): string {
  switch (status) {
    case "PENDING":    return "Awaiting Approval";
    case "APPROVED":   return "Approved — Action Required";
    case "REJECTED":   return "Rejected";
    case "CONFIRMED":  return "Active Rental";
    case "TERMINATED": return "Lease Terminated";
    case "COMPLETED":  return "Completed";
    default:           return status;
  }
}

function statusBadgeStyle(status: string): React.CSSProperties {
  switch (status) {
    case "CONFIRMED":  return { background: "rgba(16, 185, 129, 0.1)", color: "#059669" };
    case "APPROVED":   return { background: "rgba(14, 165, 233, 0.1)", color: "#0284c7" };
    case "REJECTED":   return { background: "rgba(239, 68, 68, 0.1)", color: "#dc2626" };
    case "TERMINATED": return { background: "rgba(139, 92, 246, 0.1)", color: "#7c3aed" };
    case "COMPLETED":  return { background: "rgba(100, 116, 139, 0.1)", color: "#475569" };
    default:           return { background: "rgba(245, 158, 11, 0.1)", color: "#d97706" };
  }
}

// ─── Main Component ────────────────────────────────────────────────────────
const MyRentals: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const { user } = useOutletContext<{ user: NavUser }>();

  const [requests, setRequests] = useState<RentalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("active");
  const [banner, setBanner] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    const ps = searchParams.get("payment");
    if (ps === "success") setBanner({ type: "success", text: "Payment received! Open your rental to verify." });
    if (ps === "cancelled") setBanner({ type: "error", text: "Payment cancelled. You can try again from the rental detail page." });
  }, [searchParams]);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await rentalsApi.getMyRentalRequests();
      if (!data.success) { setError("Failed to load rentals."); return; }
      setRequests(data.data.requests ?? []);
    } catch {
      setError("Unable to connect to server.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const filtered = requests.filter((r) => {
    switch (tab) {
      case "active":   return r.status === "CONFIRMED";
      case "pending":  return r.status === "PENDING" || r.status === "APPROVED";
      case "rejected": return r.status === "REJECTED";
      case "past":     return r.status === "COMPLETED" || r.status === "TERMINATED";
      default:         return false;
    }
  });

  const counts = {
    active:   requests.filter((r) => r.status === "CONFIRMED").length,
    pending:  requests.filter((r) => r.status === "PENDING" || r.status === "APPROVED").length,
    rejected: requests.filter((r) => r.status === "REJECTED").length,
    past:     requests.filter((r) => r.status === "COMPLETED" || r.status === "TERMINATED").length,
  };

  const tabConfig: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "active",   icon: <Home size={16} strokeWidth={2.5} />,    label: "Active"   },
    { key: "pending",  icon: <Clock size={16} strokeWidth={2.5} />,   label: "Pending"  },
    { key: "rejected", icon: <XCircle size={16} strokeWidth={2.5} />, label: "Rejected" },
    { key: "past",     icon: <History size={16} strokeWidth={2.5} />, label: "Past"     },
  ];

  const emptyConfig: Record<Tab, { text: string; icon: React.ReactNode }> = {
    active:   { text: "No active rentals yet.", icon: <Home size={48} strokeWidth={1.5} /> },
    pending:  { text: "No pending requests.", icon: <Clock size={48} strokeWidth={1.5} /> },
    rejected: { text: "No rejected requests.", icon: <XCircle size={48} strokeWidth={1.5} /> },
    past:     { text: "No past rentals.", icon: <History size={48} strokeWidth={1.5} /> },
  };

  return (
    <div className={styles.page}>
      
      {/* Header spanning full width container */}
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>My Rentals</h1>
        <p className={styles.pageSub}>Track your rental requests and payment schedules.</p>
      </div>

      {banner && (
        <div className={styles.bannerWrap}>
          <div className={`${styles.banner} ${banner.type === "success" ? styles.bannerSuccess : styles.bannerError}`}>
            {banner.type === "success" ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />} 
            <span>{banner.text}</span>
            <button className={styles.bannerClose} onClick={() => setBanner(null)} type="button">✕</button>
          </div>
        </div>
      )}

      <div className={styles.main}>

        <div className={styles.tabs}>
          {tabConfig.map(({ key, icon, label }) => (
            <button
              key={key}
              type="button"
              className={`${styles.tab} ${tab === key ? styles.tabActive : ""}`}
              onClick={() => setTab(key)}
            >
              {icon} {label}
              {counts[key] > 0 && (
                <span className={`${styles.tabBadge} ${tab === key ? styles.tabBadgeActive : ""}`}>
                  {counts[key]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Skeletons now in Grid */}
        {loading && (
          <div className={styles.rentalGrid}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
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
        )}

        {!loading && error && (
          <div className={styles.stateBox}>
            <div className={styles.stateIconWrap}>
              <AlertTriangle size={48} className={styles.stateIconError} strokeWidth={1.5} />
            </div>
            <h3 className={styles.stateTitle}>Something went wrong</h3>
            <p className={styles.stateText}>{error}</p>
            <button className={styles.stateBtn} onClick={fetchRequests} type="button">Try Again</button>
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className={styles.stateBox}>
            <div className={styles.stateIconWrap}>
              {React.cloneElement(emptyConfig[tab].icon as React.ReactElement, { className: styles.stateIconEmpty })}
            </div>
            <h3 className={styles.stateTitle}>{emptyConfig[tab].text}</h3>
            <p className={styles.stateText}>
              {tab === "active" 
                ? "When your requests are approved and paid, they will appear here as active rentals."
                : "You don't have any properties in this status right now."}
            </p>
            {tab !== "rejected" && (
              <button className={styles.stateBtn} onClick={() => navigate("/home")} type="button">
                Browse Properties
              </button>
            )}
          </div>
        )}

        {/* CSS Grid for Cards */}
        {!loading && !error && filtered.length > 0 && (
          <div className={styles.rentalGrid}>
            {filtered.map((req) => (
              <div
                key={req.id}
                className={`${styles.rentalCard} ${req.status === "TERMINATED" ? styles.rentalCardTerminated : ""}`}
                onClick={() => navigate(`/my-rentals/${req.id}`)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && navigate(`/my-rentals/${req.id}`)}
              >
                <div className={styles.cardThumb}>
                  {req.propertyImage ? (
                    <img src={req.propertyImage} alt={req.propertyTitle} className={styles.cardThumbImg} />
                  ) : (
                    <div className={styles.cardThumbPlaceholder}>
                      <Building size={32} className={styles.cardThumbPlaceholderIcon} strokeWidth={1.5} />
                    </div>
                  )}
                  {req.status === "TERMINATED" && (
                    <div className={styles.terminatedOverlay}>
                      <Ban size={32} color="#fff" strokeWidth={2.5} />
                    </div>
                  )}
                </div>

                <div className={styles.cardInfo}>
                  <div className={styles.cardTop}>
                    <div className={styles.cardTitleWrap}>
                      <h3 className={styles.cardTitle}>{req.propertyTitle}</h3>
                      <div className={styles.cardLocation}>
                        <MapPin size={14} className={styles.cardIconTeal} /> 
                        {req.propertyLocation}
                      </div>
                    </div>
                    <div className={styles.cardPrice}>
                      {formatPrice(req.propertyPrice)}<span>/mo</span>
                    </div>
                  </div>

                  <div className={styles.cardMeta}>
                    <span className={styles.metaItem}>
                      <CalendarDays size={14} className={styles.metaIcon} /> Move in: {formatDate(req.startDate)}
                    </span>
                    <span className={styles.metaItem}>
                      <Clock size={14} className={styles.metaIcon} /> {req.leaseDurationMonths} month{req.leaseDurationMonths !== 1 ? "s" : ""}
                    </span>
                    <span className={styles.metaItem}>
                      <User size={14} className={styles.metaIcon} /> {req.ownerName}
                    </span>
                  </div>

                  <div className={styles.cardFooter}>
                    <span className={styles.cardStatus} style={statusBadgeStyle(req.status)}>
                      {statusLabel(req.status)}
                    </span>
                    <span className={styles.viewHint}>
                      View details <ArrowRight size={14} />
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
};

export default MyRentals;