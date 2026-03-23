import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./Tenant_Landing..module.css";
import Navbar from "../../../components/Navbar/Navbar";
import Footer from "../../../components/Navbar/Footer";

/* ─────────────────────────────────────────
   Types
───────────────────────────────────────── */
interface Property {
  id: number;
  title: string;
  location: string;
  price: number;
  type: string;
  status: string;
  beds: number;
  baths: number;
  sqm: number;
}

/* ─────────────────────────────────────────
   Constants
───────────────────────────────────────── */
const API_BASE = "http://localhost:8080/api";

const PROPERTY_TYPES = ["All", "Studio", "Apartment", "Boarding House"];

const PROPERTY_ICONS: Record<string, string> = {
  Studio: "🏢",
  Apartment: "🏠",
  "Boarding House": "🏘",
};

const CARD_GRADIENTS = [
  "linear-gradient(135deg, #1f5d71 0%, #2d8c8a 100%)",
  "linear-gradient(135deg, #2d6a4f 0%, #52b788 100%)",
  "linear-gradient(135deg, #5c4033 0%, #a07850 100%)",
  "linear-gradient(135deg, #1a3a5c 0%, #2e6db4 100%)",
  "linear-gradient(135deg, #4a2060 0%, #8a4fbf 100%)",
  "linear-gradient(135deg, #7c3030 0%, #c06060 100%)",
];

const HERO_STATS = [
  { value: "240+", label: "Listings" },
  { value: "1.2k", label: "Tenants" },
  { value: "98%",  label: "Satisfaction" },
];

