import { api } from "../../../api";

const BASE = "/api/production/v3";

const encode = (value) => encodeURIComponent(String(value ?? "").trim());

const path = {
  batches: `${BASE}/batches`,
  batch: (batchId) => `${BASE}/batches/${encode(batchId)}`,

  profiles: (type) => `${BASE}/profiles/${encode(type)}`,
  profile: (type, profileId) =>
    `${BASE}/profiles/${encode(type)}/${encode(profileId)}`,

  devices: `${BASE}/devices`,
  device: (serialNumber) =>
    `${BASE}/devices/${encode(serialNumber)}`,

  telemetry: (serialNumber) =>
    `${BASE}/devices/${encode(serialNumber)}/telemetry`,

  commands: (serialNumber) =>
    `${BASE}/devices/${encode(serialNumber)}/commands`,

  promote: (serialNumber) =>
    `${BASE}/devices/${encode(serialNumber)}/promote`,

  retryProvisioning: (serialNumber) =>
    `${BASE}/devices/${encode(serialNumber)}/provision/retry`,

  identityChange: (serialNumber) =>
    `${BASE}/devices/${encode(serialNumber)}/identity-change`,

  adminCommand: (serialNumber) =>
    `${BASE}/devices/${encode(serialNumber)}/admin-command`,

  dispatch: (serialNumber) =>
    `${BASE}/devices/${encode(serialNumber)}/dispatch`,

  calibrationSessions: `${BASE}/calibration/sessions`,

  calibrationSession: (sessionId) =>
    `${BASE}/calibration/sessions/${encode(sessionId)}`,

  createCalibrationSession: (serialNumber) =>
    `${BASE}/devices/${encode(serialNumber)}/calibration/sessions`,

  calibrationCaptures: (sessionId) =>
    `${BASE}/calibration/sessions/${encode(sessionId)}/captures`,

  applyCalibration: (sessionId) =>
    `${BASE}/calibration/sessions/${encode(sessionId)}/apply`,

  verifyCalibration: (sessionId) =>
    `${BASE}/calibration/sessions/${encode(sessionId)}/verify`,

  cancelCalibration: (sessionId) =>
    `${BASE}/calibration/sessions/${encode(sessionId)}/cancel`,

  verificationCaptures: (sessionId) =>
  `${BASE}/calibration/sessions/${encode(sessionId)}/verification-captures`,
};

/**
 * BATCH MANAGEMENT
 */

export const listBatches = (params = {}) =>
  api.get(path.batches, { params });

export const getBatch = (batchId) =>
  api.get(path.batch(batchId));

export const createBatch = (payload) =>
  api.post(path.batches, payload);

export const updateBatch = (batchId, payload) =>
  api.patch(path.batch(batchId), payload);

export const completeBatch = (batchId) =>
  api.post(`${path.batch(batchId)}/complete`);

export const closeBatch = (batchId) =>
  api.post(`${path.batch(batchId)}/close`);

/**
 * PROFILE MANAGEMENT
 *
 * Supported profile types:
 * production
 * firmware
 * calibration
 */

export const listProfiles = (profileType, params = {}) =>
  api.get(path.profiles(profileType), { params });

export const getProfile = (profileType, profileId) =>
  api.get(path.profile(profileType, profileId));

export const createProfile = (profileType, payload) =>
  api.post(path.profiles(profileType), payload);

export const updateProfile = (profileType, profileId, payload) =>
  api.patch(path.profile(profileType, profileId), payload);

/**
 * DEVICE INVENTORY
 */

export const listDevices = (params = {}) =>
  api.get(path.devices, { params });

export const getDevice = (serialNumber) =>
  api.get(path.device(serialNumber));

export const updateDevice = (serialNumber, payload) =>
  api.patch(path.device(serialNumber), payload);

/**
 * GROUP B PROVISIONING
 */

export const promoteDevice = (serialNumber, payload) =>
  api.post(path.promote(serialNumber), payload);

export const retryProvisioning = (serialNumber) =>
  api.post(path.retryProvisioning(serialNumber));

export const changeDeviceIdentity = (serialNumber, newDeviceId) =>
  api.post(path.identityChange(serialNumber), {
    newDeviceId,
  });

