import React, { useState } from "react";
import "./Register.css";
import logo from "../../../assets/images/cebunest-logo.png";

type Role = "TENANT" | "OWNER";


const Register: React.FC = () => {
  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<Role>("TENANT");
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    // Client-side validation
    if (password !== confirmPassword) {
      setIsError(true);
      setMessage("Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setIsError(true);
      setMessage("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);


  };

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

          <form className="reg-form-fields" onSubmit={handleRegister}>

            {/* Role Selector */}
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

            {/* Name */}
            <div className="reg-field-group">
              <label className="reg-field-label" htmlFor="cn-reg-name">Name</label>
              <div className="reg-field-wrap">
                <span className="reg-field-icon">👤</span>
                <input
                  className="reg-field-input"
                  type="text"
                  id="cn-reg-name"
                  placeholder="Juan dela Cruz"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Phone Number */}
            <div className="reg-field-group">
              <label className="reg-field-label" htmlFor="cn-reg-phone">Phone Number</label>
              <div className="reg-field-wrap">
                <span className="reg-field-icon">📞</span>
                <input
                  className="reg-field-input"
                  type="tel"
                  id="cn-reg-phone"
                  placeholder="+63 912 345 6789"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div className="reg-field-group">
              <label className="reg-field-label" htmlFor="cn-reg-email">Email Address</label>
              <div className="reg-field-wrap">
                <span className="reg-field-icon">✉</span>
                <input
                  className="reg-field-input"
                  type="email"
                  id="cn-reg-email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="reg-field-group">
              <label className="reg-field-label" htmlFor="cn-reg-password">Password</label>
              <div className="reg-field-wrap">
                <span className="reg-field-icon">🔒</span>
                <input
                  className="reg-field-input"
                  type="password"
                  id="cn-reg-password"
                  placeholder="Min. 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </div>
            </div>

            {/* Confirm Password */}
            <div className="reg-field-group">
              <label className="reg-field-label" htmlFor="cn-reg-confirm">Confirm Password</label>
              <div className="reg-field-wrap">
                <span className="reg-field-icon">🔒</span>
                <input
                  className="reg-field-input"
                  type="password"
                  id="cn-reg-confirm"
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button className="reg-btn" type="submit" disabled={loading}>
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