import React, { useEffect, useState } from "react";
import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { Box, Button, TextField, Typography, Link } from "@mui/material";
import { auth } from "../firebase";
import axios from "axios";
import { api } from "../api"; // new

export default function Login() {
  const [step, setStep] = useState(1);
  const [mobile, setMobile] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [confirmationResult, setConfirmationResult] = useState(null);
  // Add loading states for button controls
  const [isOtpLoading, setIsOtpLoading] = useState(false);
  const [isVerifyLoading, setIsVerifyLoading] = useState(false);

  const navigate = useNavigate();

  // Helper: create / recreate the invisible reCAPTCHA and render it
  const createRecaptcha = async () => {
    try {
      // If an old instance exists, attempt to clear it first
      if (window.recaptchaVerifier) {
        try {
          // try to clear DOM and previous grecaptcha if possible
          window.grecaptcha && window.grecaptcha.reset(window.recaptchaWidgetId);
        } catch (e) {
          // ignore
        }
      }

      window.recaptchaVerifier = new RecaptchaVerifier(
        auth,
        "recaptcha-container",
        {
          size: "invisible",
          callback: () => {},
          "expired-callback": async () => {
            try {
              const id = await window.recaptchaVerifier.render();
              window.grecaptcha?.reset(id);
            } catch {}
          },
        }
      );

      // render and store widget id
      const widgetId = await window.recaptchaVerifier.render();
      window.recaptchaWidgetId = widgetId;
      console.log("Recaptcha (re)created:", widgetId);
    } catch (err) {
      console.warn("createRecaptcha failed:", err);
      // do not set a user-visible error here; attempts to create recaptcha may fail silently
    }
  };

  // Render invisible reCAPTCHA ONCE (or recreate if missing)
  useEffect(() => {
    if (auth) {
      createRecaptcha();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sendCode = async () => {
    setError("");
    if (mobile.length !== 10) {
      setError("Enter valid 10 digit number");
      return;
    }

    // Set loading state to freeze button
    setIsOtpLoading(true);

    try {
      // Ensure recaptcha exists and its container is still mounted
      if (!window.recaptchaVerifier) {
        await createRecaptcha();
      } else {
        // additionally verify DOM presence of recaptcha container; if absent, recreate
        const containerExists = !!document.getElementById("recaptcha-container");
        if (!containerExists) {
          await createRecaptcha();
        }
      }

      const appVerifier = window.recaptchaVerifier;
      const phoneNumber = "+91" + mobile;
      const confirmation = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
      setConfirmationResult(confirmation);
      setStep(2);
      setIsOtpLoading(false);
    } catch (err) {
      console.error("Send OTP error:", err?.code, err?.message, err?.customData || err);

      // Detect recaptcha-removed/stale errors and handle them quietly:
      const msg = err?.message || "";
      const isRecaptchaRemoved =
        msg.includes("reCAPTCHA client element has been removed") ||
        msg.toLowerCase().includes("recaptcha") ||
        err?.code === "auth/invalid-verification-id" ||
        err?.code === "auth/missing-verification-id" ||
        err?.code === "auth/internal-error" // internal-error sometimes when recaptcha failed

      if (isRecaptchaRemoved) {
        // Recreate recaptcha for the next attempt; do NOT show the firebase raw message to user
        try {
          await createRecaptcha();
        } catch {}
        // Optionally show a small friendly instruction instead of the raw error:
        setError("Could not send OTP. Please refresh the page or try again.");
      } else {
        // For other errors show a friendly message, but avoid exposing raw firebase text
        setError("Could not send OTP. Please refresh the page or try again.");
      }

      // Reset existing widget so next attempt gets a fresh token
      try {
        const id = await window.recaptchaVerifier?.render();
        window.grecaptcha?.reset(id);
      } catch {}

      // Re-enable button on error
      setIsOtpLoading(false);
    }
  };

  async function checkProfileExists(idToken) {
    try {
      console.log("checkProfileExists: calling /auth/me with idToken (prefix):", idToken?.slice(0,20));
      const res = await api.get("/auth/me", {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      console.log("checkProfileExists: /auth/me success", res.status, res.data);
      if (res.data?.token) {
        localStorage.setItem("token", res.data.token);
      } else {
        localStorage.setItem("token", idToken);
      }
      return { exists: true, user: res.data.user || res.data };
    } catch (err) {
      console.error("checkProfileExists - error", err?.response?.status, err?.response?.data || err.message);
      if (err?.response?.status === 404) return { exists: false };
      throw err;
    }
  }

  const verifyCode = async () => {
    setError("");
    if (!confirmationResult || code.length !== 6) {
      setError("Enter the 6-digit OTP");
      return;
    }

    // Set loading state to freeze button
    setIsVerifyLoading(true);

    try {
      const cred = await confirmationResult.confirm(code);
      const user = cred.user;
      const idToken = await user.getIdToken(true); // force-refresh

      let profileCheck;
      try {
        profileCheck = await checkProfileExists(idToken);
      } catch (e) {
        console.error("profile lookup failed:", e);
        profileCheck = { exists: false };
      }

      if (!profileCheck.exists) {
        localStorage.setItem("signup_token", idToken);
        navigate("/signup", { state: { mobile: user.phoneNumber } });
        return;
      }

      if (profileCheck.user) {
        localStorage.setItem("user", JSON.stringify({ uid: user.uid, phone: user.phoneNumber, ...profileCheck.user }));
      } else {
        localStorage.setItem("user", JSON.stringify({ uid: user.uid, phone: user.phoneNumber }));
      }

      navigate("/home");
    } catch (err) {
      console.error("verify error:", err?.code, err?.message, err);
      setError("Invalid OTP");
      // Unfreeze verify button when OTP is wrong
      setIsVerifyLoading(false);
      try {
        const id = await window.recaptchaVerifier.render();
        window.grecaptcha?.reset(id);
      } catch {}
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        width: "100vw",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#121b22",
        backgroundImage: `
          radial-gradient(circle at 50% 6%, rgba(20,50,60,0.9) 0%, rgba(10,20,28,0.95) 80%)
        `,
        fontFamily:
          "'Poppins', system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial",
        color: "#e6f9ff",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          width: { xs: "92vw", sm: 420 },
          p: { xs: 4, sm: 6 },
          borderRadius: 3.5,
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(18,27,34,0.95) 100%)",
          border: "1px solid rgba(255,255,255,0.06)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.7)",
          backdropFilter: "blur(8px)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <Typography
          sx={{
            fontSize: { xs: 26, sm: 32 },
            fontWeight: 600,
            color: "#e6f9ff",
            mb: 0.5,
            textAlign: "center",
          }}
        >
          Welcome back
        </Typography>

        <Typography
          sx={{
            fontSize: 14,
            color: "rgba(190,215,230,0.62)",
            mb: 3,
            textAlign: "center",
          }}
        >
          Please enter phone number to sign in.
        </Typography>

        {error && (
          <Typography
            variant="body2"
            sx={{
              color: "#ff5252",
              mb: 2,
              textAlign: "center",
              background: "rgba(255, 82, 82, 0.1)",
              p: 1,
              borderRadius: "8px",
              border: "1px solid rgba(255, 82, 82, 0.3)",
            }}
          >
            {error}
          </Typography>
        )}

        {/* Step 1: Mobile */}
        {step === 1 && (
          <>
            <Box
              sx={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 1,
                mb: 2,
              }}
            >
              <Box
                sx={{
                  minWidth: 68,
                  height: 48,
                  borderRadius: "14px",
                  background: "#0e2629",
                  border: "1px solid #03777766",
                  color: "#04bfbf",
                  fontWeight: 600,
                  fontSize: 15,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                +91
              </Box>

              <TextField
                placeholder="Mobile Number"
                variant="outlined"
                size="small"
                value={mobile}
                onChange={(e) => setMobile(e.target.value.replace(/[^0-9]/g, ""))}
                inputProps={{ maxLength: 10 }}
                sx={{
                  flex: 1,
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "14px",
                    height: 48,
                    background: "#0f1d23",
                    color: "#e6f9ff",
                    fontWeight: 500,
                  },
                  "& .MuiOutlinedInput-notchedOutline": {
                    border: "1px solid #ffffff0f",
                  },
                  "& input": { color: "#e6f9ff" },
                }}
              />
            </Box>

            <Button
              variant="contained"
              fullWidth
              onClick={sendCode}
              disabled={isOtpLoading}
              sx={{
                mt: 1,
                height: 48,
                borderRadius: "12px",
                fontWeight: 600,
                fontSize: 15,
                textTransform: "none",
                background:
                  mobile.length === 10
                    ? "linear-gradient(90deg,#04bfbf,#027a7a)"
                    : "rgba(255,255,255,0.05)",
                color: mobile.length === 10 ? "#0e2629" : "rgba(255,255,255,0.7)",
              }}
            >
              Get OTP
            </Button>
          </>
        )}

        {/* Step 2: OTP */}
        {step === 2 && (
          <>
            <TextField
              placeholder="Enter OTP"
              variant="outlined"
              size="small"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ""))}
              inputProps={{ maxLength: 6 }}
              sx={{
                mt: 1.5,
                width: "100%",
                "& .MuiOutlinedInput-root": {
                  borderRadius: "12px",
                  height: 48,
                  background: "#0f1d23",
                  color: "#e6f9ff",
                },
                "& .MuiOutlinedInput-notchedOutline": {
                  border: "1px solid #ffffff0f",
                },
              }}
            />
            <Box sx={{ width: "100%", display: "flex", gap: 1 }}>
              <Button
                sx={{
                  mt: 2,
                  flex: 1,
                  height: 46,
                  borderRadius: "12px",
                  fontWeight: 600,
                  background: "linear-gradient(90deg,#04bfbf,#027a7a)",
                  color: "#121b22",
                }}
                onClick={verifyCode}
                disabled={code.length < 6 || isVerifyLoading}
              >
                Verify
              </Button>

              <Button
                variant="text"
                sx={{ mt: 2, color: "#04bfbf", textTransform: "none" }}
                onClick={() => {
                  setStep(1);
                  setCode("");
                  setError("");
                  setIsOtpLoading(false);
                  setIsVerifyLoading(false);
                }}
              >
                Change number
              </Button>
            </Box>
          </>
        )}

        <Box sx={{ mt: 3 }}>
          <Typography sx={{ fontSize: 13, color: "rgba(180,210,220,0.7)" }}>
            Want to explore first?{" "}
            <Link
              component="button"
              underline="none"
              sx={{ color: "#04bfbf", fontWeight: 600 }}
              onClick={() => navigate("/home")}
            >
              Explore Home
            </Link>
          </Typography>
        </Box>
      </Box>

      <div id="recaptcha-container"></div>
    </Box>
  );
}
