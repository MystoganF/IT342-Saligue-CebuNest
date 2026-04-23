import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import styles from "./ForgotPassword.module.css";
import logo from "../../../assets/images/cebunest-logo.png";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

const VerifyCode: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Email passed from ForgotPassword page
  const email: string = (location.state as any)?.email ?? "";

  // Redirect back if no email in state
  useEffect(() => {
    if (!email) navigate("/forgot-password", { replace: true });
  }, [email, navigate]);

  // 6 individual digit inputs
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Resend state
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMsg, setResendMsg] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(60);
  const [canResend, setCanResend] = useState(false);

  // Countdown timer
  useEffect(() => {
    if (resendCooldown <= 0) { setCanResend(true); return; }
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  // Handle digit input
  const handleDigitChange = (index: number, value: string) => {
    const cleaned = value.replace(/\D/g, "").slice(-1);
    const updated = [...digits];
    updated[index] = cleaned;
    setDigits(updated);
    setError(null);

    // Auto-advance
    if (cleaned && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const updated = [...digits];
    for (let i = 0; i < pasted.length; i++) updated[i] = pasted[i];
    setDigits(updated);
    inputRefs.current[Math.min(pasted.length, 5)]?.focus();
  };

  const code = digits.join("");
  const isComplete = code.length === 6;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isComplete) { setError("Please enter all 6 digits."); return; }
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/verify-reset-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data?.error?.message ?? "Invalid or expired code. Please try again.");
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        navigate("/forgot-password/reset", { state: { email, code } });
      }, 1200);
    } catch {
      setError("Unable to connect to the server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!canResend) return;
    setResendLoading(true);
    setResendMsg(null);
    setError(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setResendMsg("Failed to resend. Please try again.");
        return;
      }

      setResendMsg("A new code has been sent to your email.");
      setCanResend(false);
      setResendCooldown(60);
      setDigits(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } catch {
      setResendMsg("Network error. Please try again.");
    } finally {
      setResendLoading(false);
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
          <h2 className={styles.brandHeading}>Check Your Email</h2>
          <p className={styles.brandBody}>
            We've sent a 6-digit verification code to{" "}
            <strong style={{ color: "#d4ab6a" }}>{email}</strong>. Enter it below
            to continue. The code expires in 15 minutes.
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
          <div className={`${styles.step} ${styles.stepActive}`}>
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
              <span className={styles.headerEyebrowText}>Step 2 of 3</span>
            </div>
            <h2 className={styles.formHeading}>Enter Your Code</h2>
            <p className={styles.formSubheading}>
              We sent a 6-digit code to <strong>{email}</strong>
            </p>
          </div>

          <form className={styles.formFields} onSubmit={handleSubmit}>
            {/* OTP digit inputs */}
            <div className={styles.otpGroup} onPaste={handlePaste}>
              {digits.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => { inputRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  className={`${styles.otpInput} ${digit ? styles.otpInputFilled : ""} ${error ? styles.otpInputError : ""}`}
                  value={digit}
                  onChange={(e) => handleDigitChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  disabled={loading || success}
                  autoFocus={i === 0}
                />
              ))}
            </div>

            <button
              type="submit"
              className={`${styles.submitBtn} ${success ? styles.submitBtnSuccess : ""}`}
              disabled={loading || success || !isComplete}
            >
              {loading ? (
                <span className={styles.spinner} />
              ) : success ? (
                <span className={styles.btnSuccessContent}>
                  <span className={styles.successCheck}>✓</span> Verified!
                </span>
              ) : (
                "Verify Code"
              )}
            </button>

            {error && (
              <div className={`${styles.message} ${styles.messageError}`}>
                <span>⚠</span> {error}
              </div>
            )}

            {success && (
              <div className={`${styles.message} ${styles.messageSuccess}`}>
                <span>✓</span> Code verified! Redirecting…
              </div>
            )}
          </form>

          {/* Resend section */}
          <div className={styles.resendWrap}>
            <span className={styles.resendText}>Didn't receive the code?</span>
            <button
              type="button"
              className={styles.resendBtn}
              onClick={handleResend}
              disabled={!canResend || resendLoading}
            >
              {resendLoading ? (
                <span className={`${styles.spinner} ${styles.spinnerDark}`} />
              ) : canResend ? (
                "Resend Code"
              ) : (
                `Resend in ${resendCooldown}s`
              )}
            </button>
          </div>

          {resendMsg && (
            <div className={`${styles.message} ${resendMsg.includes("sent") ? styles.messageSuccess : styles.messageError}`}
              style={{ marginTop: "8px" }}>
              <span>{resendMsg.includes("sent") ? "✓" : "⚠"}</span> {resendMsg}
            </div>
          )}

          <div className={styles.links}>
            <Link to="/forgot-password" className={styles.link}>
              ← Change Email
            </Link>
            <Link to="/" className={`${styles.link} ${styles.linkSignup}`}>
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyCode;