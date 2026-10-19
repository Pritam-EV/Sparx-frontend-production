import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
} from "react";

import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";

import LandingHome from "./components/LandingHome";

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
import TransactionHistory from "./components/TransactionHistory";
import WalletTopupSuccess from "./components/WalletTopupSuccess";
import WalletTopup from "./components/WalletTopup";

import { usePageTracking } from "./hooks/usePageTracking";

import AdminAnalytics from "./features/admin/AdminAnalytics";
import AdminDashboard from "./features/admin/AdminDashboard";
import DevicesOverview from "./features/admin/DevicesOverview";
import LiveMonitoring from "./features/admin/LiveMonitoring";
import UsersManagement from "./features/admin/UsersManagement";
import SessionsOverview from "./features/admin/SessionsOverview";
import Analytics from "./features/admin/Analytics";
import EBManagement from "./features/admin/EBManagement";
import ReceiptsOverview from "./features/admin/ReceiptsOverview.js";
import UserActivity from "./features/admin/UserActivity";
import TransactionsOverview from "./features/admin/TransactionsOverview";
import Production from "./features/admin/Production";
import AdminStartSession from "./features/admin/AdminStartSession";
import AdminOwnerFinance from "./features/admin/AdminOwnerFinance";

import AccountantDashboard from "./features/accountant/AccountantDashboard";

import OwnerDashboard from "./features/owner/OwnerDashboard";
import OwnerOverview from "./features/owner/OwnerOverview";
import MyDevices from "./features/owner/MyDevices";
import OwnerAnalytics from "./features/owner/OwnerAnalytics";
import LiveCharging from "./features/owner/LiveCharging";
import PastSessions from "./features/owner/PastSessions";
import OwnerReports from "./features/owner/OwnerReports";
import OwnerSessions from "./features/owner/OwnerSessions";
import OwnerFinance from "./features/owner/OwnerFinance";

import UserList from "./pages/users/UserList";
import UserCreate from "./pages/users/UserCreate";
import UserEdit from "./pages/users/UserEdit";

import DeviceList from "./pages/devices/DeviceList";
import DeviceCreate from "./pages/devices/DeviceCreate";
import DeviceEdit from "./pages/devices/DeviceEdit";

import DeviceOnboarding from "./components/DeviceOnboarding";

import { api } from "./api";
import { getAuthState } from "./utils/auth";

