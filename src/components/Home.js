import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../styles/appStyles.css";
import { Box, IconButton, Tooltip } from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import MyLocationIcon from "@mui/icons-material/MyLocation";
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';


const Home = () => {
  const navigate = useNavigate();
const userMarkerRef = useRef(null);
const mapRef = useRef(null);
const defaultCenter = [18.5204, 73.8567];
  const [map, setMap] = useState(null);
  const [devices, setDevices] = useState([]);
  const activeMarkerRef = useRef(null);
  // State to force re-fetch
const [reloadToggle, setReloadToggle] = useState(false);

const [hasShownInstall, setHasShownInstall] = useState(false);

// ---- Support popup state & helpers ----
const [showSupportPopup, setShowSupportPopup] = useState(false);

// PWA install state
const [deferredPrompt, setDeferredPrompt] = useState(null);
const [isVizInstalled, setIsVizInstalled] = useState(false);
const [showInstallModal, setShowInstallModal] = useState(false);

// Get user name safely from localStorage (try `user` then `profile`)
const getUserNameFromLocal = () => {
  const raw = localStorage.getItem("user") || localStorage.getItem("profile") || "{}";
  let parsed = {};
  try { parsed = JSON.parse(raw); } catch (e) { parsed = { name: raw }; }
  return parsed.name || parsed.fullName || parsed.username || parsed.userName || parsed.displayName || "User";
};

const supportPhone = "918855094432"; // international format without '+'
const getWhatsappUrl = () => {
  const userName = getUserNameFromLocal();
  const msg = `Hi,\n${userName} this side.\nI need help with charging my EV with VIZ Charging Point.`;
  return `https://wa.me/${supportPhone}?text=${encodeURIComponent(msg)}`;
};

const handleOpenSupport = () => setShowSupportPopup(true);
const handleCloseSupport = () => setShowSupportPopup(false);
// ---- end support helpers ----

useEffect(() => {
  const checkInstalled = () => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true;
    setIsVizInstalled(standalone);
  };

  const handleBeforeInstallPrompt = (e) => {
    e.preventDefault();
    setDeferredPrompt(e);
    console.log("[PWA] beforeinstallprompt captured");
  };

  const handleAppInstalled = () => {
    console.log("[PWA] app installed");
    setIsVizInstalled(true);
    setDeferredPrompt(null);
    setShowInstallModal(false);
  };

  checkInstalled();

  window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  window.addEventListener("appinstalled", handleAppInstalled);
  window.addEventListener("focus", checkInstalled);

  return () => {
    window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.removeEventListener("appinstalled", handleAppInstalled);
    window.removeEventListener("focus", checkInstalled);
  };
}, []);

// useEffect(() => {
//   // handler references so we can remove listeners cleanly
// const onBeforeInstallPrompt = (e) => {
//   e.preventDefault();
//   setDeferredPrompt(e);

//   console.log("[PWA] prompt ready");

//   // Check if already shown
//   const alreadyShown = localStorage.getItem("viz_install_shown");
// const onBeforeInstallPrompt = (e) => {
//   e.preventDefault();
//   setDeferredPrompt(e);
// };
// };

// const triggerInstallPrompt = async (promptEvent) => {
//   if (!promptEvent) return;

//   try {
//     promptEvent.prompt();

//     const choice = await promptEvent.userChoice;

//     if (choice.outcome === "accepted") {
//       console.log("User installed app ✅");
//     } else {
//       console.log("User dismissed install ❌");
//     }

//     // mark as shown
//     localStorage.setItem("viz_install_shown", "true");

//   } catch (err) {
//     console.error("Install error:", err);
//   }
// };

//   const onAppInstalled = () => {
//     console.log("[PWA] appinstalled detected");
//     setIsVizInstalled(true);
//     setDeferredPrompt(null);
//     setShowInstallModal(false);
//     // optional: show a toast / alert to the user
//     try { navigator.vibrate && navigator.vibrate(60); } catch (e) {}
//   };

//   // Detect current standalone/install state
//   const checkStandalone = () => {
//     const standalone = window.matchMedia('(display-mode: standalone)').matches ||
//                        window.navigator.standalone === true;
//     setIsVizInstalled(standalone);
//   };

//   window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
//   window.addEventListener('appinstalled', onAppInstalled);
//   document.addEventListener('visibilitychange', checkStandalone);

//   // initial check
//   checkStandalone();

//   return () => {
//     window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
//     window.removeEventListener('appinstalled', onAppInstalled);
//     document.removeEventListener('visibilitychange', checkStandalone);
//   };
// }, []);

useEffect(() => {
  if (!deferredPrompt) return;

  const alreadyShown = localStorage.getItem("viz_install_shown");
  if (alreadyShown) return;

  const timer = setTimeout(() => {
    setShowInstallModal(true);
  }, 4000);

  return () => clearTimeout(timer);

}, [deferredPrompt]);


useEffect(() => {
  const days = 3;
  const now = Date.now();
  const lastShown = localStorage.getItem("viz_install_time");

  if (!lastShown || now - lastShown > days * 86400000) {
    localStorage.removeItem("viz_install_shown");
    localStorage.setItem("viz_install_time", now);
  }
}, []);

