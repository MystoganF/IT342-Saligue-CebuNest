import React, { useState, useEffect, useRef } from "react";
import "./Tenant_Landing.css";
import logo from "../../../assets/images/cebunest-logo.png";

/* ─── Mock Data for now─── */
const MOCK_PROPERTIES = [
  { id: 1, title: "Cozy Studio near IT Park", location: "Lahug, Cebu City", price: 6500, type: "Studio", status: "AVAILABLE", beds: 1, baths: 1, sqm: 22, rating: 4.8, reviews: 12 },
  { id: 2, title: "Modern 1BR Apartment", location: "Cebu Business Park, Cebu City", price: 12000, type: "Apartment", status: "AVAILABLE", beds: 1, baths: 1, sqm: 38, rating: 4.6, reviews: 8 },
  { id: 3, title: "Boarding House – Single Room", location: "Talamban, Cebu City", price: 3500, type: "Boarding House", status: "AVAILABLE", beds: 1, baths: 1, sqm: 14, rating: 4.3, reviews: 21 },
  { id: 4, title: "Spacious 2BR with Balcony", location: "Mabolo, Cebu City", price: 18500, type: "Apartment", status: "AVAILABLE", beds: 2, baths: 2, sqm: 65, rating: 4.9, reviews: 5 },
  { id: 5, title: "Budget BH near USC", location: "Capitol Site, Cebu City", price: 2800, type: "Boarding House", status: "UNAVAILABLE", beds: 1, baths: 1, sqm: 12, rating: 4.1, reviews: 34 },
  { id: 6, title: "Premium Studio – Fully Furnished", location: "Apas, Cebu City", price: 9800, type: "Studio", status: "AVAILABLE", beds: 1, baths: 1, sqm: 28, rating: 5.0, reviews: 3 },
];

const PROPERTY_TYPES = ["All", "Studio", "Apartment", "Boarding House"];
const GRADIENTS = [
  "linear-gradient(135deg, #1f5d71 0%, #2d8c8a 100%)",
  "linear-gradient(135deg, #2d6a4f 0%, #52b788 100%)",
  "linear-gradient(135deg, #5c4033 0%, #a07850 100%)",
  "linear-gradient(135deg, #1a3a5c 0%, #2e6db4 100%)",
  "linear-gradient(135deg, #4a2060 0%, #8a4fbf 100%)",
  "linear-gradient(135deg, #7c3030 0%, #c06060 100%)",
];
const ICONS: Record<string, string> = { Studio: "🏢", Apartment: "🏠", "Boarding House": "🏘" };

