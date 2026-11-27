
import React, { useState } from "react";
import {
  Box,
  Paper,
  Tabs,
  Tab,
  Typography,
  Stack,
  Divider,
} from "@mui/material";

import MemoryIcon from "@mui/icons-material/Memory";
import StorageIcon from "@mui/icons-material/Storage";

import DeviceSelector from "./DeviceSelector";
import FirmwareMaintenance from "./FirmwareMaintenance";
import DatabaseMaintenance from "./DatabaseMaintenance";
import CommandHistory from "./CommandHistory";

export default function DeviceMaintenance() {
  const [tab, setTab] = useState(0);
  const [device, setDevice] = useState(null);
  const [revision, setRevision] = useState(0);

  const refresh = () => setRevision(v => v + 1);

  return (
    <Box sx={{ p: { xs: 1, md: 3 }, maxWidth: 1500, mx: "auto" }}>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h4" fontWeight={700}>
            Maintenance of Devices
          </Typography>
          <Typography color="text.secondary">
            Firmware configuration, device controls and database maintenance
          </Typography>
        </Box>

        <DeviceSelector
          value={device}
          onChange={setDevice}
          revision={revision}
        />

        <Paper variant="outlined" sx={{ borderRadius: 3 }}>
          <Tabs
            value={tab}
            onChange={(_, value) => setTab(value)}
            variant="fullWidth"
          >
            <Tab
              icon={<MemoryIcon />}
              iconPosition="start"
              label="Firmware Maintenance"
            />
            <Tab
              icon={<StorageIcon />}
              iconPosition="start"
              label="Database Maintenance"
            />
          </Tabs>

          <Divider />

          <Box sx={{ p: { xs: 2, md: 3 } }}>
            {!device ? (
              <Typography color="text.secondary">
                Select a device to continue.
              </Typography>
            ) : tab === 0 ? (
              <FirmwareMaintenance
                device={device}
                onUpdated={refresh}
              />
            ) : (
              <DatabaseMaintenance
                device={device}
                onUpdated={refresh}
              />
            )}
          </Box>
        </Paper>

        {device && (
          <CommandHistory
            device={device}
            revision={revision}
          />
        )}
      </Stack>
    </Box>
  );
}
