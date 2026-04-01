import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import OwnerNavbar from "../../../components/OwnerNavbar/OwnerNavbar";
import styles from "./Owner_dashboard.module.css";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

const PAGE_SIZE = 8;

// ─── types ──────────────────────────────────────────────────────────────────

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  avatarUrl?: string | null;
}

interface PaymentEntry {
  id: number;
  rentalRequestId: number;
  installmentNumber: number;
  totalInstallments: number;
  amount: number;
  dueDate: string | null;
  paidAt: string | null;
  status: string;
  tenantId: number;
  tenantName: string;
  tenantEmail: string;
  propertyId: number;
  propertyTitle: string;
  propertyLocation: string;
}

interface PropertyRating {
  propertyId: number;
  propertyTitle: string;
  avgRating: number;
  reviewCount: number;
  distribution: { star: number; count: number }[];
}

interface Analytics {
  propertyStats: {
    total: number;
    available: number;
    unavailable: number;
    pendingReview: number;
  };
  requestStats: {
    pending: number;
    approved: number;
    rejected: number;
    confirmed: number;
    terminated: number;
    total: number;
  };
  occupancy: {
    occupied: number;
    total: number;
    rate: number;
  };
  paymentStats: {
    totalRevenue: number;
    pendingAmount: number;
    overdueAmount: number;
    paidCount: number;
    pendingCount: number;
    overdueCount: number;
  };
  monthlyRevenue: { month: string; revenue: number }[];
  paidPayments: PaymentEntry[];
  pendingPayments: PaymentEntry[];
  overduePayments: PaymentEntry[];
  overallRating: {
    average: number;
    total: number;
  };
  propertyRatings: PropertyRating[];
}

type DrawerStatus = "paid" | "pending" | "overdue";

const DRAWER_META: Record<DrawerStatus, { label: string; color: string; bg: string; icon: string; entriesKey: keyof Analytics }> = {
  paid:    { label: "Paid Payments",    color: "#2d8c6a", bg: "rgba(45,140,106,0.08)",  icon: "✓",  entriesKey: "paidPayments"    },
  pending: { label: "Pending Payments", color: "#b78e42", bg: "rgba(183,142,66,0.08)",  icon: "⏳", entriesKey: "pendingPayments" },
  overdue: { label: "Overdue Payments", color: "#c0392b", bg: "rgba(192,57,43,0.08)",   icon: "⚠️", entriesKey: "overduePayments" },
};

// ─── helpers ─────────────────────────────────────────────────────────────────

