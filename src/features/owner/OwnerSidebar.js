import React from "react";
import { NavLink } from "react-router-dom";
import { IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import DashboardIcon from "@mui/icons-material/Dashboard";
import DevicesIcon from "@mui/icons-material/DeviceHub";
import AnalyticsIcon from "@mui/icons-material/Analytics";
import PersonIcon from "@mui/icons-material/Person";

const OwnerSidebar = ({ isOpen, onClose }) => {
  const navStyle = ({ isActive }) =>
    isActive ? { ...styles.link, ...styles.activeLink } : styles.link;

  return (
    <aside style={{
      ...styles.sidebar,
      transform: `translateX(${isOpen ? '0' : '-100%'})`,
    }}>
      {/* Close button for mobile */}
      <div style={styles.header}>
        <div style={styles.logo}>Owner Panel</div>
        <IconButton 
          onClick={onClose}
          style={styles.closeButton}
          size="small"
        >
          <CloseIcon style={{ color: '#fff', fontSize: '20px' }} />
        </IconButton>
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
            <NavLink to="/owner/analytics" style={navStyle} onClick={onClose}>
              <AnalyticsIcon style={styles.icon} />
              Analytics
            </NavLink>
          </li>
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
    position: "fixed",
    top: 0,
    left: 0,
    width: "280px",
    height: "100vh",
    background: "#1a1a1a",
    color: "#fff",
    zIndex: 1300,
    transition: "transform 0.3s ease-in-out",
    borderRight: "1px solid #333",
    '@media (min-width: 768px)': {
      position: "static",
      transform: "none !important"
    }
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
