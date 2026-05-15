import React, { useState, useEffect } from "react";
import { useGoogleLogin } from "@react-oauth/google";
import { useNavigate, Link } from "react-router-dom";
import { User, Phone, Mail, Lock, ChevronDown, ChevronUp, AlertTriangle, CheckCircle, Home, Key } from "lucide-react";
import styles from "./Register.module.css";

import type { Role } from "../shared/auth.types";
import { storeTokensAndRedirect } from "../shared/auth.utils";
import { registerApi } from "./register.api";

// Custom SVGs to replace missing Lucide brand icons
const FacebookIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>;
const InstagramIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>;
const TwitterIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path></svg>;

const ROLES: { value: Role; label: string; icon: React.ReactNode }[] = [
  { value: "TENANT", label: "Tenant", icon: <Home size={16} /> },
  { value: "OWNER", label: "Owner", icon: <Key size={16} /> },
];

const SOCIAL_FIELDS = [
  { id: "cn-reg-fb", label: "Facebook", icon: <FacebookIcon />, placeholder: "https://facebook.com/yourprofile", key: "facebookUrl" },
  { id: "cn-reg-ig", label: "Instagram", icon: <InstagramIcon />, placeholder: "https://instagram.com/yourhandle", key: "instagramUrl" },
  { id: "cn-reg-tw", label: "X / Twitter", icon: <TwitterIcon />, placeholder: "https://x.com/yourhandle", key: "twitterUrl" },
] as const;

