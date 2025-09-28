import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../../utils/apiFetch";

const DeviceCreate = () => {
  const navigate = useNavigate();

  const [deviceData, setDeviceData] = useState({
    device_id: "",
    location: "",
    lat: "",
    lng: "",
    status: "",
    charger_type: "",
    rate: "",
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    setDeviceData({ ...deviceData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    try {
      await apiFetch("https://ev-charging-a5c53.web.app/api/devices", {
        method: "POST",
        body: JSON.stringify(deviceData),
      });
      setSuccess(true);
      setDeviceData({
        device_id: "",
        location: "",
        lat: "",
        lng: "",
        status: "",
        charger_type: "",
        rate: "",
      });
    } catch (err) {
      setError(err.message || "Failed to create device");
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.header}>Add New Device</h2>

      {error && <p style={styles.error}>{error}</p>}
      {success && <p style={styles.success}>Device created successfully!</p>}

      <form style={styles.form} onSubmit={handleSubmit}>
        <label style={styles.label}>
          Device ID:
          <input
            type="text"
            name="device_id"
            value={deviceData.device_id}
            onChange={handleChange}
            required
            style={styles.input}
            placeholder="Enter Device ID"
          />
        </label>

        <label style={styles.label}>
          Location:
          <input
            type="text"
            name="location"
            value={deviceData.location}
            onChange={handleChange}
            required
            style={styles.input}
            placeholder="Enter Location"
          />
        </label>

        <label style={styles.label}>
          Latitude:
          <input
            type="number"
            name="lat"
            value={deviceData.lat}
            onChange={handleChange}
            required
            step="any"
            style={styles.input}
            placeholder="Enter Latitude"
          />
        </label>

        <label style={styles.label}>
          Longitude:
          <input
            type="number"
            name="lng"
            value={deviceData.lng}
            onChange={handleChange}
            required
            step="any"
            style={styles.input}
            placeholder="Enter Longitude"
          />
        </label>

        <label style={styles.label}>
          Status:
          <input
            type="text"
            name="status"
            value={deviceData.status}
            onChange={handleChange}
            required
            style={styles.input}
            placeholder="e.g., active, inactive"
          />
        </label>

        <label style={styles.label}>
          Charger Type:
          <input
            type="text"
            name="charger_type"
            value={deviceData.charger_type}
            onChange={handleChange}
            required
            style={styles.input}
            placeholder="Enter Charger Type"
          />
        </label>

        <label style={styles.label}>
          Rate (per kWh):
          <input
            type="number"
            name="rate"
            value={deviceData.rate}
            onChange={handleChange}
            required
            step="any"
            style={styles.input}
            placeholder="e.g., 20"
          />
        </label>

        <div style={styles.buttonContainer}>
          <button type="submit" style={{ ...styles.button, ...styles.submit }}>
            Add Device
          </button>
          <button
            type="button"
            onClick={() => navigate(-1)}
            style={{ ...styles.button, ...styles.back }}
          >
            Back
          </button>
        </div>
      </form>
    </div>
  );
};

const styles = {
  container: {
    maxWidth: 480,
    margin: "40px auto",
    padding: 24,
    backgroundColor: "#fff",
    borderRadius: 8,
    boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  },
  header: {
    textAlign: "center",
    marginBottom: 24,
    color: "#1976d2",
  },
  form: {
    display: "flex",
    flexDirection: "column",
  },
  label: {
    marginBottom: 14,
    fontSize: 14,
    fontWeight: 600,
    color: "#333",
    display: "flex",
    flexDirection: "column",
  },
  input: {
    padding: "8px 10px",
    fontSize: 14,
    borderRadius: 4,
    border: "1px solid #ccc",
    marginTop: 6,
    outline: "none",
    transition: "border-color 0.3s",
  },
  buttonContainer: {
    display: "flex",
    gap: 12,
    marginTop: 24,
    justifyContent: "center",
  },
  button: {
    padding: "10px 28px",
    fontSize: 16,
    fontWeight: 600,
    borderRadius: 6,
    cursor: "pointer",
    border: "none",
    transition: "background-color 0.3s",
  },
  submit: {
    backgroundColor: "#1976d2",
    color: "#fff",
  },
  back: {
    backgroundColor: "#777",
    color: "#fff",
  },
  error: {
    color: "#d32f2f",
    marginBottom: 16,
    fontWeight: 600,
    textAlign: "center",
  },
  success: {
    color: "#388e3c",
    marginBottom: 16,
    fontWeight: 600,
    textAlign: "center",
  },
};

export default DeviceCreate;
