import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { adminPropertiesApi } from "./admin_properties.api";
import styles from "./admin_properties.module.css";
import PropertyCard from "./PropertyCard";
import type { PropertyEntry } from "./PropertyCard";
import {
  Search,
  AlertTriangle,
  Home,
  MapPin,
  Edit,
  Ban,
  Clock,
  X,
  Loader2,
  User,
} from "lucide-react";

const PAGE_SIZE = 12;

interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: string;
}

type ModalMode = "detail" | "deactivate" | null;

const STATUSES = ["ALL", "AVAILABLE", "UNAVAILABLE", "REJECTED", "OCCUPIED"];

// ─── Helpers ───────────────────────────────────────────────────────────────

function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}

function getStatusBadge(
  status: string,
  hasActiveTenant: boolean,
  s: typeof styles
): string {
  if (hasActiveTenant) return s.badgeOccupied;
  switch (status?.toUpperCase()) {
    case "AVAILABLE":      return s.badgeAvailable;
    case "UNAVAILABLE":    return s.badgeUnavailable;
    case "PENDING_REVIEW": return s.badgePending;
    case "REJECTED":       return s.badgeRejected;
    default:               return s.badgePending;
  }
}

function getStatusLabel(status: string, hasActiveTenant: boolean): string {
  if (hasActiveTenant) return "Occupied";
  if (status?.toUpperCase() === "PENDING_REVIEW") return "Pending Review";
  return (
    status?.charAt(0).toUpperCase() +
    status?.slice(1).toLowerCase().replace("_", " ")
  );
}

// ─── Component ─────────────────────────────────────────────────────────────

