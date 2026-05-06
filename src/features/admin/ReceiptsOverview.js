import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Grid,
  Stack,
  Tabs,
  Tab,
  Divider,
  Button
} from "@mui/material";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from "recharts";
import { api } from "../../api";
import { centerText } from "@yudiel/react-qr-scanner";

const PERIODS = [
  { label: "Today", value: "today" },
  { label: "This Week", value: "week" },
  { label: "This Month", value: "month" },
  { label: "Last Month", value: "last_month" },
  { label: "This Quarter", value: "quarter" },
  { label: "This Year", value: "year" }
];

export default function EnterpriseFinancialPanel() {
  const [summary, setSummary] = useState({});
  const [receipts, setReceipts] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [period, setPeriod] = useState("today");
  const [tab, setTab] = useState(0);
  const [range, setRange] = useState(null);


  const fetchData = async () => {
    try {
      const res = await api.get("/api/receipts/admin/financial", {
        params: { period }
      });

      setSummary(res.data.summary || {});
      setReceipts(res.data.receipts || []);
      setChartData(res.data.receipts || []);
      setRange(res.data.range || null);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [period]);

  const money = (v) => `₹ ${Number(v || 0).toFixed(2)}`;
  const totalRevenue = summary.totalRevenue || 0;
const totalRefund = summary.totalRefund || 0;

// PG = 1.6% + GST
const pgBase = totalRevenue * 0.016;
const pgGST = pgBase * 0.18;
const pgCharges = pgBase + pgGST;

const settlement = totalRevenue - totalRefund - pgCharges;

  return (
    <Box
      sx={{
        background: "#f5f7fa",
        minHeight: "100vh",
        p: 5,
        fontFamily: "Inter, system-ui"
      }}
    >
      {/* HEADER */}
      <Stack spacing={1} mb={4}>
        <Typography fontSize={26} fontWeight={700} color="#1f2937">
          Financial Analytics Console
        </Typography>
        <Typography fontSize={14} color="#6b7280">
          Consolidated revenue, taxation, distribution & settlement analysis
        </Typography>
      </Stack>

      {/* PERIOD SELECTOR */}
      <Stack direction="row" spacing={1} mb={2}>
        {PERIODS.map((p) => (
          <Button
            key={p.value}
            variant={period === p.value ? "contained" : "outlined"}
            onClick={() => setPeriod(p.value)}
            size="small"
          >
            {p.label}
          </Button>
        ))}
      </Stack>

{range && (
  <Box
    sx={{
      background: "#eef2f7",
      px: 3,
      py: 1.5,
      borderRadius: 2,
      mb: 4,
      display: "inline-block"
    }}
  >
    <Typography sx={{ fontSize: 13, color: "#374151" }}>
      Reporting Period:
      <strong> {range.label}</strong>
    </Typography>
  </Box>
)}


 {/* ================= FINANCIAL SUMMARY ================= */}

<Box sx={{ mb: 6 }}>

  {/* ================= COLLECTION ================= */}
  <SectionHeader title="Collection Overview" />

  <Grid container spacing={3} mb={2}>
    <Grid item xs={12} md={3}>
    <FinanceCard title="Total Revenue" value={money(totalRevenue)} />
    </Grid>

    <Grid item xs={12} md={3}>
    <FinanceCard title="Total Refunds" value={money(totalRefund)} negative />
    </Grid>

    <Grid item xs={12} md={3}>
    <FinanceCard title="PG Charges" value={money(pgCharges)} negative />
    </Grid>

    <Grid item xs={12} md={3}>
      <FinanceCard
        title="Discounts Given"
        value={money(summary.totalDiscount)}
        negative
      />
    </Grid>

    <Grid item xs={12} md={3}>
      <FinanceCard title="Settlement" value={money(settlement)} highlight />
    </Grid>
  </Grid>


  {/* ================= TAX ================= */}
  <SectionHeader title="Tax & Compliance" />

  <Grid container spacing={3} mb={2}>
    <Grid item xs={12} md={4}>
      <FinanceCard
        title="Taxable Revenue"
        value={money(summary.taxableRevenue)}
      />
    </Grid>

    <Grid item xs={12} md={4}>
      <FinanceCard
        title="GST Collected (18%)"
        value={money(summary.gstCollected)}
      />
    </Grid>

    <Grid item xs={12} md={4}>
      <FinanceCard
        title="Settlement (Taxable + GST)"
        value={money(summary.taxableRevenue + summary.gstCollected)}
        highlight
      />
    </Grid>
  </Grid>


  {/* ================= DISTRIBUTION ================= */}
  <SectionHeader title="Revenue Distribution" />

  <Grid container spacing={3}>
    <Grid item xs={12} md={4}>
    <FinanceCard title="Electricity Charges" value={money(summary.totalElectricity)} />
    </Grid>

    <Grid item xs={12} md={4}>
      <FinanceCard
        title="Owner Settlement"
        value={money(summary.totalOwnerPayout)}
      />
    </Grid>

    <Grid item xs={12} md={4}>
      <FinanceCard
        title="Platform Margin (Profit)"
        value={money(summary.totalMargin)}
        profit
      />
    </Grid>
  </Grid>

</Box>


      {/* ================= CHART ================= */}

      <Box sx={{ background: "#fff", p: 4, borderRadius: 2, mb: 4 }}>
        <Typography fontWeight={600} mb={3}>
          Revenue Trend
        </Typography>

        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="2 2" />
            <XAxis dataKey="createdAt" />
            <YAxis />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="totalAmount"
              stroke="#1f3c88"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </Box>

      {/* ================= BREAKDOWN TABS ================= */}

      <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab label="All Receipts" />
        <Tab label="By Device" />
        <Tab label="By Owner" />
        <Tab label="By User" />
      </Tabs>

      {/* ================= TABLE ================= */}

      <Box sx={{ background: "#fff", borderRadius: 2, p: 3 , overflowX: "auto" }}>
        <table
  style={{
    width: "100%",
    borderCollapse: "collapse",
    tableLayout: "fixed", // 🔥 VERY IMPORTANT
  }}
>
         <thead style={{ borderBottom: "2px solid #e5e7eb" }}>
  <tr>
    <th style={{ width: 160 }}>Date</th>
    <th style={{ width: 160 }}>Receipt ID</th>
    <th style={{ width: 100 }}>Device</th>
    <th style={{ width: 120 }}>User</th>
    <th style={{ width: 120 }} align="right">Amount</th>
    <th style={{ width: 100 }} align="right">Refund</th>
    <th style={{ width: 90 }} align="right">Energy</th>
    <th style={{ width: 90 }} align="right">GST</th>
    <th style={{ width: 110 }} align="right">PG</th>
    <th style={{ width: 110 }} align="right">VJRA</th>
    <th style={{ width: 120 }} align="right">Owner</th>
  </tr>
</thead>
          <tbody>
            {receipts.map((r) => (
              <tr
  key={r._id}
  style={{
    borderBottom: "1px solid #f1f1f1",
    cursor: "pointer"
  }}
  onMouseEnter={(e) => (e.currentTarget.style.background = "#f9fafb")}
  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
>
                <td  style={{ whiteSpace: "nowrap", padding: "8px 10px", fontSize: 13, fontFamily: "monospace"}}> {new Date(r.createdAt).toLocaleString()}</td>
                <td style={{ whiteSpace: "nowrap", padding: "8px 10px", fontSize: 13, fontFamily: "monospace"}}> {r.receiptId}</td>
                <td  style={{ whiteSpace: "nowrap", padding: "8px 10px", fontSize: 13, fontFamily: "monospace"}}> {r.deviceId}</td>
               <td style={{ whiteSpace: "nowrap", padding: "8px 10px", fontSize: 13, fontFamily: "monospace"}}> {r.userName || "-"}</td>

                <td align="right" style={{ whiteSpace: "nowrap", padding: "8px 10px", fontSize: 13, fontFamily: "monospace"}}> {money(r.amountPaid)}</td>
                <td align="right" style={{ whiteSpace: "nowrap", padding: "8px 10px", fontSize: 13, fontFamily: "monospace"}}> {money(r.refundAmount)}</td>

                <td align="right" style={{ whiteSpace: "nowrap", padding: "8px 10px", fontSize: 13, fontFamily: "monospace"}}> {r.energyConsumed?.toFixed(2)}</td>

                <td align="right" style={{ whiteSpace: "nowrap", padding: "8px 10px", fontSize: 13, fontFamily: "monospace"}}> {money(r.gstAmount)}</td>

                <td align="right" style={{ whiteSpace: "nowrap", padding: "8px 10px", fontSize: 13, fontFamily: "monospace"}}> 
                  {money((r.amountPaid || 0) * 0.016 * 1.18)}
                </td>

                <td
  align="right"
  style={{ whiteSpace: "nowrap", color: "#0f9d58" }}
>
                  {money(r.vjraMarginAmount)}
                </td>

                <td style={{ whiteSpace: "nowrap" }} align="right">{money(r.ownerPayout)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Box>
    </Box>
  );
}


function SectionHeader({ title }) {
  return (
    <Typography
      sx={{
        fontSize: 15,
        fontWeight: 700,
        color: "#1f2937",
        mb: 0.5
      }}
    >
      {title}
    </Typography>
  );
}

function FinanceCard({ title, value, negative, highlight, profit }) {
  return (
    <Box
      sx={{
        background: "#ffffff",
        borderRadius: 3,
        p: 2,
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between"
      }}
    >
      <Typography
        sx={{
          fontSize: 13,
          color: "#6b7280",
          mb: 0
        }}
      >
        {title}
      </Typography>

      <Typography
        sx={{
          fontSize: 22,
          fontWeight: 700,
          color: negative
            ? "#d93025"
            : profit
            ? "#0f9d58"
            : highlight
            ? "#04bfbf"
            : "#111827"
        }}
      >
        {negative ? `(${value})` : value}
      </Typography>
    </Box>
  );
}
