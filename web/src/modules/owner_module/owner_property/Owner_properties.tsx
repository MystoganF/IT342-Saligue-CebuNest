import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useOutletContext, Link } from "react-router-dom";
import { propertiesApi } from "./properties.api";
import styles from "./Owner_properties.module.css";
import { VirtuosoGrid } from "react-virtuoso";
import {
  Search, Plus, Trash2, AlertTriangle, Home, MapPin, 
  Bed, Bath, Maximize, Edit, Eye, XCircle, Loader2, UserPlus
} from "lucide-react";

// ─── Interfaces ─────────────────────────────────────────────────────────────
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
  images: { imageUrl: string; thumbnailUrl?: string }[];
  hasActiveTenant: boolean;
  rejectionReason?: string | null;
  pendingRequestsCount?: number;
}

// ─── Helpers ───────────────────────────────────────────────────────────────
function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency", currency: "PHP",
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(price);
}

function getStatusBadge(status: string, hasActiveTenant: boolean, s: typeof styles): string {
  if (hasActiveTenant) return s.badgeOccupied;
  switch (status?.toUpperCase()) {
    case "AVAILABLE":     return s.badgeAvailable;
    case "UNAVAILABLE":   return s.badgeUnavailable;
    case "REJECTED":      return s.badgeRejected;
    default:              return s.badgePending;
  }
}

function getStatusLabel(status: string, hasActiveTenant: boolean): string {
  if (hasActiveTenant) return "Occupied";
  if (status?.toUpperCase() === "PENDING_REVIEW") return "Pending Review";
  return status?.charAt(0) + status?.slice(1).toLowerCase();
}

