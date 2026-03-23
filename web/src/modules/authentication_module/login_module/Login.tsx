import React, { useState } from "react";
import { useGoogleLogin } from "@react-oauth/google";
import styles from "./Login.module.css";
import logo from "../../../assets/images/cebunest-logo.png";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

type Role = "TENANT" | "OWNER";

interface PendingGoogleUser {
  email: string;
  name: string;
}

interface AuthResponse {
  success: boolean;
  data: {
    accessToken: string;
    refreshToken: string;
    user: { role: string };
    requiresRoleSelection?: boolean;
  };
  error?: { message: string };
}

// ─── helpers ───────────────────────────────────────────────────────────────

function storeTokensAndRedirect(data: AuthResponse) {
  localStorage.setItem("accessToken", data.data.accessToken);
  localStorage.setItem("refreshToken", data.data.refreshToken);
  localStorage.setItem("user", JSON.stringify(data.data.user));

  const role = data.data.user?.role?.toUpperCase();
  const destination = role === "ADMIN" ? "/admin/dashboard" : "/home";
  setTimeout(() => { window.location.href = destination; }, 1200);
}

async function postJSON(url: string, body: object): Promise<{ res: Response; data: AuthResponse }> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data: AuthResponse = await res.json();
  return { res, data };
}

// ─── component ─────────────────────────────────────────────────────────────

