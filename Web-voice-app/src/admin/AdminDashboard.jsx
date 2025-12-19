import "./AdminDashboard.css";
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import {
  FaUsers,
  FaMicrophone,
  FaPercentage,
  FaExclamationTriangle,
  FaUserCheck,
  FaUserTimes,
  FaServer,
  FaArrowUp,
  FaArrowDown,
} from "react-icons/fa";
import { FiLogOut } from "react-icons/fi";
import API_CONFIG from "../config/api";

const THEMES = {
  primary: "#3b57ff",
  secondary: "#8884d8",
  success: "#4caf50",
  danger: "#f44336",
  warning: "#ff9800",
  muted: "#777",
};

/* ---------------- KPI CARDS ---------------- */
function KpiCards({ kpis }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
        gap: 20,
        marginBottom: 40,
      }}
    >
      {kpis.map(({ icon, label, value, description, color, trend }) => (
        <div
          className="user-card"
          key={label}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 15,
            borderLeft: `6px solid ${color}`,
            paddingLeft: 20,
          }}
        >
          {icon}
          <div>
            <p style={{ margin: 0, fontWeight: 600 }}>{label}</p>
            <h2 style={{ margin: "4px 0", fontWeight: 800 }}>{value}</h2>
            <small style={{ color: THEMES.muted }}>
              {description}{" "}
              {trend === "up" && (
                <span style={{ color: THEMES.success }}>
                  <FaArrowUp /> +
                </span>
              )}
              {trend === "down" && (
                <span style={{ color: THEMES.danger }}>
                  <FaArrowDown /> −
                </span>
              )}
            </small>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------------- MAIN PAGE ---------------- */
function AdminPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [error, setError] = useState(null);

  // Check if user is admin
  useEffect(() => {
    // Only check if we're on admin route
    if (location.pathname !== '/admin') {
      return;
    }

    const checkAdminAccess = async () => {
      try {
        // Call isAdmin endpoint to check if user is admin
        const response = await fetch(`${API_CONFIG.BACKEND_URL}/api/is-admin`, {
          credentials: "include",
        });

        if (!response.ok) {
          // If not authenticated, redirect to login
          if (response.status === 401) {
            navigate("/login", { replace: true });
            return;
          }
          // Otherwise redirect to regular dashboard
          navigate("/", { replace: true });
          return;
        }

        const data = await response.json();
        
        if (!data.isAdmin) {
          // User is authenticated but not admin, redirect to regular dashboard
          navigate("/", { replace: true });
          return;
        }

        // User is admin, proceed with loading admin dashboard
        setIsAdmin(true);
        setCheckingAuth(false);

        // Fetch dashboard data
        const dashboardResponse = await fetch(`${API_CONFIG.BACKEND_URL}/api/admin/dashboard`, {
          credentials: "include",
        });

        if (dashboardResponse.ok) {
          const dashboardData = await dashboardResponse.json();
          setAnalytics(dashboardData);
        } else {
          // Show error instead of using mock data
          const errorData = await dashboardResponse.json().catch(() => ({}));
          setError(errorData.message || "Failed to load dashboard data. Please try again later.");
        }
        setLoading(false);
      } catch (error) {
        console.error("Error checking admin access:", error);
        setError("Failed to verify admin access. Please try again.");
        setCheckingAuth(false);
      }
    };

    checkAdminAccess();
  }, [navigate, location.pathname]);

  const kpis = analytics
    ? [
        {
          icon: <FaUsers color={THEMES.primary} size={28} />,
          label: "Total Users",
          value: analytics.kpis.totalUsers,
          description: "Registered users",
          color: THEMES.primary,
          trend: "up",
        },
        {
          icon: <FaMicrophone color={THEMES.secondary} size={28} />,
          label: "Voice Sessions",
          value: analytics.kpis.voiceSessions,
          description: "Weekly sessions",
          color: THEMES.secondary,
          trend: "up",
        },
        {
          icon: <FaPercentage color={THEMES.success} size={28} />,
          label: "Avg Accuracy",
          value: `${analytics.kpis.avgAccuracy}%`,
          description: "Speech accuracy",
          color: THEMES.success,
          trend: "up",
        },
        {
          icon: <FaExclamationTriangle color={THEMES.danger} size={28} />,
          label: "Error Rate",
          value: `${analytics.kpis.errorRate}%`,
          description: "Processing errors",
          color: THEMES.danger,
          trend: "down",
        },
      ]
    : [];

  return (
    <div className="adm-container">
      {/* SIDEBAR */}
      <aside className="adm-sidebar">
        <div className="adm-logo">VoiceScript</div>
        <nav className="adm-nav">
          <div className="adm-link active">Dashboard</div>
          <div className="adm-link">Users</div>
          <div className="adm-link">Analytics</div>
          <div className="adm-link">Settings</div>
        </nav>
        <button className="adm-add-btn">+</button>
      </aside>

      {/* MAIN */}
      <main className="adm-main">
        <header className="adm-header">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h1>Admin Dashboard</h1>
              <p className="adm-subtitle">
                Monitor users, voice activity and system health
              </p>
            </div>
            <button
              onClick={async () => {
                try {
                  const response = await fetch(`${API_CONFIG.BACKEND_URL}/logout`, {
                    method: "POST",
                    credentials: "include",
                  });

                  if (response.ok) {
                    navigate("/login", { replace: true });
                  } else {
                    alert("Error logging out. Please try again.");
                  }
                } catch (error) {
                  console.error("Logout error:", error);
                  // Even if there's an error, redirect to login
                  navigate("/login", { replace: true });
                }
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 20px",
                backgroundColor: THEMES.danger,
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "16px",
                fontWeight: 600,
                transition: "0.2s",
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = "#d32f2f";
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = THEMES.danger;
              }}
            >
              <FiLogOut /> Logout
            </button>
          </div>
        </header>

        {checkingAuth && (
          <p style={{ textAlign: "center", padding: "40px" }}>
            Verifying admin access...
          </p>
        )}

        {!checkingAuth && !isAdmin && (
          <p style={{ textAlign: "center", padding: "40px", color: "#f44336" }}>
            Access denied. Admin privileges required.
          </p>
        )}

        {error && (
          <div
            style={{
              padding: "20px",
              backgroundColor: "#fdecea",
              borderLeft: `6px solid ${THEMES.danger}`,
              borderRadius: "10px",
              marginBottom: "20px",
            }}
          >
            <FaExclamationTriangle color={THEMES.danger} />{" "}
            <strong>Error:</strong> {error}
          </div>
        )}

        {!checkingAuth && isAdmin && loading && (
          <p style={{ textAlign: "center" }}>Loading analytics...</p>
        )}

        {!checkingAuth && isAdmin && !loading && analytics && (
          <>
            <KpiCards kpis={kpis} />

            {/* NOTIFICATIONS & ALERTS */}
<div className="user-list" style={{ marginBottom: 35 }}>
  <h3 className="section-title">Notifications & Alerts</h3>

  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
    <div
      style={{
        padding: "12px 16px",
        borderRadius: 10,
        background: "#fff7e6",
        borderLeft: `6px solid ${THEMES.warning}`,
      }}
    >
      <FaExclamationTriangle color={THEMES.warning} />{" "}
      <strong>High Traffic:</strong> Voice usage increased by 18% today.
    </div>

    <div
      style={{
        padding: "12px 16px",
        borderRadius: 10,
        background: "#e8f5e9",
        borderLeft: `6px solid ${THEMES.success}`,
      }}
    >
      <FaServer color={THEMES.success} />{" "}
      <strong>System Stable:</strong> All services running normally.
    </div>

    <div
      style={{
        padding: "12px 16px",
        borderRadius: 10,
        background: "#fdecea",
        borderLeft: `6px solid ${THEMES.danger}`,
      }}
    >
      <FaExclamationTriangle color={THEMES.danger} />{" "}
      <strong>Error Spike:</strong> Temporary increase in failed voice commands.
    </div>
  </div>
</div>


            {/* USER STATS */}
            <div className="user-list" style={{ marginBottom: 35 }}>
              <h3 className="section-title">User Statistics</h3>
              <p>
                <FaUserCheck /> Active Users:{" "}
                <strong>{analytics.kpis.activeUsers}</strong>
              </p>
              <p>
                <FaUserTimes /> Inactive Users:{" "}
                <strong>{analytics.kpis.inactiveUsers}</strong>
              </p>
            </div>

            {/* LINE CHART */}
            <div className="user-list" style={{ marginBottom: 35 }}>
              <h3 className="section-title">Voice Usage Over Time</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={analytics.usage}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="sessions"
                    stroke={THEMES.primary}
                    strokeWidth={3}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* BAR CHART */}
            <div className="user-list" style={{ marginBottom: 35 }}>
              <h3 className="section-title">Accuracy per Feature</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics.accuracy}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="feature" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="rate" fill={THEMES.success} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* TOP USERS - Show from userStatistics if available */}
            {analytics.userStatistics && analytics.userStatistics.length > 0 && (
              <div className="user-list">
                <h3 className="section-title">Top Active Users</h3>
                {analytics.userStatistics
                  .sort((a, b) => (b.totalNotes || 0) - (a.totalNotes || 0))
                  .slice(0, 5)
                  .map((u) => (
                    <div
                      key={u.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        padding: "10px 0",
                        borderBottom: "1px solid #eee",
                      }}
                    >
                      <span>{u.username || u.email}</span>
                      <strong>{u.totalNotes || 0} notes</strong>
                    </div>
                  ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default AdminPage;
