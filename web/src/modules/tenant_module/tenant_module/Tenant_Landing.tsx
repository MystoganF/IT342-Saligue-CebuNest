import React, { useState, useEffect, useRef, useCallback } from "react";
import "./Tenant_Landing.css";
import logo from "../../../assets/images/cebunest-logo.png";

/* ─── Types ─── */
interface Property {
  propertyId: number;
  title: string;
  location: string;
  price: number;
  type: string;
  status: string;
  beds: number;
  baths: number;
  sqm: number;
}

/* ─── Constants ─── */
const PROPERTY_TYPES = ["All", "Studio", "Apartment", "Boarding House"];

const GRADIENTS = [
  "linear-gradient(135deg, #1f5d71 0%, #2d8c8a 100%)",
  "linear-gradient(135deg, #2d6a4f 0%, #52b788 100%)",
  "linear-gradient(135deg, #5c4033 0%, #a07850 100%)",
  "linear-gradient(135deg, #1a3a5c 0%, #2e6db4 100%)",
  "linear-gradient(135deg, #4a2060 0%, #8a4fbf 100%)",
  "linear-gradient(135deg, #7c3030 0%, #c06060 100%)",
];

const ICONS: Record<string, string> = {
  Studio: "🏢",
  Apartment: "🏠",
  "Boarding House": "🏘",
};

const API_BASE = "http://localhost:8080/api";

