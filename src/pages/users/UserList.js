// src/pages/users/UserList.js
import React, { useState, useEffect } from 'react';
import { DataGrid } from '@mui/x-data-grid';
import { Button, Box, Typography } from '@mui/material';
import { useNavigate } from "react-router-dom";
import { api } from "../../api";

const UserList = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => { fetchUsers(); }, []);

const fetchUsers = async () => {
  try {
    const response = await api.get("/api/users");
    const data = response.data;

    setUsers(
      Array.isArray(data)
        ? data.map((user) => ({
            ...user,
            id: user._id,
          }))
        : []
    );
  } catch (error) {
    console.error(
      "Error fetching users:",
      error.response?.data || error.message
    );
  } finally {
    setLoading(false);
  }
};

  const columns = [
    { field: 'id', headerName: 'ID', width: 100 },
    { field: 'name', headerName: 'Name', width: 150 },
    { field: 'email', headerName: 'Email', width: 200 },
    { field: 'role', headerName: 'Role', width: 130 },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 180,
      renderCell: (params) => (
        <Box>
          <Button size="small" onClick={() => navigate(`/users/create?id=${params.row.id}`)} sx={{ mr: 1 }}>Edit</Button>
          <Button size="small" color="error">Delete</Button>
        </Box>
      ),
    },
  ];

  return (
    <Box sx={{ height: 550, width: '100%', mt: 5 }}>
      <Typography variant="h4" sx={{ mb: 2 }}>Users</Typography>
      <Button variant="contained" sx={{ mb: 2 }} onClick={() => navigate("/users/create")}>Add User</Button>
      <DataGrid
        rows={users}
        columns={columns}
        pageSize={8}
        loading={loading}
        rowsPerPageOptions={[8]}
        disableSelectionOnClick
      />
    </Box>
  );
};

export default UserList;
