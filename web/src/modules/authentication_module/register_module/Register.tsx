import React, { useState, useEffect } from "react";
import { useGoogleLogin } from "@react-oauth/google";
import { useNavigate, Link } from "react-router-dom";
import styles from "./Register.module.css";
import logo from "../../../assets/images/cebunest-logo.png";

type Role = "TENANT" | "OWNER";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8080";

interface AuthResponse {
  success: boolean;
  data: {
    accessToken?: string;
    refreshToken?: string;
    user?: { role: string; [key: string]: unknown };
    alreadyExists?: boolean;
  };
  error?: { message: string };
}

// ─── helpers ───────────────────────────────────────────────────────────────

function storeTokensAndRedirect(data: AuthResponse) {
  // Only store if tokens actually exist in the response
  if (data.data.accessToken) localStorage.setItem("accessToken", data.data.accessToken);
  if (data.data.refreshToken) localStorage.setItem("refreshToken", data.data.refreshToken);
  if (data.data.user) localStorage.setItem("user", JSON.stringify(data.data.user));

  const role = data.data.user?.role?.toUpperCase();
  let destination = "/home";
  if (role === "ADMIN") destination = "/admin/rental-requests";
  if (role === "OWNER") destination = "/owner/dashboard";

  setTimeout(() => {
    window.location.href = destination;
  }, 1200);
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

const FEATURES = [
  { icon: "🏠", title: "Browse Listings", desc: "Filter by location and price" },
  { icon: "📋", title: "Submit Requests", desc: "Easy rental applications" },
  { icon: "💳", title: "Secure Payments", desc: "Powered by PayMongo" },
];

const ROLES: { value: Role; label: string }[] = [
  { value: "TENANT", label: "🏡 Tenant" },
  { value: "OWNER", label: "🔑 Owner" },
];

const SOCIAL_FIELDS = [
  { id: "cn-reg-fb", label: "Facebook", icon: "f", placeholder: "https://facebook.com/yourprofile", key: "facebookUrl" },
  { id: "cn-reg-ig", label: "Instagram", icon: "in", placeholder: "https://instagram.com/yourhandle", key: "instagramUrl" },
  { id: "cn-reg-tw", label: "X / Twitter", icon: "𝕏", placeholder: "https://x.com/yourhandle", key: "twitterUrl" },
] as const;

// ─── component ─────────────────────────────────────────────────────────────

const Register: React.FC = () => {
  const navigate = useNavigate();

  // ── Auto-Redirect if already logged in ──────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (token) navigate("/home", { replace: true });
  }, [navigate]);

  // Form states
  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<Role>("TENANT");

  // Social states
  const [facebookUrl, setFacebookUrl] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [twitterUrl, setTwitterUrl] = useState("");
  const [showSocial, setShowSocial] = useState(false);

  // UI status states
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [showAlreadyExists, setShowAlreadyExists] = useState(false);

  const setSuccess = (msg: string) => { setIsError(false); setMessage(msg); };
  const setErrorMsg = (msg: string) => { setIsError(true); setMessage(msg); };

  const socialSetters: Record<string, (val: string) => void> = {
    facebookUrl: setFacebookUrl,
    instagramUrl: setInstagramUrl,
    twitterUrl: setTwitterUrl,
  };

  const socialValues: Record<string, string> = {
    facebookUrl, instagramUrl, twitterUrl
  };

  // ── Standard e-mail registration ────────────────────────────────────────
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (password !== confirmPassword) return setErrorMsg("Passwords do not match.");
    if (password.length < 8) return setErrorMsg("Password must be at least 8 characters.");

    setLoading(true);
    try {
      const { res, data } = await postJSON(`${API_BASE}/api/auth/register`, {
        name, phoneNumber, email, password, role,
        facebookUrl: facebookUrl.trim() || undefined,
        instagramUrl: instagramUrl.trim() || undefined,
        twitterUrl: twitterUrl.trim() || undefined,
      });

      if (!res.ok || !data.success) {
        setErrorMsg(data?.error?.message ?? "Registration failed.");
        return;
      }

      setSuccess("Account created! Redirecting...");
      storeTokensAndRedirect(data);
    } catch {
      setErrorMsg("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Google OAuth registration ───────────────────────────────────────────
  const handleGoogleRegister = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setGoogleLoading(true);
      setMessage(null);
      setIsError(false);

      try {
        const { res, data } = await postJSON(`${API_BASE}/api/auth/google`, {
          token: tokenResponse.access_token,
          role, // Sending role tells backend we are in "Register Mode"
        });

        if (!res.ok || !data.success) {
          setErrorMsg(data?.error?.message ?? "Google sign-up failed.");
          return;
        }

        // CRITICAL: If the backend returns alreadyExists, we MUST NOT call storeTokensAndRedirect
        if (data.data?.alreadyExists) {
          setShowAlreadyExists(true);
          setGoogleLoading(false);
          return; // STOP HERE
        }

        // Only proceed to redirect if account was actually created
        setSuccess("Account created! Redirecting...");
        storeTokensAndRedirect(data);
      } catch {
        setErrorMsg("Google sign-up failed. Please try again.");
      } finally {
        setGoogleLoading(false);
      }
    },
    onError: () => setErrorMsg("Google sign-in failed."),
  });

  return (
        <div className={styles.page}>
          {showAlreadyExists && (
      <div className={styles.modalOverlay} onClick={() => setShowAlreadyExists(false)}>
        <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
          <div className={styles.modalHeader}>
            <div className={styles.modalIcon}>⚠️</div>
            <h3 className={styles.modalTitle}>Account Already Exists</h3>
            <p className={styles.modalSubtitle}>
              This Google account is already registered with CebuNest. 
              Please sign in instead.
            </p>
          </div>

          {/* Wrap both buttons in modalActions */}
          <div className={styles.modalActions}>
            <Link to="/" className={styles.modalSigninBtn}>
              Go to Sign In →
            </Link>
            
            <button 
              className={styles.modalCloseBtn} 
              onClick={() => setShowAlreadyExists(false)}
            >
              Try Another Account
            </button>
          </div>

          <p className={styles.modalNote}>
            Registration is restricted to one account per email.
          </p>
        </div>
      </div>
    )}

      {/* ══ LEFT PANEL ═════════════════════════════════════════════════════ */}
      <div className={styles.leftPanel}>
        <div className={`${styles.deco} ${styles.deco1}`} />
        <div className={`${styles.deco} ${styles.deco2}`} />
        <div className={`${styles.deco} ${styles.deco3}`} />
        <div className={styles.accentLine} />

        <div className={styles.brandLogo}>
          <img src={logo} alt="CebuNest Logo" className={styles.logoImg} />
        </div>

        <div className={styles.brandInfo}>
          <div className={styles.brandEyebrow}>
            <div className={styles.eyebrowLine} />
            <span className={styles.eyebrowText}>Property Management</span>
          </div>
          <h2 className={styles.brandHeading}>Find Your Perfect Home in Cebu</h2>
          <p className={styles.brandBody}>
            Join thousands of tenants and property owners using CebuNest. 
            Streamline your rental experience today.
          </p>
        </div>

        <div className={styles.features}>
          {FEATURES.map(({ icon, title, desc }) => (
            <div key={title} className={styles.featureItem}>
              <div className={styles.featureIcon}>{icon}</div>
              <div className={styles.featureText}>
                <span className={styles.featureTitle}>{title}</span>
                <span className={styles.featureDesc}>{desc}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ══ RIGHT PANEL ════════════════════════════════════════════════════ */}
      <div className={styles.rightPanel}>
        <div className={styles.formCard}>
          <div className={styles.formHeader}>
            <div className={styles.formEyebrow}>
              <div className={styles.headerDot} />
              <span className={styles.headerEyebrowText}>New Account</span>
            </div>
            <h2 className={styles.formHeading}>Create Account</h2>
            <p className={styles.formSubheading}>Fill in your details to get started.</p>
          </div>

          <div className={styles.roleGroup}>
            <span className={styles.roleGroupLabel}>I am a</span>
            <div className={styles.roleToggle}>
              {ROLES.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  className={`${styles.roleBtn} ${role === value ? styles.roleBtnActive : ""}`}
                  onClick={() => setRole(value)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <button
            className={styles.googleBtn}
            type="button"
            onClick={() => handleGoogleRegister()}
            disabled={loading || googleLoading}
          >
            {googleLoading ? (
              <span className={styles.spinner} />
            ) : (
              <svg className={styles.googleIcon} viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            <span>
              {googleLoading ? "Signing up…" : `Continue with Google as ${role === "TENANT" ? "Tenant" : "Owner"}`}
            </span>
          </button>

          <div className={styles.divider}>
            <div className={styles.dividerLine} />
            <span className={styles.dividerText}>or sign up with email</span>
            <div className={styles.dividerLine} />
          </div>

          <form className={styles.formFields} onSubmit={handleRegister}>
            {[
              { id: "cn-reg-name", label: "Name", icon: "👤", type: "text", placeholder: "Juan dela Cruz", value: name, onChange: setName },
              { id: "cn-reg-phone", label: "Phone Number", icon: "📞", type: "tel", placeholder: "+63 912 345 6789", value: phoneNumber, onChange: setPhoneNumber },
              { id: "cn-reg-email", label: "Email Address", icon: "✉", type: "email", placeholder: "you@example.com", value: email, onChange: setEmail },
              { id: "cn-reg-pass", label: "Password", icon: "🔒", type: "password", placeholder: "Min. 8 characters", value: password, onChange: setPassword },
              { id: "cn-reg-confirm", label: "Confirm Password", icon: "🔒", type: "password", placeholder: "Re-enter password", value: confirmPassword, onChange: setConfirmPassword },
            ].map(({ id, label, icon, type, placeholder, value, onChange }) => (
              <div key={id} className={styles.fieldGroup}>
                <label className={styles.fieldLabel} htmlFor={id}>{label}</label>
                <div className={styles.fieldWrap}>
                  <span className={styles.fieldIcon}>{icon}</span>
                  <input
                    id={id}
                    type={type}
                    className={styles.fieldInput}
                    placeholder={placeholder}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    required
                    disabled={loading || googleLoading}
                  />
                </div>
              </div>
            ))}

            <button
              type="button"
              className={styles.socialToggle}
              onClick={() => setShowSocial((v) => !v)}
            >
              <span className={styles.socialToggleIcon}>{showSocial ? "▲" : "▼"}</span>
              {showSocial ? "Hide social links" : "Add social links (optional)"}
            </button>

            {showSocial && (
              <div className={styles.socialSection}>
                {SOCIAL_FIELDS.map(({ id, label, icon, placeholder, key }) => (
                  <div key={id} className={styles.fieldGroup}>
                    <label className={styles.fieldLabel} htmlFor={id}>
                      <span className={styles.socialBadge}>{icon}</span> {label}
                    </label>
                    <div className={styles.fieldWrap}>
                      <span className={`${styles.fieldIcon} ${styles.socialFieldIcon}`}>{icon}</span>
                      <input
                        id={id}
                        type="url"
                        className={styles.fieldInput}
                        placeholder={placeholder}
                        value={socialValues[key]}
                        onChange={(e) => socialSetters[key](e.target.value)}
                        disabled={loading || googleLoading}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              type="submit"
              className={styles.submitBtn}
              disabled={loading || googleLoading}
            >
              {loading ? <span className={styles.spinner} /> : "Create Account"}
            </button>

            {message && (
              <div className={`${styles.message} ${isError ? styles.messageError : styles.messageSuccess}`}>
                <span>{isError ? "⚠" : "✅"}</span> {message}
              </div>
            )}
          </form>

          <div className={styles.links}>
            <span className={styles.signinText}>Already have an account?</span>
            <Link to="/" className={`${styles.link} ${styles.linkSignin}`}>Sign In →</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;