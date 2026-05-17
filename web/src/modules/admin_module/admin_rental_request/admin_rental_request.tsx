import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { rentalRequestsApi } from "./rental_requests.api";
import { API_BASE } from "../../../api/axiosInstance";
import styles from "./admin_rental_request.module.css";
import {
  RefreshCw, MapPin, Tag, User, Clock, BedDouble, Bath, Maximize,
  ArrowRight, AlertTriangle, Home, CheckCircle, Search, X,
  Calendar, ChevronDown, ChevronUp, SearchX, SlidersHorizontal,
} from "lucide-react";

interface AdminUser { id: number; name: string; email: string; role: string; }

interface RentalRequest {
  id: number;
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

type SortOrder = "newest" | "oldest" | "price_asc" | "price_desc";
type TypeFilter = "ALL" | "Apartment" | "House" | "Condo" | "Room" | "Other";

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
  let imageStr = "";
  if (typeof path === "object") {
    imageStr = path.imageUrl || path.url || path.image || "";
  } else if (typeof path === "string") {
    imageStr = path;
  }
  if (!imageStr || typeof imageStr !== "string") return null;
  if (imageStr.startsWith("http") || imageStr.startsWith("data:")) return imageStr;
  return `${API_BASE}${imageStr.startsWith("/") ? "" : "/"}${imageStr}`;
}

/** Groups a flat list into { "2026": { "May": [...] } } */
function groupByYearMonth(requests: RentalRequest[]): Record<string, Record<string, RentalRequest[]>> {
  const result: Record<string, Record<string, RentalRequest[]>> = {};
  for (const r of requests) {
    const d     = new Date(r.createdAt);
    const year  = d.getFullYear().toString();
    const month = d.toLocaleString("en-PH", { month: "long" });
    if (!result[year])        result[year] = {};
    if (!result[year][month]) result[year][month] = [];
    result[year][month].push(r);
  }
  return result;
}

