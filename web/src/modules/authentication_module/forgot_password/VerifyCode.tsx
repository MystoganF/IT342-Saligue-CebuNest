import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { AlertTriangle, CheckCircle, ArrowLeft } from "lucide-react";
import styles from "./ForgotPassword.module.css";
import { passwordApi } from "./password.api";

const VerifyCode: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const email: string = (location.state as any)?.email ?? "";

  useEffect(() => {
    if (!email) navigate("/forgot-password", { replace: true });
  }, [email, navigate]);

  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [resendLoading, setResendLoading] = useState(false);
  const [resendMsg, setResendMsg] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(60);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    if (resendCooldown <= 0) { setCanResend(true); return; }
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const handleDigitChange = (index: number, value: string) => {
    const cleaned = value.replace(/\D/g, "").slice(-1);
    const updated = [...digits];
    updated[index] = cleaned;
    setDigits(updated);
    setError(null);

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
      const data = await passwordApi.verifyCode(email, code);
      if (!data.success) {
        setError(data?.error?.message ?? "Invalid or expired code. Please try again.");
        return;
      }
      setSuccess(true);
      setTimeout(() => {
        navigate("/forgot-password/reset", { state: { email, code } });
      }, 1200);
    } catch (err: any) {
      const backendMessage = err.response?.data?.error?.message;
      setError(backendMessage || "Unable to connect to the server. Please try again.");
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
      const data = await passwordApi.requestReset(email);
      if (!data.success) {
        setResendMsg("Failed to resend. Please try again.");
        return;
      }
      setResendMsg("A new code has been sent to your email.");
      setCanResend(false);
      setResendCooldown(60);
      setDigits(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } catch (err: any) {
      const backendMessage = err.response?.data?.error?.message;
      setResendMsg(backendMessage || "Network error. Please try again.");
    } finally {
      setResendLoading(false);
    }
  };

  return (
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
            <>
              <CheckCircle size={18} /> Verified!
            </>
          ) : (
            "Verify Code"
          )}
        </button>

        {error && (
          <div className={`${styles.message} ${styles.messageError}`}>
            <span className={styles.messageIcon}><AlertTriangle size={18} /></span> {error}
          </div>
        )}

        {success && (
          <div className={`${styles.message} ${styles.messageSuccess}`}>
            <span className={styles.messageIcon}><CheckCircle size={18} /></span> Code verified! Redirecting…
          </div>
        )}
      </form>

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
        <div className={`${styles.message} ${resendMsg.includes("sent") ? styles.messageSuccess : styles.messageError}`} style={{ marginTop: "8px" }}>
          <span className={styles.messageIcon}>{resendMsg.includes("sent") ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}</span> {resendMsg}
        </div>
      )}

      <div className={styles.links}>
        <Link to="/forgot-password" className={styles.link}>
          <ArrowLeft size={16} /> Change Email
        </Link>
        <Link to="/" className={styles.link}>
          Back to Sign In
        </Link>
      </div>
    </div>
  );
};

export default VerifyCode;