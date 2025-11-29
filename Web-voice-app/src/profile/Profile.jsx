import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Profile.css";

export default function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (!userData) {
      navigate("/login");
      return;
    }

    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);
    fetchUserProfile(parsedUser.userId);
  }, [navigate]);

  const fetchUserProfile = async (userId) => {
    try {
      const response = await fetch(`http://localhost:5001/api/user/${userId}`);
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        setFormData({
          username: userData.username,
          email: userData.email,
          password: "",
          confirmPassword: "",
        });
      } else {
        setError("Failed to load profile");
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      setError("Error loading profile");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSave = async () => {
    setError("");
    setSuccess("");

    // Validate password if provided
    if (formData.password && formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (formData.password && formData.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    try {
      const updateData = {
        username: formData.username,
        email: formData.email,
      };

      if (formData.password) {
        updateData.password = formData.password;
      }

      const response = await fetch(`http://localhost:5001/api/user/${user.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      });

      if (response.ok) {
        const updatedUser = await response.json();
        setUser(updatedUser);
        setEditing(false);
        setSuccess("Profile updated successfully!");
        
        // Update localStorage
        localStorage.setItem("user", JSON.stringify({
          userId: updatedUser.id,
          username: updatedUser.username,
          email: updatedUser.email,
        }));

        // Clear password fields
        setFormData((prev) => ({
          ...prev,
          password: "",
          confirmPassword: "",
        }));

        setTimeout(() => setSuccess(""), 3000);
      } else {
        const data = await response.json();
        setError(data.message || "Failed to update profile");
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      setError("Error updating profile");
    }
  };

  const handleCancel = () => {
    setEditing(false);
    setError("");
    setSuccess("");
    // Reset form data
    if (user) {
      setFormData({
        username: user.username,
        email: user.email,
        password: "",
        confirmPassword: "",
      });
    }
  };

  if (loading) {
    return (
      <div className="profile-container">
        <div className="profile-loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="profile-container">
      <div className="profile-card">
        <div className="profile-header">
          <h1>Profile</h1>
          <button className="back-btn" onClick={() => navigate("/")}>
            ← Back to Home
          </button>
        </div>

        {error && <div className="profile-error">{error}</div>}
        {success && <div className="profile-success">{success}</div>}

        <div className="profile-content">
          <div className="profile-field">
            <label>Username</label>
            {editing ? (
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                className="profile-input"
              />
            ) : (
              <div className="profile-value">{user?.username}</div>
            )}
          </div>

          <div className="profile-field">
            <label>Email</label>
            {editing ? (
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="profile-input"
              />
            ) : (
              <div className="profile-value">{user?.email}</div>
            )}
          </div>

          {editing && (
            <>
              <div className="profile-field">
                <label>New Password (leave blank to keep current)</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="profile-input"
                  placeholder="Enter new password"
                />
              </div>

              {formData.password && (
                <div className="profile-field">
                  <label>Confirm New Password</label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className="profile-input"
                    placeholder="Confirm new password"
                  />
                </div>
              )}
            </>
          )}

          <div className="profile-field">
            <label>Account Created</label>
            <div className="profile-value">
              {user?.created_at ? new Date(user.created_at).toLocaleDateString() : "N/A"}
            </div>
          </div>

          <div className="profile-field">
            <label>Last Login</label>
            <div className="profile-value">
              {user?.last_login ? new Date(user.last_login).toLocaleString() : "Never"}
            </div>
          </div>

          <div className="profile-actions">
            {editing ? (
              <>
                <button className="profile-btn save-btn" onClick={handleSave}>
                  Save Changes
                </button>
                <button className="profile-btn cancel-btn" onClick={handleCancel}>
                  Cancel
                </button>
              </>
            ) : (
              <button className="profile-btn edit-btn" onClick={() => setEditing(true)}>
                Edit Profile
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

