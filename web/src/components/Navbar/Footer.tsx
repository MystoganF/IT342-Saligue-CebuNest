import React from "react";
import styles from "./Navbar.module.css";
import logo from "../../assets/images/cebunest-logo.png";

const Footer: React.FC = () => (
  <footer className={styles.footer}>
    <div className={styles.footerInner}>
      <div className={styles.footerBrand}>
        <img src={logo} alt="CebuNest" className={styles.footerLogo} />
        <span className={styles.footerWordmark}>CebuNest</span>
      </div>
      <p className={styles.footerCopy}>© 2026 CebuNest. All rights reserved.</p>
    </div>
  </footer>
);

export default Footer;