const Register: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (token) navigate("/home", { replace: true });
  }, [navigate]);

  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<Role>("TENANT");
  
  const [facebookUrl, setFacebookUrl] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [twitterUrl, setTwitterUrl] = useState("");
  const [showSocial, setShowSocial] = useState(false);

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [showAlreadyExists, setShowAlreadyExists] = useState(false);

  const setSuccess = (msg: string) => { setIsError(false); setMessage(msg); };
  const setErrorMsg = (msg: string) => { setIsError(true); setMessage(msg); };

  const socialSetters: Record<string, (val: string) => void> = { facebookUrl: setFacebookUrl, instagramUrl: setInstagramUrl, twitterUrl: setTwitterUrl };
  const socialValues: Record<string, string> = { facebookUrl, instagramUrl, twitterUrl };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (password !== confirmPassword) return setErrorMsg("Passwords do not match.");
    if (password.length < 8) return setErrorMsg("Password must be at least 8 characters.");

    setLoading(true);
    try {
      const data = await registerApi.register({
        name, phoneNumber, email, password, confirmPassword, role,
        facebookUrl: facebookUrl.trim() || undefined,
        instagramUrl: instagramUrl.trim() || undefined,
        twitterUrl: twitterUrl.trim() || undefined,
      });

      if (!data.success) {
        setErrorMsg(data?.error?.message ?? "Registration failed.");
        return;
      }
      setSuccess("Account created! Redirecting...");
      storeTokensAndRedirect(data);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error?.message || "Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRegister = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setGoogleLoading(true);
      setMessage(null);
      setIsError(false);

      try {
        const data = await registerApi.googleRegister(tokenResponse.access_token, role);
        if (!data.success) {
          setErrorMsg(data?.error?.message ?? "Google sign-up failed.");
          return;
        }
        if (data.data?.alreadyExists) {
          setShowAlreadyExists(true);
          setGoogleLoading(false);
          return; 
        }
        setSuccess("Account created! Redirecting...");
        storeTokensAndRedirect(data);
      } catch (err: any) {
        setErrorMsg(err.response?.data?.error?.message || "Google sign-up failed. Please try again.");
      } finally {
        setGoogleLoading(false);
      }
    },
    onError: () => setErrorMsg("Google sign-in failed."),
  });

  return (
    <>
      {showAlreadyExists && (
        <div className={styles.modalOverlay} onClick={() => setShowAlreadyExists(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalIconWrap}><AlertTriangle size={32} /></div>
              <h3 className={styles.modalTitle}>Account Already Exists</h3>
              <p className={styles.modalSubtitle}>This Google account is already registered with CebuNest. Please sign in instead.</p>
            </div>
            <div className={styles.modalActions}>
              <Link to="/" className={styles.modalSigninBtn}>Go to Sign In →</Link>
              <button className={styles.modalCloseBtn} onClick={() => setShowAlreadyExists(false)}>Try Another Account</button>
            </div>
            <p className={styles.modalNote}>Registration is restricted to one account per email.</p>
          </div>
        </div>
      )}

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
            {ROLES.map(({ value, label, icon }) => (
              <button key={value} type="button" className={`${styles.roleBtn} ${role === value ? styles.roleBtnActive : ""}`} onClick={() => setRole(value)}>
                {icon} {label}
              </button>
            ))}
          </div>
        </div>

        <button className={styles.googleBtn} type="button" onClick={() => handleGoogleRegister()} disabled={loading || googleLoading}>
          {googleLoading ? <span className={`${styles.spinner} ${styles.spinnerDark}`} /> : (
            <svg className={styles.googleIcon} viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
          )}
          <span>{googleLoading ? "Signing up…" : `Continue with Google as ${role === "TENANT" ? "Tenant" : "Owner"}`}</span>
        </button>

        <div className={styles.divider}>
          <div className={styles.dividerLine} />
          <span className={styles.dividerText}>or sign up with email</span>
          <div className={styles.dividerLine} />
        </div>

        <form className={styles.formFields} onSubmit={handleRegister}>
          {[
            { id: "cn-reg-name", label: "Name", icon: <User size={18} />, type: "text", placeholder: "Juan dela Cruz", value: name, onChange: setName },
            { id: "cn-reg-phone", label: "Phone Number", icon: <Phone size={18} />, type: "tel", placeholder: "+63 912 345 6789", value: phoneNumber, onChange: setPhoneNumber },
            { id: "cn-reg-email", label: "Email Address", icon: <Mail size={18} />, type: "email", placeholder: "you@example.com", value: email, onChange: setEmail },
            { id: "cn-reg-pass", label: "Password", icon: <Lock size={18} />, type: "password", placeholder: "Min. 8 characters", value: password, onChange: setPassword },
            { id: "cn-reg-confirm", label: "Confirm Password", icon: <Lock size={18} />, type: "password", placeholder: "Re-enter password", value: confirmPassword, onChange: setConfirmPassword },
          ].map(({ id, label, icon, type, placeholder, value, onChange }) => (
            <div key={id} className={styles.fieldGroup}>
              <label className={styles.fieldLabel} htmlFor={id}>{label}</label>
              <div className={styles.fieldWrap}>
                <span className={styles.fieldIcon}>{icon}</span>
                <input id={id} type={type} className={styles.fieldInput} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} required disabled={loading || googleLoading} />
              </div>
            </div>
          ))}

          <button type="button" className={styles.socialToggle} onClick={() => setShowSocial((v) => !v)}>
            {showSocial ? "Hide social links" : "Add social links (optional)"}
            {showSocial ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {showSocial && (
            <div className={styles.socialSection}>
              {SOCIAL_FIELDS.map(({ id, label, icon, placeholder, key }) => (
                <div key={id} className={styles.fieldGroup}>
                  <label className={styles.fieldLabel} htmlFor={id}>{label}</label>
                  <div className={styles.fieldWrap}>
                    <span className={styles.fieldIcon}>{icon}</span>
                    <input id={id} type="url" className={styles.fieldInput} placeholder={placeholder} value={socialValues[key]} onChange={(e) => socialSetters[key](e.target.value)} disabled={loading || googleLoading} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {message && (
            <div className={`${styles.message} ${isError ? styles.messageError : styles.messageSuccess}`}>
              <span className={styles.messageIcon}>{isError ? <AlertTriangle size={18} /> : <CheckCircle size={18} />}</span> {message}
            </div>
          )}

          <button type="submit" className={styles.submitBtn} disabled={loading || googleLoading}>
            {loading ? <span className={styles.spinner} /> : "Create Account"}
          </button>
        </form>

        <div className={styles.links}>
          <span className={styles.signinText}>Already have an account?</span>
          <Link to="/" className={`${styles.link} ${styles.linkSignin}`}>Sign In →</Link>
        </div>
      </div>
    </>
  );
};

export default Register;