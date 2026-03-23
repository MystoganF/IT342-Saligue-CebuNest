import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import styles from "./Property_Detail.module.css";
import Navbar from "../../../components/Navbar/Navbar";
import Footer from "../../../components/Navbar/Footer";

/* ─────────────────────────────────────────
   Types
───────────────────────────────────────── */
interface Property {
  id: number;
  title: string;
  description: string;
  location: string;
  price: number;
  type: string;
  status: string;
  beds: number;
  baths: number;
  sqm: number;
  ownerName: string;
  createdAt: string;
}

/* ─────────────────────────────────────────
   Constants
───────────────────────────────────────── */
const API_BASE = "http://localhost:8080/api";

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

const LEASE_DURATION_OPTIONS = [1, 2, 3, 4, 5, 6, 9, 12, 18, 24];

/* ─────────────────────────────────────────
   Helper: read auth token from storage
───────────────────────────────────────── */
function getToken(): string | null {
  return localStorage.getItem("accessToken") || localStorage.getItem("token");
}

/* ─────────────────────────────────────────
   Helper: today's date as YYYY-MM-DD
───────────────────────────────────────── */
function getTodayString(): string {
  return new Date().toISOString().split("T")[0];
}

/* ─────────────────────────────────────────
   Sub-component: Loading skeleton
───────────────────────────────────────── */
function LoadingSkeleton() {
  return (
    <div className={styles.loadingWrapper}>
      <div className={styles.loadingInner}>
        <div className={styles.skeletonHero} />
        <div className={styles.skeletonBody}>
          <div className={styles.skeletonLine} style={{ width: "60%", height: 32 }} />
          <div className={styles.skeletonLine} style={{ width: "40%", height: 20 }} />
          <div className={styles.skeletonLine} style={{ width: "80%", height: 16 }} />
          <div className={styles.skeletonLine} style={{ width: "70%", height: 16 }} />
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   Sub-component: Error state
───────────────────────────────────────── */
interface ErrorStateProps {
  message: string | null;
  onBack: () => void;
}

function ErrorState({ message, onBack }: ErrorStateProps) {
  return (
    <div className={styles.errorState}>
      <div className={styles.errorIcon}>⚠️</div>
      <h2 className={styles.errorTitle}>Property not found</h2>
      <p className={styles.errorSubtitle}>{message || "This property may have been removed."}</p>
      <button className={styles.ctaBtn} onClick={onBack}>Back to Listings</button>
    </div>
  );
}

/* ─────────────────────────────────────────
   Sub-component: Property hero image banner
───────────────────────────────────────── */
interface HeroImageProps {
  propertyId: number;
  type: string;
  isUnavailable: boolean;
}

function HeroImage({ propertyId, type, isUnavailable }: HeroImageProps) {
  const gradient = CARD_GRADIENTS[propertyId % CARD_GRADIENTS.length];
  const icon     = PROPERTY_ICONS[type] || "🏠";

  return (
    <div className={styles.heroImage} style={{ background: gradient }}>
      <span className={styles.heroIcon}>{icon}</span>
      <div className={styles.heroTypeBadge}>{type}</div>
      {isUnavailable && (
        <div className={styles.heroUnavailBadge}>Unavailable</div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────
   Sub-component: Beds / baths / sqm row
───────────────────────────────────────── */
interface PropertyStatsProps {
  beds: number;
  baths: number;
  sqm: number;
}

function PropertyStats({ beds, baths, sqm }: PropertyStatsProps) {
  const stats = [
    { icon: "🛏", value: beds,  label: `Bedroom${beds !== 1 ? "s" : ""}` },
    { icon: "🚿", value: baths, label: `Bathroom${baths !== 1 ? "s" : ""}` },
    { icon: "📐", value: sqm,   label: "m²" },
  ];

  return (
    <div className={styles.statsRow}>
      {stats.map((stat, i) => (
        <React.Fragment key={stat.label}>
          {i > 0 && <div className={styles.statDivider} />}
          <div className={styles.stat}>
            <span className={styles.statIcon}>{stat.icon}</span>
            <span className={styles.statValue}>{stat.value ?? "—"}</span>
            <span className={styles.statLabel}>{stat.label}</span>
          </div>
        </React.Fragment>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────
   Sub-component: Success confirmation
───────────────────────────────────────── */
interface SuccessViewProps {
  propertyTitle: string;
  onBack: () => void;
}

function SuccessView({ propertyTitle, onBack }: SuccessViewProps) {
  return (
    <div className={styles.success}>
      <div className={styles.successIcon}>🎉</div>
      <h3 className={styles.successTitle}>Request Submitted!</h3>
      <p className={styles.successSubtitle}>
        Your rental request for <strong>{propertyTitle}</strong> has been sent
        to the owner. You'll be notified once they respond.
      </p>
      <div className={styles.successStatus}>
        <span className={styles.statusDot} />
        Status: <strong>PENDING</strong>
      </div>
      <button className={`${styles.ctaBtn} ${styles.ctaBtnOutline}`} onClick={onBack}>
        Back to Listings
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────
   Sub-component: Rental request form
───────────────────────────────────────── */
interface RentalFormProps {
  property: Property;
  onSuccess: () => void;
  onNavigateLogin: () => void;
}

function RentalForm({ property, onSuccess, onNavigateLogin }: RentalFormProps) {
  const token = getToken();

  const [startDate,     setStartDate]     = useState("");
  const [leaseDuration, setLeaseDuration] = useState("1");
  const [submitting,    setSubmitting]    = useState(false);
  const [submitError,   setSubmitError]   = useState<string | null>(null);

  const isUnavailable = property.status === "UNAVAILABLE";
  const estimatedTotal = property.price * Number(leaseDuration);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !leaseDuration) {
      setSubmitError("Please fill in all fields.");
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch(`${API_BASE}/rental-requests`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          propertyId:          property.id,
          startDate,
          leaseDurationMonths: Number(leaseDuration),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message || "Failed to submit request.");
      onSuccess();
    } catch (err: any) {
      setSubmitError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* Price summary */}
      <div className={styles.priceSummary}>
        <div className={styles.priceSummaryRow}>
          <span>Monthly Rent</span>
          <span className={styles.priceSummaryVal}>
            ₱{property.price.toLocaleString()}
          </span>
        </div>
        {leaseDuration && (
          <div className={`${styles.priceSummaryRow} ${styles.priceSummaryRowTotal}`}>
            <span>Est. Total ({leaseDuration} mo)</span>
            <span className={styles.priceSummaryTotal}>
              ₱{estimatedTotal.toLocaleString()}
            </span>
          </div>
        )}
      </div>

      {/* Conditional body: unavailable / login required / form */}
      {isUnavailable ? (
        <div className={`${styles.notice} ${styles.noticeUnavailable}`}>
          <span>🚫</span>
          <span>This property is currently unavailable for rental requests.</span>
        </div>
      ) : !token ? (
        <div className={`${styles.notice} ${styles.noticeLogin}`}>
          <span>🔐</span>
          <span>
            <strong>Login required.</strong> Please{" "}
            <span className={styles.loginLink} onClick={onNavigateLogin}>
              sign in
            </span>{" "}
            to submit a rental request.
          </span>
        </div>
      ) : (
        <form className={styles.form} onSubmit={handleSubmit}>
          {/* Move-in date */}
          <div className={styles.field}>
            <label className={styles.label} htmlFor="startDate">
              Move-in Date
            </label>
            <input
              id="startDate"
              className={styles.input}
              type="date"
              min={getTodayString()}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </div>

          {/* Lease duration */}
          <div className={styles.field}>
            <label className={styles.label} htmlFor="leaseDuration">
              Lease Duration
            </label>
            <div className={styles.selectWrapper}>
              <select
                id="leaseDuration"
                className={styles.select}
                value={leaseDuration}
                onChange={(e) => setLeaseDuration(e.target.value)}
                required
              >
                {LEASE_DURATION_OPTIONS.map((months) => (
                  <option key={months} value={months}>
                    {months} month{months !== 1 ? "s" : ""}
                  </option>
                ))}
              </select>
              <span className={styles.selectArrow}>▾</span>
            </div>
          </div>

          {/* Inline error */}
          {submitError && (
            <div className={styles.formError}>
              <span>⚠️</span>
              <span>{submitError}</span>
            </div>
          )}

          {/* Submit button */}
          <button type="submit" className={styles.ctaBtn} disabled={submitting}>
            {submitting ? (
              <span className={styles.btnLoadingWrapper}>
                <span className={styles.spinner} />
                Submitting…
              </span>
            ) : (
              "Submit Rental Request"
            )}
          </button>

          <p className={styles.formNote}>
            🔒 Your request will be reviewed by the owner. No payment is required at this stage.
          </p>
        </form>
      )}
    </>
  );
}

/* ─────────────────────────────────────────
   Main page component
───────────────────────────────────────── */
const PropertyDetail: React.FC = () => {
  const { id }   = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [property,      setProperty]      = useState<Property | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Fetch property data on mount
  useEffect(() => {
    const fetchProperty = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = getToken();
        const headers: HeadersInit = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const res = await fetch(`${API_BASE}/properties/${id}`, { headers });
        if (!res.ok) throw new Error(`Server error: ${res.status}`);

        const json = await res.json();
        setProperty(json?.data?.property ?? json);
      } catch {
        setError("Could not load property details.");
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchProperty();
  }, [id]);

  /* ── Render ── */
  return (
    <div className={styles.page}>
      <Navbar />

      {/* Breadcrumb navigation */}
      <div className={styles.breadcrumb}>
        <div className={styles.breadcrumbInner}>
          <button className={styles.backBtn} onClick={() => navigate("/home")}>
            <span className={styles.backArrow}>←</span>
            Back to Listings
          </button>

          {property && (
            <span className={styles.breadcrumbTrail}>
              <span
                className={styles.breadcrumbHome}
                onClick={() => navigate("/home")}
              >
                Browse
              </span>
              <span className={styles.breadcrumbSep}>›</span>
              <span className={styles.breadcrumbCurrent}>{property.title}</span>
            </span>
          )}
        </div>
      </div>

      {/* Main content — three possible states */}
      {loading ? (
        <LoadingSkeleton />
      ) : error || !property ? (
        <ErrorState message={error} onBack={() => navigate("/home")} />
      ) : (
        <main className={styles.main}>
          <div className={styles.mainInner}>

            {/* ── Left column: property info ── */}
            <div className={styles.leftCol}>
              <HeroImage
                propertyId={Number(id)}
                type={property.type}
                isUnavailable={property.status === "UNAVAILABLE"}
              />

              <div className={styles.infoCard}>
                {/* Title + price */}
                <div className={styles.infoHeader}>
                  <div className={styles.infoTitleBlock}>
                    <h1 className={styles.propertyTitle}>{property.title}</h1>
                    <div className={styles.location}>
                      <span>📍</span>
                      <span>{property.location}</span>
                    </div>
                  </div>
                  <div className={styles.priceBlock}>
                    <span className={styles.priceAmount}>
                      ₱{property.price.toLocaleString()}
                    </span>
                    <span className={styles.pricePeriod}>/month</span>
                  </div>
                </div>

                {/* Beds / baths / sqm */}
                <PropertyStats
                  beds={property.beds}
                  baths={property.baths}
                  sqm={property.sqm}
                />

                {/* Description */}
                {property.description && (
                  <div className={styles.description}>
                    <h3 className={styles.sectionLabel}>About this property</h3>
                    <p className={styles.descriptionText}>{property.description}</p>
                  </div>
                )}

                {/* Owner info */}
                <div className={styles.ownerRow}>
                  <div className={styles.ownerAvatar}>
                    {property.ownerName?.charAt(0).toUpperCase() || "O"}
                  </div>
                  <div className={styles.ownerInfo}>
                    <span className={styles.ownerLabel}>Listed by</span>
                    <span className={styles.ownerName}>
                      {property.ownerName || "Property Owner"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Right column: rental form ── */}
            <div className={styles.rightCol}>
              <div className={styles.formCard}>
                {submitSuccess ? (
                  <SuccessView
                    propertyTitle={property.title}
                    onBack={() => navigate("/home")}
                  />
                ) : (
                  <>
                    <div className={styles.formHeader}>
                      <h2 className={styles.formTitle}>Request to Rent</h2>
                      <p className={styles.formSubtitle}>
                        Fill in your preferred move-in date and lease duration
                        to send a request to the owner.
                      </p>
                    </div>
                    <RentalForm
                      property={property}
                      onSuccess={() => setSubmitSuccess(true)}
                      onNavigateLogin={() => navigate("/")}
                    />
                  </>
                )}
              </div>
            </div>

          </div>
        </main>
      )}

      <Footer />
    </div>
  );
};

export default PropertyDetail;