import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import styles from "./ForgotPassword.module.css";
import logo from "../../../assets/images/cebunest-logo.png";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

const ResetPassword: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const email: string = (location.state as any)?.email ?? "";
  const code: string = (location.state as any)?.code ?? "";

  // Guard: redirect if missing context
  useEffect(() => {
    if (!email || !code) navigate("/forgot-password", { replace: true });
  }, [email, code, navigate]);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Live password strength
  const getStrength = (pw: string): { label: string; level: number; color: string } => {
    if (!pw) return { label: "", level: 0, color: "transparent" };
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    if (score <= 1) return { label: "Weak", level: 1, color: "#c0392b" };
    if (score === 2) return { label: "Fair", level: 2, color: "#b78e42" };
    if (score === 3) return { label: "Good", level: 3, color: "#53a4a3" };
    return { label: "Strong", level: 4, color: "#1a7a4a" };
  };

  const strength = getStrength(password);
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;
  const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, newPassword: password }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data?.error?.message ?? "Failed to reset password. Please try again.");
        return;
      }

      setSuccess(true);
      setTimeout(() => navigate("/", { replace: true }), 2000);
    } catch {
      setError("Unable to connect to the server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      {/* ── Left Panel ── */}
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
            <span className={styles.eyebrowText}>Account Recovery</span>
          </div>
          <h2 className={styles.brandHeading}>Almost There!</h2>
          <p className={styles.brandBody}>
            Create a strong new password for your account. Use a mix of letters,
            numbers, and symbols for the best security.
          </p>
        </div>

        <div className={styles.steps}>
          <div className={styles.step}>
            <div className={`${styles.stepNum} ${styles.stepDone}`}>✓</div>
            <div className={styles.stepText}>
              <span className={styles.stepTitle}>Enter Email</span>
              <span className={styles.stepDesc}>Done</span>
            </div>
          </div>
          <div className={styles.stepConnector} />
          <div className={styles.step}>
            <div className={`${styles.stepNum} ${styles.stepDone}`}>✓</div>
            <div className={styles.stepText}>
              <span className={styles.stepTitle}>Verify Code</span>
              <span className={styles.stepDesc}>Done</span>
            </div>
          </div>
          <div className={styles.stepConnector} />
          <div className={`${styles.step} ${styles.stepActive}`}>
            <div className={styles.stepNum}>3</div>
            <div className={styles.stepText}>
              <span className={styles.stepTitle}>New Password</span>
              <span className={styles.stepDesc}>Set your new credentials</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right Panel ── */}
      <div className={styles.rightPanel}>
        <div className={styles.formCard}>
          <div className={styles.formHeader}>
            <div className={styles.formEyebrow}>
              <div className={styles.headerDot} />
              <span className={styles.headerEyebrowText}>Step 3 of 3</span>
            </div>
            <h2 className={styles.formHeading}>Set New Password</h2>
            <p className={styles.formSubheading}>
              Choose a strong password for <strong>{email}</strong>
            </p>
          </div>

          <form className={styles.formFields} onSubmit={handleSubmit}>
            {/* New Password */}
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel} htmlFor="rp-password">
                New Password
              </label>
              <div className={styles.fieldWrap}>
                <span className={styles.fieldIcon}>🔒</span>
                <input
                  id="rp-password"
                  type={showPassword ? "text" : "password"}
                  className={styles.fieldInput}
                  placeholder="Min. 8 characters"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(null); }}
                  required
                  disabled={loading || success}
                  autoFocus
                />
                <button
                  type="button"
                  className={styles.togglePassword}
                  onClick={() => setShowPassword((p) => !p)}
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "🙈" : "👁"}
                </button>
              </div>

              {/* Strength meter */}
              {password.length > 0 && (
                <div className={styles.strengthWrap}>
                  <div className={styles.strengthBars}>
                    {[1, 2, 3, 4].map((level) => (
                      <div
                        key={level}
                        className={styles.strengthBar}
                        style={{
                          background: level <= strength.level ? strength.color : "#e5eced",
                          transition: "background 0.3s",
                        }}
                      />
                    ))}
                  </div>
                  <span className={styles.strengthLabel} style={{ color: strength.color }}>
                    {strength.label}
                  </span>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel} htmlFor="rp-confirm">
                Confirm Password
              </label>
              <div className={styles.fieldWrap}>
                <span className={styles.fieldIcon}>🔒</span>
                <input
                  id="rp-confirm"
                  type={showConfirm ? "text" : "password"}
                  className={`${styles.fieldInput} ${passwordsMismatch ? styles.fieldInputError : ""} ${passwordsMatch ? styles.fieldInputSuccess : ""}`}
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setError(null); }}
                  required
                  disabled={loading || success}
                />
                <button
                  type="button"
                  className={styles.togglePassword}
                  onClick={() => setShowConfirm((p) => !p)}
                  tabIndex={-1}
                  aria-label={showConfirm ? "Hide" : "Show"}
                >
                  {showConfirm ? "🙈" : "👁"}
                </button>
              </div>
              {passwordsMismatch && (
                <span className={styles.fieldHint} style={{ color: "#c0392b" }}>
                  ⚠ Passwords do not match
                </span>
              )}
              {passwordsMatch && (
                <span className={styles.fieldHint} style={{ color: "#1a7a4a" }}>
                  ✓ Passwords match
                </span>
              )}
            </div>

            <button
              type="submit"
              className={`${styles.submitBtn} ${success ? styles.submitBtnSuccess : ""}`}
              disabled={loading || success || passwordsMismatch}
            >
              {loading ? (
                <span className={styles.spinner} />
              ) : success ? (
                <span className={styles.btnSuccessContent}>
                  <span className={styles.successCheck}>✓</span> Password Reset!
                </span>
              ) : (
                "Reset Password"
              )}
            </button>

            {error && (
              <div className={`${styles.message} ${styles.messageError}`}>
                <span>⚠</span> {error}
              </div>
            )}

            {success && (
              <div className={`${styles.message} ${styles.messageSuccess}`}>
                <span>✓</span> Password updated successfully! Redirecting to login…
              </div>
            )}
          </form>

          <div className={styles.links}>
            <Link to="/" className={styles.link}>
              ← Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;