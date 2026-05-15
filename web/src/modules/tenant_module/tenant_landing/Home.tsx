import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { landingApi } from "./landing.api";
import styles from "./Home.module.css";
import { VirtuosoGrid } from "react-virtuoso";
import { 
  Home as HomeIcon, 
  MapPin, 
  AlertTriangle, 
  Building, 
  Search, 
  ArrowRight 
} from "lucide-react";

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
  // Notice we added thumbnailUrl here
  images: { imageUrl: string; thumbnailUrl?: string }[];
  ownerId: number;
}

interface PropertyType {
  id: number;
  name: string;
}

// ─── helpers ───────────────────────────────────────────────────────────────

function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}

function getStatusBadgeClass(status: string, s: typeof styles) {
  switch (status?.toUpperCase()) {
    case "AVAILABLE":      return s.cardBadgeAvailable;
    case "UNAVAILABLE":    return s.cardBadgeUnavailable;
    default:               return s.cardBadgePending;
  }
}

// ─── sub-components ────────────────────────────────────────────────────────

const SkeletonCard: React.FC = () => (
  <div className={styles.skeleton}>
    <div className={styles.skeletonImage} />
    <div className={styles.skeletonBody}>
      <div className={`${styles.skeletonLine} ${styles.skeletonLineMid}`} />
      <div className={`${styles.skeletonLine} ${styles.skeletonLineShort}`} />
      <div className={`${styles.skeletonLine} ${styles.skeletonLineFull}`} />
      <div className={`${styles.skeletonLine} ${styles.skeletonLineFull}`} />
    </div>
  </div>
);

// ─── LazyImage Component (Prioritization + Blur-up) ────────────────────────
const LazyImage: React.FC<{ src: string; alt: string; isPriority?: boolean }> = ({ src, alt, isPriority }) => {
  const [loaded, setLoaded] = useState(false);
  return (
    <>
      {!loaded && <div className={styles.imgShimmer} aria-hidden="true" />}
      <img
        src={src}
        alt={alt}
        loading={isPriority ? "eager" : "lazy"}
        // @ts-expect-error - fetchpriority is a modern HTML attribute
        fetchpriority={isPriority ? "high" : "auto"}
        decoding="async"
        className={`${styles.cardImage} ${loaded ? styles.cardImageLoaded : styles.cardImagePending}`}
        onLoad={() => setLoaded(true)}
      />
    </>
  );
};

interface PropertyCardProps {
  property: Property;
  index: number;
  isPriority?: boolean;
  onClick: (id: number) => void;
}

