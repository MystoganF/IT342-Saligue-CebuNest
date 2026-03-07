import React, { useState } from "react";
import "./Login.css";
import logo from "../../../assets/images/cebunest-logo.png";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

const Login: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        const msg =
          data?.error?.message ||
          (response.status === 401
            ? "Invalid email or password."
            : "Login failed. Please try again.");
        setError(msg);
        return;
      }

      // Store tokens
      localStorage.setItem("accessToken", data.data.accessToken);
      localStorage.setItem("refreshToken", data.data.refreshToken);
      localStorage.setItem("user", JSON.stringify(data.data.user));

      // Show success message, then redirect
      setSuccess(true);
      const role = data.data.user?.role?.toUpperCase();
      setTimeout(() => {
        window.location.href = role === "ADMIN" ? "/admin/dashboard" : "/home";
      }, 1500);

    } catch (err) {
      setError("Unable to connect to the server. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">

      {/* ── LEFT PANEL ── */}
      <div className="login-left-panel">
        <div className="login-deco login-deco--1" />
        <div className="login-deco login-deco--2" />
        <div className="login-deco login-deco--3" />
        <div className="login-accent-line" />

        <div className="login-brand-logo">
          <img src={logo} alt="CebuNest Logo" className="login-logo-img" />
        </div>

        <div className="login-brand-info">
          <div className="login-brand-eyebrow">
            <div className="login-eyebrow-line" />
            <span className="login-eyebrow-text">Property Management</span>
          </div>
          <h2 className="login-brand-heading">Your Home in Cebu Awaits</h2>
          <p className="login-brand-body">
            Streamlined rental management for tenants and property owners.
            Browse listings, submit rental requests, and manage bookings — all in one place.
          </p>
        </div>

        <div className="login-stats">
          <div className="login-stat-item">
            <span className="login-stat-number">240+</span>
            <span className="login-stat-label">Active Listings</span>
          </div>
          <div className="login-stat-item">
            <span className="login-stat-number">1.2k</span>
            <span className="login-stat-label">Happy Tenants</span>
          </div>
          <div className="login-stat-item">
            <span className="login-stat-number">98%</span>
            <span className="login-stat-label">Satisfaction</span>
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className="login-right-panel">
        <div className="login-form-card">

          <div className="login-form-header">
            <div className="login-form-eyebrow">
              <div className="login-header-dot" />
              <span className="login-header-eyebrow-text">Secure Access</span>
            </div>
            <h2 className="login-form-heading">Welcome Back</h2>
            <p className="login-form-subheading">Sign in to manage your properties and rentals.</p>
          </div>

          <form className="login-form-fields" onSubmit={handleLogin}>
            <div className="login-field-group">
              <label className="login-field-label" htmlFor="cn-login-email">
                Email Address
              </label>
              <div className="login-field-wrap">
                <span className="login-field-icon">✉</span>
                <input
                  className="login-field-input"
                  type="email"
                  id="cn-login-email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(null); }}
                  required
                  disabled={isLoading || success}
                />
              </div>
            </div>

            <div className="login-field-group">
              <label className="login-field-label" htmlFor="cn-login-password">
                Password
              </label>
              <div className="login-field-wrap">
                <span className="login-field-icon">🔒</span>
                <input
                  className="login-field-input"
                  type={showPassword ? "text" : "password"}
                  id="cn-login-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(null); }}
                  required
                  disabled={isLoading || success}
                />
                <button
                  type="button"
                  className="login-toggle-password"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  tabIndex={-1}
                >
                  {showPassword ? "🙈" : "👁"}
                </button>
              </div>
            </div>

            <button
              className={`login-btn${isLoading ? " login-btn--loading" : ""}${success ? " login-btn--success" : ""}`}
              type="submit"
              disabled={isLoading || success}
            >
              {isLoading ? (
                <span className="login-spinner" />
              ) : success ? (
                <span className="login-btn-success-content">
                  <span className="login-success-check">✓</span> Login Successful
                </span>
              ) : (
                "Sign In"
              )}
            </button>

            {error && (
              <div className="login-message login-message--error">
                <span>⚠</span> {error}
              </div>
            )}

            {success && (
              <div className="login-message login-message--success">
                <span>✓</span> Welcome back! Redirecting you now…
              </div>
            )}
          </form>

          <div className="login-divider">
            <div className="login-divider-line" />
            <span className="login-divider-text">or</span>
            <div className="login-divider-line" />
          </div>

          <div className="login-links">
            <a href="/forgot-password" className="login-link">
              Forgot Password?
            </a>
            <a href="/register" className="login-link login-link--signup">
              Create Account →
            </a>
          </div>

        </div>
      </div>

    </div>
  );
};

export default Login;