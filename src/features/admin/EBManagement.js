// src/features/admin/EBManagement.js

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Drawer,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AddIcon          from "@mui/icons-material/Add";
import CloseIcon        from "@mui/icons-material/Close";
import DeleteIcon       from "@mui/icons-material/Delete";
import EditIcon         from "@mui/icons-material/Edit";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import RefreshIcon      from "@mui/icons-material/Refresh";
import UploadFileIcon   from "@mui/icons-material/UploadFile";
import CheckCircleIcon  from "@mui/icons-material/CheckCircle";
import ElectricBoltIcon from "@mui/icons-material/ElectricBolt";

import { apiFetch } from "../../utils/apiFetch";

// ─── Constants ────────────────────────────────────────────────────────────────

const FONT = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

const MONTHS = [
  { value: 1,  label: "January"   },
  { value: 2,  label: "February"  },
  { value: 3,  label: "March"     },
  { value: 4,  label: "April"     },
  { value: 5,  label: "May"       },
  { value: 6,  label: "June"      },
  { value: 7,  label: "July"      },
  { value: 8,  label: "August"    },
  { value: 9,  label: "September" },
  { value: 10, label: "October"   },
  { value: 11, label: "November"  },
  { value: 12, label: "December"  },
];

const CURRENT_YEAR = new Date().getFullYear();
const YEARS        = [CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2];

const EMPTY_FORM = {
  project:         "",           // project string, not projectId
  month:           new Date().getMonth() + 1,
  year:            CURRENT_YEAR,
  wheelingCharges: "",
  demandCharges:   "",
  energyCharges:   "",
  fac:             "",
  fixedCharges:    "",
  totalBillAmount: "",
  otherCharges:    [],
  pdfFile:         null,
};

