import { api } from "../../../api";

const ROOT = "/api/device-maintenance";

const devicePath = (id) =>
  `${ROOT}/devices/${encodeURIComponent(id)}`;

export const maintenanceApi = {
  listDevices: (params = {}) =>
    api.get(`${ROOT}/devices`, { params }),

  getDevice: (id) =>
    api.get(devicePath(id)),

  updateDatabase: (id, changes) =>
    api.patch(`${devicePath(id)}/database`, { changes }),

  updateFirmwareConfig: (id, changes) =>
    api.post(`${devicePath(id)}/firmware/config`, { changes }),

  updateCalibration: (id, coefficients) =>
    api.post(`${devicePath(id)}/firmware/calibration`, {
      coefficients,
    }),

  updateDeviceId: (id, newDeviceId) =>
    api.post(`${devicePath(id)}/firmware/device-id`, {
      newDeviceId,
    }),

  sendCommand: (id, command) =>
    api.post(`${devicePath(id)}/commands`, command),

  getHistory: (id, params = {}) =>
    api.get(`${devicePath(id)}/history`, { params }),
};