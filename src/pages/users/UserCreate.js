// src/pages/users/UserCreate.js
import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Box, Card, CardContent, TextField, Button, MenuItem, Typography } from '@mui/material';
import { useNavigate } from "react-router-dom";

const roles = [
  { label: 'Customer', value: 'customer' },
  { label: 'Owner', value: 'owner' },
  { label: 'Admin', value: 'admin' },
];

const UserCreate = () => {
  const { control, handleSubmit, formState: { errors } } = useForm();
  const navigate = useNavigate();

  const onSubmit = async (data) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_Backend_API_Base_URL}/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (response.ok) {
        navigate('/users');
      }
    } catch (error) {
      alert('Failed to create user!');
    }
  };

  return (
    <Box sx={{ maxWidth: 500, mx: "auto", mt: 5 }}>
      <Card>
        <CardContent>
          <Typography variant="h5" sx={{ mb: 3 }}>Create New User</Typography>
          <form onSubmit={handleSubmit(onSubmit)}>
            <Controller
              name="name"
              control={control}
              defaultValue=""
              rules={{ required: "Name required" }}
              render={({ field }) => <TextField {...field} label="Full Name" fullWidth sx={{ mb: 2 }} error={!!errors.name} helperText={errors.name?.message} />}
            />
            <Controller
              name="email"
              control={control}
              defaultValue=""
              rules={{ required: "Email required" }}
              render={({ field }) => <TextField {...field} label="Email" type="email" fullWidth sx={{ mb: 2 }} error={!!errors.email} helperText={errors.email?.message} />}
            />
            <Controller
              name="mobile"
              control={control}
              defaultValue=""
              render={({ field }) => <TextField {...field} label="Mobile" fullWidth sx={{ mb: 2 }} />}
            />
            <Controller
              name="role"
              control={control}
              defaultValue="customer"
              render={({ field }) => (
                <TextField {...field} select fullWidth label="Role" sx={{ mb: 2 }}>
                  {roles.map(opt => (
                    <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                  ))}
                </TextField>
              )}
            />
            <Button type="submit" variant="contained" fullWidth>Create User</Button>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
};

export default UserCreate;
