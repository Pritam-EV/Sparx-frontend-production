
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import axios from "axios";

import { auth } from "../../firebase";
import { API_BASE } from "../../api";

/*
|--------------------------------------------------------------------------
| ADMIN API
|--------------------------------------------------------------------------
|
| IMPORTANT:
|
| The normal `api` instance uses localStorage.token.
|
| localStorage.token contains the backend JWT returned by /auth/me.
|
| BUT /api/admin/provision/* uses adminAuth middleware, which expects
| a Firebase ID token.
|
| Therefore Production.js MUST use this separate Axios instance.
|
*/

const adminApi = axios.create({
  baseURL: API_BASE,
});

/*
|--------------------------------------------------------------------------
| Attach Firebase ID token to every admin request
|--------------------------------------------------------------------------
*/

adminApi.interceptors.request.use(
  async (config) => {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      return config;
    }

    try {
      const firebaseToken =
        await currentUser.getIdToken();

      config.headers = config.headers || {};

      config.headers.Authorization =
        `Bearer ${firebaseToken}`;

      return config;
    } catch (error) {
      console.error(
        "[PRODUCTION] Failed to obtain Firebase token:",
        error
      );

      return Promise.reject(error);
    }
  },
  (error) =>
    Promise.reject(error)
);

/*
|--------------------------------------------------------------------------
| IMPORTANT:
|
| DO NOT redirect to /login automatically here.
|
| A 403 means the Firebase user exists but does not have the admin claim.
| A 401 means the Firebase token is invalid/expired.
|
| We display the actual error inside Production instead of destroying
| the user's normal backend session.
|--------------------------------------------------------------------------
*/

adminApi.interceptors.response.use(
  (response) => response,
  (error) => {
    return Promise.reject(error);
  }
);


/* ==========================================================================
   CONSTANTS
   ========================================================================== */

const PAGE_SIZE = 20;
const ACK_POLL_INTERVAL = 3000;


/* ==========================================================================
   HELPERS
   ========================================================================== */

function getErrorMessage(error) {
  return (
    error?.response?.data?.error ||
    error?.response?.data?.message ||
    error?.response?.data?.details ||
    error?.message ||
    "Something went wrong."
  );
}

function normalize(value) {
  return String(value ?? "").trim();
}

function getAckStatus(device) {
  return normalize(
    device?.configAck?.status
  ).toLowerCase();
}

function getProvisionStatus(device) {
  return normalize(
    device?.provisionStatus
  ).toLowerCase();
}

function getDeviceId(device) {
  return (
    device?.deviceId ||
    device?.device_id ||
    ""
  );
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString();
}

function badgeClass(status) {
  const value =
    normalize(status).toLowerCase();

  if (
    value === "ok" ||
    value === "acknowledged" ||
    value === "online"
  ) {
    return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
  }

  if (
    value === "sent" ||
    value === "publishing" ||
    value === "published"
  ) {
    return "bg-blue-500/10 text-blue-400 border-blue-500/30";
  }

  if (
    value === "pending" ||
    value === "queued"
  ) {
    return "bg-amber-500/10 text-amber-400 border-amber-500/30";
  }

  if (
    value === "error" ||
    value === "failed"
  ) {
    return "bg-rose-500/10 text-rose-400 border-rose-500/30";
  }

  return "bg-slate-800 text-slate-400 border-slate-700";
}

function Badge({ status }) {
  return (
    <span
      className={`
        inline-flex
        items-center
        gap-1.5
        px-2.5
        py-1
        rounded-full
        border
        text-[10px]
        font-bold
        uppercase
        tracking-wider
        ${badgeClass(status)}
      `}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {status || "unknown"}
    </span>
  );
}


/* ==========================================================================
   CONFIGURATION FIELDS
   ========================================================================== */

const CONFIG_FIELDS = [
  {
    key: "cf",
    label: "Current Factor",
    type: "number",
    step: "any",
    category: "Metering",
    description:
      "Current sensor calibration factor.",
  },

  {
    key: "vf",
    label: "Voltage Factor",
    type: "number",
    step: "any",
    category: "Metering",
    description:
      "Voltage measurement calibration factor.",
  },

  {
    key: "currentRF",
    label: "Current RF",
    type: "number",
    step: "any",
    category: "Metering",
    description:
      "Current/shunt scaling factor.",
  },

  {
    key: "wifiSSID",
    label: "Wi-Fi SSID",
    type: "text",
    category: "Network",
    description:
      "Wi-Fi network name.",
  },

  {
    key: "wifiPassword",
    label: "Wi-Fi Password",
    type: "password",
    category: "Network",
    description:
      "Enter only when changing the password. Existing password is never returned.",
  },

  {
    key: "targetFirmwareVersion",
    label: "Target Firmware Version",
    type: "text",
    category: "Firmware",
    description:
      "Target firmware version.",
  },

  {
    key: "notes",
    label: "Notes",
    type: "text",
    category: "General",
    description:
      "Production notes.",
  },

  {
    key: "hardwareRevision",
    label: "Hardware Revision",
    type: "text",
    category: "General",
    description:
      "PCB / hardware revision.",
  },
];