const handleInstallViz = async () => {
  if (isVizInstalled) {
    console.log("[PWA] already installed");
    return;
  }

  if (deferredPrompt) {
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;

      console.log("[PWA] user choice:", choice?.outcome);

      setDeferredPrompt(null);

      if (choice?.outcome !== "accepted") {
        console.log("[PWA] install dismissed");
      }
    } catch (error) {
      console.error("[PWA] install prompt failed:", error);
    }

    return;
  }

  setShowInstallModal(true);
};

// Manually refresh device list
  const handleRefresh = () => {
    setReloadToggle(prev => !prev);
  };

  // Center map on user
  // Locate button handler uses map.setView


const handleLocate = () => {
  if (!mapRef.current) return;

  const map = mapRef.current;

  // Use Leaflet's built-in geolocation
  map.locate({
    setView: true,
    maxZoom: 18,
    enableHighAccuracy: true
  });

  map.once("locationfound", (e) => {
    const { lat, lng } = e.latlng;

    // Remove old marker if exists
    if (userMarkerRef.current) {
      map.removeLayer(userMarkerRef.current);
    }

    // Smooth fly animation
    map.flyTo([lat, lng], 18, {
      duration: 1.5
    });

    // Add blue circle marker
    const circle = L.circleMarker([lat, lng], {
      radius: 10,
      color: "#136aec",
      fillColor: "#2a93ee",
      fillOpacity: 0.9,
      weight: 2
    }).addTo(map);

    userMarkerRef.current = circle;
  });

  map.once("locationerror", (err) => {
    console.warn("Location access denied or unavailable:", err);
    alert("Location access is required to center the map.");
  });
};


const attemptLocate = () => {
  if (!mapRef.current) {
    console.warn("[Locate] Map still not ready");
    return;
  }

  if (!navigator.geolocation) {
    console.warn("[Locate] Geolocation not supported");
    mapRef.current.setView(defaultCenter, 12);
    return;
  }

  navigator.geolocation.getCurrentPosition(
    ({ coords }) => {
      const latlng = [coords.latitude, coords.longitude];
      console.log("[Locate] Got position:", latlng);

      mapRef.current.setView(latlng, 16, { animate: true });

      if (userMarkerRef.current) {
        mapRef.current.removeLayer(userMarkerRef.current);
      }

      const circle = L.circleMarker(latlng, {
        radius: 10,
        color: "#136aec",
        fillColor: "#2a93ee",
        fillOpacity: 0.9,
        weight: 2
      }).addTo(mapRef.current);

      userMarkerRef.current = circle;
    },
    (err) => {
      console.error("[Locate] Geolocation error:", err);
      mapRef.current.setView(defaultCenter, 12);
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
  );
};





useEffect(() => {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      () => {
        console.log("Location permission granted ✅");
      },
      (err) => {
        console.warn("Location permission denied ❌", err);
      }
    );
  }
}, []);

useEffect(() => {
  if (!mapRef.current) return;

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const latlng = [coords.latitude, coords.longitude];
        mapRef.current.setView(latlng, 16, { animate: true });

        // Add blue dot
        if (userMarkerRef.current) {
          mapRef.current.removeLayer(userMarkerRef.current);
        }
        const circle = L.circleMarker(latlng, {
          radius: 10,
          color: "#136aec",
          fillColor: "#2a93ee",
          fillOpacity: 0.9,
          weight: 2
        }).addTo(mapRef.current);

        userMarkerRef.current = circle;
      },
      (err) => {
        console.warn("Location permission denied ❌", err);
        // fallback center
        mapRef.current.setView(defaultCenter, 12);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  } else {
    // fallback if geolocation not supported
    mapRef.current.setView(defaultCenter, 12);
  }
}, []);



