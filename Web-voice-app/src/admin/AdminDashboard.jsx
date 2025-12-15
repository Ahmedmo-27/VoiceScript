import "./AdminDashboard.css";
import React, { useState, useEffect } from "react";
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

const THEMES = {
  primary: "#3b57ff",
  secondary: "#8884d8",
  success: "#4caf50",
  danger: "#f44336",
  warning: "#ff9800",
  muted: "#777",
};

/* ---------------- MOCK DATA ---------------- */
const MOCK_DATA = {
  usage: [
    { date: "Mon", sessions: 120 },
    { date: "Tue", sessions: 200 },
    { date: "Wed", sessions: 150 },
    { date: "Thu", sessions: 280 },
    { date: "Fri", sessions: 320 },
    { date: "Sat", sessions: 210 },
    { date: "Sun", sessions: 170 },
  ],
  accuracy: [
    { feature: "Speech to Text", rate: 92 },
    { feature: "Voice Commands", rate: 87 },
    { feature: "Language Detection", rate: 90 },
    { feature: "Noise Filtering", rate: 85 },
  ],
  kpis: {
    totalUsers: 1245,
    activeUsers: 980,
    inactiveUsers: 265,
    voiceSessions: 8430,
    avgAccuracy: 89,
    errorRate: 3.2,
    uptime: "99.4%",
  },
  topUsers: [
    { name: "Ahmed Ali", sessions: 320 },
    { name: "Sara Mohamed", sessions: 295 },
    { name: "Omar Hassan", sessions: 270 },
    { name: "Mona Adel", sessions: 250 },
  ],
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
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnalytics(MOCK_DATA);
      setLoading(false);
    }, 900);
    return () => clearTimeout(timer);
  }, []);

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
          <h1>Admin Dashboard</h1>
          <p className="adm-subtitle">
            Monitor users, voice activity and system health
          </p>
        </header>

        {loading && <p style={{ textAlign: "center" }}>Loading analytics...</p>}

        {!loading && analytics && (
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

            {/* TOP USERS */}
            <div className="user-list">
              <h3 className="section-title">Top Active Users</h3>
              {analytics.topUsers.map((u) => (
                <div
                  key={u.name}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "10px 0",
                    borderBottom: "1px solid #eee",
                  }}
                >
                  <span>{u.name}</span>
                  <strong>{u.sessions} sessions</strong>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default AdminPage;
