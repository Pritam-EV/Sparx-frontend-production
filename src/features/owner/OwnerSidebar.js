// src/features/owner/OwnerSidebar.js

import React, { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import { IconButton } from "@mui/material";
import { apiFetch } from "../../utils/apiFetch";
import "./OwnerSidebar.css";

// Material-UI Icons
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import EvStationRoundedIcon from "@mui/icons-material/EvStationRounded";
import BatteryChargingFullRoundedIcon from "@mui/icons-material/BatteryChargingFullRounded";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import AccountBalanceWalletRoundedIcon from "@mui/icons-material/AccountBalanceWalletRounded";
import AssessmentRoundedIcon from "@mui/icons-material/AssessmentRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";

// Inline WhatsApp SVG Icon
function WhatsAppGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M17.472 14.382C17.114 14.204 15.362 13.342 15.034 13.224C14.706 13.104 14.468 13.044 14.23 13.402C13.992 13.76 13.306 14.566 13.098 14.804C12.89 15.042 12.682 15.072 12.324 14.894C11.966 14.716 10.812 14.338 9.448 13.122C8.388 12.176 7.672 11.008 7.464 10.65C7.256 10.292 7.442 10.098 7.622 9.92C7.784 9.76 7.982 9.5 8.16 9.292C8.338 9.084 8.398 8.934 8.518 8.696C8.638 8.458 8.578 8.25 8.488 8.072C8.398 7.894 7.684 6.136 7.386 5.42C7.096 4.722 6.802 4.816 6.584 4.806C6.376 4.796 6.138 4.794 5.9 4.794C5.662 4.794 5.276 4.884 4.948 5.242C4.62 5.6 3.698 6.464 3.698 8.224C3.698 9.984 4.978 11.684 5.156 11.922C5.334 12.16 7.676 15.772 11.26 17.322C12.112 17.69 12.778 17.912 13.298 18.076C14.156 18.348 14.936 18.31 15.556 18.218C16.248 18.114 17.684 17.348 17.982 16.514C18.28 15.68 18.28 14.966 18.19 14.804C18.1 14.642 17.83 14.56 17.472 14.382Z"
        fill="currentColor"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.48 2 2 6.48 2 12C2 13.85 2.5 15.58 3.38 17.07L2.05 22L7.1 20.68C8.55 21.52 10.22 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20.17C10.42 20.17 8.95 19.72 7.7 18.94L7.33 18.71L4.35 19.49L5.15 16.58L4.9 16.18C4.05 14.83 3.6 13.25 3.6 12C3.6 7.37 7.37 3.6 12 3.6C16.63 3.6 20.4 7.37 20.4 12C20.4 16.63 16.63 20.17 12 20.17Z"
        fill="currentColor"
      />
    </svg>
  );
}