function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency", currency: "PHP",
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(price);
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function RevenueChart({ data }: { data: { month: string; revenue: number }[] }) {
  const max = Math.max(...data.map((d) => d.revenue), 1);
  return (
    <div className={styles.chartWrap}>
      {data.map((d, i) => {
        const pct = (d.revenue / max) * 100;
        return (
          <div key={i} className={styles.chartCol}>
            <div className={styles.chartBarTrack}>
              <div
                className={styles.chartBar}
                style={{ height: `${Math.max(pct, 2)}%`, animationDelay: `${i * 80}ms` }}
              />
            </div>
            <div className={styles.chartLabel}>{d.month.split(" ")[0]}</div>
            {d.revenue > 0 && (
              <div className={styles.chartValue}>{formatPrice(d.revenue)}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function DonutChart({ segments, label, value }: {
  segments: { value: number; color: string }[];
  label: string;
  value: string;
}) {
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;
  let offset = 0;
  const r = 36, cx = 44, cy = 44;
  const circumference = 2 * Math.PI * r;

  return (
    <div className={styles.donutWrap}>
      <svg width="88" height="88" viewBox="0 0 88 88">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f0f4f5" strokeWidth="10" />
        {segments.map((seg, i) => {
          const dash = (seg.value / total) * circumference;
          const gap  = circumference - dash;
          const rotation = (offset / total) * 360 - 90;
          offset += seg.value;
          if (seg.value === 0) return null;
          return (
            <circle key={i} cx={cx} cy={cy} r={r} fill="none"
              stroke={seg.color} strokeWidth="10"
              strokeDasharray={`${dash} ${gap}`} strokeDashoffset={0}
              transform={`rotate(${rotation} ${cx} ${cy})`} strokeLinecap="butt"
            />
          );
        })}
      </svg>
      <div className={styles.donutCenter}>
        <span className={styles.donutValue}>{value}</span>
        <span className={styles.donutLabel}>{label}</span>
      </div>
    </div>
  );
}

// ─── Payment Drawer ───────────────────────────────────────────────────────────

function PaymentDrawer({
  status,
  entries,
  onClose,
}: {
  status: DrawerStatus;
  entries: PaymentEntry[];
  onClose: () => void;
}) {
  const meta = DRAWER_META[status];
  const [page, setPage]     = useState(1);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const filtered = entries.filter((e) => {
    const q = search.toLowerCase();
    return (
      e.tenantName.toLowerCase().includes(q) ||
      e.tenantEmail.toLowerCase().includes(q) ||
      e.propertyTitle.toLowerCase().includes(q) ||
      e.propertyLocation.toLowerCase().includes(q)
    );
  });

  const totalPages  = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageEntries = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [search]);

  return (
    <>
      <div className={styles.drawerBackdrop} onClick={onClose} />
      <div className={styles.drawer} role="dialog" aria-modal="true" aria-label={meta.label}>

        <div className={styles.drawerHeader} style={{ borderTop: `3px solid ${meta.color}` }}>
          <div className={styles.drawerHeaderLeft}>
            <span className={styles.drawerIcon} style={{ color: meta.color, background: meta.bg }}>
              {meta.icon}
            </span>
            <div>
              <h2 className={styles.drawerTitle}>{meta.label}</h2>
              <p className={styles.drawerSubtitle}>
                {filtered.length} of {entries.length} payment{entries.length !== 1 ? "s" : ""}
                {search ? " matched" : " total"}
              </p>
            </div>
          </div>
          <button className={styles.drawerClose} onClick={onClose} type="button" aria-label="Close">✕</button>
        </div>

        <div className={styles.drawerSearch}>
          <span className={styles.drawerSearchIcon}>🔍</span>
          <input
            className={styles.drawerSearchInput}
            type="text"
            placeholder="Search by tenant, email, or property…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
          {search && (
            <button className={styles.drawerSearchClear} onClick={() => setSearch("")} type="button">✕</button>
          )}
        </div>

        <div className={styles.drawerBody}>
          {pageEntries.length === 0 ? (
            <div className={styles.drawerEmpty}>
              <span className={styles.drawerEmptyIcon}>🔍</span>
              <p>No payments match your search.</p>
            </div>
          ) : (
            <table className={styles.drawerTable}>
              <thead>
                <tr>
                  <th>Installment</th>
                  <th>Property</th>
                  <th>Tenant</th>
                  <th>Due Date</th>
                  <th>{status === "paid" ? "Paid On" : "Status"}</th>
                  <th className={styles.drawerTableAmountCol}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {pageEntries.map((entry, idx) => (
                  <tr key={entry.id} className={styles.drawerRow} style={{ animationDelay: `${idx * 30}ms` }}>
                    <td>
                      <div className={styles.drawerInstallBadge} style={{ background: meta.bg, color: meta.color }}>
                        <span className={styles.drawerInstallNum}>{entry.installmentNumber}</span>
                        <span className={styles.drawerInstallOf}>of {entry.totalInstallments}</span>
                      </div>
                    </td>
                    <td>
                      <div className={styles.drawerCellTitle}>{entry.propertyTitle}</div>
                      <div className={styles.drawerCellSub}>📍 {entry.propertyLocation}</div>
                    </td>
                    <td>
                      <div className={styles.drawerCellTitle}>{entry.tenantName}</div>
                      <div className={styles.drawerCellSub}>{entry.tenantEmail}</div>
                    </td>
                    <td>
                      <div className={styles.drawerCellDate}>{entry.dueDate ?? "—"}</div>
                    </td>
                    <td>
                      {status === "paid" ? (
                        <div className={styles.drawerCellDate} style={{ color: "#2d8c6a" }}>
                          {entry.paidAt ?? "—"}
                        </div>
                      ) : (
                        <span className={styles.drawerStatusPill} style={{ background: meta.bg, color: meta.color }}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </span>
                      )}
                    </td>
                    <td className={styles.drawerTableAmountCol}>
                      <div className={styles.drawerCellAmount} style={{ color: meta.color }}>
                        {formatPrice(entry.amount)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {totalPages > 1 && (
          <div className={styles.drawerPager}>
            <button className={styles.drawerPagerBtn}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1} type="button">← Prev</button>
            <div className={styles.drawerPagerPages}>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
                <button key={pg}
                  className={`${styles.drawerPagerNum} ${pg === currentPage ? styles.drawerPagerNumActive : ""}`}
                  onClick={() => setPage(pg)} type="button">{pg}</button>
              ))}
            </div>
            <button className={styles.drawerPagerBtn}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages} type="button">Next →</button>
          </div>
        )}

        <div className={styles.drawerFooter}>
          <span className={styles.drawerFooterLabel}>
            Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length}
          </span>
          <span className={styles.drawerFooterTotal} style={{ color: meta.color }}>
            Total: {formatPrice(filtered.reduce((s, e) => s + e.amount, 0))}
          </span>
        </div>
      </div>
    </>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const OwnerDashboard: React.FC = () => {
  const navigate = useNavigate();

  const [user, setUser]                         = useState<User | null>(null);
  const [analytics, setAnalytics]               = useState<Analytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [drawerStatus, setDrawerStatus]         = useState<DrawerStatus | null>(null);

  const openDrawer  = useCallback((s: DrawerStatus) => setDrawerStatus(s), []);
  const closeDrawer = useCallback(() => setDrawerStatus(null), []);

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

  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem("accessToken");
    fetch(`${API_BASE}/api/analytics/owner`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.json())
      .then((data) => { if (data.success) setAnalytics(data.data); })
      .catch(() => {})
      .finally(() => setAnalyticsLoading(false));
  }, [user]);

  const al = analyticsLoading;
  const a  = analytics;

  if (!user) return null;

  const drawerEntries = drawerStatus
    ? ((a?.[DRAWER_META[drawerStatus].entriesKey] ?? []) as PaymentEntry[])
    : [];

  // Ratings derived
  const allDist = a?.propertyRatings?.flatMap((p) => p.distribution ?? []) ?? [];
  const overallTotal = a?.overallRating?.total ?? 0;

  return (
    <div className={styles.page}>
      <OwnerNavbar user={user} onAddProperty={() => navigate("/owner/properties/new")} />

      {/* ── Hero ── */}
      <section className={styles.hero}>
        <div className={`${styles.heroDeco} ${styles.heroDeco1}`} />
        <div className={`${styles.heroDeco} ${styles.heroDeco2}`} />
        <div className={styles.heroAccent} />
        <div className={styles.heroInner}>
          <div className={styles.heroText}>
            <div className={styles.heroEyebrow}>
              <div className={styles.heroEyebrowLine} />
              <span className={styles.heroEyebrowText}>Owner Dashboard</span>
            </div>
            <h1 className={styles.heroTitle}>Welcome back, {user.name.split(" ")[0]}</h1>
            <p className={styles.heroSub}>Manage your listings, review requests, and track your rentals.</p>
          </div>
          <button className={styles.heroAddBtn} onClick={() => navigate("/owner/properties/new")} type="button">
            + Add New Property
          </button>
        </div>
      </section>

      {/* ── Main ── */}
      <main className={styles.main}>

        {/* Stats Row */}
        <div className={styles.statsRow}>
          {[
            { icon: "🏠", value: a?.propertyStats.total,        label: "Total Listings", cls: styles.statIconTeal  },
            { icon: "✅", value: a?.propertyStats.available,     label: "Available",      cls: styles.statIconGreen },
            { icon: "⏳", value: a?.propertyStats.pendingReview, label: "Pending Review", cls: styles.statIconGold  },
            { icon: "🔑", value: a?.occupancy.occupied,          label: "Occupied",       cls: styles.statIconBlue  },
          ].map(({ icon, value, label, cls }) => (
            <div key={label} className={styles.statCard}>
              <div className={`${styles.statIconWrap} ${cls}`}>{icon}</div>
              <div className={styles.statInfo}>
                <span className={styles.statValue}>{al ? "—" : value ?? "—"}</span>
                <span className={styles.statLabel}>{label}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Analytics Grid */}
        <div className={styles.analyticsGrid}>

          {/* Revenue */}
          <div className={styles.analyticCard} style={{ gridColumn: "span 2" }}>
            <div className={styles.analyticCardHeader}>
              <div>
                <div className={styles.sectionEyebrow}>
                  <div className={styles.sectionEyebrowDot} />
                  <span className={styles.sectionEyebrowText}>Revenue</span>
                </div>
                <h2 className={styles.sectionTitle}>Monthly Revenue</h2>
              </div>
              <div className={styles.revenueTotal}>
                <span className={styles.revenueTotalLabel}>Total Collected</span>
                <span className={styles.revenueTotalValue}>
                  {al ? "—" : formatPrice(a?.paymentStats.totalRevenue ?? 0)}
                </span>
              </div>
            </div>
            {al ? <div className={styles.chartSkeleton} /> : a?.monthlyRevenue ? <RevenueChart data={a.monthlyRevenue} /> : null}
          </div>

          {/* Occupancy */}
          <div className={styles.analyticCard}>
            <div className={styles.analyticCardHeader}>
              <div>
                <div className={styles.sectionEyebrow}>
                  <div className={styles.sectionEyebrowDot} />
                  <span className={styles.sectionEyebrowText}>Occupancy</span>
                </div>
                <h2 className={styles.sectionTitle}>Occupancy Rate</h2>
              </div>
            </div>
            <div className={styles.occupancyBody}>
              {al ? <div className={styles.donutSkeleton} /> : (
                <DonutChart
                  segments={[
                    { value: a?.occupancy.occupied ?? 0, color: "var(--teal-deep)" },
                    { value: (a?.occupancy.total ?? 0) - (a?.occupancy.occupied ?? 0), color: "#e8f0f2" },
                  ]}
                  label="Occupied" value={`${a?.occupancy.rate ?? 0}%`}
                />
              )}
              <div className={styles.occupancyLegend}>
                <div className={styles.legendItem}>
                  <span className={styles.legendDot} style={{ background: "var(--teal-deep)" }} />
                  <span className={styles.legendText}>Occupied <strong>{al ? "—" : a?.occupancy.occupied}</strong></span>
                </div>
                <div className={styles.legendItem}>
                  <span className={styles.legendDot} style={{ background: "#e8f0f2", border: "1px solid #ccc" }} />
                  <span className={styles.legendText}>Vacant <strong>{al ? "—" : (a?.occupancy.total ?? 0) - (a?.occupancy.occupied ?? 0)}</strong></span>
                </div>
              </div>
            </div>
          </div>

          {/* Request Funnel */}
          <div className={styles.analyticCard}>
            <div className={styles.analyticCardHeader}>
              <div>
                <div className={styles.sectionEyebrow}>
                  <div className={styles.sectionEyebrowDot} />
                  <span className={styles.sectionEyebrowText}>Requests</span>
                </div>
                <h2 className={styles.sectionTitle}>Request Funnel</h2>
              </div>
              <span className={styles.requestTotal}>{al ? "—" : a?.requestStats.total} total</span>
            </div>
            <div className={styles.funnelList}>
              {[
                { label: "Pending",    key: "pending",    color: "#b78e42", icon: "⏳" },
                { label: "Approved",   key: "approved",   color: "#53a4a3", icon: "👍" },
                { label: "Confirmed",  key: "confirmed",  color: "#2d8c6a", icon: "🔑" },
                { label: "Rejected",   key: "rejected",   color: "#c0392b", icon: "✗"  },
                { label: "Terminated", key: "terminated", color: "#6e7071", icon: "🚫" },
              ].map(({ label, key, color, icon }) => {
                const count = al ? 0 : (a?.requestStats as any)?.[key] ?? 0;
                const total = al ? 1 : Math.max(a?.requestStats.total ?? 1, 1);
                return (
                  <div key={key} className={styles.funnelRow}>
                    <div className={styles.funnelMeta}>
                      <span className={styles.funnelIcon}>{icon}</span>
                      <span className={styles.funnelLabel}>{label}</span>
                      <span className={styles.funnelCount}>{al ? "—" : count}</span>
                    </div>
                    <div className={styles.funnelTrack}>
                      <div className={styles.funnelBar} style={{ width: al ? "0%" : `${Math.round((count / total) * 100)}%`, background: color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Payment Status */}
          <div className={styles.analyticCard}>
            <div className={styles.analyticCardHeader}>
              <div>
                <div className={styles.sectionEyebrow}>
                  <div className={styles.sectionEyebrowDot} />
                  <span className={styles.sectionEyebrowText}>Payments</span>
                </div>
                <h2 className={styles.sectionTitle}>Payment Status</h2>
              </div>
              <span className={styles.drawerHint}>Click a row to view details</span>
            </div>

            <div className={styles.paymentList}>
              {([
                { key: "paid"    as DrawerStatus, label: "Paid",    count: a?.paymentStats.paidCount,    amount: a?.paymentStats.totalRevenue,  color: "#2d8c6a", bg: "rgba(45,140,106,0.08)",  icon: "✓"  },
                { key: "pending" as DrawerStatus, label: "Pending", count: a?.paymentStats.pendingCount, amount: a?.paymentStats.pendingAmount, color: "#b78e42", bg: "rgba(183,142,66,0.08)",  icon: "⏳" },
                { key: "overdue" as DrawerStatus, label: "Overdue", count: a?.paymentStats.overdueCount, amount: a?.paymentStats.overdueAmount, color: "#c0392b", bg: "rgba(192,57,43,0.08)",   icon: "⚠️" },
              ]).map(({ key, label, count, amount, color, bg, icon }) => {
                const hasEntries = !al && (count ?? 0) > 0;
                return (
                  <button
                    key={key}
                    className={`${styles.paymentRow} ${hasEntries ? styles.paymentRowClickable : ""}`}
                    style={{ background: bg }}
                    onClick={() => hasEntries && openDrawer(key)}
                    disabled={al || !hasEntries}
                    type="button"
                  >
                    <div className={styles.paymentRowLeft}>
                      <span className={styles.paymentIcon} style={{ color }}>{icon}</span>
                      <div>
                        <div className={styles.paymentRowLabel}>{label}</div>
                        <div className={styles.paymentRowCount} style={{ color }}>
                          {al ? "—" : count} payment{count !== 1 ? "s" : ""}
                        </div>
                      </div>
                    </div>
                    <div className={styles.paymentRowRight}>
                      <div className={styles.paymentRowAmount} style={{ color }}>
                        {al ? "—" : formatPrice(amount ?? 0)}
                      </div>
                      {hasEntries && (
                        <span className={styles.paymentArrow} style={{ color }}>→</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Ratings Overview ── */}
          <div className={styles.analyticCard}>
            <div className={styles.analyticCardHeader}>
              <div>
                <div className={styles.sectionEyebrow}>
                  <div className={styles.sectionEyebrowDot} />
                  <span className={styles.sectionEyebrowText}>Reviews</span>
                </div>
                <h2 className={styles.sectionTitle}>Property Ratings</h2>
              </div>
              {!al && overallTotal > 0 && (
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "28px", fontWeight: 800, color: "#f59e0b", lineHeight: 1 }}>
                    {a!.overallRating.average.toFixed(1)}
                  </div>
                  <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                    {overallTotal} review{overallTotal !== 1 ? "s" : ""}
                  </div>
                </div>
              )}
            </div>

            {al ? (
              <div className={styles.chartSkeleton} style={{ height: "120px" }} />
            ) : overallTotal === 0 ? (
              <div style={{ padding: "32px 0", textAlign: "center", color: "#94a3b8" }}>
                <div style={{ fontSize: "32px", marginBottom: "8px" }}>⭐</div>
                <div style={{ fontSize: "13px" }}>No reviews yet across your properties</div>
              </div>
            ) : (
              <>
                {/* Star distribution */}
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "16px" }}>
                  {[5,4,3,2,1].map((star) => {
                    const count = allDist.filter((d) => d.star === star).reduce((s, d) => s + d.count, 0);
                    const pct   = overallTotal > 0 ? Math.round((count / overallTotal) * 100) : 0;
                    return (
                      <div key={star} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "12px", fontWeight: 600, color: "#64748b", width: "22px", textAlign: "right" }}>
                          {star}★
                        </span>
                        <div style={{ flex: 1, height: "8px", background: "#f0f4f5", borderRadius: "4px", overflow: "hidden" }}>
                          <div style={{
                            height: "100%", width: `${pct}%`,
                            background: "#f59e0b", borderRadius: "4px",
                            transition: "width 0.6s ease",
                          }} />
                        </div>
                        <span style={{ fontSize: "11px", color: "#94a3b8", width: "24px" }}>{count}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Top rated properties */}
                {a!.propertyRatings && a!.propertyRatings.filter((p) => p.reviewCount > 0).length > 0 && (
                  <>
                    <div style={{
                      fontSize: "11px", fontWeight: 700, color: "#1f5d71",
                      textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "8px",
                    }}>
                      Top Rated
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      {a!.propertyRatings
                        .filter((p) => p.reviewCount > 0)
                        .sort((x, y) => y.avgRating - x.avgRating)
                        .slice(0, 3)
                        .map((p) => (
                          <div
                            key={p.propertyId}
                            onClick={() => navigate(`/owner/properties/${p.propertyId}/edit`)}
                            className={styles.ratingPropertyRow}
                          >
                            <span className={styles.ratingPropertyTitle}>{p.propertyTitle}</span>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
                              <span style={{ fontSize: "13px", fontWeight: 800, color: "#f59e0b" }}>
                                ★ {p.avgRating.toFixed(1)}
                              </span>
                              <span style={{ fontSize: "11px", color: "#94a3b8" }}>({p.reviewCount})</span>
                            </div>
                          </div>
                        ))}
                    </div>
                  </>
                )}
              </>
            )}
          </div>

        </div>
      </main>

      {/* ── Slide-in Drawer ── */}
      {drawerStatus && (
        <PaymentDrawer
          status={drawerStatus}
          entries={drawerEntries}
          onClose={closeDrawer}
        />
      )}
    </div>
  );
};

export default OwnerDashboard;