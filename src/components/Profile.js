import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Box } from "@mui/material";

const Profile = () => {
  const navigate = useNavigate();
  const user = localStorage.getItem("user");
  const userData = user && user !== "undefined" ? JSON.parse(user) : null;

  const [isEditing, setIsEditing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [popupVisible, setPopupVisible] = useState(false);
  const [updatedUserData, setUpdatedUserData] = useState({
    name: userData?.name || "",
    email: userData?.email || "",
    mobile: userData?.mobile || "", // keep for display, but not editable
    vehicleType: userData?.vehicleType || "",
    vehicleNumber: userData?.vehicleNumber || userData?.vehicleReg || "",
  });

  const menuRef = useRef();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    sessionStorage.removeItem("lastPage");
    navigate("/");
  };

  const handleDeleteAccount = async () => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete your account? This action is irreversible."
    );
    if (!confirmDelete) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${process.env.REACT_APP_Backend_API_Base_URL}/api/auth/delete`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        alert("Your account has been deleted.");
        handleLogout();
      } else {
        alert("Failed to delete account. Please try again.");
      }
    } catch (error) {
      console.error("Delete Account Error:", error);
      alert("An error occurred. Please try again later.");
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    // simple email validation
    if (updatedUserData.email && !/^\S+@\S+\.\S+$/.test(updatedUserData.email)) {
      alert("Please enter a valid email address");
      return;
    }

    const response = await fetch(`${process.env.REACT_APP_Backend_API_Base_URL}/api/auth/updateProfile`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(updatedUserData),
    });
    if (response.ok) {
      const updatedUser = await response.json();

      localStorage.setItem("user", JSON.stringify(updatedUser.user));
      setUpdatedUserData({
        name: updatedUser.user.name,
        email: updatedUser.user.email,
        mobile: updatedUser.user.mobile,
        vehicleType: updatedUser.user.vehicleType,
        vehicleNumber: updatedUser.user.vehicleNumber || "",
      });

      setIsEditing(false);
      setMenuOpen(false);
      navigate("/profile");
    } else {
      // read error message if any (optional)
      const err = await response.json().catch(() => ({}));
      alert(err.message || "Failed to update profile. Please try again.");
    }
  };

  const handleGoToDashboard = () => {
    console.log("UserData in handler:", userData);
    console.log("UserData.role:", userData?.role);

    if (userData?.role === "admin") {
      console.log("Navigating to /admin");
      navigate("/admin");
    } else if (userData?.role === "owner") {
      // Owner logic, e.g. check charger ownership
      navigate("/owner");
    } else {
      setPopupVisible(true);
    }
  };

  const closePopup = () => {
    setPopupVisible(false);
  };

  const handleBecomeOperator = () => {
    navigate("/operator-form");
  };

  return (
    <>
        <style>{`
      .top-bar {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 40px;
        background-color: #001f26;
        box-shadow: 0 2px 12px #04BFBF;
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1002;
      }

      .top-bar-logo {
        height: 65px;
        filter: drop-shadow(0 0 6px #04BFBF);
      }
    `}</style>

    <div className="top-bar">
      <img src="/logo.png" alt="Sparx Logo" className="top-bar-logo" />
    </div>

      {/* Outer full-height container. The center area (contentBox) handles scrolling */}
      <Box
        sx={{
          height: "100vh",
          width: "100vw",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-start",
          backgroundColor: "#121b22",
          backgroundImage:
            "radial-gradient(circle at 50% 6%, rgba(20,50,60,0.9) 0%, rgba(10,20,28,0.95) 80%)",
          fontFamily:
            "Poppins, system-ui, -apple-system, Segoe UI, Roboto, 'Helvetica Neue', Arial",
          color: "#e6f9ff",
          overflow: "hidden", // important: let inner box scroll
        }}
      >


        {/* Scrollable content area */}
        <Box
          sx={{
            flex: 1,
            width: "100%",
            maxWidth: 480,
            mt: "40px", // leave space for top-bar
            pb: "72px", // leave space for bottom-bar
            px: 2,
            boxSizing: "border-box",
            overflowY: "auto",
            WebkitOverflowScrolling: "touch", // smooth scroll on iOS
            display: "flex",
            justifyContent: "center",
          }}
        >
          <div style={styles.page}>
            <div style={styles.headerContainer}>
              <h2 style={styles.title}>My Profile</h2>
              <div style={styles.menuWrapper}>
                <button onClick={() => setMenuOpen(!menuOpen)} style={styles.menuButton}>
                  <svg width="24" height="45" fill="#e6f9ff" viewBox="0 0 24 45">
                    <circle cx="5" cy="25" r="2" />
                    <circle cx="12" cy="25" r="2" />
                    <circle cx="19" cy="25" r="2" />
                  </svg>
                </button>
                {menuOpen && (
                  <div ref={menuRef} style={styles.dropdown}>
                    <button
                      onClick={() => {
                        setIsEditing(true);
                        setMenuOpen(false);
                      }}
                      style={styles.dropdownItem}
                    >
                      Edit Profile
                    </button>
                    <button onClick={handleLogout} style={{ ...styles.dropdownItem }}>
                      Logout
                    </button>
                    <button
                      onClick={handleDeleteAccount}
                      style={{ ...styles.dropdownItem, color: "#ff4d4d" }}
                    >
                      Delete Account
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div style={styles.profileIconContainer}>
              <div style={styles.profileCircle}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="50"
                  height="50"
                  stroke="#fff"
                  viewBox="0 0 24 24"
                >
                  <path
                    fill="#011F26"
                    d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8V22h19.2v-2.8c0-3.2-6.4-4.8-9.6-4.8z"
                  />
                </svg>
              </div>
            </div>

            {userData ? (
              <>
                {isEditing ? (
                  <form onSubmit={handleProfileUpdate} style={styles.form}>
                    <div style={styles.inputGroup}>
                      <label style={styles.label}>Name:</label>
                      <input
                        type="text"
                        value={updatedUserData.name}
                        onChange={(e) =>
                          setUpdatedUserData({ ...updatedUserData, name: e.target.value })
                        }
                        style={styles.input}
                      />
                    </div>

                    <div style={styles.inputGroup}>
                      <label style={styles.label}>Email:</label>
                      <input
                        type="email"
                        value={updatedUserData.email}
                        onChange={(e) =>
                          setUpdatedUserData({ ...updatedUserData, email: e.target.value })
                        }
                        placeholder="you@example.com"
                        style={styles.input}
                        required
                      />
                    </div>

                    <div style={styles.inputGroup}>
                      <label style={styles.label}>Vehicle Type:</label>
                      <input
                        type="text"
                        value={updatedUserData.vehicleType}
                        onChange={(e) =>
                          setUpdatedUserData({ ...updatedUserData, vehicleType: e.target.value })
                        }
                        style={styles.input}
                      />
                    </div>

                    <div style={styles.inputGroup}>
                      <label style={styles.label}>Vehicle Number:</label>
                      <input
                        type="text"
                        value={updatedUserData.vehicleNumber}
                        onChange={(e) =>
                          setUpdatedUserData({ ...updatedUserData, vehicleNumber: e.target.value })
                        }
                        placeholder="MH12AB1234"
                        style={styles.input}
                      />
                    </div>

                    <button type="submit" style={styles.updateButton}>
                      Save Changes
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      style={styles.cancelButton}
                    >
                      Cancel
                    </button>
                  </form>
                ) : (
                  <div style={styles.cardContainer}>
                    <div style={styles.infoCard}>
                      <span style={styles.cardLabel}>Name</span>
                      <span style={styles.cardValue}>{userData.name}</span>
                    </div>
                    <div style={styles.infoCard}>
                      <span style={styles.cardLabel}>Email</span>
                      <span style={styles.cardValue}>{userData.email || "Not provided"}</span>
                    </div>
                    <div style={styles.infoCard}>
                      <span style={styles.cardLabel}>Mobile</span>
                      <span style={styles.cardValue}>{userData.mobile}</span>
                    </div>
                    <div style={styles.infoCard}>
                      <span style={styles.cardLabel}>Vehicle</span>
                      <span style={styles.cardValue}>{userData.vehicleType || "Not provided"}</span>
                    </div>
                    <div style={styles.infoCard}>
                      <span style={styles.cardLabel}>Vehicle Number</span>
                      <span style={styles.cardValue}>
                        {userData.vehicleNumber || userData.vehicleReg || "Not provided"}
                      </span>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p style={styles.noUser}>No user data found</p>
            )}

            {/* Bottom Links */}
            <div
              style={{
                marginTop: 40,
                maxWidth: 420,
                width: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
              }}
            >
              <hr style={{ width: "100%", marginBottom: 12 }} />
              <p style={styles.linkText} onClick={handleBecomeOperator}>
                Become operator and start earning
              </p>
              <p
                style={{
                  ...styles.linkText,
                  cursor: "default",
                  textDecoration: "none",
                  color: "#888",
                  marginBottom: 4,
                }}
              >
                Already own a charger?
              </p>
              <p
                style={{
                  ...styles.linkText,
                  cursor: "pointer",
                  marginTop: 0,
                }}
                onClick={handleGoToDashboard}
              >
                Go to dashboard
              </p>
                            {/* Policy Links Section */}
              <div
                style={{
                  marginTop: 24,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <a
                  href="https://merchant.razorpay.com/policy/RLogEiXDM4Oogf/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={styles.policyLink}
                >
                  Terms & Conditions
                </a>
                <a
                  href="https://merchant.razorpay.com/policy/RLogEiXDM4Oogf/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={styles.policyLink}
                >
                  Privacy Policy
                </a>
                <a
                  href="https://merchant.razorpay.com/policy/RLogEiXDM4Oogf/refund"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={styles.policyLink}
                >
                  Refund Policy
                </a>
                <a
                  href="https://merchant.razorpay.com/policy/RLogEiXDM4Oogf/shipping"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={styles.policyLink}
                >
                  Shipping Policy
                </a>
              </div>
            </div>

            {/* Popup Overlay */}
            {popupVisible && (
              <div style={styles.popupOverlay} onClick={closePopup}>
                <div style={styles.popupBox} onClick={(e) => e.stopPropagation()}>
                  <button onClick={closePopup} style={styles.popupCloseBtn}>
                    ✕
                  </button>
                  <p>No linked charger found.</p>
                  <p
                    style={{ color: "#04BFBF", cursor: "pointer", textDecoration: "underline" }}
                    onClick={() => {
                      closePopup();
                      navigate("/operator-form");
                    }}
                  >
                    Register your charger here.
                  </p>
                </div>
              </div>
            )}
          </div>
        </Box>

        {/* Bottom Bar - fixed so it does not scroll with content */}
        <div
          className="bottom-bar"
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            height: 65,
            display: "flex",
            justifyContent: "space-around",
            alignItems: "center",
            background: "001f26",
            zIndex: 40,
            pointerEvents: "auto",
          }}
        >
          <button onClick={() => navigate("/sessions")} className="home-button">
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                fill="none"
                stroke="#fff"
                strokeWidth="1"
                viewBox="0 0 24 24"
              >
                <path d="M13 2L3 14h9v8l9-12h-9z" />
              </svg>
              <span style={styles.buttonText}>Sessions</span>
            </div>
          </button>

          <button onClick={() => navigate("/home")} className="scan-button">
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                fill="none"
                stroke="#fff"
                strokeWidth="1"
                viewBox="0 0 24 24"
              >
                <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
              </svg>
              <span style={{ ...styles.buttonText, color: "#fff" }}>Home</span>
            </div>
          </button>

          <button onClick={() => navigate("/profile")} className="home-button">
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                fill="none"
                stroke="#04BFBF"
                strokeWidth="1"
                viewBox="0 0 24 24"
              >
                <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8V22h19.2v-2.8c0-3.2-6.4-4.8-9.6-4.8z" />
              </svg>
              <span style={{ ...styles.buttonText, color: "#04BFBF" }}>Profile</span>
            </div>
          </button>
        </div>
      </Box>
    </>
  );
};

const popupBackgroundColor = "rgba(22, 22, 22, 0.95)"; // Change as needed
const styles = {
  page: {
    background: "linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(18,27,34,0.95) 100%)",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: "28px",
    boxShadow: "0 20px 60px rgba(0,0,0,0.7)",
    backdropFilter: "blur(8px)",
    padding: "32px 16px 120px 16px",
    // removed minHeight: calc(100vh - 110px) so it can naturally size inside scrollable area
    fontFamily: "Poppins, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial",
    color: "#e6f9ff",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    width: "100%",
    boxSizing: "border-box",
    maxWidth: 420,
  },

  headerContainer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    width: "100%",
    marginBottom: "2px",
    marginTop: "5px",
  },
  title: {
    color: "#e6f9ff",
    textAlign: "center",
    fontSize: "28px",
    fontWeight: 600,
    letterSpacing: "1.2px",
    fontFamily: "Poppins, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial",
    marginBottom: "3px",
  },
  menuWrapper: { position: "absolute", right: "16px", top: "0" },
  menuButton: { background: "transparent", border: "none", cursor: "pointer", padding: "4px" },
  dropdown: {
    position: "absolute",
    right: 0,
    top: "28px",
    background: "#fff",
    borderRadius: "8px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
    zIndex: 10,
    minWidth: "120px",
  },
  dropdownItem: {
    padding: "10px",
    width: "100%",
    textAlign: "left",
    background: "transparent",
    border: "none",
    cursor: "pointer",
    fontSize: "14px",
    color: "#011F26",
    borderBottom: "1px solid #eee",
  },
  profileIconContainer: { marginBottom: "24px" },
  profileCircle: {
    width: "90px",
    height: "90px",
    borderRadius: "50%",
    background: "linear-gradient(135deg,#04bfbf 0%,#027a7a 100%)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    boxShadow: "0 6px 24px rgba(4,191,191,0.20)",
  },
  cardContainer: {
    width: "100%",
    maxWidth: "420px",
    display: "flex",
    flexDirection: "column",
    gap: "5px",
    boxSizing: "border-box",
    padding: "0 12px",
    wordBreak: "break-word",
  },
  infoCard: {
    background: "rgba(255,255,255,0.04)",
    borderRadius: "12px",
    padding: "14px 16px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    border: "1px solid rgba(255,255,255,0.06)",
    fontWeight: "normal",
  },
  cardLabel: {
    color: "#99c3de",
    fontSize: "13px",
    marginBottom: "0",
  },
  cardValue: {
    color: "#e6f9ff",
    fontSize: "17px",
    fontWeight: "normal",
  },
  inputGroup: { marginBottom: "16px", width: "100%", maxWidth: "420px" },
  label: {
    color: "rgba(255,255,255,0.6)",
    fontWeight: 500,
    fontSize: "14px",
    marginBottom: "4px",
    fontFamily: "Poppins, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial",
  },
  input: {
    width: "100%",
    padding: "12px",
    fontSize: "15px",
    borderRadius: "12px",
    background: "#0f1d23",
    color: "#e6f9ff",
    border: "1px solid rgba(255,255,255,0.06)",
    marginBottom: "2px",
    fontFamily: "Poppins, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial",
    outline: "none",
    transition: "border-color 0.2s",
  },
  form: { display: "flex", flexDirection: "column", alignItems: "center" },
  updateButton: {
    marginTop: "20px",
    padding: "12px",
    fontSize: "15px",
    borderRadius: "12px",
    fontWeight: 600,
    textTransform: "none",
    background: "linear-gradient(90deg, #04bfbf, #027a7a)",
    color: "#121b22",
    border: "none",
    cursor: "pointer",
    boxShadow: "0 6px 24px rgba(4,191,191,0.14)",
    fontFamily: "Poppins, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial",
    transition: "background 0.2s",
  },
  cancelButton: {
    marginTop: "10px",
    padding: "12px",
    fontSize: "15px",
    borderRadius: "12px",
    fontWeight: 600,
    background: "rgba(255,255,255,0.03)",
    color: "#e6f9ff",
    border: "1px solid rgba(255,255,255,0.06)",
    cursor: "pointer",
    fontFamily: "Poppins, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial",
    transition: "background 0.2s",
  },
  logoutButton: {
    marginTop: "24px",
    padding: "12px",
    background: "transparent",
    color: "#00fff7",
    border: "1px solid #00fff7",
    borderRadius: "12px",
    cursor: "pointer",
  },
  noUser: { color: "#888", textAlign: "center", fontSize: "14px" },
  buttonText: {
    fontFamily: "'Open Sans', sans-serif",
    fontSize: "9px",
    marginTop: "4px",
    color: "#cdebf5",
  },
  linkText: {
    fontFamily: "'Open Sans', sans-serif",
    fontSize: "15px",
    color: "#04BFBF",
    cursor: "pointer",
    marginBottom: "12px",
    textDecoration: "underline",
  },
    policyLink: {
    fontFamily: "'Open Sans', sans-serif",
    fontSize: "13px",
    color: "#04BFBF",
    textDecoration: "underline",
    cursor: "pointer",
    transition: "color 0.2s ease",
  },
  popupOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    backdropFilter: "blur(8px)",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  popupBox: {
    background: popupBackgroundColor,
    border: "2px solid #026873",
    borderRadius: "15px",
    padding: "20px 30px",
    minWidth: "250px",
    maxWidth: "300px",
    color: "#fff",
    position: "relative",
    textAlign: "center",
    // removed whiteSpace: "nowrap" so small screens can wrap text
  },
  popupCloseBtn: {
    position: "absolute",
    top: "10px",
    right: "20px",
    background: "transparent",
    border: "none",
    fontSize: "25px",
    color: "#04BFBF",
    cursor: "pointer",
  },
};

export default Profile;
