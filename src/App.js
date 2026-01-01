import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
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
import PaymentSuccess from "./components/PaymentSuccess";

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

import UserList from "./pages/users/UserList";
import UserCreate from "./pages/users/UserCreate";
import UserEdit from "./pages/users/UserEdit";

import DeviceList from "./pages/devices/DeviceList";
import DeviceCreate from "./pages/devices/DeviceCreate";
import DeviceEdit from "./pages/devices/DeviceEdit";

// AppContent component handles splash + auth + all routes.
const AppContent = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const initialUrlRef = useRef(null);
  const hasNavigatedRef = useRef(false);
  const firstLoadRef = useRef(true);

  // Get authentication status
  const isAuthenticated = !!localStorage.getItem("user");

    // 1) Capture initial URL exactly once
  useEffect(() => {
    initialUrlRef.current =
      window.location.pathname +
      window.location.search +
      window.location.hash;
    console.log("Initial URL:", initialUrlRef.current);
  }, []);

  // 2) Run splash timer once on mount
  useEffect(() => {
    if (!firstLoadRef.current) return;
    const timer = setTimeout(() => {
      setShowSplash(false);
      const target = initialUrlRef.current;

      // 3a) If it’s a deep link (not root/home/welcome/login/signup), go there
    const deepLink =
      target &&
      !["/", "/home", "/welcome", "/login", "/signup"].includes(target);

    // 🔐 Allow Cashfree redirect to bypass splash logic
    const isPaymentSuccess = target.startsWith("/payment-success");

    if (isPaymentSuccess) {
      console.log("Payment success deep link ->", target);
      navigate(target, { replace: true });
      firstLoadRef.current = false;
      return;
    }


      if (deepLink) {
        console.log("Deep link ->", target);
        navigate(target, { replace: true });
      } else {
        // 3b) Normal launch: auth → home, else → welcome
        if (isAuthenticated) {
          console.log("Authenticated → /home");
          navigate("/home", { replace: true });
        } else {
          console.log("Not authenticated → /welcome");
          navigate("/welcome", { replace: true });
        }
      }
      firstLoadRef.current = false;
    }, 2000);

    return () => clearTimeout(timer);
  }, [navigate, isAuthenticated]);

  if (showSplash) return <SplashScreen />;
  
  // Show main app
  return (
    <div className="app-container">
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="/home" element={<Home />} />
        <Route path="/welcome" element={<WelcomeScreen />} />

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
          <Route path="receipts" element={<ReceiptsOverview />} />
          <Route path="crud/users" element={<UserList />} />
          <Route path="crud/users/create" element={<UserCreate />} />
          <Route path="crud/users/edit/:id" element={<UserEdit />} />
          <Route path="crud/devices" element={<DeviceList />} />
          <Route path="crud/devices/create" element={<DeviceCreate />} />
          <Route path="crud/devices/edit/:id" element={<DeviceEdit />} />
        </Route>

        {/* Owner routes */}
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

        {/* Private routes */}
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
        <Route path="/qr-scanner" element={<QRScanner />} />
        
        {/* IMPORTANT: Deep link route for charging options */}
        <Route
          path="/charging-options/:device_id"
          element={<ChargingOptions />}
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
        <Route path="/devices/create" element={<DeviceCreate />} />
        <Route path="/payment-success" element={<PaymentSuccess />} />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </div>
  );
};

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
