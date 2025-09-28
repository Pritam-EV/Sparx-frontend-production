// src/pages/devices/DeviceList.js
import React, { useState, useEffect } from 'react';
import { DataGrid } from '@mui/x-data-grid';
import { Button, Box, Typography } from '@mui/material';
import { useNavigate } from "react-router-dom";

const DeviceList = () => {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => { fetchDevices(); }, []);

  const fetchDevices = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_Backend_API_Base_URL}/api/devices`);
      const data = await response.json();
      setDevices(data.map(d => ({ ...d, id: d.id || d._id })));
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { field: 'id', headerName: 'ID', width: 120 },
    { field: 'name', headerName: 'Device Name', width: 170 },
    { field: 'serialNumber', headerName: 'Serial Number', width: 180 },
    { field: 'status', headerName: 'Status', width: 130 },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 180,
      renderCell: (params) => (
        <Box>
          <Button size="small" onClick={() => navigate(`/devices/create?id=${params.row.id}`)} sx={{ mr: 1 }}>Edit</Button>
          <Button size="small" color="error">Delete</Button>
        </Box>
      ),
    },
  ];

  return (
    <Box sx={{ height: 550, width: '100%', mt: 5 }}>
      <Typography variant="h4" sx={{ mb: 2 }}>Devices</Typography>
      <Button variant="contained" sx={{ mb: 2 }} onClick={() => navigate("/devices/create")}>Add Device</Button>
      <DataGrid
        rows={devices}
        columns={columns}
        pageSize={8}
        loading={loading}
        rowsPerPageOptions={[8]}
        disableSelectionOnClick
      />
    </Box>
  );
};
export default DeviceList;