/* ==========================================================================
   MAIN COMPONENT
   ========================================================================== */

export default function Production() {

  const [activeTab, setActiveTab] =
    useState("all");

  const [devices, setDevices] =
    useState([]);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("");

  const [ackFilter, setAckFilter] =
    useState("");

  const [page, setPage] =
    useState(1);

  const [total, setTotal] =
    useState(0);

  /*
  |--------------------------------------------------------------------------
  | Group A
  |--------------------------------------------------------------------------
  */

  const [showGroupAModal, setShowGroupAModal] =
    useState(false);

  const [groupAForm, setGroupAForm] =
    useState({
      serialNumber: "",
      deviceId: "",
      cf: 0.231,
      vf: 1.88,
      currentRF: 0.001,
      wifiSSID: "",
      wifiPassword: "",
      hardwareRevision: "PCB_V1.2",
      notes: "",
    });

  /*
  |--------------------------------------------------------------------------
  | Configuration drawer
  |--------------------------------------------------------------------------
  */

  const [selectedDevice, setSelectedDevice] =
    useState(null);

  const [showDrawer, setShowDrawer] =
    useState(false);

  const [config, setConfig] =
    useState({});

  const [configStatus, setConfigStatus] =
    useState("draft");

  const [savingConfig, setSavingConfig] =
    useState(false);

  const pollTimerRef =
    useRef(null);

  const selectedSerialRef =
    useRef("");


  /* ==========================================================================
     AUTH CHECK
     ========================================================================== */

  const checkAdminAuth =
    useCallback(async () => {

      const currentUser =
        auth.currentUser;

      if (!currentUser) {
        setError(
          "Firebase authentication is not available. Please log in again."
        );

        return false;
      }

      try {
        await currentUser.getIdToken();

        return true;
      } catch (error) {
        setError(
          `Unable to obtain admin authentication token: ${getErrorMessage(
            error
          )}`
        );

        return false;
      }

    }, []);


  /* ==========================================================================
     FETCH PROVISION DEVICES
     ========================================================================== */

  const fetchDevices =
    useCallback(async () => {

      setLoading(true);
      setError("");

      try {

        const authenticated =
          await checkAdminAuth();

        if (!authenticated) {
          return;
        }

        const response =
          await adminApi.get(
            "/api/admin/provision",
            {
              params: {
                page,
                limit: PAGE_SIZE,
                search:
                  search.trim() ||
                  undefined,
                status:
                  statusFilter ||
                  undefined,
              },
            }
          );

        const data =
          response?.data || {};

        const list =
          Array.isArray(data?.docs)
            ? data.docs
            : Array.isArray(data?.data)
            ? data.data
            : Array.isArray(data)
            ? data
            : [];

        setDevices(list);

        setTotal(
          Number(data?.total) ||
          list.length
        );

      } catch (requestError) {

        const status =
          requestError?.response?.status;

        if (status === 401) {
          setError(
            "Production authentication failed. Your Firebase session is invalid or expired. Please log out and log in again."
          );
        } else if (status === 403) {
          setError(
            "You are authenticated, but your Firebase account does not have the admin permission required for Production."
          );
        } else {
          setError(
            `Failed to load production devices: ${getErrorMessage(
              requestError
            )}`
          );
        }

        setDevices([]);
        setTotal(0);

      } finally {

        setLoading(false);

      }

    }, [
      checkAdminAuth,
      page,
      search,
      statusFilter,
    ]);


  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);


  /* ==========================================================================
     FILTER
     ========================================================================== */

  const filteredDevices =
    useMemo(() => {

      return devices.filter(
        (device) => {

          const query =
            search
              .trim()
              .toLowerCase();

          const serial =
            normalize(
              device?.serialNumber
            ).toLowerCase();

          const deviceId =
            normalize(
              getDeviceId(device)
            ).toLowerCase();

          const matchesSearch =
            !query ||
            serial.includes(query) ||
            deviceId.includes(query);

          const matchesAck =
            !ackFilter ||
            getAckStatus(device) ===
              ackFilter;

          return (
            matchesSearch &&
            matchesAck
          );
        }
      );

    }, [
      devices,
      search,
      ackFilter,
    ]);


  /* ==========================================================================
     GROUP A
     ========================================================================== */

  const createGroupA =
    async (event) => {

      event.preventDefault();

      setLoading(true);
      setError("");

      try {

        const authenticated =
          await checkAdminAuth();

        if (!authenticated) {
          return;
        }

        const payload = {
          serialNumber:
            normalize(
              groupAForm.serialNumber
            ),

          deviceId:
            normalize(
              groupAForm.deviceId
            ),

          cf:
            Number(groupAForm.cf),

          vf:
            Number(groupAForm.vf),

          currentRF:
            Number(
              groupAForm.currentRF
            ),

          wifiSSID:
            normalize(
              groupAForm.wifiSSID
            ),

          wifiPassword:
            groupAForm.wifiPassword,

          hardwareRevision:
            normalize(
              groupAForm.hardwareRevision
            ),

          notes:
            normalize(
              groupAForm.notes
            ),
        };

        if (
          !payload.serialNumber ||
          !payload.deviceId ||
          !payload.wifiSSID ||
          !payload.wifiPassword
        ) {
          setError(
            "Serial number, Device ID, Wi-Fi SSID and Wi-Fi password are required."
          );

          return;
        }

        await adminApi.post(
          "/api/admin/provision",
          payload
        );

        setSuccess(
          `Device ${payload.serialNumber} registered successfully.`
        );

        setShowGroupAModal(false);

        setGroupAForm({
          serialNumber: "",
          deviceId: "",
          cf: 0.231,
          vf: 1.88,
          currentRF: 0.001,
          wifiSSID: "",
          wifiPassword: "",
          hardwareRevision: "PCB_V1.2",
          notes: "",
        });

        await fetchDevices();

      } catch (requestError) {

        setError(
          `Unable to create production record: ${getErrorMessage(
            requestError
          )}`
        );

      } finally {

        setLoading(false);

      }
    };


  /* ==========================================================================
     OPEN CONFIGURATION
     ========================================================================== */

  const openConfiguration =
    (device) => {

      setSelectedDevice(device);

      selectedSerialRef.current =
        normalize(
          device?.serialNumber
        );

      setConfig({
        cf:
          device?.cf ?? "",

        vf:
          device?.vf ?? "",

        currentRF:
          device?.currentRF ?? "",

        wifiSSID:
          device?.wifiSSID ?? "",

        /*
         * IMPORTANT:
         *
         * Backend deliberately does NOT return password.
         *
         * Leave this empty.
         */
        wifiPassword: "",

        targetFirmwareVersion:
          device?.targetFirmwareVersion ??
          "",

        notes:
          device?.notes ?? "",

        hardwareRevision:
          device?.hardwareRevision ??
          "",
      });

      setConfigStatus(
        getProvisionStatus(
          device
        ) || "draft"
      );

      setShowDrawer(true);

    };


  /* ==========================================================================
     CLOSE DRAWER
     ========================================================================== */

  const closeConfiguration =
    () => {

      setShowDrawer(false);

      setSelectedDevice(null);

      selectedSerialRef.current =
        "";

      if (
        pollTimerRef.current
      ) {
        clearTimeout(
          pollTimerRef.current
        );

        pollTimerRef.current =
          null;
      }
    };


  /* ==========================================================================
     UPDATE CONFIG FIELD
     ========================================================================== */

  const updateConfig =
    (key, value) => {

      setConfig(
        (previous) => ({
          ...previous,
          [key]: value,
        })
      );

    };


  /* ==========================================================================
     SAVE CONFIGURATION
     ========================================================================== */

  const saveConfiguration =
    async () => {

      if (!selectedDevice) {
        return;
      }

      const serial =
        normalize(
          selectedDevice.serialNumber
        );

      if (!serial) {
        setError(
          "Serial number is missing."
        );

        return;
      }

      setSavingConfig(true);
      setConfigStatus(
        "publishing"
      );
      setError("");

      try {

        const authenticated =
          await checkAdminAuth();

        if (!authenticated) {
          return;
        }

        /*
         * The backend's admin provisioning controller accepts:
         *
         * cf
         * vf
         * currentRF
         * wifiSSID
         * wifiPassword
         * targetFirmwareVersion
         * notes
         * hardwareRevision
         */

        const payload = {};

        Object.entries(
          config
        ).forEach(
          ([key, value]) => {

            /*
             * Never send an empty Wi-Fi password.
             *
             * Empty password would be ambiguous and could accidentally
             * overwrite the stored credential.
             */
            if (
              key ===
                "wifiPassword" &&
              !normalize(value)
            ) {
              return;
            }

            if (
              value === "" ||
              value === undefined ||
              value === null
            ) {
              return;
            }

            if (
              [
                "cf",
                "vf",
                "currentRF",
              ].includes(key)
            ) {
              const number =
                Number(value);

              if (
                !Number.isFinite(
                  number
                )
              ) {
                throw new Error(
                  `${key} must be a valid number.`
                );
              }

              payload[key] =
                number;

              return;
            }

            payload[key] =
              value;
          }
        );

        /*
         * Step 1:
         * Save configuration to DeviceProvision.
         *
         * Backend marks provisionStatus = pending.
         */

        await adminApi.patch(
          `/api/admin/provision/${encodeURIComponent(
            serial
          )}`,
          payload
        );

        /*
         * Step 2:
         * Explicitly publish configuration through MQTT.
         */

        const sendResponse =
          await adminApi.post(
            `/api/admin/provision/${encodeURIComponent(
              serial
            )}/send`
          );

        setConfigStatus(
          "published"
        );

        setSuccess(
          `Configuration published to ${sendResponse?.data?.topic || `viz/${serial}/config`}. Waiting for device ACK.`
        );

        /*
         * Refresh immediately.
         */

        await fetchDevices();

        /*
         * Poll ACK.
         */

        startAckPolling(serial);

      } catch (requestError) {

        setConfigStatus(
          "failed"
        );

        setError(
          `Configuration update failed: ${getErrorMessage(
            requestError
          )}`
        );

      } finally {

        setSavingConfig(false);

      }
    };


  /* ==========================================================================
     ACK POLLING
     ========================================================================== */

  const startAckPolling =
    useCallback(
      (serial) => {

        if (
          pollTimerRef.current
        ) {
          clearTimeout(
            pollTimerRef.current
          );
        }

        let attempts = 0;

        const poll = async () => {

          attempts += 1;

          try {

            const response =
              await adminApi.get(
                `/api/admin/provision/${encodeURIComponent(
                  serial
                )}`
              );

            const device =
              response?.data?.device;

            if (device) {

              setSelectedDevice(
                device
              );

              const ack =
                getAckStatus(
                  device
                );

              const provision =
                getProvisionStatus(
                  device
                );

              if (
                ack === "ok" ||
                provision ===
                  "acknowledged"
              ) {

                setConfigStatus(
                  "acknowledged"
                );

                await fetchDevices();

                return;
              }

              if (
                ack === "error"
              ) {

                setConfigStatus(
                  "failed"
                );

                setError(
                  device?.configAck
                    ?.message ||
                    "Device rejected the configuration."
                );

                return;
              }
            }

          } catch (error) {

            /*
             * Do not destroy the auth session because a polling request
             * failed.
             */

            console.warn(
              "[PRODUCTION] ACK polling failed:",
              error
            );
          }

          /*
           * Stop after roughly 2 minutes.
           */

          if (
            attempts >= 40
          ) {

            setConfigStatus(
              "timeout"
            );

            return;
          }

          pollTimerRef.current =
            setTimeout(
              poll,
              ACK_POLL_INTERVAL
            );
        };

        poll();

      },
      [fetchDevices]
    );


  /* ==========================================================================
     ADMIN COMMAND
     ========================================================================== */

  const sendAdminCommand =
    async (action) => {

      if (!selectedDevice) {
        return;
      }

      const deviceId =
        normalize(
          getDeviceId(
            selectedDevice
          )
        );

      if (!deviceId) {
        setError(
          "Device ID is missing."
        );

        return;
      }

      const confirmed =
        window.confirm(
          `Send "${action}" command to ${deviceId}?`
        );

      if (!confirmed) {
        return;
      }

      setLoading(true);
      setError("");

      try {

        const authenticated =
          await checkAdminAuth();

        if (!authenticated) {
          return;
        }

        const response =
          await adminApi.post(
            `/api/admin/provision/cmd/${encodeURIComponent(
              deviceId
            )}/admin`,
            {
              action,
            }
          );

        setSuccess(
          `Command "${action}" published to ${response?.data?.topic || "device"}.`
        );

      } catch (requestError) {

        setError(
          `Admin command failed: ${getErrorMessage(
            requestError
          )}`
        );

      } finally {

        setLoading(false);

      }
    };


  /* ==========================================================================
     CLEANUP
     ========================================================================== */

  useEffect(() => {

    return () => {

      if (
        pollTimerRef.current
      ) {
        clearTimeout(
          pollTimerRef.current
        );
      }

    };

  }, []);


  /* ==========================================================================
     PAGINATION
     ========================================================================== */

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        total / PAGE_SIZE
      )
    );


  /* ==========================================================================
     RENDER
     ========================================================================== */

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 md:p-6">

      <div className="max-w-[1800px] mx-auto">

        {/* HEADER */}

        <div className="
          flex
          flex-col
          md:flex-row
          md:items-center
          md:justify-between
          gap-4
          pb-6
          border-b
          border-slate-800
        ">

          <div>

            <div className="flex items-center gap-3">

              <div className="
                w-11
                h-11
                rounded-xl
                bg-emerald-500/10
                border
                border-emerald-500/20
                flex
                items-center
                justify-center
                text-xl
              ">
                ⚡
              </div>

              <div>

                <h1 className="text-2xl font-bold">
                  Production
                </h1>

                <p className="text-sm text-slate-500 mt-1">
                  Device provisioning and production configuration
                </p>

              </div>

            </div>

          </div>


          <div className="flex gap-2">

            <button
              onClick={() =>
                setShowGroupAModal(
                  true
                )
              }
              className="
                px-4
                py-2.5
                rounded-lg
                bg-slate-800
                hover:bg-slate-700
                border
                border-slate-700
                text-sm
                font-semibold
              "
            >
              + Register Device
            </button>

            <button
              onClick={
                fetchDevices
              }
              disabled={loading}
              className="
                px-4
                py-2.5
                rounded-lg
                bg-emerald-600
                hover:bg-emerald-500
                disabled:opacity-50
                text-sm
                font-semibold
              "
            >
              Refresh
            </button>

          </div>

        </div>


        {/* ALERTS */}

        {error && (
          <div className="
            mt-4
            p-4
            rounded-lg
            bg-rose-500/10
            border
            border-rose-500/30
            text-rose-300
            text-sm
          ">
            {error}
          </div>
        )}

        {success && (
          <div className="
            mt-4
            p-4
            rounded-lg
            bg-emerald-500/10
            border
            border-emerald-500/30
            text-emerald-300
            text-sm
          ">
            {success}
          </div>
        )}


        {/* FILTERS */}

        <div className="
          mt-6
          grid
          grid-cols-1
          md:grid-cols-3
          gap-3
        ">

          <input
            value={search}
            onChange={(event) => {
              setSearch(
                event.target.value
              );
              setPage(1);
            }}
            placeholder="Search serial / device ID..."
            className="
              px-4
              py-2.5
              rounded-lg
              bg-slate-900
              border
              border-slate-800
              text-sm
              outline-none
              focus:border-emerald-500
            "
          />

          <select
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(
                event.target.value
              );
              setPage(1);
            }}
            className="
              px-4
              py-2.5
              rounded-lg
              bg-slate-900
              border
              border-slate-800
              text-sm
              outline-none
            "
          >
            <option value="">
              All Provision Status
            </option>

            <option value="pending">
              Pending
            </option>

            <option value="sent">
              Sent
            </option>

            <option value="acknowledged">
              Acknowledged
            </option>
          </select>

          <select
            value={ackFilter}
            onChange={(event) => {
              setAckFilter(
                event.target.value
              );
              setPage(1);
            }}
            className="
              px-4
              py-2.5
              rounded-lg
              bg-slate-900
              border
              border-slate-800
              text-sm
              outline-none
            "
          >
            <option value="">
              All ACK Status
            </option>

            <option value="ok">
              ACK OK
            </option>

            <option value="error">
              ACK Error
            </option>
          </select>

        </div>


        {/* TABLE */}

        <div className="
          mt-5
          overflow-x-auto
          rounded-xl
          border
          border-slate-800
          bg-slate-900/40
        ">

          <table className="w-full min-w-[1000px]">

            <thead>

              <tr className="
                bg-slate-900
                border-b
                border-slate-800
                text-left
              ">

                <th className="px-4 py-3 text-[10px] uppercase tracking-wider text-slate-500">
                  Serial
                </th>

                <th className="px-4 py-3 text-[10px] uppercase tracking-wider text-slate-500">
                  Device ID
                </th>

                <th className="px-4 py-3 text-[10px] uppercase tracking-wider text-slate-500">
                  Calibration
                </th>

                <th className="px-4 py-3 text-[10px] uppercase tracking-wider text-slate-500">
                  Provision
                </th>

                <th className="px-4 py-3 text-[10px] uppercase tracking-wider text-slate-500">
                  ACK
                </th>

                <th className="px-4 py-3 text-[10px] uppercase tracking-wider text-slate-500">
                  Updated
                </th>

                <th className="px-4 py-3 text-[10px] uppercase tracking-wider text-slate-500 text-right">
                  Action
                </th>

              </tr>

            </thead>


            <tbody className="divide-y divide-slate-800">

              {loading ? (

                <tr>

                  <td
                    colSpan={7}
                    className="
                      px-6
                      py-16
                      text-center
                      text-slate-500
                    "
                  >
                    Loading production devices...
                  </td>

                </tr>

              ) : filteredDevices.length ===
                0 ? (

                <tr>

                  <td
                    colSpan={7}
                    className="
                      px-6
                      py-16
                      text-center
                      text-slate-500
                    "
                  >
                    No production devices found.
                  </td>

                </tr>

              ) : (

                filteredDevices.map(
                  (device) => {

                    const serial =
                      normalize(
                        device?.serialNumber
                      );

                    const deviceId =
                      getDeviceId(
                        device
                      );

                    return (
                      <tr
                        key={
                          device?._id ||
                          serial
                        }
                        className="
                          hover:bg-slate-800/30
                          transition
                        "
                      >

                        <td className="px-4 py-4">

                          <div className="font-mono text-sm font-semibold">
                            {serial ||
                              "—"}
                          </div>

                          <div className="text-[10px] text-slate-600 mt-1">
                            {formatDate(
                              device?.updatedAt
                            )}
                          </div>

                        </td>


                        <td className="px-4 py-4">

                          <span className="font-mono text-sm text-emerald-400">
                            {deviceId ||
                              "—"}
                          </span>

                        </td>


                        <td className="px-4 py-4">

                          <div className="font-mono text-xs text-slate-300">
                            CF:{" "}
                            {device?.cf ??
                              "—"}
                          </div>

                          <div className="font-mono text-xs text-slate-400 mt-1">
                            VF:{" "}
                            {device?.vf ??
                              "—"}
                          </div>

                          <div className="font-mono text-xs text-slate-500 mt-1">
                            RF:{" "}
                            {device?.currentRF ??
                              "—"}
                          </div>

                        </td>


                        <td className="px-4 py-4">

                          <Badge
                            status={
                              getProvisionStatus(
                                device
                              ) ||
                              "unknown"
                            }
                          />

                        </td>


                        <td className="px-4 py-4">

                          {getAckStatus(
                            device
                          ) ? (

                            <Badge
                              status={
                                getAckStatus(
                                  device
                                )
                              }
                            />

                          ) : (

                            <span className="text-xs text-slate-600">
                              No ACK
                            </span>

                          )}

                        </td>


                        <td className="px-4 py-4">

                          <span className="text-xs text-slate-400">
                            {formatDate(
                              device?.updatedAt
                            )}
                          </span>

                        </td>


                        <td className="px-4 py-4 text-right">

                          <button
                            onClick={() =>
                              openConfiguration(
                                device
                              )
                            }
                            className="
                              px-3
                              py-2
                              rounded-lg
                              bg-slate-800
                              hover:bg-slate-700
                              border
                              border-slate-700
                              text-xs
                              font-semibold
                            "
                          >
                            Configure
                          </button>

                        </td>

                      </tr>
                    );
                  }
                )

              )}

            </tbody>

          </table>


          {/* PAGINATION */}

          <div className="
            px-4
            py-3
            border-t
            border-slate-800
            flex
            justify-between
            items-center
          ">

            <span className="text-xs text-slate-500">
              Page {page} of{" "}
              {totalPages}
            </span>

            <div className="flex gap-2">

              <button
                disabled={
                  page <= 1
                }
                onClick={() =>
                  setPage(
                    (p) =>
                      Math.max(
                        1,
                        p - 1
                      )
                  )
                }
                className="
                  px-3
                  py-1.5
                  rounded
                  bg-slate-800
                  border
                  border-slate-700
                  text-xs
                  disabled:opacity-30
                "
              >
                Previous
              </button>

              <button
                disabled={
                  page >=
                  totalPages
                }
                onClick={() =>
                  setPage(
                    (p) =>
                      Math.min(
                        totalPages,
                        p + 1
                      )
                  )
                }
                className="
                  px-3
                  py-1.5
                  rounded
                  bg-slate-800
                  border
                  border-slate-700
                  text-xs
                  disabled:opacity-30
                "
              >
                Next
              </button>

            </div>

          </div>

        </div>

      </div>


      {/* ========================================================================
         CREATE DEVICE MODAL
         ====================================================================== */}

      {showGroupAModal && (

        <div className="
          fixed
          inset-0
          z-50
          bg-black/70
          backdrop-blur-sm
          flex
          items-center
          justify-center
          p-4
        ">

          <div className="
            w-full
            max-w-xl
            bg-slate-900
            border
            border-slate-800
            rounded-2xl
            shadow-2xl
          ">

            <div className="
              p-5
              border-b
              border-slate-800
              flex
              justify-between
            ">

              <div>

                <h2 className="font-bold text-lg">
                  Register Production Device
                </h2>

                <p className="text-xs text-slate-500 mt-1">
                  Creates the backend DeviceProvision record.
                </p>

              </div>

              <button
                onClick={() =>
                  setShowGroupAModal(
                    false
                  )
                }
                className="text-slate-500 hover:text-white text-xl"
              >
                ×
              </button>

            </div>


            <form
              onSubmit={
                createGroupA
              }
              className="p-5 space-y-4"
            >

              {[
                [
                  "serialNumber",
                  "Serial Number",
                  "text",
                ],

                [
                  "deviceId",
                  "Device ID",
                  "text",
                ],

                [
                  "wifiSSID",
                  "Wi-Fi SSID",
                  "text",
                ],

                [
                  "wifiPassword",
                  "Wi-Fi Password",
                  "password",
                ],

                [
                  "hardwareRevision",
                  "Hardware Revision",
                  "text",
                ],

                [
                  "notes",
                  "Notes",
                  "text",
                ],
              ].map(
                ([key, label, type]) => (

                  <div key={key}>

                    <label className="block text-xs text-slate-400 mb-1.5">
                      {label}
                    </label>

                    <input
                      type={type}
                      value={
                        groupAForm[key]
                      }
                      onChange={(event) =>
                        setGroupAForm(
                          (previous) => ({
                            ...previous,
                            [key]:
                              event.target
                                .value,
                          })
                        )
                      }
                      className="
                        w-full
                        px-3
                        py-2.5
                        rounded-lg
                        bg-slate-950
                        border
                        border-slate-700
                        text-white
                        text-sm
                        outline-none
                        focus:border-emerald-500
                      "
                    />

                  </div>

                )
              )}


              <div className="
                grid
                grid-cols-3
                gap-3
              ">

                {[
                  ["cf", "CF"],
                  ["vf", "VF"],
                  [
                    "currentRF",
                    "Current RF",
                  ],
                ].map(
                  ([key, label]) => (

                    <div key={key}>

                      <label className="block text-xs text-slate-400 mb-1.5">
                        {label}
                      </label>

                      <input
                        type="number"
                        step="any"
                        value={
                          groupAForm[
                            key
                          ]
                        }
                        onChange={(event) =>
                          setGroupAForm(
                            (previous) => ({
                              ...previous,
                              [key]:
                                event.target
                                  .value,
                            })
                          )
                        }
                        className="
                          w-full
                          px-3
                          py-2.5
                          rounded-lg
                          bg-slate-950
                          border
                          border-slate-700
                          text-white
                          text-sm
                        "
                      />

                    </div>

                  )
                )}

              </div>


              <div className="
                flex
                justify-end
                gap-3
                pt-4
                border-t
                border-slate-800
              ">

                <button
                  type="button"
                  onClick={() =>
                    setShowGroupAModal(
                      false
                    )
                  }
                  className="
                    px-4
                    py-2.5
                    rounded-lg
                    bg-slate-800
                    border
                    border-slate-700
                    text-sm
                  "
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="
                    px-5
                    py-2.5
                    rounded-lg
                    bg-emerald-600
                    hover:bg-emerald-500
                    disabled:opacity-50
                    text-sm
                    font-semibold
                  "
                >
                  {loading
                    ? "Creating..."
                    : "Register Device"}
                </button>

              </div>

            </form>

          </div>

        </div>

      )}


      {/* ========================================================================
         CONFIGURATION DRAWER
         ====================================================================== */}

      {showDrawer &&
        selectedDevice && (

          <div className="
            fixed
            inset-0
            z-50
            bg-black/70
          ">

            <div className="
              absolute
              right-0
              top-0
              bottom-0
              w-full
              max-w-2xl
              bg-slate-950
              border-l
              border-slate-800
              overflow-y-auto
              shadow-2xl
            ">

              {/* HEADER */}

              <div className="
                sticky
                top-0
                z-20
                bg-slate-950/95
                backdrop-blur
                border-b
                border-slate-800
                p-5
              ">

                <div className="
                  flex
                  justify-between
                  items-start
                ">

                  <div>

                    <h2 className="text-lg font-bold">
                      Device Configuration
                    </h2>

                    <div className="font-mono text-xs text-slate-500 mt-2">
                      {selectedDevice.serialNumber}
                    </div>

                    <div className="font-mono text-xs text-emerald-400 mt-1">
                      {getDeviceId(
                        selectedDevice
                      )}
                    </div>

                  </div>

                  <button
                    onClick={
                      closeConfiguration
                    }
                    className="text-slate-500 hover:text-white text-xl"
                  >
                    ×
                  </button>

                </div>


                <div className="mt-4">

                  <Badge
                    status={
                      configStatus
                    }
                  />

                </div>

              </div>


              {/* BODY */}

              <div className="p-5 space-y-6">

                {[
                  "Metering",
                  "Network",
                  "Firmware",
                  "General",
                ].map(
                  (category) => {

                    const fields =
                      CONFIG_FIELDS.filter(
                        (field) =>
                          field.category ===
                          category
                      );

                    return (

                      <section
                        key={
                          category
                        }
                      >

                        <h3 className="text-sm font-bold mb-3">
                          {category}
                        </h3>

                        <div className="
                          grid
                          grid-cols-1
                          md:grid-cols-2
                          gap-4
                        ">

                          {fields.map(
                            (field) => (

                              <div
                                key={
                                  field.key
                                }
                                className="
                                  p-4
                                  rounded-xl
                                  bg-slate-900
                                  border
                                  border-slate-800
                                "
                              >

                                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                                  {
                                    field.label
                                  }
                                </label>

                                <input
                                  type={
                                    field.type ===
                                    "text"
                                      ? "text"
                                      : field.type
                                  }
                                  step={
                                    field.step
                                  }
                                  value={
                                    config[
                                      field.key
                                    ] ??
                                    ""
                                  }
                                  onChange={(event) =>
                                    updateConfig(
                                      field.key,
                                      event.target
                                        .value
                                    )
                                  }
                                  className="
                                    w-full
                                    px-3
                                    py-2.5
                                    rounded-lg
                                    bg-slate-950
                                    border
                                    border-slate-700
                                    text-white
                                    text-sm
                                    outline-none
                                    focus:border-emerald-500
                                  "
                                />

                                <p className="text-[10px] text-slate-600 mt-2">
                                  {
                                    field.description
                                  }
                                </p>

                              </div>

                            )
                          )}

                        </div>

                      </section>

                    );

                  }
                )}


                {/* ACK INFORMATION */}

                <div className="
                  p-4
                  rounded-xl
                  bg-slate-900
                  border
                  border-slate-800
                ">

                  <h3 className="text-sm font-bold mb-3">
                    Device ACK
                  </h3>

                  {getAckStatus(
                    selectedDevice
                  ) ? (

                    <Badge
                      status={
                        getAckStatus(
                          selectedDevice
                        )
                      }
                    />

                  ) : (

                    <span className="text-xs text-slate-500">
                      No configuration ACK received.
                    </span>

                  )}

                  {selectedDevice
                    ?.configAck
                    ?.message && (

                    <div className="mt-3 text-xs text-slate-400">
                      {
                        selectedDevice
                          .configAck
                          .message
                      }
                    </div>

                  )}

                  {selectedDevice
                    ?.configAck
                    ?.ackedAt && (

                    <div className="mt-2 text-[10px] text-slate-600">
                      ACK received:{" "}
                      {formatDate(
                        selectedDevice
                          .configAck
                          .ackedAt
                      )}
                    </div>

                  )}

                </div>

              </div>


              {/* FOOTER */}

              <div className="
                sticky
                bottom-0
                p-5
                bg-slate-950/95
                backdrop-blur
                border-t
                border-slate-800
              ">

                <div className="
                  flex
                  flex-col
                  sm:flex-row
                  gap-3
                ">

                  <button
                    onClick={
                      saveConfiguration
                    }
                    disabled={
                      savingConfig
                    }
                    className="
                      flex-1
                      px-4
                      py-3
                      rounded-lg
                      bg-emerald-600
                      hover:bg-emerald-500
                      disabled:opacity-50
                      font-semibold
                      text-sm
                    "
                  >
                    {savingConfig
                      ? "Publishing..."
                      : "Save & Publish"}
                  </button>

                  <button
                    onClick={() =>
                      sendAdminCommand(
                        "reboot"
                      )
                    }
                    className="
                      px-5
                      py-3
                      rounded-lg
                      bg-rose-500/10
                      hover:bg-rose-500/20
                      border
                      border-rose-500/30
                      text-rose-400
                      font-semibold
                      text-sm
                    "
                  >
                    Reboot
                  </button>

                </div>

                <p className="text-[10px] text-slate-600 text-center mt-3">
                  Configuration is saved by the backend, published through MQTT, and confirmed through the device ACK.
                </p>

              </div>

            </div>

          </div>

        )}

    </div>
  );
}