/* ─── Component ─── */
const TenantLanding: React.FC = () => {
  /* Filter state */
  const [search, setSearch]           = useState("");
  const [selectedType, setSelectedType] = useState("All");
  const [minPrice, setMinPrice]       = useState("");
  const [maxPrice, setMaxPrice]       = useState("");

  /* Data state */
  const [properties, setProperties]   = useState<Property[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);

  /* UI state */
  const [menuOpen, setMenuOpen]       = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  /* Debounce search so we don't fire on every keystroke */
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  /* ── Read user from localStorage ── */
  const storedUser = localStorage.getItem("user");
  const user = storedUser ? JSON.parse(storedUser) : null;
  const initials = user?.name
    ? user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  /* ── Close dropdown on outside click ── */
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /* ── Logout ── */
  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    localStorage.clear();
    window.location.href = "/";
  };

  /* ── Fix layout positioning ── */
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const root = document.getElementById("root");
    const prevHtmlPos = html.style.position;
    const prevBodyPos = body.style.position;
    const prevBodyOverflow = body.style.overflow;
    html.style.position = "static"; html.style.width = "100%"; html.style.height = "auto"; html.style.overflow = "auto";
    body.style.position = "static"; body.style.width = "100%"; body.style.height = "auto"; body.style.overflow = "auto";
    if (root) { root.style.position = "static"; root.style.width = "100%"; root.style.height = "auto"; }
    return () => {
      html.style.position = prevHtmlPos;
      body.style.position = prevBodyPos;
      body.style.overflow = prevBodyOverflow;
    };
  }, []);

  /* ── Fetch properties from backend ── */
  const fetchProperties = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.append("search", debouncedSearch);
      if (selectedType !== "All") params.append("type", selectedType);
      if (minPrice) params.append("minPrice", minPrice);
      if (maxPrice) params.append("maxPrice", maxPrice);

      const token = localStorage.getItem("accessToken") || localStorage.getItem("token");
      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE}/properties?${params.toString()}`, { headers });

      if (!res.ok) throw new Error(`Server error: ${res.status}`);

      const json = await res.json();

      /* Support both { data: { properties: [] } } and a plain array */
      const list: Property[] =
        json?.data?.properties ??
        json?.properties ??
        (Array.isArray(json) ? json : []);

      setProperties(list);
    } catch (err: any) {
      console.error("Failed to fetch properties:", err);
      setError("Could not load properties. Please try again.");
      setProperties([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, selectedType, minPrice, maxPrice]);

  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  /* ── Clear all filters ── */
  const clearFilters = () => {
    setSearch("");
    setSelectedType("All");
    setMinPrice("");
    setMaxPrice("");
  };

  const hasActiveFilters = search || selectedType !== "All" || minPrice || maxPrice;

  /* ════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════ */
  return (
    <div className="tl-page">

      {/* ══ NAVBAR ══ */}
      <header className="tl-navbar">
        <div className="tl-navbar-inner">
          <div className="tl-navbar-brand">
            <img src={logo} alt="CebuNest" className="tl-navbar-logo" />
            <span className="tl-navbar-wordmark">CebuNest</span>
          </div>

          <nav className={`tl-navbar-nav${menuOpen ? " tl-navbar-nav--open" : ""}`}>
            <a href="#listings" className="tl-nav-link tl-nav-link--active">Browse</a>
            <a href="#listings" className="tl-nav-link">My Rentals</a>
            <a href="#listings" className="tl-nav-link">Notifications</a>
          </nav>

          <div className="tl-navbar-actions">
            {/* Profile dropdown */}
            <div className="tl-profile-wrapper" ref={profileRef}>
              <button
                className="tl-navbar-avatar"
                onClick={() => setProfileOpen((o) => !o)}
                aria-label="Profile menu"
                aria-expanded={profileOpen}
              >
                {initials}
              </button>

              {profileOpen && (
                <div className="tl-profile-dropdown">
                  <div className="tl-profile-dropdown-header">
                    <div className="tl-profile-dropdown-avatar">{initials}</div>
                    <div className="tl-profile-dropdown-info">
                      <span className="tl-profile-dropdown-name">{user?.name || "User"}</span>
                      <span className="tl-profile-dropdown-email">{user?.email || ""}</span>
                    </div>
                  </div>

                  <div className="tl-profile-dropdown-divider" />

                  <button className="tl-profile-dropdown-item" disabled>
                    <span className="tl-profile-dropdown-icon">👤</span>
                    <span>My Profile</span>
                    <span className="tl-profile-dropdown-soon">Soon</span>
                  </button>

                  <div className="tl-profile-dropdown-divider" />

                  <button
                    className="tl-profile-dropdown-item tl-profile-dropdown-item--logout"
                    onClick={handleLogout}
                  >
                    <span className="tl-profile-dropdown-icon">🚪</span>
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>

            <button
              className="tl-hamburger"
              onClick={() => setMenuOpen((o) => !o)}
              aria-label="Toggle menu"
            >
              <span /><span /><span />
            </button>
          </div>
        </div>
      </header>

      {/* ══ HERO ══ */}
      <section className="tl-hero">
        <div className="tl-hero-bg">
          <div className="tl-hero-orb tl-hero-orb--1" />
          <div className="tl-hero-orb tl-hero-orb--2" />
          <div className="tl-hero-orb tl-hero-orb--3" />
          <div className="tl-hero-grid" />
        </div>
        <div className="tl-hero-content">
          <div className="tl-hero-eyebrow">
            <div className="tl-hero-eyebrow-dot" />
            <span>Cebu City Rentals</span>
          </div>
          <h1 className="tl-hero-heading">
            Find Your Home<br />
            <span className="tl-hero-heading-accent">in Cebu</span>
          </h1>
          <p className="tl-hero-subtext">
            Browse verified boarding houses, apartments, and studios across Cebu City — all in one place.
          </p>
          <div className="tl-hero-search">
            <span className="tl-search-icon">🔍</span>
            <input
              className="tl-search-input"
              type="text"
              placeholder="Search by location or property name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button className="tl-search-btn" onClick={fetchProperties}>Search</button>
          </div>
          <div className="tl-hero-stats">
            <div className="tl-hero-stat">
              <span className="tl-hero-stat-num">240+</span>
              <span className="tl-hero-stat-lbl">Listings</span>
            </div>
            <div className="tl-hero-stat-divider" />
            <div className="tl-hero-stat">
              <span className="tl-hero-stat-num">1.2k</span>
              <span className="tl-hero-stat-lbl">Tenants</span>
            </div>
            <div className="tl-hero-stat-divider" />
            <div className="tl-hero-stat">
              <span className="tl-hero-stat-num">98%</span>
              <span className="tl-hero-stat-lbl">Satisfaction</span>
            </div>
          </div>
        </div>
      </section>

      {/* ══ LISTINGS ══ */}
      <section className="tl-listings" id="listings">
        <div className="tl-listings-inner">

          {/* Filter Bar */}
          <div className="tl-filter-bar">
            <div className="tl-filter-types">
              {PROPERTY_TYPES.map((t) => (
                <button
                  key={t}
                  className={`tl-filter-chip${selectedType === t ? " tl-filter-chip--active" : ""}`}
                  onClick={() => setSelectedType(t)}
                >
                  {t !== "All" && <span>{ICONS[t]}</span>} {t}
                </button>
              ))}
            </div>
            <div className="tl-filter-price">
              <span className="tl-filter-price-label">₱ Price Range</span>
              <input
                className="tl-price-input"
                type="number"
                placeholder="Min"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
              />
              <span className="tl-price-sep">—</span>
              <input
                className="tl-price-input"
                type="number"
                placeholder="Max"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
              />
            </div>
          </div>

          {/* Results meta */}
          <div className="tl-results-meta">
            <span className="tl-results-count">
              {loading
                ? "Loading…"
                : `${properties.length} ${properties.length === 1 ? "property" : "properties"} found`}
            </span>
            {hasActiveFilters && !loading && (
              <button className="tl-clear-btn" onClick={clearFilters}>
                ✕ Clear filters
              </button>
            )}
          </div>

          {/* Content */}
          {loading ? (
            /* ── Skeleton loader ── */
            <div className="tl-grid">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="tl-card tl-card--skeleton">
                  <div className="tl-card-image tl-skeleton-block" style={{ height: 185 }} />
                  <div className="tl-card-body" style={{ gap: 12 }}>
                    <div className="tl-skeleton-line" style={{ width: "70%", height: 18 }} />
                    <div className="tl-skeleton-line" style={{ width: "45%", height: 14 }} />
                    <div className="tl-skeleton-line" style={{ width: "90%", height: 12 }} />
                    <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
                      <div className="tl-skeleton-line" style={{ width: 48, height: 12 }} />
                      <div className="tl-skeleton-line" style={{ width: 48, height: 12 }} />
                      <div className="tl-skeleton-line" style={{ width: 48, height: 12 }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>

          ) : error ? (
            /* ── Error state ── */
            <div className="tl-empty">
              <div className="tl-empty-icon">⚠️</div>
              <p className="tl-empty-title">Something went wrong</p>
              <p className="tl-empty-sub">{error}</p>
              <button
                className="tl-search-btn"
                style={{ marginTop: 20 }}
                onClick={fetchProperties}
              >
                Try Again
              </button>
            </div>

          ) : properties.length === 0 ? (
            /* ── Empty state ── */
            <div className="tl-empty">
              <div className="tl-empty-icon">🏚</div>
              <p className="tl-empty-title">No properties found</p>
              <p className="tl-empty-sub">Try adjusting your search or filters.</p>
            </div>

          ) : (
            /* ── Property grid ── */
            <div className="tl-grid">
              {properties.map((prop, idx) => (
                <div
                  key={prop.propertyId}
                  className={`tl-card${prop.status === "UNAVAILABLE" ? " tl-card--unavailable" : ""}`}
                  style={{ animationDelay: `${idx * 0.07}s` }}
                >
                  <div
                    className="tl-card-image"
                    style={{ background: GRADIENTS[idx % GRADIENTS.length] }}
                  >
                    <span className="tl-card-image-icon">{ICONS[prop.type] || "🏠"}</span>
                    <div className="tl-card-type-badge">{prop.type}</div>
                    {prop.status === "UNAVAILABLE" && (
                      <div className="tl-card-unavail-badge">Unavailable</div>
                    )}
                  </div>
                  <div className="tl-card-body">
                    <div className="tl-card-top">
                      <h3 className="tl-card-title">{prop.title}</h3>
                      <div className="tl-card-price">
                        <span className="tl-card-price-amount">
                          ₱{prop.price.toLocaleString()}
                        </span>
                        <span className="tl-card-price-period">/mo</span>
                      </div>
                    </div>
                    <div className="tl-card-location">
                      <span className="tl-card-location-icon">📍</span>
                      <span>{prop.location}</span>
                    </div>
                    <div className="tl-card-meta">
                      <span className="tl-card-meta-item">🛏 {prop.beds ?? "—"} Bed</span>
                      <span className="tl-card-meta-item">🚿 {prop.baths ?? "—"} Bath</span>
                      <span className="tl-card-meta-item">📐 {prop.sqm ?? "—"} m²</span>
                    </div>
                    <div className="tl-card-footer">
                      {/* Rating is not yet in the entity — placeholder for now */}
                      <div className="tl-card-rating">
                        <span className="tl-card-star">★</span>
                        <span className="tl-card-rating-num">—</span>
                        <span className="tl-card-rating-count">(0)</span>
                      </div>
                      <button
                        className="tl-card-btn"
                        disabled={prop.status === "UNAVAILABLE"}
                      >
                        {prop.status === "UNAVAILABLE" ? "Unavailable" : "View Details"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      </section>

      {/* ══ FOOTER ══ */}
      <footer className="tl-footer">
        <div className="tl-footer-inner">
          <div className="tl-footer-brand">
            <img src={logo} alt="CebuNest" className="tl-footer-logo" />
            <span className="tl-footer-wordmark">CebuNest</span>
          </div>
          <p className="tl-footer-copy">© 2026 CebuNest. All rights reserved.</p>
        </div>
      </footer>

    </div>
  );
};

export default TenantLanding;