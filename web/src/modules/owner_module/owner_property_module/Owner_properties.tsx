import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import OwnerNavbar from "../../../components/OwnerNavbar/OwnerNavbar";
import styles from "./Owner_properties.module.css";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

// ─── types ─────────────────────────────────────────────────────────────────
interface User {
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
  images: { imageUrl: string }[];
}
 
// ─── helpers ───────────────────────────────────────────────────────────────
 
function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency", currency: "PHP",
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(price);
}
 
function getStatusBadge(status: string, s: typeof styles): string {
  switch (status?.toUpperCase()) {
    case "AVAILABLE":   return s.badgeAvailable;
    case "UNAVAILABLE": return s.badgeUnavailable;
    default:            return s.badgePending;
  }
}
 
// ─── component ─────────────────────────────────────────────────────────────
 
const OwnerProperties: React.FC = () => {
  const navigate = useNavigate();
 
  const [user, setUser]             = useState<User | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
 
  // Filters
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [minPrice, setMinPrice]       = useState("");
  const [maxPrice, setMaxPrice]       = useState("");
 
  // Delete modal
  const [deleteTarget, setDeleteTarget]   = useState<Property | null>(null);
  const [deleting, setDeleting]           = useState(false);
  const [deleteError, setDeleteError]     = useState<string | null>(null);
 
  // ── Auth guard ─────────────────────────────────────────────────────────
  useEffect(() => {
    const stored = localStorage.getItem("user");
    const token  = localStorage.getItem("accessToken");
    if (!stored || !token) { navigate("/"); return; }
    try {
      const parsed: User = JSON.parse(stored);
      if (parsed.role?.toUpperCase() !== "OWNER") { navigate("/home"); return; }
      setUser(parsed);
    } catch { navigate("/"); }
  }, [navigate]);
 
  // ── Fetch properties ───────────────────────────────────────────────────
  const fetchProperties = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set("search",   searchQuery);
      if (minPrice)    params.set("minPrice", minPrice);
      if (maxPrice)    params.set("maxPrice", maxPrice);
 
      const token = localStorage.getItem("accessToken");
      const res   = await fetch(`${API_BASE}/api/properties/my?${params.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (!res.ok || !data.success) { setError("Failed to load properties."); return; }
      setProperties(data.data.properties ?? []);
    } catch {
      setError("Unable to connect to server.");
    } finally {
      setLoading(false);
    }
  }, [searchQuery, minPrice, maxPrice]);
 
  useEffect(() => { if (user) fetchProperties(); }, [user, fetchProperties]);
 
  // ── Delete ─────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const token = localStorage.getItem("accessToken");
      const res   = await fetch(`${API_BASE}/api/properties/${deleteTarget.id}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setDeleteError(data?.error?.message ?? "Delete failed.");
        return;
      }
      setProperties((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch {
      setDeleteError("Network error. Please try again.");
    } finally {
      setDeleting(false);
    }
  };
 
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(searchInput.trim());
  };
 
  if (!user) return null;
 
  return (
    <div className={styles.page}>
      <OwnerNavbar
        user={user}
        onAddProperty={() => navigate("/owner/properties/new")}
      />
 
      {/* ── Delete Confirmation Modal ── */}
      {deleteTarget && (
        <div className={styles.modalOverlay} onClick={() => !deleting && setDeleteTarget(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalIcon}>🗑️</div>
            <h3 className={styles.modalTitle}>Delete Property?</h3>
            <p className={styles.modalBody}>
              Are you sure you want to delete{" "}
              <span className={styles.modalPropertyName}>"{deleteTarget.title}"</span>?
              This action cannot be undone.
            </p>
            {deleteError && (
              <p style={{ color: "#c0392b", fontSize: "13px", fontWeight: 600 }}>
                ⚠ {deleteError}
              </p>
            )}
            <div className={styles.modalActions}>
              <button
                className={styles.modalCancelBtn}
                onClick={() => { setDeleteTarget(null); setDeleteError(null); }}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                className={styles.modalDeleteBtn}
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting
                  ? <><span className={styles.modalSpinner} /> Deleting…</>
                  : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
 
      {/* ── Page Header ── */}
      <div className={styles.pageBar}>
        <div className={styles.pageBarDeco} />
        <div className={styles.pageBarAccent} />
        <div className={styles.pageBarInner}>
          <div>
            <h1 className={styles.pageBarTitle}>My Properties</h1>
            <p className={styles.pageBarSub}>
              {loading ? "Loading…" : `${properties.length} listing${properties.length !== 1 ? "s" : ""}`}
            </p>
          </div>
          <button
            className={styles.addBtn}
            onClick={() => navigate("/owner/properties/new")}
            type="button"
          >
            + Add Property
          </button>
        </div>
      </div>
 
      {/* ── Main ── */}
      <main className={styles.main}>
 
        {/* Filter bar */}
        <form className={styles.filterBar} onSubmit={handleSearchSubmit}>
          <div className={styles.searchWrap}>
            <span className={styles.searchIcon}>🔍</span>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Search by title or location…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          <div className={styles.filterPrice}>
            <input
              type="number"
              className={styles.filterPriceInput}
              placeholder="Min ₱"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              min={0}
            />
            <span className={styles.filterPriceSep}>–</span>
            <input
              type="number"
              className={styles.filterPriceInput}
              placeholder="Max ₱"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              min={0}
            />
          </div>
        </form>
 
        {/* Grid */}
        <div className={styles.propertyGrid}>
 
          {/* Skeletons */}
          {loading && Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={styles.skeletonCard}>
              <div className={styles.skeletonImg} />
              <div className={styles.skeletonBody}>
                <div className={`${styles.skeletonLine} ${styles.skeletonLineMd}`} />
                <div className={`${styles.skeletonLine} ${styles.skeletonLineSm}`} />
                <div className={`${styles.skeletonLine} ${styles.skeletonLineFull}`} />
              </div>
            </div>
          ))}
 
          {/* Error */}
          {!loading && error && (
            <div className={styles.stateBox}>
              <span className={styles.stateIcon}>⚠️</span>
              <h3 className={styles.stateTitle}>Failed to load</h3>
              <p className={styles.stateBody}>{error}</p>
              <button className={styles.stateBtn} onClick={fetchProperties}>Try Again</button>
            </div>
          )}
 
          {/* Empty */}
          {!loading && !error && properties.length === 0 && (
            <div className={styles.stateBox}>
              <span className={styles.stateIcon}>🏘️</span>
              <h3 className={styles.stateTitle}>No properties found</h3>
              <p className={styles.stateBody}>
                {searchQuery || minPrice || maxPrice
                  ? "Try adjusting your search or filters."
                  : "You haven't added any properties yet."}
              </p>
              <button
                className={styles.stateBtn}
                onClick={() => navigate("/owner/properties/new")}
              >
                + Add Your First Property
              </button>
            </div>
          )}
 
          {/* Property cards */}
          {!loading && !error && properties.map((p, i) => {
            const img         = p.images?.[0]?.imageUrl;
            const statusLabel = p.status?.charAt(0) + p.status?.slice(1).toLowerCase();
            return (
              <div
                key={p.id}
                className={styles.card}
                style={{ animationDelay: `${i * 50}ms` }}
              >
                {/* Image */}
                <div className={styles.cardImageWrap}>
                  {img ? (
                    <img src={img} alt={p.title} className={styles.cardImage} loading="lazy" />
                  ) : (
                    <div className={styles.cardImagePlaceholder}>
                      <span className={styles.cardImagePlaceholderIcon}>🏠</span>
                      <span className={styles.cardImagePlaceholderText}>No photo</span>
                    </div>
                  )}
                  <span className={`${styles.cardStatusBadge} ${getStatusBadge(p.status, styles)}`}>
                    {statusLabel}
                  </span>
                  {p.type && (
                    <span className={styles.cardTypeBadge}>{p.type}</span>
                  )}
                </div>
 
                {/* Body */}
                <div className={styles.cardBody}>
                  <h3 className={styles.cardTitle}>{p.title}</h3>
                  <div className={styles.cardLocation}>📍 {p.location}</div>
 
                  {/* Beds/baths/sqm */}
                  {(p.beds || p.baths || p.sqm) && (
                    <div className={styles.cardMeta}>
                      {p.beds  != null && <span className={styles.cardMetaItem}>🛏 {p.beds}</span>}
                      {p.baths != null && <span className={styles.cardMetaItem}>🚿 {p.baths}</span>}
                      {p.sqm   != null && <span className={styles.cardMetaItem}>📐 {p.sqm} sqm</span>}
                    </div>
                  )}
 
                  <div className={styles.cardFooter}>
                    <div>
                      <div className={styles.cardPrice}>{formatPrice(p.price)}</div>
                      <div className={styles.cardPriceLabel}>/ month</div>
                    </div>
                    <div className={styles.cardActions}>
                      <a
                        href={`/owner/properties/${p.id}/edit`}
                        className={styles.cardEditBtn}
                      >
                        ✏️ View
                      </a>
                      <button
                        className={styles.cardDeleteBtn}
                        onClick={() => { setDeleteTarget(p); setDeleteError(null); }}
                        type="button"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
 
        </div>
      </main>
    </div>
  );
};
 
export default OwnerProperties;