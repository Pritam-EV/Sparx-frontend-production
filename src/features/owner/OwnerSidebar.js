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
import AssessmentIcon               from "@mui/icons-material/Assessment";
import { apiFetch } from "../../utils/apiFetch";

const OwnerSidebar = ({ isOpen, onClose }) => {
  // ✅ ADD: Track if desktop view
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);
  const [hasVjraDevices, setHasVjraDevices] = useState(false);
  // ✅ ADD: Listen to window resize
  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);


  useEffect(() => {
    // Fetch owner's devices and check electricityBearer
    apiFetch("/api/partner/my-devices")
      .then((res) => {
        const devices = Array.isArray(res?.devices) ? res.devices : Array.isArray(res) ? res : [];
const hasVjra = devices.some(
  (d) =>
    d?.commercial?.electricityBearer === "VJRA" ||
    d?.electricityBearer === "VJRA" ||
    d?.electricity_bearer === "VJRA"
);
        setHasVjraDevices(hasVjra);
      })
      .catch(() => {
        // silently fail — Reports tab just won't show
      });
  }, []);

  const navStyle = ({ isActive }) =>
    isActive ? { ...styles.link, ...styles.activeLink } : styles.link;

  // ✅ UPDATED: Dynamic sidebar style based on screen size
  const sidebarStyle = {
    ...styles.sidebar,
    // Desktop: static position, always visible
    // Mobile: fixed position, slides in/out
    position: isDesktop ? "static" : "fixed",
    transform: isDesktop ? "none" : `translateX(${isOpen ? '0' : '-100%'})`,
  };

  return (
    <aside style={sidebarStyle}>
      {/* Close button for mobile only */}
      <div style={styles.header}>
        <div style={styles.logo}>Owner Panel</div>
        {!isDesktop && (  // ✅ Only show close button on mobile
          <IconButton 
            onClick={onClose}
            style={styles.closeButton}
            size="small"
          >
            <CloseIcon style={{ color: '#fff', fontSize: '20px' }} />
          </IconButton>
        )}
      </div>
      
      <nav style={styles.nav}>
        <ul style={styles.menu}>
          <li>
            <NavLink to="/owner/devices" style={navStyle} onClick={onClose}>
              <DevicesIcon style={styles.icon} />
              My Devices
            </NavLink>
          </li>
          <li>
            <NavLink to="/owner/live-charging" style={navStyle} onClick={onClose}>
              <BatteryChargingFullIcon style={styles.icon} />
              Live Charging
            </NavLink>
          </li>
          <li>
            <NavLink to="/owner/past-sessions" style={navStyle} onClick={onClose}>
              <HistoryIcon style={styles.icon} />
              Past Sessions
            </NavLink>
          </li>
          <li>
            <NavLink to="/owner/analytics" style={navStyle} onClick={onClose}>
              <AnalyticsIcon style={styles.icon} />
              Analytics
            </NavLink>
          </li>

          {hasVjraDevices && (
            <li>
              <NavLink to="/owner/reports" style={navStyle} onClick={onClose}>
                <AssessmentIcon style={styles.icon} />
                Reports
              </NavLink>
            </li>
          )}

          <li>
            <NavLink to="/profile" style={navStyle} onClick={onClose}>
              <PersonIcon style={styles.icon} />
              Profile
            </NavLink>
          </li>
        </ul>
      </nav>
    </aside>
  );
};


const styles = {
  sidebar: {
    top: 0,
    left: 0,
    width: "280px",
    height: "100vh",
    background: "#1a1a1a",
    color: "#fff",
    zIndex: 1300,
    transition: "transform 0.3s ease-in-out",
    borderRight: "1px solid #333",
    // ❌ REMOVED: '@media (min-width: 768px)' - doesn't work in inline styles
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px 20px",
    borderBottom: "1px solid #333"
  },
  logo: {
    fontSize: "20px",
    fontWeight: "700",
    color: "#04BFBF"
  },
  closeButton: {
    padding: "4px"
  },
  nav: {
    padding: "20px 0"
  },
  menu: {
    listStyle: "none",
    padding: 0,
    margin: 0
  },
  link: {
    color: "#ccc",
    textDecoration: "none",
    display: "flex",
    alignItems: "center",
    padding: "12px 20px",
    borderRadius: "0",
    marginBottom: "2px",
    transition: "all 0.2s ease",
    borderLeft: "3px solid transparent"
  },
  activeLink: {
    backgroundColor: "#04BFBF",
    color: "#000",
    fontWeight: "600",
    borderLeft: "3px solid #04BFBF"
  },
  icon: {
    marginRight: "12px",
    fontSize: "20px"
  }
};


export default OwnerSidebar;