useEffect(() => {
  const fetchDevices = async () => {
    try {
      const token = localStorage.getItem("token");
      const url = `${process.env.REACT_APP_Backend_API_Base_URL}/api/devices`;

      const config = token
        ? { headers: { Authorization: `Bearer ${token}` } }
        : {};

      const response = await axios.get(url, config);

      const devicesData = Array.isArray(response.data)
        ? response.data
        : response.data.devices || response.data;

      setDevices(devicesData);
    } catch (error) {
      console.error("Error fetching devices:", error);
    }
  };

  fetchDevices();
  const interval = setInterval(fetchDevices, 10000); // 🔥 every 10 seconds
  return () => clearInterval(interval);
}, [reloadToggle]);




  const getDirections = (lat, lng) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLat = position.coords.latitude;
        const userLng = position.coords.longitude;

        const gmapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${userLat},${userLng}&destination=${lat},${lng}&travelmode=driving`;
        window.open(gmapsUrl, "_blank");
      },
      () => {
        const gmapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
        window.open(gmapsUrl, "_blank");
      }
    );
  };



function showDevicePopup(device, marker) {
  // Remove any existing popup
  const oldPopup = document.getElementById("custom-popup");
  if (oldPopup) oldPopup.remove();
  document.removeEventListener("click", window._popupOutsideClick);

    // Shrink old marker
  if (activeMarkerRef.current && activeMarkerRef.current !== marker) {
    smoothShrinkMarker(activeMarkerRef.current);
  }

  activeMarkerRef.current = marker;

  // Determine glow color
  const glowColor =
    device.status === "Available" ? "#04BFBF" :
    device.status === "Occupied" ? "#F2A007" : "#888888";

  smoothEnlargeMarker(marker, glowColor);

  // Build popup
  const popupDiv = document.createElement("div");
  popupDiv.id = "custom-popup";
  popupDiv.innerHTML = `
    <div id="popup-content" style="
      position: fixed;
      bottom: 60px;
      left: 50%;
      transform: translateX(-50%);
      width: 90%;
      max-width: 400px;
      background: #FFFFFF;
      border-radius: 12px;
      box-shadow: 0 0 18px rgba(0,0,0,0.2);
      padding: 16px;
      font-family: 'Open Sans', sans-serif;
      color: #011F26;
      z-index: 2000;
    ">
      <button id="close-popup" style="
        position: absolute;
        top: 8px;
        right: 10px;
        background: transparent;
        border: none;
        font-size: 15px;
        color: #011F26;
        cursor: pointer;
      ">×</button>

      <div style="display: flex; align-items: center;">
        <img src="${device.image || '/device-image.png'}" alt="Charger" style="
          width: 80px;
          height: 90px;
          border-radius: 8px;
          object-fit: cover;
          margin-right: 8px;
        " />

        <div style="flex: 1;">
          <div style="margin-bottom: 4px; font-size: 15px;">
            <strong>Location: </strong> ${device.location || "Unknown"}
          </div>

          <div style="margin-bottom: 4px; font-size: 15px;">
            <strong>Type: </strong> ${device.charger_type || "N/A"}
          </div>

          <div style="margin-bottom: 4px; font-size: 15px;">
            <strong>Rate: </strong> ₹${device.rate || 0}/kWh
          </div>

          <div style="margin-bottom: 10px; display: flex; align-items: center;">
            <strong>Status: </strong>
            <span style="
              display: inline-block;
              width: 10px;
              height: 10px;
              border-radius: 50%;
              background-color: ${device.status === "Available" ? "#20b000" : "#e00f00"};
              margin-left: 6px;
              margin-right: 6px;
            "></span>
            ${device.status}
          </div>

          <div style="display: flex; gap: 8px;">
            <button id="connect-device" style="
              flex: 2;
              padding: 8px;
              background: #04BFBF;
              color: white;
              border: none;
              border-radius: 6px;
              cursor: pointer;
              font-weight: bold;
              font-size: 14px;
              display: flex;
              align-items: center;
              justify-content: center;
            ">
              Connect with Charger
            </button>
            <button id="get-directions" style="
              flex: 0.6;
              padding: 8px;
              background: #F2A007;
              color: #011F26;
              border: none;
              border-radius: 6px;
              cursor: pointer;
              font-weight: bold;
              display: flex;
              align-items: center;
              justify-content: center;
            ">
              <svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 0 24 24" fill="#011F26">
                <path d="M12 2L3 21l9-4 9 4-9-19z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(popupDiv);

  // Animate marker
  if (activeMarkerRef.current && activeMarkerRef.current !== marker) {
    smoothShrinkMarker(activeMarkerRef.current);
  }
  activeMarkerRef.current = marker;
  smoothEnlargeMarker(marker, device.status === "Available" ? "#04BFBF" : device.status === "Occupied" ? "#F2A007" : "#888");

  // Close popup
  const closePopup = () => {
    document.getElementById("custom-popup")?.remove();
    smoothShrinkMarker(marker);
    activeMarkerRef.current = null;
    document.removeEventListener("click", window._popupOutsideClick);
  };
  document.getElementById("close-popup")?.addEventListener("click", closePopup);

  // Outside click handler (global reference)
  window._popupOutsideClick = (event) => {
    const popupEl = document.getElementById("custom-popup");
    if (popupEl && !popupEl.contains(event.target)) {
      closePopup();
    }
  };
  setTimeout(() => {
    document.addEventListener("click", window._popupOutsideClick);
  }, 0);

  // Buttons
  // Buttons
  document.getElementById("connect-device")?.addEventListener("click", () => {
    if (device.status === "Available") {
      closePopup();
      navigate("/qr-scanner");
    }
  });
  document.getElementById("get-directions")?.addEventListener("click", () => {
    closePopup();
    getDirections(device.lat, device.lng);
  });
}



