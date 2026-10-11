
import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import QrCode2RoundedIcon from "@mui/icons-material/QrCode2Rounded";
import MapOutlinedIcon from "@mui/icons-material/MapOutlined";

const FooterNav = ({ homePath = "/home", variant = "default" } = {}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isLight = variant === "light";

  const navItems = [
    {
      path: homePath,
      label: "Home",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
        </svg>
      ),
    },
    {
      path: "/sessions",
      label: "Sessions",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path d="M13 2L3 14h9v8l9-12h-9z" />
        </svg>
      ),
    },
    {
      path: "/transactions",
      label: "Payments",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <rect x="2" y="6" width="20" height="13" rx="2" />
          <path d="M2 10h20" />
          <path d="M6 14h4" />
        </svg>
      ),
    },
    {
      path: "/profile",
      label: "Profile",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8V22h19.2v-2.8c0-3.2-6.4-4.8-9.6-4.8z" />
        </svg>
      ),
    },
  ];

  const variantClass = variant ? ` bottom-bar--${variant}` : "";

  const isRouteActive = (path) =>
    location.pathname === path ||
    location.pathname.startsWith(`${path}/`);

  const handleScanClick = () => navigate("/qr-scanner");
  const handleMapClick = () => navigate("/home");

  const renderNavItem = (item) => {
    const active = isRouteActive(item.path);

    return (
      <button
        key={item.path}
        type="button"
        className={`bottom-bar-item${active ? " active" : ""}`}
        onClick={() => navigate(item.path)}
        aria-current={active ? "page" : undefined}
      >
        {item.icon}
        <span>{item.label}</span>
      </button>
    );
  };

  const mapActive = isRouteActive("/home");

  return (
    <>
      {/* Layout overrides are exclusive to the light theme */}
      {isLight && (
        <style>{`
          .bottom-bar.bottom-bar--light {
            display: grid !important;
            grid-template-columns: repeat(5, minmax(0, 1fr)) !important;
            align-items: stretch !important;
            justify-content: initial !important;
            gap: 0 !important;
            box-sizing: border-box !important;
            width: 100% !important;
            max-width: 480px !important;
            left: 50% !important;
            right: auto !important;
            transform: translateX(-50%) !important;
            margin: 0 !important;
            padding: 5px 0 max(5px, env(safe-area-inset-bottom)) !important;
            overflow: visible !important;
          }

          .bottom-bar.bottom-bar--light > .bottom-bar-item,
          .bottom-bar.bottom-bar--light > .map-footer-button {
            position: relative !important;
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            justify-content: center !important;
            justify-self: stretch !important;
            align-self: stretch !important;
            box-sizing: border-box !important;
            width: 100% !important;
            min-width: 0 !important;
            max-width: none !important;
            height: 48px !important;
            min-height: 48px !important;
            gap: 4px !important;
            margin: 0 !important;
            padding: 3px 0 !important;
            border: 0 !important;
            border-radius: 0 !important;
            background: transparent !important;
            box-shadow: none !important;
            color: #64777c !important;
            font-size: 10px !important;
            line-height: 12px !important;
            white-space: nowrap !important;
            transform: none !important;
          }

          .bottom-bar.bottom-bar--light > .bottom-bar-item.active,
          .bottom-bar.bottom-bar--light > .map-footer-button.active {
            color: #047f83 !important;
          }

          .bottom-bar.bottom-bar--light > .bottom-bar-item svg,
          .bottom-bar.bottom-bar--light > .map-footer-button svg {
            display: block !important;
            flex-shrink: 0 !important;
            width: 19px !important;
            height: 19px !important;
            color: currentColor !important;
            stroke: currentColor !important;
          }

          /* Ensure the light footer has no floating QR button */
          .bottom-bar.bottom-bar--light .qr-footer-center-button,
          .bottom-bar.bottom-bar--light .qr-footer-center-group {
            display: none !important;
          }

          @media (max-width: 360px) {
            .bottom-bar.bottom-bar--light > .bottom-bar-item,
            .bottom-bar.bottom-bar--light > .map-footer-button {
              font-size: 9px !important;
              gap: 3px !important;
            }

            .bottom-bar.bottom-bar--light > .bottom-bar-item svg,
            .bottom-bar.bottom-bar--light > .map-footer-button svg {
              width: 18px !important;
              height: 18px !important;
            }
          }
        `}</style>
      )}

      <nav
        className={`bottom-bar${variantClass}`}
        aria-label="Main navigation"
      >
        {/* Home and Sessions */}
        {navItems.slice(0, 2).map(renderNavItem)}

        {isLight ? (
          /* Light theme: Map replaces the centre QR button */
          <button
            type="button"
            className={`map-footer-button${mapActive ? " active" : ""}`}
            onClick={handleMapClick}
            aria-label="Open map"
            aria-current={mapActive ? "page" : undefined}
          >
            <MapOutlinedIcon className="map-footer-icon" />
            <span>Map</span>
          </button>
        ) : (
          /* Dark/default theme: preserve the QR scanner button */
          <button
            type="button"
            className="qr-footer-center-button"
            onClick={handleScanClick}
            aria-label="Scan QR code"
          >
            <QrCode2RoundedIcon className="qr-footer-icon" />
          </button>
        )}

        {/* Payments and Profile */}
        {navItems.slice(2).map(renderNavItem)}
      </nav>
    </>
  );
};

export default FooterNav;
