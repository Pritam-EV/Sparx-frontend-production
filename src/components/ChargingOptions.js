// ChargingOptions.js
import React, { useState, useEffect, useRef  } from "react";
import { useParams, useNavigate } from "react-router-dom";
import FooterNav from "../components/FooterNav";
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Slider,
  CircularProgress,
  Alert,
  Avatar,
  TextField,
} from "@mui/material";

function shortId(len = 8) {
  // Browser-safe, uses Web Crypto API
  const bytes = new Uint8Array(len);
  window.crypto.getRandomValues(bytes);
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[bytes[i] % chars.length];
  return out;
}

function ChargingOptions() {
  const { device_id } = useParams();
  const deviceId = device_id;
  const navigate = useNavigate();

  // device + UI states
  const [deviceDetails, setDeviceDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // ETA for occupied device
const [occupiedEta, setOccupiedEta] = useState(null);      // raw ISO string from API
const [etaLoading, setEtaLoading] = useState(false);
const [etaDisplay, setEtaDisplay] = useState(null);         // { timeStr, remaining, progress }

  // option/slider
  const [selectedOption, setSelectedOption] = useState("amount");
  const [sliderValue, setSliderValue] = useState(100);

  // computed values
  const [estimatedCost, setEstimatedCost] = useState(0);
  const [estimatedEnergy, setEstimatedEnergy] = useState(0);

  // coupon states
  const [couponCode, setCouponCode] = useState("");
  const [couponApplied, setCouponApplied] = useState(false);
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [discountedPrice, setDiscountedPrice] = useState(null);
  const [appliedCouponObj, setAppliedCouponObj] = useState(null);

  // derived, to carry forward original user selection
  const [originalSelectedAmount, setOriginalSelectedAmount] = useState(0);

  const [paymentError, setPaymentError] = useState(null);

  // ── Wallet ──
const [walletBalance, setWalletBalance] = useState(0);
const [showPaymentSheet, setShowPaymentSheet] = useState(false);
const [walletPayLoading, setWalletPayLoading] = useState(false);

  const [toast, setToast] = useState({
  open: false,
  message: "",
  type: "error",
});

// LIMITS
const minAmount = 20;
const maxAmount = 500;
const amountStep = 10;

const minEnergy = 1;
const maxEnergy = 50;
const energyStep = 0.5;

// build energy options
const energyOptions = [];
for (let e = minEnergy; e <= maxEnergy + 1e-6; e += energyStep) {
  energyOptions.push(Number(e.toFixed(2)));  // force max 2 decimals
}


const clampEnergy = (val) => {
  // snap to nearest step
  const snapped = Math.round(val / energyStep) * energyStep;
  const clamped = Math.min(maxEnergy, Math.max(minEnergy, snapped));
  // hard limit to 2 decimals
  return Number(clamped.toFixed(2));
};


// build amount options: 10, 20, ..., 1000
const amountOptions = [];
for (let a = minAmount; a <= maxAmount; a += amountStep) {
  amountOptions.push(a);
}

// clamp + snap to nearest step
const clampAmount = (val) => {
  const snapped = Math.round(val / amountStep) * amountStep;
  return Math.min(maxAmount, Math.max(minAmount, snapped));
};

// const touchStartYRef = useRef(null);

// const handleAmountWheel = (event) => {
//   event.preventDefault();
// const scrollSpeed = 3; // adjust: 1=slow, 2=medium, 3=fast
// const direction = event.deltaY > 0 ? 1 : -1;
// const next = clampAmount(sliderValue + direction * amountStep * scrollSpeed);

//   setSliderValue(next);
// };

// const handleAmountTouchStart = (event) => {
//   touchStartYRef.current = event.touches[0].clientY;
// };

// const handleAmountTouchMove = (event) => {
//   if (touchStartYRef.current == null) return;
//   const currentY = event.touches[0].clientY;
//   const diff = currentY - touchStartYRef.current;

//   if (Math.abs(diff) > 20) {
//     const direction = diff > 0 ? -1 : 1; // swipe up -> increase
//     const next = clampAmount(sliderValue + direction * amountStep);
//     setSliderValue(next);
//     touchStartYRef.current = currentY; // allow continuous scrolling
//   }
// };

// const energyTouchStartYRef = useRef(null);

// const handleEnergyWheel = (event) => {
//   event.preventDefault();
//   // scroll down -> increase energy

//   const rate = deviceDetails?.rate || 20;
// const scrollSpeed = 3;
// const direction = event.deltaY > 0 ? 1 : -1;

//   const currentEnergy = estimatedEnergy || minEnergy;
// const nextEnergy = clampEnergy(currentEnergy + direction * energyStep * scrollSpeed);

//   let newAmount = Number((nextEnergy * rate).toFixed(2));
//   newAmount = clampAmount(newAmount);
//   setSliderValue(newAmount);
// };

// const handleEnergyTouchStart = (event) => {
//   energyTouchStartYRef.current = event.touches[0].clientY;
// };

// const handleEnergyTouchMove = (event) => {
//   if (energyTouchStartYRef.current == null) return;
//   const currentY = event.touches[0].clientY;
//   const diff = currentY - energyTouchStartYRef.current;

//   if (Math.abs(diff) > 20) {
//     const direction = diff > 0 ? -1 : 1; // swipe up -> increase
//     const rate = deviceDetails?.rate || 20;

//     const currentEnergy = estimatedEnergy || minEnergy;
//     const nextEnergy = clampEnergy(currentEnergy + direction * energyStep);
//     let newAmount = Number((nextEnergy * rate).toFixed(2));
//     newAmount = clampAmount(newAmount);
//     setSliderValue(newAmount);

//     energyTouchStartYRef.current = currentY;
//   }
// };
const toastTimeoutRef = useRef(null);

const showToast = (
  message,
  type = "error"
) => {
  if (toastTimeoutRef.current) {
    clearTimeout(toastTimeoutRef.current);
  }

  setToast({
    open: true,
    message,
    type,
  });

  toastTimeoutRef.current = setTimeout(() => {
    setToast((prev) => ({
      ...prev,
      open: false,
    }));
  }, 2800);
};


  // ── Fetch wallet balance ──
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    fetch(`${process.env.REACT_APP_Backend_API_Base_URL}/api/wallet/balance`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => {
        if (typeof d.balance === "number") setWalletBalance(d.balance);
      })
      .catch(() => {}); // silent fail — wallet balance is non-critical for page load
  }, []);

  /* -------------------------
   *  Fetch device details
   * ------------------------- */
  useEffect(() => {
    if (!deviceId) {
      setError("Device ID is missing.");
      return;
    }

    const fetchDeviceDetails = async () => {
      setIsLoading(true);
      try {
        const token = localStorage.getItem("token");
        const resp = await fetch(
          `${process.env.REACT_APP_Backend_API_Base_URL}/api/devices/public/${deviceId}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: token ? `Bearer ${token}` : "",
            },
          }
        );

        if (!resp.ok) throw new Error("Failed to fetch device details.");
        const d = await resp.json();
        setDeviceDetails(d);
      } catch (e) {
        console.error("fetchDeviceDetails error:", e);
        setError("Failed to load device details. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchDeviceDetails();
  }, [deviceId]);


  // Fetch ETA when device is confirmed occupied
useEffect(() => {
  if (!deviceDetails || deviceDetails.status?.toLowerCase() !== 'occupied') {
    setOccupiedEta(null);
    setEtaDisplay(null);
    return;
  }

  const fetchDeviceEta = async () => {
    setEtaLoading(true);
    try {
      const token = localStorage.getItem('token');
      const resp = await fetch(
        `${process.env.REACT_APP_Backend_API_Base_URL}/api/sessions/device-eta/${deviceId}`,
        { headers: { Authorization: token ? `Bearer ${token}` : '' } }
      );
      if (!resp.ok) { setOccupiedEta(null); return; }
      const data = await resp.json();
      setOccupiedEta(data.estimatedEndTime || null);
      // store progress for the bar
      setEtaDisplay(prev => ({ ...prev, progress: data.energyProgressPercent || 0 }));
    } catch (e) {
      console.error('ETA fetch error:', e);
      setOccupiedEta(null);
    } finally {
      setEtaLoading(false);
    }
  };

  fetchDeviceEta();
}, [deviceDetails, deviceId]);

// Live countdown from occupiedEta
useEffect(() => {
  const compute = () => {
    if (!occupiedEta) { setEtaDisplay(null); return; }
    const eta = new Date(occupiedEta);
    const now = new Date();
    const diffMs = eta - now;

    const timeStr = eta.toLocaleTimeString('en-IN', {
      hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata',
    });

    if (diffMs <= 0) {
      setEtaDisplay(prev => ({ ...prev, timeStr, remaining: 'Any moment', label: 'Finishing up' }));
      return;
    }
    const totalMins = Math.ceil(diffMs / 60000);
    const h = Math.floor(totalMins / 60);
    const m = totalMins % 60;
    const remaining = h > 0 ? `${h}h ${m}m` : `${m} min`;
    setEtaDisplay(prev => ({ ...prev, timeStr, remaining, label: 'Available in' }));
  };

  compute();
  const t = setInterval(compute, 30_000);
  return () => clearInterval(t);
}, [occupiedEta]);



  /* -------------------------
   *  Keep estimatedCost / energy in sync with selection
   *  and compute originalSelectedAmount (before coupon)
   * ------------------------- */
  useEffect(() => {
   
    if (!deviceDetails) return;

    const rate = deviceDetails.rate || 20;

    if (selectedOption === "amount") {
      // sliderValue is an amount (₹)
      setEstimatedCost(sliderValue);
      setEstimatedEnergy(Number((sliderValue / rate).toFixed(2)));
      setOriginalSelectedAmount(sliderValue);
    } else {
      // selectedOption === "energy", sliderValue is kWh
      const computedCost = Number((sliderValue * rate).toFixed(2));
      setEstimatedCost(computedCost);
      setEstimatedEnergy(sliderValue);
      setOriginalSelectedAmount(computedCost); // carry forward the amount equivalent of energy selection
    }

    // If a coupon was previously applied but the user changes slider/option, disable coupon (to avoid inconsistency)
    // (We enforce single-apply before proceeding.)
    if (couponApplied) {
      setCouponApplied(false);
      setAppliedCouponObj(null);
      setDiscountedPrice(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sliderValue, selectedOption, deviceDetails]);




  /* -------------------------
   *  Option handlers
   * ------------------------- */
  const handleOptionSelect = (option) => {
    setSelectedOption(option);
    // reset slider to safer default (0 so user explicitly picks)
    setSliderValue(option === "amount" ? 100 : 10);
    // reset estimated fields will be recalculated by effect
  };

  const handleSliderChange = (event, value) => {
    setSliderValue(value);
  };

  // User edits the amount (₹) field
const handleAmountInputChange = (e) => {
  const raw = e.target.value;
  const value = Number(raw) || 0;
  setSliderValue(value); // still the single source of truth
};

// User edits the energy (kWh) field
const handleEnergyInputChange = (e) => {
  const raw = e.target.value;
  const value = Number(raw) || 0;
  setSliderValue(value); // still the single source of truth
};


  /* -------------------------
   *  Coupon apply -> server validation
   *  - Sends (code, deviceId, amount) to backend
   *  - backend returns { newAmount, coupon? }
   *  - If newAmount === 0 -> generate viz_ ID and immediately navigate
   * ------------------------- */
async function applyCoupon() {
  if (couponApplied) return;
  setApplyingCoupon(true);

  try {
    const token = localStorage.getItem('token');
    if (!token) {
      showToast('You must be logged in to apply a coupon.',  "error");
      setApplyingCoupon(false);
      return;
    }

    const backendBase = process.env.REACT_APP_Backend_API_Base_URL || 'https://localhost:3000'
    const resp = await fetch(
        `${process.env.REACT_APP_Backend_API_Base_URL}/api/coupons/apply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ code: couponCode.trim(), deviceId, amount: originalSelectedAmount }),
    });

    // Defensive: check for non-JSON response (like HTML error page)
    const ct = resp.headers.get('content-type') || '';
    if (!resp.ok) {
      // Read text to show helpful message
      const text = await resp.text();
      // If HTML returned, show cleaner message
      if (ct.includes('html')) {
        throw new Error('Server returned HTML. Check backend URL and that the API is running.');
      }
      // try to parse JSON error
      try {
        const jsonErr = JSON.parse(text);
        throw new Error(jsonErr.error || JSON.stringify(jsonErr));
      } catch (e) {
        throw new Error(text || 'Failed to apply coupon');
      }
    }

    if (!ct.includes('application/json')) {
      const text = await resp.text();
      throw new Error('Expected JSON response but got: ' + text.slice(0, 200));
    }

    const data = await resp.json();



    // success handling
    if (!data || typeof data.newAmount !== 'number') {
      throw new Error('Unexpected response');
    }

    setCouponApplied(true);
    setAppliedCouponObj({ ...data.coupon, code: data.coupon.code });
    setDiscountedPrice(data.newAmount);
showToast(
  `Coupon applied • Payable ₹${data.newAmount.toFixed(2)}`,
  "success"
);

    setApplyingCoupon(false);
  } catch (err) {
    console.error('applyCoupon error:', err);
const errorMessage =
  err.message === "Invalid coupon code"
    ? "Invalid Coupon"
    : err.message || "Failed to apply coupon";

showToast(errorMessage, "error");
    setApplyingCoupon(false);
  }
}

