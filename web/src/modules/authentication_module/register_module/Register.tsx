import React, { useState } from "react";
import { useGoogleLogin } from "@react-oauth/google";
import "./Register.css";
import logo from "../../../assets/images/cebunest-logo.png";

type Role = "TENANT" | "OWNER";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8080";

const Register: React.FC = () => {
  const [name, setName]                     = useState("");
  const [phoneNumber, setPhoneNumber]       = useState("");
  const [email, setEmail]                   = useState("");
  const [password, setPassword]             = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole]                     = useState<Role>("TENANT");
  const [message, setMessage]               = useState<string | null>(null);
  const [isError, setIsError]               = useState(false);
  const [loading, setLoading]               = useState(false);
  const [googleLoading, setGoogleLoading]   = useState(false);

  /* ── Standard register ── */
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (password !== confirmPassword) {
      setIsError(true); setMessage("Passwords do not match."); return;
    }
    if (password.length < 8) {
      setIsError(true); setMessage("Password must be at least 8 characters."); return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phoneNumber, email, password, confirmPassword, role }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setIsError(true);
        setMessage(data?.error?.message || "Registration failed. Please try again.");
        return;
      }
      localStorage.setItem("accessToken", data.data.accessToken);
      localStorage.setItem("refreshToken", data.data.refreshToken);
      localStorage.setItem("user", JSON.stringify(data.data.user));
      setIsError(false);
      setMessage("Account created! Redirecting...");
      setTimeout(() => { window.location.href = "/home"; }, 1200);
    } catch (err) {
      setIsError(true);
      setMessage("Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  /* ── Google register ── */
  const handleGoogleRegister = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setGoogleLoading(true);
      setMessage(null);
      setIsError(false);
      try {
        // Get user info from Google
        const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        });
        const userInfo = await userInfoRes.json();

        // Send to backend — use selected role
        const res = await fetch(`${API_BASE}/api/auth/google`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: userInfo.email,
            name: userInfo.name,
            role, // uses the role toggle the user selected
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          setIsError(true);
          setMessage(data?.error?.message || "Google sign-up failed.");
          return;
        }
        localStorage.setItem("accessToken", data.data.accessToken);
        localStorage.setItem("refreshToken", data.data.refreshToken);
        localStorage.setItem("user", JSON.stringify(data.data.user));
        setIsError(false);
        setMessage("Account created! Redirecting...");
        setTimeout(() => { window.location.href = "/home"; }, 1200);
      } catch (err) {
        setIsError(true);
        setMessage("Google sign-up failed. Please try again.");
      } finally {
        setGoogleLoading(false);
      }
    },
    onError: () => {
      setIsError(true);
      setMessage("Google sign-in was cancelled or failed.");
    },
  });

  return (
    <div className="reg-page">

      {/* ── LEFT PANEL ── */}
      <div className="reg-left-panel">
        <div className="reg-deco reg-deco--1" />
        <div className="reg-deco reg-deco--2" />
        <div className="reg-deco reg-deco--3" />
        <div className="reg-accent-line" />

        <div className="reg-brand-logo">
          <img src={logo} alt="CebuNest Logo" className="reg-logo-img" />
        </div>

        <div className="reg-brand-info">
          <div className="reg-brand-eyebrow">
            <div className="reg-eyebrow-line" />
            <span className="reg-eyebrow-text">Property Management</span>
          </div>
          <h2 className="reg-brand-heading">Find Your Perfect Home in Cebu</h2>
          <p className="reg-brand-body">
            Join thousands of tenants and property owners already using CebuNest.
            Create your account and get started in minutes.
          </p>
        </div>

        <div className="reg-features">
          <div className="reg-feature-item">
            <div className="reg-feature-icon">🏠</div>
            <div className="reg-feature-text">
              <span className="reg-feature-title">Browse Listings</span>
              <span className="reg-feature-desc">Filter by location and price</span>
            </div>
          </div>
          <div className="reg-feature-item">
            <div className="reg-feature-icon">📋</div>
            <div className="reg-feature-text">
              <span className="reg-feature-title">Submit Requests</span>
              <span className="reg-feature-desc">Easy rental applications</span>
            </div>
          </div>
          <div className="reg-feature-item">
            <div className="reg-feature-icon">💳</div>
            <div className="reg-feature-text">
              <span className="reg-feature-title">Secure Payments</span>
              <span className="reg-feature-desc">Powered by PayMongo</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className="reg-right-panel">
        <div className="reg-form-card">

          <div className="reg-form-header">
            <div className="reg-form-eyebrow">
              <div className="reg-header-dot" />
              <span className="reg-header-eyebrow-text">New Account</span>
            </div>
            <h2 className="reg-form-heading">Create Account</h2>
            <p className="reg-form-subheading">Fill in your details to get started.</p>
          </div>

          {/* Role Selector — used by both email and Google signup */}
          <div className="reg-role-group">
            <span className="reg-role-label">I am a</span>
            <div className="reg-role-toggle">
              <button
                type="button"
                className={`reg-role-btn${role === "TENANT" ? " reg-role-btn--active" : ""}`}
                onClick={() => setRole("TENANT")}
              >
                🏡 Tenant
              </button>
              <button
                type="button"
                className={`reg-role-btn${role === "OWNER" ? " reg-role-btn--active" : ""}`}
                onClick={() => setRole("OWNER")}
              >
                🔑 Owner
              </button>
            </div>
          </div>

          {/* Google Sign-Up Button */}
          <button
            className="reg-google-btn"
            type="button"
            onClick={() => handleGoogleRegister()}
            disabled={loading || googleLoading}
          >
            {googleLoading ? (
              <span className="reg-spinner" />
            ) : (
              <svg className="reg-google-icon" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            <span>{googleLoading ? "Signing up…" : `Continue with Google as ${role === "TENANT" ? "Tenant" : "Owner"}`}</span>
          </button>

          <div className="reg-divider">
            <div className="reg-divider-line" />
            <span className="reg-divider-text">or sign up with email</span>
            <div className="reg-divider-line" />
          </div>

          <form className="reg-form-fields" onSubmit={handleRegister}>

            {/* Name */}
            <div className="reg-field-group">
              <label className="reg-field-label" htmlFor="cn-reg-name">Name</label>
              <div className="reg-field-wrap">
                <span className="reg-field-icon">👤</span>
                <input
                  className="reg-field-input" type="text" id="cn-reg-name"
                  placeholder="Juan dela Cruz" value={name}
                  onChange={(e) => setName(e.target.value)} required
                />
              </div>
            </div>

            {/* Phone */}
            <div className="reg-field-group">
              <label className="reg-field-label" htmlFor="cn-reg-phone">Phone Number</label>
              <div className="reg-field-wrap">
                <span className="reg-field-icon">📞</span>
                <input
                  className="reg-field-input" type="tel" id="cn-reg-phone"
                  placeholder="+63 912 345 6789" value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)} required
                />
              </div>
            </div>

            {/* Email */}
            <div className="reg-field-group">
              <label className="reg-field-label" htmlFor="cn-reg-email">Email Address</label>
              <div className="reg-field-wrap">
                <span className="reg-field-icon">✉</span>
                <input
                  className="reg-field-input" type="email" id="cn-reg-email"
                  placeholder="you@example.com" value={email}
                  onChange={(e) => setEmail(e.target.value)} required
                />
              </div>
            </div>

            {/* Password */}
            <div className="reg-field-group">
              <label className="reg-field-label" htmlFor="cn-reg-password">Password</label>
              <div className="reg-field-wrap">
                <span className="reg-field-icon">🔒</span>
                <input
                  className="reg-field-input" type="password" id="cn-reg-password"
                  placeholder="Min. 8 characters" value={password}
                  onChange={(e) => setPassword(e.target.value)} required minLength={8}
                />
              </div>
            </div>

            {/* Confirm Password */}
            <div className="reg-field-group">
              <label className="reg-field-label" htmlFor="cn-reg-confirm">Confirm Password</label>
              <div className="reg-field-wrap">
                <span className="reg-field-icon">🔒</span>
                <input
                  className="reg-field-input" type="password" id="cn-reg-confirm"
                  placeholder="Re-enter your password" value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)} required
                />
              </div>
            </div>

            <button className="reg-btn" type="submit" disabled={loading || googleLoading}>
              {loading ? "Creating Account..." : "Create Account"}
            </button>

            {message && (
              <div className={`reg-message${isError ? "" : " reg-message--success"}`}>
                <span>{isError ? "⚠" : "✅"}</span> {message}
              </div>
            )}
          </form>

          <div className="reg-divider">
            <div className="reg-divider-line" />
            <span className="reg-divider-text">or</span>
            <div className="reg-divider-line" />
          </div>

          <div className="reg-links">
            <span className="reg-signin-text">Already have an account?</span>
            <a href="/" className="reg-link reg-link--signin">Sign In →</a>
          </div>

        </div>
      </div>

    </div>
  );
};

export default Register;