// Inline Globe SVG Icon
function GlobeGlyph() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M2 12H22"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 2C14.5013 4.73835 15.9228 8.29203 16 12C15.9228 15.708 14.5013 19.2616 12 22C9.49872 19.2616 8.07725 15.708 8 12C8.07725 8.29203 9.49872 4.73835 12 2Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function OwnerSidebar({ isOpen, onClose }) {
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);
  const [hasVjraDevices, setHasVjraDevices] = useState(false);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    let mounted = true;

    apiFetch("/api/eb/owner/projects")
      .then((result) => {
        if (!mounted) return;
        setHasVjraDevices(
          Array.isArray(result?.projects) && result.projects.length > 0
        );
      })
      .catch(() => {
        if (mounted) setHasVjraDevices(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const closeAfterNavigation = () => {
    if (!isDesktop && onClose) onClose();
  };

  const navLinks = [
    {
      label: "Overview",
      to: "/owner",
      icon: <DashboardRoundedIcon sx={{ fontSize: 20 }} />,
      end: true,
    },
    {
      label: "My Devices",
      to: "/owner/devices",
      icon: <EvStationRoundedIcon sx={{ fontSize: 20 }} />,
    },
    {
      label: "Live Charging",
      to: "/owner/live-charging",
      icon: <BatteryChargingFullRoundedIcon sx={{ fontSize: 20 }} />,
    },
    {
      label: "Session Register",
      to: "/owner/sessions",
      icon: <HistoryRoundedIcon sx={{ fontSize: 20 }} />,
    },
    {
      label: "Finance & Settlements",
      to: "/owner/finance",
      icon: <AccountBalanceWalletRoundedIcon sx={{ fontSize: 20 }} />,
    },
  ];

  if (hasVjraDevices) {
    navLinks.push({
      label: "Energy Bills",
      to: "/owner/reports",
      icon: <AssessmentRoundedIcon sx={{ fontSize: 20 }} />,
    });
  }

  navLinks.push({
    label: "Home",
    to: "/landing-home",
    icon: <PersonRoundedIcon sx={{ fontSize: 20 }} />,
  });

  const sidebarInlineStyle = {
    position: isDesktop ? "sticky" : "fixed",
    top: 0,
    left: 0,
    transform: isDesktop
      ? "none"
      : `translateX(${isOpen ? "0" : "-100%"})`,
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {!isDesktop && isOpen && (
        <div
          className="viz-sidebar-backdrop"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Main Sidebar Shell */}
      <aside className="viz-sidebar" style={sidebarInlineStyle}>
        {/* Brand Header */}
        <div className="viz-sidebar-header">
          <div className="viz-sidebar-brand">
            <div className="viz-sidebar-logo-container">
              {!imgError ? (
                <img
                  src="/logo2.png"
                  alt="VIZ Logo"
                  className="viz-sidebar-logo-img"
                  onError={() => setImgError(true)}
                />
              ) : (
                <div className="viz-sidebar-logo-fallback">V</div>
              )}
            </div>

            <div className="viz-sidebar-title-block">
              <div className="viz-sidebar-title">
                VIZ-Smart Charging
              </div>
              <div className="viz-sidebar-subtext">Charging Point Operator</div>
            </div>
          </div>

          {!isDesktop && (
            <IconButton
              onClick={onClose}
              size="small"
              aria-label="Close navigation"
              sx={{ color: "var(--viz-text-muted)" }}
            >
              <CloseRoundedIcon sx={{ fontSize: 15 }} />
            </IconButton>
          )}
        </div>

        {/* Navigation Body */}
        <div className="viz-sidebar-body">
          <div className="viz-sidebar-section-label">Workspace</div>

          <nav aria-label="CPO Navigation">
            <ul className="viz-sidebar-menu">
              {navLinks.map((link) => (
                <li key={link.to}>
                  <NavLink
                    to={link.to}
                    end={link.end}
                    className={({ isActive }) =>
                      `viz-sidebar-link ${isActive ? "active" : ""}`
                    }
                    onClick={closeAfterNavigation}
                  >
                    <span className="viz-sidebar-link-icon">{link.icon}</span>
                    <span>{link.label}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {/* Auxiliary Cards (WhatsApp Support & Website) */}
        <div className="viz-sidebar-auxiliary">
          {/* WhatsApp Support Card */}
          <a
            href="https://wa.me/918855094432?text=Hello%20VIZ%20Support,%20I%20am%20a%20charging%20station%20owner%20and%20need%20assistance."
            target="_blank"
            rel="noopener noreferrer"
            className="viz-whatsapp-card"
          >
            <div className="viz-whatsapp-left">
              <div className="viz-whatsapp-icon-box">
                <WhatsAppGlyph />
              </div>
              <div>
                <div className="viz-whatsapp-title">Contact Support</div>
                <div className="viz-whatsapp-phone">+91 8855094432</div>
              </div>
            </div>

            <OpenInNewRoundedIcon
              sx={{ fontSize: 14, color: "var(--viz-green-fg)", opacity: 0.8 }}
            />
          </a>

          {/* Official Website Card */}
          <a
            href="https://eviz.in"
            target="_blank"
            rel="noopener noreferrer"
            className="viz-website-card"
          >
            <div className="viz-website-left">
              <div className="viz-website-icon-box">
                <GlobeGlyph />
              </div>
              <div>
                <div className="viz-website-title">Official Portal</div>
                <div className="viz-website-url">eviz.in</div>
              </div>
            </div>

            <OpenInNewRoundedIcon
              sx={{ fontSize: 14, color: "var(--viz-orange)", opacity: 0.8 }}
            />
          </a>
        </div>

        {/* Footer Attribution */}
        <div className="viz-sidebar-footer">
          <div className="viz-footer-brand-title">A brand by</div>
          <div className="viz-footer-brand-company">Vjra Technologies LLP</div>
        </div>
      </aside>
    </>
  );
}