import React, { useEffect, useRef, useState } from "react";
import { api } from "../api";
import { useNavigate } from "react-router-dom";
import "../styles/appStyles.css";
import { Box } from "@mui/material";
import EvStationRoundedIcon from "@mui/icons-material/EvStationRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import FooterNav from "../components/FooterNav";
import AppHeader from "../components/AppHeader";

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
// Guest login prompt state
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  useEffect(() => {
    const isLoggedIn = !!token;
    if (isLoggedIn) {
      setShowLoginPrompt(false);
      return;
    }
    const timer = setTimeout(() => {
      setShowLoginPrompt(true);
    }, 3000);
    return () => clearTimeout(timer);
  }, [token]);

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
    // console.log("[PWA] beforeinstallprompt captured");
  };

  const handleAppInstalled = () => {
    // console.log("[PWA] app installed");
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
    // console.log("[PWA] already installed");
    return;
  }

  if (deferredPrompt) {
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;

      // console.log("[PWA] user choice:", choice?.outcome);

      setDeferredPrompt(null);

      if (choice?.outcome !== "accepted") {
        // console.log("[PWA] install dismissed");
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
      // console.log("[Locate] Got position:", latlng);

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
        // console.log("Location permission granted ✅");
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
  let cancelled = false;

  const fetchDevices = async () => {
    try {
      // Request the map-specific, minimal-data endpoint.
      const response = await api.get("/api/devices/map");

      if (cancelled) return;

      const devicesData = Array.isArray(response.data)
        ? response.data
        : [];

      setDevices(devicesData);
    } catch (error) {
      if (cancelled) return;

      console.error("Error fetching map devices:", error);
    }
  };

  fetchDevices();

  // Keep the existing 10-second map refresh.
  const interval = window.setInterval(fetchDevices, 10000);

  return () => {
    cancelled = true;
    window.clearInterval(interval);
  };
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

<style>{`
        .home-guest-overlay {
          position: fixed;
          inset: 0;
          z-index: 9000;
          background: rgba(6, 38, 43, 0.55);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          animation: homeFade 0.2s ease;
        }

        .home-guest-modal {
          width: 100%;
          max-width: 360px;
          padding: 24px 20px 20px;
          text-align: center;
          position: relative;
          background: #ffffff;
          border: 1px solid #d4f0ec;
          border-radius: 26px;
          box-shadow: 0 20px 60px rgba(0, 60, 66, 0.18);
          animation: homeScaleCenter 0.22s cubic-bezier(0.16, 1, 0.3, 1);
          font-family: 'Plus Jakarta Sans', 'Outfit', sans-serif;
          box-sizing: border-box;
        }

        .home-guest-close {
          position: absolute;
          top: 14px;
          right: 14px;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #f1fcf9;
          border: 1px solid #d4f2ec;
          color: #53757a;
          display: grid;
          place-items: center;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.15s ease;
        }
        .home-guest-close:hover {
          background: #e2f7f3;
          color: #0e2e33;
        }

        .home-guest-icon-box {
          width: 58px;
          height: 58px;
          border-radius: 20px;
          background: linear-gradient(135deg, #fff3e6 0%, #ffe3c4 100%);
          border: 1px solid #ffd4a8;
          color: #ff8236;
          display: grid;
          place-items: center;
          margin: 0 auto 14px;
          box-shadow: 0 8px 22px rgba(255, 130, 54, 0.22);
        }

        .home-guest-title {
          font-family: 'Outfit', sans-serif;
          font-size: 19px;
          font-weight: 800;
          color: #0e2e33;
          letter-spacing: -0.2px;
          margin: 0 0 6px;
        }

        .home-guest-desc {
          font-size: 12.5px;
          color: #53757a;
          line-height: 1.5;
          margin: 0 auto 18px;
          max-width: 280px;
        }

        .home-guest-perks {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-bottom: 20px;
          text-align: left;
        }

        .home-guest-perk-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          border-radius: 12px;
          background: #f7fdfc;
          border: 1px solid #e1f5f2;
          font-size: 12px;
          font-weight: 700;
          color: #00776b;
        }

        .home-btn-guest-login {
          width: 100%;
          min-height: 48px;
          border-radius: 14px;
          background: linear-gradient(135deg, #ff8236 0%, #ff521a 100%);
          color: #ffffff;
          border: none;
          font-size: 14px;
          font-weight: 800;
          cursor: pointer;
          box-shadow: 0 4px 16px rgba(255, 82, 26, 0.35);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          transition: all 0.16s ease;
        }
        .home-btn-guest-login:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(255, 82, 26, 0.45);
        }
        .home-btn-guest-login:active {
          transform: scale(0.985);
        }

        @keyframes homeScaleCenter {
          from { opacity: 0; transform: scale(0.92); }
          to { opacity: 1; transform: scale(1); }
        }

        @keyframes homeFade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>

<AppHeader />
    <div className="home-container">


      {/* <button onClick={() => navigate("/qr-scanner")} className="qr-floating-button" style={{
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
      </button> */}

    <Box sx={{ position: "relative", height: "calc(100dvh - 68px)", width: "100%", overflow: "hidden" }}>
{/* Leaflet MapContainer replaces the old map div */}
            <MapContainer
              center={[18.5204, 73.8567]}
              zoom={12}
              style={{ height: "100%", width: "100%" }}
              whenCreated={(mapInstance) => {
                // console.log("[Map] Ready");
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
                  key={device.device_id || idx}
                  position={[device.lat, device.lng]}
                  icon={icon}
                  eventHandlers={{ click: (e) => handleMarkerClick(e, device) }}
                />
              );
            })}
          </MapContainer>

            
         </Box>

{/* ── GUEST LOGIN PROMPT MODAL ── */}
      {showLoginPrompt && !token && (
        <div className="home-guest-overlay" onClick={() => setShowLoginPrompt(false)}>
          <div className="home-guest-modal" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="home-guest-close"
              onClick={() => setShowLoginPrompt(false)}
              aria-label="Dismiss login modal"
            >
              ✕
            </button>

            <div className="home-guest-icon-box">
              <EvStationRoundedIcon sx={{ fontSize: 30 }} />
            </div>

            <h3 className="home-guest-title">Ready to start charging?</h3>
            <p className="home-guest-desc">
              Sign in to unlock exclusive cashback rewards, wallet top-ups, and live session telemetry.
            </p>

            <div className="home-guest-perks">
              <div className="home-guest-perk-item">
                <span>⚡</span>
                <span>Real-time charging progress tracking</span>
              </div>
              <div className="home-guest-perk-item">
                <span>💰</span>
                <span>Instant refunds on unutilized energy</span>
              </div>
            </div>

            <button
              type="button"
              className="home-btn-guest-login"
              onClick={() => navigate("/login")}
            >
              <span>Login / Sign Up</span>
              <ArrowForwardRoundedIcon sx={{ fontSize: 17 }} />
            </button>
          </div>
        </div>
      )}

          <FooterNav />

        </div>

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