const AdminProperties: React.FC = () => {
  const navigate = useNavigate();
  const { user: admin } = useOutletContext<{ user: AdminUser }>();

  const [allProps, setAllProps] = useState<PropertyEntry[]>([]);
  const [visible, setVisible] = useState<PropertyEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [page, setPage] = useState(1);

  // Modals
  const [modal, setModal] = useState<ModalMode>(null);
  const [target, setTarget] = useState<PropertyEntry | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [deactivateReason, setDeactivateReason] = useState("");

  // ── Data fetch ────────────────────────────────────────────────────────────
  const fetchProperties = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminPropertiesApi.getAllAdminProperties();
      if (!data.success) {
        setError(data?.error?.message ?? "Failed to fetch.");
        return;
      }
      setAllProps(data.data.properties ?? []);
      setPage(1);
    } catch {
      setError("Connection error.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (admin) fetchProperties();
  }, [admin, fetchProperties]);

  // ── Filter + paginate ──────────────────────────────────────────────────────
  const getFiltered = useCallback(() => {
    const q = searchQuery.toLowerCase();
    return allProps.filter((p) => {
      const displayStatus = p.hasActiveTenant
        ? "OCCUPIED"
        : p.status.toUpperCase();
      const matchSearch =
        p.title.toLowerCase().includes(q) ||
        p.location.toLowerCase().includes(q) ||
        p.ownerName.toLowerCase().includes(q);
      const matchStatus =
        statusFilter === "ALL" || displayStatus === statusFilter;
      const matchMin = minPrice === "" || p.price >= parseFloat(minPrice);
      const matchMax = maxPrice === "" || p.price <= parseFloat(maxPrice);
      return matchSearch && matchStatus && matchMin && matchMax;
    });
  }, [allProps, searchQuery, statusFilter, minPrice, maxPrice]);

  useEffect(() => {
    setVisible(getFiltered().slice(0, page * PAGE_SIZE));
  }, [getFiltered, page]);

  const totalFiltered = getFiltered().length;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(searchInput.trim());
    setPage(1);
  };

  // ── Modal helpers ─────────────────────────────────────────────────────────
  const closeModal = () => {
    if (submitting) return;
    setModal(null);
    setTarget(null);
    setDeactivateReason("");
    setModalError(null);
  };

  const openDetail = (p: PropertyEntry) => {
    setTarget(p);
    setModalError(null);
    setModal("detail");
  };

  const handleToggleVisibility = async () => {
    if (!target) return;
    if (target.status === "AVAILABLE" && !deactivateReason.trim()) {
      setModalError("Please provide a reason for deactivation.");
      return;
    }
    setSubmitting(true);
    setModalError(null);
    try {
      const data = await adminPropertiesApi.togglePropertyVisibility(
        target.id,
        { reason: deactivateReason }
      );
      if (!data.success) throw new Error(data?.error?.message || "Failed update");
      await fetchProperties();
      closeModal();
    } catch (err: any) {
      setModalError(err.message || "Network error.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!admin) return null;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className={styles.page}>

      {/* ── Detail modal ── */}
      {modal === "detail" && target && (
        <div className={styles.overlay} onClick={closeModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>{target.title}</h3>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={closeModal}
              >
                <X size={20} />
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.detailRows}>
                <div className={styles.detailRow}>
                  <span className={styles.detailRowLabel}>Owner</span>
                  <span className={styles.detailRowValue}>{target.ownerName}</span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailRowLabel}>Location</span>
                  <span className={styles.detailRowValue}>{target.location}</span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailRowLabel}>Display Status</span>
                  <span
                    className={`${styles.statusPill} ${getStatusBadge(
                      target.status,
                      target.hasActiveTenant,
                      styles
                    )}`}
                    style={{ position: "static" }}
                  >
                    {getStatusLabel(target.status, target.hasActiveTenant)}
                  </span>
                </div>

                {target.status === "UNAVAILABLE" && !target.hasActiveTenant && (
                  <div
                    className={styles.detailRow}
                    style={{ borderTop: "none", paddingTop: 0, marginTop: -5 }}
                  >
                    <span className={styles.detailRowLabel} />
                    <div
                      className={styles.deactivatedNote}
                      style={{
                        background:
                          target.adminDisabled || target.isAdminDisabled
                            ? "rgba(192,57,43,0.06)"
                            : "#f9f9f9",
                        borderLeft:
                          target.adminDisabled || target.isAdminDisabled
                            ? "3px solid #c0392b"
                            : "3px solid #6e7071",
                        color:
                          target.adminDisabled || target.isAdminDisabled
                            ? "#c0392b"
                            : "#444",
                      }}
                    >
                      <div className={styles.deactivatedNoteTitle}>
                        {target.adminDisabled || target.isAdminDisabled
                          ? "Admin Deactivated"
                          : "Deactivated by User"}
                      </div>
                      {target.adminDisabled || target.isAdminDisabled
                        ? target.adminNote || "No specific reason provided."
                        : "Manual deactivation by Owner."}
                    </div>
                  </div>
                )}
              </div>

              {target.hasActiveTenant && target.activeTenant && (
                <div className={styles.activeLeaseBox}>
                  <div className={styles.activeLeaseTitle}>
                    Active Lease Info
                  </div>
                  <div style={{ fontSize: 13 }}>
                    {[
                      ["Tenant",   target.activeTenant.tenantName],
                      ["Email",    target.activeTenant.tenantEmail],
                      ["Move-in",  target.activeTenant.startDate],
                      ["Duration", `${target.activeTenant.leaseDurationMonths} Mo.`],
                    ].map(([label, value], i, arr) => (
                      <div
                        key={label}
                        className={styles.detailRow}
                        style={i === arr.length - 1 ? { border: "none" } : undefined}
                      >
                        <span className={styles.detailRowLabel}>{label}</span>
                        <span className={styles.detailRowValue}>{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className={styles.detailActions} style={{ marginTop: 24 }}>
                <button
                  type="button"
                  className={styles.detailActionBtn}
                  onClick={() =>
                    navigate(`/admin/properties/${target.id}/edit`)
                  }
                >
                  <Edit size={15} className={styles.inlineIcon} /> Edit Property
                </button>

                {target.hasActiveTenant ? (
                  <div
                    className={styles.actionWarningMsg}
                    style={{
                      color: "#7d3c98",
                      background: "rgba(125,60,152,0.06)",
                    }}
                  >
                    Cannot toggle visibility while property is occupied.
                  </div>
                ) : target.status === "REJECTED" ? (
                  <div
                    className={styles.actionWarningMsg}
                    style={{
                      color: "#c0392b",
                      background: "rgba(192,57,43,0.06)",
                    }}
                  >
                    <Ban size={14} className={styles.inlineIcon} /> Cannot
                    activate a rejected property.
                  </div>
                ) : target.status === "PENDING_REVIEW" ? (
                  <div
                    className={styles.actionWarningMsg}
                    style={{
                      color: "#b78e42",
                      background: "rgba(183,142,66,0.06)",
                    }}
                  >
                    <Clock size={14} className={styles.inlineIcon} /> Property
                    must be reviewed before visibility can be toggled.
                  </div>
                ) : (
                  <button
                    type="button"
                    className={`${styles.detailActionBtn} ${
                      target.status === "AVAILABLE"
                        ? styles.detailActionBtnWarn
                        : styles.detailActionBtnGreen
                    }`}
                    onClick={() => setModal("deactivate")}
                  >
                    {target.status === "AVAILABLE"
                      ? "Deactivate listing"
                      : "Activate listing"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Deactivate / Activate confirmation modal ── */}
      {modal === "deactivate" && target && (
        <div className={styles.overlay} onClick={closeModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div
              className={styles.modalHeader}
              style={{
                background:
                  target.status === "AVAILABLE"
                    ? "linear-gradient(135deg, #fdf0ee, #fde0db)"
                    : "linear-gradient(135deg, #f0fdf4, #dcfce7)",
              }}
            >
              <h3 className={styles.modalTitle}>
                {target.status === "AVAILABLE"
                  ? "Confirm Deactivation"
                  : "Confirm Activation"}
              </h3>
            </div>
            <div className={styles.modalBody}>
              <p className={styles.modalDesc}>
                Are you sure you want to change the visibility for{" "}
                <strong>{target.title}</strong>?
              </p>

              {target.status === "AVAILABLE" && (
                <div style={{ marginTop: 15 }}>
                  <label className={styles.deactivateLabel}>
                    REASON FOR DEACTIVATION (Visible to Owner)
                  </label>
                  <textarea
                    className={styles.deactivateTextarea}
                    placeholder="Provide a specific reason (e.g., policy violation, duplicate listing, reported address issues)..."
                    value={deactivateReason}
                    onChange={(e) => setDeactivateReason(e.target.value)}
                  />
                </div>
              )}

              {modalError && (
                <p className={styles.modalErrorMsg}>
                  <AlertTriangle size={14} className={styles.inlineIcon} />{" "}
                  {modalError}
                </p>
              )}

              <div className={styles.modalFooter} style={{ marginTop: 24 }}>
                <button
                  type="button"
                  className={styles.cancelBtn}
                  onClick={closeModal}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className={
                    target.status === "AVAILABLE"
                      ? styles.dangerBtn
                      : styles.confirmBtn
                  }
                  onClick={handleToggleVisibility}
                  disabled={submitting}
                >
                  {submitting ? (
                    <><Loader2 size={16} className={styles.spinner} /> Processing…</>
                  ) : (
                    "Confirm Change"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Page ── */}
      <main className={styles.main}>
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>Property Management</h1>
            <p className={styles.pageSub}>
              {loading
                ? "Syncing…"
                : `Showing ${visible.length} of ${totalFiltered} total properties`}
            </p>
          </div>
        </div>

        {/* Filter bar */}
        <div className={styles.filterBar}>
          <form className={styles.searchWrap} onSubmit={handleSearchSubmit}>
            <div style={{ position: "relative", width: "100%" }}>
              <span className={styles.searchIcon}>
                <Search size={16} />
              </span>
              <input
                type="text"
                className={styles.searchInput}
                placeholder="Search by title, location, or owner…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
            <button type="submit" className={styles.searchBtn}>
              Search
            </button>
          </form>

          <select
            className={styles.filterSelect}
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s === "ALL" ? "All Status" : s.replace("_", " ")}
              </option>
            ))}
          </select>

          <div className={styles.filterPrice}>
            <input
              type="number"
              className={styles.filterPriceInput}
              placeholder="Min ₱"
              value={minPrice}
              onChange={(e) => { setMinPrice(e.target.value); setPage(1); }}
              min={0}
            />
            <span className={styles.filterPriceSep}>–</span>
            <input
              type="number"
              className={styles.filterPriceInput}
              placeholder="Max ₱"
              value={maxPrice}
              onChange={(e) => { setMaxPrice(e.target.value); setPage(1); }}
              min={0}
            />
          </div>
        </div>

        {/* Grid area */}
        {loading ? (
          <div className={styles.propertyGrid}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className={styles.skeletonCard}>
                <div className={styles.skeletonImg} />
                <div className={styles.skeletonBody}>
                  <div className={`${styles.skeletonLine} ${styles.skeletonLineMd}`} />
                  <div className={`${styles.skeletonLine} ${styles.skeletonLineSm}`} />
                  <div className={`${styles.skeletonLine} ${styles.skeletonLineFull}`} />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className={styles.stateBox}>
            <span className={styles.stateIcon}>
              <AlertTriangle size={48} />
            </span>
            <h3 className={styles.stateTitle}>Failed to load</h3>
            <p className={styles.stateBody}>{error}</p>
            <button className={styles.stateBtn} onClick={fetchProperties} type="button">
              Try Again
            </button>
          </div>
        ) : visible.length === 0 ? (
          <div className={styles.stateBox}>
            <span className={styles.stateIcon}>
              <Home size={48} />
            </span>
            <h3 className={styles.stateTitle}>No properties found</h3>
            <p className={styles.stateBody}>
              Try adjusting your search or filters.
            </p>
          </div>
        ) : (
          <>
            <div className={styles.propertyGrid}>
              {visible.map((p, i) => (
                <PropertyCard
                  key={p.id}
                  property={p}
                  index={i}
                  onClick={openDetail}
                />
              ))}
            </div>

            {visible.length < totalFiltered && (
              <div className={styles.loadMoreWrap}>
                <button
                  type="button"
                  className={styles.loadMoreBtn}
                  onClick={() => setPage((prev) => prev + 1)}
                >
                  Load More Properties
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default AdminProperties;