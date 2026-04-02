import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import AdminSidebar from "../../../components/AdminSidebar/AdminSidebar";
import styles from "./admin_rental_request.module.css";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

// ─── types ─────────────────────────────────────────────────────────────────

interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: string;
  avatarUrl?: string | null;
}

interface Property {
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
  images: { imageUrl: string }[];
  createdAt: string;
}

// ─── helpers ───────────────────────────────────────────────────────────────

function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency", currency: "PHP",
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(price);
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

// ─── component ─────────────────────────────────────────────────────────────

const AdminRentalRequests: React.FC = () => {
  const navigate = useNavigate();

  const [user, setUser]             = useState<AdminUser | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);

  // Review modal
  const [reviewTarget, setReviewTarget] = useState<Property | null>(null);
  const [reviewAction, setReviewAction] = useState<"APPROVED" | "REJECTED" | null>(null);
  const [reason, setReason]             = useState("");
  const [submitting, setSubmitting]     = useState(false);
  const [reviewError, setReviewError]   = useState<string | null>(null);

  // Detail expand
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // ── Auth guard — admin only ────────────────────────────────────────────
  useEffect(() => {
    const stored = localStorage.getItem("user");
    const token  = localStorage.getItem("accessToken");
    if (!stored || !token) { navigate("/"); return; }
    try {
      const parsed: AdminUser = JSON.parse(stored);
      if (parsed.role?.toUpperCase() !== "ADMIN") { navigate("/home"); return; }
      setUser(parsed);
    } catch { navigate("/"); }
  }, [navigate]);

  // ── Fetch pending requests ─────────────────────────────────────────────
  const fetchPending = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("accessToken");
      const res   = await fetch(`${API_BASE}/api/admin/rental-requests/pending`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data?.error?.message ?? "Failed to load pending requests.");
        return;
      }
      setProperties(data.data.properties ?? []);
    } catch {
      setError("Unable to connect to server.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (user) fetchPending(); }, [user, fetchPending]);

  // ── Open review modal ──────────────────────────────────────────────────
  const openReview = (property: Property, action: "APPROVED" | "REJECTED") => {
    setReviewTarget(property);
    setReviewAction(action);
    setReason("");
    setReviewError(null);
  };

  const closeReview = () => {
    if (submitting) return;
    setReviewTarget(null);
    setReviewAction(null);
    setReason("");
    setReviewError(null);
  };

  // ── Submit approval / rejection ────────────────────────────────────────
  const handleSubmitReview = async () => {
    if (!reviewTarget || !reviewAction) return;
    if (reviewAction === "REJECTED" && !reason.trim()) {
      setReviewError("Please provide a reason for rejection.");
      return;
    }

    setSubmitting(true);
    setReviewError(null);

    try {
      const token = localStorage.getItem("accessToken");
      const res   = await fetch(
        `${API_BASE}/api/admin/rental-requests/${reviewTarget.id}/status`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            status: reviewAction,
            reason: reason.trim() || null,
          }),
        }
      );
      const data = await res.json();

      if (!res.ok || !data.success) {
        setReviewError(data?.error?.message ?? "Failed to update status.");
        return;
      }

      setProperties((prev) => prev.filter((p) => p.id !== reviewTarget.id));
      closeReview();
    } catch {
      setReviewError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <div className={styles.page}>

      {/* ── Reusable Sidebar ── */}
      <AdminSidebar
        user={user}
        navItems={[
          { path: "/admin/rental-requests", icon: "📋", label: "Rental Requests", badge: properties.length },
          { path: "/admin/properties",      icon: "🏘️", label: "All Properties"  },
          { path: "/admin/users",           icon: "👥", label: "Users"           },
        ]}
      />

      {/* ── Main ── */}
      <div className={styles.main}>

        {/* Page header */}
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>Pending Rental Requests</h1>
            <p className={styles.pageSub}>
              {loading
                ? "Loading…"
                : `${properties.length} propert${properties.length !== 1 ? "ies" : "y"} awaiting review`}
            </p>
          </div>
          <button className={styles.refreshBtn} onClick={fetchPending} disabled={loading} type="button">
            ↻ Refresh
          </button>
        </div>

        {/* ── Review Modal ── */}
        {reviewTarget && reviewAction && (
          <div className={styles.modalOverlay} onClick={closeReview}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>

              <div className={`${styles.modalHeader} ${
                reviewAction === "APPROVED" ? styles.modalHeaderApprove : styles.modalHeaderReject
              }`}>
                <span className={styles.modalHeaderIcon}>
                  {reviewAction === "APPROVED" ? "✅" : "❌"}
                </span>
                <h3 className={styles.modalTitle}>
                  {reviewAction === "APPROVED" ? "Approve Property" : "Reject Property"}
                </h3>
              </div>

              <div className={styles.modalBody}>
                <p className={styles.modalDesc}>
                  {reviewAction === "APPROVED"
                    ? <>You are approving <strong>"{reviewTarget.title}"</strong>. It will be listed publicly and the owner will be notified.</>
                    : <>You are rejecting <strong>"{reviewTarget.title}"</strong>. The owner will be notified with your reason.</>
                  }
                </p>

                <div className={styles.modalPropertyInfo}>
                  <span className={styles.modalPropertyInfoItem}>👤 {reviewTarget.ownerName}</span>
                  <span className={styles.modalPropertyInfoItem}>📍 {reviewTarget.location}</span>
                  <span className={styles.modalPropertyInfoItem}>{formatPrice(reviewTarget.price)}/mo</span>
                </div>

                {reviewAction === "REJECTED" && (
                  <div className={styles.modalField}>
                    <label className={styles.modalFieldLabel}>
                      Rejection Reason <span style={{ color: "#c0392b" }}>*</span>
                    </label>
                    <textarea
                      className={styles.modalTextarea}
                      placeholder="e.g. Incomplete property details, missing photos, suspected fraud…"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      rows={3}
                      disabled={submitting}
                    />
                  </div>
                )}

                {reviewAction === "APPROVED" && (
                  <div className={styles.modalField}>
                    <label className={styles.modalFieldLabel}>Note (optional)</label>
                    <textarea
                      className={styles.modalTextarea}
                      placeholder="Add a note for the owner (optional)…"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      rows={2}
                      disabled={submitting}
                    />
                  </div>
                )}

                {reviewError && (
                  <p className={styles.modalError}>⚠ {reviewError}</p>
                )}
              </div>

              <div className={styles.modalFooter}>
                <button
                  className={styles.modalCancelBtn}
                  onClick={closeReview}
                  disabled={submitting}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className={reviewAction === "APPROVED" ? styles.modalApproveBtn : styles.modalRejectBtn}
                  onClick={handleSubmitReview}
                  disabled={submitting}
                  type="button"
                >
                  {submitting
                    ? <><span className={styles.spinner} /> Processing…</>
                    : reviewAction === "APPROVED" ? "✓ Approve" : "✕ Reject"
                  }
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Content ── */}
        {loading && (
          <div className={styles.skeletonList}>
            {Array.from({ length: 4 }).map((_, i) => (
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
        )}

        {!loading && error && (
          <div className={styles.stateBox}>
            <span className={styles.stateIcon}>⚠️</span>
            <h3 className={styles.stateTitle}>Failed to load</h3>
            <p className={styles.stateBody}>{error}</p>
            <button className={styles.stateBtn} onClick={fetchPending} type="button">Try Again</button>
          </div>
        )}

        {!loading && !error && properties.length === 0 && (
          <div className={styles.stateBox}>
            <span className={styles.stateIcon}>🎉</span>
            <h3 className={styles.stateTitle}>All caught up!</h3>
            <p className={styles.stateBody}>No pending rental requests at the moment.</p>
          </div>
        )}

        {!loading && !error && properties.length > 0 && (
          <div className={styles.requestList}>
            {properties.map((p, i) => {
              const img      = p.images?.[0]?.imageUrl;
              const expanded = expandedId === p.id;
              return (
                <div
                  key={p.id}
                  className={styles.requestCard}
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <div className={styles.cardTop}>
                    <div className={styles.cardThumb}>
                      {img
                        ? <img src={img} alt={p.title} className={styles.cardThumbImg} loading="lazy" />
                        : <div className={styles.cardThumbPlaceholder}>🏠</div>
                      }
                    </div>

                    <div className={styles.cardInfo}>
                      <div className={styles.cardInfoTop}>
                        <div>
                          <h3 className={styles.cardTitle}>{p.title}</h3>
                          <div className={styles.cardMeta}>
                            <span>📍 {p.location}</span>
                            <span>🏷️ {p.type}</span>
                            <span>👤 {p.ownerName}</span>
                            {p.createdAt && <span>🕐 {timeAgo(p.createdAt)}</span>}
                          </div>
                        </div>
                        <div className={styles.cardPrice}>{formatPrice(p.price)}<span>/mo</span></div>
                      </div>

                      <div className={styles.cardSpecs}>
                        {p.beds  != null && <span className={styles.spec}>🛏 {p.beds} bed{p.beds !== 1 ? "s" : ""}</span>}
                        {p.baths != null && <span className={styles.spec}>🚿 {p.baths} bath{p.baths !== 1 ? "s" : ""}</span>}
                        {p.sqm   != null && <span className={styles.spec}>📐 {p.sqm} sqm</span>}
                        {p.images?.length > 0 && <span className={styles.spec}>📸 {p.images.length} photo{p.images.length !== 1 ? "s" : ""}</span>}
                      </div>
                    </div>
                  </div>

                  {p.description && (
                    <div className={styles.cardDescWrap}>
                      <button
                        className={styles.cardDescToggle}
                        onClick={() => setExpandedId(expanded ? null : p.id)}
                        type="button"
                      >
                        {expanded ? "▲ Hide description" : "▼ View description"}
                      </button>
                      {expanded && <p className={styles.cardDesc}>{p.description}</p>}
                    </div>
                  )}

                  {expanded && p.images?.length > 1 && (
                    <div className={styles.imageStrip}>
                      {p.images.map((img, idx) => (
                        <img
                          key={idx}
                          src={img.imageUrl}
                          alt={`Photo ${idx + 1}`}
                          className={styles.imageStripItem}
                          loading="lazy"
                        />
                      ))}
                    </div>
                  )}

                  <div className={styles.cardActions}>
                    <button
                      className={styles.rejectBtn}
                      onClick={() => openReview(p, "REJECTED")}
                      type="button"
                    >
                      ✕ Reject
                    </button>
                    <button
                      className={styles.approveBtn}
                      onClick={() => openReview(p, "APPROVED")}
                      type="button"
                    >
                      ✓ Approve
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