// ─── LazyImage Component ───────────────────────────────────────────────────
const LazyImage: React.FC<{ src: string; alt: string; isPriority?: boolean }> = ({ src, alt, isPriority }) => {
  const [loaded, setLoaded] = useState(false);
  return (
    <>
      {!loaded && <div className={styles.imgShimmer} aria-hidden="true" />}
      <img
        src={src}
        alt={alt}
        loading={isPriority ? "eager" : "lazy"}
        // @ts-expect-error fetchpriority
        fetchpriority={isPriority ? "high" : "auto"}
        decoding="async"
        className={loaded ? styles.cardImageLoaded : styles.cardImagePending}
        onLoad={() => setLoaded(true)}
      />
    </>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────
const OwnerProperties: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useOutletContext<{ user: User }>();

  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);

  // Filters
  const [searchInput, setSearchInput]   = useState("");
  const [searchQuery, setSearchQuery]   = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [minPrice, setMinPrice]         = useState("");
  const [maxPrice, setMaxPrice]         = useState("");

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState<Property | null>(null);
  const [deleting, setDeleting]         = useState(false);
  const [deleteError, setDeleteError]   = useState<string | null>(null);

  // ── Fetch properties ───────────────────────────────────────────────────
  const fetchProperties = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {};
      if (searchQuery)  params.search   = searchQuery;
      if (statusFilter) params.status   = statusFilter;
      if (minPrice)     params.minPrice = minPrice;
      if (maxPrice)     params.maxPrice = maxPrice;

      const data = await propertiesApi.getMyProperties(params);
      if (!data.success) { setError("Failed to load properties."); return; }
      setProperties(data.data.properties ?? []);
    } catch {
      setError("Unable to connect to server.");
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter, minPrice, maxPrice]);

  useEffect(() => { fetchProperties(); }, [fetchProperties]);

  // ── Delete ─────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const data = await propertiesApi.deleteProperty(deleteTarget.id);
      if (!data.success) {
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

  const handleClearFilters = () => {
    setSearchInput("");
    setSearchQuery("");
    setStatusFilter("");
    setMinPrice("");
    setMaxPrice("");
  };

  if (!user) return null;

  return (
    <div className={styles.page}>
      {/* ── Delete Confirmation Modal ── */}
      {deleteTarget && (
        <div className={styles.modalOverlay} onClick={() => !deleting && setDeleteTarget(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalIcon}><Trash2 size={40} strokeWidth={1.5} color="#c0392b" /></div>
            <h3 className={styles.modalTitle}>Delete Property?</h3>
            <p className={styles.modalBody}>
              Are you sure you want to delete{" "}
              <span className={styles.modalPropertyName}>"{deleteTarget.title}"</span>?
              This action cannot be undone.
            </p>
            {deleteTarget.hasActiveTenant && (
              <p className={styles.modalTenantWarning}>
                <AlertTriangle size={16} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'text-bottom' }}/> 
                This property has an active tenant. You must end the lease before deleting.
              </p>
            )}
            {deleteError && (
              <p className={styles.modalDeleteError}>
                <AlertTriangle size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }}/> 
                {deleteError}
              </p>
            )}
            <div className={styles.modalActions}>
              <button
                className={styles.modalCancelBtn}
                onClick={() => { setDeleteTarget(null); setDeleteError(null); }}
                disabled={deleting}
                type="button"
              >
                Cancel
              </button>
              <button
                className={styles.modalDeleteBtn}
                onClick={handleDelete}
                disabled={deleting || deleteTarget.hasActiveTenant}
                type="button"
              >
                {deleting
                  ? <><Loader2 size={16} className={styles.modalSpinnerIcon} /> Deleting…</>
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
            <Plus size={18} /> Add Property
          </button>
        </div>
      </div>

      {/* ── Main ── */}
      <main className={styles.main}>

        {/* Filter bar */}
        <div className={styles.filterBar}>
          <form 
            className={styles.searchWrap} 
            style={{ display: 'flex', flexDirection: 'row' }} 
            onSubmit={handleSearchSubmit}
          >
            <div style={{ position: 'relative', width: '100%' }}>
              <span className={styles.searchIcon}>
                <Search size={16} />
              </span>
              <input
                type="text"
                className={styles.searchInput}
                placeholder="Search by title or location…"
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
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Status</option>
            <option value="AVAILABLE">Available</option>
            <option value="UNAVAILABLE">Occupied</option>
            <option value="PENDING_REVIEW">Pending Review</option>
            <option value="REJECTED">Rejected</option>
          </select>

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
        </div>

        {/* Grid Container */}
        {loading ? (
          <div className={styles.propertyGrid}>
            {Array.from({ length: 6 }).map((_, i) => (
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
            <span className={styles.stateIcon}><AlertTriangle size={48} /></span>
            <h3 className={styles.stateTitle}>Failed to load</h3>
            <p className={styles.stateBody}>{error}</p>
            <button className={styles.stateBtn} onClick={fetchProperties}>Try Again</button>
          </div>
        ) : properties.length === 0 ? (
          <div className={styles.stateBox}>
            <span className={styles.stateIcon}><Home size={48} /></span>
            <h3 className={styles.stateTitle}>No properties found</h3>
            <p className={styles.stateBody}>
              {searchQuery || statusFilter || minPrice || maxPrice
                ? "Try adjusting your search or filters."
                : "You haven't added any properties yet."}
            </p>
            {searchQuery || statusFilter || minPrice || maxPrice ? (
              <button
                className={styles.stateBtn}
                onClick={handleClearFilters}
                type="button"
              >
                Clear Filters
              </button>
            ) : (
              <button
                className={styles.stateBtn}
                onClick={() => navigate("/owner/properties/new")}
                type="button"
              >
                + Add Your First Property
              </button>
            )}
          </div>
        ) : (
          <VirtuosoGrid
            useWindowScroll
            data={properties}
            components={{
              List: React.forwardRef((props, ref) => (
                <div {...props} ref={ref} className={styles.propertyGrid} />
              )),
              Item: ({ children, ...props }) => (
                <div {...props} style={{ margin: 0 }}>{children}</div>
              )
            }}
            itemContent={(index, p) => {
              const img        = p.images?.[0]?.thumbnailUrl || p.images?.[0]?.imageUrl;
              const isRejected = p.status?.toUpperCase() === "REJECTED";
              const hasPending = (p.pendingRequestsCount ?? 0) > 0;

              return (
                <div
                  className={`${styles.card} ${isRejected ? styles.cardRejected : ""}`}
                  style={{ animationDelay: `${Math.min(index * 40, 400)}ms` }}
                >
                  {/* Image */}
                  <div className={styles.cardImageWrap}>
                    {img ? (
                      <LazyImage src={img} alt={p.title} isPriority={index < 6} />
                    ) : (
                      <div className={styles.cardImagePlaceholder}>
                        <span className={styles.cardImagePlaceholderIcon}><Home size={32} /></span>
                        <span className={styles.cardImagePlaceholderText}>No photo</span>
                      </div>
                    )}

                    {/* Pending Requests Badge */}
                    {hasPending && (
                      <div className={styles.pendingRequestBadge} title={`${p.pendingRequestsCount} Pending Request(s)`}>
                        <UserPlus size={14} />
                        <span>{p.pendingRequestsCount} New</span>
                      </div>
                    )}

                    <span className={`${styles.cardStatusBadge} ${getStatusBadge(p.status, p.hasActiveTenant, styles)}`}>
                      {getStatusLabel(p.status, p.hasActiveTenant)}
                    </span>
                    
                    {p.type && <span className={styles.cardTypeBadge}>{p.type}</span>}
                  </div>

                  {/* Rejection notice inline on card */}
                  {isRejected && (
                    <div className={styles.cardRejectedBanner}>
                      <XCircle size={14} style={{ flexShrink: 0, marginTop: '2px' }}/>
                      <span>Rejected by admin{p.rejectionReason ? ` — "${p.rejectionReason}"` : ""}. Cannot be deleted.</span>
                    </div>
                  )}

                  {/* Body */}
                  <div className={styles.cardBody}>
                    <h3 className={styles.cardTitle}>{p.title}</h3>
                    <div className={styles.cardLocation}><MapPin size={12} className={styles.inlineIcon} /> {p.location}</div>

                    {(p.beds != null || p.baths != null || p.sqm != null) && (
                      <div className={styles.cardMeta}>
                        {p.beds  != null && <span className={styles.cardMetaItem}><Bed size={14} /> {p.beds}</span>}
                        {p.baths != null && <span className={styles.cardMetaItem}><Bath size={14} /> {p.baths}</span>}
                        {p.sqm   != null && <span className={styles.cardMetaItem}><Maximize size={14} /> {p.sqm} sqm</span>}
                      </div>
                    )}

                    <div className={styles.cardFooter}>
                      <div>
                        <div className={styles.cardPrice}>{formatPrice(p.price)}</div>
                        <div className={styles.cardPriceLabel}>/ month</div>
                      </div>
                      <div className={styles.cardActions}>
                        <Link
                            to={`/owner/properties/${p.id}/edit`}
                            className={styles.cardEditBtn}
                        >
                            {isRejected ? <><Eye size={14} /> View</> : <><Edit size={14} /> View</>}
                        </Link>
                        <button
                          className={styles.cardDeleteBtn}
                          onClick={() => { setDeleteTarget(p); setDeleteError(null); }}
                          type="button"
                          disabled={isRejected || p.hasActiveTenant}
                          title={isRejected ? "Rejected properties cannot be deleted" : undefined}
                        >
                          <Trash2 size={14} /> Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            }}
          />
        )}
      </main>
    </div>
  );
};

export default OwnerProperties;