const fmtMoney = (n) =>
  `₹${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const monthLabel = (m, y) => `${MONTHS.find((x) => x.value === m)?.label} ${y}`;

// ─── Status chip ─────────────────────────────────────────────────────────────

function StatusChip({ status }) {
  const map = {
    EB_UPLOADED:  { label: "EB Uploaded",  bg: "#dbeafe", color: "#1d4ed8" },
    EB_PROCESSED: { label: "Processed",    bg: "#dcfce7", color: "#15803d" },
    NO_DATA:      { label: "No Data",      bg: "#f1f5f9", color: "#64748b" },
  };
  const s = map[status] || map.NO_DATA;
  return (
    <Chip
      size="small"
      label={s.label}
      sx={{ bgcolor: s.bg, color: s.color, fontWeight: 700, fontSize: 11, fontFamily: FONT }}
    />
  );
}

// ─── Numeric field ────────────────────────────────────────────────────────────

function AmountField({ label, value, onChange, required }) {
  return (
    <TextField
      label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      size="small"
      fullWidth
      required={required}
      type="number"
      inputProps={{ min: 0, step: "0.01" }}
      InputProps={{
        startAdornment: <Typography sx={{ mr: 0.5, color: "#94a3b8", fontSize: 13, fontFamily: FONT }}>₹</Typography>,
        style: { fontSize: 13, fontFamily: FONT },
      }}
      InputLabelProps={{ style: { fontSize: 13, fontFamily: FONT } }}
    />
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function EBManagement() {
  // ── List state ──
  const [records,     setRecords]     = useState([]);
  const [listLoading, setListLoading] = useState(false);
  const [listErr,     setListErr]     = useState(null);

  // ── Filter state for list ──
  const [filterMonth, setFilterMonth] = useState("");
  const [filterYear,  setFilterYear]  = useState("");

  // ── Owners & projects (for dropdowns) ──
  const [projects, setProjects] = useState([]);

  // ── Drawer / form state ──
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editRecord, setEditRecord] = useState(null);   // null = create, obj = edit
  const [form,       setForm]       = useState(EMPTY_FORM);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitErr,     setSubmitErr]     = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // ── PDF file ref ──
  const fileInputRef = useRef(null);

useEffect(() => {
  apiFetch("/api/eb/admin/projects")
    .then((res) => setProjects(Array.isArray(res?.projects) ? res.projects : []))
    .catch(() => setProjects([]));
}, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Fetch EB records list
  // ─────────────────────────────────────────────────────────────────────────
const fetchRecords = useCallback(async () => {
  try {
    setListLoading(true);
    setListErr(null);

const params = new URLSearchParams();
if (filterMonth && filterYear)
  params.set("month", `${filterYear}-${String(filterMonth).padStart(2, "0")}`);
const res = await apiFetch(`/api/eb/admin/list?${params.toString()}`);
setRecords(Array.isArray(res?.ebs) ? res.ebs : []);


  } catch (e) {
    setListErr(e.message || "Failed to load records");
  } finally {
    setListLoading(false);
  }
}, [filterMonth, filterYear]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  // ─────────────────────────────────────────────────────────────────────────
  // Open drawer for create / edit
  // ─────────────────────────────────────────────────────────────────────────
  const openCreate = () => {
    setEditRecord(null);
    setForm(EMPTY_FORM);
    setSubmitErr(null);
    setSubmitSuccess(false);
    setDrawerOpen(true);
  };

// ✅ NEW — backend list returns: record.project, record.month="YYYY-MM",
//          record.charges.X.amount, record.totalEBAmount
const openEdit = (record) => {
  setEditRecord(record);
  const [yearStr, monthStr] = (record.month || "").split("-");
  setForm({
    project:         record.project || "",
    month:           Number(monthStr) || (new Date().getMonth() + 1),
    year:            Number(yearStr)  || CURRENT_YEAR,
    wheelingCharges: record.charges?.wheelingCharges?.amount ?? "",
    demandCharges:   record.charges?.demandCharges?.amount   ?? "",
    energyCharges:   record.charges?.energyCharges?.amount   ?? "",
    fac:             record.charges?.fac?.amount             ?? "",
    fixedCharges:    record.charges?.fixedCharges?.amount    ?? "",
    totalBillAmount: record.totalEBAmount ?? "",
    otherCharges:    [],
    pdfFile:         null,
  });
  setSubmitErr(null);
  setSubmitSuccess(false);
  setDrawerOpen(true);
};

  // ─────────────────────────────────────────────────────────────────────────
  // Form field helpers
  // ─────────────────────────────────────────────────────────────────────────
  const setField = (key, val) => setForm((prev) => ({ ...prev, [key]: val }));

  const addOtherCharge = () =>
    setForm((prev) => ({ ...prev, otherCharges: [...prev.otherCharges, { label: "", amount: "" }] }));

  const updateOtherCharge = (i, key, val) =>
    setForm((prev) => {
      const updated = [...prev.otherCharges];
      updated[i] = { ...updated[i], [key]: val };
      return { ...prev, otherCharges: updated };
    });

  const removeOtherCharge = (i) =>
    setForm((prev) => ({ ...prev, otherCharges: prev.otherCharges.filter((_, idx) => idx !== i) }));

  // ─────────────────────────────────────────────────────────────────────────
  // Submit (create or update)
  // ─────────────────────────────────────────────────────────────────────────
// ✅ FULL REPLACEMENT for handleSubmit
const handleSubmit = async () => {
  if (!form.project || !form.totalBillAmount) {
    setSubmitErr("Project and Total Bill Amount are required.");
    return;
  }

  try {
    setSubmitLoading(true);
    setSubmitErr(null);

    // Backend expects month as "YYYY-MM"
    const monthStr = `${form.year}-${String(form.month).padStart(2, "0")}`;

    const fd = new FormData();
    fd.append("project",         form.project);   // ← key field for upsert
    fd.append("month",           monthStr);        // ← "YYYY-MM" format
    fd.append("wheelingCharges", Number(form.wheelingCharges) || 0);
    fd.append("demandCharges",   Number(form.demandCharges)   || 0);
    fd.append("energyCharges",   Number(form.energyCharges)   || 0);
    fd.append("fac",             Number(form.fac)             || 0);
    fd.append("fixedCharges",    Number(form.fixedCharges)    || 0);
    fd.append("totalBillAmount", Number(form.totalBillAmount));
    fd.append(
      "otherCharges",
      JSON.stringify(
        form.otherCharges
          .filter((o) => o.label.trim() && o.amount !== "")
          .map((o) => ({ label: o.label.trim(), amount: Number(o.amount) }))
      )
    );
    if (form.pdfFile) fd.append("ebPdf", form.pdfFile);

    const token = localStorage.getItem("token");
    const BASE  = (
      process.env.REACT_APP_Backend_API_Base_URL ||
      process.env.REACT_APP_API_BASE ||
      ""
    ).replace(/\/+$/, "");

    // Always POST — backend does findOneAndUpdate upsert on (project + month)
    const res = await fetch(`${BASE}/api/eb/admin/upload`, {
      method:  "POST",
      headers: { Authorization: `Bearer ${token}` },
      body:    fd,
    });

    const result = await res.json();
    if (!res.ok) throw new Error(result?.error || result?.message || "Failed to save");

    setSubmitSuccess(true);
    fetchRecords();
    setTimeout(() => { setDrawerOpen(false); setSubmitSuccess(false); }, 1600);
  } catch (e) {
    setSubmitErr(e.message || "Failed to save EB record");
  } finally {
    setSubmitLoading(false);
  }
};

  // ─────────────────────────────────────────────────────────────────────────
  // Computed total from fields (live preview)
  // ─────────────────────────────────────────────────────────────────────────
  const computedTotal = [
    form.wheelingCharges,
    form.demandCharges,
    form.energyCharges,
    form.fac,
    form.fixedCharges,
    ...form.otherCharges.map((o) => o.amount),
  ].reduce((acc, v) => acc + (Number(v) || 0), 0);

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <Box sx={{ maxWidth: 1280, mx: "auto", py: 3, px: { xs: 2, md: 3 }, fontFamily: FONT }}>

      {/* ── Page Header ───────────────────────────────────────────── */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={1.5}>
        <Box>
          <Typography sx={{ fontWeight: 900, fontSize: { xs: 22, sm: 26 }, color: "#000", letterSpacing: "-0.5px", fontFamily: FONT }}>
            EB Management
          </Typography>
          <Typography sx={{ color: "#64748b", fontSize: 12, fontFamily: FONT }}>
            Upload and manage monthly Electricity Bill breakdowns for VJRA projects
          </Typography>
        </Box>

        <Stack direction="row" spacing={1}>
          <Tooltip title="Refresh" arrow>
            <IconButton
              onClick={fetchRecords}
              disabled={listLoading}
              size="small"
              sx={{ bgcolor: "#04BFBF", color: "#fff", width: 32, height: 32, "&:hover": { bgcolor: "#03a6a6", transform: "rotate(180deg)" }, "&:disabled": { bgcolor: "#cbd5e1" }, transition: "all 0.4s" }}
            >
              <RefreshIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>

          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={openCreate}
            sx={{ bgcolor: "#04BFBF", color: "#fff", fontWeight: 700, fontSize: 13, textTransform: "none", borderRadius: 1.5, fontFamily: FONT, "&:hover": { bgcolor: "#03a6a6" } }}
          >
            Upload EB
          </Button>
        </Stack>
      </Stack>

      {/* ── List Filters ───────────────────────────────────────────── */}
      <Card sx={cardSx} mb={3}>
        <CardContent sx={{ p: 1.5 }}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} flexWrap="wrap">
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel sx={{ fontSize: 13, fontFamily: FONT }}>Month</InputLabel>
              <Select label="Month" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} sx={selectSx}>
                <MenuItem value="" sx={{ fontSize: 13 }}>All</MenuItem>
                {MONTHS.map((m) => (
                  <MenuItem key={m.value} value={m.value} sx={{ fontSize: 13 }}>{m.label}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel sx={{ fontSize: 13, fontFamily: FONT }}>Year</InputLabel>
              <Select label="Year" value={filterYear} onChange={(e) => setFilterYear(e.target.value)} sx={selectSx}>
                <MenuItem value="" sx={{ fontSize: 13 }}>All</MenuItem>
                {YEARS.map((y) => (
                  <MenuItem key={y} value={y} sx={{ fontSize: 13 }}>{y}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </CardContent>
      </Card>

      {/* ── Error ─────────────────────────────────────────────────── */}
      {listErr && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2, fontFamily: FONT }}>{listErr}</Alert>
      )}

      {/* ── Loading ───────────────────────────────────────────────── */}
      {listLoading && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress size={36} thickness={4} sx={{ color: "#04BFBF" }} />
        </Box>
      )}

      {/* ── Records Grid ──────────────────────────────────────────── */}
      {!listLoading && records.length === 0 && (
        <Card sx={cardSx}>
          <CardContent sx={{ textAlign: "center", py: 7 }}>
            <ElectricBoltIcon sx={{ fontSize: 48, color: "#04BFBF", mb: 1 }} />
            <Typography sx={{ fontWeight: 700, fontSize: 16, color: "#000", mb: 0.5, fontFamily: FONT }}>
              No EB Records Found
            </Typography>
            <Typography sx={{ color: "#64748b", fontSize: 13, fontFamily: FONT }}>
              Upload the first Electricity Bill using the "Upload EB" button above.
            </Typography>
          </CardContent>
        </Card>
      )}

      {!listLoading && records.length > 0 && (
        <Grid container spacing={2}>
          {records.map((rec) => (
            <Grid item xs={12} sm={6} md={4} key={rec._id}>
              <Card
                sx={{
                  ...cardSx,
                  cursor: "pointer",
                  transition: "all 0.2s",
                  "&:hover": { transform: "translateY(-3px)", boxShadow: "0 4px 16px rgba(0,0,0,0.12)" },
                }}
              >
                <CardContent sx={{ p: 2 }}>
                  {/* Card header */}
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1.5}>
                    <Box>
                      <Typography sx={{ fontWeight: 700, fontSize: 14, color: "#000", fontFamily: FONT }}>
                        {monthLabel(rec.month, rec.year)}
                      </Typography>
                      <Typography sx={{ fontSize: 12, color: "#64748b", fontFamily: FONT }}>
                        {rec.project || "—"}
                      </Typography>
                      <Typography sx={{ fontSize: 11, color: "#94a3b8", fontFamily: FONT }}>
                       
                      </Typography>
                    </Box>
                    <StatusChip status={rec.status || "EB_UPLOADED"} />
                  </Stack>

                  <Divider sx={{ mb: 1.5 }} />

                  {/* Charge rows */}
                  {[
                    ["Energy Charges",  rec.charges?.energyCharges?.amount],
                    ["Wheeling Charges", rec.charges?.wheelingCharges?.amount],
                    ["Demand Charges",  rec.charges?.demandCharges?.amount],
                    ["Fixed Charges",   rec.charges?.fixedCharges?.amount],
                    ["FAC",             rec.charges?.fac?.amount],
                  ].map(([label, val]) => (
                    <Box key={label} sx={{ display: "flex", justifyContent: "space-between", mb: 0.4 }}>
                      <Typography sx={{ fontSize: 11, color: "#64748b", fontFamily: FONT }}>{label}</Typography>
                      <Typography sx={{ fontSize: 11, fontWeight: 600, color: "#0f172a", fontFamily: FONT }}>{fmtMoney(val)}</Typography>
                    </Box>
                  ))}

                  {rec.otherCharges?.length > 0 && rec.otherCharges.map((o, i) => (
                    <Box key={i} sx={{ display: "flex", justifyContent: "space-between", mb: 0.4 }}>
                      <Typography sx={{ fontSize: 11, color: "#64748b", fontFamily: FONT }}>{o.label}</Typography>
                      <Typography sx={{ fontSize: 11, fontWeight: 600, color: "#0f172a", fontFamily: FONT }}>{fmtMoney(o.amount)}</Typography>
                    </Box>
                  ))}

                  <Divider sx={{ my: 1 }} />

                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#000", fontFamily: FONT }}>Total EB</Typography>
                    <Typography sx={{ fontSize: 14, fontWeight: 800, color: "#04BFBF", fontFamily: FONT }}>{fmtMoney(rec.totalEBAmount)}</Typography>
                  </Box>

                  {/* Footer actions */}
                  <Stack direction="row" justifyContent="space-between" alignItems="center" mt={1.5}>
                    {rec.pdfUrl ? (
                      <Button
                        size="small"
                        startIcon={<PictureAsPdfIcon sx={{ fontSize: 14 }} />}
                        onClick={(e) => { e.stopPropagation(); window.open(rec.pdfUrl, "_blank"); }}
                        sx={{ fontSize: 11, color: "#dc2626", textTransform: "none", fontFamily: FONT, p: 0, minWidth: 0 }}
                      >
                        View PDF
                      </Button>
                    ) : (
                      <Typography sx={{ fontSize: 11, color: "#94a3b8", fontFamily: FONT }}>No PDF</Typography>
                    )}

                    <IconButton
                      size="small"
                      onClick={() => openEdit(rec)}
                      sx={{ color: "#04BFBF", "&:hover": { bgcolor: "#f0fdfd" } }}
                    >
                      <EditIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* ═══════════════════════════════════════════════════════════
          DRAWER — Create / Edit EB
      ════════════════════════════════════════════════════════════ */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => { if (!submitLoading) setDrawerOpen(false); }}
        PaperProps={{ sx: { width: { xs: "100vw", sm: 480 }, p: 0 } }}
      >
        <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>

          {/* Drawer header */}
          <Box sx={{ px: 3, py: 2, borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Box>
              <Typography sx={{ fontWeight: 800, fontSize: 16, color: "#000", fontFamily: FONT }}>
                {editRecord ? "Edit EB Record" : "Upload EB Breakdown"}
              </Typography>
              <Typography sx={{ fontSize: 12, color: "#64748b", fontFamily: FONT }}>
                {editRecord ? monthLabel(form.month, form.year) : "Fill all charge details and upload PDF"}
              </Typography>
            </Box>
            <IconButton onClick={() => setDrawerOpen(false)} disabled={submitLoading} size="small">
              <CloseIcon sx={{ fontSize: 20 }} />
            </IconButton>
          </Box>

          {/* Drawer body — scrollable */}
          <Box sx={{ flex: 1, overflowY: "auto", px: 3, py: 2.5 }}>
            {submitSuccess ? (
              <Stack alignItems="center" justifyContent="center" spacing={2} sx={{ height: "100%", py: 8 }}>
                <CheckCircleIcon sx={{ fontSize: 56, color: "#16a34a" }} />
                <Typography sx={{ fontWeight: 700, fontSize: 16, color: "#16a34a", fontFamily: FONT }}>
                  {editRecord ? "Record updated!" : "EB uploaded successfully!"}
                </Typography>
              </Stack>
            ) : (
              <Stack spacing={2.5}>

                {/* ── Period ──────────────────────────────────────── */}
                <Box>
                  <SectionHeading>Billing Period</SectionHeading>
                  <Stack direction="row" spacing={1.5}>
                    <FormControl size="small" sx={{ flex: 1 }}>
                      <InputLabel sx={{ fontSize: 13 }}>Month</InputLabel>
                      <Select label="Month" value={form.month} onChange={(e) => setField("month", e.target.value)} sx={selectSx} disabled={!!editRecord}>
                        {MONTHS.map((m) => (
                          <MenuItem key={m.value} value={m.value} sx={{ fontSize: 13 }}>{m.label}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    <FormControl size="small" sx={{ flex: 1 }}>
                      <InputLabel sx={{ fontSize: 13 }}>Year</InputLabel>
                      <Select label="Year" value={form.year} onChange={(e) => setField("year", e.target.value)} sx={selectSx} disabled={!!editRecord}>
                        {YEARS.map((y) => (
                          <MenuItem key={y} value={y} sx={{ fontSize: 13 }}>{y}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Stack>
                </Box>

<Box>
  <SectionHeading>Project</SectionHeading>
  <FormControl size="small" fullWidth required disabled={!!editRecord}>
    <InputLabel sx={{ fontSize: 13 }}>Project *</InputLabel>
    <Select
      label="Project *"
      value={form.project}
      onChange={(e) => setField("project", e.target.value)}
      sx={selectSx}
    >
      <MenuItem value="" sx={{ fontSize: 13 }}>Select project</MenuItem>
      {projects.map((p) => (
        <MenuItem key={p.project} value={p.project} sx={{ fontSize: 13 }}>
          {p.project}
          <Typography
            component="span"
            sx={{ ml: 1, fontSize: 11, color: "#94a3b8" }}
          >
            ({p.deviceCount} device{p.deviceCount !== 1 ? "s" : ""}
            {p.ownerNames?.length ? ` · ${p.ownerNames.join(", ")}` : ""})
          </Typography>
        </MenuItem>
      ))}
    </Select>
  </FormControl>
</Box>

                {/* ── EB Charge Breakdown ──────────────────────────── */}
                <Box>
                  <SectionHeading>EB Charge Breakdown (MSEB)</SectionHeading>
                  <Stack spacing={1.5}>
                    <AmountField label="Wheeling Charges"   value={form.wheelingCharges} onChange={(v) => setField("wheelingCharges", v)} />
                    <AmountField label="Demand Charges"     value={form.demandCharges}   onChange={(v) => setField("demandCharges",   v)} />
                    <AmountField label="Energy Charges"     value={form.energyCharges}   onChange={(v) => setField("energyCharges",   v)} />
                    <AmountField label="FAC (Fuel Adj. Charge)" value={form.fac}         onChange={(v) => setField("fac",             v)} />
                    <AmountField label="Fixed Charges"      value={form.fixedCharges}    onChange={(v) => setField("fixedCharges",    v)} />

                    {/* Dynamic other charges */}
                    {form.otherCharges.map((oc, i) => (
                      <Stack key={i} direction="row" spacing={1} alignItems="center">
                        <TextField
                          label="Charge Name"
                          value={oc.label}
                          onChange={(e) => updateOtherCharge(i, "label", e.target.value)}
                          size="small"
                          sx={{ flex: 1.2 }}
                          InputProps={{ style: { fontSize: 13, fontFamily: FONT } }}
                          InputLabelProps={{ style: { fontSize: 13 } }}
                        />
                        <TextField
                          label="Amount (₹)"
                          value={oc.amount}
                          onChange={(e) => updateOtherCharge(i, "amount", e.target.value)}
                          size="small"
                          type="number"
                          inputProps={{ min: 0, step: "0.01" }}
                          sx={{ flex: 1 }}
                          InputProps={{ style: { fontSize: 13, fontFamily: FONT } }}
                          InputLabelProps={{ style: { fontSize: 13 } }}
                        />
                        <IconButton size="small" onClick={() => removeOtherCharge(i)} sx={{ color: "#dc2626" }}>
                          <DeleteIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                      </Stack>
                    ))}

                    <Button
                      size="small"
                      startIcon={<AddIcon />}
                      onClick={addOtherCharge}
                      sx={{ alignSelf: "flex-start", color: "#04BFBF", textTransform: "none", fontSize: 12, fontFamily: FONT }}
                    >
                      Add Other Charge
                    </Button>
                  </Stack>
                </Box>

                {/* ── Computed preview ─────────────────────────────── */}
                {computedTotal > 0 && (
                  <Box sx={{ p: 1.5, bgcolor: "#f0fdfd", borderRadius: 1.5, border: "1px solid #99f6e4", display: "flex", justifyContent: "space-between" }}>
                    <Typography sx={{ fontSize: 12, color: "#0f766e", fontFamily: FONT }}>
                      Sum of above charges
                    </Typography>
                    <Typography sx={{ fontSize: 13, fontWeight: 700, color: "#0f766e", fontFamily: FONT }}>
                      {fmtMoney(computedTotal)}
                    </Typography>
                  </Box>
                )}

                {/* ── Total Bill Amount ────────────────────────────── */}
                <Box>
                  <SectionHeading>Total MSEB Bill Amount *</SectionHeading>
                  <AmountField
                    label="Total Bill Amount (as on MSEB bill) *"
                    value={form.totalBillAmount}
                    onChange={(v) => setField("totalBillAmount", v)}
                    required
                  />
                  <Typography sx={{ fontSize: 10, color: "#94a3b8", mt: 0.5, fontFamily: FONT }}>
                    Enter the exact total as printed on the MSEB bill. This may differ slightly from the sum above due to rounding/taxes.
                  </Typography>
                </Box>

                {/* ── PDF Upload ───────────────────────────────────── */}
                <Box>
                  <SectionHeading>Upload EB PDF {editRecord && "(leave blank to keep existing)"}</SectionHeading>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf"
                    style={{ display: "none" }}
                    onChange={(e) => setField("pdfFile", e.target.files[0] || null)}
                  />

                  <Box
                    onClick={() => fileInputRef.current?.click()}
                    sx={{
                      border: "2px dashed",
                      borderColor: form.pdfFile ? "#04BFBF" : "#d1d5db",
                      borderRadius: 2,
                      p: 3,
                      textAlign: "center",
                      cursor: "pointer",
                      bgcolor: form.pdfFile ? "#f0fdfd" : "#f9fafb",
                      transition: "all 0.2s",
                      "&:hover": { borderColor: "#04BFBF", bgcolor: "#f0fdfd" },
                    }}
                  >
                    {form.pdfFile ? (
                      <Stack alignItems="center" spacing={0.5}>
                        <PictureAsPdfIcon sx={{ fontSize: 32, color: "#dc2626" }} />
                        <Typography sx={{ fontSize: 13, fontWeight: 600, color: "#000", fontFamily: FONT }}>
                          {form.pdfFile.name}
                        </Typography>
                        <Typography sx={{ fontSize: 11, color: "#64748b", fontFamily: FONT }}>
                          {(form.pdfFile.size / 1024).toFixed(1)} KB · Click to change
                        </Typography>
                      </Stack>
                    ) : (
                      <Stack alignItems="center" spacing={0.5}>
                        <UploadFileIcon sx={{ fontSize: 32, color: "#94a3b8" }} />
                        <Typography sx={{ fontSize: 13, color: "#64748b", fontFamily: FONT }}>
                          Click to upload MSEB EB PDF
                        </Typography>
                        <Typography sx={{ fontSize: 11, color: "#94a3b8", fontFamily: FONT }}>
                          PDF files only · Max 10 MB
                        </Typography>
                      </Stack>
                    )}
                  </Box>

                  {editRecord?.pdfUrl && !form.pdfFile && (
                    <Button
                      size="small"
                      startIcon={<PictureAsPdfIcon sx={{ fontSize: 14 }} />}
                      onClick={() => window.open(editRecord.pdfUrl, "_blank")}
                      sx={{ mt: 1, fontSize: 12, color: "#dc2626", textTransform: "none", fontFamily: FONT }}
                    >
                      View existing PDF
                    </Button>
                  )}
                </Box>

                {/* Error */}
                {submitErr && (
                  <Alert severity="error" sx={{ fontFamily: FONT, fontSize: 12 }}>{submitErr}</Alert>
                )}

              </Stack>
            )}
          </Box>

          {/* Drawer footer — sticky */}
          {!submitSuccess && (
            <Box sx={{ px: 3, py: 2, borderTop: "1px solid #e5e7eb" }}>
              <Stack direction="row" spacing={1.5}>
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={() => setDrawerOpen(false)}
                  disabled={submitLoading}
                  sx={{ fontSize: 13, textTransform: "none", fontFamily: FONT, borderColor: "#d1d5db", color: "#475569", borderRadius: 1.5 }}
                >
                  Cancel
                </Button>
                <Button
                  fullWidth
                  variant="contained"
                  onClick={handleSubmit}
                  disabled={submitLoading}
                  sx={{ fontSize: 13, textTransform: "none", fontFamily: FONT, bgcolor: "#04BFBF", color: "#fff", fontWeight: 700, borderRadius: 1.5, "&:hover": { bgcolor: "#03a6a6" } }}
                >
                  {submitLoading
                    ? <CircularProgress size={18} sx={{ color: "#fff" }} />
                    : editRecord ? "Save Changes" : "Upload EB"}
                </Button>
              </Stack>
            </Box>
          )}

        </Box>
      </Drawer>

    </Box>
  );
}

// ─── Style helpers ────────────────────────────────────────────────────────────

function SectionHeading({ children }) {
  return (
    <Typography sx={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.8px", textTransform: "uppercase", color: "#94a3b8", mb: 1, fontFamily: "'Inter', sans-serif" }}>
      {children}
    </Typography>
  );
}

const cardSx = {
  borderRadius: 2,
  border: "1px solid #e5e7eb",
  boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
  background: "#fff",
};

const selectSx = {
  bgcolor: "#f9fafb",
  fontSize: 13,
  fontWeight: 500,
  "& .MuiOutlinedInput-notchedOutline": { borderColor: "#e5e7eb" },
  "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#04BFBF" },
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};