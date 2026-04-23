import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import styles from "./ForgotPassword.module.css";
import logo from "../../../assets/images/cebunest-logo.png";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

const ForgotPassword: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (token) navigate("/home", { replace: true });
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data?.error?.message ?? "Something went wrong. Please try again.");
        return;
      }

      setSuccess(true);
      // Short delay then redirect to verify page with email as state
      setTimeout(() => {
        navigate("/forgot-password/verify", { state: { email: email.trim() } });
      }, 1400);
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
          <h2 className={styles.brandHeading}>Reset Your Password</h2>
          <p className={styles.brandBody}>
            No worries — it happens to the best of us. Enter your registered email
            and we'll send you a verification code to get back in.
          </p>
        </div>

        <div className={styles.steps}>
          <div className={`${styles.step} ${styles.stepActive}`}>
            <div className={styles.stepNum}>1</div>
            <div className={styles.stepText}>
              <span className={styles.stepTitle}>Enter Email</span>
              <span className={styles.stepDesc}>We'll send a code here</span>
            </div>
          </div>
          <div className={styles.stepConnector} />
          <div className={styles.step}>
            <div className={styles.stepNum}>2</div>
            <div className={styles.stepText}>
              <span className={styles.stepTitle}>Verify Code</span>
              <span className={styles.stepDesc}>6-digit code from email</span>
            </div>
          </div>
          <div className={styles.stepConnector} />
          <div className={styles.step}>
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
              <span className={styles.headerEyebrowText}>Step 1 of 3</span>
            </div>
            <h2 className={styles.formHeading}>Forgot Password?</h2>
            <p className={styles.formSubheading}>
              Enter the email address linked to your account.
            </p>
          </div>

          <form className={styles.formFields} onSubmit={handleSubmit}>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel} htmlFor="fp-email">
                Email Address
              </label>
              <div className={styles.fieldWrap}>
                <span className={styles.fieldIcon}>✉</span>
                <input
                  id="fp-email"
                  type="email"
                  className={styles.fieldInput}
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(null); }}
                  required
                  disabled={loading || success}
                  autoFocus
                />
              </div>
            </div>

            <button
              type="submit"
              className={`${styles.submitBtn} ${success ? styles.submitBtnSuccess : ""}`}
              disabled={loading || success}
            >
              {loading ? (
                <span className={styles.spinner} />
              ) : success ? (
                <span className={styles.btnSuccessContent}>
                  <span className={styles.successCheck}>✓</span> Code Sent!
                </span>
              ) : (
                "Send Verification Code"
              )}
            </button>

            {error && (
              <div className={`${styles.message} ${styles.messageError}`}>
                <span>⚠</span> {error}
              </div>
            )}

            {success && (
              <div className={`${styles.message} ${styles.messageSuccess}`}>
                <span>✓</span> Code sent! Redirecting to verification…
              </div>
            )}
          </form>

          <div className={styles.links}>
            <Link to="/" className={styles.link}>
              ← Back to Sign In
            </Link>
            <Link to="/register" className={`${styles.link} ${styles.linkSignup}`}>
              Create Account →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;