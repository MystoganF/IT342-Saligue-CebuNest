import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "./Property_Detail.css";
import Navbar from "../../../components/Navbar/Navbar";
import Footer from "../../../components/Navbar/Footer";

/* ─── Types ─── */
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

const GRADIENTS = [
  "linear-gradient(135deg, #1f5d71 0%, #2d8c8a 100%)",
  "linear-gradient(135deg, #2d6a4f 0%, #52b788 100%)",
  "linear-gradient(135deg, #5c4033 0%, #a07850 100%)",
  "linear-gradient(135deg, #1a3a5c 0%, #2e6db4 100%)",
  "linear-gradient(135deg, #4a2060 0%, #8a4fbf 100%)",
  "linear-gradient(135deg, #7c3030 0%, #c06060 100%)",
];
const ICONS: Record<string, string> = {
  Studio: "🏢", Apartment: "🏠", "Boarding House": "🏘",
};
const API_BASE = "http://localhost:8080/api";

const PropertyDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [property, setProperty]       = useState<Property | null>(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);

  const [startDate, setStartDate]           = useState("");
  const [leaseDuration, setLeaseDuration]   = useState("1");
  const [submitting, setSubmitting]         = useState(false);
  const [submitSuccess, setSubmitSuccess]   = useState(false);
  const [submitError, setSubmitError]       = useState<string | null>(null);

  const token = localStorage.getItem("accessToken") || localStorage.getItem("token");

  /* Fetch property */
  useEffect(() => {
    const fetchProperty = async () => {
      setLoading(true);
      setError(null);
      try {
        const headers: HeadersInit = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;
        const res = await fetch(`${API_BASE}/properties/${id}`, { headers });
        if (!res.ok) throw new Error(`Server error: ${res.status}`);
        const json = await res.json();
        setProperty(json?.data?.property ?? json);
      } catch (err: any) {
        setError("Could not load property details.");
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchProperty();
  }, [id]);

  /* Submit rental request */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) { setSubmitError("You must be logged in to submit a rental request."); return; }
    if (!startDate || !leaseDuration) { setSubmitError("Please fill in all fields."); return; }

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
          propertyId: Number(id),
          startDate,
          leaseDurationMonths: Number(leaseDuration),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message || "Failed to submit request.");
      setSubmitSuccess(true);
    } catch (err: any) {
      setSubmitError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const today = new Date().toISOString().split("T")[0];
  const gradient = GRADIENTS[Number(id) % GRADIENTS.length];

  return (
    <div className="pd-page">

      <Navbar />

      {/* ══ BREADCRUMB ══ */}
      <div className="pd-breadcrumb">
        <div className="pd-breadcrumb-inner">
          <button className="pd-back-btn" onClick={() => navigate("/home")}>
            <span className="pd-back-arrow">←</span>
            Back to Listings
          </button>
          {property && (
            <span className="pd-breadcrumb-trail">
              <span className="pd-breadcrumb-home" onClick={() => navigate("/home")}>Browse</span>
              <span className="pd-breadcrumb-sep">›</span>
              <span className="pd-breadcrumb-current">{property.title}</span>
            </span>
          )}
        </div>
      </div>

      {/* ══ MAIN CONTENT ══ */}
      {loading ? (
        <div className="pd-loading">
          <div className="pd-loading-inner">
            <div className="pd-skeleton-hero" />
            <div className="pd-skeleton-body">
              <div className="pd-skeleton-line" style={{ width: "60%", height: 32 }} />
              <div className="pd-skeleton-line" style={{ width: "40%", height: 20 }} />
              <div className="pd-skeleton-line" style={{ width: "80%", height: 16 }} />
              <div className="pd-skeleton-line" style={{ width: "70%", height: 16 }} />
            </div>
          </div>
        </div>

      ) : error || !property ? (
        <div className="pd-error">
          <div className="pd-error-icon">⚠️</div>
          <h2 className="pd-error-title">Property not found</h2>
          <p className="pd-error-sub">{error || "This property may have been removed."}</p>
          <button className="pd-cta-btn" onClick={() => navigate("/home")}>Back to Listings</button>
        </div>

      ) : (
        <main className="pd-main">
          <div className="pd-main-inner">

            {/* ── LEFT COLUMN ── */}
            <div className="pd-left">

              {/* Hero image */}
              <div className="pd-hero-image" style={{ background: gradient }}>
                <span className="pd-hero-icon">{ICONS[property.type] || "🏠"}</span>
                <div className="pd-hero-type-badge">{property.type}</div>
                {property.status === "UNAVAILABLE" && (
                  <div className="pd-hero-unavail-badge">Unavailable</div>
                )}
              </div>

              {/* Info card */}
              <div className="pd-info-card">
                <div className="pd-info-header">
                  <div className="pd-info-title-block">
                    <h1 className="pd-title">{property.title}</h1>
                    <div className="pd-location">
                      <span>📍</span>
                      <span>{property.location}</span>
                    </div>
                  </div>
                  <div className="pd-price-block">
                    <span className="pd-price-amount">₱{property.price.toLocaleString()}</span>
                    <span className="pd-price-period">/month</span>
                  </div>
                </div>

                <div className="pd-stats-row">
                  <div className="pd-stat">
                    <span className="pd-stat-icon">🛏</span>
                    <span className="pd-stat-value">{property.beds ?? "—"}</span>
                    <span className="pd-stat-label">Bedroom{property.beds !== 1 ? "s" : ""}</span>
                  </div>
                  <div className="pd-stat-divider" />
                  <div className="pd-stat">
                    <span className="pd-stat-icon">🚿</span>
                    <span className="pd-stat-value">{property.baths ?? "—"}</span>
                    <span className="pd-stat-label">Bathroom{property.baths !== 1 ? "s" : ""}</span>
                  </div>
                  <div className="pd-stat-divider" />
                  <div className="pd-stat">
                    <span className="pd-stat-icon">📐</span>
                    <span className="pd-stat-value">{property.sqm ?? "—"}</span>
                    <span className="pd-stat-label">m²</span>
                  </div>
                </div>

                {property.description && (
                  <div className="pd-description">
                    <h3 className="pd-section-label">About this property</h3>
                    <p className="pd-description-text">{property.description}</p>
                  </div>
                )}

                <div className="pd-owner-row">
                  <div className="pd-owner-avatar">
                    {property.ownerName?.charAt(0).toUpperCase() || "O"}
                  </div>
                  <div className="pd-owner-info">
                    <span className="pd-owner-label">Listed by</span>
                    <span className="pd-owner-name">{property.ownerName || "Property Owner"}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── RIGHT COLUMN ── */}
            <div className="pd-right">
              <div className="pd-form-card">

                {submitSuccess ? (
                  <div className="pd-success">
                    <div className="pd-success-icon">🎉</div>
                    <h3 className="pd-success-title">Request Submitted!</h3>
                    <p className="pd-success-sub">
                      Your rental request for <strong>{property.title}</strong> has been sent to the owner.
                      You'll be notified once they respond.
                    </p>
                    <div className="pd-success-status">
                      <span className="pd-status-dot" />
                      Status: <strong>PENDING</strong>
                    </div>
                    <button className="pd-cta-btn pd-cta-btn--outline" onClick={() => navigate("/home")}>
                      Back to Listings
                    </button>
                  </div>

                ) : (
                  <>
                    <div className="pd-form-header">
                      <h2 className="pd-form-title">Request to Rent</h2>
                      <p className="pd-form-sub">
                        Fill in your preferred move-in date and lease duration to send a request to the owner.
                      </p>
                    </div>

                    <div className="pd-price-summary">
                      <div className="pd-price-summary-row">
                        <span>Monthly Rent</span>
                        <span className="pd-price-summary-val">₱{property.price.toLocaleString()}</span>
                      </div>
                      {leaseDuration && (
                        <div className="pd-price-summary-row pd-price-summary-row--total">
                          <span>Est. Total ({leaseDuration} mo)</span>
                          <span className="pd-price-summary-total">
                            ₱{(property.price * Number(leaseDuration)).toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>

                    {property.status === "UNAVAILABLE" ? (
                      <div className="pd-unavail-notice">
                        <span>🚫</span>
                        <span>This property is currently unavailable for rental requests.</span>
                      </div>
                    ) : !token ? (
                      <div className="pd-login-notice">
                        <span>🔐</span>
                        <span>
                          <strong>Login required.</strong> Please{" "}
                          <span className="pd-login-link" onClick={() => navigate("/")}>sign in</span>{" "}
                          to submit a rental request.
                        </span>
                      </div>
                    ) : (
                      <form className="pd-form" onSubmit={handleSubmit}>
                        <div className="pd-field">
                          <label className="pd-label" htmlFor="startDate">Move-in Date</label>
                          <input
                            id="startDate"
                            className="pd-input"
                            type="date"
                            min={today}
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            required
                          />
                        </div>

                        <div className="pd-field">
                          <label className="pd-label" htmlFor="leaseDuration">Lease Duration</label>
                          <div className="pd-select-wrapper">
                            <select
                              id="leaseDuration"
                              className="pd-select"
                              value={leaseDuration}
                              onChange={(e) => setLeaseDuration(e.target.value)}
                              required
                            >
                              {[1, 2, 3, 4, 5, 6, 9, 12, 18, 24].map((m) => (
                                <option key={m} value={m}>{m} month{m !== 1 ? "s" : ""}</option>
                              ))}
                            </select>
                            <span className="pd-select-arrow">▾</span>
                          </div>
                        </div>

                        {submitError && (
                          <div className="pd-form-error">
                            <span>⚠️</span>
                            <span>{submitError}</span>
                          </div>
                        )}

                        <button type="submit" className="pd-cta-btn" disabled={submitting}>
                          {submitting ? (
                            <span className="pd-btn-loading">
                              <span className="pd-spinner" />
                              Submitting…
                            </span>
                          ) : "Submit Rental Request"}
                        </button>

                        <p className="pd-form-note">
                          🔒 Your request will be reviewed by the owner. No payment is required at this stage.
                        </p>
                      </form>
                    )}
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