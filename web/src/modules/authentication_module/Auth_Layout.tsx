import React from "react";
import { Outlet } from "react-router-dom";
import styles from "./AuthLayout.module.css";
import logo from "../../assets/images/cebunest-logo.png";

const AuthLayout: React.FC = () => {
  return (
    <div className={styles.page}>
      {/* ══ LEFT PANEL (Static across all auth pages) ══ */}
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
          <h2 className={styles.brandHeading}>Your Home in Cebu Awaits</h2>
          <p className={styles.brandBody}>
            Streamlined rental management for tenants and property owners. Browse listings, submit rental requests, and manage bookings — all in one place.
          </p>
        </div>

        <div className={styles.stats}>
          {[
            { number: "240+", label: "Active Listings" },
            { number: "1.2k", label: "Happy Tenants" },
            { number: "98%", label: "Satisfaction" },
          ].map(({ number, label }) => (
            <div key={label} className={styles.statItem}>
              <span className={styles.statNumber}>{number}</span>
              <span className={styles.statLabel}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ══ RIGHT PANEL (Dynamic Routes Render Here) ══ */}
      <div className={styles.rightPanel}>
        <Outlet />
      </div>
    </div>
  );
};

export default AuthLayout;