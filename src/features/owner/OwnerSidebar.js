// src/features/owner/OwnerSidebar.js

import React, { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import { IconButton } from "@mui/material";

import CloseIcon from "@mui/icons-material/Close";
import DashboardIcon from "@mui/icons-material/Dashboard";
import DevicesIcon from "@mui/icons-material/DeviceHub";
import AnalyticsIcon from "@mui/icons-material/Analytics";
import PersonIcon from "@mui/icons-material/Person";
import BatteryChargingFullIcon from "@mui/icons-material/BatteryChargingFull";
import HistoryIcon from "@mui/icons-material/History";
import AssessmentIcon from "@mui/icons-material/Assessment";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import PaymentsOutlinedIcon from "@mui/icons-material/PaymentsOutlined";
import { apiFetch } from "../../utils/apiFetch";

const COLORS = {
  teal: "#04BFBF",
  darkTeal: "#01313A",
  background: "#FFFFFF",
  border: "#E2E8F0",
  text: "#334155",
  muted: "#64748B",
};

const OwnerSidebar = ({ isOpen, onClose }) => {
  const [isDesktop, setIsDesktop] = useState(
    window.innerWidth >= 768
  );

  const [hasVjraDevices, setHasVjraDevices] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 768);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    apiFetch("/api/eb/owner/projects")
      .then((result) => {
        if (!mounted) return;

        setHasVjraDevices(
          Array.isArray(result?.projects) &&
          result.projects.length > 0
        );
      })
      .catch(() => {
        if (mounted) setHasVjraDevices(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const navStyle = ({ isActive }) => ({
    ...styles.link,
    ...(isActive ? styles.activeLink : {}),
  });

  const sidebarStyle = {
    ...styles.sidebar,
    position: isDesktop ? "static" : "fixed",
    transform: isDesktop
      ? "none"
      : `translateX(${isOpen ? "0" : "-100%"})`,
  };

  const closeAfterNavigation = () => {
    if (!isDesktop && onClose) onClose();
  };

  const links = [
    {
      label: "Overview",
      to: "/owner",
      icon: <DashboardIcon sx={styles.icon} />,
      end: true,
    },
    {
      label: "My Devices",
      to: "/owner/devices",
      icon: <DevicesIcon sx={styles.icon} />,
    },
    {
      label: "Live Charging",
      to: "/owner/live-charging",
      icon: <BatteryChargingFullIcon sx={styles.icon} />,
    },
    {
      label: "Past Sessions",
      to: "/owner/past-sessions",
      icon: <HistoryIcon sx={styles.icon} />,
    },
    {
      label: "Session Register",
      to: "/owner/sessions",
      icon: <HistoryIcon sx={styles.icon} />,
      },
      {
        label: "Finance & Settlements",
        to: "/owner/finance",
        icon: <AccountBalanceWalletIcon sx={styles.icon} />,
      },
    {
      label: "Analytics",
      to: "/owner/analytics",
      icon: <AnalyticsIcon sx={styles.icon} />,
    },
  ];

  if (hasVjraDevices) {
    links.push({
      label: "Energy Bills",
      to: "/owner/reports",
      icon: <AssessmentIcon sx={styles.icon} />,
    });
  }

  links.push({
    label: "Profile",
    to: "/profile",
    icon: <PersonIcon sx={styles.icon} />,
  });

  return (
    <aside style={sidebarStyle}>
      <div style={styles.header}>
        <div style={styles.brand}>
          <div style={styles.brandMark}>V</div>

          <div>
            <div style={styles.logo}>VIZ</div>
            <div style={styles.subtitle}>OWNER HUB</div>
          </div>
        </div>

        {!isDesktop && (
          <IconButton
            onClick={onClose}
            size="small"
            aria-label="Close navigation"
            sx={{ color: COLORS.darkTeal }}
          >
            <CloseIcon />
          </IconButton>
        )}
      </div>

      <div style={styles.sectionLabel}>WORKSPACE</div>

      <nav aria-label="Owner navigation">
        <ul style={styles.menu}>
          {links.map((link) => (
            <li key={link.to} style={styles.menuItem}>
              <NavLink
                to={link.to}
                end={link.end}
                style={navStyle}
                onClick={closeAfterNavigation}
              >
                {link.icon}
                <span>{link.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div style={styles.sidebarFooter}>
        <div style={styles.footerDot} />

        <div>
          <div style={styles.footerTitle}>VIZ Smart Charging</div>
          <div style={styles.footerText}>Owner workspace</div>
        </div>
      </div>
    </aside>
  );
};

const styles = {
  sidebar: {
    top: 0,
    left: 0,
    width: 260,
    minWidth: 260,
    height: "100vh",
    display: "flex",
    flexDirection: "column",
    boxSizing: "border-box",
    background: COLORS.background,
    color: COLORS.text,
    zIndex: 1300,
    transition: "transform 0.25s ease",
    borderRight: `1px solid ${COLORS.border}`,
    overflowY: "auto",
    flexShrink: 0,
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "22px 20px",
    borderBottom: `1px solid ${COLORS.border}`,
    minHeight: 86,
    boxSizing: "border-box",
  },

  brand: {
    display: "flex",
    alignItems: "center",
    gap: 11,
  },

  brandMark: {
    width: 40,
    height: 40,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    background: COLORS.darkTeal,
    color: "#FFFFFF",
    fontSize: 21,
    fontWeight: 850,
  },

  logo: {
    fontSize: 18,
    fontWeight: 850,
    letterSpacing: "-0.3px",
    color: COLORS.darkTeal,
    lineHeight: 1.3,
  },

  subtitle: {
    color: COLORS.muted,
    fontSize: 9,
    fontWeight: 750,
    letterSpacing: "1.5px",
    marginTop: 2,
  },

  sectionLabel: {
    padding: "23px 20px 9px",
    color: "#94A3B8",
    fontSize: 10,
    fontWeight: 800,
    letterSpacing: "1.3px",
  },

  menu: {
    listStyle: "none",
    padding: "0 12px",
    margin: 0,
  },

  menuItem: {
    marginBottom: 5,
  },

  link: {
    color: COLORS.text,
    textDecoration: "none",
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "12px 13px",
    borderRadius: 10,
    fontSize: 13,
    fontWeight: 600,
    transition: "background 0.18s ease, color 0.18s ease",
    borderLeft: "3px solid transparent",
  },

  activeLink: {
    background: "#E5F8F7",
    color: COLORS.darkTeal,
    fontWeight: 800,
    borderLeft: `3px solid ${COLORS.teal}`,
  },

  icon: {
    fontSize: 20,
    flexShrink: 0,
  },

  sidebarFooter: {
    display: "flex",
    gap: 10,
    alignItems: "center",
    padding: "18px 20px",
    marginTop: "auto",
    borderTop: `1px solid ${COLORS.border}`,
  },

  footerDot: {
    width: 9,
    height: 9,
    background: COLORS.teal,
    borderRadius: "50%",
    flexShrink: 0,
  },

  footerTitle: {
    color: COLORS.darkTeal,
    fontSize: 11,
    fontWeight: 750,
  },

  footerText: {
    color: COLORS.muted,
    fontSize: 10,
    marginTop: 3,
  },
};

export default OwnerSidebar;