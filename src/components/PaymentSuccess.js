// PaymentSuccess.js
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

function PaymentSuccess() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const orderId = params.get("order_id");

  useEffect(() => {
    async function run() {
      try {
        console.log("🔁 PaymentSuccess loaded");
        console.log("🧾 order_id:", orderId);

        if (!orderId) {
          setError("Missing order ID");
          setLoading(false);
          return;
        }

        /* ---------------------------------
         * 1️⃣ READ pendingPayment FIRST
         * --------------------------------- */
        const pendingRaw = localStorage.getItem("pendingPayment");
        if (!pendingRaw) {
          setError("Pending payment data missing");
          setLoading(false);
          return;
        }

        const pending = JSON.parse(pendingRaw);
        console.log("📦 pendingPayment:", pending);

        const {
          deviceId,
          amountPaid,
          amountSelected,
          discountApplied,
          energySelected,
          couponCode,
          paymentGateway, // 🔥 THIS DECIDES FLOW
        } = pending;

        if (!deviceId || !energySelected) {
          setError("Invalid session data");
          setLoading(false);
          return;
        }

        /* ---------------------------------
         * 2️⃣ VERIFY ONLY IF PAID
         * --------------------------------- */
        if (paymentGateway !== "free") {
          console.log("💰 Paid flow → verifying payment");

          const verifyResp = await fetch(
            `${process.env.REACT_APP_Backend_API_Base_URL}/api/payment/verify?orderId=${orderId}`,
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
              },
            }
          );

          const verifyData = await verifyResp.json();
          console.log("💰 verify response:", verifyData);

          if (!verifyResp.ok || !verifyData.success) {
            setError("Payment not verified");
            setLoading(false);
            return;
          }
        } else {
          console.log("🎟️ Free flow → skipping verification");
        }

        /* ---------------------------------
         * 3️⃣ START SESSION
         * --------------------------------- */
        const sessionId = `sess_${deviceId}_${Date.now()}`;

        console.log("🚀 Starting session", {
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
              transactionId: orderId, // Cashfree or FREE_xxx
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
        console.log("⚡ session start response:", startData);

        if (!startResp.ok) {
          setError(startData?.error || "Session start failed");
          setLoading(false);
          return;
        }

        /* ---------------------------------
         * 4️⃣ CLEANUP
         * --------------------------------- */
        localStorage.removeItem("pendingPayment");
        localStorage.removeItem("cashfreeOrderId");
        localStorage.removeItem("deviceId");

        /* ---------------------------------
         * 5️⃣ REDIRECT
         * --------------------------------- */
        navigate("/live-session", {
          state: {
            sessionId,
            deviceId,
            transactionId: orderId,
          },
          replace: true,
        });
      } catch (err) {
        console.error("❌ PaymentSuccess error:", err);
        setError("Unexpected error occurred");
        setLoading(false);
      }
    }

    run();
  }, [navigate, orderId]);

  if (loading && !error) {
    return (
      <div style={{ textAlign: "center", marginTop: 40 }}>
        <h3>Starting charging session…</h3>
        <p>Please wait</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: "center", marginTop: 40, color: "red" }}>
        <h3>Error</h3>
        <p>{error}</p>
      </div>
    );
  }

  return null;
}

export default PaymentSuccess;
