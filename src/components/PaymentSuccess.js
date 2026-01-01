// PaymentSuccess.js
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

function PaymentSuccess() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Cashfree always sends order_id
  const orderId = params.get("order_id");

  useEffect(() => {
    async function verifyAndStartSession() {
      try {
        console.log("🔁 PaymentSuccess loaded");
        console.log("🧾 Cashfree order_id:", orderId);

        if (!orderId) {
          setError("Missing order ID from payment gateway.");
          setLoading(false);
          return;
        }

        /* ---------------------------------
         * 1️⃣ VERIFY PAYMENT WITH BACKEND
         * --------------------------------- */
        const verifyResp = await fetch(
          `${process.env.REACT_APP_Backend_API_Base_URL}/api/payment/verify?orderId=${orderId}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );

        const verifyData = await verifyResp.json();
        console.log("✅ Payment verify response:", verifyData);

        if (!verifyResp.ok || !verifyData.success) {
          setError("Payment not verified yet. Please contact support.");
          setLoading(false);
          return;
        }

        /* ---------------------------------
         * 2️⃣ READ PENDING PAYMENT DATA
         * --------------------------------- */
        const pendingRaw = localStorage.getItem("pendingPayment");
        if (!pendingRaw) {
          setError("Payment verified but session data missing.");
          setLoading(false);
          return;
        }

        const pending = JSON.parse(pendingRaw);
        console.log("📦 Pending payment data:", pending);

        const {
          deviceId,
          amountPaid,
          amountSelected,
          discountApplied,
          energySelected,
          couponCode,
        } = pending;

/* ---------------------------------
 * 🔁 PAID FLOW (Cashfree)
 * --------------------------------- */
if (paymentGateway !== "free") {
  const verifyResp = await fetch(
    `${process.env.REACT_APP_Backend_API_Base_URL}/api/payment/verify?orderId=${orderId}`,
    {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    }
  );

  const verifyData = await verifyResp.json();
  console.log("💰 Payment verify:", verifyData);

  if (!verifyResp.ok || !verifyData.success) {
    setError("Payment not verified yet.");
    setLoading(false);
    return;
  }
} else {
  console.log("🎟️ Free session detected – skipping payment verification");
}

        if (!deviceId || !energySelected) {
          setError("Invalid session data. Please contact support.");
          setLoading(false);
          return;
        }

        /* ---------------------------------
         * 3️⃣ START SESSION (CRITICAL STEP)
         * --------------------------------- */
        const sessionId = `sess_${deviceId}_${Date.now()}`;

        console.log("🚀 Starting session:", {
          sessionId,
          deviceId,
          transactionId: orderId,
        });

        const startResp = await fetch(
          `${process.env.REACT_APP_Backend_API_Base_URL}/api/sessions/start`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
            body: JSON.stringify({
              sessionId,
              deviceId,
              transactionId: orderId, // 🔥 Cashfree order_id
              startTime: new Date().toISOString(),
              startDate: new Date().toISOString().split("T")[0],
              energySelected,
              amountPaid,
              amountSelected,
              discountApplied,
              couponCode,
            }),
          }
        );

        const startData = await startResp.json();
        console.log("⚡ Session start response:", startData);

        if (!startResp.ok) {
          setError(
            startData?.error ||
              "Payment successful but session could not be started."
          );
          setLoading(false);
          return;
        }

        /* ---------------------------------
         * 4️⃣ CLEANUP (ONLY AFTER SUCCESS)
         * --------------------------------- */
        localStorage.removeItem("pendingPayment");
        localStorage.removeItem("cashfreeOrderId");
        localStorage.removeItem("deviceId");

        console.log("🧹 Local storage cleaned");

        /* ---------------------------------
         * 5️⃣ REDIRECT TO LIVE SESSION
         * --------------------------------- */
        console.log("➡️ Redirecting to LiveSession");

        navigate("/live-session", {
          state: {
            sessionId,
            deviceId,
            transactionId: orderId,
          },
          replace: true,
        });
      } catch (err) {
        console.error("❌ PaymentSuccess fatal error:", err);
        setError("Unexpected error occurred while starting session.");
        setLoading(false);
      }
    }

    verifyAndStartSession();
  }, [navigate, orderId]);

  /* ---------------------------------
   * UI STATES
   * --------------------------------- */
  if (loading && !error) {
    return (
      <div style={{ textAlign: "center", marginTop: "40px" }}>
        <h3>Verifying payment…</h3>
        <p>Please wait while we start your charging session.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: "center", marginTop: "40px", color: "red" }}>
        <h3>Payment Error</h3>
        <p>{error}</p>
      </div>
    );
  }

  return null;
}

export default PaymentSuccess;
