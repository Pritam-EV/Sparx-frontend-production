import React from "react";
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  Typography,
} from "@mui/material";

export const P3 = {
  page: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
    minWidth: 0,
  },
  panel: {
    p: { xs: 1.5, sm: 2.25 },
    border: "1px solid #e5eaf1",
    borderRadius: 3,
    bgcolor: "#ffffff",
    boxShadow: "0 2px 10px rgba(15, 23, 42, 0.025)",
  },
  field: {
    "& .MuiOutlinedInput-root": {
      borderRadius: 2,
      bgcolor: "#ffffff",
    },
    "& .MuiInputLabel-root": {
      fontSize: 13,
    },
    "& .MuiInputBase-input": {
      fontSize: 13,
    },
  },
  primaryButton: {
    borderRadius: 2,
    textTransform: "none",
    fontWeight: 750,
    px: 2.2,
    py: 1,
    bgcolor: "#0f766e",
    boxShadow: "none",
    "&:hover": {
      bgcolor: "#115e59",
      boxShadow: "none",
    },
  },
  secondaryButton: {
    borderRadius: 2,
    textTransform: "none",
    fontWeight: 700,
    borderColor: "#d8e0e9",
    color: "#334155",
    "&:hover": {
      borderColor: "#94a3b8",
      bgcolor: "#f8fafc",
    },
  },
};

export const P3_STATUS = [
  "group_a",
  "discovered",
  "group_b",
  "calibration_required",
  "calibrating",
  "calibration_failed",
  "production_ready",
  "dispatched",
  "retired",
];

export const labelize = (value) =>
  String(value || "unknown")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

export const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const formatRelative = (value) => {
  if (!value) return "Never seen";

  const seconds = Math.floor(
    (Date.now() - new Date(value).getTime()) / 1000
  );

  if (!Number.isFinite(seconds) || seconds < 0) return "Unknown";
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;

  return `${Math.floor(seconds / 86400)}d ago`;
};

export const unwrap = (response) =>
  response?.data?.data ?? null;

export const paginationOf = (response) =>
  response?.data?.pagination ?? {};

export const errorMessage = (error) =>
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  error?.message ||
  "Something went wrong. Please try again.";

export function P3Status({ value, size = "small" }) {
  const status = String(value || "").toLowerCase();

  let color = "default";
  let bg = "#f1f5f9";
  let fg = "#475569";

  if (
    [
      "acknowledged",
      "passed",
      "production_ready",
      "dispatched",
      "online",
      "completed",
    ].includes(status)
  ) {
    color = "success";
    bg = "#dcfce7";
    fg = "#166534";
  } else if (
    [
      "pending",
      "sent",
      "group_a",
      "discovered",
      "group_b",
      "calibration_required",
      "calibrating",
      "in_progress",
      "applying",
      "awaiting_verification",
    ].includes(status)
  ) {
    color = "warning";
    bg = "#fef3c7";
    fg = "#92400e";
  } else if (
    [
      "failed",
      "calibration_failed",
      "rejected",
      "cancelled",
      "offline",
    ].includes(status)
  ) {
    color = "error";
    bg = "#fee2e2";
    fg = "#991b1b";
  }

  return (
    <Chip
      size={size}
      color={color}
      label={labelize(value)}
      sx={{
        height: 25,
        borderRadius: 1.5,
        bgcolor: bg,
        color: fg,
        fontSize: 10.5,
        fontWeight: 800,
        "& .MuiChip-label": {
          px: 1,
        },
      }}
    />
  );
}

export function P3Metric({
  label,
  value,
  caption,
  icon,
  accent = "#0f766e",
  loading = false,
}) {
  return (
    <Paper
      elevation={0}
      sx={{
        ...P3.panel,
        height: "100%",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <Stack
        direction="row"
        alignItems="flex-start"
        justifyContent="space-between"
        spacing={1}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography
            sx={{
              fontSize: 11,
              color: "#64748b",
              fontWeight: 750,
            }}
          >
            {label}
          </Typography>

          <Typography
            sx={{
              mt: 1,
              color: "#0f172a",
              fontSize: {
                xs: 25,
                sm: 29,
              },
              lineHeight: 1.1,
              letterSpacing: "-0.8px",
              fontWeight: 900,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {loading ? "—" : value ?? 0}
          </Typography>

          {caption ? (
            <Typography
              sx={{
                mt: 0.8,
                fontSize: 10.5,
                color: "#94a3b8",
                fontWeight: 600,
              }}
            >
              {caption}
            </Typography>
          ) : null}
        </Box>

        <Box
          sx={{
            width: 39,
            height: 39,
            borderRadius: 2.25,
            display: "grid",
            placeItems: "center",
            color: accent,
            bgcolor: `${accent}14`,
            flexShrink: 0,
            "& svg": {
              fontSize: 21,
            },
          }}
        >
          {icon}
        </Box>
      </Stack>
    </Paper>
  );
}

export function P3SectionTitle({
  title,
  subtitle,
  action,
}) {
  return (
    <Stack
      direction={{
        xs: "column",
        sm: "row",
      }}
      alignItems={{
        xs: "stretch",
        sm: "center",
      }}
      justifyContent="space-between"
      spacing={1}
    >
      <Box>
        <Typography
          sx={{
            fontSize: 15,
            fontWeight: 850,
            color: "#172033",
          }}
        >
          {title}
        </Typography>

        {subtitle ? (
          <Typography
            sx={{
              mt: 0.35,
              color: "#94a3b8",
              fontSize: 11.5,
              lineHeight: 1.5,
            }}
          >
            {subtitle}
          </Typography>
        ) : null}
      </Box>

      {action}
    </Stack>
  );
}

export function P3Loading({ label = "Loading production data..." }) {
  return (
    <Paper
      elevation={0}
      sx={{
        ...P3.panel,
        py: 6,
        display: "flex",
        justifyContent: "center",
      }}
    >
      <Stack alignItems="center" spacing={1.5}>
        <CircularProgress
          size={27}
          sx={{ color: "#0f766e" }}
        />
        <Typography
          sx={{
            color: "#64748b",
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          {label}
        </Typography>
      </Stack>
    </Paper>
  );
}

export function P3Empty({
  title = "Nothing here yet",
  description = "Records will appear here when they are available.",
}) {
  return (
    <Box
      sx={{
        py: 5,
        px: 2,
        textAlign: "center",
      }}
    >
      <Typography
        sx={{
          fontSize: 13,
          color: "#475569",
          fontWeight: 800,
        }}
      >
        {title}
      </Typography>
      <Typography
        sx={{
          mt: 0.6,
          color: "#94a3b8",
          fontSize: 11.5,
        }}
      >
        {description}
      </Typography>
    </Box>
  );
}

export function P3Error({ error }) {
  if (!error) return null;

  return (
    <Alert
      severity="error"
      sx={{
        borderRadius: 2,
        fontSize: 12,
        alignItems: "center",
      }}
    >
      {error}
    </Alert>
  );
}