/* ─── Component ─── */
const TenantLanding: React.FC = () => {
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState("All");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  // Read user from localStorage
  const storedUser = localStorage.getItem("user");
  const user = storedUser ? JSON.parse(storedUser) : null;
  const initials = user?.name
    ? user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
 
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("user");
  localStorage.removeItem("token");
  localStorage.removeItem("username");
  localStorage.clear(); 
  window.location.href = "/";
};

 
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
    return () => { html.style.position = prevHtmlPos; body.style.position = prevBodyPos; body.style.overflow = prevBodyOverflow; };
  }, []);

  const filtered = MOCK_PROPERTIES.filter((p) => {
    const matchSearch = p.title.toLowerCase().includes(search.toLowerCase()) || p.location.toLowerCase().includes(search.toLowerCase());
    const matchType = selectedType === "All" || p.type === selectedType;
    const matchMin = minPrice === "" || p.price >= Number(minPrice);
    const matchMax = maxPrice === "" || p.price <= Number(maxPrice);
    return matchSearch && matchType && matchMin && matchMax;
  });

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
                  {/* User info header */}
                  <div className="tl-profile-dropdown-header">
                    <div className="tl-profile-dropdown-avatar">{initials}</div>
                    <div className="tl-profile-dropdown-info">
                      <span className="tl-profile-dropdown-name">{user?.name || "User"}</span>
                      <span className="tl-profile-dropdown-email">{user?.email || ""}</span>
                    </div>
                  </div>

                  <div className="tl-profile-dropdown-divider" />

                  {/* Profile link (no href yet) */}
                  <button className="tl-profile-dropdown-item" disabled>
                    <span className="tl-profile-dropdown-icon">👤</span>
                    <span>My Profile</span>
                    <span className="tl-profile-dropdown-soon">Soon</span>
                  </button>

                  <div className="tl-profile-dropdown-divider" />

                  {/* Logout */}
                  <button className="tl-profile-dropdown-item tl-profile-dropdown-item--logout" onClick={handleLogout}>
                    <span className="tl-profile-dropdown-icon">🚪</span>
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>

            <button className="tl-hamburger" onClick={() => setMenuOpen((o) => !o)} aria-label="Toggle menu">
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
          <div className="tl-hero-eyebrow"><div className="tl-hero-eyebrow-dot" /><span>Cebu City Rentals</span></div>
          <h1 className="tl-hero-heading">Find Your Home<br /><span className="tl-hero-heading-accent">in Cebu</span></h1>
          <p className="tl-hero-subtext">Browse verified boarding houses, apartments, and studios across Cebu City — all in one place.</p>
          <div className="tl-hero-search">
            <span className="tl-search-icon">🔍</span>
            <input className="tl-search-input" type="text" placeholder="Search by location or property name…" value={search} onChange={(e) => setSearch(e.target.value)} />
            <button className="tl-search-btn">Search</button>
          </div>
          <div className="tl-hero-stats">
            <div className="tl-hero-stat"><span className="tl-hero-stat-num">240+</span><span className="tl-hero-stat-lbl">Listings</span></div>
            <div className="tl-hero-stat-divider" />
            <div className="tl-hero-stat"><span className="tl-hero-stat-num">1.2k</span><span className="tl-hero-stat-lbl">Tenants</span></div>
            <div className="tl-hero-stat-divider" />
            <div className="tl-hero-stat"><span className="tl-hero-stat-num">98%</span><span className="tl-hero-stat-lbl">Satisfaction</span></div>
          </div>
        </div>
      </section>

      {/* ══ LISTINGS ══ */}
      <section className="tl-listings" id="listings">
        <div className="tl-listings-inner">
          <div className="tl-filter-bar">
            <div className="tl-filter-types">
              {PROPERTY_TYPES.map((t) => (
                <button key={t} className={`tl-filter-chip${selectedType === t ? " tl-filter-chip--active" : ""}`} onClick={() => setSelectedType(t)}>
                  {t !== "All" && <span>{ICONS[t]}</span>} {t}
                </button>
              ))}
            </div>
            <div className="tl-filter-price">
              <span className="tl-filter-price-label">₱ Price Range</span>
              <input className="tl-price-input" type="number" placeholder="Min" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} />
              <span className="tl-price-sep">—</span>
              <input className="tl-price-input" type="number" placeholder="Max" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} />
            </div>
          </div>

          <div className="tl-results-meta">
            <span className="tl-results-count">{filtered.length} {filtered.length === 1 ? "property" : "properties"} found</span>
            {(search || selectedType !== "All" || minPrice || maxPrice) && (
              <button className="tl-clear-btn" onClick={() => { setSearch(""); setSelectedType("All"); setMinPrice(""); setMaxPrice(""); }}>✕ Clear filters</button>
            )}
          </div>

          {filtered.length === 0 ? (
            <div className="tl-empty">
              <div className="tl-empty-icon">🏚</div>
              <p className="tl-empty-title">No properties found</p>
              <p className="tl-empty-sub">Try adjusting your search or filters.</p>
            </div>
          ) : (
            <div className="tl-grid">
              {filtered.map((prop, idx) => (
                <div key={prop.id} className={`tl-card${prop.status === "UNAVAILABLE" ? " tl-card--unavailable" : ""}`} style={{ animationDelay: `${idx * 0.07}s` }}>
                  <div className="tl-card-image" style={{ background: GRADIENTS[idx % GRADIENTS.length] }}>
                    <span className="tl-card-image-icon">{ICONS[prop.type] || "🏠"}</span>
                    <div className="tl-card-type-badge">{prop.type}</div>
                    {prop.status === "UNAVAILABLE" && <div className="tl-card-unavail-badge">Unavailable</div>}
                  </div>
                  <div className="tl-card-body">
                    <div className="tl-card-top">
                      <h3 className="tl-card-title">{prop.title}</h3>
                      <div className="tl-card-price">
                        <span className="tl-card-price-amount">₱{prop.price.toLocaleString()}</span>
                        <span className="tl-card-price-period">/mo</span>
                      </div>
                    </div>
                    <div className="tl-card-location"><span className="tl-card-location-icon">📍</span><span>{prop.location}</span></div>
                    <div className="tl-card-meta">
                      <span className="tl-card-meta-item">🛏 {prop.beds} Bed</span>
                      <span className="tl-card-meta-item">🚿 {prop.baths} Bath</span>
                      <span className="tl-card-meta-item">📐 {prop.sqm} m²</span>
                    </div>
                    <div className="tl-card-footer">
                      <div className="tl-card-rating">
                        <span className="tl-card-star">★</span>
                        <span className="tl-card-rating-num">{prop.rating.toFixed(1)}</span>
                        <span className="tl-card-rating-count">({prop.reviews})</span>
                      </div>
                      <button className="tl-card-btn" disabled={prop.status === "UNAVAILABLE"}>
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