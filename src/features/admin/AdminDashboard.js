import React, { useState } from "react";
import AdminSidebar from "./AdminSidebar";
import { Outlet } from "react-router-dom";
import { IconButton, Box, Drawer, AppBar, Toolbar } from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";

const drawerWidth = 280;

const AdminDashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleDrawerToggle = () => setSidebarOpen((prev) => !prev);

  return (
    <Box sx={{ display: "flex", height: "100vh", bgcolor: "#f1f3f5" }}>
      {/* AppBar for mobile */}
      <AppBar
        position="fixed"
        sx={{
          bgcolor: "#1a1a1a",
          color: "#fff",
          height: 56,
          boxShadow: "none",
          display: { md: "none" },
          zIndex: 1301
        }}
        elevation={0}
      >
        <Toolbar variant="dense" sx={{ minHeight: 56, px: 1 }}>
          <IconButton
            size="large"
            edge="start"
            color="inherit"
            onClick={handleDrawerToggle}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          <Box sx={{ flex: 1, fontWeight: 700, letterSpacing: 1 }}>
            Admin Panel
          </Box>
        </Toolbar>
      </AppBar>
      {/* Persistent drawer at md+ */}
      <Box
        component="nav"
        sx={{
          width: { md: drawerWidth },
          flexShrink: { md: 0 },
          zIndex: 1300
        }}
        aria-label="admin sidebar"
      >
        {/* Mobile temporary Drawer */}
        <Drawer
          variant="temporary"
          open={sidebarOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: "block", md: "none" },
            "& .MuiDrawer-paper": {
              width: drawerWidth,
              boxSizing: "border-box",
              bgcolor: "#1a1a1a",
              color: "#fff"
            }
          }}
        >
          <AdminSidebar isOpen={sidebarOpen} onClose={handleDrawerToggle} />
        </Drawer>
        {/* Desktop persistent Drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: "none", md: "block" },
            "& .MuiDrawer-paper": {
              width: drawerWidth,
              boxSizing: "border-box",
              bgcolor: "#1a1a1a",
              color: "#fff",
              borderRight: "1px solid #333"
            }
          }}
          open
        >
          <AdminSidebar isOpen />
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minWidth: 0,
          height: "100vh",
          overflow: "auto",
          pt: { xs: 7, md: 0 },
          px: { xs: 1, sm: 2 },
          pb: 2,
          bgcolor: "#f1f3f5"
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
};

export default AdminDashboard;
