import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import OwnerNavbar from "../../../components/OwnerNavbar/OwnerNavbar";
import styles from "./Owner_dashboard.module.css";

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

const OwnerDashboard: React.FC = () => {
  const navigate = useNavigate();

  const [user, setUser]           = useState<User | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);

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

  // ── Fetch owner's properties ───────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem("accessToken");

    fetch(`${API_BASE}/api/properties`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.json())
      .then((data) => {
        if (!data.success) { setError("Failed to load properties."); return; }
        setProperties(data.data.properties ?? []);
      })
      .catch(() => setError("Unable to connect to server."))
      .finally(() => setLoading(false));
  }, [user]);

  // ── Derived stats ──────────────────────────────────────────────────────
  const total     = properties.length;
  const available = properties.filter((p) => p.status?.toUpperCase() === "AVAILABLE").length;
  const pending   = properties.filter((p) =>
    ["PENDING_REVIEW", "PENDING"].includes(p.status?.toUpperCase())
  ).length;

  // Recent 6
  const recent = properties.slice(0, 6);

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

        {/* Stats */}
        <div className={styles.statsRow}>
          <div className={styles.statCard}>
            <div className={`${styles.statIconWrap} ${styles.statIconTeal}`}>🏠</div>
            <div className={styles.statInfo}>
              <span className={styles.statValue}>{loading ? "—" : total}</span>
              <span className={styles.statLabel}>Total Listings</span>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={`${styles.statIconWrap} ${styles.statIconGreen}`}>✅</div>
            <div className={styles.statInfo}>
              <span className={styles.statValue}>{loading ? "—" : available}</span>
              <span className={styles.statLabel}>Available</span>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={`${styles.statIconWrap} ${styles.statIconGold}`}>⏳</div>
            <div className={styles.statInfo}>
              <span className={styles.statValue}>{loading ? "—" : pending}</span>
              <span className={styles.statLabel}>Pending Review</span>
            </div>
          </div>
        </div>

        {/* Recent Listings */}
        <div>
          <div className={styles.sectionHeader}>
            <div>
              <div className={styles.sectionEyebrow}>
                <div className={styles.sectionEyebrowDot} />
                <span className={styles.sectionEyebrowText}>Recent</span>
              </div>
              <h2 className={styles.sectionTitle}>Your Listings</h2>
            </div>
            <a href="/owner/properties" className={styles.sectionLink}>
              View All →
            </a>
          </div>

          <div className={styles.propertyGrid}>
            {/* Skeleton */}
            {loading && Array.from({ length: 3 }).map((_, i) => (
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
              <div className={styles.emptyState}>
                <span className={styles.emptyIcon}>⚠️</span>
                <h3 className={styles.emptyTitle}>Something went wrong</h3>
                <p className={styles.emptyBody}>{error}</p>
              </div>
            )}

            {/* Empty */}
            {!loading && !error && recent.length === 0 && (
              <div className={styles.emptyState}>
                <span className={styles.emptyIcon}>🏘️</span>
                <h3 className={styles.emptyTitle}>No properties yet</h3>
                <p className={styles.emptyBody}>
                  Start by adding your first property listing.
                </p>
                <button
                  className={styles.emptyBtn}
                  onClick={() => navigate("/owner/properties/new")}
                >
                  + Add Property
                </button>
              </div>
            )}

            {/* Cards */}
            {!loading && !error && recent.map((p, i) => {
              const img = p.images?.[0]?.imageUrl;
              const statusLabel = p.status?.charAt(0) + p.status?.slice(1).toLowerCase();
              return (
                <div
                  key={p.id}
                  className={styles.card}
                  style={{ animationDelay: `${i * 60}ms` }}
                >
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
                  </div>

                  <div className={styles.cardBody}>
                    <h3 className={styles.cardTitle}>{p.title}</h3>
                    <div className={styles.cardLocation}>📍 {p.location}</div>
                    <div className={styles.cardFooter}>
                      <div>
                        <div className={styles.cardPrice}>{formatPrice(p.price)}</div>
                        <div className={styles.cardPriceLabel}>/ month</div>
                      </div>
                      <a
                        href={`/owner/properties/${p.id}`}
                        className={styles.cardManageBtn}
                      >
                        Manage →
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </main>
    </div>
  );
};

export default OwnerDashboard;