function smoothEnlargeMarker(marker, glowColor) {
    if (!marker) return;
  marker.originalIcon = marker.getIcon(); // store original
  let scale = 1;
  const maxScale = 1.2;
  const step = 0.1;
  const interval = setInterval(() => {
    if (scale >= maxScale) {
      clearInterval(interval);
    } else {
      scale += step;
      // Reuse the same glow filter logic for intermediate icons
      const size = 48 * scale;
      const anchorY = size * 1.1;
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24">
        <defs><filter id="glow" height="300%" width="300%" x="-75%" y="-75%">
          <feDropShadow dx="0" dy="0" stdDeviation="3" flood-color="${glowColor}" flood-opacity="0.8"/>
        </filter></defs>
        <path d="M12 2C8 2 5 5.1 5 9c0 4.4 7 13 7 13s7-8.6 7-13c0-3.9-3-7-7-7z" 
              fill="#121B22" filter="url(#glow)"/>
        <path d="M13 7h-2l-1 4h2l-1 4 4-5h-2l1-3z" fill="${glowColor}"/>
      </svg>`;
      const url = "data:image/svg+xml;base64," + btoa(svg);
      marker.setIcon(new L.Icon({ iconUrl: url, iconSize: [size, size], iconAnchor: [size/2, anchorY] }));
    }
  }, 30);
}

function smoothShrinkMarker(marker) {
    if (!marker || !marker.originalIcon) return;
  marker.setIcon(marker.originalIcon); // restore
  let scale = 1.2;
  const minScale = 1.0;
  const step = 0.1;
  const glowColor = "#888888";

  const interval = setInterval(() => {
    if (scale <= minScale) {
      clearInterval(interval);
      marker.setIcon(marker.originalIcon || marker.getIcon());
    } else {
      scale -= step;
      const size = 48 * scale;
      const anchorY = size * 1.1;
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24">
        <defs><filter id="glow" height="300%" width="300%" x="-75%" y="-75%">
          <feDropShadow dx="0" dy="0" stdDeviation="3" flood-color="${glowColor}" flood-opacity="0.8"/>
        </filter></defs>
        <path d="M12 2C8 2 5 5.1 5 9c0 4.4 7 13 7 13s7-8.6 7-13c0-3.9-3-7-7-7z"
              fill="#121B22" filter="url(#glow)"/>
        <path d="M13 7h-2l-1 4h2l-1 4 4-5h-2l1-3z" fill="${glowColor}"/>
      </svg>`;
      const url = "data:image/svg+xml;base64," + btoa(svg);
      marker.setIcon(new L.Icon({ iconUrl: url, iconSize: [size, size], iconAnchor: [size/2, anchorY] }));
    }
  }, 16);

    
    // On popup close, smoothly shrink back
    const closePopup = () => {
      document.getElementById("custom-popup")?.remove();
    };

    document.getElementById("close-popup")?.addEventListener("click", closePopup);


  }




  return (
    <>
    <div className="top-bar">
      <img src="/logo.png" alt="VIZ Logo" className="top-bar-logo" />
    </div>
    <div className="home-container">

      <div className="bottom-bar">
        <button onClick={() => navigate("/sessions")} className="home-button">
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="#fff" strokeWidth="1" viewBox="0 0 24 24">
              <path d="M13 2L3 14h9v8l9-12h-9z"/> {/* Thunderbolt */}
            </svg>
            <span style={{ fontFamily: "'Rubik', sans-serif", fontSize: "9px", marginTop: "4px", color: "#cdebf5" }}>Sessions</span>
          </div>
        </button>

        <button onClick={() => navigate("/home")} className="scan-button">
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="#04BFBF" strokeWidth="1" viewBox="0 0 24 24">
              <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/> {/* Home */}
            </svg>
            <span style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "9px", marginTop: "4px", color: "#04BFBF" }}>Home</span>
          </div>
        </button>

        <button onClick={() => navigate("/profile")} className="home-button">
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="#fff" strokeWidth="1" viewBox="0 0 24 24">
              <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8V22h19.2v-2.8c0-3.2-6.4-4.8-9.6-4.8z"/> {/* Profile */}
            </svg>
            <span style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "9px", marginTop: "4px", color: "#cdebf5" }}>Profile</span>
          </div>
        </button>
      </div>


      <button onClick={() => navigate("/qr-scanner")} className="qr-floating-button" style={{
        position: "absolute",
        top: "80px",
        right: "20px",
        width: "50px",
        height: "50px",
        borderRadius: "50%",
        backgroundColor: "#04BFBF",
        border: "none",
        boxShadow: "0 0 12px #04BFBF",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        zIndex: 1002,
        }}>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="30" height="30" fill="#0f1a1d">
          <path d="M3 3v8h8V3H3zm6 6H5V5h4v4zM13 3v8h8V3h-8zm6 6h-4V5h4v4zM3 13v8h8v-8H3zm6 6H5v-4h4v4zM13 13h2v2h-2zm4 0h2v2h-2zm-4 4h2v2h-2zm4 0h2v6h-6v-2h4v-4z"/>
        </svg>
      </button>

      {/* SUPPORT floating button — placed below the QR scanner button */}
<button 
  onClick={handleOpenSupport} 
  className="qr-floating-button support-button" 
  style={{
    position: "absolute",
    top: "140px",
    right: "20px",
    width: "50px", 
    height: "50px", 
    borderRadius: "50%",
    backgroundColor: "#04BFBF",
    border: "none",
    boxShadow: "0 0 12px #04BFBF",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    zIndex: 1002,
  }}
  aria-label="Get Support"
>
  {/* Exact customer-service-72.svg - inline */}
<svg 
  xmlns="http://www.w3.org/2000/svg" 
  viewBox="0 0 1024 1024" 
  width="40" 
  height="40" 
  fill="#020202"
