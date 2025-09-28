// components/PrivateRoute.js
import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";

/**
 * PrivateRoute (React Router v6)
 * - Supports two patterns:
 *   1) Wrapper with nested routes (preferred):
 *        <Route element={<PrivateRoute allowedRoles={['owner']} />}>
 *          <Route path="/owner" element={<OwnerDashboard />}>
 *            <Route index element={<MyDevices />} />
 *          </Route>
 *        </Route>
 *   2) Direct children (fallback):
 *        <PrivateRoute allowedRoles={['admin']}><AdminPage /></PrivateRoute>
 *
 * Props:
 * - allowedRoles: array of roles allowed to access (e.g., ['owner'])
 * - roles: alias for allowedRoles (either prop works)
 * - redirectTo: path for unauthenticated users (default '/login')
 * - unauthorizedTo: path for unauthorized users (default '/')
 */
const PrivateRoute = ({
  allowedRoles = [],
  roles,
  redirectTo = "/login",
  unauthorizedTo = "/",
  children,
}) => {
  const location = useLocation();

  // Read user from localStorage (as your app currently stores it)
  const rawUser = localStorage.getItem("user");
  let user = null;
  try {
    user = rawUser ? JSON.parse(rawUser) : null;
  } catch (err) {
    console.error("Error parsing user from localStorage:", err);
    localStorage.removeItem("user");
  }

  // Not authenticated: redirect to login and preserve intended route
  if (!user) {
    return <Navigate to={redirectTo} replace state={{ from: location }} />;
  }

  // Role authorization: support both 'roles' and 'allowedRoles'
  const allow = Array.isArray(roles) && roles.length ? roles : allowedRoles;
  if (allow.length > 0 && !allow.includes(user.role)) {
    return <Navigate to={unauthorizedTo} replace />;
  }

  // If used as a direct wrapper with children, render them
  if (children) return <>{children}</>;

  // If used in Routes with nested routes, render the Outlet
  return <Outlet />;
};

export default PrivateRoute;
