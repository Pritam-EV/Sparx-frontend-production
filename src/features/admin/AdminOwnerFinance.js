// src/features/admin/AdminOwnerFinance.js
// Lets an admin select an owner, then renders the same OwnerFinance component.

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Alert,
  Autocomplete,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import AccountBalanceWalletOutlinedIcon from "@mui/icons-material/AccountBalanceWalletOutlined";
import OwnerFinance from "../owner/OwnerFinance";
import { apiFetch } from "../../utils/apiFetch";

export default function AdminOwnerFinance() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedOwnerId = searchParams.get("ownerId") || "";

  const [owners, setOwners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedOption, setSelectedOption] = useState(null);

  const loadOwners = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const result = await apiFetch("/api/users");
      const ownerUsers = (Array.isArray(result) ? result : [])
        .filter((user) => user?.role === "owner")
        .sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
      setOwners(ownerUsers);
    } catch (err) {
      setError(err?.message || "Could not load owner accounts.");
      setOwners([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOwners();
  }, [loadOwners]);

  const selectedOwner = useMemo(
    () => owners.find((owner) => String(owner._id) === requestedOwnerId) || null,
    [owners, requestedOwnerId]
  );

  const handleSelectOwner = (_event, owner) => {
    setSelectedOption(owner || null);
  };

  const handleChangeOwner = () => {
    setSelectedOption(null);
    setSearchParams({});
  };

  // The admin view delegates the actual finance UI and display calculations to
  // the owner page component; only the endpoint and owner context differ.
  if (selectedOwner) {
    return (
      <OwnerFinance
        key={selectedOwner._id}
        adminMode
        ownerId={String(selectedOwner._id)}
        ownerName={selectedOwner.name || "Owner"}
        onChangeOwner={handleChangeOwner}
      />
    );
  }

  return (
    <Box
      sx={{
        maxWidth: 980,
        mx: "auto",
        px: { xs: 1, sm: 2, md: 3 },
        py: { xs: 2, sm: 4 },
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      <Card
        elevation={0}
        sx={{
          borderRadius: 4,
          border: "1px solid #d8e8e7",
          overflow: "hidden",
          background: "linear-gradient(135deg, #ffffff 0%, #f2fbfa 100%)",
        }}
      >
        <Box
          sx={{
            p: { xs: 2.5, sm: 3.5 },
            color: "#fff",
            background: "linear-gradient(135deg, #072227 0%, #0d3840 60%, #09272c 100%)",
            display: "flex",
            alignItems: "center",
            gap: 2,
          }}
        >
          <Avatar
            variant="rounded"
            sx={{ width: 52, height: 52, bgcolor: "#00bfa7", color: "#062b2c" }}
          >
            <AccountBalanceWalletOutlinedIcon fontSize="large" />
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: { xs: 20, sm: 25 }, fontWeight: 800, lineHeight: 1.2 }}>
              Owner Finance &amp; Settlement
            </Typography>
            <Typography sx={{ mt: 0.6, color: "#a8cccf", fontSize: 13 }}>
              Select an owner account to view the same monthly finance page available to that owner.
            </Typography>
          </Box>
        </Box>

        <CardContent sx={{ p: { xs: 2.5, sm: 3.5 } }}>
          <Stack spacing={2.5}>
            {error && <Alert severity="error">{error}</Alert>}
            {requestedOwnerId && !loading && !selectedOwner && (
              <Alert severity="warning">
                That owner ID was not found in the current owner list. Select a valid owner below.
              </Alert>
            )}

            <Typography sx={{ color: "#334155", fontWeight: 700, fontSize: 14 }}>
              Select owner by name or owner ID
            </Typography>

            <Autocomplete
              options={owners}
              value={selectedOption}
              loading={loading}
              onChange={handleSelectOwner}
              getOptionLabel={(owner) =>
                `${owner?.name || "Unnamed owner"} · ${owner?._id || "No ID"}`
              }
              isOptionEqualToValue={(option, value) => String(option._id) === String(value._id)}
              filterOptions={(options, state) => {
                const query = state.inputValue.trim().toLowerCase();
                if (!query) return options;
                return options.filter((owner) =>
                  [owner.name, owner.email, owner.mobile, owner._id]
                    .some((value) => String(value || "").toLowerCase().includes(query))
                );
              }}
              noOptionsText={loading ? "Loading owners…" : "No owner accounts found"}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Owner account"
                  placeholder="Search name, email, mobile or ID"
                  helperText={`${owners.length} owner account${owners.length === 1 ? "" : "s"} available`}
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {loading ? <CircularProgress color="inherit" size={18} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
              renderOption={(props, owner) => (
                <Box component="li" {...props} key={owner._id} sx={{ py: 1.2 }}>
                  <Avatar sx={{ mr: 1.5, width: 34, height: 34, bgcolor: "#d9f5f0", color: "#00776b", fontSize: 13 }}>
                    {String(owner.name || "O").trim().slice(0, 1).toUpperCase()}
                  </Avatar>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 700, fontSize: 13 }}>
                      {owner.name || "Unnamed owner"}
                    </Typography>
                    <Typography sx={{ color: "#64748b", fontSize: 11.5, overflowWrap: "anywhere" }}>
                      ID: {owner._id}{owner.mobile ? ` · ${owner.mobile}` : ""}
                    </Typography>
                  </Box>
                </Box>
              )}
            />

            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
              <Button
                variant="contained"
                disableElevation
                disabled={loading || !selectedOption}
                onClick={() => selectedOption?._id && setSearchParams({ ownerId: String(selectedOption._id) })}
                sx={{
                  py: 1.2,
                  px: 3,
                  borderRadius: 2.5,
                  textTransform: "none",
                  fontWeight: 800,
                  background: "linear-gradient(135deg, #00bfa7, #008a7c)",
                  "&:hover": { background: "linear-gradient(135deg, #00a991, #006f65)" },
                }}
              >
                Open Finance &amp; Settlement
              </Button>
              <Button
                variant="outlined"
                startIcon={loading ? <CircularProgress size={16} /> : <RefreshRoundedIcon />}
                onClick={loadOwners}
                disabled={loading}
                sx={{ py: 1.2, px: 2.5, borderRadius: 2.5, textTransform: "none", fontWeight: 700 }}
              >
                Refresh owners
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