>
  <path d="M137.09824 453.4016v118.4c0.1024 24.89856 15.80032 46.30016 38.20032 55.30112 25.29792 135.70048 146.80064 223.0016 298.19904 234.90048 6.90176 20.39808 26.90048 35.3024 50.80064 35.3024 29.59872 0 53.60128-22.70208 53.60128-50.69824s-24.00256-50.80064-53.60128-50.80064c-22.70208 0-41.99936 13.39904-49.80224 32.30208-130.80064-10.90048-236.49792-82.80064-262.5024-197.60128 16.19968-3.2 30.19776-12.49792 39.10144-25.29792 22.00064 66.69824 69.80096 122.19904 131.99872 155.49952 0.90112 0.39936 1.69984 0.9984 2.60096 1.39776 0.39936 0.1024 0.70144 0.19968 1.19808 0.19968 0.39936 0 0.79872-0.1024 1.19808-0.19968 0.50176-0.19968 0.9984-0.50176 1.50016-0.70144 1.30048-0.90112 2.29888-2.29888 2.29888-3.99872a4.5568 4.5568 0 0 0-1.39776-3.3024c-0.1024-0.1024-0.19968-0.19968-0.30208-0.19968-61.50144-54.59968-65.30048-108.00128-58.50112-185.90208 5.89824-68.1984 47.0016-132.80256 67.79904-162.00192l1.50016 0.90112a6.77888 6.77888 0 0 1 5.20192-2.60096c3.3024 0 5.80096 2.29888 6.4 5.2992 2.2016 20.1984 6.90176 34.2016 10.19904 41.09824 13.99808 29.59872 36.80256 47.40096 70.2976 53.2992 52.59776 9.29792 104.89856 20.10112 157.50144 29.59872 32.79872 5.89824 60.9024 41.7024 55.3984 78.10048-12.49792 82.80064-70.20032 142.10048-86.20032 153.6 0.90112-0.59904 1.80224-0.9984 2.89792-0.9984 0.9984 0 2.29888 1.1008 3.39968 2.49856 1.60256 2.00192 2.89792 4.39808 3.00032 4.80256 69.00224-29.19936 123.60192-84.70016 150.4-153.40032 11.10016 13.30176 27.8016 21.89824 46.69952 21.89824 33.50016 0 60.60032-26.5984 60.60032-59.40224V463.69792c0-29.19936-21.60128-53.4016-50.00192-58.39872-29.30176-147.2-160.90112-258.49856-319.40096-258.49856-154.30144 0-282.90048 105.4976-316.60032 246.79936-0.50176 0-0.90112-0.1024-1.50016-0.1024-34.3808 0-62.1824 26.8032-62.1824 59.904z m112-35.3024c23.3984-124.8 134.5024-219.40224 268.29824-219.40224 134.4 0 245.89824 95.49824 268.49792 221.19936-2.29888 2.00192-4.59776 4.10112-6.59968 6.4-39.90016-103.10144-141.9008-176.59904-261.80096-176.59904-120.40192 0-222.80192 74.10176-262.2976 177.89952-1.69472-3.39456-3.79392-6.49728-6.09792-9.4976z"/>
  <path d="M496.70144 738.2016c-37.09952-4.3008-68.70016-29.50144-80.30208-64.19968a5.2992 5.2992 0 0 1 3.00032-6.5024 5.6832 5.6832 0 0 1 6.99904 2.2016c0.19968 0.30208 14.8992 23.3984 72.40192 30.8992 8.6016 1.1008 16.9984 1.69984 24.89856 1.69984 40.29952 0 58.19904-14.80192 58.39872-14.8992 2.00192-1.80224 5.09952-1.80224 7.19872-0.1024s2.60096 4.70016 0.9984 6.90176c-17.50016 27.60192-48.9984 44.6976-82.0992 44.6976-3.79392 0-7.59808-0.29696-11.4944-0.69632z"/>
</svg>
</button>

{/* VIZ INSTALL floating button */}
<button 
  onClick={handleInstallViz}
  className="qr-floating-button viz-install-button"
  style={{
    position: "absolute",
    top: "200px",   // below support button (80 -> 140 -> 200)
    right: "20px",
    width: "50px",
    height: "50px",

    backgroundColor: "transparent",
    border: "none",
    boxShadow: "0 0 12px #000000",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    zIndex: 1002,
  }}
  aria-label="Install VIZ App"
>
  {/* Download + Mobile Icon */}
<svg
  xmlns="http://www.w3.org/2000/svg"
  viewBox="0 0 24 24"
  width="30"
  height="30"
  fill="none"
>
  <defs>
    <filter id="softGlow">
      <feDropShadow dx="0" dy="0" stdDeviation="1.5" floodColor="#ffffff" floodOpacity="0.8"/>
    </filter>
  </defs>

  <g filter="url(#softGlow)">
    <g>
      <animateTransform
        attributeName="transform"
        type="translate"
        values="0 0; 0 2; 0 0"
        dur="1.2s"
        repeatCount="indefinite"
      />

      {/* Arrow Shaft */}
      <line
        x1="12"
        y1="4"
        x2="12"
        y2="14"
        stroke="#000000"
        strokeWidth="2.2"
        strokeLinecap="round"
      />

      {/* Arrow Head */}
      <polyline
        points="8 11 12 15 16 11"
        stroke="#000000"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </g>
  </g>

  {/* Bottom Base Line */}
  <line
    x1="5"
    y1="20"
    x2="19"
    y2="20"
    stroke="#000000"
    strokeWidth="2"
    strokeLinecap="round"
    opacity="0.85"
  />
