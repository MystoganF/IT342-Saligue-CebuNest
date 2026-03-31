import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Navbar from "../../../components/Navbar/Navbar";
import styles from "./my_rentals.module.css";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

interface User {
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

function formatPrice(amount: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency", currency: "PHP",
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-PH", {
    year: "numeric", month: "long", day: "numeric",
  });
}

function statusLabel(status: string): string {
  switch (status) {
    case "PENDING":    return "⏳ Awaiting Approval";
    case "APPROVED":   return "✅ Approved — Action Required";
    case "REJECTED":   return "❌ Rejected";
    case "CONFIRMED":  return "🏠 Active Rental";
    case "TERMINATED": return "🚫 Lease Terminated";
    case "COMPLETED":  return "✓ Completed";
    default:           return status;
  }
}

function statusBadgeStyle(status: string): React.CSSProperties {
  switch (status) {
    case "CONFIRMED":  return { background: "rgba(26,122,74,0.1)",   color: "#1a7a4a" };
    case "APPROVED":   return { background: "rgba(31,93,113,0.1)",   color: "#1f5d71" };
    case "REJECTED":   return { background: "rgba(192,57,43,0.1)",   color: "#c0392b" };
    case "TERMINATED": return { background: "rgba(125,60,152,0.1)",  color: "#7d3c98" };
    case "COMPLETED":  return { background: "rgba(110,112,113,0.1)", color: "#6e7071" };
    default:           return { background: "rgba(183,142,66,0.1)",  color: "#b78e42" };
  }
}

