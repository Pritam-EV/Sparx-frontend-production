import { useParams } from "react-router-dom";
import React, { useState, useEffect } from "react";

function ConfigureWifi() {
  const { deviceId } = useParams();

  const [bleDevice, setBleDevice] = useState(null);
  const [status, setStatus] = useState("Not connected");
  const [error, setError] = useState("");
    // 🔹 BLE UUIDs (must match ESP32 firmware)
const WIFI_SERVICE_UUID = "12345678-1234-1234-1234-1234567890ab";
const SSID_CHAR_UUID    = "abcd1111-1234-1234-1234-abcdefabcdef";
const PASS_CHAR_UUID    = "abcd2222-1234-1234-1234-abcdefabcdef";
const STATUS_CHAR_UUID  = "abcd3333-1234-1234-1234-abcdefabcdef";
// Provisioning service UUID & service name from firmware
const PROV_SERVICE_UUID = "b4df5a1c-3f6b-f4bf-ea4a-820304901a02"; // from firmware prov_uuid bytes
const PROV_SERVICE_NAME_PREFIX = "VIZ_"; // firmware passes "VIZ_" as service name

const [server, setServer] = useState(null);
const [ssid, setSsid] = useState("");
const [password, setPassword] = useState("");
const [provisionStatus, setProvisionStatus] = useState("");

const scanAndConnect = async () => {
  setError("");
  setStatus("Scanning for devices...");

  // Basic browser support check
  if (!navigator.bluetooth) {
    setError("Web Bluetooth is not supported in this browser. Use Chrome on Android or desktop.");
    setStatus("Bluetooth unsupported");
    return;
  }

  try {
    // Request device: filter by service UUID or namePrefix (safer than acceptAllDevices)
    const device = await navigator.bluetooth.requestDevice({
      // Prefer filtering by service UUID and name prefix that firmware advertises
      filters: [
        { namePrefix: PROV_SERVICE_NAME_PREFIX },   // e.g. VIZ_
        { services: [PROV_SERVICE_UUID] }           // prov service
      ],
      optionalServices: [PROV_SERVICE_UUID] // ensure GATT can access the provisioning service
    });

    if (!device) {
      setStatus("No device selected");
      return;
    }

    // Save device reference for disconnect/cleanup
    setBleDevice(device);
    setStatus(`Connecting to ${device.name || device.id}...`);

    // Connect GATT server
    const gattServer = await device.gatt.connect();
    setServer(gattServer);

    // Try to get provisioning service to confirm it's present
    const provService = await gattServer.getPrimaryService(PROV_SERVICE_UUID);

    if (!provService) {
      setStatus("Connected but provisioning service not found");
      console.warn("Provision service missing on device", device);
      return;
    }

    setStatus(`Connected to ${device.name || device.id}`);

    // Optional: start listen for status char later (depends on firmware)
    // listenProvisionStatus(gattServer);

  } catch (err) {
    console.error("BLE scan/connect error:", err);
    setError(err.message || "Bluetooth error");
    setStatus("Not connected");
  }
};


  const sendWifiCredentials = async () => {
  if (!server) {
    setError("Device not connected");
    return;
  }

  try {
    setProvisionStatus("Sending Wi-Fi credentials...");

    const service = await server.getPrimaryService(WIFI_SERVICE_UUID);

    const ssidChar = await service.getCharacteristic(SSID_CHAR_UUID);
    const passChar = await service.getCharacteristic(PASS_CHAR_UUID);

    await ssidChar.writeValue(
      new TextEncoder().encode(ssid)
    );

    await passChar.writeValue(
      new TextEncoder().encode(password)
    );

    setProvisionStatus("Credentials sent. Connecting to Wi-Fi...");
  } catch (err) {
    console.error(err);
    setError("Failed to send Wi-Fi credentials");
  }
};
const listenProvisionStatus = async () => {
  try {
    const service = await server.getPrimaryService(WIFI_SERVICE_UUID);
    const statusChar = await service.getCharacteristic(STATUS_CHAR_UUID);

    await statusChar.startNotifications();

    statusChar.addEventListener("characteristicvaluechanged", (event) => {
      const value = new TextDecoder().decode(event.target.value);
      setProvisionStatus(value);
    });
  } catch (err) {
    console.warn("Status notify not available");
  }
};

useEffect(() => {
  return () => {
    try {
      if (bleDevice?.gatt?.connected) {
        bleDevice.gatt.disconnect();
      }
    } catch (e) {
      // ignore
    }
  };
}, [bleDevice]);



  return (
    <div style={styles.container}>
      <h2>Configure Wi-Fi</h2>

      <div style={styles.card}>
        <p>
          Device ID: <strong>{deviceId}</strong>
        </p>

        <p>Status: <strong>{status}</strong></p>

        {error && <p style={styles.error}>{error}</p>}

        <button
          onClick={scanAndConnect}
          style={styles.button}
        >
          Scan & Connect via Bluetooth
        </button>
      </div>

      <p style={styles.note}>
        Make sure charger is powered ON and BLE is enabled.
      </p>

      {server && (
  <div style={{ marginTop: "20px" }}>
    <h4>Wi-Fi Configuration</h4>

    <input
      type="text"
      placeholder="Wi-Fi SSID"
      value={ssid}
      onChange={(e) => setSsid(e.target.value)}
      style={styles.input}
    />

    <input
      type="password"
      placeholder="Wi-Fi Password"
      value={password}
      onChange={(e) => setPassword(e.target.value)}
      style={styles.input}
    />

    <button
      onClick={sendWifiCredentials}
      style={styles.button}
    >
      Send Wi-Fi Credentials
    </button>

    {provisionStatus && (
      <p style={{ marginTop: "10px" }}>
        Status: <strong>{provisionStatus}</strong>
      </p>
    )}
  </div>
)}

    </div>
    
  );
}

const styles = {
    
  container: {
    padding: "24px",
    maxWidth: "500px",
    margin: "0 auto",
  },
  card: {
    background: "#ffffff",
    padding: "20px",
    borderRadius: "12px",
    boxShadow: "0 6px 20px rgba(0,0,0,0.08)",
  },
  input: {
  width: "100%",
  padding: "10px",
  marginTop: "8px",
  borderRadius: "6px",
  border: "1px solid #ccc",
},
  button: {
    marginTop: "16px",
    padding: "12px",
    width: "100%",
    background: "#4f46e5",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "16px",
  },
  error: {
    color: "red",
    marginTop: "8px",
  },
  note: {
    marginTop: "16px",
    fontSize: "13px",
    color: "#555",
    textAlign: "center",
  },
};

export default ConfigureWifi;
