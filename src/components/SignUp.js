// SignUp.js
import React, { useState } from "react";
import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";
import { api } from "../api"; // new
import { auth } from "../firebase"; //
import {
  Box,
  Button,
  TextField,
  Typography,
  Link,
  MenuItem,
} from "@mui/material";

export default function SignUp() {
  const { state } = useLocation();
  const mobile = state?.mobile || "";
  const [form, setForm] = useState({
    name: "",
    email: "",
    vehicleType: "",
    vehicleNumber: "",
  });
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();
    try {

  
let phone = mobile || auth.currentUser?.phoneNumber || "";
if (!phone) {
  setError("Phone verification lost. Please login again.");
  return;
}
      const res = await api.post("/api/auth/signup", { ...form,  mobile: phone },
      { headers: { Authorization: `Bearer ${localStorage.getItem("signup_token")}` } }
      );
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      navigate("/home");
    } catch (err) {
      setError(err.response?.data?.message || "Signup failed");
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
          Create Account
        </Typography>

        <Typography
          sx={{
            fontSize: 14,
            color: "rgba(190,215,230,0.62)",
            mb: 3,
            textAlign: "center",
          }}
        >
          Fill in the details to continue
        </Typography>

        {error && (
          <Typography sx={{ color: "#ff6b7a", mb: 1, fontSize: 14 }}>
            {error}
          </Typography>
        )}

        <form
          onSubmit={handleSignup}
          style={{
            width: "100%",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          <TextField
            label="Phone"
            value={mobile}
            disabled
            fullWidth
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: "14px",
                background: "#0f1d23",
                color: "#e6f9ff",
              },
              "& .MuiOutlinedInput-notchedOutline": {
                border: "1px solid rgba(255,255,255,0.06)",
              },
              "& .MuiInputLabel-root": { color: "rgba(255,255,255,0.6)" },
            }}
          />

          <TextField
            label="Name"
            required
            fullWidth
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: "14px",
                background: "#0f1d23",
                color: "#e6f9ff",
              },
              "& .MuiOutlinedInput-notchedOutline": {
                border: "1px solid rgba(255,255,255,0.06)",
              },
              "& .MuiInputLabel-root": { color: "rgba(255,255,255,0.6)" },
            }}
          />

          <TextField
            label="Email"
            type="email"
            required
            fullWidth
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: "14px",
                background: "#0f1d23",
                color: "#e6f9ff",
              },
              "& .MuiOutlinedInput-notchedOutline": {
                border: "1px solid rgba(255,255,255,0.06)",
              },
              "& .MuiInputLabel-root": { color: "rgba(255,255,255,0.6)" },
            }}
          />

          <TextField
            select
            label="Vehicle Type"
            required
            fullWidth
            value={form.vehicleType}
            onChange={(e) => setForm({ ...form, vehicleType: e.target.value })}
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: "14px",
                background: "#0f1d23",
                color: "#e6f9ff",
              },
              "& .MuiOutlinedInput-notchedOutline": {
                border: "1px solid rgba(255,255,255,0.06)",
              },
              "& .MuiInputLabel-root": { color: "rgba(255,255,255,0.6)" },
            }}
          >
            <MenuItem value="2 Wheeler">2 Wheeler</MenuItem>
            <MenuItem value="3 Wheeler">3 Wheeler</MenuItem>
            <MenuItem value="4 Wheeler">4 Wheeler</MenuItem>
          </TextField>

          <TextField
            label="Vehicle Number"
            required
            fullWidth
            value={form.vehicleNumber}
            onChange={(e) =>
              setForm({ ...form, vehicleNumber: e.target.value })
            }
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: "14px",
                background: "#0f1d23",
                color: "#e6f9ff",
              },
              "& .MuiOutlinedInput-notchedOutline": {
                border: "1px solid rgba(255,255,255,0.06)",
              },
              "& .MuiInputLabel-root": { color: "rgba(255,255,255,0.6)" },
            }}
          />

          <Button
            type="submit"
            sx={{
              mt: 1,
              height: 48,
              borderRadius: "12px",
              fontWeight: 600,
              fontSize: 15,
              textTransform: "none",
              background: "linear-gradient(90deg,#04bfbf,#027a7a)",
              color: "#121b22",
            }}
          >
            Sign Up
          </Button>
        </form>

        <Box sx={{ mt: 3 }}>
          <Typography sx={{ fontSize: 13, color: "rgba(180,210,220,0.7)" }}>
            Already have an account?{" "}
            <Link
              component="button"
              underline="none"
              sx={{ color: "#04bfbf", fontWeight: 600 }}
              onClick={() => navigate("/login")}
            >
              Login
            </Link>
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
