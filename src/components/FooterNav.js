
import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  HomeRounded,
  BoltRounded,
  MapOutlined,
  ReceiptLongRounded,
  QrCodeScannerRounded,
} from "@mui/icons-material";

const FooterNav = ({ homePath = "/landing-home", variant = "light" } = {}) => {
  const navigate = useNavigate();
  const location = useLocation();

const navItems = [
    {
      path: homePath,
      label: "Home",
      icon: <HomeRounded />,
    },
    {
      path: "/sessions",
      label: "Sessions",
      icon: <BoltRounded />,
    },
    {
      path: "/qr-scanner",
      label: "Scanner",
      icon: <QrCodeScannerRounded />,
    },
    {
      path: "/home",
      label: "Maps",
      icon: <MapOutlined />,
    },
    {
      path: "/transactions",
      label: "Payments",
      icon: <ReceiptLongRounded />,
    },
  ];

  const isActive = (path, label) => {
    if (label === "Home") {
      return (
        location.pathname === "/landing-home" ||
        location.pathname === "/"
      );
    }

    if (label === "Maps" || label === "Map") {
          return location.pathname === "/home";
        }

    return (
      location.pathname === path ||
      location.pathname.startsWith(`${path}/`)
    );
  };

  return (
    <>
      <style>{`
        .bottom-bar.bottom-bar--light {
          position: fixed !important;
          bottom: 0 !important;
          left: 50% !important;
          transform: translateX(-50%) !important;
          width: 100% !important;
          max-width: 480px !important;
          min-height: 62px !important;
          height: auto !important;
          display: grid !important;
          grid-template-columns: repeat(5, minmax(0, 1fr)) !important;
          align-items: center !important;
          justify-content: initial !important;
          gap: 0 !important;
          padding: 6px 0 max(6px, env(safe-area-inset-bottom)) !important;
          margin: 0 !important;
          overflow: visible !important;
          box-sizing: border-box !important;
          background: rgba(255, 255, 255, 0.97) !important;
          border-top: 1px solid #d4f0ec !important;
          box-shadow: 0 -5px 20px rgba(14, 46, 51, 0.07) !important;
          z-index: 1002 !important;
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
        }

        .bottom-bar.bottom-bar--light > .bottom-bar-item {
          position: relative !important;
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          justify-content: center !important;
          justify-self: stretch !important;
          align-self: stretch !important;
          width: 100% !important;
          min-width: 0 !important;
          max-width: none !important;
          min-height: 48px !important;
          height: 48px !important;
          gap: 4px !important;
          margin: 0 !important;
          padding: 3px 0 !important;
          border: 0 !important;
          border-radius: 0 !important;
          background: transparent !important;
          box-shadow: none !important;
          color: #64777c !important;
          font-size: 10px !important;
          font-weight: 600 !important;
          line-height: 12px !important;
          white-space: nowrap !important;
          cursor: pointer !important;
          transform: none !important;
          transition: color 160ms ease !important;
          -webkit-tap-highlight-color: transparent;
        }

        .bottom-bar.bottom-bar--light > .bottom-bar-item svg {
          display: block !important;
          width: 21px !important;
          height: 21px !important;
          flex-shrink: 0 !important;
          color: currentColor !important;
          font-size: 21px !important;
          transition: transform 160ms ease !important;
        }

        .bottom-bar.bottom-bar--light > .bottom-bar-item span {
          margin: 0 !important;
          padding: 0 !important;
          color: inherit !important;
          font-size: 10px !important;
          font-weight: 600 !important;
          line-height: 12px !important;
        }

        .bottom-bar.bottom-bar--light > .bottom-bar-item.active {
          color: #007f7b !important;
        }

        .bottom-bar.bottom-bar--light > .bottom-bar-item.active svg {
          color: #007f7b !important;
          transform: translateY(-1px);
        }

        .bottom-bar.bottom-bar--light > .bottom-bar-item:active {
          color: #00a896 !important;
        }

        .bottom-bar.bottom-bar--light > .bottom-bar-item:focus-visible {
          outline: 2px solid #00bfae !important;
          outline-offset: -3px !important;
        }

        /* Hide legacy floating QR and map center controls */
        .bottom-bar.bottom-bar--light .qr-footer-center-button,
        .bottom-bar.bottom-bar--light .qr-footer-center-group,
        .bottom-bar.bottom-bar--light .map-footer-button {
          display: none !important;
        }

        @media (max-width: 360px) {
          .bottom-bar.bottom-bar--light > .bottom-bar-item {
            font-size: 9px !important;
            gap: 3px !important;
          }

          .bottom-bar.bottom-bar--light > .bottom-bar-item span {
            font-size: 9px !important;
          }

          .bottom-bar.bottom-bar--light > .bottom-bar-item svg {
            width: 19px !important;
            height: 19px !important;
          }
        }
      `}</style>

      <nav
        className={`bottom-bar bottom-bar--${variant}`}
        aria-label="Main navigation"
      >
        {navItems.map((item) => {
          const active = isActive(item.path, item.label);

          return (
            <button
              key={item.label}
              type="button"
              className={`bottom-bar-item${active ? " active" : ""}`}
              onClick={() => navigate(item.path)}
              aria-current={active ? "page" : undefined}
              aria-label={item.label}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
};

export default FooterNav;
