import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '../../api';

// ── CONFIGURATION ALLOWLIST & FIELD METADATA ──────────────────────────────────
const ALLOWED_CONFIG_FIELDS = [
  {
    key: 'maxCurrent',
    label: 'Max Charging Current',
    type: 'number',
    unit: 'A',
    min: 6,
    max: 32,
    category: 'Charging',
    description: 'Maximum current allowable during charging sessions.',
    warning: 'Setting higher than circuit rating may trip breaker.',
    rebootRequired: false,
    elevated: true,
    defaultValue: 16,
  },
  {
    key: 'cf',
    label: 'Current Factor (CF)',
    type: 'number',
    unit: 'ratio',
    min: 0.001,
    max: 10.0,
    category: 'Metering',
    description: 'Calibration factor for current sensor reading.',
    warning: 'Incorrect values cause inaccurate billing.',
    rebootRequired: false,
    elevated: true,
    defaultValue: 0.231,
  },
  {
    key: 'vf',
    label: 'Voltage Factor (VF)',
    type: 'number',
    unit: 'ratio',
    min: 0.001,
    max: 10.0,
    category: 'Metering',
    description: 'Calibration factor for voltage measurement.',
    warning: 'Directly impacts energy consumption metrics.',
    rebootRequired: false,
    elevated: true,
    defaultValue: 1.88,
  },
  {
    key: 'currentRF',
    label: 'Shunt Resistor Factor (RF)',
    type: 'number',
    unit: 'ratio',
    min: 0.0001,
    max: 1.0,
    category: 'Metering',
    description: 'Shunt resistor factor for power calculation.',
    warning: 'Precision hardware parameter.',
    rebootRequired: false,
    elevated: true,
    defaultValue: 0.001,
  },
  {
    key: 'rate',
    label: 'Tariff Rate',
    type: 'number',
    unit: 'INR/kWh',
    min: 0,
    max: 100,
    category: 'Pricing',
    description: 'Billing rate per kWh for charging sessions.',
    warning: 'Changes apply to future sessions immediately.',
    rebootRequired: false,
    elevated: false,
    defaultValue: 20,
  },
  {
    key: 'wifiSSID',
    label: 'Wi-Fi SSID',
    type: 'string',
    unit: 'text',
    category: 'Network',
    description: 'Target access point network name.',
    warning: 'Device will lose connection if set incorrectly.',
    rebootRequired: true,
    elevated: false,
    defaultValue: '',
  },
  {
    key: 'targetFirmwareVersion',
    label: 'Target FW Version',
    type: 'string',
    unit: 'semver',
    category: 'Maintenance',
    description: 'Firmware version to be installed via OTA.',
    warning: 'Triggers OTA download and reboot upon receipt.',
    rebootRequired: true,
    elevated: true,
    defaultValue: 'v1.0.0',
  },
];