</svg>
</button>

    <Box sx={{ position: "relative", height: `calc(100vh - 56px)`, width: "100%" }}>
{/* Leaflet MapContainer replaces the old map div */}
            <MapContainer
              center={[18.5204, 73.8567]}
              zoom={12}
              style={{ height: "100%", width: "100%" }}
              whenCreated={(mapInstance) => {
                console.log("[Map] Ready");
                mapRef.current = mapInstance;
              }}
            >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            {/* Render a Marker for each device */}
            {devices.map((device, idx) => {
              if (typeof device.lat !== "number" || typeof device.lng !== "number") return null;
              const glowColor = device.status === "Available" ? "#04BFBF"
                                : device.status === "Occupied"  ? "#F2A007" : "#888888";
              const svg = `
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24">
                  <defs>
                    <filter id="glow" height="300%" width="300%" x="-75%" y="-75%">
                      <feDropShadow dx="0" dy="0" stdDeviation="3" flood-color="${glowColor}" flood-opacity="0.8"/>
                    </filter>
                  </defs>
                  <path d="M12 2C8 2 5 5.1 5 9c0 4.4 7 13 7 13s7-8.6 7-13c0-3.9-3-7-7-7z"
                        fill="#121B22" filter="url(#glow)"/>
                  <path d="M13 7h-2l-1 4h2l-1 4 4-5h-2l1-3z" fill="${glowColor}"/>
                </svg>
              `;
              const iconUrl = "data:image/svg+xml;base64," + btoa(svg);
              const icon = new L.Icon({
                iconUrl,
                iconSize: [36, 36],
                iconAnchor: [18, 36],
              });
              const handleMarkerClick = (e, device) => {
              const marker = e.target; // Leaflet marker instance
              showDevicePopup(device, marker);
            };

              return (
                <Marker
                  key={device.id || idx}
                  position={[device.lat, device.lng]}
                  icon={icon}
                  eventHandlers={{ click: (e) => handleMarkerClick(e, device) }}
                />
              );
            })}
          </MapContainer>

              <div className="bottom-buttons">
                <Tooltip title="Refresh Devices">
                  <IconButton
                    onClick={handleRefresh}
                    sx={{
                      bgcolor: "#04BFBF",
                      "&:hover": { bgcolor: "rgba(4,191,191,0.1)" },
                      color: "#121B22",
                      fontWeight: "bold",
                      borderRadius: "50%",
                      boxShadow: "0 0 12px #04BFBF"
                    }}
                  >
                    <RefreshIcon />
                  </IconButton>
                </Tooltip>

                <Tooltip title="Go to My Location">
                  <IconButton
                    onClick={handleLocate}
                    sx={{
                      bgcolor: "#04BFBF",
                      "&:hover": { bgcolor: "rgba(4,191,191,0.1)" },
                      color: "#121B22",
                      fontWeight: "bold",
                      boxShadow: "0 0 12px #04BFBF"
                    }}
                  >
                    <MyLocationIcon />
                  </IconButton>
                </Tooltip>
              </div>
        </Box>