const Login: React.FC = () => {
  // Form state
  const [email, setEmail]             = useState("");
  const [password, setPassword]       = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // UI state
  const [isLoading, setIsLoading]     = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [success, setSuccess]         = useState(false);

  // Role-picker modal state
  const [showRolePicker, setShowRolePicker]     = useState(false);
  const [pendingGoogleUser, setPendingGoogleUser] = useState<PendingGoogleUser | null>(null);
  const [selectedRole, setSelectedRole]         = useState<Role>("TENANT");
  const [roleSubmitting, setRoleSubmitting]     = useState(false);

  // ── Standard e-mail / password login ────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const { res, data } = await postJSON(`${API_BASE_URL}/api/auth/login`, { email, password });

      if (!res.ok || !data.success) {
        const msg = data?.error?.message
          ?? (res.status === 401 ? "Invalid email or password." : "Login failed. Please try again.");
        setError(msg);
        return;
      }

      setSuccess(true);
      storeTokensAndRedirect(data);
    } catch {
      setError("Unable to connect to the server. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Google OAuth login ───────────────────────────────────────────────────
  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setGoogleLoading(true);
      setError(null);

      try {
        // 1. Fetch the user's profile from Google
        const profileRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        });
        const profile = await profileRes.json();

        // 2. Check if this Google account already exists in our backend
        //    (no role sent → backend just checks existence)
        const { res, data } = await postJSON(`${API_BASE_URL}/api/auth/google`, {
          email: profile.email,
          name: profile.name,
        });

        if (!res.ok || !data.success) {
          setError(data?.error?.message ?? "Google login failed.");
          return;
        }

        // 3a. New user — let them pick a role first
        if (data.data?.requiresRoleSelection) {
          setPendingGoogleUser({ email: profile.email, name: profile.name });
          setShowRolePicker(true);
          return;
        }

        // 3b. Existing user — log them straight in
        setSuccess(true);
        storeTokensAndRedirect(data);
      } catch {
        setError("Google login failed. Please try again.");
      } finally {
        setGoogleLoading(false);
      }
    },
    onError: () => setError("Google sign-in was cancelled or failed."),
  });

  // ── Role selection (new Google users only) ──────────────────────────────
  const handleRoleSubmit = async () => {
    if (!pendingGoogleUser) return;
    setRoleSubmitting(true);
    setError(null);

    try {
      const { res, data } = await postJSON(`${API_BASE_URL}/api/auth/google`, {
        email: pendingGoogleUser.email,
        name: pendingGoogleUser.name,
        role: selectedRole,
      });

      if (!res.ok || !data.success) {
        setError(data?.error?.message ?? "Account creation failed.");
        setShowRolePicker(false);
        return;
      }

      setShowRolePicker(false);
      setSuccess(true);
      storeTokensAndRedirect(data);
    } catch {
      setError("Something went wrong. Please try again.");
      setShowRolePicker(false);
    } finally {
      setRoleSubmitting(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className={styles.page}>

      {/* ══ ROLE PICKER MODAL ══════════════════════════════════════════════ */}
      {showRolePicker && (
        <div
          className={styles.modalOverlay}
          onClick={() => !roleSubmitting && setShowRolePicker(false)}
        >
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>

            <div className={styles.modalHeader}>
              <div className={styles.modalIcon}>👋</div>
              <h3 className={styles.modalTitle}>Welcome to CebuNest!</h3>
              <p className={styles.modalSubtitle}>
                Looks like you're new here. How will you be using CebuNest?
              </p>
            </div>

            <div className={styles.modalRoles}>
              {(["TENANT", "OWNER"] as Role[]).map((role) => {
                const isActive = selectedRole === role;
                const meta = {
                  TENANT: { icon: "🏡", label: "Tenant", desc: "I'm looking to rent a property" },
                  OWNER:  { icon: "🔑", label: "Owner",  desc: "I'm listing a property to rent out" },
                }[role];

                return (
                  <button
                    key={role}
                    className={`${styles.roleBtn} ${isActive ? styles.roleBtnActive : ""}`}
                    onClick={() => setSelectedRole(role)}
                    disabled={roleSubmitting}
                  >
                    <span className={styles.roleIcon}>{meta.icon}</span>
                    <span className={styles.roleTextGroup}>
                      <span className={styles.roleLabel}>{meta.label}</span>
                      <span className={styles.roleDesc}>{meta.desc}</span>
                    </span>
                    {isActive && <span className={styles.roleCheck}>✓</span>}
                  </button>
                );
              })}
            </div>

            <button
              className={styles.modalConfirmBtn}
              onClick={handleRoleSubmit}
              disabled={roleSubmitting}
            >
              {roleSubmitting
                ? <span className={styles.modalSpinner} />
                : `Continue as ${selectedRole === "TENANT" ? "Tenant" : "Owner"}`}
            </button>

            <p className={styles.modalNote}>
              You can't change your role later, so choose carefully.
            </p>
          </div>
        </div>
      )}

      {/* ══ LEFT PANEL ═════════════════════════════════════════════════════ */}
      <div className={styles.leftPanel}>
        <div className={styles.deco + " " + styles.deco1} />
        <div className={styles.deco + " " + styles.deco2} />
        <div className={styles.deco + " " + styles.deco3} />
        <div className={styles.accentLine} />

        <div className={styles.brandLogo}>
          <img src={logo} alt="CebuNest Logo" className={styles.logoImg} />
        </div>

        <div className={styles.brandInfo}>
          <div className={styles.brandEyebrow}>
            <div className={styles.eyebrowLine} />
            <span className={styles.eyebrowText}>Property Management</span>
          </div>
          <h2 className={styles.brandHeading}>Your Home in Cebu Awaits</h2>
          <p className={styles.brandBody}>
            Streamlined rental management for tenants and property owners.
            Browse listings, submit rental requests, and manage bookings — all in one place.
          </p>
        </div>

        <div className={styles.stats}>
          {[
            { number: "240+", label: "Active Listings" },
            { number: "1.2k", label: "Happy Tenants"   },
            { number: "98%",  label: "Satisfaction"    },
          ].map(({ number, label }) => (
            <div key={label} className={styles.statItem}>
              <span className={styles.statNumber}>{number}</span>
              <span className={styles.statLabel}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ══ RIGHT PANEL ════════════════════════════════════════════════════ */}
      <div className={styles.rightPanel}>
        <div className={styles.formCard}>

          {/* Header */}
          <div className={styles.formHeader}>
            <div className={styles.formEyebrow}>
              <div className={styles.headerDot} />
              <span className={styles.headerEyebrowText}>Secure Access</span>
            </div>
            <h2 className={styles.formHeading}>Welcome Back</h2>
            <p className={styles.formSubheading}>Sign in to manage your properties and rentals.</p>
          </div>

          {/* Google sign-in */}
          <button
            className={styles.googleBtn}
            type="button"
            onClick={() => handleGoogleLogin()}
            disabled={isLoading || success || googleLoading}
          >
            {googleLoading ? (
              <span className={`${styles.spinner} ${styles.spinnerDark}`} />
            ) : (
              <svg className={styles.googleIcon} viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            <span>{googleLoading ? "Signing in…" : "Continue with Google"}</span>
          </button>

          {/* Divider */}
          <div className={styles.divider}>
            <div className={styles.dividerLine} />
            <span className={styles.dividerText}>or sign in with email</span>
            <div className={styles.dividerLine} />
          </div>

          {/* E-mail / password form */}
          <form className={styles.formFields} onSubmit={handleLogin}>

            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel} htmlFor="cn-login-email">
                Email Address
              </label>
              <div className={styles.fieldWrap}>
                <span className={styles.fieldIcon}>✉</span>
                <input
                  id="cn-login-email"
                  type="email"
                  className={styles.fieldInput}
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(null); }}
                  required
                  disabled={isLoading || success}
                />
              </div>
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel} htmlFor="cn-login-password">
                Password
              </label>
              <div className={styles.fieldWrap}>
                <span className={styles.fieldIcon}>🔒</span>
                <input
                  id="cn-login-password"
                  type={showPassword ? "text" : "password"}
                  className={styles.fieldInput}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(null); }}
                  required
                  disabled={isLoading || success}
                />
                <button
                  type="button"
                  className={styles.togglePassword}
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  tabIndex={-1}
                >
                  {showPassword ? "🙈" : "👁"}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className={`${styles.submitBtn} ${success ? styles.submitBtnSuccess : ""}`}
              disabled={isLoading || success}
            >
              {isLoading ? (
                <span className={styles.spinner} />
              ) : success ? (
                <span className={styles.btnSuccessContent}>
                  <span className={styles.successCheck}>✓</span> Login Successful
                </span>
              ) : "Sign In"}
            </button>

            {error && (
              <div className={`${styles.message} ${styles.messageError}`}>
                <span>⚠</span> {error}
              </div>
            )}
            {success && (
              <div className={`${styles.message} ${styles.messageSuccess}`}>
                <span>✓</span> Welcome back! Redirecting you now…
              </div>
            )}
          </form>

          {/* Footer links */}
          <div className={styles.links}>
            <a href="/forgot-password" className={styles.link}>Forgot Password?</a>
            <a href="/register" className={`${styles.link} ${styles.linkSignup}`}>Create Account →</a>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Login;