const MONTHS_ORDER = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const AdminRentalRequests: React.FC = () => {
  const navigate = useNavigate();
  const { user: admin } = useOutletContext<{ user: AdminUser }>();

  const [requests, setRequests] = useState<RentalRequest[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  const [search, setSearch]         = useState("");
  const [sortOrder, setSortOrder]   = useState<SortOrder>("newest");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("ALL");

  // Collapsed groups: Set of "2026-May" strings
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const fetchRequests = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const data = await rentalRequestsApi.getAllRentalRequests();
      if (!data.success) { setError(data?.error?.message ?? "Failed to fetch."); return; }
      const incoming: RentalRequest[] = data.data.properties ?? data.data.requests ?? [];
      setRequests(incoming);

      // Pre-collapse all groups except current month
      const now = new Date();
      const currentKey = `${now.getFullYear()}-${now.toLocaleString("en-PH", { month: "long" })}`;
      const initialCollapsed = new Set<string>();
      for (const r of incoming) {
        const d     = new Date(r.createdAt);
        const year  = d.getFullYear().toString();
        const month = d.toLocaleString("en-PH", { month: "long" });
        const key   = `${year}-${month}`;
        if (key !== currentKey) initialCollapsed.add(key);
      }
      setCollapsedGroups(initialCollapsed);
    } catch {
      setError("Unable to connect to server.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (admin) fetchRequests(); }, [admin, fetchRequests]);

  const toggleGroup = (key: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Filter & sort
  const filtered = requests
    .filter((r) => {
      const q = search.toLowerCase();
      const title    = (r.title || r.propertyTitle || "").toLowerCase();
      const location = (r.location || r.propertyLocation || "").toLowerCase();
      const owner    = (r.ownerName || r.owner?.name || "").toLowerCase();
      const type     = (r.type || r.propertyType || "").toLowerCase();
      const matchSearch = !q || title.includes(q) || location.includes(q) || owner.includes(q) || type.includes(q);

      const matchType =
        typeFilter === "ALL" ||
        (r.type || r.propertyType || "").toLowerCase() === typeFilter.toLowerCase();

      return matchSearch && matchType;
    })
    .sort((a, b) => {
      const priceA = a.price ?? a.propertyPrice ?? 0;
      const priceB = b.price ?? b.propertyPrice ?? 0;
      if (sortOrder === "newest")    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortOrder === "oldest")    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sortOrder === "price_asc") return priceA - priceB;
      if (sortOrder === "price_desc")return priceB - priceA;
      return 0;
    });

  const grouped    = groupByYearMonth(filtered);
  const sortedYears = Object.keys(grouped).sort((a, b) => Number(b) - Number(a));

  if (!admin) return null;

  return (
    <div className={styles.page}>
      <div className={styles.main}>

        {/* ── Header ── */}
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>Pending Properties</h1>
            <p className={styles.pageSub}>
              {loading
                ? "Syncing…"
                : `${filtered.length} propert${filtered.length === 1 ? "y" : "ies"} awaiting review`}
            </p>
          </div>
          <button className={styles.refreshBtn} onClick={fetchRequests} disabled={loading} type="button">
            <RefreshCw size={16} className={loading ? styles.spin : ""} /> Refresh
          </button>
        </div>

        {/* ── Filter Bar ── */}
        <div className={styles.filterBar}>
          <div className={styles.searchWrap}>
            <span className={styles.searchIcon}><Search size={16} /></span>
            <input
              className={styles.searchInput}
              type="text"
              placeholder="Search by title, location, owner, or type…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button type="button" className={styles.searchClear} onClick={() => setSearch("")}>
                <X size={14} />
              </button>
            )}
          </div>

          <div className={styles.filterGroup}>
            <SlidersHorizontal size={15} className={styles.filterGroupIcon} />
            <select
              className={styles.filterSelect}
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
            >
              <option value="ALL">All Types</option>
              <option value="Apartment">Apartment</option>
              <option value="House">House</option>
              <option value="Condo">Condo</option>
              <option value="Room">Room</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <select
            className={styles.filterSelect}
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as SortOrder)}
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="price_asc">Price: Low → High</option>
            <option value="price_desc">Price: High → Low</option>
          </select>
        </div>

        {/* ── Content ── */}
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
        ) : filtered.length === 0 && requests.length === 0 ? (
          <div className={styles.stateBox}>
            <span className={styles.stateIcon}><CheckCircle size={48} /></span>
            <h3 className={styles.stateTitle}>All caught up!</h3>
            <p className={styles.stateBody}>There are no pending property requests at this time.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className={styles.stateBox}>
            <span className={styles.stateIcon}><SearchX size={48} /></span>
            <h3 className={styles.stateTitle}>No results found</h3>
            <p className={styles.stateBody}>No properties match your current search or filters.</p>
          </div>
        ) : (
          <>
            {sortedYears.map((year) => {
              const sortedMonths = Object.keys(grouped[year]).sort(
                (a, b) => MONTHS_ORDER.indexOf(b) - MONTHS_ORDER.indexOf(a)
              );

              return (
                <div key={year} className={styles.yearBlock}>
                  {/* Year divider */}
                  <div className={styles.yearDivider}>
                    <span className={styles.yearLabel}>{year}</span>
                    <div className={styles.yearLine} />
                  </div>

                  {sortedMonths.map((month) => {
                    const groupKey    = `${year}-${month}`;
                    const isCollapsed = collapsedGroups.has(groupKey);
                    const monthItems  = grouped[year][month];

                    return (
                      <div key={groupKey} className={styles.monthBlock}>
                        {/* Month collapsible header */}
                        <button
                          type="button"
                          className={styles.monthHeader}
                          onClick={() => toggleGroup(groupKey)}
                        >
                          <div className={styles.monthHeaderLeft}>
                            <Calendar size={15} className={styles.monthCalIcon} />
                            <span className={styles.monthLabel}>{month}</span>
                            <span className={styles.monthCount}>
                              {monthItems.length} propert{monthItems.length !== 1 ? "ies" : "y"}
                            </span>
                          </div>
                          <span className={styles.monthChevron}>
                            {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                          </span>
                        </button>

                        {!isCollapsed && (
                          <div className={styles.requestList}>
                            {monthItems.map((r, i) => {
                              const displayTitle    = r.title || r.propertyTitle || "Untitled Property";
                              const displayLocation = r.location || r.propertyLocation || "Location not provided";
                              const displayPrice    = r.price ?? r.propertyPrice ?? 0;
                              const displayType     = r.type || r.propertyType || "Property";
                              const displayOwner    = r.ownerName || r.owner?.name || "Unknown Owner";
                              const rawImg          = (r.images && r.images.length > 0) ? r.images[0] : (r.imageUrl || r.propertyImage || null);
                              const displayImg      = getValidImageUrl(rawImg);

                              return (
                                <div
                                  key={r.id}
                                  className={styles.requestCard}
                                  style={{ animationDelay: `${i * 30}ms` }}
                                  onClick={() => navigate(`/admin/rental-requests/${r.id}`)}
                                >
                                  <div className={styles.cardTop}>
                                    <div className={styles.cardThumb}>
                                      {displayImg ? (
                                        <img src={displayImg} alt="" className={styles.cardThumbImg} />
                                      ) : (
                                        <div className={styles.cardThumbPlaceholder}><Home size={32} /></div>
                                      )}
                                    </div>

                                    <div className={styles.cardInfo}>
                                      <div className={styles.cardInfoTop}>
                                        <div>
                                          <h3 className={styles.cardTitle}>{displayTitle}</h3>
                                          <div className={styles.cardMeta}>
                                            <span className={styles.metaItem}><MapPin size={14} /> {displayLocation}</span>
                                            <span className={styles.metaItem}><Tag size={14} /> {displayType}</span>
                                            <span className={styles.metaItem}><User size={14} /> {displayOwner}</span>
                                            <span className={styles.metaItem}><Clock size={14} /> {timeAgo(r.createdAt)}</span>
                                          </div>
                                        </div>
                                        <div className={styles.cardPrice}>
                                          {formatPrice(displayPrice)}<span>/mo</span>
                                        </div>
                                      </div>

                                      {(r.beds || r.baths || r.sqm) && (
                                        <div className={styles.cardSpecs}>
                                          {r.beds  != null && <span className={styles.spec}><BedDouble size={14} /> {r.beds} Beds</span>}
                                          {r.baths != null && <span className={styles.spec}><Bath size={14} /> {r.baths} Bath</span>}
                                          {r.sqm   != null && <span className={styles.spec}><Maximize size={14} /> {r.sqm} sqm</span>}
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  <div className={styles.cardFooter}>
                                    <div className={styles.cardDate}>
                                      {new Date(r.createdAt).toLocaleDateString("en-PH", {
                                        month: "long", day: "numeric", year: "numeric"
                                      })}
                                    </div>
                                    <button
                                      className={styles.detailBtn}
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); navigate(`/admin/rental-requests/${r.id}`); }}
                                    >
                                      Review Listing <ArrowRight size={16} />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
};

export default AdminRentalRequests;