{/* SUPPORT Popup */}
{showSupportPopup && (
  <div style={supportStyles.overlay} onClick={handleCloseSupport}>
    <div style={supportStyles.modal} onClick={(e) => e.stopPropagation()}>
      <button
        style={supportStyles.closeButton}
        onClick={handleCloseSupport}
        aria-label="Close"
      >
        ✕
      </button>

      <div style={supportStyles.header}>
        <div style={supportStyles.iconWrap}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 1024 1024"
            width="26"
            height="26"
            fill="#041316"
          >
            <path d="M137.09824 453.4016v118.4c0.1024 24.89856 15.80032 46.30016 38.20032 55.30112 25.29792 135.70048 146.80064 223.0016 298.19904 234.90048 6.90176 20.39808 26.90048 35.3024 50.80064 35.3024 29.59872 0 53.60128-22.70208 53.60128-50.69824s-24.00256-50.80064-53.60128-50.80064c-22.70208 0-41.99936 13.39904-49.80224 32.30208-130.80064-10.90048-236.49792-82.80064-262.5024-197.60128 16.19968-3.2 30.19776-12.49792 39.10144-25.29792 22.00064 66.69824 69.80096 122.19904 131.99872 155.49952 0.90112 0.39936 1.69984 0.9984 2.60096 1.39776 0.39936 0.1024 0.70144 0.19968 1.19808 0.19968 0.39936 0 0.79872-0.1024 1.19808-0.19968 0.50176-0.19968 0.9984-0.50176 1.50016-0.70144 1.30048-0.90112 2.29888-2.29888 2.29888-3.99872a4.5568 4.5568 0 0 0-1.39776-3.3024c-0.1024-0.1024-0.19968-0.19968-0.30208-0.19968-61.50144-54.59968-65.30048-108.00128-58.50112-185.90208 5.89824-68.1984 47.0016-132.80256 67.79904-162.00192l1.50016 0.90112a6.77888 6.77888 0 0 1 5.20192-2.60096c3.3024 0 5.80096 2.29888 6.4 5.2992 2.2016 20.1984 6.90176 34.2016 10.19904 41.09824 13.99808 29.59872 36.80256 47.40096 70.2976 53.2992 52.59776 9.29792 104.89856 20.10112 157.50144 29.59872 32.79872 5.89824 60.9024 41.7024 55.3984 78.10048-12.49792 82.80064-70.20032 142.10048-86.20032 153.6 0.90112-0.59904 1.80224-0.9984 2.89792-0.9984 0.9984 0 2.29888 1.1008 3.39968 2.49856 1.60256 2.00192 2.89792 4.39808 3.00032 4.80256 69.00224-29.19936 123.60192-84.70016 150.4-153.40032 11.10016 13.30176 27.8016 21.89824 46.69952 21.89824 33.50016 0 60.60032-26.5984 60.60032-59.40224V463.69792c0-29.19936-21.60128-53.4016-50.00192-58.39872-29.30176-147.2-160.90112-258.49856-319.40096-258.49856-154.30144 0-282.90048 105.4976-316.60032 246.79936-0.50176 0-0.90112-0.1024-1.50016-0.1024-34.3808 0-62.1824 26.8032-62.1824 59.904z m112-35.3024c23.3984-124.8 134.5024-219.40224 268.29824-219.40224 134.4 0 245.89824 95.49824 268.49792 221.19936-2.29888 2.00192-4.59776 4.10112-6.59968 6.4-39.90016-103.10144-141.9008-176.59904-261.80096-176.59904-120.40192 0-222.80192 74.10176-262.2976 177.89952-1.69472-3.39456-3.79392-6.49728-6.09792-9.4976z" />
            <path d="M496.70144 738.2016c-37.09952-4.3008-68.70016-29.50144-80.30208-64.19968a5.2992 5.2992 0 0 1 3.00032-6.5024 5.6832 5.6832 0 0 1 6.99904 2.2016c0.19968 0.30208 14.8992 23.3984 72.40192 30.8992 8.6016 1.1008 16.9984 1.69984 24.89856 1.69984 40.29952 0 58.19904-14.80192 58.39872-14.8992 2.00192-1.80224 5.09952-1.80224 7.19872-0.1024s2.60096 4.70016 0.9984 6.90176c-17.50016 27.60192-48.9984 44.6976-82.0992 44.6976-3.79392 0-7.59808-0.29696-11.4944-0.69632z" />
          </svg>
        </div>

        <h3 style={supportStyles.title}>Help & Support</h3>
        <p style={supportStyles.subtitle}>
          Reach our team for charging, onboarding, or technical assistance.
        </p>
      </div>

      <div style={supportStyles.infoList}>
        <div style={supportStyles.infoRow}>
          <span style={supportStyles.infoLabel}>Email</span>
          <a
            href="mailto:support@vjratechnologies.com"
            style={supportStyles.infoValueLink}
          >
            support@vjratechnologies.com
          </a>
        </div>

        <div style={supportStyles.infoRow}>
          <span style={supportStyles.infoLabel}>Sales</span>
          <a href="tel:+919545092266" style={supportStyles.infoValueLink}>
            +91 9545092266
          </a>
        </div>

        <div style={supportStyles.infoRow}>
          <span style={supportStyles.infoLabel}>Technical</span>
          <a href="tel:+918855094432" style={supportStyles.infoValueLink}>
            +91 8855094432
          </a>
        </div>
      </div>

      <a
        href={getWhatsappUrl()}
        target="_blank"
        rel="noopener noreferrer"
        style={supportStyles.whatsappButton}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 32 32"
          width="20"
          height="20"
          fill="#ffffff"
        >
          <path d="M16 3C9.4 3 4 8.4 4 15c0 2.6.8 5 2.3 7L4 29l7-2.5c1.9 1 4.1 1.6 6 1.6 6.6 0 12-5.4 12-12S22.6 3 16 3zm5.6 18.6c-.3.8-1.7 1.5-2.4 1.6-.6.1-1.6.2-3.2-.5-3.8-1.6-6.3-5.5-6.5-5.8-.2-.3-1.3-1.8-1.3-3.4 0-1.6.9-2.4 1.3-2.8.3-.3.8-.4 1.2-.4.3 0 .6 0 .9 0 .3 0 .6-.1.9-.1.3 0 .6 0 .9.1.3.1 1.1.4 1.3.5.2.1.4.2.6.2.2 0 .4-.1.6-.1.3-.1.6-.2.9-.2.2 0 .4 0 .7.2.3.2 1.2.9 1.4 1.1.2.2.4.5.5.9.1.3 0 .6 0 .9 0 .3-.1.6-.1.9 0 .3-.1.6-.2.9-.1.3-.2.6-.4.9-.1.2-.2.4-.2.5-.1.2-.2.4-.3.5-.1.2-.1.4-.1.7 0 .3.1.7.2 1 .1.3.2.6.4.9.2.3.4.6.6.9.2.3.4.7.4 1.1 0 .4-.4.7-.6 1z" />
        </svg>

        <span>Chat on WhatsApp</span>
      </a>
    </div>
  </div>
)}



        </div>
{/* INSTALL HELP / INSTRUCTIONS (shown when beforeinstallprompt not available or the user dismissed) */}
{showInstallModal && (
  <div
    className="install-overlay"
    onClick={() => setShowInstallModal(false)}
    style={{
      position: "fixed",
      inset: 0,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "rgba(0,0,0,0.5)",
      zIndex: 4000
    }}
  >
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        width: "92%",
        maxWidth: 420,
        background: "#fff",
        borderRadius: 12,
        padding: 18,
        boxShadow: "0 6px 24px rgba(0,0,0,0.3)",
        color: "#011F26"
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{ margin: 0 }}>Add VIZ to your Home Screen</h3>
        <button onClick={() => setShowInstallModal(false)} style={{ background: "transparent", border: "none", fontSize: 18 }}>✕</button>
      </div>

      <div style={{ marginTop: 12, fontSize: 14, lineHeight: "1.45" }}>
        { /* 1) Chrome / Android instructions */ }
        <div style={{ marginBottom: 10 }}>
          <strong>Android / Chrome</strong>
          <div style={{ marginTop: 6 }}>
            If you see a browser prompt near the address bar, accept it. If not:
            open the browser menu (⋮) → <strong>Add to Home screen</strong>.
          </div>
        </div>

        { /* 2) iOS / Safari instructions */ }
        <div style={{ marginBottom: 10 }}>
          <strong>iPhone / iPad (Safari)</strong>
          <div style={{ marginTop: 6 }}>
            Tap the <em>Share</em> icon (box with ↑) → scroll → <strong>Add to Home Screen</strong>.
          </div>
        </div>

        { /* 3) Desktop */ }
        <div>
          <strong>Desktop (Chrome/Edge)</strong>
          <div style={{ marginTop: 6 }}>
            If install is supported you may see an install icon in the address bar — click it.
          </div>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
        <button
          onClick={() => setShowInstallModal(false)}
          style={{
            padding: "8px 12px",
            background: "#04BFBF",
            border: "none",
            color: "#fff",
            borderRadius: 8,
            fontWeight: 600
          }}
        >
          Got it
        </button>
      </div>
    </div>
  </div>
)}

      </>
  );
};