export default function Production() {
  // ── STATE MANAGEMENT ────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'group_a' | 'audit'
  const [provisions, setProvisions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [filterProject, setFilterProject] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterAckStatus, setFilterAckStatus] = useState('');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Drawers & Modals
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [isConfigDrawerOpen, setIsConfigDrawerOpen] = useState(false);
  const [isGroupAModalOpen, setIsGroupAModalOpen] = useState(false);
  const [isPromoteModalOpen, setIsPromoteModalOpen] = useState(false);

  // Form States
  const [groupAForm, setGroupAForm] = useState({
    serialNumber: '',
    hardwareRevision: 'PCB_V1.2',
    project: 'GLIDE',
    pcbBatch: '',
    notes: '',
  });

  const [promoteForm, setPromoteForm] = useState({
    serialNumber: '',
    deviceId: '',
    wifiSSID: '',
    wifiPassword: '',
    rate: 20,
    cf: 0.231,
    vf: 1.88,
    currentRF: 0.001,
    location: '',
    lat: 12.9716,
    lng: 77.5946,
    area: '',
    city: '',
    state: '',
    charger_type: 'AC_3.3KW',
    targetFirmwareVersion: 'v1.0.0',
  });

  // Config Edit Form State
  const [proposedConfig, setProposedConfig] = useState({});
  const [pushStatus, setPushStatus] = useState('Draft'); // Draft, Validating, Queued, Publishing, Published, ACK_Received, Failed
  const [historyLog, setHistoryLog] = useState([]);

  // Helper to construct normalized route paths
  const getEndpoint = (path) => {
    // Falls back to /api prefix if relative path doesn't start with /api
    return path.startsWith('/api') ? path : `/api${path}`;
  };

  // ── FETCH PROVISIONS / DEVICES ──────────────────────────────────────────────
  const fetchProvisions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (activeTab === 'group_a') {
        const endpoint = getEndpoint('/production/group-a');
        const res = await api.get(endpoint, {
          params: { page, limit: 20 },
        });
        setProvisions(res.data.data || []);
        setTotalCount(res.data.total || 0);
      } else {
        const endpoint = getEndpoint('/admin/provision');
        const res = await api.get(endpoint, {
          params: {
            page,
            limit: 20,
            search: searchTerm || undefined,
            status: filterStatus || undefined,
          },
        });
        setProvisions(res.data.docs || []);
        setTotalCount(res.data.total || 0);
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || err.message;
      setError(`Failed to fetch records: ${msg}`);
    } finally {
      setLoading(false);
    }
  }, [activeTab, page, searchTerm, filterStatus]);

  useEffect(() => {
    fetchProvisions();
  }, [fetchProvisions]);

  // ── AUTOMATIC ACK STATUS POLLING WHEN DRAWER OPEN ───────────────────────────
  useEffect(() => {
    let interval = null;
    if (isConfigDrawerOpen && selectedDevice) {
      interval = setInterval(async () => {
        try {
          const endpoint = getEndpoint(`/admin/provision/${selectedDevice.serialNumber}`);
          const res = await api.get(endpoint);
          if (res.data?.device) {
            setSelectedDevice(res.data.device);
            if (res.data.device.configAck?.status === 'ok') {
              setPushStatus('ACK_Received');
            } else if (res.data.device.configAck?.status === 'error') {
              setPushStatus('Failed');
            }
          }
        } catch (e) {
          // Silent polling failure fallback
        }
      }, 3000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isConfigDrawerOpen, selectedDevice]);

  // ── HANDLERS: GROUP A CREATION ──────────────────────────────────────────────
  const handleCreateGroupA = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const endpoint = getEndpoint('/production/group-a');
      await api.post(endpoint, groupAForm);
      setSuccessMsg(`Group A record ${groupAForm.serialNumber} created successfully.`);
      setIsGroupAModalOpen(false);
      setGroupAForm({ serialNumber: '', hardwareRevision: 'PCB_V1.2', project: 'GLIDE', pcbBatch: '', notes: '' });
      fetchProvisions();
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── HANDLERS: PROMOTE GROUP A -> GROUP B ───────────────────────────────────
  const handlePromoteGroupB = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const endpoint = getEndpoint(`/production/group-a/${promoteForm.serialNumber}/promote`);
      const res = await api.post(endpoint, promoteForm);
      setSuccessMsg(`Serial ${promoteForm.serialNumber} promoted to Group B (${res.data?.data?.deviceId}). MQTT config dispatched.`);
      setIsPromoteModalOpen(false);
      fetchProvisions();
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── HANDLERS: SAVE & PUSH SINGLE CONFIG FIELD ────────────────────────────────
  const handlePushConfigUpdate = async () => {
    if (!selectedDevice) return;
    setLoading(true);
    setPushStatus('Validating');
    setError(null);

    try {
      // Step 1: Update backend DB record
      setPushStatus('Queued');
      const updateEndpoint = getEndpoint(`/admin/provision/${selectedDevice.serialNumber}`);
      await api.patch(updateEndpoint, proposedConfig);

      // Step 2: Trigger MQTT push to device
      setPushStatus('Publishing');
      const sendEndpoint = getEndpoint(`/admin/provision/${selectedDevice.serialNumber}/send`);
      const sendRes = await api.post(sendEndpoint);

      if (sendRes.data.success) {
        setPushStatus('Published');
        setSuccessMsg(`Configuration command published to topic: ${sendRes.data.topic}`);

        // Add to audit/history log
        setHistoryLog((prev) => [
          {
            timestamp: new Date().toISOString(),
            serialNumber: selectedDevice.serialNumber,
            deviceId: selectedDevice.deviceId,
            changes: { ...proposedConfig },
            status: 'Published',
            topic: sendRes.data.topic,
          },
          ...prev,
        ]);
      }
    } catch (err) {
      setPushStatus('Failed');
      setError(err.response?.data?.error || err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── HANDLERS: ADMIN COMMAND (REBOOT / OTA) ──────────────────────────────────
  const handleSendAdminCmd = async (action) => {
    if (!selectedDevice?.deviceId) return;
    if (!window.confirm(`Are you sure you want to send action '${action}' to device ${selectedDevice.deviceId}?`)) return;

    setLoading(true);
    try {
      const endpoint = getEndpoint(`/admin/provision/cmd/${selectedDevice.deviceId}/admin`);
      const res = await api.post(endpoint, { action });
      setSuccessMsg(`Admin Command '${action}' published to ${res.data.topic}`);
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── FILTERED DATA DISPLAY ───────────────────────────────────────────────────
  const filteredProvisions = useMemo(() => {
    return provisions.filter((item) => {
      const matchesSearch =
        !searchTerm ||
        item.serialNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.deviceId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.project?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesProject = !filterProject || item.project === filterProject;
      const matchesAck = !filterAckStatus || item.configAck?.status === filterAckStatus;

      return matchesSearch && matchesProject && matchesAck;
    });
  }, [provisions, searchTerm, filterProject, filterAckStatus]);

  return (
    <div className="p-6 bg-slate-900 text-slate-100 min-h-screen font-sans">
      {/* ── HEADER ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-6 border-b border-slate-800 gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <span className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20 text-lg">⚡</span>
            Production Device Configuration
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Provision Group A/B hardware, dispatch MQTT NVS configs, and monitor hardware acknowledgments.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsGroupAModalOpen(true)}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium rounded-lg border border-slate-700 transition flex items-center gap-2"
          >
            <span>+</span> Create Group A
          </button>
          <button
            onClick={fetchProvisions}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition shadow-lg shadow-emerald-900/20"
          >
            Refresh Devices
          </button>
        </div>
      </div>

      {/* ── NOTIFICATION ALERTS ───────────────────────────────────────────── */}
      {error && (
        <div className="mt-4 p-4 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-400 text-sm flex justify-between items-center">
          <div><strong>Error:</strong> {error}</div>
          <button onClick={() => setError(null)} className="text-rose-400 hover:text-white">&times;</button>
        </div>
      )}
      {successMsg && (
        <div className="mt-4 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 text-sm flex justify-between items-center">
          <div><strong>Success:</strong> {successMsg}</div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-white">&times;</button>
        </div>
      )}

      {/* ── TABS NAVIGATION ───────────────────────────────────────────────── */}
      <div className="flex border-b border-slate-800 mt-6 gap-8">
        <button
          onClick={() => { setActiveTab('all'); setPage(1); }}
          className={`pb-3 text-sm font-semibold transition border-b-2 ${
            activeTab === 'all' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          All Provisioned Devices (Group B & Live)
        </button>
        <button
          onClick={() => { setActiveTab('group_a'); setPage(1); }}
          className={`pb-3 text-sm font-semibold transition border-b-2 ${
            activeTab === 'group_a' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Group A (Factory / Pre-Calibration)
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`pb-3 text-sm font-semibold transition border-b-2 ${
            activeTab === 'audit' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Push History & Audit Log
        </button>
      </div>

      {/* ── SEARCH & FILTERS BAR ──────────────────────────────────────────── */}
      {activeTab !== 'audit' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 my-6">
          <input
            type="text"
            placeholder="Search Serial Number or Device ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
          />
          <select
            value={filterProject}
            onChange={(e) => setFilterProject(e.target.value)}
            className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="">All Projects</option>
            <option value="GLIDE">GLIDE</option>
            <option value="VIZ">VIZ</option>
            <option value="SPARX_PRO">SPARX_PRO</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="">All Provision Statuses</option>
            <option value="pending">Pending</option>
            <option value="sent">Sent</option>
            <option value="acknowledged">Acknowledged</option>
            <option value="failed">Failed</option>
          </select>
          <select
            value={filterAckStatus}
            onChange={(e) => setFilterAckStatus(e.target.value)}
            className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="">All Device ACK States</option>
            <option value="ok">ACK OK</option>
            <option value="error">ACK Error</option>
            <option value="pending">Awaiting ACK</option>
          </select>
        </div>
      )}

      {/* ── MAIN DEVICE TABLE ─────────────────────────────────────────────── */}
      {activeTab !== 'audit' ? (
        <div className="bg-slate-800/50 rounded-xl border border-slate-800 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-800 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-700">
                <tr>
                  <th className="p-4">Serial Number</th>
                  <th className="p-4">Device ID</th>
                  <th className="p-4">Project / Rev</th>
                  <th className="p-4">Group / Status</th>
                  <th className="p-4">Calibration (CF/VF/RF)</th>
                  <th className="p-4">Tariff Rate</th>
                  <th className="p-4">Target FW</th>
                  <th className="p-4">Last ACK</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {loading ? (
                  <tr>
                    <td colSpan="9" className="p-8 text-center text-slate-500">
                      Loading production records from backend...
                    </td>
                  </tr>
                ) : filteredProvisions.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="p-8 text-center text-slate-500">
                      No matching devices or provisioning records found.
                    </td>
                  </tr>
                ) : (
                  filteredProvisions.map((item) => (
                    <tr key={item._id} className="hover:bg-slate-800/80 transition">
                      <td className="p-4 font-mono font-bold text-white">{item.serialNumber}</td>
                      <td className="p-4 font-mono text-emerald-400">{item.deviceId || '—'}</td>
                      <td className="p-4">
                        <div className="text-white font-medium">{item.project || 'Unassigned'}</div>
                        <div className="text-xs text-slate-500">{item.hardwareRevision || 'Rev N/A'}</div>
                      </td>
                      <td className="p-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                            item.manufacturingStatus === 'group_a'
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              : item.manufacturingStatus === 'group_b'
                              ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          }`}
                        >
                          {item.manufacturingStatus || 'Group A'}
                        </span>
                        <div className="text-xs text-slate-500 mt-1 capitalize">
                          Provision: {item.provisionStatus || 'pending'}
                        </div>
                      </td>
                      <td className="p-4 font-mono text-xs">
                        {item.cf !== undefined ? `${item.cf} / ${item.vf} / ${item.currentRF}` : '—'}
                      </td>
                      <td className="p-4 font-semibold text-white">
                        {item.rate !== undefined ? `₹${item.rate}/kWh` : '—'}
                      </td>
                      <td className="p-4 font-mono text-xs text-slate-400">
                        {item.targetFirmwareVersion || 'v1.0.0'}
                      </td>
                      <td className="p-4">
                        {item.configAck?.status ? (
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`w-2 h-2 rounded-full ${
                                item.configAck.status === 'ok' ? 'bg-emerald-400' : 'bg-rose-500'
                              }`}
                            />
                            <span className="text-xs uppercase font-bold text-slate-200">
                              {item.configAck.status}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500">No ACK</span>
                        )}
                        {item.configAck?.ackedAt && (
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            {new Date(item.configAck.ackedAt).toLocaleTimeString()}
                          </div>
                        )}
                      </td>
                      <td className="p-4 text-right space-x-2">
                        {item.manufacturingStatus === 'group_a' ? (
                          <button
                            onClick={() => {
                              setPromoteForm((prev) => ({
                                ...prev,
                                serialNumber: item.serialNumber,
                              }));
                              setIsPromoteModalOpen(true);
                            }}
                            className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 text-xs font-semibold rounded-lg transition"
                          >
                            Promote to Group B
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setSelectedDevice(item);
                              setProposedConfig({
                                cf: item.cf ?? 0.231,
                                vf: item.vf ?? 1.88,
                                currentRF: item.currentRF ?? 0.001,
                                rate: item.rate ?? 20,
                                wifiSSID: item.wifiSSID ?? '',
                                targetFirmwareVersion: item.targetFirmwareVersion ?? 'v1.0.0',
                              });
                              setIsConfigDrawerOpen(true);
                            }}
                            className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-medium rounded-lg border border-slate-600 transition"
                          >
                            Configure & Push
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="p-4 bg-slate-800 border-t border-slate-700 flex items-center justify-between text-xs text-slate-400">
            <div>
              Showing page {page} of {Math.ceil(totalCount / 20) || 1} ({totalCount} total items)
            </div>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 bg-slate-700 disabled:opacity-50 text-white rounded"
              >
                Previous
              </button>
              <button
                disabled={page >= Math.ceil(totalCount / 20)}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 bg-slate-700 disabled:opacity-50 text-white rounded"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* ── AUDIT LOG TAB ─────────────────────────────────────────────────── */
        <div className="bg-slate-800/50 rounded-xl border border-slate-800 p-6">
          <h3 className="text-lg font-bold text-white mb-4">MQTT Provisioning & Config Push Audit Log</h3>
          {historyLog.length === 0 ? (
            <p className="text-slate-500 text-sm">No configuration updates published during this session.</p>
          ) : (
            <div className="space-y-4">
              {historyLog.map((log, idx) => (
                <div key={idx} className="p-4 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono">
                  <div className="flex justify-between text-slate-400 mb-2">
                    <span>{new Date(log.timestamp).toLocaleString()}</span>
                    <span className="text-emerald-400">{log.topic}</span>
                  </div>
                  <div className="text-white font-bold mb-1">
                    Device: {log.deviceId || log.serialNumber}
                  </div>
                  <pre className="bg-slate-950 p-3 rounded text-slate-300 overflow-x-auto">
                    {JSON.stringify(log.changes, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── DRAWER: CONFIGURATION EDITOR & MQTT PUSH WORKFLOW ───────────────── */}
      {isConfigDrawerOpen && selectedDevice && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex justify-end">
          <div className="w-full max-w-2xl bg-slate-900 border-l border-slate-800 h-full overflow-y-auto p-6 flex flex-col justify-between shadow-2xl">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <span>⚙️</span> Device Configuration Editor
                  </h2>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    Serial: {selectedDevice.serialNumber} | ID: {selectedDevice.deviceId || 'UNASSIGNED'}
                  </p>
                </div>
                <button
                  onClick={() => setIsConfigDrawerOpen(false)}
                  className="text-slate-400 hover:text-white text-xl font-bold"
                >
                  &times;
                </button>
              </div>

              <div className="my-4 p-4 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-400 uppercase font-bold tracking-wider">MQTT Push Status</div>
                  <div className="text-sm font-bold text-emerald-400 mt-0.5">{pushStatus}</div>
                </div>
                {selectedDevice.configAck?.status && (
                  <div className="text-right">
                    <div className="text-xs text-slate-400">Device Hardware ACK</div>
                    <div
                      className={`text-xs font-bold font-mono px-2 py-0.5 rounded mt-0.5 inline-block ${
                        selectedDevice.configAck.status === 'ok'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      }`}
                    >
                      {selectedDevice.configAck.status.toUpperCase()}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-6 mt-6">
                {ALLOWED_CONFIG_FIELDS.map((field) => (
                  <div key={field.key} className="p-4 bg-slate-800/40 rounded-lg border border-slate-800">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <label className="text-sm font-semibold text-white block">{field.label}</label>
                        <span className="text-[11px] font-mono text-slate-500">Key: {field.key}</span>
                      </div>
                      <span className="text-xs px-2 py-0.5 bg-slate-800 border border-slate-700 text-slate-300 rounded font-mono">
                        {field.category}
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 mb-3">{field.description}</p>

                    <div className="grid grid-cols-2 gap-4 items-center">
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase block">Current Database Value</span>
                        <span className="text-xs font-mono font-bold text-amber-400">
                          {selectedDevice[field.key] !== undefined ? String(selectedDevice[field.key]) : 'Not set'}{' '}
                          {field.unit}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-500 uppercase block">Proposed New Value</span>
                        <input
                          type={field.type === 'number' ? 'number' : 'text'}
                          step={field.type === 'number' ? 'any' : undefined}
                          value={proposedConfig[field.key] ?? ''}
                          onChange={(e) =>
                            setProposedConfig((prev) => ({
                              ...prev,
                              [field.key]: field.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value,
                            }))
                          }
                          className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs font-mono text-white focus:border-emerald-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    {field.warning && (
                      <div className="mt-2 text-[11px] text-amber-400/90 flex items-center gap-1">
                        <span>⚠️</span> {field.warning}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-6 border-t border-slate-800 mt-6 flex gap-3">
              <button
                onClick={handlePushConfigUpdate}
                disabled={loading}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-sm rounded-lg shadow-lg shadow-emerald-900/30 transition flex justify-center items-center gap-2"
              >
                {loading ? 'Publishing over MQTT...' : 'Save & Push Configuration via MQTT'}
              </button>
              <button
                onClick={() => handleSendAdminCmd('reboot')}
                className="px-4 py-2.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/30 font-semibold text-sm rounded-lg transition"
              >
                Reboot Device
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: CREATE GROUP A ─────────────────────────────────────────── */}
      {isGroupAModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-xl p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-4">Create Group A Manufacturing Entry</h3>
            <form onSubmit={handleCreateGroupA} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Serial Number *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. VIZ2026A001"
                  value={groupAForm.serialNumber}
                  onChange={(e) => setGroupAForm({ ...groupAForm, serialNumber: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-sm text-white focus:border-emerald-500 focus:outline-none font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Hardware Revision</label>
                  <input
                    type="text"
                    value={groupAForm.hardwareRevision}
                    onChange={(e) => setGroupAForm({ ...groupAForm, hardwareRevision: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-sm text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Project</label>
                  <input
                    type="text"
                    value={groupAForm.project}
                    onChange={(e) => setGroupAForm({ ...groupAForm, project: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-sm text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">PCB Batch Number</label>
                <input
                  type="text"
                  placeholder="Batch #2026-08"
                  value={groupAForm.pcbBatch}
                  onChange={(e) => setGroupAForm({ ...groupAForm, pcbBatch: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-sm text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsGroupAModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded text-sm font-medium hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-sm font-semibold shadow"
                >
                  Create Group A
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: PROMOTE GROUP A -> GROUP B ─────────────────────────────── */}
      {isPromoteModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2">Promote Serial to Group B (Dispatch Config)</h3>
            <p className="text-xs text-slate-400 mb-6">
              Assign Device ID, Wi-Fi credentials, location, and calibration parameters before shipping.
            </p>

            <form onSubmit={handlePromoteGroupB} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Serial Number</label>
                  <input
                    type="text"
                    disabled
                    value={promoteForm.serialNumber}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-sm text-slate-400 font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Assigned Device ID *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. VIZ1A10"
                    value={promoteForm.deviceId}
                    onChange={(e) => setPromoteForm({ ...promoteForm, deviceId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-sm text-white focus:border-emerald-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Wi-Fi SSID *</label>
                  <input
                    type="text"
                    required
                    value={promoteForm.wifiSSID}
                    onChange={(e) => setPromoteForm({ ...promoteForm, wifiSSID: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-sm text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Wi-Fi Password *</label>
                  <input
                    type="password"
                    required
                    value={promoteForm.wifiPassword}
                    onChange={(e) => setPromoteForm({ ...promoteForm, wifiPassword: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-sm text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Current Factor (CF)</label>
                  <input
                    type="number"
                    step="any"
                    value={promoteForm.cf}
                    onChange={(e) => setPromoteForm({ ...promoteForm, cf: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-sm text-white focus:border-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Voltage Factor (VF)</label>
                  <input
                    type="number"
                    step="any"
                    value={promoteForm.vf}
                    onChange={(e) => setPromoteForm({ ...promoteForm, vf: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-sm text-white focus:border-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Shunt RF</label>
                  <input
                    type="number"
                    step="any"
                    value={promoteForm.currentRF}
                    onChange={(e) => setPromoteForm({ ...promoteForm, currentRF: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-sm text-white focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Location Address *</label>
                  <input
                    type="text"
                    required
                    placeholder="HQ Station 1"
                    value={promoteForm.location}
                    onChange={(e) => setPromoteForm({ ...promoteForm, location: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-sm text-white focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">City / State *</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      required
                      placeholder="City"
                      value={promoteForm.city}
                      onChange={(e) => setPromoteForm({ ...promoteForm, city: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-sm text-white"
                    />
                    <input
                      type="text"
                      required
                      placeholder="State"
                      value={promoteForm.state}
                      onChange={(e) => setPromoteForm({ ...promoteForm, state: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-sm text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsPromoteModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded text-sm font-medium hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-sm font-semibold shadow"
                >
                  Promote & Publish Config
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}