/**
 * DEVICE COMMANDS AND TELEMETRY
 */

export const sendAdminCommand = (serialNumber, payload) =>
  api.post(path.adminCommand(serialNumber), payload);

export const getDeviceTelemetry = (serialNumber, params = {}) =>
  api.get(path.telemetry(serialNumber), { params });

export const getDeviceCommands = (serialNumber, params = {}) =>
  api.get(path.commands(serialNumber), { params });

/**
 * CALIBRATION SESSIONS
 */

export const listCalibrationSessions = (params = {}) =>
  api.get(path.calibrationSessions, { params });

export const getCalibrationSession = (sessionId) =>
  api.get(path.calibrationSession(sessionId));

export const createCalibrationSession = (serialNumber, payload) =>
  api.post(path.createCalibrationSession(serialNumber), payload);

export const captureCalibrationPoint = (sessionId, payload) =>
  api.post(path.calibrationCaptures(sessionId), payload);

export const applyCalibration = (sessionId, constants) =>
  api.post(path.applyCalibration(sessionId), constants);

export const verifyCalibration = (sessionId) =>
  api.post(path.verifyCalibration(sessionId));

export const cancelCalibration = (sessionId, reason = "") =>
  api.post(path.cancelCalibration(sessionId), {
    reason,
  });
export const captureVerificationPoint = (
  sessionId,
  payload
) =>
  api.post(
    path.verificationCaptures(sessionId),
    payload
  );
/**
 * DEVICE DISPATCH
 */

export const dispatchDevice = (serialNumber, payload) =>
  api.post(path.dispatch(serialNumber), payload);

/**
 * ADMIN COMMAND PRESETS
 *
 * Keep the command payload construction in one place so pages
 * cannot accidentally send inconsistent parameter names.
 */

export const startFastTelemetry = (
  serialNumber,
  {
    intervalMs = 500,
    durationSeconds = 120,
  } = {}
) =>
  sendAdminCommand(serialNumber, {
    action: "startFastTelemetry",
    intervalMs,
    durationSeconds,
  });

export const stopFastTelemetry = (serialNumber) =>
  sendAdminCommand(serialNumber, {
    action: "stopFastTelemetry",
  });

export const startRelayTest = (
  serialNumber,
  {
    durationSeconds = 10,
  } = {}
) =>
  sendAdminCommand(serialNumber, {
    action: "relayStart",
    testMode: true,
    durationSeconds,
  });

export const stopRelayTest = (serialNumber) =>
  sendAdminCommand(serialNumber, {
    action: "relayStop",
  });

/**
 * RESPONSE HELPERS
 */

export const getApiData = (response) =>
  response?.data?.data ?? null;

export const getApiMessage = (
  error,
  fallback = "Something went wrong. Please try again."
) =>
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  error?.message ||
  fallback;

export const getApiValidationErrors = (error) => {
  const data = error?.response?.data;

  if (Array.isArray(data?.errors)) {
    return data.errors;
  }

  if (Array.isArray(data?.unsupportedFields)) {
    return data.unsupportedFields.map(
      (field) => `Unsupported field: ${field}`
    );
  }

  if (Array.isArray(data?.missingPoints)) {
    return data.missingPoints.map(
      (point) => `Missing calibration point: ${point}`
    );
  }

  return [];
};

export default {
  listBatches,
  getBatch,
  createBatch,
  updateBatch,
  completeBatch,
  closeBatch,

  listProfiles,
  getProfile,
  createProfile,
  updateProfile,

  listDevices,
  getDevice,
  updateDevice,

  promoteDevice,
  retryProvisioning,
  changeDeviceIdentity,

  sendAdminCommand,
  getDeviceTelemetry,
  getDeviceCommands,

  listCalibrationSessions,
  getCalibrationSession,
  createCalibrationSession,
  captureCalibrationPoint,
  applyCalibration,
  verifyCalibration,
  cancelCalibration,

  dispatchDevice,

  startFastTelemetry,
  stopFastTelemetry,
  startRelayTest,
  stopRelayTest,

  getApiData,
  getApiMessage,
  getApiValidationErrors,
};