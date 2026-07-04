import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import QrCodeScannerIcon from "@mui/icons-material/QrCodeScanner";

const FooterNav = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
        {
      path: "/home",
      label: "Home",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
          <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
        </svg>
      ),
    },
    {
      path: "/sessions",
      label: "Sessions",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
          <path d="M13 2L3 14h9v8l9-12h-9z"/>
        </svg>
      ),
    },
    {
      path: "/transactions",
      label: "Payments",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
          <rect x="2" y="6" width="20" height="13" rx="2"/>
          <path d="M2 10h20"/>
          <path d="M6 14h4"/>
        </svg>
      ),
    },
    {
      path: "/profile",
      label: "Profile",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
          <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8V22h19.2v-2.8c0-3.2-6.4-4.8-9.6-4.8z"/>
        </svg>
      ),
    },
  ];

    const handleScanClick = () => {
    // Use EXACT same navigation as your current Home QR button
    // e.g. navigate("/scan-qr") or navigate("/scan")
    navigate("/qr-scanner"); // ← change to your real scanner route
  };

return (
  <div className="bottom-bar">
    {/* Left: Home, Sessions */}
    {navItems.slice(0, 2).map((item) => {
      const isActive = location.pathname.startsWith(item.path);
      return (
        <button
          key={item.path}
          className={isActive ? "active" : ""}
          onClick={() => navigate(item.path)}
        >
          {item.icon}
          <span>{item.label}</span>
        </button>
      );
    })}

    {/* Center: QR scanner */}
    <button
      className="qr-footer-center-button"
      onClick={handleScanClick}
      aria-label="Scan QR"
    >
      <QrCodeScannerIcon className="qr-footer-icon" />
      {/* Do NOT add a <span> label here to keep it clean */}
    </button>

    {/* Right: Payments, Profile */}
    {navItems.slice(2).map((item) => {
      const isActive = location.pathname.startsWith(item.path);
      return (
        <button
          key={item.path}
          className={isActive ? "active" : ""}
          onClick={() => navigate(item.path)}
        >
          {item.icon}
          <span>{item.label}</span>
        </button>
      );
    })}
  </div>
);
};

export default FooterNav;