// AppContent component handles splash, authentication and routes.
const AppContent = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  const initialUrlRef = useRef(null);
  const hasNavigatedRef = useRef(false);
  const firstLoadRef = useRef(true);

  const { isAuthenticated } = getAuthState();

  // Capture the initial URL exactly once.
  useEffect(() => {
    initialUrlRef.current =
      window.location.pathname +
      window.location.search +
      window.location.hash;
  }, []);

  // Splash screen and initial navigation.
  useEffect(() => {
    if (!firstLoadRef.current) return undefined;

    const timer = setTimeout(() => {
      setShowSplash(false);

      const target = initialUrlRef.current;

      // Keep payment return/deep links working.
      const isPaymentSuccess =
        target?.startsWith("/payment-success");

      const isWalletReturn =
        target?.startsWith("/wallet/topup-success");

      if (isPaymentSuccess || isWalletReturn) {
        navigate(target, { replace: true });
        firstLoadRef.current = false;
        return;
      }

      const deepLink =
        target &&
        ![
          "/",
          "/landing-home",
          "/home",
          "/welcome",
          "/login",
          "/signup",
        ].includes(target);

      if (deepLink) {
        navigate(target, { replace: true });
      } else if (isAuthenticated) {
        navigate("/landing-home", { replace: true });
      } else {
        navigate("/home", { replace: true });
      }

      firstLoadRef.current = false;
    }, 2000);

    return () => clearTimeout(timer);
  }, [navigate, isAuthenticated]);

  // Backend ping to help detect cold starts.
  useEffect(() => {
    const pingBackend = async () => {
      try {
        await api.get("/ping");
      } catch (error) {
        console.warn(
          "Backend ping failed (possibly a cold start):",
          error.message
        );
      }
    };

    pingBackend();

    const intervalId = setInterval(
      pingBackend,
      10 * 60 * 1000
    );

    return () => clearInterval(intervalId);
  }, []);

  usePageTracking();

  if (showSplash) {
    return <SplashScreen />;
  }

  return (
    <div className="app-container">
      <Routes>
        {/* Public routes */}
        <Route
          path="/"
          element={<Navigate to="/landing-home" replace />}
        />

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
          <Route
            index
            element={<Navigate to="devices" replace />}
          />

          <Route path="analytics" element={<AdminAnalytics />} />
          <Route path="devices" element={<DevicesOverview />} />
          <Route
            path="LiveMonitoring"
            element={<LiveMonitoring />}
          />
          <Route path="users" element={<UsersManagement />} />
          <Route path="sessions" element={<SessionsOverview />} />
          <Route path="receipts" element={<ReceiptsOverview />} />
          <Route
            path="eb-management"
            element={<EBManagement />}
          />
          <Route path="owner-finance" element={<AdminOwnerFinance />} />
          <Route path="crud/users" element={<UserList />} />
          <Route
            path="crud/users/create"
            element={<UserCreate />}
          />
          <Route
            path="crud/users/edit/:id"
            element={<UserEdit />}
          />

          <Route path="crud/devices" element={<DeviceList />} />
          <Route
            path="crud/devices/create"
            element={<DeviceCreate />}
          />
          <Route
            path="crud/devices/edit/:id"
            element={<DeviceEdit />}
          />

          <Route
            path="user-activity"
            element={<UserActivity />}
          />
          <Route
            path="transactions"
            element={<TransactionsOverview />}
          />
          <Route path="Production" element={<Production />} />
          <Route
            path="start-session"
            element={<AdminStartSession />}
          />
        </Route>

        {/* Accountant protected route */}
        <Route
          path="/ca"
          element={
            <PrivateRoute allowedRoles={["admin", "accountant"]}>
              <AccountantDashboard />
            </PrivateRoute>
          }
        />

        {/* Owner protected routes */}
        <Route
          element={<PrivateRoute allowedRoles={["owner"]} />}
        >
          <Route path="/owner" element={<OwnerDashboard />}>
            <Route index element={<OwnerOverview />} />

            <Route
              path="devices"
              element={<MyDevices />}
            />

            <Route
              path="analytics"
              element={<OwnerAnalytics />}
            />

            <Route
              path="reports"
              element={<OwnerReports />}
            />

            <Route
              path="live-charging"
              element={<LiveCharging />}
            />

            <Route
              path="past-sessions"
              element={<PastSessions />}
            />
            <Route
            path="sessions"
            element={<OwnerSessions />}
          />

          <Route
            path="finance"
            element={<OwnerFinance />}
          />

          </Route>
        </Route>

        {/* Authentication routes */}
        <Route
          path="/login"
          element={
            isAuthenticated
              ? <Navigate to="/landing-home" replace />
              : <Login />
          }
        />

        <Route
          path="/signup"
          element={
            isAuthenticated
              ? <Navigate to="/landing-home" replace />
              : <SignUp />
          }
        />

        {/* Private customer routes */}
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

        {/* Landing home */}
        <Route
          path="/landing-home"
          element={
            isAuthenticated
              ? <LandingHome />
              : <Navigate to="/home" replace />
          }
        />

        <Route
          path="/transactions"
          element={
            <PrivateRoute>
              <TransactionHistory />
            </PrivateRoute>
          }
        />

        <Route path="/qr-scanner" element={<QRScanner />} />

        {/* Charging routes */}
        <Route
          path="/charging-options/:device_id"
          element={<ChargingOptions />}
        />

        <Route
          path="/session-summary"
          element={<SessionSummary />}
        />

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
          element={<DeviceCreate />}
        />

        <Route
          path="/payment-success"
          element={<PaymentSuccess />}
        />

        <Route
          path="/wallet/topup-success"
          element={
            <PrivateRoute>
              <WalletTopupSuccess />
            </PrivateRoute>
          }
        />

        <Route
          path="/wallet/topup"
          element={
            <PrivateRoute>
              <WalletTopup />
            </PrivateRoute>
          }
        />

        {/* Charger onboarding remains enabled */}
        <Route
          path="/onboard-device"
          element={<DeviceOnboarding />}
        />

        {/* Catch-all */}
        <Route
          path="*"
          element={<Navigate to="/home" replace />}
        />
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