async function consumeCoupon() {
  if (!couponApplied || !appliedCouponObj?.code) return;

  try {
    const token = localStorage.getItem("token");
    await fetch(`${process.env.REACT_APP_Backend_API_Base_URL}/api/coupons/consume`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        code: appliedCouponObj.code,
        deviceId,
      }),
    });
    console.log("Coupon consumed successfully");
  } catch (err) {
    console.error("Failed to consume coupon:", err);
  }
}



  /* -------------------------
   *  Proceed to Payment
   *  - If coupon applied: payable = discountedPrice
   *  - Else: payable = estimatedCost
   *  - If payable === 0 (edge case), generate transaction id and navigate
   *  - Otherwise create Razorpay order and open modal; on success navigate to session-start passing transaction id from Razorpay
   * ------------------------- */
  // Opens the payment method selector sheet (does NOT go to Cashfree directly)
  const handleProceedToPayment = async () => {
    if (!selectedOption || sliderValue === 0) {
      showToast("Please select a charging option and value!", "error");
      return;
    }
    if (!deviceDetails) {
      showToast("Device not loaded. Try again.", "error");
      return;
    }
    const currentDeviceStatus = (deviceDetails?.status || "").toString().toLowerCase();
    if (currentDeviceStatus !== "available") {
      showToast(`Device is not available. Current status: ${currentDeviceStatus}`, "error");
      return;
    }
    // Show the payment method sheet — actual payment triggered from there
    setShowPaymentSheet(true);
  };

  // ── Called when user picks WALLET in the sheet ──
  const handlePayWithWallet = async () => {
    const payable = couponApplied && discountedPrice !== null ? discountedPrice : estimatedCost;
    const payableNum = Number(payable || 0);

    if (walletBalance < payableNum) {
      // Redirect to topup — pass shortfall as hint
      const shortfall = payableNum - walletBalance;
navigate(`/wallet/topup?need=${shortfall.toFixed(2)}`);
      return;
    }

    setWalletPayLoading(true);
    try {
      const token = localStorage.getItem("token");
      const resp = await fetch(
        `${process.env.REACT_APP_Backend_API_Base_URL}/api/wallet/pay`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            deviceId,
            amount: payableNum,
            chargingOption: selectedOption,
            energySelected: selectedOption === "energy" ? sliderValue : estimatedEnergy,
            couponCode: appliedCouponObj?.code || null,
          }),
        }
      );

      const data = await resp.json();

      if (!resp.ok || !data.success) {
        showToast(data.message || "Wallet payment failed.", "error");
        setWalletPayLoading(false);
        return;
      }

      // Consume coupon if applied
      if (couponApplied) await consumeCoupon();

      // Store pendingPayment exactly like Cashfree flow
      localStorage.setItem(
        "pendingPayment",
        JSON.stringify({
          deviceId,
          amountPaid: payableNum,
          amountSelected: originalSelectedAmount,
          discountApplied: originalSelectedAmount - payableNum,
          chargingOption: selectedOption,
          energySelected: selectedOption === "energy" ? sliderValue : estimatedEnergy,
          couponCode: appliedCouponObj?.code || null,
          paymentGateway: "wallet",
        })
      );

      setShowPaymentSheet(false);
      navigate(`/payment-success?order_id=${data.orderId}`);
    } catch (err) {
      showToast(err.message || "Wallet payment failed.", "error");
    } finally {
      setWalletPayLoading(false);
    }
  };

  // ── Called when user picks UPI/CARD in the sheet ──
  const handlePayWithCashfree = async () => {
    const payable = couponApplied && discountedPrice !== null ? discountedPrice : estimatedCost;
    const payableNum = Number(payable || 0);

    // Free / zero-amount edge case
    if (payableNum === 0) {
      const fakeOrderId = shortId(10);
      localStorage.setItem(
        "pendingPayment",
        JSON.stringify({
          deviceId,
          amountPaid: 0,
          amountSelected: originalSelectedAmount,
          discountApplied: originalSelectedAmount,
          chargingOption: selectedOption,
          energySelected: selectedOption === "energy" ? sliderValue : estimatedEnergy,
          couponCode: appliedCouponObj?.code || null,
          paymentGateway: "free",
        })
      );
      setShowPaymentSheet(false);
      navigate(`/payment-success?order_id=${fakeOrderId}`);
      return;
    }

    try {
      setPaymentError(null);

      const orderResp = await fetch(
        `${process.env.REACT_APP_Backend_API_Base_URL}/api/payment/order`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({
            amount: payableNum,
            returnUrl: `${window.location.origin}/charging-options/${deviceId}`,
            gateway: "Cashfree",
          }),
        }
      );

      let orderData = null;
      const contentType = orderResp.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        orderData = await orderResp.json();
      } else {
        throw new Error("Something went wrong while creating the order. Please try again.");
      }

      if (!orderResp.ok) {
        const alertObj = orderData?.alert;
        const msg = alertObj?.message || orderData?.message || "Kindly login to continue.";
        setPaymentError(msg);
        showToast(msg, "error");
        return;
      }

      const paymentSessionId =
        orderData?.paymentSessionId || orderData?.order?.payment_session_id;
      const orderId =
        orderData?.orderId || orderData?.order?.order_id;

      if (!paymentSessionId || !orderId) {
        showToast("Invalid response from payment server.", "error");
        return;
      }

      localStorage.setItem("cashfreeOrderId", orderId);
      localStorage.setItem(
        "pendingPayment",
        JSON.stringify({
          deviceId,
          amountPaid: payableNum,
          amountSelected: originalSelectedAmount,
          discountApplied: originalSelectedAmount - payableNum,
          chargingOption: selectedOption,
          energySelected: selectedOption === "energy" ? sliderValue : estimatedEnergy,
          couponCode: appliedCouponObj?.code || null,
          paymentGateway: "cashfree",
        })
      );
      localStorage.setItem("deviceId", deviceId);

      if (typeof window.Cashfree === "undefined") {
        throw new Error("Cashfree SDK not loaded");
      }

      const cashfree = new window.Cashfree({ mode: "production" });
      setShowPaymentSheet(false);
      cashfree.checkout({
        paymentSessionId,
        returnUrl: `${window.location.origin}/payment-success?order_id={order_id}`,
        redirectTarget: "_self",
      });
    } catch (err) {
      const msg = err?.message || "Payment failed. Please try again.";
      setPaymentError(msg);
      showToast(msg, "error");
    }
  };

  /* -------------------------
   *  Loading / error UI
   * ------------------------- */
  if (isLoading) {

    return  (

      
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="110dvh" sx={{ background: "#0b0e13" }}>
        <CircularProgress size={70} sx={{ color: "#04BFBF" }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="110dvh" sx={{ background: "#0b0e13" }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (!deviceDetails) return null;
const deviceStatus = (deviceDetails.status || "").toString().toLowerCase();

  /* -------------------------
   *  UI render
   * ------------------------- */
return (
  <>
    <style>
      {`
        @keyframes slideUpFade {
          from {
            opacity: 0;
            transform: translate(-50%, 20px);
          }

          to {
            opacity: 1;
            transform: translate(-50%, 0);
          }
        }
      `}
    </style>

    <Box
      sx={{
        height: "100dvh",
        display: "flex",
        flexDirection: "column",
        background:
          "radial-gradient(circle at top, rgba(4,191,191,0.10), transparent 35%), linear-gradient(145deg, #0b0e13, #111a21)",
        boxShadow: "0 0 20px rgba(4, 191, 191, 0.3)",
        color: "#e1f5f5",
      }}
    >
    <Box
      sx={{
        flex: 1,
        minHeight: 0,
        overflowY: "auto",
        overflowX: "hidden",
        WebkitOverflowScrolling: "touch",
        width: "100%",
        maxWidth: 720,
        mx: "auto",
        px: { xs: 2, sm: 4 },
        pt: { xs: 2, sm: 3 },
        pb: "170px",
        boxSizing: "border-box",
      }}
    >
      {/* all your existing page content stays inside here */} {/* pb for footer overlap avoidance */}
      {/* Device Info Card */}
      <Card
        sx={{
          mb: 2,
          width: { xs: "90%", sm: "80%" },
           mx: "auto", 
          background:"linear-gradient(180deg, rgba(26,39,49,0.96) 0%, rgba(17,26,33,0.96) 100%)",
          borderRadius: "22px",
          padding: "14px",
          color: "#e1f5f5",
          boxShadow: "0 0 10px rgba(4, 191, 191, 0.2)",
          display: "flex",
          alignItems: "center",
        }}
      >
        <Avatar variant="rounded" src="/device-image.png" alt="Device" sx={{ width: 90, height: 90 }} />

<Box sx={{ flex: 1 }}>
  <Typography variant="subtitle2" sx={{ color: "#7de0dd", fontSize: "0.75rem" }}>
    Charger ID{" "}
    <Typography
      component="span"
      variant="subtitle1"
      sx={{ color: "#ffffff", fontWeight: "bold", fontSize: "0.9rem", ml: 0.5 }}
    >
      {deviceDetails.device_id}
    </Typography>
  </Typography>

  <Typography variant="subtitle2" sx={{ color: "#7de0dd", fontSize: "0.75rem" }}>
    Location:{" "}
    <Typography
      component="span"
      variant="subtitle1"
      sx={{ color: "#ffffff", fontWeight: "bold", fontSize: "0.9rem", ml: 0.5 }}
    >
      {deviceDetails.location}
    </Typography>
  </Typography>



  <Typography variant="subtitle2" sx={{ color: "#7de0dd", fontSize: "0.75rem" }}>
    Rate:{" "}
    <Typography
      component="span"
      variant="subtitle1"
      sx={{ color: "#ffffff", fontWeight: "bold", fontSize: "0.9rem", ml: 0.5 }}
    >
      ₹{deviceDetails?.rate || 20}/kWh 
    </Typography>
  </Typography>

    <Typography variant="subtitle2" sx={{ color: "#7de0dd", fontSize: "0.75rem" }}>
    Status:{" "}
    <Typography
      component="span"
      variant="subtitle1"
      sx={{ color: "#ffffff", fontWeight: "bold", fontSize: "0.9rem", ml: 0.5 }}
    >
      {deviceDetails.status || "Unknown"}
    </Typography>
  </Typography>


</Box>

      </Card>
{/* ── Device ETA pill ── */}
{deviceStatus === 'occupied' && (
  <Box
    sx={{
      width: { xs: '90%', sm: '80%' },
      mx: 'auto',
      mb: 2,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 1.2,
      px: 2.5,
      py: 1.2,
      borderRadius: '999px',
      background: 'rgba(242,160,7,0.08)',
      border: '1px solid rgba(242,160,7,0.22)',
    }}
  >
    {/* Pulsing dot */}
    <Box sx={{
      width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
      background: '#f2a007', boxShadow: '0 0 6px #f2a007',
      animation: 'etaPulse 2s ease-in-out infinite',
      '@keyframes etaPulse': {
        '0%,100%': { opacity: 1 },
        '50%':     { opacity: 0.3 },
      },
    }} />

    <Typography sx={{ color: '#aaa', fontSize: '0.8rem', fontWeight: 500, whiteSpace: 'nowrap' }}>
      Est. Available:
    </Typography>

    <Typography sx={{ color: '#f2a007', fontSize: '0.85rem', fontWeight: 700 }}>
      {etaLoading
        ? 'Checking…'
        : etaDisplay?.timeStr
          ? `${etaDisplay.timeStr}  (${etaDisplay.remaining})`
          : 'Unavailable'}
    </Typography>
  </Box>
)}
{/* ────────────────────── */}
{/* SMART CHARGE BUILDER */}
{/* SMART CHARGE BUILDER */}
<Box
  mt={0.5}
  width={{ xs: "100%", sm: "82%" }}
  sx={{
    maxWidth: 580,
    mx: "auto",
    p: 2,
    borderRadius: "18px",
    background: "linear-gradient(180deg, #121b22 0%, #0f161d 100%)",
    boxShadow: "inset 0 0 0 1px rgba(4, 191, 191, 0.12)",
  }}
>
  <Typography
    sx={{
      color: "#ffffff",
      fontWeight: 600,
      textAlign: "center",
      fontSize: "0.98rem",
      mb: 1.2,
    }}
  >
    Choose how you want to charge
  </Typography>

  {/* Toggle */}
  <Box
    sx={{
      display: "flex",
      background: "#0c1319",
      borderRadius: "999px",
      p: 0.4,
    }}
  >
    <Button
      fullWidth
      onClick={() => handleOptionSelect("amount")}
      sx={{
        borderRadius: "999px",
        minHeight: 42,
        background:
          selectedOption === "amount"
            ? "linear-gradient(135deg,#04BFBF,#029a9a)"
            : "transparent",
        color: selectedOption === "amount" ? "#000" : "#7de0dd",
        fontWeight: 700,
      }}
    >
      Amount
    </Button>

    <Button
      fullWidth
      onClick={() => handleOptionSelect("energy")}
      sx={{
        borderRadius: "999px",
        minHeight: 42,
        background:
          selectedOption === "energy"
            ? "linear-gradient(135deg,#04BFBF,#029a9a)"
            : "transparent",
        color: selectedOption === "energy" ? "#000" : "#7de0dd",
        fontWeight: 700,
      }}
    >
      Energy
    </Button>
  </Box>

  {/* MAIN VALUE */}
  <Box textAlign="center" mt={2}>
    <Typography color="#7de0dd" fontSize="0.88rem">
      {selectedOption === "amount" ? "Amount" : "Energy"}
    </Typography>

    <Typography
      variant="h3"
      color="#F2A007"
      fontWeight={700}
      sx={{
        lineHeight: 1.1,
        mt: 0.4,
      }}
    >
      {selectedOption === "amount"
        ? `₹${sliderValue}`
        : `${sliderValue} kWh`}
    </Typography>

    <Typography
      mt={0.8}
      variant="subtitle1"
      color="#aaa"
      fontWeight={600}
    >
      {selectedOption === "amount"
        ? `≈ ${estimatedEnergy} kWh`
        : `≈ ₹${estimatedCost}`}
    </Typography>
  </Box>

  {/* SLIDER */}
  <Slider
    value={sliderValue}
    onChange={handleSliderChange}
    min={selectedOption === "amount" ? minAmount : minEnergy}
    max={selectedOption === "amount" ? maxAmount : maxEnergy}
    step={selectedOption === "amount" ? amountStep : energyStep}
    sx={{
      mt: 1,
      mb: 0.5,
      color: "#04BFBF",
    }}
  />

  {/* PRESETS */}
  <Box
    mt={1}
    display="flex"
    gap={0.8}
    flexWrap="wrap"
    justifyContent="center"
  >
    {(selectedOption === "amount"
      ? [50, 100, 200, 500]
      : [5, 10, 20, 50]
    ).map((v) => (
      <Button
        key={v}
        size="small"
        onClick={() => setSliderValue(v)}
        sx={{
          borderRadius: "999px",
          color: "#7de0dd",
          border: "1px solid rgba(4,191,191,.25)",
          minWidth: "unset",
          px: 1.8,
          py: 0.45,
          fontSize: "0.78rem",
        }}
      >
        {selectedOption === "amount" ? `₹${v}` : `${v} kWh`}
      </Button>
    ))}
  </Box>
</Box>
      {/* Proceed to Payment */}
{/* Proceed */}
<Box
  mt={2}
  width="100%"
  sx={{
    display: "flex",
    justifyContent: "center",
  }}
>
  <Button
    variant="contained"
    onClick={handleProceedToPayment}
    disabled={
      !selectedOption ||
      sliderValue === 0 ||
      (deviceDetails.status || "")
        .toString()
        .toLowerCase() === "occupied"
    }
    sx={{
      width: {
        xs: "100%",
        sm: 420,
      },
      maxWidth: 420,
      py: 1.25,
      borderRadius: "14px",
      backgroundColor:
        (deviceDetails.status || "")
          .toString()
          .toLowerCase() === "occupied"
          ? "#6c757d"
          : "#F2A007",
      color: "#fff",
      fontSize: "0.95rem",
      fontWeight: 700,
      textTransform: "none",
      boxShadow:
        (deviceDetails.status || "")
          .toString()
          .toLowerCase() === "occupied"
          ? "none"
          : "0 0 14px rgba(242,160,7,.35)",
      "&:hover": {
        backgroundColor:
          (deviceDetails.status || "")
            .toString()
            .toLowerCase() === "occupied"
            ? "#6c757d"
            : "#f4af2d",
      },
    }}
  >
    {(deviceDetails.status || "")
      .toString()
      .toLowerCase() === "occupied"
      ? "Device Occupied"
      : "Proceed to Payment"}
  </Button>
</Box>

      {/* Coupon input & Apply (styled to match) */}
{/* Coupon Section */}
<Box
  mt={1.8}
  width="100%"
  sx={{
    display: "flex",
    justifyContent: "center",
  }}
>
  <Box
    sx={{
      width: {
        xs: "100%",
        sm: 420,
      },
    }}
  >
    <Box
      sx={{
        display: "flex",
        gap: 1,
        alignItems: "center",
      }}
    >
      <TextField
        placeholder="Coupon code"
        value={couponCode}
        onChange={(e) => setCouponCode(e.target.value)}
        disabled={couponApplied || applyingCoupon}
        size="small"
        fullWidth
        sx={{
          "& .MuiOutlinedInput-root": {
            height: 46,
            borderRadius: "14px",
            background: "#243745",
            color: "#fff",
          },
          input: {
            color: "#fff",
            px: 1.6,
          },
        }}
      />

      <Button
        variant="contained"
        onClick={applyCoupon}
        disabled={
          !couponCode.trim() ||
          couponApplied ||
          applyingCoupon
        }
        sx={{
          minWidth: 110,
          height: 46,
          borderRadius: "14px",
          backgroundColor: couponApplied
            ? "#6c757d"
            : "#04BFBF",
          color: "#011F26",
          fontWeight: 700,
          textTransform: "none",
          boxShadow: "none",
          "&:hover": {
            backgroundColor: couponApplied
              ? "#6c757d"
              : "#03a9a9",
          },
        }}
      >
        {applyingCoupon
          ? "Applying..."
          : couponApplied
          ? "Applied"
          : "Apply"}
      </Button>
    </Box>


  </Box>
</Box>




       </Box>
{/* Floating Toast */}
{toast.open && (
  <Box
    sx={{
      position: "fixed",
      bottom: 120,
      left: "50%",
      transform: "translateX(-50%)",
      zIndex: 9999,
      animation: "slideUpFade 0.3s ease",
      width: "calc(100% - 32px)",
      maxWidth: 420,
    }}
  >
    <Box
sx={{
  px: 2.2,
  py: 1.6,
  borderRadius: "18px",
  backdropFilter: "blur(18px)",
  WebkitBackdropFilter: "blur(18px)",

  background:
    toast.type === "success"
      ? "rgba(14, 184, 84, 0.88)"
      : toast.type === "warning"
      ? "rgba(245, 158, 11, 0.90)"
      : "rgba(253, 70, 70, 0.7)",

  color: "#fff",

  border:
    toast.type === "success"
      ? "1px solid rgba(74, 222, 128, 0.45)"
      : toast.type === "warning"
      ? "1px solid rgba(251, 191, 36, 0.45)"
      : "1px solid rgba(252, 165, 165, 0.35)",

  boxShadow:
    toast.type === "success"
      ? "0 12px 30px rgba(14,184,84,.35)"
      : toast.type === "warning"
      ? "0 12px 30px rgba(245,158,11,.30)"
      : "0 12px 30px rgba(239,68,68,.28)",
}}
    >
      <Typography
        sx={{
          color: "#fff",
          fontWeight: 600,
          fontSize: "0.92rem",
          textAlign: "center",
        }}
      >
        {toast.message}
      </Typography>
    </Box>
  </Box>
)}

{/* ── Payment Method Sheet ── */}
{showPaymentSheet && (
  <Box
    sx={{
      position: "fixed",
      inset: 0,
      zIndex: 9000,
      background: "rgba(0,0,0,0.78)",
      display: "flex",
      alignItems: "flex-end",
      justifyContent: "center",
    }}
  >
    <Box
      sx={{
        width: "100%",
        maxWidth: 480,
        borderRadius: "24px 24px 0 0",
        background: "linear-gradient(180deg,#121b22 0%,#0f161d 100%)",
        border: "1px solid rgba(4,191,191,0.15)",
        p: 3,
        pb: 5,
      }}
    >
      {/* Header */}
      <Typography
        sx={{
          color: "#ffffff",
          fontWeight: 700,
          fontSize: "1.05rem",
          mb: 0.5,
          textAlign: "center",
        }}
      >
        Select Payment Method
      </Typography>
      <Typography
        sx={{ color: "#7de0dd", fontSize: "0.78rem", textAlign: "center", mb: 2.5 }}
      >
        Paying ₹{(couponApplied && discountedPrice !== null ? discountedPrice : estimatedCost).toFixed(2)}
      </Typography>

      {/* ── Wallet Option ── */}
      <Box
        onClick={!walletPayLoading ? handlePayWithWallet : undefined}
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          p: 2,
          borderRadius: "16px",
          background:
            walletBalance >= (couponApplied && discountedPrice !== null ? discountedPrice : estimatedCost)
              ? "rgba(4,191,191,0.08)"
              : "rgba(255,100,100,0.06)",
          border:
            walletBalance >= (couponApplied && discountedPrice !== null ? discountedPrice : estimatedCost)
              ? "1px solid rgba(4,191,191,0.25)"
              : "1px solid rgba(255,100,100,0.22)",
          cursor: walletPayLoading ? "not-allowed" : "pointer",
          mb: 1.5,
          transition: "opacity 0.2s",
          "&:active": { opacity: 0.75 },
        }}
      >
        <Box>
          <Typography sx={{ color: "#ffffff", fontWeight: 600, fontSize: "0.95rem" }}>
             Wallet
          </Typography>
          {walletBalance < (couponApplied && discountedPrice !== null ? discountedPrice : estimatedCost) ? (
            <Typography sx={{ color: "#f77", fontSize: "0.78rem", mt: 0.3 }}>
              Low balance — tap to Top Up ₹
              {(
                (couponApplied && discountedPrice !== null ? discountedPrice : estimatedCost) -
                walletBalance
              ).toFixed(2)}{" "}

            </Typography>
          ) : (
            <Typography sx={{ color: "#7de0dd", fontSize: "0.78rem", mt: 0.3 }}>
              Instant • No redirect
            </Typography>
          )}
        </Box>
        <Box sx={{ textAlign: "right" }}>
          <Typography
            sx={{
              fontWeight: 700,
              fontSize: "1rem",
              color:
                walletBalance >= (couponApplied && discountedPrice !== null ? discountedPrice : estimatedCost)
                  ? "#04BFBF"
                  : "#f77",
            }}
          >
            ₹{walletBalance.toFixed(2)}
          </Typography>
          <Typography sx={{ color: "#aaa", fontSize: "0.7rem" }}>Available</Typography>
        </Box>
      </Box>

      {/* ── UPI / Card Option ── */}
      <Box
        onClick={!walletPayLoading ? handlePayWithCashfree : undefined}
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          p: 2,
          borderRadius: "16px",
          background: "rgba(242,160,7,0.07)",
          border: "1px solid rgba(242,160,7,0.22)",
          cursor: walletPayLoading ? "not-allowed" : "pointer",
          mb: 2.5,
          "&:active": { opacity: 0.75 },
        }}
      >
        <Box>
          <Typography sx={{ color: "#ffffff", fontWeight: 600, fontSize: "0.95rem" }}>
            UPI / Debit / Credit Card
          </Typography>
          <Typography sx={{ color: "#aaa", fontSize: "0.78rem", mt: 0.3 }}>
            Redirects to Payment Gateway
          </Typography>
        </Box>
        <Typography sx={{ color: "#F2A007", fontWeight: 700, fontSize: "0.88rem" }}>
          Pay →
        </Typography>
      </Box>

      {/* ── Cancel ── */}
      <Box sx={{ display: "flex", justifyContent: "center" }}>
        <Button
          onClick={() => !walletPayLoading && setShowPaymentSheet(false)}
          sx={{
            color: "#7de0dd",
            textTransform: "none",
            fontSize: "0.85rem",
            fontWeight: 500,
          }}
        >
          Cancel
        </Button>
      </Box>

      {walletPayLoading && (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 1.5 }}>
          <CircularProgress size={22} sx={{ color: "#04BFBF" }} />
          <Typography sx={{ color: "#7de0dd", ml: 1.5, fontSize: "0.85rem", alignSelf: "center" }}>
            Processing wallet payment…
          </Typography>
        </Box>
      )}
    </Box>
  </Box>
)}

      <FooterNav />
</Box>
</>
);
}

export default ChargingOptions;
