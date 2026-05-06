import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Slider,
  TextField,
  Button,
  Typography,
  Box,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import FooterNav from "../components/FooterNav";

const Profile = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = localStorage.getItem("user");
  const userData = user && user !== "undefined" ? JSON.parse(user) : null;

  const [policyPopup, setPolicyPopup] = useState({
    open: false,
    type: "",
  });

  const openPolicy = (type) => {
    setPolicyPopup({ open: true, type });
  };

  const closePolicy = () => {
    setPolicyPopup({ open: false, type: "" });
  };

  const [isEditing, setIsEditing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [popupVisible, setPopupVisible] = useState(false);
  const [operatorOpen, setOperatorOpen] = useState(false);

  const [updatedUserData, setUpdatedUserData] = useState({
    name: userData?.name || "",
    email: userData?.email || "",
    mobile: userData?.mobile || "",
    vehicleType: userData?.vehicleType || "",
    vehicleNumber: userData?.vehicleNumber || userData?.vehicleReg || "",
  });

  const [operatorForm, setOperatorForm] = useState({
    name: userData?.name || "",
    mobile: userData?.mobile || "",
    email: userData?.email || "",
    location: "",
    budget: 1,
  });

  const menuRef = useRef();

  useEffect(() => {}, []);

  useEffect(() => {
    setMenuOpen(false);
    setPopupVisible(false);
    setIsEditing(false);
    setOperatorOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuOpen]);

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
      const response = await fetch(
        `${process.env.REACT_APP_Backend_API_Base_URL}/api/auth/delete`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

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

    if (
      updatedUserData.email &&
      !/^\S+@\S+\.\S+$/.test(updatedUserData.email)
    ) {
      alert("Please enter a valid email address");
      return;
    }

    const response = await fetch(
      `${process.env.REACT_APP_Backend_API_Base_URL}/api/auth/updateProfile`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updatedUserData),
      }
    );

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
      window.location.href = "/profile";
    } else {
      const err = await response.json().catch(() => ({}));
      alert(err.message || "Failed to update profile. Please try again.");
    }
  };

  const handleGoToDashboard = () => {
    if (userData?.role === "admin") {
      navigate("/admin");
    } else if (userData?.role === "owner") {
      navigate("/owner");
    } else {
      setPopupVisible(true);
    }
  };

  const closePopup = () => {
    setPopupVisible(false);
  };

  const handleOperatorSubmit = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${process.env.REACT_APP_Backend_API_Base_URL}/api/operator/request`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(operatorForm),
        }
      );

      if (!res.ok) {
        const text = await res.text();
        console.error("Operator request failed:", text);
        alert("Failed to submit request. Please try again.");
        return;
      }

      await res.json();
      alert("Request submitted successfully! Our team will contact you.");
      setOperatorOpen(false);
    } catch (err) {
      console.error(err);
      alert("Something went wrong. Please try again.");
    }
  };

  return (
    <>
      <style>{`
        .top-bar {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 42px;
          background-color: #001f26;
          box-shadow: 0 2px 12px rgba(4, 191, 191, 0.45);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1002;
        }

        .top-bar-logo {
          height: 62px;
          filter: drop-shadow(0 0 6px rgba(4, 191, 191, 0.8));
          object-fit: contain;
        }

        .profile-scroll::-webkit-scrollbar {
          width: 6px;
        }

        .profile-scroll::-webkit-scrollbar-thumb {
          background: rgba(4, 191, 191, 0.28);
          border-radius: 999px;
        }

        .profile-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
      `}</style>

      <div className="top-bar">
        <img src="/logo.png" alt="Sparx Logo" className="top-bar-logo" />
      </div>

      <Box
        sx={{
          width: "100vw",
          height: "100vh",
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
          overflow: "hidden",
        }}
      >
        <Box
          className="profile-scroll"
          sx={{
            flex: 1,
            width: "100%",
            maxWidth: 480,
            mt: "42px",
            px: 2,
            pt: 2.2,
            overflowY: "auto",
            WebkitOverflowScrolling: "touch",
            overscrollBehavior: "contain",
            pb: "110px",
          }}
        >
          <div style={styles.page}>
            <div style={styles.headerContainer}>
              <h2 style={styles.title}>My Profile</h2>

              <div style={styles.menuWrapper} ref={menuRef}>
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  style={styles.menuButton}
                >
                  <svg width="24" height="45" fill="#e6f9ff" viewBox="0 0 24 45">
                    <circle cx="5" cy="25" r="2" />
                    <circle cx="12" cy="25" r="2" />
                    <circle cx="19" cy="25" r="2" />
                  </svg>
                </button>

                {menuOpen && (
                  <div style={styles.dropdown}>
                    <button
                      onClick={() => {
                        setIsEditing(true);
                        setMenuOpen(false);
                      }}
                      style={styles.dropdownItem}
                    >
                      Edit Profile
                    </button>
                    <button onClick={handleLogout} style={styles.dropdownItem}>
                      Logout
                    </button>
                    <button
                      onClick={handleDeleteAccount}
                      style={{ ...styles.dropdownItem, ...styles.dropdownDanger }}
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
                    fill="#ffffff"
                    d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8V22h19.2v-2.8c0-3.2-6.4-4.8-9.6-4.8z"
                  />
                </svg>
              </div>
            </div>

            {userData ? (
              <>
                {isEditing ? (
                  <form onSubmit={handleProfileUpdate} style={styles.form}>
                    <div style={styles.formCard}>
                      <div style={styles.inputGroup}>
                        <label style={styles.label}>Name</label>
                        <input
                          type="text"
                          value={updatedUserData.name}
                          onChange={(e) =>
                            setUpdatedUserData({
                              ...updatedUserData,
                              name: e.target.value,
                            })
                          }
                          style={styles.input}
                        />
                      </div>

                      <div style={styles.inputGroup}>
                        <label style={styles.label}>Email</label>
                        <input
                          type="email"
                          value={updatedUserData.email}
                          onChange={(e) =>
                            setUpdatedUserData({
                              ...updatedUserData,
                              email: e.target.value,
                            })
                          }
                          placeholder="you@example.com"
                          style={styles.input}
                          required
                        />
                      </div>

                      <div style={styles.inputGroup}>
                        <label style={styles.label}>Mobile</label>
                        <input
                          type="text"
                          value={updatedUserData.mobile}
                          onChange={(e) =>
                            setUpdatedUserData({
                              ...updatedUserData,
                              mobile: e.target.value,
                            })
                          }
                          style={styles.input}
                        />
                      </div>

                      <div style={styles.inputGroup}>
                        <label style={styles.label}>Vehicle Type</label>
                        <input
                          type="text"
                          value={updatedUserData.vehicleType}
                          onChange={(e) =>
                            setUpdatedUserData({
                              ...updatedUserData,
                              vehicleType: e.target.value,
                            })
                          }
                          style={styles.input}
                        />
                      </div>

                      <div style={styles.inputGroup}>
                        <label style={styles.label}>Vehicle Number</label>
                        <input
                          type="text"
                          value={updatedUserData.vehicleNumber}
                          onChange={(e) =>
                            setUpdatedUserData({
                              ...updatedUserData,
                              vehicleNumber: e.target.value,
                            })
                          }
                          placeholder="MH12AB1234"
                          style={styles.input}
                        />
                      </div>

                      <div style={styles.actionRow}>
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
                      </div>
                    </div>
                  </form>
                ) : (
                  <div style={styles.cardContainer}>
                    <div style={styles.infoCard}>
                      <div style={styles.infoBlock}>
                        <span style={styles.cardLabel}>Name</span>
                        <span style={styles.cardValue}>{userData.name || "-"}</span>
                      </div>
                    </div>

                    <div style={styles.infoCard}>
                      <div style={styles.infoBlock}>
                        <span style={styles.cardLabel}>Email</span>
                        <span style={styles.cardValue}>
                          {userData.email || "Not provided"}
                        </span>
                      </div>
                    </div>

                    <div style={styles.infoCard}>
                      <div style={styles.infoBlock}>
                        <span style={styles.cardLabel}>Mobile</span>
                        <span style={styles.cardValue}>
                          {userData.mobile || "Not provided"}
                        </span>
                      </div>
                    </div>

                    <div style={styles.infoCard}>
                      <div style={styles.infoBlock}>
                        <span style={styles.cardLabel}>Vehicle Type</span>
                        <span style={styles.cardValue}>
                          {userData.vehicleType || "Not provided"}
                        </span>
                      </div>
                    </div>

                    <div style={styles.infoCard}>
                      <div style={styles.infoBlock}>
                        <span style={styles.cardLabel}>Vehicle Number</span>
                        <span style={styles.cardValue}>
                          {userData.vehicleNumber ||
                            userData.vehicleReg ||
                            "Not provided"}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p style={styles.noUser}>No user data found</p>
            )}

            <div style={styles.bottomSection}>
              <div style={styles.separator} />

              <Button
                onClick={() => setOperatorOpen(true)}
                sx={{
                  color: "#cbebfa",
                  fontWeight: 700,
                  letterSpacing: "0.3px",
                  mb: 1.2,
                  textTransform: "none",
                  borderRadius: "12px",
                  px: 2.5,
                  "&:hover": {
                    background: "rgba(4,191,191,0.08)",
                  },
                }}
              >
                CONTACT US
              </Button>

              <p
                style={{
                  ...styles.linkTextMuted,
                  marginBottom: 8,
                }}
              >
                Already own a charger?
              </p>

              <Button
                onClick={handleGoToDashboard}
                sx={{
                  mt: 0.5,
                  minWidth: 220,
                  background: "linear-gradient(90deg, #04BFBF, #027a7a)",
                  color: "#011F26",
                  fontWeight: 700,
                  borderRadius: "14px",
                  px: 3,
                  py: 1.2,
                  textTransform: "none",
                  boxShadow: "0 8px 28px rgba(4,191,191,0.28)",
                  "&:hover": {
                    background: "linear-gradient(90deg, #03a6a6, #026060)",
                  },
                }}
              >
                Go to dashboard
              </Button>

              <div style={styles.developerSection}>
                <p
                  style={{
                    ...styles.linkTextMuted,
                    color: "#ffffff",
                    marginBottom: 4,
                  }}
                >
                  Designed and Developed by
                </p>

                <p
                  style={{
                    ...styles.linkTextMuted,
                    color: "#cbebfa",
                    fontWeight: 700,
                    marginBottom: 0,
                  }}
                >
                  Vjra Technologies LLP
                </p>
              </div>

            <div style={styles.policyLinksWrap}>
              <a
                href="/terms.pdf"
                target="_blank"
                rel="noopener noreferrer"
                style={styles.policyLink}
              >
                Terms & Conditions
              </a>

              <span style={styles.policyDot}>•</span>

              <a
                href="/refund.pdf"
                target="_blank"
                rel="noopener noreferrer"
                style={styles.policyLink}
              >
                Refund Policy
              </a>
            </div>
            </div>

            {popupVisible && (
              <div style={styles.popupOverlay} onClick={closePopup}>
                <div style={styles.popupBox} onClick={(e) => e.stopPropagation()}>
                  <button onClick={closePopup} style={styles.popupCloseBtn}>
                    ✕
                  </button>

                  <Typography
                    sx={{
                      fontSize: "18px",
                      fontWeight: 700,
                      marginBottom: "8px",
                      color: "#e6f9ff",
                    }}
                  >
                    No devices linked
                  </Typography>

                  <Typography
                    sx={{
                      fontSize: "13px",
                      color: "#9bbac6",
                      marginBottom: "20px",
                      lineHeight: 1.5,
                    }}
                  >
                    You haven’t linked any charging stations yet. Link your charger
                    to start managing sessions and earnings.
                  </Typography>

                  <Button
                    fullWidth
                    onClick={() => {
                      closePopup();
                      navigate("/onboard-device");
                    }}
                    sx={{
                      background: "linear-gradient(90deg, #04BFBF, #027a7a)",
                      color: "#011F26",
                      fontWeight: 700,
                      borderRadius: "12px",
                      py: 1.2,
                      textTransform: "none",
                      boxShadow: "0 8px 30px rgba(4,191,191,0.35)",
                      "&:hover": {
                        background: "linear-gradient(90deg, #03a6a6, #026060)",
                      },
                    }}
                  >
                    Link / Register Charger
                  </Button>
                </div>
              </div>
            )}

            {policyPopup.open && (
              <div style={styles.popupOverlay} onClick={closePolicy}>
                <div
                  style={{
                    ...styles.popupBox,
                    width: "95%",
                    maxWidth: "800px",
                    height: "85vh",
                    padding: "10px",
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button onClick={closePolicy} style={styles.popupCloseBtn}>
                    ✕
                  </button>

                  <iframe
                    src={
                      policyPopup.type === "terms" ? "/terms.pdf" : "/refund.pdf"
                    }
                    title="Policy Document"
                    style={{
                      width: "100%",
                      height: "100%",
                      border: "none",
                      borderRadius: "10px",
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </Box>

        <Dialog
          open={operatorOpen}
          onClose={() => setOperatorOpen(false)}
          fullWidth
          maxWidth="sm"
          PaperProps={{
            sx: {
              background:
                "linear-gradient(180deg, rgba(13,24,30,0.98) 0%, rgba(18,27,34,0.98) 100%)",
              color: "#e6f9ff",
              border: "1px solid rgba(4,191,191,0.2)",
              borderRadius: "18px",
              boxShadow: "0 24px 60px rgba(0,0,0,0.5)",
            },
          }}
        >
          <DialogTitle
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontWeight: 700,
              color: "#e6f9ff",
              pb: 1,
            }}
          >
            Lets Revolutionize EV Charging Network
            <IconButton onClick={() => setOperatorOpen(false)}>
              <CloseIcon sx={{ color: "#04BFBF" }} />
            </IconButton>
          </DialogTitle>

          <DialogContent sx={{ pt: 1 }}>
            <Typography
              variant="body2"
              sx={{
                mb: 2.2,
                color: "#9bbac6",
                lineHeight: 1.6,
              }}
            >
              Submit your details and our team will contact you shortly.
            </Typography>

            <TextField
              label="Name"
              fullWidth
              value={operatorForm.name}
              onChange={(e) =>
                setOperatorForm({ ...operatorForm, name: e.target.value })
              }
              sx={muiFieldSx}
            />

            <TextField
              label="Mobile Number"
              fullWidth
              value={operatorForm.mobile}
              onChange={(e) =>
                setOperatorForm({ ...operatorForm, mobile: e.target.value })
              }
              sx={muiFieldSx}
            />

            <TextField
              label="Email"
              fullWidth
              value={operatorForm.email}
              onChange={(e) =>
                setOperatorForm({ ...operatorForm, email: e.target.value })
              }
              sx={muiFieldSx}
            />

            <TextField
              label="Installation Location"
              fullWidth
              placeholder="City / Area"
              value={operatorForm.location}
              onChange={(e) =>
                setOperatorForm({ ...operatorForm, location: e.target.value })
              }
              sx={{ ...muiFieldSx, mb: 3 }}
            />

            <Typography
              fontWeight={600}
              sx={{ mb: 1.2, color: "#dff9ff", fontSize: "14px" }}
            >
              Estimated Budget
            </Typography>

            <Slider
              value={operatorForm.budget}
              min={0}
              max={3}
              step={1}
              marks={[
                { value: 0, label: "< ₹5,000" },
                { value: 1, label: "₹5k – ₹15k" },
                { value: 2, label: "₹15k – ₹50k" },
                { value: 3, label: "> ₹50k" },
              ]}
              onChange={(e, val) =>
                setOperatorForm({ ...operatorForm, budget: val })
              }
              sx={{
                mb: 4,
                color: "#04BFBF",
                "& .MuiSlider-thumb": {
                  boxShadow: "0 0 12px rgba(4,191,191,0.8)",
                },
                "& .MuiSlider-markLabel": {
                  color: "#a9c8d4",
                  fontSize: "11px",
                },
                "& .MuiSlider-rail": {
                  opacity: 0.35,
                },
              }}
            />

            <Button
              fullWidth
              size="large"
              variant="contained"
              sx={{
                backgroundColor: "#04BFBF",
                color: "#0a1117",
                fontWeight: 700,
                borderRadius: 2.5,
                py: 1.25,
                textTransform: "none",
                boxShadow: "0 10px 28px rgba(4,191,191,0.28)",
                "&:hover": {
                  backgroundColor: "#04BFBF",
                },
              }}
              onClick={handleOperatorSubmit}
            >
              Submit Request
            </Button>
          </DialogContent>
        </Dialog>
      </Box>

      <FooterNav currentPage={location.pathname} />
    </>
  );
};

const muiFieldSx = {
  mb: 2,
  "& .MuiOutlinedInput-root": {
    color: "#e6f9ff",
    borderRadius: "12px",
    backgroundColor: "#0f1d23",
    "& fieldset": {
      borderColor: "rgba(255,255,255,0.08)",
    },
    "&:hover fieldset": {
      borderColor: "rgba(4,191,191,0.35)",
    },
    "&.Mui-focused fieldset": {
      borderColor: "#04BFBF",
      boxShadow: "0 0 0 2px rgba(4,191,191,0.08)",
    },
  },
  "& .MuiInputLabel-root": {
    color: "#8fb2bf",
  },
  "& .MuiInputLabel-root.Mui-focused": {
    color: "#04BFBF",
  },
};

const popupBackgroundColor = "rgba(22, 22, 22, 0.95)";

const styles = {
  page: {
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(18,27,34,0.95) 100%)",
    border: "1px solid rgba(4,191,191,0.18)",
    borderRadius: "22px",
    boxShadow: "0 18px 50px rgba(4,191,191,0.08)",
    backdropFilter: "blur(8px)",
    padding: "22px 16px 28px 16px",
    fontFamily:
      "Poppins, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial",
    color: "#e6f9ff",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    width: "100%",
    boxSizing: "border-box",
    maxWidth: 420,
    margin: "0 auto",
  },

  headerContainer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    width: "100%",
    marginBottom: "8px",
    marginTop: "2px",
    minHeight: "34px",
  },

  title: {
    color: "#e6f9ff",
    textAlign: "center",
    fontSize: "22px",
    fontWeight: 700,
    letterSpacing: "0.4px",
    fontFamily:
      "Poppins, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial",
    margin: 0,
  },

  menuWrapper: {
    position: "absolute",
    right: "2px",
    top: "-3px",
  },

  menuButton: {
    background: "transparent",
    border: "none",
    cursor: "pointer",
    padding: "2px 4px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  dropdown: {
    position: "absolute",
    right: "0",
    top: "34px",
    background: "#f6fbfd",
    borderRadius: "12px",
    boxShadow: "0 12px 30px rgba(0,0,0,0.22)",
    zIndex: 20,
    minWidth: "160px",
    overflow: "hidden",
    border: "1px solid rgba(0,0,0,0.06)",
  },

  dropdownItem: {
    padding: "11px 14px",
    width: "100%",
    textAlign: "left",
    background: "transparent",
    border: "none",
    cursor: "pointer",
    fontSize: "14px",
    color: "#011F26",
    borderBottom: "1px solid rgba(0,0,0,0.06)",
  },

  dropdownDanger: {
    color: "#d93636",
    borderBottom: "none",
  },

  profileIconContainer: {
    marginTop: "6px",
    marginBottom: "22px",
  },

  profileCircle: {
    width: "92px",
    height: "92px",
    borderRadius: "50%",
    background: "linear-gradient(135deg,#04bfbf 0%,#027a7a 100%)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    boxShadow: "0 8px 24px rgba(4,191,191,0.22)",
    border: "2px solid rgba(255,255,255,0.06)",
  },

  cardContainer: {
    width: "100%",
    maxWidth: "420px",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    boxSizing: "border-box",
  },

  infoCard: {
    width: "100%",
    background: "rgba(4,191,191,0.06)",
    borderRadius: "14px",
    padding: "14px 16px",
    boxShadow: "0 6px 20px rgba(0,0,0,0.22)",
    display: "flex",
    alignItems: "center",
    border: "1px solid rgba(4,191,191,0.15)",
    boxSizing: "border-box",
  },

  infoBlock: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    width: "100%",
    minWidth: 0,
  },

  cardLabel: {
    color: "#9fc4d3",
    fontSize: "11px",
    letterSpacing: "0.8px",
    textTransform: "uppercase",
    lineHeight: 1.2,
  },

  cardValue: {
    color: "#e6f9ff",
    fontSize: "14px",
    fontWeight: 600,
    lineHeight: 1.45,
    wordBreak: "break-word",
  },

  form: {
    width: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },

  formCard: {
    width: "100%",
    background: "rgba(4,191,191,0.05)",
    borderRadius: "16px",
    padding: "16px",
    border: "1px solid rgba(4,191,191,0.14)",
    boxShadow: "0 8px 24px rgba(0,0,0,0.22)",
    boxSizing: "border-box",
  },

  inputGroup: {
    marginBottom: "14px",
    width: "100%",
  },

  label: {
    display: "block",
    color: "rgba(255,255,255,0.66)",
    fontWeight: 500,
    fontSize: "13px",
    marginBottom: "6px",
    fontFamily:
      "Poppins, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial",
  },

  input: {
    width: "100%",
    padding: "12px 13px",
    fontSize: "13px",
    borderRadius: "12px",
    background: "#0f1d23",
    color: "#e6f9ff",
    border: "1px solid rgba(255,255,255,0.07)",
    fontFamily:
      "Poppins, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial",
    outline: "none",
    transition: "border-color 0.2s, box-shadow 0.2s",
    boxSizing: "border-box",
  },

  actionRow: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    marginTop: "8px",
  },

  updateButton: {
    width: "100%",
    padding: "12px 14px",
    fontSize: "14px",
    borderRadius: "12px",
    fontWeight: 700,
    textTransform: "none",
    background: "linear-gradient(90deg, #04bfbf, #027a7a)",
    color: "#121b22",
    border: "none",
    cursor: "pointer",
    boxShadow: "0 6px 24px rgba(4,191,191,0.16)",
    fontFamily:
      "Poppins, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial",
  },

  cancelButton: {
    width: "100%",
    padding: "12px 14px",
    fontSize: "14px",
    borderRadius: "12px",
    fontWeight: 600,
    background: "rgba(255,255,255,0.03)",
    color: "#e6f9ff",
    border: "1px solid rgba(255,255,255,0.07)",
    cursor: "pointer",
    fontFamily:
      "Poppins, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial",
  },

  noUser: {
    color: "#888",
    textAlign: "center",
    fontSize: "14px",
    marginTop: "6px",
  },

  bottomSection: {
    marginTop: 30,
    paddingBottom: 14,
    width: "100%",
    maxWidth: 420,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
  },

  separator: {
    width: "100%",
    height: "1px",
    background: "linear-gradient(90deg, transparent, rgba(4,191,191,0.5), transparent)",
    marginBottom: "14px",
  },

  developerSection: {
    marginTop: "30px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "2px",
  },

  linkTextMuted: {
    fontFamily: "'Open Sans', sans-serif",
    fontSize: "14px",
    color: "#8ea8b3",
    margin: 0,
    lineHeight: 1.5,
  },

policyLinksWrap: {
  marginTop: 24,
  paddingBottom: 12,
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  flexWrap: "wrap",
  gap: "8px",
},

policyLink: {
  fontFamily: "'Open Sans', sans-serif",
  fontSize: "12px",
  color: "#8f9da3",
  textDecoration: "none",
  cursor: "pointer",
  lineHeight: 1.4,
  transition: "color 0.2s ease, opacity 0.2s ease",
  opacity: 0.9,
},

policyDot: {
  fontSize: "11px",
  color: "#6f7d83",
  lineHeight: 1,
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
    padding: "18px",
    boxSizing: "border-box",
  },

  popupBox: {
    background: popupBackgroundColor,
    border: "1px solid rgba(4,191,191,0.35)",
    borderRadius: "15px",
    boxShadow: "0 25px 60px rgba(0,0,0,0.6)",
    width: "90%",
    maxWidth: "360px",
    padding: "28px 24px",
    color: "#fff",
    position: "relative",
    textAlign: "center",
    boxSizing: "border-box",
  },

  popupCloseBtn: {
    position: "absolute",
    top: "10px",
    right: "16px",
    background: "transparent",
    border: "none",
    fontSize: "22px",
    color: "#04BFBF",
    cursor: "pointer",
  },
};

export default Profile;