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
  const [couponErrorMsg, setCouponErrorMsg] = useState("");

  // derived, to carry forward original user selection
  const [originalSelectedAmount, setOriginalSelectedAmount] = useState(0);

  const [paymentError, setPaymentError] = useState(null);

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
      setCouponErrorMsg("");
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
   *  - If newAmount === 0 -> generate sparxpay_ ID and immediately navigate
   * ------------------------- */
async function applyCoupon() {
  if (couponApplied) return;
  setCouponErrorMsg('');
  setApplyingCoupon(true);

  try {
    const token = localStorage.getItem('token');
    if (!token) {
      setCouponErrorMsg('You must be logged in to apply a coupon.');
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


    setApplyingCoupon(false);
  } catch (err) {
    console.error('applyCoupon error:', err);
    setCouponErrorMsg(err.message || 'Failed to apply coupon');
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
  const handleProceedToPayment = async () => {
    if (!selectedOption || sliderValue === 0) {
      alert("Please select a charging option and value!");
      return;
    }

    // ensure we have device details
    if (!deviceDetails) {
      alert("Device not loaded. Try again.");
      return;
    }

    // If device is occupied, block

const currentDeviceStatus = (deviceDetails?.status || "").toString().toLowerCase();
if (currentDeviceStatus !== "available") {
  alert(`Device is not available. Current status: ${currentDeviceStatus}`);
  return;
}

    // Determine payable amount (use discounted price if available)
    const payable = couponApplied && discountedPrice !== null ? discountedPrice : estimatedCost;

    // Safety: ensure positive numeric
    const payableNum = Number(payable || 0);

if (payableNum === 0) {
  const fakeOrderId = shortId(10);

  localStorage.setItem("pendingPayment", JSON.stringify({
    deviceId,
    amountPaid: 0,
    amountSelected: originalSelectedAmount,
    discountApplied: originalSelectedAmount,
    chargingOption: selectedOption,
    energySelected: selectedOption === "energy" ? sliderValue : estimatedEnergy,
    couponCode: appliedCouponObj?.code || null,
    paymentGateway: "free"
  }));

  navigate(`/payment-success?order_id=${fakeOrderId}`);
  return;
}


    // Paid flow -> Cashfree
// Paid flow -> Cashfree
try {
  setPaymentError(null);

  console.log("Requesting to create Order." + "returning to url" + `${window.location.origin}/charging-options/${deviceId}`);

  const orderResp = await fetch(
    `${process.env.REACT_APP_Backend_API_Base_URL}/api/payment/order`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${localStorage.getItem("token")}`
      },
      body: JSON.stringify({
        amount: payableNum,
        // BE will append orderId as param to this returnUrl
        returnUrl: `${window.location.origin}/charging-options/${deviceId}`,
        // customer: {
        //   id: localStorage.getItem("userId") || "guest_user",
        //   email: "user@example.com",
        //   phone: "9999999999",
        // },
        gateway: "Cashfree"
      }),
    }
  );

  console.log("Order Created at BE.");

  let orderData = null;
  let contentType = orderResp.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    orderData = await orderResp.json();
  } else {
    // Non‑JSON (e.g. HTML or blank) – generic handling
    const text = await orderResp.text();
    if (!orderResp.ok) {
      throw new Error("Something went wrong while creating the order. Please try again.");
    } else {
      throw new Error("Unexpected response from server.");
    }
  }

  if (!orderResp.ok) {
    // Backend error with JSON body
    const alertObj = orderData?.alert;
    const msgFromAlert = alertObj?.message;
    const msgFromBody = orderData?.message;

    if (msgFromAlert) {
      setPaymentError(msgFromAlert);
      alert(msgFromAlert);
    } else if (msgFromBody) {
      setPaymentError(msgFromBody);
      alert(msgFromBody);
    } else {
      setPaymentError("Failed to create order. Please try again.");
      alert("Failed to create order. Please try again.");
    }
    return;
  }

  // resp.ok === true
  // Expected: { paymentSessionId: "...", ... } or similar
  const paymentSessionId =
    orderData?.paymentSessionId ||
    orderData?.order?.payment_session_id;

  const orderId =
    orderData?.orderId ||
    orderData?.order?.order_id;

  if (!paymentSessionId || !orderId) {
    setPaymentError("Invalid response from payment server.");
    alert("Invalid response from payment server.");
    return;
  }

  // Store orderId & pending state locally
  localStorage.setItem("cashfreeOrderId", orderId);
// Around line with localStorage.setItem('pendingPayment'...
localStorage.setItem('pendingPayment', JSON.stringify({
  deviceId,
  amountPaid: payableNum,
  amountSelected: originalSelectedAmount,
  discountApplied: originalSelectedAmount - payableNum,
  chargingOption: selectedOption,
  energySelected: selectedOption === 'energy' ? sliderValue : estimatedEnergy,
  couponCode: appliedCouponObj?.code || null,
  paymentGateway: 'cashfree'
}));

  localStorage.setItem("deviceId", deviceId);

  if (typeof window.Cashfree === "undefined") {
    throw new Error("Cashfree SDK not loaded");
  }

  const cashfree = new window.Cashfree({ mode: "production" }); // use "production" in prod

  cashfree.checkout({
    paymentSessionId,
    returnUrl: `${window.location.origin}/payment-success?order_id={order_id}`,
     redirectTarget: "_self",
  });
} catch (err) {
  console.error("Payment error:", err);
  const msg = err?.message || "Payment failed. Please try again.";
  setPaymentError(msg);
  alert(msg);
}

  };

  /* -------------------------
   *  Loading / error UI
   * ------------------------- */
  if (isLoading) {
    return (
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



{/* SMART CHARGE BUILDER */}
<Box
  mt={1}
  width={{ xs: "100%", sm: "80%" }}
  sx={{
    maxWidth: 600,
    mx: "auto",
    p: 2,
    borderRadius: "20px",
    background: "linear-gradient(180deg, #121b22 0%, #0f161d 100%)",
    boxShadow: "inset 0 0 0 1px rgba(4, 191, 191, 0.14)",
  }}
>
  <Typography sx={{ color: "#ffffff", fontWeight: 600 , textAlign: "Center" }}>
    Choose how you want to charge
  </Typography>

  {/* Toggle */}
  <Box
    sx={{
      display: "flex",
      mt: 1.5,
      background: "#0c1319",
      borderRadius: "999px",
      p: 0.5,
    }}
  >
    <Button
      fullWidth
      onClick={() => handleOptionSelect("amount")}
      sx={{
        borderRadius: "999px",
        background:
          selectedOption === "amount"
            ? "linear-gradient(135deg,#04BFBF,#029a9a)"
            : "transparent",
        color: selectedOption === "amount" ? "#000" : "#7de0dd",
      }}
    >
      Amount
    </Button>

    <Button
      fullWidth
      onClick={() => handleOptionSelect("energy")}
      sx={{
        borderRadius: "999px",
        background:
          selectedOption === "energy"
            ? "linear-gradient(135deg,#04BFBF,#029a9a)"
            : "transparent",
        color: selectedOption === "energy" ? "#000" : "#7de0dd",
      }}
    >
      Energy
    </Button>
  </Box>

  {/* MAIN VALUE */}
  <Box textAlign="center" mt={3}>
    <Typography color="#7de0dd">
      {selectedOption === "amount" ? "Amount" : "Energy"}
    </Typography>

    <Typography variant="h3" color="#F2A007" fontWeight={700}>
      {selectedOption === "amount"
        ? `₹${sliderValue}`
        : `${sliderValue} kWh`}
    </Typography>

    <Typography mt={1} variant="h5" color="#aaa" fontWeight={600}>
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
      color: "#04BFBF",
    }}
  />

  {/* PRESETS */}
  <Box
    mt={2}
    display="flex"
    gap={1}
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
          border: "1px solid rgba(4,191,191,.3)",
        }}
      >
        {selectedOption === "amount" ? `₹${v}` : `${v} kWh`}
      </Button>
    ))}
  </Box>

</Box>
      {/* Proceed to Payment */}
<Box mt={2} mb={6} textAlign="center" width="100%">
  <Button
    variant="contained"
    onClick={handleProceedToPayment}
    disabled={
      !selectedOption ||
      sliderValue === 0 ||
      (deviceDetails.status || "").toString().toLowerCase() === "occupied"
    }
    fullWidth
    sx={{
      maxWidth: 320,
      mx: "auto",
      py: 1.4,
      px: 3,
      fontSize: "0.95rem",
      borderRadius: "999px",
      backgroundColor:
        (deviceDetails.status || "").toString().toLowerCase() === "occupied"
          ? "#6c757d"
          : "#F2A007",
      color: "#fff",
      boxShadow:
        (deviceDetails.status || "").toString().toLowerCase() === "occupied"
          ? "none"
          : "0 0 12px rgba(242, 160, 7, 0.6)",
      textTransform: "none",
      fontWeight: 700,
      "&:hover": {
        backgroundColor:
          (deviceDetails.status || "").toString().toLowerCase() === "occupied"
            ? "#6c757d"
            : "#f4af2d",
      },
    }}
  >
    {(deviceDetails.status || "").toString().toLowerCase() === "occupied"
      ? "Device Occupied"
      : "Proceed"}
  </Button>
</Box>

      {/* Coupon input & Apply (styled to match) */}
<Box mt={2.5} textAlign="center" width="100%" sx={{ px: { xs: 0, sm: 0 } }}>
  <Box
    sx={{
      display: "flex",
      justifyContent: "center",
      gap: 1,
      alignItems: "stretch",
      flexWrap: "wrap",
      flexDirection: { xs: "column", sm: "row" },
    }}
  >
    <TextField
      placeholder="Enter coupon code"
      value={couponCode}
      onChange={(e) => setCouponCode(e.target.value)}
      disabled={couponApplied || applyingCoupon}
      size="small"
      fullWidth
      sx={{
        maxWidth: { xs: "100%", sm: 320 },
        input: { color: "#e1f5f5" },
        background: "#243745",
        borderRadius: "10px",
        "& .MuiOutlinedInput-root": {
          borderRadius: "10px",
        },
      }}
    />
    <Button
      variant="contained"
      onClick={applyCoupon}
      disabled={!couponCode.trim() || couponApplied || applyingCoupon}
      sx={{
        backgroundColor: couponApplied ? "#6c757d" : "#F2A007",
        px: 3,
        py: 1.1,
        borderRadius: "12px",
        minWidth: { xs: "100%", sm: "120px" },
        textTransform: "none",
        fontWeight: 700,
      }}
    >
      {applyingCoupon ? "Applying..." : couponApplied ? "Applied" : "Apply"}
    </Button>
  </Box>

  <Box mt={1.5} mb={2.5}>
    {couponErrorMsg && (
      <Alert severity="error" sx={{ mt: 2, mb: 2 }}>
        {couponErrorMsg}
      </Alert>
    )}
    {couponApplied && discountedPrice !== null && (
      <>
        <Alert severity="success" sx={{ mt: 1, mb: 2 }}>
          Coupon applied successfully!
        </Alert>
        <Typography variant="h6" color="#07c400" sx={{ mt: 1, mb: 2 }}>
          Payable Amount: ₹{discountedPrice.toFixed(2)}
        </Typography>
      </>
    )}
  </Box>
</Box>

      {paymentError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {paymentError}
        </Alert>
      )}



       </Box>

      <FooterNav />
    </Box>
  );
}

export default ChargingOptions;