const supportStyles = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0, 0, 0, 0.68)",
    backdropFilter: "blur(8px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
    zIndex: 4000,
  },

  modal: {
    width: "100%",
    maxWidth: "380px",
    background:
      "linear-gradient(180deg, rgba(16,27,34,0.98) 0%, rgba(10,18,24,0.98) 100%)",
    border: "1px solid rgba(4,191,191,0.20)",
    borderRadius: "20px",
    boxShadow: "0 24px 60px rgba(0,0,0,0.45)",
    padding: "22px 18px 18px",
    position: "relative",
    color: "#e8f7fb",
  },

  closeButton: {
    position: "absolute",
    top: "10px",
    right: "12px",
    width: "32px",
    height: "32px",
    borderRadius: "50%",
    border: "none",
    background: "rgba(255,255,255,0.06)",
    color: "#9dc5cf",
    fontSize: "16px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  header: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
    marginBottom: "18px",
  },

  iconWrap: {
    width: "54px",
    height: "54px",
    borderRadius: "16px",
    background: "linear-gradient(135deg, #04BFBF 0%, #029a9a 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 10px 24px rgba(4,191,191,0.30)",
    marginBottom: "12px",
  },

  title: {
    margin: 0,
    fontSize: "20px",
    fontWeight: 700,
    color: "#ffffff",
    lineHeight: 1.2,
  },

  subtitle: {
    margin: "8px 0 0",
    fontSize: "13px",
    lineHeight: 1.5,
    color: "#8fb0bb",
    maxWidth: "280px",
  },

  infoList: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    marginBottom: "18px",
  },

  infoRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    padding: "12px 14px",
    borderRadius: "14px",
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.06)",
  },

  infoLabel: {
    fontSize: "12px",
    fontWeight: 600,
    color: "#89a5af",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    minWidth: "72px",
  },

  infoValueLink: {
    fontSize: "13px",
    fontWeight: 600,
    color: "#e8f7fb",
    textDecoration: "none",
    textAlign: "right",
    wordBreak: "break-word",
    flex: 1,
  },

  whatsappButton: {
    width: "100%",
    minHeight: "50px",
    borderRadius: "14px",
    background: "linear-gradient(90deg, #25D366 0%, #1fb957 100%)",
    color: "#ffffff",
    textDecoration: "none",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    fontWeight: 700,
    fontSize: "14px",
    boxShadow: "0 12px 28px rgba(37,211,102,0.26)",
  },
};

const styles = {
  
  qrFloatingButton: {
    position: "absolute",
    top: "80px",
    right: "20px",
    width: "50px",
    height: "50px",
    borderRadius: "50%",
    backgroundColor: "#ff9100",
    border: "none",
    boxShadow: "0 0 12px #ff9100",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    zIndex: 1002,
  },

  qrIcon: {
    width: "28px",
    height: "28px",
    filter: "invert(10%) drop-shadow(0 0 2px #0f1a1d)",
  },

  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "50px",
    backgroundColor: "#0f1a1d",
    boxShadow: "0 2px 12px #86c6d7",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1002,
  },

  logo: {
    height: "70px",
    filter: "drop-shadow(0 0 6px #86c6d7)",
  },

  container: {
    width: "100%",
    height: "100vh",
    position: "relative",
    backgroundColor: "#0f1a1d",
  },
  mapContainer: {
    width: "100%",
    height: "100%",
    position: "absolute",
    top: 0,
    left: 0,
  },
  buttonContainer: {
    position: "fixed",
    bottom: "15px",
    left: "50%",
    transform: "translateX(-50%)",
    width: "90%",
    display: "flex",
    justifyContent: "space-between",
    zIndex: 1001,
  },
  button: {
    flex: 1,
    padding: "12px",
    fontSize: "14px",
    margin: "0 5px",
    borderRadius: "6px",
    border: "none",
    backgroundColor: "#193f4a",
    color: "#cdebf5",
    cursor: "pointer",
    boxShadow: "0 0 8px #86c6d7",
    transition: "all 0.3s ease",
  },
  scanButton: {
    flex: 1.5,
    padding: "12px",
    fontSize: "14px",
    margin: "0 5px",
    borderRadius: "8px",
    border: "none",
    backgroundColor: "#ff9100",
    color: "#0f1a1d",
    fontWeight: "bold",
    cursor: "pointer",
    boxShadow: "0 0 10px #ff9100",
    transition: "all 0.3s ease",
  },
};

export default Home;