"use client";

import { useState, useRef, useEffect } from "react";
import PageNavbar from "../../components/PageNavbar";
import SmoothImage from "../../components/SmoothImage";
import { useAuth } from "../../context/AuthContext";
import { useSavedCars } from "../../context/SavedCarsContext";
import SavedCarsGrid from "../../components/SavedCarsGrid";
import { useRouter } from "next/navigation";

export default function UserProfile() {
  const { isLoggedIn, logout, user, userRole, setAuth } = useAuth();
  const router = useRouter();
  const { savedCars } = useSavedCars();
  const [activeTab, setActiveTab] = useState<"info" | "saved">("info");

  const [isEditing, setIsEditing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [avatarSrc, setAvatarSrc] = useState(
    `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name ?? "User")}&background=1a1a2e&color=fff&size=200&bold=true`
  );

  const defaultProfile = {
    name: user?.name ?? "User",
    email: user?.email ?? "",
    phone: "",
  };

  const [formData, setFormData] = useState<any>(defaultProfile);
  const [originalData, setOriginalData] = useState<any>(defaultProfile);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Change password state
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState("");
  const [passwordError, setPasswordError] = useState("");

  // Load profile data on mount
  useEffect(() => {
    if (!isLoggedIn || userRole !== "user") {
      setLoading(false);
      return;
    }

    const baseProfile: any = {
      name: user?.name || "User",
      email: user?.email || "",
      avatar: "",
    };

    if (user?.id && typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(`user_profile_${user.id}`);
        if (stored) {
          const saved = JSON.parse(stored);
          baseProfile.avatar = saved.avatar ?? "";
        }
      } catch { /* ignore corrupt storage */ }
    }

    setFormData(baseProfile as any);
    setOriginalData(baseProfile as any);
    if (baseProfile.avatar) {
      setAvatarSrc(baseProfile.avatar);
    } else {
      setAvatarSrc(`https://ui-avatars.com/api/?name=${encodeURIComponent(baseProfile.name || "U")}&background=1a1a2e&color=fff&size=200&bold=true`);
    }

    // Now try to fetch the authoritative profile from the API
    import("../../lib/api").then(({ getUserProfile }) => {
      getUserProfile().then((profileData) => {
        if (profileData && (profileData.name || profileData.phone)) {
          const merged: any = {
            name: profileData.name || user?.name || "",
            email: profileData.email || user?.email || "",
            avatar: profileData.avatar || baseProfile.avatar,
          };
          setFormData(merged);
          setOriginalData(merged);
          if (merged.avatar) {
            setAvatarSrc(merged.avatar);
          }
        }
      }).catch(() => { /* Ignore API errors, we already have local fallback */ })
        .finally(() => setLoading(false));
    });
  }, [isLoggedIn, userRole, user]);

  const [saving, setSaving] = useState(false);

  const handleSave = async (overrideData?: any, overrideFile?: File | null) => {
    const dataToSave = overrideData || formData;
    const fileToSave = overrideFile !== undefined ? overrideFile : avatarFile;
    if (!dataToSave.name) {
      alert("Name cannot be empty");
      return;
    }
    setSaving(true);
    try {
      // Persist to backend via PUT /api/users/profile
      try {
        const { updateUserProfile } = await import("../../lib/api");
        await updateUserProfile(dataToSave as any, fileToSave || undefined);
      } catch (e) {
        console.warn("Backend save failed, falling back to local storage", e);
      }

      // Persist extras locally under a user-scoped key — as backup
      if (user?.id && typeof window !== "undefined") {
        localStorage.setItem(
          `user_profile_${user.id}`,
          JSON.stringify({ avatar: dataToSave.avatar })
        );
        const updatedUser = { ...user, name: dataToSave.name };
        setAuth(updatedUser);
        localStorage.setItem("autohub_user", JSON.stringify(updatedUser));
      }
      setOriginalData(dataToSave);
      setIsEditing(false);
      setShowSuccess(true);
      if (!dataToSave.avatar) {
        setAvatarSrc(`https://ui-avatars.com/api/?name=${encodeURIComponent(dataToSave.name)}&background=1a1a2e&color=fff&size=200&bold=true`);
      }
      setTimeout(() => setShowSuccess(false), 3500);
    } catch (e: any) {
      alert(e.message || "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData(originalData);
    setIsEditing(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          const base64 = event.target.result as string;
          setAvatarSrc(base64);
          
          const newData = { ...formData, avatar: base64 };
          setFormData(newData);
          
          // Auto-save the image if we aren't currently editing
          if (!isEditing) {
             handleSave(newData, file);
          }
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword) {
      setPasswordError("Please fill in both fields.");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters.");
      return;
    }
    setChangingPassword(true);
    setPasswordError("");
    setPasswordMsg("");
    try {
      const { changeUserPassword } = await import("../../lib/api");
      await changeUserPassword(oldPassword, newPassword);
      setPasswordMsg("Password changed successfully!");
      setOldPassword("");
      setNewPassword("");
      setTimeout(() => setPasswordMsg(""), 3500);
    } catch (e: any) {
      setPasswordError(e.message || "Failed to change password.");
    } finally {
      setChangingPassword(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  if (!isLoggedIn) {
    return (
      <>
        <PageNavbar />
        <div style={{ textAlign: "center", padding: "80px 20px", color: "var(--text-secondary)" }}>
          <div style={{ fontSize: "3rem", marginBottom: "16px" }}></div>
          <h2 style={{ marginBottom: "12px" }}>You must be logged in to view this page.</h2>
          <button className="btn-primary" style={{ background: "var(--subnav-bg)", color: "var(--background)", border: "none", padding: "12px 30px", borderRadius: "8px", cursor: "pointer", fontSize: "1rem" }} onClick={() => router.push("/login")}>Go to Login</button>
        </div>
      </>
    );
  }

  if (userRole !== "user") {
    return (
      <>
        <PageNavbar />
        <div style={{ textAlign: "center", padding: "80px 20px", color: "var(--text-secondary)" }}>
          <div style={{ fontSize: "3rem", marginBottom: "16px" }}></div>
          <h2 style={{ marginBottom: "12px" }}>User account required.</h2>
          <p style={{ marginBottom: "20px", color: "#888" }}>This page is only accessible to regular users.</p>
          <button style={{ background: "var(--subnav-bg)", color: "var(--background)", border: "none", padding: "12px 30px", borderRadius: "8px", cursor: "pointer", fontSize: "1rem" }} onClick={() => router.push("/")}>Go Home</button>
        </div>
      </>
    );
  }

  if (loading) {
    return (
      <>
        <PageNavbar />
        <div className="page-header">
          <div className="skeleton skeleton-text medium" style={{ height: "40px", marginBottom: "8px", maxWidth: "200px", margin: "0 auto" }} />
          <div className="skeleton skeleton-text" style={{ height: "20px", maxWidth: "300px", margin: "0 auto" }} />
          <hr />
        </div>
        <div className="profile-wrapper" style={{ display: 'flex', gap: '32px', maxWidth: '1000px', margin: '40px auto', padding: '0 20px' }}>
          <div className="profile-sidebar" style={{ width: '300px', flexShrink: 0 }}>
            <div className="skeleton skeleton-rect" style={{ height: "250px", borderRadius: "12px", marginBottom: "20px" }} />
            <div className="skeleton skeleton-text" style={{ height: "40px" }} />
          </div>
          <div className="profile-content" style={{ flex: 1 }}>
            <div className="skeleton skeleton-rect" style={{ height: "400px", borderRadius: "12px" }} />
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageNavbar />
      <div className="page-header">
        <h1>My Profile</h1>
        <p>Manage your personal information</p>
        <hr />
      </div>

      <div className="profile-wrapper">
        {/* LEFT: Avatar Card */}
        <div className="avatar-card">
          <div className="avatar-wrap" onClick={() => fileInputRef.current?.click()}>
            <SmoothImage src={avatarSrc} alt="Profile Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <div className="avatar-overlay">
              <span></span>
              <span>Change Photo</span>
            </div>
            <input type="file" ref={fileInputRef} accept="image/*" style={{ display: "none" }} onChange={handlePhotoChange} />
          </div>

          <h2 className="avatar-name">{formData.name}</h2>
          <p className="avatar-role">Member</p>
          <p className="avatar-joined">Member since April 2024</p>

          <div className="avatar-stats">
            <div className="astat"><div className="astat-val">{savedCars.length}</div><div className="astat-lbl">Saved Cars</div></div>
            <div className="astat"><div className="astat-val">5</div><div className="astat-lbl">Searches</div></div>
            <div className="astat"><div className="astat-val">New</div><div className="astat-lbl">Member</div></div>
          </div>

          <button
            style={{ marginTop: "20px", width: "100%", padding: "10px", background: "#fee", color: "#e33", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" }}
            onClick={handleLogout}
          >
            Log Out
          </button>
        </div>

        {/* RIGHT: Tabs */}
        <div className="info-card">
          {/* Tab bar */}
          <div style={{ display: "flex", gap: 0, borderBottom: "2px solid #f0f0f5", marginBottom: "24px" }}>
            <button
              onClick={() => setActiveTab("info")}
              style={{ padding: "10px 20px", border: "none", background: "transparent", fontWeight: 700, fontSize: "0.88rem", cursor: "pointer", borderBottom: activeTab === "info" ? "2px solid #1a1a2e" : "2px solid transparent", color: activeTab === "info" ? "#1a1a2e" : "#aaa", marginBottom: "-2px" }}
            >Personal Info</button>
            <button
              onClick={() => setActiveTab("saved")}
              style={{ padding: "10px 20px", border: "none", background: "transparent", fontWeight: 700, fontSize: "0.88rem", cursor: "pointer", borderBottom: activeTab === "saved" ? "2px solid #1a1a2e" : "2px solid transparent", color: activeTab === "saved" ? "#1a1a2e" : "#aaa", marginBottom: "-2px", display: "flex", alignItems: "center", gap: "6px" }}
            >
              Saved Cars
              {savedCars.length > 0 && (
                <span style={{ background: "var(--subnav-bg)", color: "var(--background)", borderRadius: "20px", fontSize: "0.7rem", padding: "1px 7px", fontWeight: 800 }}>
                  {savedCars.length}
                </span>
              )}
            </button>
          </div>

          {/* Personal Info Tab */}
          {activeTab === "info" && (
            <>
              <div className="info-header">
                <h3>Personal Information</h3>
                <button className={`btn-edit ${isEditing ? "active" : ""}`} onClick={isEditing ? undefined : () => setIsEditing(true)}>
                  {isEditing ? "Editing..." : "Edit"}
                </button>
              </div>
              <div className="info-form">
                {[
                  { key: "name", label: "Full Name", type: "text" },
                  { key: "email", label: "Email Address", type: "email" },
                ].map(({ key, label, type }) => (
                  <div key={key} className="field-group">
                    <label>{label}</label>
                    <div className="field-wrap" style={{ background: isEditing && key !== "email" ? "#fff" : "" }}>
                      <input
                        type={type}
                        name={key}
                        value={formData[key as keyof typeof formData]}
                        onChange={handleChange}
                        disabled={!isEditing || key === "email"}
                      />
                    </div>
                  </div>
                ))}
              </div>
              {isEditing && (
                <div className="form-actions">
                  <button className="btn-save" onClick={() => handleSave()} disabled={saving}>
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                  <button className="btn-cancel" onClick={handleCancel}>Cancel</button>
                </div>
              )}
              {showSuccess && <div className="success-msg">Profile updated successfully!</div>}

              {/* Change Password Section */}
              <div style={{ marginTop: "32px", paddingTop: "24px", borderTop: "2px solid #f0f0f5" }}>
                <h3 style={{ fontSize: "1rem", fontWeight: 800, color: "#1a1a2e", marginBottom: "16px" }}>Change Password</h3>
                <div className="info-form">
                  <div className="field-group">
                    <label>Current Password</label>
                    <div className="field-wrap" style={{ background: "#fff" }}>
                      <input
                        type="password"
                        placeholder="Enter current password"
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="field-group">
                    <label>New Password</label>
                    <div className="field-wrap" style={{ background: "#fff" }}>
                      <input
                        type="password"
                        placeholder="Enter new password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
                {passwordError && (
                  <div style={{ color: "#e33", fontSize: "0.85rem", marginTop: "8px" }}>{passwordError}</div>
                )}
                {passwordMsg && (
                  <div className="success-msg" style={{ marginTop: "8px" }}>{passwordMsg}</div>
                )}
                <div style={{ marginTop: "14px" }}>
                  <button className="btn-save" onClick={handleChangePassword} disabled={changingPassword} style={{ width: "auto", padding: "10px 28px" }}>
                    {changingPassword ? "Changing..." : "Change Password"}
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Saved Cars Tab */}
          {activeTab === "saved" && (
            <>
              <div className="info-header">
                <h3>Saved Cars ({savedCars.length})</h3>
              </div>
              <SavedCarsGrid />
            </>
          )}
        </div>
      </div>
    </>
  );
}
