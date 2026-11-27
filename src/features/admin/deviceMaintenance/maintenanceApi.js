
import { api } from "../../../api";

const BASE = "/device-maintenance";

export const maintenanceApi = {
  listDevices: (params = {}) =>
    api.get(`${BASE}/devices`, { params }),

  getDevice: (id) =>
    api.get(`${BASE}/devices/${encodeURIComponent(id)}`),

  updateDatabase: (id, changes) =>
    api.patch(
      `${BASE}/devices/${encodeURIComponent(id)}/database`,
      { changes }
    ),

  updateFirmwareConfig: (id, changes) =>
    api.post(
      `${BASE}/devices/${encodeURIComponent(id)}/firmware/config`,
      { changes }
    ),

  updateCalibration: (id, coefficients) =>
    api.post(
      `${BASE}/devices/${encodeURIComponent(id)}/firmware/calibration`,
      { coefficients }
    ),

  sendCommand: (id, command) =>
    api.post(
      `${BASE}/devices/${encodeURIComponent(id)}/commands`,
      command
    ),

  getHistory: (id, params = {}) =>
    api.get(
      `${BASE}/devices/${encodeURIComponent(id)}/history`,
      { params }
    ),
};