/* ─────────────────────────────────────────
   Helper: get auth token from storage
───────────────────────────────────────── */
function getAuthHeaders(): HeadersInit {
  const token =
    localStorage.getItem("accessToken") || localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

/* ─────────────────────────────────────────
   Helper: build query string from filters
───────────────────────────────────────── */
function buildQueryParams(
  search: string,
  type: string,
  minPrice: string,
  maxPrice: string
): string {
  const params = new URLSearchParams();
  if (search)         params.append("search",   search);
  if (type !== "All") params.append("type",     type);
  if (minPrice)       params.append("minPrice", minPrice);
  if (maxPrice)       params.append("maxPrice", maxPrice);
  return params.toString();
}

/* ─────────────────────────────────────────
   Helper: normalise API response shapes
───────────────────────────────────────── */
function extractProperties(json: any): Property[] {
  return (
    json?.data?.properties ??
    json?.properties ??
    (Array.isArray(json) ? json : [])
  );
}

/* ─────────────────────────────────────────
   Sub-component: Hero stats row
───────────────────────────────────────── */
function HeroStats() {
  return (
    <div className={styles.heroStats}>
      {HERO_STATS.map((stat, i) => (
        <React.Fragment key={stat.label}>
          {i > 0 && <div className={styles.heroStatDivider} />}
          <div className={styles.heroStat}>
            <span className={styles.heroStatNum}>{stat.value}</span>
            <span className={styles.heroStatLbl}>{stat.label}</span>
          </div>
        </React.Fragment>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────
   Sub-component: Skeleton loading cards
───────────────────────────────────────── */
function SkeletonGrid() {
  return (
    <div className={styles.grid}>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className={`${styles.card} ${styles.cardSkeleton}`}>
          <div
            className={`${styles.cardImage} ${styles.skeletonBlock}`}
            style={{ height: 185 }}
          />
          <div className={styles.cardBodySkeleton}>
            <div className={styles.skeletonLine} style={{ width: "70%", height: 18 }} />
            <div className={styles.skeletonLine} style={{ width: "45%", height: 14 }} />
            <div className={styles.skeletonLine} style={{ width: "90%", height: 12 }} />
            <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
              <div className={styles.skeletonLine} style={{ width: 48, height: 12 }} />
              <div className={styles.skeletonLine} style={{ width: 48, height: 12 }} />
              <div className={styles.skeletonLine} style={{ width: 48, height: 12 }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────
   Sub-component: Empty / error state
───────────────────────────────────────── */
interface EmptyStateProps {
  icon: string;
  title: string;
  subtitle: string;
  action?: React.ReactNode;
}

function EmptyState({ icon, title, subtitle, action }: EmptyStateProps) {
  return (
    <div className={styles.empty}>
      <div className={styles.emptyIcon}>{icon}</div>
      <p className={styles.emptyTitle}>{title}</p>
      <p className={styles.emptySub}>{subtitle}</p>
      {action}
    </div>
  );
}

/* ─────────────────────────────────────────
   Sub-component: Single property card
───────────────────────────────────────── */
interface PropertyCardProps {
  property: Property;
  gradientIndex: number;
  onView: () => void;
}

function PropertyCard({ property, gradientIndex, onView }: PropertyCardProps) {
  const isUnavailable = property.status === "UNAVAILABLE";
  const icon          = PROPERTY_ICONS[property.type] || "🏠";
  const gradient      = CARD_GRADIENTS[gradientIndex % CARD_GRADIENTS.length];

  return (
    <div
      className={`${styles.card}${isUnavailable ? ` ${styles.cardUnavailable}` : ""}`}
      style={{ animationDelay: `${gradientIndex * 0.07}s` }}
      onClick={() => !isUnavailable && onView()}
    >
      {/* Card thumbnail */}
      <div className={styles.cardImage} style={{ background: gradient }}>
        <span className={styles.cardImageIcon}>{icon}</span>
        <div className={styles.cardTypeBadge}>{property.type}</div>
        {isUnavailable && (
          <div className={styles.cardUnavailBadge}>Unavailable</div>
        )}
      </div>

      {/* Card body */}
      <div className={styles.cardBody}>
        {/* Title + price */}
        <div className={styles.cardTop}>
          <h3 className={styles.cardTitle}>{property.title}</h3>
          <div className={styles.cardPrice}>
            <span className={styles.cardPriceAmount}>
              ₱{property.price.toLocaleString()}
            </span>
            <span className={styles.cardPricePeriod}>/mo</span>
          </div>
        </div>

        {/* Location */}
        <div className={styles.cardLocation}>
          <span className={styles.cardLocationIcon}>📍</span>
          <span>{property.location}</span>
        </div>

        {/* Beds / baths / sqm */}
        <div className={styles.cardMeta}>
          <span className={styles.cardMetaItem}>🛏 {property.beds  ?? "—"} Bed</span>
          <span className={styles.cardMetaItem}>🚿 {property.baths ?? "—"} Bath</span>
          <span className={styles.cardMetaItem}>📐 {property.sqm   ?? "—"} m²</span>
        </div>

        {/* Rating + CTA */}
        <div className={styles.cardFooter}>
          <div className={styles.cardRating}>
            <span className={styles.cardStar}>★</span>
            <span className={styles.cardRatingNum}>—</span>
            <span className={styles.cardRatingCount}>(0)</span>
          </div>
          <button
            className={styles.cardBtn}
            disabled={isUnavailable}
            onClick={(e) => { e.stopPropagation(); onView(); }}
          >
            {isUnavailable ? "Unavailable" : "View Details"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   Main page component
───────────────────────────────────────── */
const TenantLanding: React.FC = () => {
  const navigate = useNavigate();

  // Filter state
  const [search,       setSearch]       = useState("");
  const [selectedType, setSelectedType] = useState("All");
  const [minPrice,     setMinPrice]     = useState("");
  const [maxPrice,     setMaxPrice]     = useState("");

  // Data state
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);

  // Debounce the search input so we don't fire on every keystroke
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch properties whenever filters change
  const fetchProperties = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query = buildQueryParams(debouncedSearch, selectedType, minPrice, maxPrice);
      const res   = await fetch(`${API_BASE}/properties?${query}`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);

      const json = await res.json();
      setProperties(extractProperties(json));
    } catch (err: any) {
      console.error("Failed to fetch properties:", err);
      setError("Could not load properties. Please try again.");
      setProperties([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, selectedType, minPrice, maxPrice]);

  useEffect(() => { fetchProperties(); }, [fetchProperties]);

  const clearFilters = () => {
    setSearch("");
    setSelectedType("All");
    setMinPrice("");
    setMaxPrice("");
  };

  const hasActiveFilters = search || selectedType !== "All" || minPrice || maxPrice;

  /* ── Render ── */
  return (
    <div className={styles.page}>
      <Navbar />

      {/* ══ HERO ══ */}
      <section className={styles.hero}>
        {/* Decorative background layers */}
        <div className={styles.heroBg}>
          <div className={`${styles.heroOrb} ${styles.heroOrb1}`} />
          <div className={`${styles.heroOrb} ${styles.heroOrb2}`} />
          <div className={`${styles.heroOrb} ${styles.heroOrb3}`} />
          <div className={styles.heroGrid} />
        </div>

        <div className={styles.heroContent}>
          <div className={styles.heroEyebrow}>
            <div className={styles.heroEyebrowDot} />
            <span>Cebu City Rentals</span>
          </div>

          <h1 className={styles.heroHeading}>
            Find Your Home<br />
            <span className={styles.heroHeadingAccent}>in Cebu</span>
          </h1>

          <p className={styles.heroSubtext}>
            Browse verified boarding houses, apartments, and studios across
            Cebu City — all in one place.
          </p>

          {/* Search bar */}
          <div className={styles.heroSearch}>
            <span className={styles.searchIcon}>🔍</span>
            <input
              className={styles.searchInput}
              type="text"
              placeholder="Search by location or property name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button className={styles.searchBtn} onClick={fetchProperties}>
              Search
            </button>
          </div>

          <HeroStats />
        </div>
      </section>

      {/* ══ LISTINGS ══ */}
      <section className={styles.listings} id="listings">
        <div className={styles.listingsInner}>

          {/* Filter bar */}
          <div className={styles.filterBar}>
            {/* Type chips */}
            <div className={styles.filterTypes}>
              {PROPERTY_TYPES.map((type) => (
                <button
                  key={type}
                  className={`${styles.filterChip}${selectedType === type ? ` ${styles.filterChipActive}` : ""}`}
                  onClick={() => setSelectedType(type)}
                >
                  {type !== "All" && <span>{PROPERTY_ICONS[type]}</span>}
                  {type}
                </button>
              ))}
            </div>

            {/* Price range */}
            <div className={styles.filterPrice}>
              <span className={styles.filterPriceLabel}>₱ Price Range</span>
              <input
                className={styles.priceInput}
                type="number"
                placeholder="Min"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
              />
              <span className={styles.priceSep}>—</span>
              <input
                className={styles.priceInput}
                type="number"
                placeholder="Max"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
              />
            </div>
          </div>

          {/* Results count + clear button */}
          <div className={styles.resultsMeta}>
            <span className={styles.resultsCount}>
              {loading
                ? "Loading…"
                : `${properties.length} ${properties.length === 1 ? "property" : "properties"} found`}
            </span>
            {hasActiveFilters && !loading && (
              <button className={styles.clearBtn} onClick={clearFilters}>
                ✕ Clear filters
              </button>
            )}
          </div>

          {/* Content area: skeleton / error / empty / grid */}
          {loading ? (
            <SkeletonGrid />
          ) : error ? (
            <EmptyState
              icon="⚠️"
              title="Something went wrong"
              subtitle={error}
              action={
                <button
                  className={styles.searchBtn}
                  style={{ marginTop: 20 }}
                  onClick={fetchProperties}
                >
                  Try Again
                </button>
              }
            />
          ) : properties.length === 0 ? (
            <EmptyState
              icon="🏚"
              title="No properties found"
              subtitle="Try adjusting your search or filters."
            />
          ) : (
            <div className={styles.grid}>
              {properties.map((property, idx) => (
                <PropertyCard
                  key={property.id}
                  property={property}
                  gradientIndex={idx}
                  onView={() => navigate(`/properties/${property.id}`)}
                />
              ))}
            </div>
          )}

        </div>
      </section>

      <Footer />
    </div>
  );
};

export default TenantLanding;