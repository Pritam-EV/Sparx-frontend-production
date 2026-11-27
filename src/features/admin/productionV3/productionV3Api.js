
import { api } from "../../../api";

const ROOT = "/api/production/v3";

const devicePath = (id) =>
  `${ROOT}/devices/${encodeURIComponent(id)}`;

export const productionV3Api = {
  list(params = {}) {
    return api.get(`${ROOT}/devices`, { params });
  },

  get(id) {
    return api.get(devicePath(id));
  },

  createGroupA(payload) {
    return api.post(`${ROOT}/group-a`, payload);
  },

  provisionGroupB(id, payload) {
    return api.post(`${devicePath(id)}/group-b`, payload);
  },

  live(id) {
    return api.get(`${devicePath(id)}/live`);
  },

  command(id, payload) {
    return api.post(`${devicePath(id)}/commands`, payload);
  },

  captureCalibration(id, point, payload) {
    return api.post(
      `${devicePath(id)}/calibration/captures/${point}`,
      payload
    );
  },
dispatchDetails(id) {
  return api.get(
    `${devicePath(id)}/dispatch`
  );
},

completeDispatch(id, payload) {
  return api.post(
    `${devicePath(id)}/dispatch`,
    payload
  );
},
  calculateCalibration(id) {
    return api.post(`${devicePath(id)}/calibration/calculate`);
  },

  submitCalibration(id) {
    return api.post(`${devicePath(id)}/calibration/submit`);
  },
  manualCompleteCalibration(id, payload) {
    return api.post(
      `${devicePath(id)}/calibration/manual-complete`,
      payload
    );
  },
  calibrationTest(id, payload) {
    return api.post(`${devicePath(id)}/calibration/test`, payload);
  },
};
