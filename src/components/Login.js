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
  const navigate = useNavigate();

  // Render invisible reCAPTCHA ONCE and reuse it
  useEffect(() => {
    if (auth && !window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(
        auth,                   // Auth FIRST
        "recaptcha-container",  // Container ID SECOND
        {
          size: "invisible",    // set "normal" temporarily to debug visually
          callback: () => {},
          "expired-callback": async () => {
            try {
              const id = await window.recaptchaVerifier.render();
              window.grecaptcha?.reset(id);
            } catch {}
          },
        }
      );
      window.recaptchaVerifier.render().then((widgetId) => {
        window.recaptchaWidgetId = widgetId;
        console.log("Recaptcha ready:", widgetId);
      });
    }
  }, []);

  const sendCode = async () => {
    setError("");
    if (mobile.length !== 10) {
      setError("Enter valid 10 digit number");
      return;
    }
    try {
      const appVerifier = window.recaptchaVerifier;
      // Optional for debugging visible captcha:
      // await appVerifier.verify();
      const phoneNumber = "+91" + mobile;
      const confirmation = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
      setConfirmationResult(confirmation);
      setStep(2);
    } catch (err) {
      console.error("Send OTP error:", err?.code, err?.message, err?.customData || err);
      setError("Could not send OTP. " + (err?.message || ""));
      // Reset existing widget so next attempt gets a fresh token
      try {
        const id = await window.recaptchaVerifier.render();
        window.grecaptcha?.reset(id);
      } catch {}
    }
  };

async function checkProfileExists(idToken) {
  try {
    console.log("checkProfileExists: calling /auth/me with idToken (prefix):", idToken?.slice(0,20));
    const res = await api.get("/auth/me", {
      headers: { Authorization: `Bearer ${idToken}` },
    });

    console.log("checkProfileExists: /auth/me success", res.status, res.data);

    // res.data will be { user, token } per backend above
    if (res.data?.token) {
      // store the server-issued JWT for subsequent API calls that expect your JWT
      localStorage.setItem("token", res.data.token);
    } else {
      // fallback: if backend didn't send a server-token, keep Firebase idToken (less ideal)
      localStorage.setItem("token", idToken);
    }

    // return the user object for convenience
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
  try {
const cred = await confirmationResult.confirm(code);
const user = cred.user;
const idToken = await user.getIdToken(true); // force-refresh

// inside verifyCode after obtaining idToken
let profileCheck;
try {
  profileCheck = await checkProfileExists(idToken); // returns { exists: true/false, user }
} catch (e) {
  console.error("profile lookup failed:", e);
  // Optional: show a message or treat as new user
  profileCheck = { exists: false };
}

if (!profileCheck.exists) {
  // New user → go signup; preserve idToken for signup verification
  localStorage.setItem("signup_token", idToken);
  navigate("/signup", { state: { mobile: user.phoneNumber } });
  return;
}

// Existing user → token already set by checkProfileExists; store user details if needed
// If res.data.user was returned, you can store the user info too
if (profileCheck.user) {
  localStorage.setItem("user", JSON.stringify({ uid: user.uid, phone: user.phoneNumber, ...profileCheck.user }));
} else {
  localStorage.setItem("user", JSON.stringify({ uid: user.uid, phone: user.phoneNumber }));
}

navigate("/home");
  } catch (err) {
    console.error("verify error:", err?.code, err?.message, err);
    setError("Invalid OTP");
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
          <Typography sx={{ color: "#ff6b7a", mb: 1, fontSize: 14 }}>
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
                onChange={(e) =>
                  setMobile(e.target.value.replace(/[^0-9]/g, ""))
                }
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
              fullWidth
              onClick={sendCode}
              disabled={mobile.length !== 10}
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
                disabled={code.length < 6}
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
                }}
              >
                Change
              </Button>
            </Box>
          </>
        )}

        <Box sx={{ mt: 3 }}>
          <Typography sx={{ fontSize: 13, color: "rgba(180,210,220,0.7)" }}>
            Not sure yet?{" "}
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