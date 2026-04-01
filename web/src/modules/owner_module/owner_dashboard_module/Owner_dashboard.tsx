import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import OwnerNavbar from "../../../components/OwnerNavbar/OwnerNavbar";
import styles from "./Owner_dashboard.module.css";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

// ─── types ──────────────────────────────────────────────────────────────────

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  avatarUrl?: string | null;
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
}

// ─── helpers ────────────────────────────────────────────────────────────────

function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency", currency: "PHP",
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(price);
}

// ─── Mini bar chart ─────────────────────────────────────────────────────────

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

// ─── Donut chart ─────────────────────────────────────────────────────────────

function DonutChart({
  segments,
  label,
  value,
}: {
  segments: { value: number; color: string }[];
  label: string;
  value: string;
}) {
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;
  let offset = 0;
  const r = 36;
  const cx = 44;
  const cy = 44;
  const circumference = 2 * Math.PI * r;

  return (
    <div className={styles.donutWrap}>
      <svg width="88" height="88" viewBox="0 0 88 88">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f0f4f5" strokeWidth="10" />
        {segments.map((seg, i) => {
          const dash = (seg.value / total) * circumference;
          const gap = circumference - dash;
          const rotation = (offset / total) * 360 - 90;
          offset += seg.value;
          if (seg.value === 0) return null;
          return (
            <circle
              key={i}
              cx={cx} cy={cy} r={r}
              fill="none"
              stroke={seg.color}
              strokeWidth="10"
              strokeDasharray={`${dash} ${gap}`}
              strokeDashoffset={0}
              transform={`rotate(${rotation} ${cx} ${cy})`}
              strokeLinecap="butt"
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

// ─── component ──────────────────────────────────────────────────────────────

const OwnerDashboard: React.FC = () => {
  const navigate = useNavigate();

  const [user, setUser]           = useState<User | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  // ── Auth guard ──────────────────────────────────────────────────────────
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


  // ── Fetch analytics ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem("accessToken");

    fetch(`${API_BASE}/api/analytics/owner`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setAnalytics(data.data);
      })
      .catch(() => {}) // analytics failure is non-fatal
      .finally(() => setAnalyticsLoading(false));
  }, [user]);

  // ── Derived ─────────────────────────────────────────────────────────────
  const al = analyticsLoading;
  const a  = analytics;

  if (!user) return null;

  return (
    <div className={styles.page}>
      <OwnerNavbar
        user={user}
        onAddProperty={() => navigate("/owner/properties/new")}
      />

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
            <h1 className={styles.heroTitle}>
              Welcome back, {user.name.split(" ")[0]}
            </h1>
            <p className={styles.heroSub}>
              Manage your listings, review requests, and track your rentals.
            </p>
          </div>
          <button
            className={styles.heroAddBtn}
            onClick={() => navigate("/owner/properties/new")}
            type="button"
          >
            + Add New Property
          </button>
        </div>
      </section>

      {/* ── Main ── */}
      <main className={styles.main}>

        {/* ── Top Stats Row ── */}
        <div className={styles.statsRow}>
          <div className={styles.statCard}>
            <div className={`${styles.statIconWrap} ${styles.statIconTeal}`}>🏠</div>
            <div className={styles.statInfo}>
              <span className={styles.statValue}>{al ? "—" : a?.propertyStats.total ?? "—"}</span>
              <span className={styles.statLabel}>Total Listings</span>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={`${styles.statIconWrap} ${styles.statIconGreen}`}>✅</div>
            <div className={styles.statInfo}>
              <span className={styles.statValue}>{al ? "—" : a?.propertyStats.available ?? "—"}</span>
              <span className={styles.statLabel}>Available</span>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={`${styles.statIconWrap} ${styles.statIconGold}`}>⏳</div>
            <div className={styles.statInfo}>
              <span className={styles.statValue}>{al ? "—" : a?.propertyStats.pendingReview ?? "—"}</span>
              <span className={styles.statLabel}>Pending Review</span>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={`${styles.statIconWrap} ${styles.statIconBlue}`}>🔑</div>
            <div className={styles.statInfo}>
              <span className={styles.statValue}>{al ? "—" : a?.occupancy.occupied ?? "—"}</span>
              <span className={styles.statLabel}>Occupied</span>
            </div>
          </div>
        </div>

        {/* ── Analytics Grid ── */}
        <div className={styles.analyticsGrid}>

          {/* Revenue Card */}
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
            {al ? (
              <div className={styles.chartSkeleton} />
            ) : a?.monthlyRevenue ? (
              <RevenueChart data={a.monthlyRevenue} />
            ) : null}
          </div>

          {/* Occupancy Card */}
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
              {al ? (
                <div className={styles.donutSkeleton} />
              ) : (
                <DonutChart
                  segments={[
                    { value: a?.occupancy.occupied ?? 0, color: "var(--teal-deep)" },
                    { value: (a?.occupancy.total ?? 0) - (a?.occupancy.occupied ?? 0), color: "#e8f0f2" },
                  ]}
                  label="Occupied"
                  value={`${a?.occupancy.rate ?? 0}%`}
                />
              )}
              <div className={styles.occupancyLegend}>
                <div className={styles.legendItem}>
                  <span className={styles.legendDot} style={{ background: "var(--teal-deep)" }} />
                  <span className={styles.legendText}>
                    Occupied <strong>{al ? "—" : a?.occupancy.occupied}</strong>
                  </span>
                </div>
                <div className={styles.legendItem}>
                  <span className={styles.legendDot} style={{ background: "#e8f0f2", border: "1px solid #ccc" }} />
                  <span className={styles.legendText}>
                    Vacant <strong>{al ? "—" : (a?.occupancy.total ?? 0) - (a?.occupancy.occupied ?? 0)}</strong>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Request Funnel Card */}
          <div className={styles.analyticCard}>
            <div className={styles.analyticCardHeader}>
              <div>
                <div className={styles.sectionEyebrow}>
                  <div className={styles.sectionEyebrowDot} />
                  <span className={styles.sectionEyebrowText}>Requests</span>
                </div>
                <h2 className={styles.sectionTitle}>Request Funnel</h2>
              </div>
              <span className={styles.requestTotal}>
                {al ? "—" : a?.requestStats.total} total
              </span>
            </div>
            <div className={styles.funnelList}>
              {[
                { label: "Pending",    key: "pending",    color: "#b78e42", icon: "⏳" },
                { label: "Approved",   key: "approved",   color: "#53a4a3", icon: "👍" },
                { label: "Confirmed",  key: "confirmed",  color: "#2d8c6a", icon: "🔑" },
                { label: "Rejected",   key: "rejected",   color: "#c0392b", icon: "✗" },
                { label: "Terminated", key: "terminated", color: "#6e7071", icon: "🚫" },
              ].map(({ label, key, color, icon }) => {
                const count = al ? 0 : (a?.requestStats as any)?.[key] ?? 0;
                const total = al ? 1  : Math.max(a?.requestStats.total ?? 1, 1);
                const pct   = Math.round((count / total) * 100);
                return (
                  <div key={key} className={styles.funnelRow}>
                    <div className={styles.funnelMeta}>
                      <span className={styles.funnelIcon}>{icon}</span>
                      <span className={styles.funnelLabel}>{label}</span>
                      <span className={styles.funnelCount}>{al ? "—" : count}</span>
                    </div>
                    <div className={styles.funnelTrack}>
                      <div
                        className={styles.funnelBar}
                        style={{ width: al ? "0%" : `${pct}%`, background: color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Payment Breakdown Card */}
          <div className={styles.analyticCard}>
            <div className={styles.analyticCardHeader}>
              <div>
                <div className={styles.sectionEyebrow}>
                  <div className={styles.sectionEyebrowDot} />
                  <span className={styles.sectionEyebrowText}>Payments</span>
                </div>
                <h2 className={styles.sectionTitle}>Payment Status</h2>
              </div>
            </div>
            <div className={styles.paymentList}>
              {[
                {
                  label:  "Paid",
                  count:  a?.paymentStats.paidCount,
                  amount: a?.paymentStats.totalRevenue,
                  color:  "#2d8c6a",
                  bg:     "rgba(45,140,106,0.08)",
                  icon:   "✓",
                },
                {
                  label:  "Pending",
                  count:  a?.paymentStats.pendingCount,
                  amount: a?.paymentStats.pendingAmount,
                  color:  "#b78e42",
                  bg:     "rgba(183,142,66,0.08)",
                  icon:   "⏳",
                },
                {
                  label:  "Overdue",
                  count:  a?.paymentStats.overdueCount,
                  amount: a?.paymentStats.overdueAmount,
                  color:  "#c0392b",
                  bg:     "rgba(192,57,43,0.08)",
                  icon:   "⚠️",
                },
              ].map(({ label, count, amount, color, bg, icon }) => (
                <div key={label} className={styles.paymentRow} style={{ background: bg }}>
                  <div className={styles.paymentRowLeft}>
                    <span className={styles.paymentIcon} style={{ color }}>{icon}</span>
                    <div>
                      <div className={styles.paymentRowLabel}>{label}</div>
                      <div className={styles.paymentRowCount} style={{ color }}>
                        {al ? "—" : count} payment{count !== 1 ? "s" : ""}
                      </div>
                    </div>
                  </div>
                  <div className={styles.paymentRowAmount} style={{ color }}>
                    {al ? "—" : formatPrice(amount ?? 0)}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </main>
    </div>
  );
};

export default OwnerDashboard;