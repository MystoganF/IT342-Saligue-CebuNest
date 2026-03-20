import React, { useState } from "react";
import { useGoogleLogin } from "@react-oauth/google";
import "./Login.css";
import logo from "../../../assets/images/cebunest-logo.png";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

type Role = "TENANT" | "OWNER";

interface PendingGoogleUser {
  email: string;
  name: string;
}

const Login: React.FC = () => {
  const [email, setEmail]               = useState("");
  const [password, setPassword]         = useState("");
  const [isLoading, setIsLoading]       = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [success, setSuccess]           = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  /* Role picker modal state */
  const [showRolePicker, setShowRolePicker]       = useState(false);
  const [pendingGoogleUser, setPendingGoogleUser] = useState<PendingGoogleUser | null>(null);
  const [selectedRole, setSelectedRole]           = useState<Role>("TENANT");
  const [roleSubmitting, setRoleSubmitting]       = useState(false);

  /* ── Standard login ── */
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
        setError(data?.error?.message || (response.status === 401 ? "Invalid email or password." : "Login failed. Please try again."));
        return;
      }
      storeAndRedirect(data);
    } catch (err) {
      setError("Unable to connect to the server. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  /* ── Store tokens and redirect ── */
  const storeAndRedirect = (data: any) => {
    localStorage.setItem("accessToken", data.data.accessToken);
    localStorage.setItem("refreshToken", data.data.refreshToken);
    localStorage.setItem("user", JSON.stringify(data.data.user));
    setSuccess(true);
    const role = data.data.user?.role?.toUpperCase();
    setTimeout(() => {
      window.location.href = role === "ADMIN" ? "/admin/dashboard" : "/home";
    }, 1200);
  };

  /* ── Google login — check if user exists first ── */
  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setGoogleLoading(true);
      setError(null);
      try {
        const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        });
        const userInfo = await userInfoRes.json();

        // Send without role — backend checks if user exists
        const res = await fetch(`${API_BASE_URL}/api/auth/google`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: userInfo.email,
            name: userInfo.name,
            // no role — signals backend to check existence only
          }),
        });
        const data = await res.json();

        if (!res.ok || !data.success) {
          setError(data?.error?.message || "Google login failed.");
          return;
        }

        // New user — show role picker modal
        if (data.data?.requiresRoleSelection) {
          setPendingGoogleUser({ email: userInfo.email, name: userInfo.name });
          setShowRolePicker(true);
          return;
        }

        // Existing user — log in directly
        storeAndRedirect(data);

      } catch (err) {
        setError("Google login failed. Please try again.");
      } finally {
        setGoogleLoading(false);
      }
    },
    onError: () => {
      setError("Google sign-in was cancelled or failed.");
    },
  });

  /* ── Submit role selection for new Google user ── */
  const handleRoleSubmit = async () => {
    if (!pendingGoogleUser) return;
    setRoleSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: pendingGoogleUser.email,
          name: pendingGoogleUser.name,
          role: selectedRole,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data?.error?.message || "Account creation failed.");
        setShowRolePicker(false);
        return;
      }
      setShowRolePicker(false);
      storeAndRedirect(data);
    } catch (err) {
      setError("Something went wrong. Please try again.");
      setShowRolePicker(false);
    } finally {
      setRoleSubmitting(false);
    }
  };

  return (
    <div className="login-page">

      {/* ══ ROLE PICKER MODAL ══ */}
      {showRolePicker && (
        <div className="login-modal-overlay" onClick={() => !roleSubmitting && setShowRolePicker(false)}>
          <div className="login-modal" onClick={(e) => e.stopPropagation()}>
            <div className="login-modal-header">
              <div className="login-modal-icon">👋</div>
              <h3 className="login-modal-title">Welcome to CebuNest!</h3>
              <p className="login-modal-sub">
                Looks like you're new here. How will you be using CebuNest?
              </p>
            </div>

            <div className="login-modal-roles">
              <button
                className={`login-modal-role-btn${selectedRole === "TENANT" ? " login-modal-role-btn--active" : ""}`}
                onClick={() => setSelectedRole("TENANT")}
                disabled={roleSubmitting}
              >
                <span className="login-modal-role-icon">🏡</span>
                <span className="login-modal-role-label">Tenant</span>
                <span className="login-modal-role-desc">I'm looking to rent a property</span>
                {selectedRole === "TENANT" && <span className="login-modal-role-check">✓</span>}
              </button>

              <button
                className={`login-modal-role-btn${selectedRole === "OWNER" ? " login-modal-role-btn--active" : ""}`}
                onClick={() => setSelectedRole("OWNER")}
                disabled={roleSubmitting}
              >
                <span className="login-modal-role-icon">🔑</span>
                <span className="login-modal-role-label">Owner</span>
                <span className="login-modal-role-desc">I'm listing a property to rent out</span>
                {selectedRole === "OWNER" && <span className="login-modal-role-check">✓</span>}
              </button>
            </div>

            <button
              className="login-modal-confirm-btn"
              onClick={handleRoleSubmit}
              disabled={roleSubmitting}
            >
              {roleSubmitting ? (
                <span className="login-modal-spinner" />
              ) : `Continue as ${selectedRole === "TENANT" ? "Tenant" : "Owner"}`}
            </button>

            <p className="login-modal-note">
              You can't change your role later, so choose carefully.
            </p>
          </div>
        </div>
      )}

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

          {/* Google Sign-In Button */}
          <button
            className="login-google-btn"
            type="button"
            onClick={() => handleGoogleLogin()}
            disabled={isLoading || success || googleLoading}
          >
            {googleLoading ? (
              <span className="login-spinner login-spinner--dark" />
            ) : (
              <svg className="login-google-icon" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            <span>{googleLoading ? "Signing in…" : "Continue with Google"}</span>
          </button>

          <div className="login-divider">
            <div className="login-divider-line" />
            <span className="login-divider-text">or sign in with email</span>
            <div className="login-divider-line" />
          </div>

          <form className="login-form-fields" onSubmit={handleLogin}>
            <div className="login-field-group">
              <label className="login-field-label" htmlFor="cn-login-email">Email Address</label>
              <div className="login-field-wrap">
                <span className="login-field-icon">✉</span>
                <input
                  className="login-field-input" type="email" id="cn-login-email"
                  placeholder="you@example.com" value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(null); }}
                  required disabled={isLoading || success}
                />
              </div>
            </div>

            <div className="login-field-group">
              <label className="login-field-label" htmlFor="cn-login-password">Password</label>
              <div className="login-field-wrap">
                <span className="login-field-icon">🔒</span>
                <input
                  className="login-field-input"
                  type={showPassword ? "text" : "password"}
                  id="cn-login-password" placeholder="Enter your password" value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(null); }}
                  required disabled={isLoading || success}
                />
                <button
                  type="button" className="login-toggle-password"
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
              type="submit" disabled={isLoading || success}
            >
              {isLoading ? (
                <span className="login-spinner" />
              ) : success ? (
                <span className="login-btn-success-content">
                  <span className="login-success-check">✓</span> Login Successful
                </span>
              ) : "Sign In"}
            </button>

            {error && (
              <div className="login-message login-message--error"><span>⚠</span> {error}</div>
            )}
            {success && (
              <div className="login-message login-message--success"><span>✓</span> Welcome back! Redirecting you now…</div>
            )}
          </form>

          <div className="login-links">
            <a href="/forgot-password" className="login-link">Forgot Password?</a>
            <a href="/register" className="login-link login-link--signup">Create Account →</a>
          </div>

        </div>
      </div>

    </div>
  );
};

export default Login;