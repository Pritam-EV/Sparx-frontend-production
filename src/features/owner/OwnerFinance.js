import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  Grid,
  MenuItem,
  Select,
  Stack,
  Typography,
} from "@mui/material";
import AccountBalanceWalletOutlinedIcon from "@mui/icons-material/AccountBalanceWalletOutlined";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import ElectricBoltOutlinedIcon from "@mui/icons-material/ElectricBoltOutlined";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import RefreshOutlinedIcon from "@mui/icons-material/RefreshOutlined";
import PaymentsOutlinedIcon from "@mui/icons-material/PaymentsOutlined";
import { apiFetch } from "../../utils/apiFetch";

const C = {
  teal: "#04BFBF",
  tealDark: "#038a8a",
  tealLight: "#e6fafa",
  bg: "#f4f6f9",
  surface: "#ffffff",
  border: "#e8ecf0",
  text: "#0f172a",
  textMid: "#475569",
  muted: "#94a3b8",
  green: "#15803d",
  greenBg: "#dcfce7",
  orange: "#b45309",
  orangeBg: "#fff7ed",
  red: "#b91c1c",
  redBg: "#fef2f2",
};
const FONT = "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

const currentMonthKey = () => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  return `${year}-${month}`;
};

const monthLabel = (value) => {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value || "")) return value || "—";
  const [year, month] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
};

