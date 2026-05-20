// Key logic only — full MUI styling matches your existing ChargingOptions style
const PRESETS = [100, 200, 500, 1000];

async function handleTopup() {
  const resp = await fetch(`${BASE_URL}/api/wallet/topup/order`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ amount: topupAmount }),
  });
  const data = await resp.json();
  const cashfree = new window.Cashfree({ mode: "production" });
  cashfree.checkout({
    paymentSessionId: data.paymentSessionId,
    returnUrl: `${window.location.origin}/wallet/topup-success?order_id={order_id}`,
    redirectTarget: "_self",
  });
}