import React, { useRef, useState, useEffect } from "react";
import { Home, MapPin, User, Bed, Bath, Maximize, Edit } from "lucide-react";
import styles from "./admin_properties.module.css";

// ─── Types (mirror what AdminProperties uses) ─────────────────────────────
interface ActiveTenant {
  tenantId: number;
  tenantName: string;
  tenantEmail: string;
  startDate: string;
  leaseDurationMonths: number;
}

export interface PropertyEntry {
  id: number;
  title: string;
  location: string;
  price: number;
  type: string;
  status: string;
  ownerName: string;
  createdAt: string;
  hasActiveTenant: boolean;
  activeTenant?: ActiveTenant;
  images: { id: number; imageUrl: string }[];
  adminDisabled?: boolean;
  isAdminDisabled?: boolean;
  adminNote?: string;
  beds?: number;
  baths?: number;
  sqm?: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────
function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}

function getStatusBadgeClass(
  status: string,
  hasActiveTenant: boolean,
  s: typeof styles
): string {
  if (hasActiveTenant) return s.badgeOccupied;
  switch (status?.toUpperCase()) {
    case "AVAILABLE":     return s.badgeAvailable;
    case "UNAVAILABLE":   return s.badgeUnavailable;
    case "PENDING_REVIEW":return s.badgePending;
    case "REJECTED":      return s.badgeRejected;
    default:              return s.badgePending;
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

// ─── Image with blur-up loading ───────────────────────────────────────────
const LazyImage: React.FC<{ src: string; alt: string }> = ({ src, alt }) => {
  const [loaded, setLoaded] = useState(false);

  return (
    <>
      {/* Shimmer shown until image fires onLoad */}
      {!loaded && <div className={styles.imgShimmer} aria-hidden="true" />}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        className={`${styles.cardImage} ${loaded ? styles.cardImageLoaded : styles.cardImagePending}`}
        onLoad={() => setLoaded(true)}
      />
    </>
  );
};

// ─── PropertyCard ─────────────────────────────────────────────────────────
interface Props {
  property: PropertyEntry;
  index: number;
  onClick: (p: PropertyEntry) => void;
}

const PropertyCard: React.FC<Props> = ({ property: p, index, onClick }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  // Reveal card when it scrolls into view, with a small per-card stagger
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // Stagger: each card waits 40ms × its position (max 400ms)
          const delay = Math.min(index * 40, 400);
          const timer = setTimeout(() => setVisible(true), delay);
          observer.disconnect();
          return () => clearTimeout(timer);
        }
      },
      { threshold: 0.08 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [index]);

  const img = p.images?.[0]?.imageUrl;

  return (
    <div
      ref={ref}
      className={`${styles.card} ${visible ? styles.cardVisible : styles.cardHidden}`}
      onClick={() => onClick(p)}
    >
      {/* ── Image area ── */}
      <div className={styles.cardImageWrap}>
        {img ? (
          <LazyImage src={img} alt={p.title} />
        ) : (
          <div className={styles.cardImagePlaceholder}>
            <span className={styles.cardImagePlaceholderIcon}>
              <Home size={32} />
            </span>
            <span className={styles.cardImagePlaceholderText}>No photo</span>
          </div>
        )}

        <span
          className={`${styles.cardStatusBadge} ${getStatusBadgeClass(
            p.status,
            p.hasActiveTenant,
            styles
          )}`}
        >
          {getStatusLabel(p.status, p.hasActiveTenant)}
        </span>

        {p.type && <span className={styles.cardTypeBadge}>{p.type}</span>}
      </div>

      {/* ── Card body ── */}
      <div className={styles.cardBody}>
        <h3 className={styles.cardTitle}>{p.title}</h3>

        <div className={styles.cardLocation}>
          <MapPin size={12} className={styles.inlineIcon} /> {p.location}
        </div>
        <div className={styles.cardOwner}>
          <User size={12} className={styles.inlineIcon} /> {p.ownerName}
        </div>

        {(p.beds != null || p.baths != null || p.sqm != null) && (
          <div className={styles.cardMeta}>
            {p.beds != null && (
              <span className={styles.cardMetaItem}>
                <Bed size={13} /> {p.beds}
              </span>
            )}
            {p.baths != null && (
              <span className={styles.cardMetaItem}>
                <Bath size={13} /> {p.baths}
              </span>
            )}
            {p.sqm != null && (
              <span className={styles.cardMetaItem}>
                <Maximize size={13} /> {p.sqm} sqm
              </span>
            )}
          </div>
        )}

        <div className={styles.cardFooter}>
          <div>
            <div className={styles.cardPrice}>{formatPrice(p.price)}</div>
            <div className={styles.cardPriceLabel}>/ month</div>
          </div>
          <div className={styles.cardActions}>
            <button className={styles.cardEditBtn} type="button">
              <Edit size={13} /> Manage
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyCard;