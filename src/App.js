import React, { useEffect, useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";

import SplashScreen from "./components/SplashScreen";
import WelcomeScreen from "./components/WelcomeScreen";
import Login from "./components/Login";
import SignUp from "./components/SignUp";
import Home from "./components/Home";
import Profile from "./components/Profile";
import SessionPage from "./components/SessionPage";
import ChargingOptions from "./components/ChargingOptions";
import PrivateRoute from "./components/PrivateRoute";
import QRScanner from "./components/QRScanner";
import SessionSummary from "./components/SessionSummary";
import SessionStart from "./components/SessionStart";
import LiveSession from "./components/LiveSession";

import AdminAnalytics from "./features/admin/AdminAnalytics";
import AdminDashboard from "./features/admin/AdminDashboard";
import DevicesOverview from "./features/admin/DevicesOverview";
import UsersManagement from "./features/admin/UsersManagement";
import SessionsOverview from "./features/admin/SessionsOverview";
import Analytics from "./features/admin/Analytics";
import ReceiptsOverview from "./features/admin/ReceiptsOverview.js";
import OwnerDashboard from "./features/owner/OwnerDashboard";
import MyDevices from "./features/owner/MyDevices";
import OwnerAnalytics from "./features/owner/OwnerAnalytics";

// If you want to *only* use Refine features in AdminDashboard,
// then Refine should be integrated inside AdminDashboard, not here.

// Or if you want to *not* use Refine, just remove the import and usage from App.

import UserList from "./pages/users/UserList";
import UserCreate from "./pages/users/UserCreate";
import UserEdit from "./pages/users/UserEdit";

import DeviceList from "./pages/devices/DeviceList";
import DeviceCreate from "./pages/devices/DeviceCreate";
import DeviceEdit from "./pages/devices/DeviceEdit";

// AppContent component handles splash + auth + all routes.
const AppContent = () => {
  const [showSplash, setShowSplash] = useState(
    () => !sessionStorage.getItem("splashShown")
  );
  const location = useLocation();
  const isAuthenticated = !!localStorage.getItem("user");

  useEffect(() => {
    if (showSplash) {
      const timeout = setTimeout(() => {
        setShowSplash(false);
        sessionStorage.setItem("splashShown", "true"); // Prevent splash next time
      }, 2000);
      return () => clearTimeout(timeout);
    }
  }, [showSplash]);

  useEffect(() => {
    sessionStorage.setItem("lastPage", location.pathname);
  }, [location]);

  if (showSplash) return <SplashScreen />;

  return (
    <div className="app-container">
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<WelcomeScreen />} />
        <Route path="/home" element={<Home />} />

        {/* Admin protected routes */}
        <Route
          path="/admin"
          element={
            <PrivateRoute allowedRoles={["admin"]}>
              <AdminDashboard />
            </PrivateRoute>
          }
        >
          <Route index element={<Navigate to="devices" replace />} />
          <Route path="analytics" element={<AdminAnalytics />} />
          <Route path="devices" element={<DevicesOverview />} />
          <Route path="users" element={<UsersManagement />} />
          <Route path="sessions" element={<SessionsOverview />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="/admin/receipts" element={<ReceiptsOverview />} />
          {/* Below are Refine CRUD routes if you want */}
          <Route path="crud/users" element={<UserList />} />
          <Route path="crud/users/create" element={<UserCreate />} />
          <Route path="crud/users/edit/:id" element={<UserEdit />} />
          <Route path="crud/devices" element={<DeviceList />} />
          <Route path="crud/devices/create" element={<DeviceCreate />} />
          <Route path="crud/devices/edit/:id" element={<DeviceEdit />} />
        </Route>

        {/* Owner and admin */}
        {/* Owner routes: redirect /owner to MyDevices by default */}
        <Route element={<PrivateRoute allowedRoles={['owner']} />}>
          <Route path="/owner" element={<OwnerDashboard />}>
            <Route index element={<MyDevices />} />
            <Route path="devices" element={<MyDevices />} />
            <Route path="analytics" element={<OwnerAnalytics />} />
          </Route>
        </Route>


        {/* Authentication routes */}
        <Route
          path="/login"
          element={
            isAuthenticated ? <Navigate to="/home" replace /> : <Login />
          }
        />
        <Route
          path="/signup"
          element={
            isAuthenticated ? <Navigate to="/home" replace /> : <SignUp />
          }
        />

        {/* Private routes - require login */}
        <Route
          path="/profile"
          element={
            <PrivateRoute>
              <Profile />
            </PrivateRoute>
          }
        />
        <Route
          path="/sessions"
          element={
            <PrivateRoute>
              <SessionPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/qr-scanner"
          element={
            <PrivateRoute>
              <QRScanner />
            </PrivateRoute>
          }
        />
        <Route
          path="/charging-options/:device_id"
          element={
            <PrivateRoute>
              <ChargingOptions />
            </PrivateRoute>
          }
        />
        <Route path="/session-summary" element={<SessionSummary />} />
        <Route
          path="/session-start/:transactionId"
          element={
            <PrivateRoute>
              <SessionStart />
            </PrivateRoute>
          }
        />
        <Route
          path="/live-session/:sessionId"
          element={
            <PrivateRoute>
              <LiveSession />
            </PrivateRoute>
          }
        />
        <Route
          path="/session-start/:deviceId/:transactionId"
          element={
            <PrivateRoute>
              <SessionStart />
            </PrivateRoute>
          }
        />
        <Route 
           path="/devices/create" 
           element={
              <DeviceCreate />
          } 
        />
        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
};

function App() {
  return (
    <BrowserRouter>
      {/* Integrate AppContent with routing */}
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