const money = (value) => {
  if (value === null || value === undefined || value === "") return "—";
  return `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const number = (value, digits = 2) => Number(value || 0).toLocaleString("en-IN", {
  minimumFractionDigits: 0,
  maximumFractionDigits: digits,
});

const billStatus = (status) => {
  const statuses = {
    uploaded: { label: "Bill available · payment pending", color: "warning" },
    payment_submitted: { label: "Payment submitted · verification pending", color: "info" },
    payment_verified: { label: "Owner payment verified", color: "success" },
    eb_paid_to_mseb: { label: "MSEB bill paid by VJRA", color: "success" },
    not_generated: { label: "Bill not generated", color: "default" },
  };
  return statuses[status] || { label: status || "Status unavailable", color: "default" };
};

function MetricCard({ label, value, note, icon: Icon }) {
  return (
    <Card sx={{ height: "100%", borderRadius: "16px", border: `1px solid ${C.border}`, boxShadow: "0 1px 4px rgba(15,23,42,0.04)" }}>
      <CardContent sx={{ p: 2.25, "&:last-child": { pb: 2.25 } }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
          <Box>
            <Typography sx={{ color: C.textMid, fontSize: 12, fontWeight: 600, fontFamily: FONT }}>{label}</Typography>
            <Typography sx={{ mt: 0.75, color: C.text, fontSize: { xs: 20, sm: 23 }, fontWeight: 850, letterSpacing: "-0.5px", fontFamily: FONT, overflowWrap: "anywhere" }}>
              {value}
            </Typography>
            {note && <Typography sx={{ mt: 0.5, color: C.muted, fontSize: 11, fontFamily: FONT }}>{note}</Typography>}
          </Box>
          {Icon && <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", bgcolor: C.tealLight, color: C.tealDark, width: 36, height: 36, borderRadius: "11px", flexShrink: 0 }}><Icon sx={{ fontSize: 20 }} /></Box>}
        </Stack>
      </CardContent>
    </Card>
  );
}

function SectionTitle({ title, subtitle }) {
  return (
    <Box sx={{ mb: 1.5 }}>
      <Typography sx={{ fontFamily: FONT, fontWeight: 850, fontSize: 16, color: C.text }}>{title}</Typography>
      {subtitle && <Typography sx={{ mt: 0.3, color: C.textMid, fontSize: 12, lineHeight: 1.5, fontFamily: FONT }}>{subtitle}</Typography>}
    </Box>
  );
}

function AmountRow({ label, value, bold = false, accent = false, note }) {
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={2} sx={{ py: 1.15 }}>
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontFamily: FONT, color: bold ? C.text : C.textMid, fontSize: 13, fontWeight: bold ? 800 : 550 }}>{label}</Typography>
        {note && <Typography sx={{ mt: 0.2, fontFamily: FONT, color: C.muted, fontSize: 11 }}>{note}</Typography>}
      </Box>
      <Typography sx={{ fontFamily: FONT, color: accent ? C.tealDark : C.text, fontSize: 14, fontWeight: bold ? 850 : 700, flexShrink: 0, textAlign: "right" }}>{money(value)}</Typography>
    </Stack>
  );
}

function ProjectBillCard({ project, month, onPay }) {
  const status = billStatus(project.status);
  const hasBill = Boolean(project.billGenerated);

  return (
    <Card sx={{ borderRadius: "16px", border: `1px solid ${C.border}`, boxShadow: "0 1px 4px rgba(15,23,42,0.04)" }}>
      <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "flex-start" }} gap={1}>
          <Box>
            <Typography sx={{ fontFamily: FONT, color: C.text, fontWeight: 850, fontSize: 15 }}>{project.project}</Typography>
            <Typography sx={{ fontFamily: FONT, color: C.muted, fontSize: 11, mt: 0.25 }}>
              {project.deviceCount} VJRA-borne device{project.deviceCount === 1 ? "" : "s"} · {monthLabel(month)}
            </Typography>
          </Box>
          <Chip size="small" label={status.label} color={status.color} variant={hasBill ? "filled" : "outlined"} sx={{ fontFamily: FONT, fontWeight: 650, alignSelf: { xs: "flex-start", sm: "center" } }} />
        </Stack>

        {!hasBill ? (
          <Alert severity="info" sx={{ mt: 2, borderRadius: "12px", fontFamily: FONT, fontSize: 12 }}>
            Bill not generated for this month. Gross Owner Payout, Fixed Electricity Charges, and Net Settlement are not calculated for this project until its ElectricityBill entry exists.
          </Alert>
        ) : (
          <>
            <Divider sx={{ my: 1.5, borderColor: C.border }} />
            <AmountRow
              label="VJRA-borne Energy Charges"
              value={project.energyCharges}
              note="ElectricityBill.charges.energyCharges.amount"
            />
            <AmountRow
              label="Fixed Electricity Charges"
              value={project.fixedElectricityCharges}
              note="ElectricityBill.totalOwnerPayable"
            />
            <AmountRow label="Total MSEB Bill" value={project.totalMsebBill} />
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }} justifyContent="space-between" sx={{ mt: 1.5 }}>
              <Typography sx={{ color: C.muted, fontFamily: FONT, fontSize: 11, lineHeight: 1.5 }}>
                Bill month: <b>{monthLabel(month)}</b>
              </Typography>
              {project.canPay && (
                <Button
                  variant="contained"
                  onClick={() => onPay(project.project, month)}
                  startIcon={<PaymentsOutlinedIcon />}
                  sx={{ fontFamily: FONT, textTransform: "none", fontWeight: 800, bgcolor: C.teal, color: "#063838", borderRadius: "10px", px: 2, "&:hover": { bgcolor: C.tealDark, color: "#fff" } }}
                >
                  Pay Fixed Electricity Charges
                </Button>
              )}
            </Stack>
            {project.status === "payment_submitted" && <Alert severity="info" sx={{ mt: 1.5, fontSize: 12, fontFamily: FONT }}>Your payment details were submitted and are awaiting VJRA verification.</Alert>}
            {project.status === "payment_verified" && <Alert severity="success" sx={{ mt: 1.5, fontSize: 12, fontFamily: FONT }}>Your payment has been verified by VJRA.</Alert>}
            {project.status === "eb_paid_to_mseb" && <Alert severity="success" sx={{ mt: 1.5, fontSize: 12, fontFamily: FONT }}>VJRA has recorded the MSEB bill as paid.</Alert>}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default function OwnerFinance() {
  const navigate = useNavigate();
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey());
  const [finance, setFinance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadFinance = useCallback(async (month, manual = false) => {
    try {
      if (manual) setRefreshing(true);
      else setLoading(true);
      setError("");
      const result = await apiFetch(`/api/owner/finance/monthly?month=${encodeURIComponent(month)}`);
      setFinance(result);
      // If the current month isn't valid for this owner, use the latest backend-provided month.
      if (result?.month && result.month !== month) setSelectedMonth(result.month);
    } catch (err) {
      setError(err?.message || "Could not load monthly finance and settlement details.");
      setFinance(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadFinance(selectedMonth);
  }, [selectedMonth, loadFinance]);

  const availableMonths = useMemo(() => {
    if (Array.isArray(finance?.availableMonths) && finance.availableMonths.length) return finance.availableMonths;
    return [selectedMonth];
  }, [finance, selectedMonth]);

  const totals = finance?.totals || {};
  const electricity = finance?.electricity || { applicable: false, projects: [] };
  const projects = Array.isArray(electricity.projects) ? electricity.projects : [];
  const hasOwnerBearerDevices = Number(totals.ownerBearerDeviceCount || 0) > 0;
  const showVjraTotals = Boolean(electricity.applicable && electricity.allBillsGenerated && electricity.totals);

  const handlePay = (project, month) => {
    navigate(`/owner/reports?project=${encodeURIComponent(project)}&month=${encodeURIComponent(month)}`);
  };

  return (
    <Box sx={{ bgcolor: C.bg, minHeight: "100vh", px: { xs: 1.5, sm: 2.5, md: 3.5 }, py: { xs: 2, sm: 3 }, fontFamily: FONT }}>
      <Box sx={{ maxWidth: 1180, mx: "auto" }}>
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} gap={1.5} sx={{ mb: 2.5 }}>
          <Box>
            <Typography sx={{ color: C.text, fontWeight: 900, fontSize: { xs: 24, sm: 29 }, letterSpacing: "-0.7px", fontFamily: FONT }}>Finance &amp; Settlement</Typography>
            <Typography sx={{ color: C.textMid, fontSize: 13, mt: 0.5, fontFamily: FONT }}>Monthly receipt summary, electricity adjustments and owner settlement.</Typography>
          </Box>
          <Button variant="outlined" startIcon={refreshing ? <CircularProgress size={15} /> : <RefreshOutlinedIcon />} disabled={loading || refreshing} onClick={() => loadFinance(selectedMonth, true)} sx={{ alignSelf: { xs: "flex-start", sm: "center" }, borderColor: C.border, color: C.text, bgcolor: C.surface, borderRadius: "10px", textTransform: "none", fontFamily: FONT, fontWeight: 700 }}>
            Refresh
          </Button>
        </Stack>

        <Card sx={{ mb: 2.5, borderRadius: "16px", border: `1px solid ${C.border}`, boxShadow: "0 1px 4px rgba(15,23,42,0.04)" }}>
          <CardContent sx={{ p: 2 }}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25} alignItems={{ sm: "center" }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ flex: 1 }}>
                <CalendarMonthOutlinedIcon sx={{ color: C.tealDark }} />
                <Typography sx={{ color: C.textMid, fontSize: 13, fontWeight: 750, fontFamily: FONT }}>Select month</Typography>
              </Stack>
              <FormControl size="small" sx={{ minWidth: { xs: "100%", sm: 220 } }}>
                <Select value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} sx={{ bgcolor: C.surface, borderRadius: "10px", fontFamily: FONT, fontWeight: 700, fontSize: 13 }}>
                  {availableMonths.map((month) => <MenuItem key={month} value={month}>{monthLabel(month)}</MenuItem>)}
                </Select>
              </FormControl>
            </Stack>
          </CardContent>
        </Card>

        {error && <Alert severity="error" sx={{ mb: 2, borderRadius: "12px", fontFamily: FONT }}>{error}</Alert>}

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", py: 9 }}><CircularProgress sx={{ color: C.teal }} /></Box>
        ) : finance && (
          <>
            <SectionTitle title={`Receipt Summary · ${monthLabel(finance.month || selectedMonth)}`} subtitle="Metrics below include receipts from all devices assigned to your owner account. No receipt-level transaction table is shown." />
            <Grid container spacing={1.5} sx={{ mb: 3 }}>
              <Grid item xs={6} sm={4} lg={2}><MetricCard label="Total Receipts" value={number(totals.receiptCount, 0)} icon={ReceiptLongOutlinedIcon} /></Grid>
              <Grid item xs={6} sm={4} lg={2}><MetricCard label="Total Amount" value={money(totals.totalAmount)} /></Grid>
              <Grid item xs={6} sm={4} lg={2}><MetricCard label="Taxable Amount" value={money(totals.taxableAmount)} /></Grid>
              <Grid item xs={6} sm={4} lg={2}><MetricCard label="GST" value={money(totals.gstAmount)} /></Grid>
              <Grid item xs={6} sm={4} lg={2}><MetricCard label="VJRA Margin" value={money(totals.vjraMarginAmount)} /></Grid>
              <Grid item xs={6} sm={4} lg={2}><MetricCard label="Energy Consumed" value={`${number(totals.energyConsumed, 3)} kWh`} icon={ElectricBoltOutlinedIcon} /></Grid>
            </Grid>

            {hasOwnerBearerDevices && (
              <Card sx={{ mb: 2.5, borderRadius: "18px", border: `1px solid ${C.border}`, boxShadow: "0 1px 4px rgba(15,23,42,0.04)" }}>
                <CardContent sx={{ p: { xs: 2.25, sm: 3 } }}>
                  <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 1 }}>
                    <AccountBalanceWalletOutlinedIcon sx={{ color: C.tealDark }} />
                    <Typography sx={{ color: C.text, fontFamily: FONT, fontWeight: 850, fontSize: 16 }}>Owner Payout · Owner-borne Electricity</Typography>
                  </Stack>
                  <Typography sx={{ color: C.textMid, fontFamily: FONT, fontSize: 12, mb: 1.5 }}>Existing Receipt.ownerPayout calculation is preserved for devices where electricityBearer is OWNER.</Typography>
                  <Box sx={{ background: "linear-gradient(135deg,#0f172a 0%,#1e293b 100%)", color: "white", p: { xs: 2.25, sm: 3 }, borderRadius: "14px" }}>
                    <Typography sx={{ fontFamily: FONT, fontSize: 12, color: "rgba(255,255,255,0.6)" }}>Owner Payout</Typography>
                    <Typography sx={{ fontFamily: FONT, fontWeight: 900, fontSize: { xs: 27, sm: 34 }, color: C.teal, mt: 0.5 }}>{money(totals.ownerBearerPayout ?? totals.ownerPayout)}</Typography>
                    {finance.payoutSettlement?.status && <Typography sx={{ mt: 0.75, fontFamily: FONT, color: "rgba(255,255,255,0.65)", fontSize: 11 }}>Recorded payout status: {finance.payoutSettlement.status.replaceAll("_", " ")}</Typography>}
                  </Box>
                </CardContent>
              </Card>
            )}

            {electricity.applicable && (
              <Box sx={{ mb: 3 }}>
                <SectionTitle title="VJRA-borne Electricity · Owner Settlement" subtitle="The consolidated payout uses the same Taxable Amount and VJRA Margin shown above, less the bill energy charges and fixed electricity charges for all VJRA-borne projects. Payout figures are shown only after every applicable project bill exists." />

                {showVjraTotals ? (
                  <Grid container spacing={1.5} sx={{ mb: 2 }}>
                    <Grid item xs={12} md={4}>
                      <Card sx={{ height: "100%", borderRadius: "16px", border: `1px solid ${C.border}` }}><CardContent sx={{ p: 2.25 }}>
                        <Typography sx={{ fontFamily: FONT, fontSize: 12, color: C.textMid, fontWeight: 700 }}>Gross Owner Payout</Typography>
                        <Typography sx={{ fontFamily: FONT, color: C.text, fontSize: 25, fontWeight: 900, mt: 0.75 }}>{money(electricity.totals.grossOwnerPayout)}</Typography>
                        <Typography sx={{ fontFamily: FONT, fontSize: 11, color: C.muted, mt: 0.7, lineHeight: 1.5 }}>
                          {money(totals.taxableAmount)} − {money(totals.vjraMarginAmount)} − {money(electricity.totals.energyCharges)}
                        </Typography>
                        <Typography sx={{ fontFamily: FONT, fontSize: 10, color: C.muted, mt: 0.3 }}>Uses the same Taxable Amount and VJRA Margin as the top summary cards.</Typography>
                      </CardContent></Card>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <Card sx={{ height: "100%", borderRadius: "16px", border: `1px solid ${C.border}` }}><CardContent sx={{ p: 2.25 }}>
                        <Typography sx={{ fontFamily: FONT, fontSize: 12, color: C.textMid, fontWeight: 700 }}>Fixed Electricity Charges</Typography>
                        <Typography sx={{ fontFamily: FONT, color: C.text, fontSize: 25, fontWeight: 900, mt: 0.75 }}>{money(electricity.totals.fixedElectricityCharges)}</Typography>
                        <Typography sx={{ fontFamily: FONT, fontSize: 11, color: C.muted, mt: 0.7 }}>ElectricityBill.totalOwnerPayable</Typography>
                      </CardContent></Card>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <Card sx={{ height: "100%", borderRadius: "16px", border: `1px solid ${C.teal}`, bgcolor: "#f0fdfd" }}><CardContent sx={{ p: 2.25 }}>
                        <Typography sx={{ fontFamily: FONT, fontSize: 12, color: C.tealDark, fontWeight: 800 }}>Net Settlement</Typography>
                        <Typography sx={{ fontFamily: FONT, color: C.tealDark, fontSize: 27, fontWeight: 950, mt: 0.75 }}>{money(electricity.totals.netSettlement)}</Typography>
                        <Typography sx={{ fontFamily: FONT, fontSize: 11, color: C.textMid, mt: 0.7 }}>Gross Owner Payout − Fixed Electricity Charges</Typography>
                      </CardContent></Card>
                    </Grid>
                    <Grid item xs={12}><Alert severity="info" sx={{ borderRadius: "12px", fontFamily: FONT, fontSize: 12 }}>Total MSEB bill for the selected month: <b>{money(electricity.totals.totalMsebBill)}</b>. Net Settlement is a calculated amount; it is not presented as paid unless a matching payout status is recorded separately.</Alert></Grid>
                  </Grid>
                ) : (
                  <Alert severity="warning" sx={{ mb: 2, borderRadius: "12px", fontFamily: FONT, fontSize: 12 }}>
                    The VJRA payout totals are not displayed until an ElectricityBill entry exists for every VJRA-borne project for {monthLabel(finance.month || selectedMonth)}. Projects with bills are shown below; projects without bills are marked as not generated.
                  </Alert>
                )}

                <Stack spacing={1.5}>
                  {projects.map((project) => <ProjectBillCard key={`${project.project}-${finance.month}`} project={project} month={finance.month || selectedMonth} onPay={handlePay} />)}
                </Stack>
              </Box>
            )}

            {!hasOwnerBearerDevices && !electricity.applicable && (
              <Card sx={{ borderRadius: "16px", border: `1px solid ${C.border}` }}>
                <CardContent sx={{ p: 3 }}>
                  <Stack direction="row" spacing={1.2} alignItems="center"><CheckCircleOutlineIcon sx={{ color: C.green }} /><Typography sx={{ fontFamily: FONT, color: C.text, fontWeight: 750 }}>No payout-eligible devices found for this owner account.</Typography></Stack>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </Box>
    </Box>
  );
}
