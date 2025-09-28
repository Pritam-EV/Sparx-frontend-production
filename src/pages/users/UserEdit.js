import React, { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Box, Card, CardContent, TextField, Button, MenuItem, Typography } from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';

const roleOptions = [
  { label: 'Customer', value: 'customer' },
  { label: 'Owner', value: 'owner' },
  { label: 'Admin', value: 'admin' },
];

const UserEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const { control, handleSubmit, setValue, formState: { errors } } = useForm();

  useEffect(() => {
    // Fetch user data and populate form
    const fetchUser = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_Backend_API_Base_URL}/api/users/${id}`);
        if (response.ok) {
          const data = await response.json();
          setValue('name', data.name || '');
          setValue('email', data.email || '');
          setValue('mobile', data.mobile || '');
          setValue('role', data.role || 'customer');
        } else {
          alert('Failed to fetch user data');
          navigate('/users');
        }
      } catch (error) {
        console.error('Error loading user:', error);
        alert('Error loading user data');
        navigate('/users');
      }
    };

    fetchUser();
  }, [id, navigate, setValue]);

  const onSubmit = async (formData) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_Backend_API_Base_URL}/api/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        alert('User updated successfully');
        navigate('/users');
      } else {
        alert('Failed to update user');
      }
    } catch (error) {
      console.error('Error updating user:', error);
      alert('Error updating user');
    }
  };

  return (
    <Box sx={{ maxWidth: 500, mx: 'auto', mt: 5 }}>
      <Card>
        <CardContent>
          <Typography variant="h5" sx={{ mb: 3 }}>Edit User</Typography>
          <form onSubmit={handleSubmit(onSubmit)}>
            <Controller
              name="name"
              control={control}
              rules={{ required: 'Name is required' }}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Full Name"
                  fullWidth
                  sx={{ mb: 2 }}
                  error={!!errors.name}
                  helperText={errors.name?.message}
                />
              )}
            />
            <Controller
              name="email"
              control={control}
              rules={{
                required: 'Email is required',
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/i,
                  message: 'Invalid email address',
                },
              }}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Email"
                  type="email"
                  fullWidth
                  sx={{ mb: 2 }}
                  error={!!errors.email}
                  helperText={errors.email?.message}
                />
              )}
            />
            <Controller
              name="mobile"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Mobile Number"
                  fullWidth
                  sx={{ mb: 2 }}
                />
              )}
            />
            <Controller
              name="role"
              control={control}
              defaultValue="customer"
              render={({ field }) => (
                <TextField {...field} select fullWidth label="Role" sx={{ mb: 2 }}>
                  {roleOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
            <Button type="submit" variant="contained" fullWidth>
              Update User
            </Button>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
};

export default UserEdit;