const MyRentals: React.FC = () => {
  const navigate       = useNavigate();
  const [searchParams] = useSearchParams();

  const [user, setUser]         = useState<User | null>(null);
  const [requests, setRequests] = useState<RentalRequest[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [tab, setTab]           = useState<Tab>("active");

  const [confirming, setConfirming]     = useState<number | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  const [banner, setBanner] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // ── Auth ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const stored = localStorage.getItem("user");
    const token  = localStorage.getItem("accessToken");
    if (!stored || !token) { navigate("/"); return; }
    try {
      const parsed: User = JSON.parse(stored);
      if (parsed.role?.toUpperCase() !== "TENANT") { navigate("/home"); return; }
      setUser(parsed);
    } catch { navigate("/"); }
  }, [navigate]);

  // ── PayMongo redirect banner ───────────────────────────────────────────
  useEffect(() => {
    const ps = searchParams.get("payment");
    if (ps === "success")   setBanner({ type: "success", text: "Payment received! Open your rental to verify." });
    if (ps === "cancelled") setBanner({ type: "error",   text: "Payment cancelled. You can try again from the rental detail page." });
  }, [searchParams]);

  // ── Fetch ──────────────────────────────────────────────────────────────
  const fetchRequests = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const token = localStorage.getItem("accessToken");
      const res   = await fetch(`${API_BASE}/api/rental-requests/my`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (!res.ok || !data.success) { setError("Failed to load rentals."); return; }
      setRequests(data.data.requests ?? []);
    } catch {
      setError("Unable to connect to server.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (user) fetchRequests(); }, [user, fetchRequests]);

  // ── Confirm rental (always MONTHLY) ───────────────────────────────────
  const handleConfirm = async (requestId: number) => {
    setConfirming(requestId); setConfirmError(null);
    try {
      const token = localStorage.getItem("accessToken");
      const res   = await fetch(`${API_BASE}/api/payments/confirm`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ requestId }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setConfirmError(data?.error?.message ?? "Failed to confirm."); return;
      }
      await fetchRequests();
      setTab("active");
    } catch {
      setConfirmError("Network error. Please try again.");
    } finally {
      setConfirming(null);
    }
  };

  if (!user) return null;

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

  const tabConfig: { key: Tab; label: string; icon: string }[] = [
    { key: "active",   icon: "🏠", label: "Active"   },
    { key: "pending",  icon: "⏳", label: "Pending"  },
    { key: "rejected", icon: "❌", label: "Rejected" },
    { key: "past",     icon: "✓",  label: "Past"     },
  ];

  const emptyText: Record<Tab, string> = {
    active:   "No active rentals yet.",
    pending:  "No pending requests.",
    rejected: "No rejected requests.",
    past:     "No past rentals.",
  };

  return (
    <div className={styles.page}>
      <Navbar user={user} />

      {/* ── Header ── */}
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>My Rentals</h1>
        <p className={styles.pageSub}>Track your rental requests and payment schedules.</p>
      </div>

      {/* ── Banner ── */}
      {banner && (
        <div className={styles.bannerWrap}>
          <div className={`${styles.banner} ${banner.type === "success" ? styles.bannerSuccess : styles.bannerError}`}>
            {banner.type === "success" ? "✓" : "⚠"} {banner.text}
            <button className={styles.bannerClose} onClick={() => setBanner(null)} type="button">✕</button>
          </div>
        </div>
      )}

      <div className={styles.main}>

        {/* ── Tabs ── */}
        <div className={styles.tabs}>
          {tabConfig.map(({ key, icon, label }) => (
            <button key={key} type="button"
              className={`${styles.tab} ${tab === key ? styles.tabActive : ""}`}
              onClick={() => setTab(key)}>
              {icon} {label}
              {counts[key] > 0 && (
                <span className={`${styles.tabBadge} ${tab === key ? styles.tabBadgeActive : ""}`}>
                  {counts[key]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Skeletons ── */}
        {loading && (
          <div className={styles.skeletonList}>
            {[1, 2, 3].map((i) => (
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

        {/* ── Error ── */}
        {!loading && error && (
          <div className={styles.stateBox}>
            <span className={styles.stateIcon}>⚠️</span>
            <p className={styles.stateText}>{error}</p>
            <button className={styles.stateBtn} onClick={fetchRequests} type="button">Try Again</button>
          </div>
        )}

        {/* ── Empty ── */}
        {!loading && !error && filtered.length === 0 && (
          <div className={styles.stateBox}>
            <span className={styles.stateIcon}>
              {tab === "active" ? "🏠" : tab === "pending" ? "⏳" : tab === "rejected" ? "❌" : "📋"}
            </span>
            <p className={styles.stateText}>{emptyText[tab]}</p>
            {tab !== "rejected" && (
              <button className={styles.stateBtn} onClick={() => navigate("/home")} type="button">
                Browse Properties
              </button>
            )}
          </div>
        )}

        {/* ── Cards ── */}
        {!loading && !error && filtered.length > 0 && (
          <div className={styles.rentalList}>
            {filtered.map((req) => (
              <div
                key={req.id}
                className={`${styles.rentalCard} ${req.status === "TERMINATED" ? styles.rentalCardTerminated : ""}`}
                onClick={() => navigate(`/my-rentals/${req.id}`)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && navigate(`/my-rentals/${req.id}`)}
              >
                {/* Thumbnail */}
                <div className={styles.cardThumb}>
                  {req.propertyImage
                    ? <img src={req.propertyImage} alt={req.propertyTitle} className={styles.cardThumbImg} />
                    : <div className={styles.cardThumbPlaceholder}>🏠</div>
                  }
                  {req.status === "TERMINATED" && (
                    <div className={styles.terminatedOverlay}>🚫</div>
                  )}
                </div>

                {/* Info */}
                <div className={styles.cardInfo}>
                  <div className={styles.cardTop}>
                    <div className={styles.cardTitleWrap}>
                      <h3 className={styles.cardTitle}>{req.propertyTitle}</h3>
                      <div className={styles.cardLocation}>📍 {req.propertyLocation}</div>
                    </div>
                    <div className={styles.cardPrice}>
                      {formatPrice(req.propertyPrice)}<span>/mo</span>
                    </div>
                  </div>

                  <div className={styles.cardMeta}>
                    <span>📅 Move in: {formatDate(req.startDate)}</span>
                    <span>🗓 {req.leaseDurationMonths} month{req.leaseDurationMonths !== 1 ? "s" : ""}</span>
                    <span>👤 {req.ownerName}</span>
                  </div>

                  <div className={styles.cardFooter}>
                    <span className={styles.cardStatus} style={statusBadgeStyle(req.status)}>
                      {statusLabel(req.status)}
                    </span>

                    {req.status === "APPROVED" && (
                      <button
                        className={styles.actionBtn}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleConfirm(req.id);
                        }}
                        disabled={confirming === req.id}
                        type="button"
                      >
                        {confirming === req.id ? "Confirming…" : "✓ Confirm Rental"}
                      </button>
                    )}

                    {confirmError && confirming === null && (
                      <span style={{ fontSize: "0.8rem", color: "#c0392b" }}>⚠ {confirmError}</span>
                    )}

                    <span className={styles.viewHint}>View details →</span>
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