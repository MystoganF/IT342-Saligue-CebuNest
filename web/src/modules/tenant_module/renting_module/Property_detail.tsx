import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "../../../components/Navbar/Navbar";
import styles from "./Property_detail.module.css";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

// ─── types ─────────────────────────────────────────────────────────────────

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  avatarUrl?: string | null;
}

interface PropertyImage {
  imageUrl: string;
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
  ownerId: number;
  ownerName: string;
  images: PropertyImage[];
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

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function getStatusBadgeClass(status: string, s: typeof styles): string {
  switch (status?.toUpperCase()) {
    case "AVAILABLE":   return s.badgeAvailable;
    case "UNAVAILABLE": return s.badgeUnavailable;
    default:            return s.badgePending;
  }
}

// Build OpenStreetMap embed URL from a location string
function buildMapUrl(location: string): string {
  const encoded = encodeURIComponent(location);
  return `https://www.openstreetmap.org/export/embed.html?bbox=&layer=mapnik&marker=&query=${encoded}`;
}

// Build OSM search URL (used as iframe src via Nominatim redirect)
function buildOsmIframeSrc(location: string): string {
  const q = encodeURIComponent(location);
  return (
    `https://www.openstreetmap.org/export/embed.html` +
    `?layer=mapnik` +
    `&marker=&bbox=` +
    `#map=15/${q}`
  );
}

// Use Nominatim to geocode then build a static embed
async function geocodeLocation(
  location: string
): Promise<{ lat: number; lon: number } | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
        location
      )}&format=json&limit=1`,
      { headers: { "Accept-Language": "en" } }
    );
    const data = await res.json();
    if (data.length === 0) return null;
    return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
  } catch {
    return null;
  }
}

// ─── component ─────────────────────────────────────────────────────────────

const PropertyDetail: React.FC = () => {
  const { id }   = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Auth
  const [user, setUser] = useState<User | null>(null);

  // Property data
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  // Gallery
  const [activeImg, setActiveImg] = useState(0);

  // Map
  const [mapCoords, setMapCoords]   = useState<{ lat: number; lon: number } | null>(null);
  const [mapLoading, setMapLoading] = useState(true);

  // Booking form
  const [startDate, setStartDate]                   = useState("");
  const [leaseDurationMonths, setLeaseDurationMonths] = useState<number>(1);
  const [submitting, setSubmitting]                 = useState(false);
  const [bookingMsg, setBookingMsg]                 = useState<{ type: "success" | "error"; text: string } | null>(null);

  // ── Auth guard ─────────────────────────────────────────────────────────
  useEffect(() => {
    const stored = localStorage.getItem("user");
    const token  = localStorage.getItem("accessToken");
    if (!stored || !token) { navigate("/"); return; }
    try { setUser(JSON.parse(stored)); } catch { navigate("/"); }
  }, [navigate]);

  // ── Fetch property ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    const token = localStorage.getItem("accessToken");

    fetch(`${API_BASE}/api/properties/${id}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.json())
      .then((data) => {
        if (!data.success) {
          setError(data?.error?.message ?? "Property not found.");
          return;
        }
        setProperty(data.data.property);
      })
      .catch(() => setError("Unable to load property. Please try again."))
      .finally(() => setLoading(false));
  }, [id]);

  // ── Geocode location for map ────────────────────────────────────────────
  useEffect(() => {
    if (!property?.location) return;
    setMapLoading(true);
    geocodeLocation(property.location).then((coords) => {
      setMapCoords(coords);
      setMapLoading(false);
    });
  }, [property?.location]);

  // ── Submit rental request ───────────────────────────────────────────────
  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!property || !user) return;

    setSubmitting(true);
    setBookingMsg(null);

    try {
      const token = localStorage.getItem("accessToken");
      const res   = await fetch(`${API_BASE}/api/rental-requests`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          propertyId:           property.id,
          startDate:            startDate,         // "YYYY-MM-DD"
          leaseDurationMonths:  leaseDurationMonths,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setBookingMsg({
          type: "error",
          text: data?.error?.message ?? "Request failed. Please try again.",
        });
        return;
      }

      setBookingMsg({
        type: "success",
        text: "Rental request submitted! The owner will review it shortly.",
      });
    } catch {
      setBookingMsg({ type: "error", text: "Network error. Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  // ── Derived values ──────────────────────────────────────────────────────
  const isAvailable     = property?.status?.toUpperCase() === "AVAILABLE";
  const totalCost       = property ? property.price * leaseDurationMonths : 0;
  const today           = new Date().toISOString().split("T")[0]; // min date for input
  const images          = property?.images ?? [];
  const hasImages       = images.length > 0;

  // ── Loading skeleton ────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className={styles.page}>
        {user && <Navbar user={user} />}
        <div className={styles.skeleton}>
          <div className={styles.skeletonLeft}>
            <div className={styles.skeletonImg} />
            <div className={`${styles.skeletonBlock} ${styles.skeletonCard}`} />
            <div className={`${styles.skeletonBlock} ${styles.skeletonMap}`} />
          </div>
          <div className={styles.skeletonRight}>
            <div className={`${styles.skeletonBlock}`} style={{ height: "460px", borderRadius: "20px" }} />
          </div>
        </div>
      </div>
    );
  }

  // ── Error / not found ───────────────────────────────────────────────────
  if (error || !property) {
    return (
      <div className={styles.page}>
        {user && <Navbar user={user} />}
        <div className={styles.errorBox}>
          <span className={styles.errorIcon}>🏚️</span>
          <h2 className={styles.errorTitle}>Property Not Found</h2>
          <p className={styles.errorBody}>{error ?? "This property doesn't exist or has been removed."}</p>
          <button className={styles.errorBtn} onClick={() => navigate("/home")}>
            ← Back to Listings
          </button>
        </div>
      </div>
    );
  }

  // ── Main render ─────────────────────────────────────────────────────────
  return (
    <div className={styles.page}>
      {user && <Navbar user={user} />}

      {/* Back button */}
      <div className={styles.backBar}>
        <button className={styles.backBtn} onClick={() => navigate(-1)}>
          ← Back to listings
        </button>
      </div>

      <div className={styles.main}>

        {/* ══ LEFT COLUMN ══════════════════════════════════════════════════ */}
        <div className={styles.leftCol}>

          {/* ── Image Gallery ── */}
          <div className={styles.gallery}>
            <div className={styles.galleryMain}>
              {hasImages ? (
                <img
                  src={images[activeImg].imageUrl}
                  alt={`${property.title} — image ${activeImg + 1}`}
                  className={styles.galleryMainImg}
                />
              ) : (
                <div className={styles.galleryPlaceholder}>
                  <span className={styles.galleryPlaceholderIcon}>🏠</span>
                  <span className={styles.galleryPlaceholderText}>No photos available</span>
                </div>
              )}

              {/* Prev / Next arrows */}
              {images.length > 1 && (
                <>
                  <button
                    className={`${styles.galleryNav} ${styles.galleryNavPrev}`}
                    onClick={() => setActiveImg((i) => (i === 0 ? images.length - 1 : i - 1))}
                    aria-label="Previous image"
                  >
                    ‹
                  </button>
                  <button
                    className={`${styles.galleryNav} ${styles.galleryNavNext}`}
                    onClick={() => setActiveImg((i) => (i === images.length - 1 ? 0 : i + 1))}
                    aria-label="Next image"
                  >
                    ›
                  </button>
                  <span className={styles.galleryCounter}>
                    {activeImg + 1} / {images.length}
                  </span>
                </>
              )}
            </div>

            {/* Thumbnails */}
            {images.length > 1 && (
              <div className={styles.galleryThumbs}>
                {images.map((img, i) => (
                  <div
                    key={i}
                    className={`${styles.galleryThumb} ${i === activeImg ? styles.galleryThumbActive : ""}`}
                    onClick={() => setActiveImg(i)}
                  >
                    <img src={img.imageUrl} alt={`Thumbnail ${i + 1}`} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Property Info ── */}
          <div className={styles.infoCard}>
            <div className={styles.infoHeader}>
              <div className={styles.infoTitleGroup}>
                <h1 className={styles.infoTitle}>{property.title}</h1>
                <div className={styles.infoLocation}>
                  <span className={styles.infoLocationIcon}>📍</span>
                  {property.location}
                </div>
              </div>
              <div className={styles.infoBadges}>
                <span className={`${styles.badge} ${getStatusBadgeClass(property.status, styles)}`}>
                  {property.status?.charAt(0) + property.status?.slice(1).toLowerCase()}
                </span>
                {property.type && (
                  <span className={`${styles.badge} ${styles.badgeType}`}>
                    {property.type}
                  </span>
                )}
              </div>
            </div>

            {/* Beds / Baths / Sqm */}
            {(property.beds || property.baths || property.sqm) && (
              <div className={styles.infoStats}>
                {property.beds != null && (
                  <div className={styles.infoStat}>
                    <span className={styles.infoStatIcon}>🛏️</span>
                    <span className={styles.infoStatValue}>{property.beds}</span>
                    <span className={styles.infoStatLabel}>Beds</span>
                  </div>
                )}
                {property.baths != null && (
                  <div className={styles.infoStat}>
                    <span className={styles.infoStatIcon}>🚿</span>
                    <span className={styles.infoStatValue}>{property.baths}</span>
                    <span className={styles.infoStatLabel}>Baths</span>
                  </div>
                )}
                {property.sqm != null && (
                  <div className={styles.infoStat}>
                    <span className={styles.infoStatIcon}>📐</span>
                    <span className={styles.infoStatValue}>{property.sqm}</span>
                    <span className={styles.infoStatLabel}>sqm</span>
                  </div>
                )}
              </div>
            )}

            <div className={styles.infoDivider} />

            {/* Description */}
            <div className={styles.infoDescLabel}>About this property</div>
            <p className={styles.infoDesc}>{property.description}</p>

            {/* Owner */}
            <div className={styles.ownerRow}>
              <div className={styles.ownerAvatar}>
                {getInitials(property.ownerName)}
              </div>
              <div className={styles.ownerInfo}>
                <span className={styles.ownerLabel}>Listed by</span>
                <span className={styles.ownerName}>{property.ownerName}</span>
              </div>
            </div>
          </div>

          {/* ── Map ── */}
          <div className={styles.mapCard}>
            <div className={styles.mapHeader}>
              <span className={styles.mapHeaderIcon}>🗺️</span>
              <span className={styles.mapHeaderTitle}>Location</span>
              <span className={styles.mapHeaderAddress}>{property.location}</span>
            </div>

            {mapLoading ? (
              <div className={styles.mapLoading}>
                <span>📍</span> Finding location…
              </div>
            ) : mapCoords ? (
              <iframe
                className={styles.mapFrame}
                src={
                  `https://www.openstreetmap.org/export/embed.html` +
                  `?bbox=${mapCoords.lon - 0.01},${mapCoords.lat - 0.01},${mapCoords.lon + 0.01},${mapCoords.lat + 0.01}` +
                  `&layer=mapnik` +
                  `&marker=${mapCoords.lat},${mapCoords.lon}`
                }
                title="Property location map"
                loading="lazy"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className={styles.mapLoading}>
                📍 Map unavailable for this location
              </div>
            )}
          </div>

        </div>

        {/* ══ RIGHT COLUMN — BOOKING CARD ══════════════════════════════════ */}
        <div className={styles.rightCol}>
          <div className={styles.bookingCard}>

            {/* Price */}
            <div className={styles.bookingPrice}>
              <span className={styles.bookingPriceAmount}>{formatPrice(property.price)}</span>
              <span className={styles.bookingPriceLabel}>/ month</span>
            </div>

            {isAvailable ? (
              <form className={styles.bookingForm} onSubmit={handleBooking}>

                <div className={styles.bookingField}>
                  <label className={styles.bookingLabel}>Move-in Date</label>
                  <input
                    type="date"
                    className={styles.bookingInput}
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    min={today}
                    required
                  />
                </div>

                <div className={styles.bookingField}>
                  <label className={styles.bookingLabel}>Lease Duration</label>
                  <input
                    type="number"
                    className={styles.bookingInput}
                    value={leaseDurationMonths}
                    onChange={(e) => setLeaseDurationMonths(Math.max(1, parseInt(e.target.value) || 1))}
                    min={1}
                    max={24}
                    placeholder="Months"
                    required
                  />
                </div>

                {/* Cost summary */}
                {startDate && (
                  <div className={styles.bookingSummary}>
                    <div className={styles.bookingSummaryRow}>
                      <span className={styles.bookingSummaryLabel}>Monthly rent</span>
                      <span className={styles.bookingSummaryValue}>{formatPrice(property.price)}</span>
                    </div>
                    <div className={styles.bookingSummaryRow}>
                      <span className={styles.bookingSummaryLabel}>Duration</span>
                      <span className={styles.bookingSummaryValue}>{leaseDurationMonths} month{leaseDurationMonths > 1 ? "s" : ""}</span>
                    </div>
                    <div className={`${styles.bookingSummaryRow} ${styles.bookingSummaryTotal}`}>
                      <span className={styles.bookingSummaryTotalLabel}>Total</span>
                      <span className={styles.bookingSummaryTotalValue}>{formatPrice(totalCost)}</span>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  className={styles.bookingBtn}
                  disabled={submitting || bookingMsg?.type === "success"}
                >
                  {submitting
                    ? <span className={styles.bookingSpinner} />
                    : bookingMsg?.type === "success"
                    ? "✓ Request Sent"
                    : "Request to Rent"}
                </button>

                {bookingMsg && (
                  <div className={`${styles.bookingMessage} ${
                    bookingMsg.type === "success"
                      ? styles.bookingMessageSuccess
                      : styles.bookingMessageError
                  }`}>
                    <span>{bookingMsg.type === "success" ? "✓" : "⚠"}</span>
                    {bookingMsg.text}
                  </div>
                )}

                <p className={styles.bookingNote}>
                  No payment yet — the owner will review your request first.
                </p>
              </form>
            ) : (
              <>
                <button className={`${styles.bookingBtn} ${styles.bookingBtnUnavailable}`} disabled>
                  Not Available
                </button>
                <p className={styles.bookingNote} style={{ marginTop: "12px" }}>
                  This property is currently unavailable for new rental requests.
                </p>
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default PropertyDetail;