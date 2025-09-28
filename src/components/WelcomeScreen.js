import React from "react";
import { useNavigate } from "react-router-dom";
import { Box, Button, Typography } from "@mui/material";

const WelcomeScreen = () => {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        height: "100vh",
        display: "flex",
        flexDirection: { xs: "column", sm: "row" },
        alignItems: "center",
        justifyContent: "center",
        padding: "0px 16px 80px", // top-bar + bottom nav space
        color: "white",
        fontFamily: "'Inter', sans-serif",
        overflowY: "auto",
        background: `
          radial-gradient(circle at top, #09203f, #000000), 
          url('/energy-grid-overlay.png')
        `,
        backgroundSize: "cover, 200px 200px", // radial covers, grid repeats
        backgroundBlendMode: "overlay",
        textAlign: "center"
      }}
    >


      {/* Logo */}
      <Box
        component="img"
        src="/logo.png"
        alt="SPARX ENERGY"
        sx={{
          maxWidth: { xs: 200, sm: 250, md: 300 },
          height: "auto",
          mb: -4,
          filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.3))"
        }}
      />


      <Typography
        variant="subtitle1"
        sx={{
           fontFamily: "'Inter', sans-serif",
          fontWeight: "400",
          mb: 20,
          fontSize: { xs: "0.9rem", sm: "1rem", md: "1.2rem" },
          color: "#e0e0e0"
        }}
      >
        Smart Charging Solutions
      </Typography>

      {/* Button Container */}
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          gap: 2,
          width: "100%",
          maxWidth: 400
        }}
      >
        {/* LOGIN Button */}
        <Button
          variant="contained"
          onClick={() => navigate("/login")}
          sx={{
            width: { xs: "60%", sm: 50 },  // limit width on larger screens
            mx: "auto",
            background: "#04bfbf",
            color: "#ffffff",
            fontWeight: "bold",
            fontSize: { xs: "0.9rem", sm: "1rem" },
            py: 1.1,
            borderRadius: 2,
            border: "1px solid #04bfbf",
            "&:hover": {
              background: "#04bfbf",
              boxShadow: `
                0 0 25px #04bfbf,
                0 6px 20px #04bfbf
              `,
              transform: "translateY(-2px)"
            },
            "&:active": {
              transform: "translateY(0px)"
            },
            transition: "all 0.3s ease"
          }}
        >
          LOGIN
        </Button>

        {/* EXPLORE Button */}
        <Button
          variant="outlined"
          onClick={() => navigate("/home")}
          sx={{
            width: { xs: "45%", sm: 140 },
            mx: "auto",
            background: "transparent",
            color: "#04bfbf",
            fontWeight: "bold",
            fontSize: { xs: "0.9rem", sm: "1rem" },
            py: 0.7,
            borderRadius: 2,
            border: "2px solid #04bfbf",
            "&:hover": {
              background: "rgba(4, 191, 191, 0.1)",
              borderColor: "#04bfbf",
              color: "#04bfbf",
              transform: "translateY(-2px)"
            },
            "&:active": {
              transform: "translateY(0px)"
            },
            transition: "all 0.3s ease"
          }}
        >
          EXPLORE
        </Button>
      </Box>
    </Box>
  );
};

export default WelcomeScreen;
