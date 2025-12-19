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
  PieChart,
  Pie,
  Cell,
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
  FaEdit,
  FaTrash,
} from "react-icons/fa";
import { FiLogOut, FiHome } from "react-icons/fi";
import API_CONFIG from "../config/api";

const logoImage = "/VoiceScript Logo1.png";

const THEMES = {
  primary: "#3b57ff",
  secondary: "#6f42c1",
  success: "#4caf50",
  danger: "#f44336",
  warning: "#ff9800",
  muted: "#7a7a9a",
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
  const [editingUser, setEditingUser] = useState(null);
  const [editFormData, setEditFormData] = useState({ username: "", email: "", role: "" });
  const [isDeleting, setIsDeleting] = useState(false);

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

  const handleEditUser = (user) => {
    setEditingUser(user);
    setEditFormData({
      username: user.username,
      email: user.email,
      role: user.role || "user",
    });
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
      return;
    }

    try {
      const response = await fetch(`${API_CONFIG.BACKEND_URL}/api/admin/users/${userId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (response.ok) {
        // Refresh dashboard data
        const dashboardResponse = await fetch(`${API_CONFIG.BACKEND_URL}/api/admin/dashboard`, {
          credentials: "include",
        });
        if (dashboardResponse.ok) {
          const dashboardData = await dashboardResponse.json();
          setAnalytics(dashboardData);
        }
        alert("User deleted successfully.");
      } else {
        const errorData = await response.json();
        alert(errorData.message || "Failed to delete user.");
      }
    } catch (error) {
      console.error("Delete user error:", error);
      alert("Error deleting user.");
    }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_CONFIG.BACKEND_URL}/api/admin/users/${editingUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(editFormData),
      });

      if (response.ok) {
        setEditingUser(null);
        // Refresh dashboard data
        const dashboardResponse = await fetch(`${API_CONFIG.BACKEND_URL}/api/admin/dashboard`, {
          credentials: "include",
        });
        if (dashboardResponse.ok) {
          const dashboardData = await dashboardResponse.json();
          setAnalytics(dashboardData);
        }
        alert("User updated successfully.");
      } else {
        const errorData = await response.json();
        alert(errorData.message || "Failed to update user.");
      }
    } catch (error) {
      console.error("Update user error:", error);
      alert("Error updating user.");
    }
  };

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
        <div className="logo">
          <img src={logoImage} alt="VoiceScript Logo" className="logo-img" />
        </div>
        <nav className="adm-nav">
          <div className="adm-link active">Dashboard</div>
        </nav>
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

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={() => navigate("/")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "10px 20px",
                  backgroundColor: THEMES.primary,
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontSize: "16px",
                  fontWeight: 600,
                  transition: "0.2s",
                }}
              >
                <FiHome /> Home
              </button>

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
            {analytics.notifications && analytics.notifications.length > 0 && (
              <div className="user-list" style={{ marginBottom: 35 }}>
                <h3 className="section-title">Notifications & Alerts</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {analytics.notifications.map((notification, index) => {
                    const getNotificationStyle = (type) => {
                      switch (type) {
                        case 'warning':
                          return {
                            background: "#fff7e6",
                            borderColor: THEMES.warning,
                            icon: <FaExclamationTriangle color={THEMES.warning} />,
                          };
                        case 'danger':
                          return {
                            background: "#fdecea",
                            borderColor: THEMES.danger,
                            icon: <FaExclamationTriangle color={THEMES.danger} />,
                          };
                        case 'success':
                          return {
                            background: "#e8f5e9",
                            borderColor: THEMES.success,
                            icon: <FaServer color={THEMES.success} />,
                          };
                        case 'info':
                        default:
                          return {
                            background: "#e3f2fd",
                            borderColor: THEMES.primary,
                            icon: <FaServer color={THEMES.primary} />,
                          };
                      }
                    };

                    const style = getNotificationStyle(notification.type);

                    return (
                      <div
                        key={index}
                        style={{
                          padding: "12px 16px",
                          borderRadius: 10,
                          background: style.background,
                          borderLeft: `6px solid ${style.borderColor}`,
                        }}
                      >
                        {style.icon}{" "}
                        <strong>{notification.title}:</strong> {notification.message}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}


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

            {/* FEEDBACK DISTRIBUTION PIE CHART */}
            {analytics.transcriptionStats && (
              <div className="user-list" style={{ marginBottom: 35 }}>
                <h3 className="section-title">Feedback Distribution</h3>
                {(analytics.transcriptionStats.positiveFeedbacks > 0 || analytics.transcriptionStats.negativeFeedbacks > 0) ? (
                  <>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={[
                              { name: "Positive", value: analytics.transcriptionStats.positiveFeedbacks || 0, color: THEMES.success },
                              { name: "Negative", value: analytics.transcriptionStats.negativeFeedbacks || 0, color: THEMES.danger },
                            ].filter(item => item.value > 0)}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={5}
                            dataKey="value"
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          >
                            {[
                              { name: "Positive", value: analytics.transcriptionStats.positiveFeedbacks || 0, color: THEMES.success },
                              { name: "Negative", value: analytics.transcriptionStats.negativeFeedbacks || 0, color: THEMES.danger },
                            ].filter(item => item.value > 0).map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div style={{ display: "flex", justifyContent: "center", gap: 40, marginTop: 10 }}>
                      <div style={{ textAlign: "center" }}>
                        <span style={{ color: THEMES.success, fontWeight: 700, fontSize: 24 }}>
                          {analytics.transcriptionStats.positiveFeedbacks || 0}
                        </span>
                        <p style={{ margin: 0, color: THEMES.muted }}>Positive Feedbacks</p>
                      </div>
                      <div style={{ textAlign: "center" }}>
                        <span style={{ color: THEMES.danger, fontWeight: 700, fontSize: 24 }}>
                          {analytics.transcriptionStats.negativeFeedbacks || 0}
                        </span>
                        <p style={{ margin: 0, color: THEMES.muted }}>Negative Feedbacks</p>
                      </div>
                      <div style={{ textAlign: "center" }}>
                        <span style={{ color: THEMES.primary, fontWeight: 700, fontSize: 24 }}>
                          {analytics.transcriptionStats.totalFeedbacks || 0}
                        </span>
                        <p style={{ margin: 0, color: THEMES.muted }}>Total Feedbacks</p>
                      </div>
                    </div>
                  </>
                ) : (
                  <div style={{
                    textAlign: "center",
                    padding: "40px 20px",
                    color: THEMES.muted,
                    background: "#f8f9fa",
                    borderRadius: 12
                  }}>
                    <p style={{ margin: 0, fontSize: 16 }}>No feedback data available yet.</p>
                    <p style={{ margin: "8px 0 0", fontSize: 14 }}>Feedback will appear here once users submit transcription feedback.</p>
                  </div>
                )}
              </div>
            )}

            {/* TRANSCRIPTION STATS SUMMARY */}
            {analytics.transcriptionStats && (
              <div className="user-list" style={{ marginBottom: 35 }}>
                <h3 className="section-title">Transcription Statistics</h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 20 }}>
                  <div style={{ padding: 20, background: "#f0f4ff", borderRadius: 12, textAlign: "center" }}>
                    <h2 style={{ margin: 0, color: THEMES.primary }}>{analytics.transcriptionStats.overallAccuracy}%</h2>
                    <p style={{ margin: "5px 0 0", color: THEMES.muted }}>Overall Accuracy</p>
                  </div>
                  <div style={{ padding: 20, background: "#fff7e6", borderRadius: 12, textAlign: "center" }}>
                    <h2 style={{ margin: 0, color: THEMES.warning }}>{analytics.transcriptionStats.totalWords?.toLocaleString() || 0}</h2>
                    <p style={{ margin: "5px 0 0", color: THEMES.muted }}>Total Words Processed</p>
                  </div>
                  <div style={{ padding: 20, background: "#fdecea", borderRadius: 12, textAlign: "center" }}>
                    <h2 style={{ margin: 0, color: THEMES.danger }}>{analytics.transcriptionStats.totalErrors?.toLocaleString() || 0}</h2>
                    <p style={{ margin: "5px 0 0", color: THEMES.muted }}>Total Errors</p>
                  </div>
                </div>
              </div>
            )}

            {/* DETAILED USER TABLE */}
            {analytics.userStatistics && analytics.userStatistics.length > 0 && (
              <div className="user-list" style={{ marginBottom: 35 }}>
                <h3 className="section-title">All Users</h3>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                    <thead>
                      <tr style={{ background: "#f0f4ff", textAlign: "left" }}>
                        <th style={{ padding: "12px 10px", borderBottom: "2px solid #d4d9ff" }}>Username</th>
                        <th style={{ padding: "12px 10px", borderBottom: "2px solid #d4d9ff" }}>Email</th>
                        <th style={{ padding: "12px 10px", borderBottom: "2px solid #d4d9ff" }}>Role</th>
                        <th style={{ padding: "12px 10px", borderBottom: "2px solid #d4d9ff" }}>Notes</th>
                        <th style={{ padding: "12px 10px", borderBottom: "2px solid #d4d9ff" }}>Feedbacks</th>
                        <th style={{ padding: "12px 10px", borderBottom: "2px solid #d4d9ff" }}>Accuracy</th>
                        <th style={{ padding: "12px 10px", borderBottom: "2px solid #d4d9ff" }}>Status</th>
                        <th style={{ padding: "12px 10px", borderBottom: "2px solid #d4d9ff" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.userStatistics.map((user) => (
                        <tr key={user.id} style={{ borderBottom: "1px solid #e8ecff" }}>
                          <td style={{ padding: "12px 10px" }}>{user.username}</td>
                          <td style={{ padding: "12px 10px" }}>{user.email}</td>
                          <td style={{ padding: "12px 10px" }}>
                            <span
                              style={{
                                padding: "4px 10px",
                                borderRadius: 20,
                                fontSize: 12,
                                fontWeight: 600,
                                background: user.role === "admin" ? THEMES.secondary : "#e8ecff",
                                color: user.role === "admin" ? "#fff" : THEMES.primary,
                              }}
                            >
                              {user.role || "user"}
                            </span>
                          </td>
                          <td style={{ padding: "12px 10px" }}>{user.totalNotes || 0}</td>
                          <td style={{ padding: "12px 10px" }}>{user.totalFeedbacks || 0}</td>
                          <td style={{ padding: "12px 10px" }}>
                            <span style={{ color: user.avgAccuracy >= 90 ? THEMES.success : user.avgAccuracy >= 70 ? THEMES.warning : THEMES.danger }}>
                              {user.avgAccuracy?.toFixed(1) || 100}%
                            </span>
                          </td>
                          <td style={{ padding: "12px 10px" }}>
                            <span
                              style={{
                                padding: "4px 10px",
                                borderRadius: 20,
                                fontSize: 12,
                                fontWeight: 600,
                                background: user.isActive ? "#e8f5e9" : "#fdecea",
                                color: user.isActive ? THEMES.success : THEMES.danger,
                              }}
                            >
                              {user.isActive ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td style={{ padding: "12px 10px" }}>
                            <div style={{ display: "flex", gap: "8px" }}>
                              <button
                                onClick={() => handleEditUser(user)}
                                style={{
                                  padding: "6px",
                                  borderRadius: "4px",
                                  border: "none",
                                  backgroundColor: THEMES.primary,
                                  color: "white",
                                  cursor: "pointer",
                                }}
                                title="Edit User"
                              >
                                <FaEdit />
                              </button>
                              <button
                                onClick={() => handleDeleteUser(user.id)}
                                style={{
                                  padding: "6px",
                                  borderRadius: "4px",
                                  border: "none",
                                  backgroundColor: THEMES.danger,
                                  color: "white",
                                  cursor: "pointer",
                                }}
                                title="Delete User"
                              >
                                <FaTrash />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

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
                        borderBottom: "1px solid #d4d9ff",
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

      {/* EDIT USER MODAL */}
      {editingUser && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          backgroundColor: "rgba(0,0,0,0.5)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: "white",
            padding: "30px",
            borderRadius: "12px",
            width: "400px",
            boxShadow: "0 10px 25px rgba(0,0,0,0.2)"
          }}>
            <h2 style={{ marginBottom: "20px" }}>Edit User</h2>
            <form onSubmit={handleUpdateUser}>
              <div style={{ marginBottom: "15px" }}>
                <label style={{ display: "block", marginBottom: "5px", fontWeight: 600 }}>Username</label>
                <input
                  type="text"
                  value={editFormData.username}
                  onChange={(e) => setEditFormData({ ...editFormData, username: e.target.value })}
                  style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #ddd" }}
                  required
                />
              </div>
              <div style={{ marginBottom: "15px" }}>
                <label style={{ display: "block", marginBottom: "5px", fontWeight: 600 }}>Email</label>
                <input
                  type="email"
                  value={editFormData.email}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #ddd" }}
                  required
                />
              </div>
              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", marginBottom: "5px", fontWeight: 600 }}>Role</label>
                <select
                  value={editFormData.role}
                  onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value })}
                  style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #ddd" }}
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  style={{ padding: "10px 20px", borderRadius: "6px", border: "1px solid #ddd", cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: "10px 20px",
                    borderRadius: "6px",
                    border: "none",
                    backgroundColor: THEMES.primary,
                    color: "white",
                    fontWeight: 600,
                    cursor: "pointer"
                  }}
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminPage;
