// PaymentSuccess.js
import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Box, Typography, Button, CircularProgress } from "@mui/material";

function PaymentSuccess() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const orderId = params.get("order_id");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(null);
  const [sessionCtx, setSessionCtx] = useState(null);
const tokenRef = useRef(null);
const pendingRef = useRef(null);

  const timerRef = useRef(null);
    const startedRef = useRef(false);

  const [imageLoaded, setImageLoaded] = useState(false);
  const autoStartActive = countdown !== null && countdown > 0;

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };
  
const goToLiveSession = (ctx) => {
  // ✅ transactionId is optional (free payments use null)
  if (!ctx?.sessionId || !ctx?.deviceId) {
    setError("Invalid session context");
    return;
  }

  // cleanup
  localStorage.removeItem("pendingPayment");
  localStorage.removeItem("cashfreeOrderId");
  navigate(`/live-session/${ctx.sessionId}`, { replace: true });
};


const startChargingSession = async ({ sessionId, deviceId, orderId }) => {
  const token = tokenRef.current;
  const pending = pendingRef.current;

  if (!token || !pending) {
    throw new Error("Missing auth or payment context");
  }
  const startResp = await fetch(
    `${process.env.REACT_APP_Backend_API_Base_URL}/api/sessions/start`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        sessionId,
        deviceId,
                transactionId: (pending.paymentGateway === "free") ? undefined : orderId,
        paymentGateway: pending.paymentGateway,   // ← add this line
        startTime: new Date().toISOString(),
        startDate: new Date().toISOString().split("T")[0],
        energySelected: pending.energySelected,
        amountPaid: pending.amountPaid,
        amountSelected: pending.amountSelected,
        discountApplied: pending.discountApplied,
        couponCode: pending.couponCode,
      }),
    }
  );

  const startData = await startResp.json();
  console.log("⚡ session start response:", startData);

  if (!startResp.ok) {
    throw new Error(startData?.error || "Session start failed");
  }

  return startData;
};

  useEffect(() => {
    async function run() {
      try {
        console.log("🔁 PaymentSuccess loaded");
        console.log("🧾 order_id:", orderId);

        if (!orderId) {
          setError("Missing order id");
          setLoading(false);
          return;
        }

       const token = localStorage.getItem("token");
tokenRef.current = token;

        if (!token) {
          setError("User not logged in");
          setLoading(false);
          return;
        }

        /* ------------------------------------------------
         * READ pendingPayment
         * ------------------------------------------------ */
        const pendingRaw = localStorage.getItem("pendingPayment");
        if (!pendingRaw) {
          setError("Pending payment data missing");
          setLoading(false);
          return;
        }

        const pending = JSON.parse(pendingRaw);
pendingRef.current = pending;

        console.log("📦 pendingPayment:", pending);

        const {
          deviceId,
          energySelected,
          amountPaid,
          amountSelected,
          discountApplied,
          couponCode,
          paymentGateway,
        } = pending;

        if (!deviceId || energySelected === undefined) {
          setError("Invalid pending payment data");
          setLoading(false);
          return;
        }

        /* ------------------------------------------------
         * GENERATE sessionId (ONCE)
         * ------------------------------------------------ */
        const sessionId = `VIZ_${Math.random().toString(36).slice(2, 10).toUpperCase()}`;


        /* ------------------------------------------------
         * VERIFY PAYMENT (SKIP FOR FREE)
         * ------------------------------------------------ */
        if (paymentGateway === "wallet") {
          // Wallet payments are already debited atomically on backend — no verify needed
          console.log("👛 Wallet flow → skipping external verification");
        } else if (paymentGateway !== "free") {
          console.log("💰 Paid flow → verifying payment");

          const verifyResp = await fetch(
            `${process.env.REACT_APP_Backend_API_Base_URL}/api/payment/verify?orderId=${orderId}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );

          const verifyData = await verifyResp.json();
          console.log("💰 verify response:", verifyData);

          if (!verifyResp.ok || !verifyData.success) {
            setError("Payment verification failed");
            setLoading(false);
            return;
          }
        } else {
          console.log("🎟️ Free flow → skipping payment verification");
        }

        /* ------------------------------------------------
         * START SESSION
         * ------------------------------------------------ */
        console.log("🚀 Starting session", {
          sessionId,
          deviceId,
          transactionId: paymentGateway === "free" ? null : orderId,
        });




        /* ------------------------------------------------
         * START COUNTDOWN → REDIRECT
         * ------------------------------------------------ */
        const ctx = {
          sessionId,
          deviceId,
          transactionId: paymentGateway === "free" ? null : orderId,
        };

        setSessionCtx(ctx);
        setLoading(false);

        stopTimer();
        let seconds = 10;
        setCountdown(seconds);

timerRef.current = setInterval(async () => {
  seconds -= 1;
  setCountdown(seconds);

  if (seconds <= 0) {

      if (startedRef.current) return;
  startedRef.current = true;
    stopTimer();

    try {
      await startChargingSession({
        sessionId,
        deviceId,
        orderId,
      });

      goToLiveSession({
        sessionId,
        deviceId,
       transactionId: paymentGateway === "free" ? null : orderId,
      });
    } catch (err) {
      console.error("❌ Failed to start session:", err);
      setError("Failed to start charging session");
    }
  }
}, 1000);

      } catch (err) {
        console.error("❌ PaymentSuccess error:", err);
        setError("Unexpected error occurred");
        setLoading(false);
      }
    }

    run();
    return () => stopTimer();
  }, [orderId, navigate]);

if (loading && !error) {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        background: "#0a1117",
        px: 2,
      }}
    >
      <CircularProgress sx={{ color: "#04BFBF", mb: 3 }} />

      <Typography
        variant="h6"
        sx={{
          color: "#ffffff",
          fontWeight: 600,
          fontSize: { xs: "1.05rem", sm: "1.2rem" },
          textAlign: "center",
        }}
      >
        Starting charging session…
      </Typography>

      <Typography
        variant="body2"
        sx={{
          color: "#9fb3c8",
          mt: 1,
          textAlign: "center",
        }}
      >
        Please wait
      </Typography>
    </Box>
  );
}

if (error) {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        background: "#0a1117",
        px: 2,
      }}
    >
      <Typography
        variant="h6"
        sx={{
          color: "#ff6b6b",
          fontWeight: 600,
          mb: 1,
          textAlign: "center",
        }}
      >
        Payment Failed
      </Typography>

      <Typography
        variant="body2"
        sx={{
          color: "#ff9a9a",
          textAlign: "center",
          mb: 3,
        }}
      >
        {error}
      </Typography>

      <Button
        variant="contained"
        onClick={() => navigate("/")}
        sx={{
          backgroundColor: "#04BFBF",
          color: "#0a1117",
          fontWeight: "bold",
          "&:hover": {
            backgroundColor: "#04BFBF",
          },
        }}
      >
        Go Home
      </Button>
    </Box>
  );
}


return (
  <Box
    sx={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "100vh",
      background: "#0a1117",
      px: 2,
    }}
  >
    {/* Instruction Text */}
    <Typography
      variant="h6"
      sx={{
        color: "#ffffff",
        mb: { xs: 1, sm: 2 },
        textAlign: "center",
        fontWeight: 600,
        fontSize: { xs: "1.1rem", sm: "1.3rem" },
      }}
    >
      Plug in the charger
    </Typography>

    {/* Charger Image */}
    <img
      src="/gun1.png"
      alt="EV Charger Gun"
      loading="eager"
      onLoad={() => setImageLoaded(true)}
      style={{
        width: "200px",
        marginBottom: "12px",
        opacity: imageLoaded ? 1 : 0,
        transition: "opacity 0.3s ease-in",
      }}
    />

    {/* Loader while image loads */}
    {!imageLoaded && (
      <CircularProgress sx={{ color: "#04BFBF", mb: 2 }} />
    )}

    {/* Countdown Text */}
    {autoStartActive && (
      <Typography
        variant="body1"
        sx={{
          color: "#04BFBF",
          mt: 4,
          fontSize: { xs: "0.95rem", sm: "1rem" },
          textAlign: "center",
        }}
      >
        Charging will auto-start in {countdown}s
      </Typography>
    )}

    {/* Start Now Button */}
    <Button
      variant="contained"
      onClick={async () => {
        if (startedRef.current) return;
startedRef.current = true;
  stopTimer();
  try {
    await startChargingSession({
      sessionId: sessionCtx.sessionId,
      deviceId: sessionCtx.deviceId,
      orderId,
    });


    goToLiveSession(sessionCtx);
  } catch (err) {
    console.error(err);
    setError("Failed to start charging session");
  }
}}

      sx={{
        mt: 3,
        borderRadius: "50%",
        width: { xs: 100, sm: 120 },
        height: { xs: 100, sm: 120 },
        backgroundColor: "#04BFBF",
        color: "#ffffff",
        fontWeight: "bold",
        fontSize: { xs: "0.9rem", sm: "1rem" },
        boxShadow: "0 0 15px #04BFBF",
        animation: "pulse 2s infinite",
        "&:hover": {
          backgroundColor: "#04BFBF",
        },
      }}
    >
      START
      <br />
      NOW
    </Button>

    {/* Pulse Animation */}
    <style>
      {`@keyframes pulse {
        0%   { box-shadow: 0 0 10px rgba(4,191,191,0.5); }
        50%  { box-shadow: 0 0 25px rgba(4,191,191,0.9); }
        100% { box-shadow: 0 0 10px rgba(4,191,191,0.5); }
      }`}
    </style>
  </Box>
);

}

export default PaymentSuccess;
