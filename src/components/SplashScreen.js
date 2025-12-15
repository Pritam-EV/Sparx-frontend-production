import React from "react";

const SplashScreen = () => {
  return (
    <div style={styles.container}>
      <img
        src="/logo.png" // Replace with your actual logo path
        alt="Logo"
        style={styles.logo}
      />
    </div>
  );
};

const styles = {
  container: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000000", // Theme background
    width: "100vw", // Full viewport width
    height: "100vh", // Full viewport height
    position: "fixed", // Ensures it covers the entire screen
    top: 0,
    left: 0,
    zIndex: 9999, // Ensures it's on top
  },
  logo: {
    width: "60%", // Makes it adaptive to screen size
    maxWidth: "200px", // Prevents excessive scaling
    height: "auto",
  },
};

export default SplashScreen;
