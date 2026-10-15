import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowForwardRounded,
  BoltRounded,
  CloseRounded,
  LanguageRounded,
  MapOutlined,
  MenuRounded,
  OpenInNewRounded,
  PersonOutlineRounded,
  ReceiptLongRounded,
  QrCodeScannerRounded,
  SupportAgentRounded,
} from "@mui/icons-material";

import { getAuthState } from "../utils/auth";
import "../styles/appHeader.css";

const MENU_ITEMS = [
  {
    label: "My profile",
    description: "Account and personal details",
    icon: <PersonOutlineRounded />,
    path: "/profile",
  },
  {
    label: "Sessions",
    description: "Current and previous charging",
    icon: <BoltRounded />,
    path: "/sessions",
  },
  {
    label: "Transactions",
    description: "Payments, top-ups and refunds",
    icon: <ReceiptLongRounded />,
    path: "/transactions",
  },
  {
    label: "Scan QR code",
    description: "Start charging at a VIZ point",
    icon: <QrCodeScannerRounded />,
    path: "/qr-scanner",
  },
  {
    label: "Find a charger",
    description: "Explore chargers on the map",
    icon: <MapOutlined />,
    path: "/home",
  },
];

const getUserDetails = () => {
  try {
    const authState = getAuthState();
    const user = authState?.user || {};

    const name =
      user.name ||
      user.fullName ||
      user.username ||
      user.userName ||
      user.displayName ||
      "Guest";

    return {
      firstName: String(name).trim().split(/\s+/)[0] || "there",
      phone: user.phone || user.phoneNumber || user.mobile || "",
    };
  } catch {
    return { firstName: "there", phone: "" };
  }
};

const AppHeader = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const { firstName, phone } = getUserDetails();

  const closeMenu = () => setMenuOpen(false);

  const goTo = (path) => {
    closeMenu();
    navigate(path);
  };

  useEffect(() => {
    if (!menuOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event) => {
      if (event.key === "Escape") closeMenu();
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  return (
    <>
      {/* ---------------------------------
          TOP HEADER (DARK WITH CENTRED LOGO)
      ---------------------------------- */}
      <header className="app-header">
        <div className="app-header-inner">
          <button
            type="button"
            className={`app-header-menu-button${menuOpen ? " is-open" : ""}`}
            aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={menuOpen}
            aria-controls="viz-navigation-drawer"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span className="app-header-menu-icon">
              {menuOpen ? <CloseRounded /> : <MenuRounded />}
            </span>
          </button>

          <button
            type="button"
            className="app-header-brand"
            aria-label="Go to VIZ home"
            onClick={() => goTo("/landing-home")}
          >
            <img
              src="/logo.png"
              alt="VIZ Smart Charging"
              className="app-header-logo"
            />
          </button>

        {/* Top-Right Profile Button */}
                  <button
                    type="button"
                    className="app-header-profile-button"
                    aria-label="My Profile"
                    onClick={() => goTo("/profile")}
                  >
                    <PersonOutlineRounded />
                  </button>
        </div>
      </header>

      {/* ---------------------------------
          NAVIGATION DRAWER
      ---------------------------------- */}
      {menuOpen && (
        <div
          className="app-drawer-backdrop"
          onClick={closeMenu}
          role="presentation"
        >
          <aside
            id="viz-navigation-drawer"
            className="app-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="VIZ navigation menu"
            onClick={(event) => event.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="app-drawer-header">
              <button
                type="button"
                className="app-drawer-brand"
                onClick={() => goTo("/landing-home")}
                aria-label="Go to VIZ home"
              >
                <img src="/logo2.png" alt="VIZ" />
                <span className="app-drawer-brand-copy">
                  <strong>VIZ Smart Charging</strong>
                  <small>Powering your journey</small>
                </span>
              </button>

              <button
                type="button"
                className="app-drawer-close"
                onClick={closeMenu}
                aria-label="Close navigation menu"
              >
                <CloseRounded />
              </button>
            </div>

            {/* User Greeting Card */}
            <div className="app-drawer-user">
              <div className="app-drawer-avatar" aria-hidden="true">
                <PersonOutlineRounded />
              </div>

              <div className="app-drawer-user-info">
                <span>Signed in as</span>
                <strong>{firstName}</strong>
                {phone && <small>{phone}</small>}
              </div>
            </div>

            {/* Navigation List */}
            <nav className="app-drawer-nav" aria-label="Main navigation">
              <p className="app-drawer-section-label">MENU</p>

              {MENU_ITEMS.map((item) => {
                const isActive =
                  location.pathname === item.path ||
                  (item.path !== "/home" &&
                    location.pathname.startsWith(`${item.path}/`));

                return (
                  <button
                    type="button"
                    key={item.path}
                    className={`app-drawer-item${isActive ? " active" : ""}`}
                    onClick={() => goTo(item.path)}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <span className="app-drawer-item-icon">{item.icon}</span>

                    <span className="app-drawer-item-copy">
                      <strong>{item.label}</strong>
                      <small>{item.description}</small>
                    </span>

                    <ArrowForwardRounded className="app-drawer-item-arrow" />
                  </button>
                );
              })}
            </nav>

{/* Need Help WhatsApp Support Block */}
            <button
              type="button"
              className="app-drawer-support"
              aria-label="Contact VIZ support on WhatsApp"
              onClick={() => {
                closeMenu();
                window.open(
                  "https://wa.me/918855094432",
                  "_blank",
                  "noopener,noreferrer"
                );
              }}
            >
              <div className="app-drawer-support-icon">
                <SupportAgentRounded />
              </div>

              <div className="app-drawer-support-copy">
                <strong>Need help?</strong>
                <span>Contact VIZ support</span>
              </div>

              <div className="app-drawer-whatsapp-badge" aria-hidden="true">
                <img
                  src="/whatsapplogo.png"
                  alt=""
                  className="app-drawer-whatsapp-icon"
                />
              </div>
            </button>

            {/* ── Official Website Link ── */}
            <a
              href="https://eviz.in"
              target="_blank"
              rel="noopener noreferrer"
              className="app-drawer-website-link"
              onClick={closeMenu}
              aria-label="Visit eviz.in website"
            >
              <div className="app-drawer-website-icon">
                <LanguageRounded />
              </div>

              <div className="app-drawer-website-copy">
                <span>To know more about us, visit</span>
                <strong>eviz.in</strong>
              </div>

              <OpenInNewRounded className="app-drawer-website-arrow" />
            </a>
          </aside>
        </div>
      )}
    </>
  );
};

export default AppHeader;