// features/owner/OwnerDashboard.js
import React, { useState } from "react";
import OwnerSidebar from "./OwnerSidebar";
import { Outlet } from "react-router-dom";
import { IconButton } from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";

const OwnerDashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  return (
    <div style={styles.container}>
      {/* Mobile Header with Drawer Toggle */}
      <div style={styles.mobileHeader}>
        <IconButton 
          onClick={toggleSidebar}
          style={styles.menuButton}
          size="large"
        >
          <MenuIcon style={{ color: '#fff' }} />
        </IconButton>
        <span style={styles.headerTitle}>Dashboard</span>
      </div>

      {/* Sidebar Overlay for Mobile */}
      {sidebarOpen && <div style={styles.overlay} onClick={toggleSidebar} />}
      
      {/* Sidebar */}
      <OwnerSidebar isOpen={sidebarOpen} onClose={toggleSidebar} />
      
      {/* Main Content */}
      <main style={styles.main}>
        <div style={styles.scrollContainer}>
          <Outlet />
        </div>
      </main>
    </div>
  );
};

const styles = {
  container: {
    display: "flex",
    minHeight: "100vh",
    background: "#000",
    position: "relative"
  },
  mobileHeader: {
    display: "flex",
    alignItems: "center",
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    height: "56px",
    background: "#1a1a1a",
    zIndex: 1100,
    padding: "0 16px",
    borderBottom: "1px solid #333"
  },
  menuButton: {
    marginRight: "12px",
    padding: "8px"
  },
  headerTitle: {
    color: "#fff",
    fontSize: "18px",
    fontWeight: "600"
  },
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0, 0, 0, 0.5)",
    zIndex: 1200,
    display: "block"
  },
  main: {
    flex: 1,
    background: "#000",
    height: "100vh",
    paddingTop: "56px" // Space for fixed header
  },
  scrollContainer: {
    height: "calc(100vh - 56px)",
    overflowY: "auto",
    overflowX: "hidden",
    padding: "16px"
  }
};

export default OwnerDashboard;