const PropertyCard: React.FC<PropertyCardProps> = ({ property, index, isPriority, onClick }) => {
  // Use thumbnailUrl if available, fallback to full imageUrl
  const imgToLoad = property.images?.[0]?.thumbnailUrl || property.images?.[0]?.imageUrl;
  const statusLabel = property.status?.charAt(0) + property.status?.slice(1).toLowerCase();

  return (
    <div
      className={styles.card}
      // Natively stagger the entrance animation
      style={{ animationDelay: `${Math.min(index * 40, 400)}ms` }}
      onClick={() => onClick(property.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick(property.id)}
      aria-label={`View ${property.title}`}
    >
      {/* Image */}
      <div className={styles.cardImageWrap}>
        {imgToLoad ? (
          <LazyImage src={imgToLoad} alt={property.title} isPriority={isPriority} />
        ) : (
          <div className={styles.cardImagePlaceholder}>
            <HomeIcon size={36} className={styles.cardImagePlaceholderIcon} strokeWidth={1.5} />
            <span className={styles.cardImagePlaceholderText}>No photo yet</span>
          </div>
        )}

        <span className={`${styles.cardBadge} ${getStatusBadgeClass(property.status, styles)}`}>
          {statusLabel}
        </span>

        {property.type && (
          <span className={styles.cardTypeBadge}>
            {property.type}
          </span>
        )}
      </div>

      {/* Body */}
      <div className={styles.cardBody}>
        <h3 className={styles.cardTitle}>{property.title}</h3>
        <div className={styles.cardLocation}>
          <MapPin size={14} className={styles.cardLocationIcon} />
          {property.location}
        </div>
        <p className={styles.cardDesc}>{property.description}</p>

        {/* Footer */}
        <div className={styles.cardFooter}>
          <div className={styles.cardPrice}>
            <span className={styles.cardPriceAmount}>{formatPrice(property.price)}</span>
            <span className={styles.cardPriceLabel}>per month</span>
          </div>
          <button className={styles.cardViewBtn} type="button" tabIndex={-1}>
            View <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── main component ────────────────────────────────────────────────────────

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useOutletContext<{ user: User }>();

  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [propertyTypes, setPropertyTypes] = useState<PropertyType[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeType, setActiveType] = useState<string>("ALL");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  useEffect(() => {
    landingApi.getPropertyTypes()
      .then((data) => {
        if (data.success) setPropertyTypes(data.data.types ?? []);
      })
      .catch(() => {}); 
  }, []);

  const fetchProperties = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params: Record<string, string> = {};
      if (searchQuery)          params.search   = searchQuery;
      if (activeType !== "ALL") params.type     = activeType;
      if (minPrice)             params.minPrice = minPrice;
      if (maxPrice)             params.maxPrice = maxPrice;

      const data = await landingApi.getProperties(params);

      if (!data.success) {
        setError(data?.error?.message ?? "Failed to load listings.");
        return;
      }
      setProperties(data.data.properties ?? []);
    } catch {
      setError("Unable to reach the server. Please check your connection.");
    } finally {
      setLoading(false);
    }
  }, [searchQuery, activeType, minPrice, maxPrice]);

  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(searchInput.trim());
  };

  const handleCardClick = (id: number) => {
    navigate(`/properties/${id}`);
  };

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" :
    hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className={styles.page}>
      {/* ── Hero ── */}
      <section className={styles.hero}>
        <div className={styles.heroDeco + " " + styles.heroDeco1} />
        <div className={styles.heroDeco + " " + styles.heroDeco2} />
        <div className={styles.heroDeco + " " + styles.heroDeco3} />
        <div className={styles.heroAccent} />

        <div className={styles.heroContent}>
          <div className={styles.heroEyebrow}>
            <div className={styles.heroEyebrowLine} />
            <span className={styles.heroEyebrowText}>
              {greeting}, {user.name.split(" ")[0]}
            </span>
            <div className={styles.heroEyebrowLine} />
          </div>

          <h1 className={styles.heroHeading}>
            Find Your Perfect
            <span className={styles.heroHeadingAccent}>Home in Cebu</span>
          </h1>

          <p className={styles.heroSubtitle}>
            Browse verified boarding houses, apartments, and condos across Cebu City. Submit a rental request in minutes.
          </p>

          <div className={styles.heroStats}>
            {[
              { num: "240+",  label: "Active Listings" },
              { num: "1.2k",  label: "Happy Tenants"   },
              { num: "98%",   label: "Satisfaction"    },
            ].map(({ num, label }) => (
              <div key={label} className={styles.heroStat}>
                <span className={styles.heroStatNum}>{num}</span>
                <span className={styles.heroStatLabel}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Main Listings ── */}
      <main className={styles.main}>
        {/* Section header */}
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitleGroup}>
            <div className={styles.sectionEyebrow}>
              <div className={styles.sectionEyebrowDot} />
              <span className={styles.sectionEyebrowText}>
                {searchQuery ? `Results for "${searchQuery}"` : "Available Properties"}
              </span>
            </div>
            <h2 className={styles.sectionTitle}>
              {loading ? "Loading listings…" : `${properties.length} propert${properties.length === 1 ? "y" : "ies"} found`}
            </h2>
          </div>
        </div>

        {/* ── Search & Filter Section ── */}
        <div className={styles.filterSection}>
          <form className={styles.mainSearch} onSubmit={handleSearchSubmit}>
            <Search size={18} className={styles.mainSearchIcon} />
            <input
              className={styles.mainSearchInput}
              type="text"
              placeholder="Search by location, name, or type…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            <button type="submit" className={styles.mainSearchBtn}>Search</button>
          </form>

          <div className={styles.filterBar}>
            <span className={styles.filterLabel}>Filter</span>
            <div className={styles.filterChips}>
              <button
                className={`${styles.filterChip} ${activeType === "ALL" ? styles.filterChipActive : ""}`}
                onClick={() => setActiveType("ALL")}
              >
                All Types
              </button>
              {propertyTypes.map((pt) => (
                <button
                  key={pt.id}
                  className={`${styles.filterChip} ${activeType === pt.name ? styles.filterChipActive : ""}`}
                  onClick={() => setActiveType(pt.name)}
                >
                  {pt.name}
                </button>
              ))}
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
          </div>
        </div>

        {/* ── Property Grid (Virtualizer) ── */}
        {loading ? (
          <div className={styles.propertyGrid}>
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : error ? (
          <div className={styles.stateBox}>
            <AlertTriangle size={48} className={styles.stateIcon} strokeWidth={1.5} />
            <h3 className={styles.stateTitle}>Something went wrong</h3>
            <p className={styles.stateBody}>{error}</p>
            <button className={styles.stateBtn} onClick={fetchProperties}>Try Again</button>
          </div>
        ) : properties.length === 0 ? (
          <div className={styles.stateBox}>
            <Building size={48} className={styles.stateIcon} strokeWidth={1.5} />
            <h3 className={styles.stateTitle}>No properties found</h3>
            <p className={styles.stateBody}>Try adjusting your search or filters to find available listings.</p>
            <button
              className={styles.stateBtn}
              onClick={() => {
                setSearchInput("");
                setSearchQuery("");
                setActiveType("ALL");
                setMinPrice("");
                setMaxPrice("");
              }}
            >
              Clear Filters
            </button>
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
            itemContent={(index, property) => (
              <PropertyCard
                property={property}
                index={index}
                isPriority={index < 6}
                onClick={handleCardClick}
              />
            )}
          />
        )}
      </main>
    </div>
  );
};

export default Home;