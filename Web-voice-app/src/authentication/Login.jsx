import { Link, useNavigate } from "react-router-dom";
import React, { useState } from "react";
import API_CONFIG from "../config/api";
import "./Login.css";

const logoImage = "/VoiceScript Logo1.png";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!email || !password) {
      setError("Please enter both email and password.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_CONFIG.BACKEND_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // Include cookies for session
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Login failed");
        setLoading(false);
        return;
      }

      // Login successful - session is stored on server
      alert(`Welcome ${data.username}!`);
      
      // Check user role and redirect accordingly
      // Backend finds user by email, validates password, and returns role
      const userRole = data.role || 'user';
      
      if (userRole === 'admin') {
        navigate("/admin", { replace: true });
      } else {
        navigate("/", { replace: true }); // redirect regular users to dashboard
      }
    } catch (err) {
      console.error("Fetch/network error:", err);
      setError("Server error. Try again later.");
    }
    finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <div className="top-logo">
        <img src={logoImage} alt="VoiceScript Logo" className="logo-img" />
      </div>

      <div className="login-card">
        <h1 className="login-title">Login</h1>

        <form onSubmit={handleSubmit} className="login-form" autoComplete="off">
          {error && <div className="error">{error}</div>}

          <label className="label">Email</label>
          <input
            className="input"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <label className="label">Password</label>
          <input
            className="input"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <div className="form-actions">
            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? "Logging in..." : "Login"}
            </button>
            <Link to="/register" className="signup-text">Sign up</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
