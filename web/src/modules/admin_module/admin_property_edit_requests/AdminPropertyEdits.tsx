import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { propertyEditsApi } from "./admin_property_edits.api";
import styles from "./AdminPropertyEdits.module.css";
import {
  RefreshCw, MapPin, Tag, User, Clock, ArrowRight,
  AlertTriangle, CheckCircle, FilePen, Search, X,
  ChevronDown, ChevronUp, Calendar, SearchX, Image as ImageIcon,
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
  imagesChanged: boolean;
  createdAt: string;
  firstImageUrl: string | null;
}

type ChangeFilter = "ALL" | "FIELDS" | "IMAGES" | "PRICE" | "LOCATION";

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
    r.locationChanged, r.typeChanged, r.bedsChanged,
    r.bathsChanged, r.sqmChanged,
  ].filter(Boolean).length;
}

/** Groups a flat list into { "2026": { "May": [...] } } */
function groupByYearMonth(list: EditRequest[]): Record<string, Record<string, EditRequest[]>> {
  const result: Record<string, Record<string, EditRequest[]>> = {};
  for (const r of list) {
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

const AdminPropertyEdits: React.FC = () => {
  const navigate = useNavigate();
  const { user: admin } = useOutletContext<{ user: AdminUser }>();

  const [requests, setRequests]           = useState<EditRequest[]>([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState<string | null>(null);
  const [search, setSearch]               = useState("");
  const [changeFilter, setChangeFilter]   = useState<ChangeFilter>("ALL");
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const fetchRequests = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const data = await propertyEditsApi.getPendingEditRequests();
      if (!data.success) { setError(data?.error?.message ?? "Failed to fetch."); return; }
      const incoming: EditRequest[] = data.data.editRequests ?? [];
      setRequests(incoming);

      // Pre-collapse all groups except current month
      const now        = new Date();
      const currentKey = `${now.getFullYear()}-${now.toLocaleString("en-PH", { month: "long" })}`;
      const initial    = new Set<string>();
      for (const r of incoming) {
        const d    = new Date(r.createdAt);
        const key  = `${d.getFullYear()}-${d.toLocaleString("en-PH", { month: "long" })}`;
        if (key !== currentKey) initial.add(key);
      }
      setCollapsedGroups(initial);
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
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  // ── Filtering ──────────────────────────────────────────────────────────
  const filtered = requests.filter((r) => {
    const q = search.toLowerCase();
    const matchSearch =
      (r.proposedTitle   || "").toLowerCase().includes(q) ||
      (r.proposedLocation|| "").toLowerCase().includes(q) ||
      (r.submittedByName || "").toLowerCase().includes(q) ||
      (r.submittedByEmail|| "").toLowerCase().includes(q) ||
      (r.proposedTypeName|| "").toLowerCase().includes(q);

    const matchChange =
      changeFilter === "ALL"      ? true :
      changeFilter === "IMAGES"   ? r.imagesChanged :
      changeFilter === "PRICE"    ? r.priceChanged :
      changeFilter === "LOCATION" ? r.locationChanged :
      changeFilter === "FIELDS"   ? countChanges(r) > 0 :
      true;

    return matchSearch && matchChange;
  });

  const grouped     = groupByYearMonth(filtered);
  const sortedYears = Object.keys(grouped).sort((a, b) => Number(b) - Number(a));

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
                : `${filtered.length} pending edit${filtered.length === 1 ? "" : "s"} awaiting review`}
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

          <select
            className={styles.filterSelect}
            value={changeFilter}
            onChange={(e) => setChangeFilter(e.target.value as ChangeFilter)}
          >
            <option value="ALL">All Changes</option>
            <option value="FIELDS">Field Changes</option>
            <option value="IMAGES">Image Changes</option>
            <option value="PRICE">Price Changed</option>
            <option value="LOCATION">Location Changed</option>
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
        ) : filtered.length === 0 ? (
          <div className={styles.stateBox}>
            <span className={styles.stateIcon}>
              {requests.length === 0 ? <CheckCircle size={48} /> : <SearchX size={48} />}
            </span>
            <h3 className={styles.stateTitle}>
              {requests.length === 0 ? "All caught up!" : "No results found"}
            </h3>
            <p className={styles.stateBody}>
              {requests.length === 0
                ? "No property edit requests pending review at this time."
                : "No edit requests match your current search or filter."}
            </p>
          </div>
        ) : (
          <>
            {sortedYears.map((year) => {
              const sortedMonths = Object.keys(grouped[year]).sort(
                (a, b) => MONTHS_ORDER.indexOf(b) - MONTHS_ORDER.indexOf(a)
              );

              return (
                <div key={year} className={styles.yearBlock}>
                  {/* ── Year divider ── */}
                  <div className={styles.yearDivider}>
                    <span className={styles.yearLabel}>{year}</span>
                    <div className={styles.yearLine} />
                  </div>

                  {sortedMonths.map((month) => {
                    const groupKey    = `${year}-${month}`;
                    const isCollapsed = collapsedGroups.has(groupKey);
                    const monthReqs   = grouped[year][month];
                    const withImages  = monthReqs.filter(r => r.imagesChanged).length;
                    const withFields  = monthReqs.filter(r => countChanges(r) > 0).length;

                    return (
                      <div key={groupKey} className={styles.monthBlock}>
                        {/* ── Month collapsible header ── */}
                        <button
                          type="button"
                          className={styles.monthHeader}
                          onClick={() => toggleGroup(groupKey)}
                        >
                          <div className={styles.monthHeaderLeft}>
                            <Calendar size={15} className={styles.monthCalIcon} />
                            <span className={styles.monthLabel}>{month}</span>
                            <span className={styles.monthCount}>
                              {monthReqs.length} request{monthReqs.length !== 1 ? "s" : ""}
                            </span>
                            {withFields > 0 && (
                              <span className={styles.monthStatFields}>
                                {withFields} field change{withFields !== 1 ? "s" : ""}
                              </span>
                            )}
                            {withImages > 0 && (
                              <span className={styles.monthStatImages}>
                                <ImageIcon size={11} /> {withImages} image change{withImages !== 1 ? "s" : ""}
                              </span>
                            )}
                          </div>
                          <span className={styles.monthChevron}>
                            {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                          </span>
                        </button>

                        {!isCollapsed && (
                          <div className={styles.requestList}>
                            {monthReqs.map((r, i) => {
                              const changesCount = countChanges(r);
                              return (
                                <div
                                  key={r.id}
                                  className={styles.requestCard}
                                  style={{ animationDelay: `${i * 30}ms` }}
                                  onClick={() => navigate(`/admin/property-edit-requests/${r.id}`)}
                                >
                                  <div className={styles.cardTop}>
                                    {/* Thumbnail */}
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

                                      {/* Change pills */}
                                      <div className={styles.changedPills}>
                                        {changesCount > 0 && (
                                          <span className={styles.changesCount}>
                                            {changesCount} field{changesCount !== 1 ? "s" : ""} changed
                                          </span>
                                        )}
                                        {r.imagesChanged && (
                                          <span className={styles.pillImages}>
                                            <ImageIcon size={10} /> Photos
                                          </span>
                                        )}
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
                                    {/* Submission date on the left */}
                                    <span className={styles.cardDate}>
                                      <Calendar size={13} />
                                      {new Date(r.createdAt).toLocaleDateString("en-PH", {
                                        month: "short", day: "numeric",
                                        hour: "2-digit", minute: "2-digit",
                                      })}
                                    </span>
                                    <button
                                      className={styles.detailBtn}
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(`/admin/property-edit-requests/${r.id}`);
                                      }}
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

export default AdminPropertyEdits;