import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Mail, AlertTriangle, CheckCircle, ArrowLeft, ArrowRight } from "lucide-react";
import styles from "./ForgotPassword.module.css";
import { passwordApi } from "./password.api";

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
      const data = await passwordApi.requestReset(email.trim());
      if (!data.success) {
        setError(data?.error?.message ?? "Something went wrong. Please try again.");
        return;
      }
      setSuccess(true);
      setTimeout(() => {
        navigate("/forgot-password/verify", { state: { email: email.trim() } });
      }, 1400);
    } catch (err: any) {
      const backendMessage = err.response?.data?.error?.message;
      setError(backendMessage || "Unable to connect to the server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
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
            <span className={styles.fieldIcon}><Mail size={18} /></span>
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
            <>
              <CheckCircle size={18} /> Code Sent!
            </>
          ) : (
            "Send Verification Code"
          )}
        </button>

        {error && (
          <div className={`${styles.message} ${styles.messageError}`}>
            <span className={styles.messageIcon}><AlertTriangle size={18} /></span> {error}
          </div>
        )}

        {success && (
          <div className={`${styles.message} ${styles.messageSuccess}`}>
            <span className={styles.messageIcon}><CheckCircle size={18} /></span> Code sent! Redirecting to verification…
          </div>
        )}
      </form>

      <div className={styles.links}>
        <Link to="/" className={styles.link}>
          <ArrowLeft size={16} /> Back to Sign In
        </Link>
        <Link to="/register" className={`${styles.link} ${styles.linkSignup}`}>
          Create Account <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  );
};

export default ForgotPassword;