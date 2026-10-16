// src/components/LandingHome.js
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AccountBalanceWalletRounded,
  AddRounded,
  ArrowForwardRounded,
  BoltRounded,
  CalendarMonthRounded,
  CheckCircleRounded,
  HistoryRounded,
  MapOutlined,
  QrCode2Rounded,
  ReceiptLongRounded,
} from "@mui/icons-material";

import { api } from "../api";
import { getAuthState } from "../utils/auth";
import FooterNav from "./FooterNav";
import AppHeader from "./AppHeader";
import "../styles/landingHome.css";

const money = (value) => {
  const amount = Number(value);

  if (!Number.isFinite(amount)) return "—";

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

const numberValue = (value, digits = 2) => {
  const number = Number(value);

  return Number.isFinite(number) ? number.toFixed(digits) : "—";
};

const dateValue = (value) => {
  if (!value) return "Date unavailable";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Date unavailable";

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};


const getGreeting = () => {
  const hour = new Date().getHours();

  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";

  return "Good evening";
};

const getFirstName = () => {
  const { user } = getAuthState();

  const fullName =
    user?.name ||
    user?.fullName ||
    user?.username ||
    user?.userName ||
    user?.displayName ||
    "there";

  return String(fullName).trim().split(/\s+/)[0] || "there";
};

const getStatusLabel = (status) => {
  const label = String(status || "Completed")
    .replace(/_/g, " ")
    .toLowerCase();

  return label.replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const getTransactionTitle = (transaction) => {
  if (transaction?.isRefundEntry) return "Refund transaction";

  if (
    transaction?.type === "wallet_topup" ||
    transaction?.walletTxnType === "topup"
  ) {
    return "Wallet top-up";
  }

  if (
    transaction?.walletTxnType === "refund"
  ) {
    return "Wallet refund";
  }

  if (
    transaction?.gateway === "wallet" ||
    transaction?.txnSource === "wallet_pay"
  ) {
    return "Wallet payment";
  }

  return "Charging payment";
};

const getTransactionMethod = (transaction) => {
  return (
    transaction?.paymentGroup ||
    transaction?.paymentMethod ||
    transaction?.gateway ||
    "Payment successful"
  );
};

const getTransactionAmount = (transaction) => {
  return transaction?.amountPaid ?? transaction?.amount ?? 0;
};

const getUserPhone = () => {
  const { user } = getAuthState();
  return user?.phone || user?.phoneNumber || user?.mobile || "";
};
  

const LandingHome = () => {
  const navigate = useNavigate();

  const firstName = getFirstName();
  const userPhone = getUserPhone();

  const [loading, setLoading] = useState(true);

  const [activeSession, setActiveSession] = useState(null);
  const [recentSession, setRecentSession] = useState(null);
  const [recentTransaction, setRecentTransaction] = useState(null);

  const [walletBalance, setWalletBalance] = useState(null);

  const [sessionsError, setSessionsError] = useState(false);
  const [transactionsError, setTransactionsError] = useState(false);
  const [walletError, setWalletError] = useState(false);

  // Fetch the compact dashboard summary from the backend.
  // Refresh on initial load, when the tab gains focus, and every 60 seconds.
  useEffect(() => {
    let cancelled = false;

    const loadDashboard = async () => {
      try {
        // One API request instead of fetching complete histories separately.
        const response = await api.get("/api/dashboard/summary");

        if (cancelled) return;

        const data = response.data || {};

        // ----------------------------
        // Active session
        // ----------------------------
        setActiveSession(data.activeSession || null);
        setSessionsError(false);

        // ----------------------------
        // Latest session
        // ----------------------------
        setRecentSession(data.lastSession || null);

        // ----------------------------
        // Last successful charging payment
        // ----------------------------
        setRecentTransaction(
          data.lastSuccessfulPayment || null
        );
        setTransactionsError(false);

        // ----------------------------
        // Wallet balance
        // ----------------------------
        const walletData = data.wallet || {};
        const balance = Number(walletData.balance);

        if (
          walletData.balance !== null &&
          walletData.balance !== undefined &&
          Number.isFinite(balance)
        ) {
          setWalletBalance(balance);
          setWalletError(false);
        } else {
          setWalletBalance(null);
          setWalletError(true);
        }
      } catch (error) {
        if (cancelled) return;

        console.error(
          "Failed to load dashboard summary:",
          error
        );

        // Clear stale dashboard data if the request fails.
        setActiveSession(null);
        setRecentSession(null);
        setRecentTransaction(null);
        setWalletBalance(null);

        setSessionsError(true);
        setTransactionsError(true);
        setWalletError(true);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    // Initial load
    loadDashboard();

    // Refresh every 60 seconds
    const intervalId = window.setInterval(
      loadDashboard,
      60000
    );

    // Refresh when the user returns to this browser tab.
    window.addEventListener("focus", loadDashboard);

    return () => {
      cancelled = true;

      window.clearInterval(intervalId);

      window.removeEventListener(
        "focus",
        loadDashboard
      );
    };
  }, []);


  const activeSessionId =
    activeSession?.sessionId || activeSession?._id;

  const recentSessionId =
    recentSession?.sessionId || recentSession?._id;

  const lastTransactionDate = recentTransaction
    ? recentTransaction.paidAt || recentTransaction.createdAt
    : null;

  const lastSessionDate = recentSession
    ? recentSession.endTime ||
      recentSession.startTime ||
      recentSession.createdAt
    : null;


  return (
    <div className="lh-page">
      <div className="lh-shell">

        {/* --------------------------------
            HEADER
        --------------------------------- */}
      <AppHeader />

        <main className="lh-main">

          {/* --------------------------------
              GREETING
          --------------------------------- */}
          <section className="lh-welcome-row" aria-label="Welcome and wallet">
            <div className="lh-greeting">
              <p className="lh-eyebrow">{getGreeting()},</p>

              <h1>
                {firstName} <span aria-hidden="true"></span>
              </h1>

              <p className="lh-subtitle">
                Ready for your next drive?
              </p>
            </div>

            <section className="lh-wallet-card" aria-label="Wallet balance">
              <div className="lh-wallet-icon">
                <AccountBalanceWalletRounded />
              </div>

              <div className="lh-wallet-copy">
                <p className="lh-small-label">WALLET BALANCE</p>

                <div className="lh-wallet-amount" aria-live="polite">
                  {loading && walletBalance === null
                    ? "Loading..."
                    : walletError
                      ? "Unavailable"
                      : money(walletBalance)}
                </div>
              </div>

              <button
                type="button"
                className="lh-wallet-add"
                onClick={() => navigate("/wallet/topup")}
                aria-label="Add money to wallet"
              >
                <AddRounded />
                <span>Add money</span>
              </button>
            </section>
          </section>

          {/* --------------------------------
              ADAPTIVE PRIMARY CARD
          --------------------------------- */}
          {loading ? (
            <section className="lh-primary-card lh-primary-loading">
              <div className="lh-skeleton lh-skeleton-short" />
              <div className="lh-skeleton lh-skeleton-title" />
              <div className="lh-skeleton lh-skeleton-line" />
              <div className="lh-skeleton lh-skeleton-button" />
            </section>
          ) : sessionsError ? (
            <section className="lh-primary-card lh-error-card">
              <div className="lh-primary-icon">
                <BoltRounded />
              </div>

              <p className="lh-primary-kicker">SESSION STATUS</p>

              <h2>Couldn't check your charging status</h2>

              <p>
                Your session data could not be loaded. Open Sessions to
                check your current activity.
              </p>

              <button
                type="button"
                className="lh-primary-button"
                onClick={() => navigate("/sessions")}
              >
                Open sessions
                <ArrowForwardRounded />
              </button>
            </section>
          ) : activeSession ? (
            <section className="lh-primary-card lh-active-card">
              <div className="lh-active-top">
                <div className="lh-live-badge">
                  <span className="lh-live-dot" />
                  Charging in progress
                </div>

                <div className="lh-primary-icon">
                  <BoltRounded />
                </div>
              </div>

              <p className="lh-primary-kicker">
                CURRENT CHARGING SESSION
              </p>

              <h2>Your vehicle is charging</h2>

              <p className="lh-session-device">
                Charger ID:{" "}
                <strong>{activeSession.deviceId || "—"}</strong>
              </p>

              <div className="lh-session-stats">
                <div className="lh-session-stat">
                  <span>Energy consumed</span>
                  <strong>
                    {numberValue(activeSession.energyConsumed)} kWh
                  </strong>
                </div>

                <div className="lh-session-stat">
                  <span>Amount utilized</span>
                  <strong>
                    {money(activeSession.amountUsed)}
                  </strong>
                </div>
              </div>

              <button
                type="button"
                className="lh-primary-button"
                onClick={() => {
                  if (activeSessionId) {
                    navigate(
                      `/live-session/${encodeURIComponent(
                        activeSessionId
                      )}`
                    );
                  } else {
                    navigate("/sessions");
                  }
                }}
              >
                View live session
                <ArrowForwardRounded />
              </button>

              <button
                type="button"
                className="lh-primary-secondary"
                onClick={() => navigate("/sessions")}
              >
                View all sessions
              </button>
            </section>
          ) : (
            <section className="lh-primary-card lh-start-card">
              <div className="lh-start-top">
                <div className="lh-primary-icon">
                  <BoltRounded />
                </div>

                <span className="lh-ready-badge">
                  <span className="lh-ready-dot" />
                  Ready when you are
                </span>
              </div>

              <div className="lh-start-copy">
                <h2>Good to go?</h2>
                <p>
                  Find a nearby VIZ charging point or scan its QR code to
                  start charging in just a few steps.
                </p>
              </div>

              <div className="lh-start-actions">
                <button
                  type="button"
                  className="lh-primary-button"
                  onClick={() => navigate("/qr-scanner")}
                >
                  <span className="lh-primary-button-content">
                    <QrCode2Rounded className="lh-qr-cta-icon" aria-hidden="true" />
                    <span>Scan QR code</span>
                  </span>
                </button>

                <button
                  type="button"
                  className="lh-map-button"
                  onClick={() => navigate("/home")}
                >
                  <MapOutlined />
                  Find a charger
                  <ArrowForwardRounded />
                </button>
              </div>
            </section>
          )}

          {/* --------------------------------
              RECENT ACTIVITY
          --------------------------------- */}
          <section className="lh-activity-section">
            <div className="lh-section-heading">
              <div>
                <p className="lh-eyebrow">YOUR ACCOUNT</p>
                <h2>Recent activity</h2>
                <p className="lh-section-description">
                  Your latest charging session and successful payment.
                </p>
              </div>
            </div>

            <div className="lh-activity-grid">

              {/* LAST SESSION */}
              <article className="lh-activity-panel">
                <div className="lh-panel-heading">
                  <div className="lh-panel-icon lh-panel-icon-teal">
                    <HistoryRounded />
                  </div>

                  <div className="lh-panel-title">
                    <h3>Last session</h3>
                    <p>Your recent charging activity</p>
                  </div>

                  <button
                    type="button"
                    className="lh-text-link"
                    onClick={() => navigate("/sessions")}
                  >
                    All
                  </button>
                </div>

                {loading ? (
                  <div className="lh-activity-loading">
                    <div className="lh-skeleton lh-skeleton-line" />
                    <div className="lh-skeleton lh-skeleton-line" />
                  </div>
                ) : sessionsError ? (
                  <div className="lh-empty-state">
                    <p>Session history unavailable.</p>
                    <button
                      type="button"
                      onClick={() => navigate("/sessions")}
                    >
                      Open sessions
                    </button>
                  </div>
                ) : recentSession ? (
                  <div className="lh-activity-content">
                    <div className="lh-activity-main">
                      <div>
                        <p className="lh-small-label">
                          CHARGER ID
                        </p>

                        <strong className="lh-activity-value">
                          {recentSession.deviceId || "—"}
                        </strong>
                      </div>

                      <span className="lh-status-pill">
                        {getStatusLabel(recentSession.status)}
                      </span>
                    </div>

                    <div className="lh-activity-detail">
                      <CalendarMonthRounded />
                      <span>{dateValue(lastSessionDate)}</span>
                    </div>

                    <div className="lh-activity-metrics">
                      <div>
                        <span>Energy</span>
                        <strong>
                          {numberValue(recentSession.energyConsumed)} kWh
                        </strong>
                      </div>

                      <div>
                        <span>Amount used</span>
                        <strong>
                          {money(recentSession.amountUsed)}
                        </strong>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="lh-panel-action"
                      onClick={() => {
                        if (recentSessionId) {
                          navigate("/session-summary", {
                            state: { sessionId: recentSessionId },
                          });
                        } else {
                          navigate("/sessions");
                        }
                      }}
                    >
                      View session details
                      <ArrowForwardRounded />
                    </button>
                  </div>
                ) : (
                  <div className="lh-empty-state">
                    <div className="lh-empty-icon">
                      <BoltRounded />
                    </div>

                    <p>No previous sessions yet.</p>

                    <span>
                      Your charging history will appear here.
                    </span>

                    <button
                      type="button"
                      onClick={() => navigate("/qr-scanner")}
                    >
                      Start your first session
                    </button>
                  </div>
                )}
              </article>

              {/* LAST SUCCESSFUL TRANSACTION */}
              <article className="lh-activity-panel">
                <div className="lh-panel-heading">
                  <div className="lh-panel-icon lh-panel-icon-violet">
                    <ReceiptLongRounded />
                  </div>

                  <div className="lh-panel-title">
                    <h3>Last successful payment</h3>
                    <p>Your most recent successful transaction</p>
                  </div>

                  <button
                    type="button"
                    className="lh-text-link"
                    onClick={() => navigate("/transactions")}
                  >
                    All
                  </button>
                </div>

                {loading ? (
                  <div className="lh-activity-loading">
                    <div className="lh-skeleton lh-skeleton-line" />
                    <div className="lh-skeleton lh-skeleton-line" />
                  </div>
                ) : transactionsError ? (
                  <div className="lh-empty-state">
                    <p>Transaction history unavailable.</p>
                    <button
                      type="button"
                      onClick={() => navigate("/transactions")}
                    >
                      Open transactions
                    </button>
                  </div>
                ) : recentTransaction ? (
                  <button
                    type="button"
                    className="lh-transaction-content"
                    onClick={() => navigate("/transactions")}
                  >
                    <div className="lh-transaction-top">
                      <div>
                        <p className="lh-small-label">TRANSACTION</p>
                        <strong className="lh-activity-value">
                          {getTransactionTitle(recentTransaction)}
                        </strong>
                      </div>

                      <div className="lh-transaction-amount">
                        {money(getTransactionAmount(recentTransaction))}
                      </div>
                    </div>

                    <div className="lh-activity-detail">
                      <CalendarMonthRounded />
                      <span>{dateValue(lastTransactionDate)}</span>
                    </div>

                    <div className="lh-payment-status">
                      <CheckCircleRounded />
                      <span>
                        Successful · {getTransactionMethod(recentTransaction)}
                      </span>
                    </div>

                    <div className="lh-transaction-footer">
                      View transaction history
                      <ArrowForwardRounded />
                    </div>
                  </button>
                ) : (
                  <div className="lh-empty-state">
                    <div className="lh-empty-icon">
                      <ReceiptLongRounded />
                    </div>

                    <p>No successful payments yet.</p>

                    <span>
                      Successful payments will appear here.
                    </span>

                    <button
                      type="button"
                      onClick={() => navigate("/transactions")}
                    >
                      View transactions
                    </button>
                  </div>
                )}
              </article>
            </div>
          </section>

        </main>
      </div>


      {/* Use the existing shared footer, with light styling on this page only. */}
      <FooterNav homePath="/landing-home" variant="light" />
    </div>
  );
};

export default LandingHome;